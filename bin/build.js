const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

function rmdirRecursiveSync(d) {
  for (const f of fs.readdirSync(d)) {
    const filename = path.join(d, f);
    const stat = fs.statSync(filename);
    console.log('delete', filename);
    if (stat.isDirectory()) {
      rmdirRecursiveSync(filename);
    } else if (stat.isFile()) {
      fs.unlinkSync(filename);
    }
  }
  fs.rmdirSync(d);
}

function copyDirSync(d, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest);
  }
  for (const f of fs.readdirSync(d)) {
    const srcFilename = path.join(d, f);
    const dstFilename = path.join(dest, path.basename(srcFilename));
    const stat = fs.statSync(srcFilename);
    console.log('copy', srcFilename, dstFilename);
    if (stat.isDirectory()) {
      copyDirSync(srcFilename, dstFilename);
    } else if (stat.isFile()) {
      fs.copyFileSync(srcFilename, dstFilename);
    }
  }
}

if (fs.existsSync('dist-stage1')) {
  rmdirRecursiveSync('dist-stage1');
}

fs.mkdirSync('dist-stage1');

console.log('Copying stylesheets...');

copyDirSync('css', 'dist-stage1/css');

console.log('Copying bundle...');

fs.copyFileSync('dist-stage0/ld44bundle.js', 'dist-stage1/ld44bundle.js');

console.log('Rewriting index.html...');

let html = fs.readFileSync('index.html').toString();
html = html.replace(
  `src="dist-stage0/ld44bundle.js"`,
  `src=ld44bundle.js`
);
fs.writeFileSync('dist-stage1/index.html', html);

console.log('Copying assets...');

fs.mkdirSync('dist-stage1/assets');
fs.mkdirSync('dist-stage1/assets/dr2');

const files = fs.readdirSync('assets/dr2');
for (let filename of files) {
  const ext = path.extname(filename);
  const src = `assets/dr2/${filename}`;
  const dst = `dist-stage1/assets/dr2/${filename}`;

  if (ext === '.png' || ext === '.ogg') {
    console.log(`copy ${src} to ${dst}`);
    fs.copyFileSync(src, dst);
  }
}

const zip = child_process.spawnSync(
  '7z', ['a', 'RELEASE.zip', '*'], {
    cwd: path.resolve('dist-stage1')
  }
);

if (zip.error) {
  console.log(zip.error);
} else {
  console.log('Done!');
}
