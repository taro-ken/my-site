import { adminDb } from './firebase/server';

/** Firestore `users` の購入フラグ（Webhook が教材決済完了時に付与） */
export async function hasLearningMaterialsPurchase(uid: string): Promise<boolean> {
  const doc = await adminDb.collection('users').doc(uid).get();
  return !!(doc.exists && doc.data()?.learning_materials_purchased === true);
}
