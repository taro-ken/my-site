import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const envVars = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)="(.+)"/);
  if (match) acc[match[1]] = match[match[1]] === 'FIREBASE_PRIVATE_KEY' ? match[2].replace(/\\n/g, '\n') : match[2];
  return acc;
}, {});

const serviceAccount = {
  project_id: envVars.PUBLIC_FIREBASE_PROJECT_ID,
  private_key_id: envVars.FIREBASE_PRIVATE_KEY_ID,
  private_key: envVars.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: envVars.FIREBASE_CLIENT_EMAIL,
  client_id: envVars.FIREBASE_CLIENT_ID,
};

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkUser() {
  const users = await db.collection('users').get();
  users.forEach(doc => {
    console.log(`User UID: ${doc.id}`);
    console.log(`Stripe Status: ${doc.data().stripe_status}`);
    console.log(`Stripe Sub ID: ${doc.data().stripe_subscription_id}`);
    console.log('---');
  });
}
checkUser().catch(console.error);
