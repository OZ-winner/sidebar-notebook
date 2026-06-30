import fs from "fs";
import path from "path";
import zlib from "zlib";
 
 function crc32(buf) {
   let c = 0xffffffff;
   for (let i = 0; i < buf.length; i++) {
     c ^= buf.readUInt8(i);
     for (let j = 0; j < 8; j++) {
       if (c & 1) c = (c >>> 1) ^ 0xedb88320;
       else c >>>= 1;
     }
   }
   return (c ^ 0xffffffff) >>> 0;
 }
 
 function chunk(type, data) {
   const len = Buffer.alloc(4);
   len.writeUInt32BE(data.length, 0);
   const typeB = Buffer.from(type, "ascii");
   const crcData = Buffer.concat([typeB, data]);
   const crcB = Buffer.alloc(4);
   crcB.writeUInt32BE(crc32(crcData), 0);
   return Buffer.concat([len, typeB, data, crcB]);
 }
 
 function genPNG(width, height, pixelFunc) {
   const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
   const ihdr = Buffer.alloc(13);
   ihdr.writeUInt32BE(width, 0);
   ihdr.writeUInt32BE(height, 4);
   ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
   const ihdrChunk = chunk("IHDR", ihdr);
   const rows = [];
   for (let y = 0; y < height; y++) {
     const row = [0];
     for (let x = 0; x < width; x++) {
       const px = pixelFunc(x, y, width, height);
       row.push(px[0], px[1], px[2], px[3]);
     }
     rows.push(Buffer.from(row));
   }
   const compressed = zlib.deflateSync(Buffer.concat(rows));
   const idat = chunk("IDAT", compressed);
   const iend = chunk("IEND", Buffer.alloc(0));
   return Buffer.concat([sig, ihdrChunk, idat, iend]);
 }
 
 function penPx(x, y, w, h) {
   const cx = Math.floor(w / 2);
   const cy = Math.floor(h / 2);
   const rx = x - cx, ry = y - cy;
   const s = Math.abs(rx + ry), d = Math.abs(rx - ry);
   if (s <= 3 && d <= 2 && ry <= 6 && ry >= -8) {
     if (ry >= 4 && ry <= 7 && s <= 2) return [50,50,50,255];
     return [80,80,80,255];
   }
   if (ry >= -9 && ry <= -7 && s <= 4 && d <= 1) return [60,60,60,255];
   return [0,0,0,0];
 }
 
 const iconsDir = path.join(process.cwd(), "src-tauri", "icons");
 const appIcon = genPNG(1024, 1024, penPx);
 const sourcePath = path.join(process.cwd(), "app-icon.png");
 fs.writeFileSync(sourcePath, appIcon);
 console.log("App icon source created at " + sourcePath);
