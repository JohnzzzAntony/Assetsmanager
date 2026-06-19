export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { imageRepo } from '@/lib/repo'
import { readFile } from 'fs/promises'

const OCR_PROMPT = `You are an IT asset identification assistant. Analyze this image of an IT asset.

Extract the following information if visible and return as JSON. If not visible, use null.

{
  "make": "Manufacturer brand",
  "model": "Model name",
  "modelNumber": "Model number",
  "serialNumber": "Serial number",
  "imei1": "15-digit IMEI if visible",
  "imei2": "Second IMEI if visible",
  "os": "Operating system",
  "assetType": "Desktop, Laptop, Mobile, Tablet, Monitor, Peripheral, or Other",
  "cpu": "CPU",
  "ram": "RAM",
  "storage": "Storage",
  "color": "Color",
  "rawText": "All visible text"
}

Return ONLY the JSON object.`

function parseJsonResponse(text: string): Record<string, unknown> {
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
  }
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) return { rawText: text }
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return { rawText: text }
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ imageId: string }> }) {
  try {
    const { imageId } = await params
    const img = imageRepo.get(imageId)
    if (!img) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

    const fullPath = `/home/z/my-project${img.filePath}`
    const buffer = await readFile(fullPath)
    const base64 = buffer.toString('base64')

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OCR_PROMPT },
            { type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${base64}` } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })
    const content = response.choices[0]?.message?.content || ''
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
