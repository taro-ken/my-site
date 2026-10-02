import { SignedDataVerifier, Environment } from "@apple/app-store-server-library";

/**
 * StoreKit(IAP)で購入されたトランザクション/Appleからの通知(App Store Server Notifications V2)を
 * 検証するための共通ヘルパー。サーバーレス環境でファイル読み込みに頼らないよう、
 * Apple Root CA G3証明書はbase64でソースに埋め込んでいる(https://www.apple.com/certificateauthority/)。
 */
const APPLE_ROOT_CA_G3_BASE64 =
    "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==";

const BUNDLE_ID = "com.kk.essence";

function rootCA(): Buffer {
    return Buffer.from(APPLE_ROOT_CA_G3_BASE64, "base64");
}

let sandboxVerifier: SignedDataVerifier | null = null;
function getSandboxVerifier(): SignedDataVerifier {
    if (!sandboxVerifier) {
        sandboxVerifier = new SignedDataVerifier([rootCA()], true, Environment.SANDBOX, BUNDLE_ID);
    }
    return sandboxVerifier;
}

let productionVerifier: SignedDataVerifier | null | undefined;
/**
 * 本番のApple IDが未設定の間(審査提出前など)はnullを返し、Sandboxのみで検証する。
 * APPLE_APP_APPLE_ID(App Store ConnectのApp情報ページにある数字のApple ID)を
 * 設定すると本番トランザクションも検証できるようになる。
 */
function getProductionVerifier(): SignedDataVerifier | null {
    if (productionVerifier !== undefined) return productionVerifier;
    const appAppleId = import.meta.env.APPLE_APP_APPLE_ID;
    if (!appAppleId) {
        productionVerifier = null;
        return null;
    }
    productionVerifier = new SignedDataVerifier([rootCA()], true, Environment.PRODUCTION, BUNDLE_ID, Number(appAppleId));
    return productionVerifier;
}

/** StoreKitのTransaction.jwsRepresentationを検証・デコードする。 */
export async function verifyAppleTransaction(signedTransactionInfo: string) {
    const prod = getProductionVerifier();
    if (prod) {
        try {
            return await prod.verifyAndDecodeTransaction(signedTransactionInfo);
        } catch {
            // 本番検証に失敗した場合はSandbox(TestFlight/開発時)の可能性があるため続けて試す。
        }
    }
    return await getSandboxVerifier().verifyAndDecodeTransaction(signedTransactionInfo);
}

/** App Store Server Notifications V2のsignedPayloadを検証・デコードする。 */
export async function verifyAppleNotification(signedPayload: string) {
    const prod = getProductionVerifier();
    if (prod) {
        try {
            return await prod.verifyAndDecodeNotification(signedPayload);
        } catch {
            // 本番検証に失敗した場合はSandboxの可能性があるため続けて試す。
        }
    }
    return await getSandboxVerifier().verifyAndDecodeNotification(signedPayload);
}
