/* Complete resource build: consistent covers, responsive images, social cards, guide pages. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.join(__dirname, '..');
const B = require('../resource-core.js');
const items = JSON.parse(fs.readFileSync(path.join(root, 'data/resources.json'), 'utf8'));
const seen = new Set();
for (const item of items) {
  const validation = B.validate(item);
  if (validation.errors.length) throw Error(`${item.slug}: ${validation.errors.join('; ')}`);
  if (seen.has(item.slug)) throw Error(`Duplicate slug: ${item.slug}`);
  seen.add(item.slug);
}
const originalsFile = path.join(root, 'data/original-resource-artwork.json');
const originals = fs.existsSync(originalsFile) ? JSON.parse(fs.readFileSync(originalsFile, 'utf8')) : {};
for (const [slug, artwork] of Object.entries(originals)) {
  if (!B.assetURL(artwork.image_url, 'image')) throw Error(`${slug}: original artwork needs a safe supported image path.`);
  if (artwork.image_url.startsWith('/') && !fs.existsSync(path.join(root, artwork.image_url))) throw Error(`${slug}: original artwork file is missing.`);
}
const python = process.env.NICBUILDZ_PYTHON || 'python3';
for (const [executable, args] of [
  [python, [path.join(__dirname, 'prepare-thumbnails.py'), '--all', '--attach']],
  [process.execPath, [path.join(__dirname, 'build-resources.cjs')]]
]) {
  const result = spawnSync(executable, args, {cwd: root, stdio: 'inherit'});
  if (result.error || result.status !== 0) {
    console.error(result.error?.message || 'Library build stopped. Correct the error above before publishing.');
    if (executable === python) console.error('Use Python with Pillow >= 10. Set NICBUILDZ_PYTHON to its executable if needed.');
    process.exit(result.status || 1);
  }
}
