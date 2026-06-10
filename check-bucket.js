const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
const app = getApps().length === 0 ? initializeApp({ credential: cert(key) }) : getApps()[0];
async function check(name) {
  try {
    const bucket = getStorage().bucket(name);
    const [exists] = await bucket.exists();
    console.log(name + ': ' + (exists ? 'EXISTS' : 'NOT FOUND'));
  } catch (e) {
    console.log(name + ': ERROR - ' + e.message);
  }
}
(async () => {
  await check('bookkeeping-platform.firebasestorage.app');
  await check('bookkeeping-platform.appspot.com');
  process.exit(0);
})();
