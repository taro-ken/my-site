import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();

const serviceAccount = {
  project_id: process.env.PUBLIC_FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
};

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkUser() {
  const users = await db.collection('users').get();
  users.forEach(doc => {
    console.log(`User: ${doc.id}`);
    console.log(`Email: ${doc.data().email}`);
    console.log(`Stripe Status: ${doc.data().stripe_status}`);
    console.log('---');
  });
}
checkUser().catch(console.error);
