import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getServiceAccount() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }
  return JSON.parse(key);
}

const app = getApps().length === 0
  ? initializeApp({ credential: cert(getServiceAccount()) })
  : getApps()[0];

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
