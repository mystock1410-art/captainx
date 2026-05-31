import sharp from "sharp";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const srcPath = resolve("public/ocbs-logo.png");
const sizes = [16, 32, 48];

const pngBuffers = await Promise.all(
  sizes.map((sz) =>
    sharp(srcPath)
      .resize(sz, sz, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer(),
  ),
);

// ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes) * n + PNG data
const dirSize = 6 + 16 * sizes.length;
const totalSize = dirSize + pngBuffers.reduce((s, b) => s + b.length, 0);
const out = Buffer.alloc(totalSize);

// ICONDIR
out.writeUInt16LE(0, 0);          // reserved
out.writeUInt16LE(1, 2);          // type = 1 (icon)
out.writeUInt16LE(sizes.length, 4); // count

let dirOffset = 6;
let dataOffset = dirSize;
for (let i = 0; i < sizes.length; i++) {
  const sz = sizes[i];
  const buf = pngBuffers[i];
  const dim = sz >= 256 ? 0 : sz;
  out.writeUInt8(dim, dirOffset);             // width
  out.writeUInt8(dim, dirOffset + 1);         // height
  out.writeUInt8(0, dirOffset + 2);           // palette
  out.writeUInt8(0, dirOffset + 3);           // reserved
  out.writeUInt16LE(1, dirOffset + 4);        // planes
  out.writeUInt16LE(32, dirOffset + 6);       // bpp
  out.writeUInt32LE(buf.length, dirOffset + 8);
  out.writeUInt32LE(dataOffset, dirOffset + 12);
  buf.copy(out, dataOffset);
  dirOffset += 16;
  dataOffset += buf.length;
}

const dst = resolve("src/app/favicon.ico");
writeFileSync(dst, out);

// Also write a 180x180 apple-icon.png for iOS/macOS bookmarks
const apple = await sharp(srcPath)
  .resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
writeFileSync(resolve("src/app/apple-icon.png"), apple);

console.log(`favicon.ico: ${out.length} bytes (sizes: ${sizes.join(", ")})`);
console.log(`apple-icon.png: ${apple.length} bytes (180x180)`);
