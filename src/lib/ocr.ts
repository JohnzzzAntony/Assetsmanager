// OCR Helper using NVIDIA NIM Vision Model API
import path from 'path'

export const OCR_PROMPT = `You are an IT asset identification assistant. Analyze this image of an IT asset (computer, phone, tablet, monitor, peripheral, or spec label).

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

export async function runOcr(base64Image: string, mimeType: string): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY
  const baseUrl = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'

  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is not defined in the environment variables.')
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'meta/llama-3.2-11b-vision-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OCR_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` }
            }
          ]
        }
      ],
      max_tokens: 1024,
      temperature: 0.2
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`NVIDIA API Error: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }

  const content = data.choices?.[0]?.message?.content || ''
  return content
}

export function parseJsonResponse(text: string): Record<string, unknown> {
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
