import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fontPath = path.join(__dirname, '..', 'Amiri-Regular.ttf')
const outPath = path.join(__dirname, '..', 'src', 'utils', 'amiriFont.ts')
const base64 = fs.readFileSync(fontPath).toString('base64')
fs.writeFileSync(outPath, `// Amiri Regular - Arabic support for jsPDF (auto-generated)
export const AMIRI_BASE64 = "${base64}"
`)
