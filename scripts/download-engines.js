// Download prisma engines using curl with robust retry
const { execSync } = require('child_process');
const fs = require('fs');

const ENGINES = [
  {
    url: 'https://binaries.prisma.sh/all_commits/c2990dca591cba766e3b7ef5d9e8a84796e47ab7/debian-openssl-3.0.x/libquery_engine.so.node.gz',
    dest: '/tmp/libquery_engine.so.node.gz',
    expectedSize: 7789708,
  },
  {
    url: 'https://binaries.prisma.sh/all_commits/c2990dca591cba766e3b7ef5d9e8a84796e47ab7/debian-openssl-3.0.x/schema-engine.gz',
    dest: '/tmp/schema-engine.gz',
    expectedSize: 6402803,
  },
];

function downloadChunk(url, dest, startByte, maxRetries = 200) {
  for (let i = 0; i < maxRetries; i++) {
    const currentSize = fs.existsSync(dest) ? fs.statSync(dest).size : 0;
    if (currentSize >= startByte && startByte > 0 && currentSize !== startByte) {
      // File changed, restart from current
    }
    try {
      const headers = currentSize > 0 ? `-H "Range: bytes=${currentSize}-"` : '';
      const cmd = `curl -sL --connect-timeout 15 --max-time 120 ${headers} -C - -o "${dest}" "${url}"`;
      execSync(cmd, { stdio: 'pipe', timeout: 130000 });
      const newSize = fs.statSync(dest).size;
      console.log(`  Chunk attempt ${i + 1}: ${currentSize} -> ${newSize} bytes`);
      return newSize;
    } catch (err) {
      const size = fs.existsSync(dest) ? fs.statSync(dest).size : 0;
      console.log(`  Attempt ${i + 1} failed at ${size} bytes: ${err.message.split('\n')[0]}`);
      // small wait
      const start = Date.now();
      while (Date.now() - start < 1500) { /* spin */ }
    }
  }
  return fs.existsSync(dest) ? fs.statSync(dest).size : 0;
}

for (const e of ENGINES) {
  console.log(`Downloading ${e.dest} (expected ${e.expectedSize} bytes)...`);
  let size = 0;
  const maxOuterRetries = 500;
  for (let i = 0; i < maxOuterRetries; i++) {
    size = downloadChunk(e.url, e.dest, size, 3);
    if (size >= e.expectedSize) {
      console.log(`[COMPLETE] ${e.dest}: ${size} bytes`);
      break;
    }
    console.log(`Outer retry ${i + 1}, current size ${size}/${e.expectedSize}`);
  }
  if (size < e.expectedSize) {
    console.error(`[FAILED] ${e.dest} only got ${size}/${e.expectedSize}`);
    // Continue anyway - partial might still be usable? No, it won't.
  }
}
console.log('DONE');
