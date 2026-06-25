const fs = require('fs');
try {
  fs.unlinkSync('D:/BookkeepingPlatform/apps/web/pages/admin/_app.tsx');
  console.log('Deleted successfully');
} catch (e) {
  console.log('Error: ' + e.message);
}
