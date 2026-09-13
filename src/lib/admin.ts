import type { AstroCookies } from "astro";
import { adminAuth } from "./firebase/server";
import type { UserRecord } from "firebase-admin/auth";

/**
 * サイト管理者(Podcastアップロード等の運用作業を行う本人)かどうかをセッションCookieから判定する。
 * 管理者かどうかはメールアドレスの一致でのみ判定する(ADMIN_EMAIL環境変数)。
 */
export async function requireAdmin(cookies: AstroCookies): Promise<UserRecord | null> {
    const sessionCookie = cookies.get("session")?.value;
    if (!sessionCookie) return null;

    try {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        const user = await adminAuth.getUser(decoded.uid);
        if (!user.email || user.email !== import.meta.env.ADMIN_EMAIL) {
            return null;
        }
        return user;
    } catch {
        return null;
    }
}
