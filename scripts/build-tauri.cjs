const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BUILDS = path.join(ROOT, 'builds');

function clean() {
  if (fs.existsSync(BUILDS)) fs.rmSync(BUILDS, { recursive: true, force: true });
  for (const d of ['pwa', 'windows', 'macos', 'linux', 'android', 'ios']) {
    fs.mkdirSync(path.join(BUILDS, d), { recursive: true });
  }
}

function run(cmd) {
  console.log(`\n> ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT });
    return true;
  } catch (e) {
    console.error(`[SKIP] Build failed (platform toolchain may not be installed)`);
    return false;
  }
}

function copyDir(src, dest) {
  if (fs.existsSync(src)) fs.cpSync(src, dest, { recursive: true });
}

function findAndCopy(dir, pattern, dest) {
  if (!fs.existsSync(dir)) return;
  const walk = (d) => {
    for (const item of fs.readdirSync(d)) {
      const full = path.join(d, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (pattern.test(item)) {
        fs.copyFileSync(full, path.join(dest, item));
        console.log(`  Copied: ${item}`);
      }
    }
  };
  walk(dir);
}

function buildPWA() {
  console.log('\n========== PWA ==========');
  run('npx vite build');
  copyDir(path.join(ROOT, 'dist'), path.join(BUILDS, 'pwa'));
  console.log(`PWA -> builds/pwa/`);
}

function buildDesktop() {
  console.log('\n========== Desktop (Tauri) ==========');

  // Build the tauri frontend first (generates dist-tauri + src-tauri/embedded).
  run('node scripts/build-tauri-frontend.cjs');

  const target = process.platform;
  let platformName, rustTarget;

  if (target === 'win32') {
    platformName = 'windows';
    rustTarget = 'x86_64-pc-windows-msvc';
  } else if (target === 'darwin') {
    platformName = 'macos';
    rustTarget = 'universal-apple-darwin';
  } else {
    platformName = 'linux';
    rustTarget = 'x86_64-unknown-linux-gnu';
  }

  console.log(`Building for ${platformName} (${rustTarget})...`);
  const ok = run(`npx tauri build --target ${rustTarget}`);

  if (ok) {
    // Find and copy build artifacts
    const tauriTarget = path.join(ROOT, 'src-tauri', 'target', rustTarget, 'release', 'bundle');
    const destDir = path.join(BUILDS, platformName);

    if (fs.existsSync(tauriTarget)) {
      // Copy NSIS installer and exe (Windows)
      findAndCopy(path.join(tauriTarget, 'nsis'), /\.exe$|\.nsis$/, destDir);
      findAndCopy(path.join(tauriTarget, 'msi'), /\.msi$/, destDir);
      // Copy dmg (macOS)
      findAndCopy(path.join(tauriTarget, 'dmg'), /\.dmg$/, destDir);
      // Copy AppImage/deb (Linux)
      findAndCopy(path.join(tauriTarget, 'appimage'), /\.AppImage$/, destDir);
      findAndCopy(path.join(tauriTarget, 'deb'), /\.deb$/, destDir);
      // Copy raw bundle
      findAndCopy(path.join(tauriTarget, 'windows'), /\.exe$|\.msi$/, destDir);
    }

    // Also copy unpacked dir info
    const unpacked = path.join(ROOT, 'src-tauri', 'target', rustTarget, 'release', 'bundle');
    if (fs.existsSync(unpacked)) {
      console.log(`Desktop build -> builds/${platformName}/`);
    }
  }
}

function buildAndroid() {
  console.log('\n========== Android (Tauri) ==========');
  // Regenerate dist-tauri + src-tauri/embedded before the Rust build.
  run('node scripts/build-tauri-frontend.cjs');
  run('npx tauri android build');
  // Android APK/AAB output
  const androidOut = path.join(ROOT, 'src-tauri', 'gen', 'android');
  if (fs.existsSync(androidOut)) {
    const dest = path.join(BUILDS, 'android');
    // Find APK files
    const findApk = (dir) => {
      if (!fs.existsSync(dir)) return;
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) findApk(full);
        else if (item.endsWith('.apk') || item.endsWith('.aab')) {
          fs.copyFileSync(full, path.join(dest, item));
          console.log(`  Copied: ${item}`);
        }
      }
    };
    findApk(androidOut);
    console.log('Android -> builds/android/');
  }
}

function buildIOS() {
  console.log('\n========== iOS (Tauri) ==========');
  run('npx tauri ios build');
  console.log('iOS -> builds/ios/');
}

function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('  BUILD OUTPUT: builds/');
  console.log('='.repeat(50));

  const walk = (dir, prefix = '') => {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir).sort();
    for (const item of items) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        console.log(`${prefix}\x1b[36m${item}/\x1b[0m`);
        walk(full, prefix + '  ');
      } else {
        const size = stat.size > 1024 * 1024
          ? `${(stat.size / 1024 / 1024).toFixed(1)} MB`
          : `${(stat.size / 1024).toFixed(0)} KB`;
        console.log(`${prefix}\x1b[32m${item}\x1b[0m (${size})`);
      }
    }
  };

  walk(BUILDS);
  console.log('='.repeat(50));
}

// Main
console.log('MUSE.AUDIO Tauri 2.0 Multi-Platform Builder\n');
console.log('Output: builds/\n');

clean();
buildPWA();
buildDesktop();
buildAndroid();
buildIOS();
printSummary();

console.log('\nDone!');
