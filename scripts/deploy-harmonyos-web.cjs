// Copies the Vite web build (dist/) into the HarmonyOS entry rawfile/www/ so
// the ArkWeb WebView shell can load it locally via $rawfile('www/index.html').
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../dist');
const dest = path.join(__dirname, '../harmonyos/entry/src/main/resources/rawfile/www');

function copyDir(from, to) {
  if (!fs.existsSync(from)) {
    throw new Error(`Source not found: ${from} (run vite build first)`);
  }
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// Clear the destination so stale hashed assets are removed.
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}
copyDir(src, dest);
console.log(`HarmonyOS web assets deployed: ${dest}`);
