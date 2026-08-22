#!/usr/bin/env node
/**
 * Remove EXIF, GPS, XMP, and other metadata segments from published JPEGs.
 *
 * These are photographs of children. Phone cameras write GPS coordinates and a
 * device serial into the file, and publishing that on a public site would put
 * the location of a group of minors on the internet. Nothing but the image data
 * and the colour profile survives.
 */
const fs = require('node:fs');
const path = require('node:path');

const KEEP_APP2_ICC = true;

function strip(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null; // not a JPEG
  const out = [buffer.subarray(0, 2)];
  let i = 2;
  let removed = 0;

  while (i < buffer.length - 1) {
    if (buffer[i] !== 0xff) break;
    const marker = buffer[i + 1];

    // Start of scan: the rest of the file is entropy-coded image data.
    if (marker === 0xda) {
      out.push(buffer.subarray(i));
      break;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      out.push(buffer.subarray(i, i + 2));
      i += 2;
      continue;
    }

    const length = buffer.readUInt16BE(i + 2);
    const segment = buffer.subarray(i, i + 2 + length);
    const isApp = marker >= 0xe0 && marker <= 0xef;
    const isComment = marker === 0xfe;
    const isIccProfile = marker === 0xe2 && segment.includes(Buffer.from('ICC_PROFILE'));

    if ((isApp && !(KEEP_APP2_ICC && isIccProfile)) || isComment) {
      removed += segment.length;
    } else {
      out.push(segment);
    }
    i += 2 + length;
  }

  return { buffer: Buffer.concat(out), removed };
}

const roots = process.argv.slice(2);
if (!roots.length) roots.push('assets');

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.jpe?g$/i.test(entry.name)) files.push(full);
  }
};
for (const root of roots) {
  const stat = fs.statSync(root);
  stat.isDirectory() ? walk(root) : files.push(root);
}

let touched = 0;
for (const file of files) {
  const result = strip(fs.readFileSync(file));
  if (!result || result.removed === 0) continue;
  fs.writeFileSync(file, result.buffer);
  console.log(`  stripped ${(result.removed / 1024).toFixed(1)} KB of metadata from ${file}`);
  touched += 1;
}
console.log(`EXIF strip: ${files.length} JPEGs scanned, ${touched} rewritten.`);
