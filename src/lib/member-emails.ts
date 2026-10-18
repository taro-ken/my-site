import { adminAuth, adminDb } from "./firebase/server";
import { isActiveMember } from "./courses";

/**
 * Essence会員(stripe_status / apple_status が active)のメールアドレス一覧を返す。
 * メールは Firebase Auth から取得する(Firestore users には無い場合がある)。
 */
export async function listActiveMemberEmails(): Promise<string[]> {
    const snapshot = await adminDb.collection("users").get();
    const memberUids = snapshot.docs
        .filter((doc) => isActiveMember(doc.data()))
        .map((doc) => doc.id);

    if (memberUids.length === 0) return [];

    const emails: string[] = [];
    // getUsers は最大100件ずつ
    for (let i = 0; i < memberUids.length; i += 100) {
        const chunk = memberUids.slice(i, i + 100);
        const result = await adminAuth.getUsers(chunk.map((uid) => ({ uid })));
        for (const user of result.users) {
            const email = user.email?.trim().toLowerCase();
            if (email) emails.push(email);
        }
    }

    return [...new Set(emails)];
}
