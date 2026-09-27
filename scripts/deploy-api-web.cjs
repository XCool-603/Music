// Copies the fresh Vite production build (dist/) into the API's wwwroot/music/
// and synchronizes all server publish folders.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../dist');
const targets = [
  path.join(__dirname, '../background/Muse.Audio.Api/wwwroot/music'),
  path.join(__dirname, '../publish/wwwroot/music'),
  path.join(__dirname, '../api-publish2/wwwroot/music'),
  path.join(__dirname, '../background/publish-linux-x64/wwwroot/music'),
];

function copyDir(from, to) {
  if (!fs.existsSync(from)) {
    throw new Error(`Source not found: ${from} (run npm run build:frontend first)`);
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

for (const dest of targets) {
  const parent = path.dirname(dest);
  if (fs.existsSync(parent)) {
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    copyDir(src, dest);
    console.log(`Web assets deployed to: ${dest}`);
  }
}

// Copy DISCLAIMER.md into wwwroot of all targets
const disclaimerSrc = path.join(__dirname, '../DISCLAIMER.md');
if (fs.existsSync(disclaimerSrc)) {
  const wwwrootTargets = [
    path.join(__dirname, '../background/Muse.Audio.Api/wwwroot/DISCLAIMER.md'),
    path.join(__dirname, '../publish/wwwroot/DISCLAIMER.md'),
    path.join(__dirname, '../api-publish2/wwwroot/DISCLAIMER.md'),
    path.join(__dirname, '../background/publish-linux-x64/wwwroot/DISCLAIMER.md'),
  ];
  for (const d of wwwrootTargets) {
    if (fs.existsSync(path.dirname(d))) {
      fs.copyFileSync(disclaimerSrc, d);
      console.log(`Disclaimer deployed to: ${d}`);
    }
  }
}

console.log('API web assets deployment completed successfully.');
