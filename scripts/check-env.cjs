const fs = require('fs');
const path = require('path');

const appEnv = path.join(__dirname, 'apps/web/.env.local');
const rootEnv = path.join(__dirname, '.env.local');

console.log('apps/web/.env.local exists:', fs.existsSync(appEnv));
console.log('root .env.local exists:', fs.existsSync(rootEnv));

if (fs.existsSync(appEnv)) {
  const content = fs.readFileSync(appEnv, 'utf-8');
  console.log('apps/web/.env.local content:');
  console.log(content);
}

// Check for firebase service account files
const glob = require('path').resolve;
const dir = __dirname;
console.log('\nLooking for service account keys in', dir);

function findFiles(dir, pattern) {
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (f.includes('service') || f.includes('firebase-admin') || f.includes('.json')) {
        if (fs.statSync(full).isFile() && f.endsWith('.json')) {
          console.log('  Found JSON file:', full);
        }
      }
      if (fs.statSync(full).isDirectory() && !f.startsWith('.') && !f.startsWith('node_modules')) {
        if (full.length < 100) findFiles(full, pattern);
      }
    }
  } catch {}
}

findFiles(dir, null);
