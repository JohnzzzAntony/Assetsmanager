import { NextRequest, NextResponse } from 'next/server'
import { assetRepo } from '@/lib/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Generate a printable asset label as SVG (acts as a "QR code" placeholder)
// Includes the asset tag, name, serial number, and a Code-128-like barcode pattern
function generateBarcodeSvg(value: string, width = 280, height = 60): string {
  // Simple deterministic barcode-like pattern based on the string
  const bars: string[] = []
  let x = 4
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    // 4 bars per char (varying widths)
    const widths = [(code >> 6) & 3, (code >> 4) & 3, (code >> 2) & 3, code & 3].map((w) => w + 1)
    for (let j = 0; j < 4; j++) {
      const w = widths[j]
      const fill = j % 2 === 0 ? '#000' : 'none'
      if (fill === '#000') {
        bars.push(`<rect x="${x}" y="4" width="${w}" height="${height - 16}" fill="${fill}"/>`)
      }
      x += w + 1
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(width, x)}" height="${height}" viewBox="0 0 ${Math.max(width, x)} ${height}">
    ${bars.join('\n    ')}
    <text x="${Math.max(width, x) / 2}" y="${height - 3}" font-family="monospace" font-size="10" text-anchor="middle" fill="#000">${value}</text>
  </svg>`
}

// Generate a "QR-like" 2D matrix as SVG
function generateQrLikeSvg(value: string, size = 100): string {
  // Deterministic pseudo-QR matrix based on string hash
  const cells = 21  // 21x21 like QR Code Version 1
  const cellSize = size / cells
  // Simple hash function to seed pattern
  let seed = 0
  for (let i = 0; i < value.length; i++) seed = (seed * 31 + value.charCodeAt(i)) >>> 0
  function next() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff }

  const rects: string[] = []
  // Finder patterns at 3 corners
  function finder(cx: number, cy: number) {
    rects.push(`<rect x="${cx}" y="${cy}" width="${cellSize * 7}" height="${cellSize * 7}" fill="#000"/>`)
    rects.push(`<rect x="${cx + cellSize}" y="${cy + cellSize}" width="${cellSize * 5}" height="${cellSize * 5}" fill="#fff"/>`)
    rects.push(`<rect x="${cx + cellSize * 2}" y="${cy + cellSize * 2}" width="${cellSize * 3}" height="${cellSize * 3}" fill="#000"/>`)
  }
  finder(0, 0)
  finder((cells - 7) * cellSize, 0)
  finder(0, (cells - 7) * cellSize)

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      // Skip finder pattern regions
      const inFinder =
        (r < 8 && c < 8) ||
        (r < 8 && c >= cells - 8) ||
        (r >= cells - 8 && c < 8)
      if (inFinder) continue
      if (next() > 0.5) {
        rects.push(`<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`)
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="#fff"/>
    ${rects.join('\n    ')}
  </svg>`
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const asset = assetRepo.get(id)
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })

    const sp = req.nextUrl.searchParams
    const format = sp.get('format') || 'svg'  // svg | json
    const label = asset.assetTag || asset.serialNumber || asset.id.slice(0, 8)
    const fullName = [asset.make, asset.model].filter(Boolean).join(' ') || label

    if (format === 'json') {
      return NextResponse.json({
        assetId: asset.id,
        assetTag: asset.assetTag,
        label,
        name: fullName,
        serial: asset.serialNumber,
        url: `/api/assets/${asset.id}`,
      })
    }

    // Return a printable SVG label
    const qr = generateQrLikeSvg(label, 120)
    const barcode = generateBarcodeSvg(label, 280, 50)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
      <rect width="320" height="220" fill="#fff" stroke="#000" stroke-width="1"/>
      <text x="10" y="22" font-family="Arial, sans-serif" font-size="14" font-weight="bold">Maylaa International</text>
      <line x1="10" y1="28" x2="310" y2="28" stroke="#000" stroke-width="0.5"/>
      <g transform="translate(10, 36)">
        ${qr}
      </g>
      <g transform="translate(140, 50)">
        <text font-family="Arial, sans-serif" font-size="11" fill="#444">Asset Tag</text>
        <text y="16" font-family="monospace" font-size="18" font-weight="bold">${label}</text>
        <text y="42" font-family="Arial, sans-serif" font-size="11" fill="#444">Description</text>
        <text y="58" font-family="Arial, sans-serif" font-size="13">${fullName.substring(0, 24)}</text>
        <text y="84" font-family="Arial, sans-serif" font-size="11" fill="#444">Serial Number</text>
        <text y="100" font-family="monospace" font-size="11">${asset.serialNumber || '—'}</text>
        <text y="126" font-family="Arial, sans-serif" font-size="11" fill="#444">Type</text>
        <text y="142" font-family="Arial, sans-serif" font-size="13">${asset.assetType?.name || '—'}</text>
      </g>
      <g transform="translate(20, 165)">
        ${barcode}
      </g>
    </svg>`

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
