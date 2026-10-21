import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(root, '..', 'public')

// Both SVGs are the source of truth for the palette and the mark. The maskable
// source keeps the artwork inside the middle 80% circle (scale 17 of the 32-unit
// mark), so Android's mask never clips the aperture ring.
const standard = await readFile(path.join(publicDir, 'icon.svg'))
const maskable = await readFile(path.join(publicDir, 'icon-maskable.svg'))

// Paper, used to flatten the transparent corners of the standard mark. iOS
// renders transparency in a touch icon as black, so the touch icon must be
// opaque; the manifest icons stay opaque for the same reason.
const PAPER = '#faf9f5'

const targets = [
  { input: standard, size: 192, name: 'pwa-192x192.png', flatten: PAPER },
  { input: standard, size: 512, name: 'pwa-512x512.png', flatten: PAPER },
  { input: standard, size: 180, name: 'apple-touch-icon-180x180.png', flatten: PAPER },
  { input: maskable, size: 512, name: 'pwa-maskable-512x512.png' },
]

for (const target of targets) {
  const out = path.join(publicDir, target.name)
  let pipeline = sharp(target.input, { density: 384 }).resize(target.size, target.size, {
    fit: 'contain',
  })
  if (target.flatten) pipeline = pipeline.flatten({ background: target.flatten })

  await pipeline.png({ compressionLevel: 9 }).toFile(out)

  const { width, height } = await sharp(out).metadata()
  if (width !== target.size || height !== target.size) {
    throw new Error(`${target.name} came out ${width}×${height}, expected ${target.size}²`)
  }
  console.log(`✓ ${target.name}`)
}
