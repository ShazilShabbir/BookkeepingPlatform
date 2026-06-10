const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'apps/web/.next');
if (fs.existsSync(dir)) {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('.next cache cleared');
} else {
  console.log('.next not found');
}
