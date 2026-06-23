export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { imageRepo } from '@/lib/repo'
import { writeFile, mkdir, readFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { runOcr, parseJsonResponse } from '@/lib/ocr'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

async function ensureUploadDir() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true })
  } catch {}
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    await ensureUploadDir()
    const ext = path.extname(file.name) || '.png'
    const fileName = `${randomUUID()}${ext}`
    const filePath = path.join(UPLOAD_DIR, fileName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const mimeType = file.type || 'image/png'
    const base64 = buffer.toString('base64')

    // Create image record with pending status
    const img = imageRepo.create({
      fileName: file.name,
      filePath: `/uploads/${fileName}`,
      mimeType,
      fileSize: file.size,
      ocrStatus: 'Pending',
      ocrEngine: 'VLM',
    })

    // Run OCR
    let result: Record<string, unknown> = {}
    let rawText = ''
    let ocrStatus = 'Success'
    try {
      const vlmResponse = await runOcr(base64, mimeType)
      rawText = vlmResponse
      result = parseJsonResponse(vlmResponse)
      if (result.rawText && typeof result.rawText === 'string') {
        rawText = result.rawText
      }
    } catch (err) {
      ocrStatus = 'Failed'
      rawText = `OCR failed: ${err instanceof Error ? err.message : String(err)}`
    }

    imageRepo.update(img.id, {
      processedText: rawText,
      ocrStatus,
      ocrEngine: 'VLM',
      parsedFields: JSON.stringify(result),
      processedAt: new Date().toISOString(),
    })

    return NextResponse.json({
      imageId: img.id,
      rawText,
      parsed: {
        make: result.make || undefined,
        model: result.model || undefined,
        modelNumber: result.modelNumber || undefined,
        serialNumber: result.serialNumber || undefined,
        imei1: result.imei1 || undefined,
        imei2: result.imei2 || undefined,
        os: result.os || undefined,
        assetType: result.assetType || undefined,
        cpu: result.cpu || undefined,
        ram: result.ram || undefined,
        storage: result.storage || undefined,
        color: result.color || undefined,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('OCR error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
