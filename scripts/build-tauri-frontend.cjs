const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

process.env.TAURI_BUILD = '1';

const viteJs = path.join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js');
const child = spawn(process.execPath, [viteJs, 'build'], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: process.env,
});

child.on('exit', (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  // Standard ESM production build. dist-tauri/index.html keeps the real hashed
  // asset names (desktop pack + web deploy use it unchanged). A second embedded
  // copy is assembled for the in-app Rust web server with stable fixed paths so
  // include_str! does not depend on Vite hash names.
  const distDir = path.join(__dirname, '..', 'dist-tauri');
  const indexPath = path.join(distDir, 'index.html');
  let html;
  try {
    html = fs.readFileSync(indexPath, 'utf8');
  } catch (err) {
    console.error('[post-build] failed to read index.html:', err.message);
    process.exit(1);
  }

  const assetsDir = path.join(distDir, 'assets');
  const files = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
  const jsFiles = files.filter((f) => f.endsWith('.js'));
  const cssFiles = files.filter((f) => f.endsWith('.css'));
  const jsName = jsFiles.find((f) => f.startsWith('index-')) || jsFiles[0];
  const cssName = cssFiles.find((f) => f.startsWith('index-')) || cssFiles[0] || null;
  if (!jsName) {
    console.error('[post-build] expected at least one JS asset in dist-tauri/assets, got:', jsFiles);
    process.exit(1);
  }

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // --- Desktop / web: dist-tauri keeps the real hashed asset filenames. ---
  fs.writeFileSync(indexPath, html);

  const embedDir = path.join(__dirname, '..', 'src-tauri', 'embedded');
  fs.rmSync(embedDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(embedDir, 'js'), { recursive: true });
  fs.mkdirSync(path.join(embedDir, 'icons'), { recursive: true });
  try {
    // --- Android embedded (served by the in-app Rust web server): stable fixed paths. ---
    const embedIndexHtml = html
      .replace(new RegExp('\\./assets/' + jsName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), './js/app.js')
      .replace(new RegExp('\\./assets/' + cssName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), './js/app.css');
    fs.writeFileSync(path.join(embedDir, 'index.html'), embedIndexHtml);
    fs.copyFileSync(path.join(assetsDir, jsName), path.join(embedDir, 'js', 'app.js'));
    if (cssName) fs.copyFileSync(path.join(assetsDir, cssName), path.join(embedDir, 'js', 'app.css'));
    for (const f of jsFiles) {
      fs.copyFileSync(path.join(assetsDir, f), path.join(embedDir, 'js', f));
    }
    for (const f of ['manifest.json', 'sw.js']) {
      const src = path.join(distDir, f);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(embedDir, f));
    }
    const iconSvg = path.join(distDir, 'icons', 'icon.svg');
    if (fs.existsSync(iconSvg)) fs.copyFileSync(iconSvg, path.join(embedDir, 'icons', 'icon.svg'));
  } catch (err) {
    console.error('[post-build] failed to assemble src-tauri/embedded:', err.message);
    process.exit(1);
  }
  console.log('[post-build] dist-tauri kept as ESM; src-tauri/embedded packaged');
  process.exit(0);
});

child.on('error', (err) => {
  console.error(err);
  process.exit(1);
});