export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { imageRepo } from '@/lib/repo'
import { readFile } from 'fs/promises'
import path from 'path'
import { runOcr, parseJsonResponse } from '@/lib/ocr'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ imageId: string }> }) {
  try {
    const { imageId } = await params
    const img = imageRepo.get(imageId)
    if (!img) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

    const fullPath = path.join(process.cwd(), img.filePath)
    const buffer = await readFile(fullPath)
    const base64 = buffer.toString('base64')

    const content = await runOcr(base64, img.mimeType)
    const result = parseJsonResponse(content)

    imageRepo.update(img.id, {
      processedText: content,
      ocrStatus: 'Success',
      ocrEngine: 'VLM',
      parsedFields: JSON.stringify(result),
      processedAt: new Date().toISOString(),
    })

    return NextResponse.json({
      imageId: img.id,
      rawText: content,
      parsed: {
        make: result.make || undefined,
        model: result.model || undefined,
        modelNumber: result.modelNumber || undefined,
        serialNumber: result.serialNumber || undefined,
        imei1: result.imei1 || undefined,
        imei2: result.imei2 || undefined,
        os: result.os || undefined,
        assetType: result.assetType || undefined,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
