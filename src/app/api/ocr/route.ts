export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { imageRepo } from '@/lib/repo'
import { writeFile, mkdir, readFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = '/home/z/my-project/uploads'

const OCR_PROMPT = `You are an IT asset identification assistant. Analyze this image of an IT asset (computer, phone, tablet, monitor, peripheral, or spec label).

Extract the following information if visible in the image and return it as a JSON object. If a field is not visible, use null.

{
  "make": "Manufacturer brand (e.g. Dell, HP, Apple, Samsung, Lenovo, Motorola)",
  "model": "Model name (e.g. Optiplex 7010, iPhone 15 Pro Max, Galaxy A32)",
  "modelNumber": "Model number / part code (e.g. A3106, SM-A166P/DS)",
  "serialNumber": "Serial number (S/N, SN) - alphanumeric code",
  "imei1": "15-digit IMEI number if visible (mobile devices)",
  "imei2": "Second IMEI number if visible (dual SIM)",
  "os": "Operating system if mentioned (e.g. Windows 10 PRO, macOS Sonoma, Android 14, iOS 17)",
  "assetType": "Inferred type: Desktop, Laptop, Mobile, Tablet, Monitor, Peripheral, or Other",
  "cpu": "CPU/processor if mentioned (e.g. Intel Core i5-3470)",
  "ram": "RAM if mentioned (e.g. 8GB, 16GB)",
  "storage": "Storage if mentioned (e.g. 512GB SSD, 1TB HDD)",
  "color": "Color if mentioned",
  "rawText": "All visible text from the image, preserving layout"
}

Return ONLY the JSON object, no markdown fences, no extra text.`

async function ensureUploadDir() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true })
  } catch {}
}

async function runOcr(base64Image: string, mimeType: string) {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()
  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: OCR_PROMPT },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })
  const content = response.choices[0]?.message?.content || ''
  return content
}

function parseJsonResponse(text: string): Record<string, unknown> {
  let cleaned = text.trim()
  // Strip markdown fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
  }
  // Find first { and last }
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) return { rawText: text }
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return { rawText: text }
  }
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
