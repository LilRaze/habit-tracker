/**
 * Single-source launcher icons from public/icon.svg (rounded square + check).
 *
 * Used for:
 * - PWA / manifest: public/icon-192.png, public/icon-512.png (see vite.config.js)
 * - Android mipmaps: adaptive foreground + legacy launcher PNGs
 *
 * Note: index.html uses public/favicon.svg for the browser tab, which is a
 * different asset today. To align the tab with PWA/Android, point favicon at
 * icon.svg or replace favicon.svg with the same artwork.
 */
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const androidRes = join(__dirname, '..', 'android', 'app', 'src', 'main', 'res')
const svg = readFileSync(join(publicDir, 'icon.svg'))

const writeIconPng = async (size, outPath) => {
  await sharp(svg).resize(size, size).png().toFile(outPath)
  console.log(`Wrote ${outPath}`)
}

for (const size of [192, 512]) {
  await writeIconPng(size, join(publicDir, `icon-${size}.png`))
}

/** Adaptive icon foreground layer sizes (dp * density). */
const ANDROID_FOREGROUND = [
  ['mipmap-mdpi', 108],
  ['mipmap-hdpi', 162],
  ['mipmap-xhdpi', 216],
  ['mipmap-xxhdpi', 324],
  ['mipmap-xxxhdpi', 432],
]

/** Legacy / round launcher bitmaps. */
const ANDROID_LEGACY = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
]

for (const [folder, size] of ANDROID_FOREGROUND) {
  await writeIconPng(size, join(androidRes, folder, 'ic_launcher_foreground.png'))
}

for (const [folder, size] of ANDROID_LEGACY) {
  const base = join(androidRes, folder)
  await writeIconPng(size, join(base, 'ic_launcher.png'))
  await writeIconPng(size, join(base, 'ic_launcher_round.png'))
}
