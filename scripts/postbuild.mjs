// Copy runtime assets into the Next.js standalone output (cross-platform).
// server.js chdir()s into .next/standalone, so anything read via process.cwd() must live there.
import fs from 'node:fs'

const out = '.next/standalone'
const copies = [
  ['.next/static', `${out}/.next/static`],
  ['public', `${out}/public`],
  ['scripts/excel_data.json', `${out}/scripts/excel_data.json`],
]
for (const [src, dest] of copies) {
  if (fs.existsSync(src)) fs.cpSync(src, dest, { recursive: true })
}
