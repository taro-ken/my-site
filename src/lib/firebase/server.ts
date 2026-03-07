import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App;

if (getApps().length === 0) {
    // We piece together the service account from individual environment variables
    // to avoid issues with parsing multiline JSON strings in .env files on some platforms
    const serviceAccount = {
        type: "service_account",
        project_id: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
        private_key_id: import.meta.env.FIREBASE_PRIVATE_KEY_ID,
        // Replace literal '\n' characters in the key with actual newlines
        private_key: import.meta.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: import.meta.env.FIREBASE_CLIENT_EMAIL,
        client_id: import.meta.env.FIREBASE_CLIENT_ID,
        auth_uri: import.meta.env.FIREBASE_AUTH_URI,
        token_uri: import.meta.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: import.meta.env.FIREBASE_AUTH_CERT_URL,
        client_x509_cert_url: import.meta.env.FIREBASE_CLIENT_CERT_URL,
    };

    adminApp = initializeApp({
        credential: cert(serviceAccount as any),
    });
} else {
    adminApp = getApps()[0];
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
