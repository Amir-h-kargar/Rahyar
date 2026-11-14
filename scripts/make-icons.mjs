import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outDir = path.join(root, 'public', 'icons');
await mkdir(outDir, { recursive: true });

async function svgFrom(file) {
  const html = await readFile(path.join(root, 'scripts', file), 'utf8');
  const match = html.match(/<svg[\s\S]*<\/svg>/);
  if (!match) throw new Error(`No SVG found in ${file}`);
  return match[0];
}

const normal = await svgFrom('icon.html');
const maskable = await svgFrom('icon-maskable.html');

const targets = [
  { svg: normal, size: 192, file: 'icon-192.png' },
  { svg: normal, size: 512, file: 'icon-512.png' },
  { svg: normal, size: 180, file: 'apple-touch-icon.png' },
  { svg: normal, size: 32, file: 'favicon-32.png' },
  { svg: maskable, size: 512, file: 'maskable-512.png' },
];

for (const target of targets) {
  await sharp(Buffer.from(target.svg))
    .resize(target.size, target.size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, target.file));
  console.log(`wrote ${target.file} (${target.size}x${target.size})`);
}

// Also write a standalone favicon.svg for crisp browser tabs.
const favicon = normal.replace('width="100%" height="100%"', '');
await writeFile(path.join(root, 'public', 'favicon.svg'), favicon, 'utf8');
console.log('wrote favicon.svg');
