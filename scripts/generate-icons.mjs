import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(root, '..', 'public')

const standard = await readFile(path.join(publicDir, 'icon.svg'))
const maskable = await readFile(path.join(publicDir, 'icon-maskable.svg'))

const targets = [
  { input: standard, size: 192, name: 'pwa-192x192.png' },
  { input: standard, size: 512, name: 'pwa-512x512.png' },
  { input: standard, size: 180, name: 'apple-touch-icon-180x180.png' },
  { input: maskable, size: 512, name: 'pwa-maskable-512x512.png' },
]

for (const target of targets) {
  await sharp(target.input, { density: 384 })
    .resize(target.size, target.size, { fit: 'contain' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, target.name))
  console.log(`✓ ${target.name}`)
}
