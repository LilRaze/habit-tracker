import sharp from 'sharp'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const svg = readFileSync(join(publicDir, 'icon.svg'))

for (const size of [192, 512]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(publicDir, `icon-${size}.png`))
  console.log(`Generated icon-${size}.png`)
}
