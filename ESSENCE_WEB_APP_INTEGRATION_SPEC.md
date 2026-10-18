# Essence Web ↔ App 相互仕様書

Web（`taroessence.com` / my-portfolio）と iOS アプリ（Essence）が共有するデータ・API・課金・配信基盤の技術仕様。  
ブランド／LP方針は `ESSENCE_MEMBERSHIP_SPEC.md` を参照。

| 項目 | 内容 |
|---|---|
| 最終更新 | 2026-10-17 |
| Web リポジトリ | `my-portfolio`（本番ドメイン `https://taroessence.com`） |
| App リポジトリ | `Essence`（Bundle ID `com.kk.essence`） |
| App Store ID | `6814047000` |
| Team ID + Bundle | `ZCR4QT36HT.com.kk.essence` |

---

## 1. 全体構成

```
┌─────────────────┐     Firebase Auth / Firestore      ┌──────────────────┐
│  Web (Astro)    │◄──────────────────────────────────►│  Essence (iOS)   │
│  taroessence.com│                                     │  com.kk.essence  │
└────────┬────────┘                                     └────────┬─────────┘
         │ REST (/api/*) + ID トークン                             │
         │◄───────────────────────────────────────────────────────┘
         │
    ┌────┴─────┬──────────┬────────────┬──────────┐
    │ Stripe   │ Apple    │ Cloudflare │ Minima   │
    │ (Web課金)│ (IAP)    │ R2 (音声/動画)│ (持ち物) │
    └──────────┴──────────┴────────────┴──────────┘
```

### 役割分担

| 領域 | Web | App |
|---|---|---|
| 認証 | Firebase Auth（メール+パスワード）、セッション Cookie | 同一 Firebase Auth、ID トークン |
| 会員判定 | `users/{uid}` の `stripe_status` / `apple_status` | 同左を Firestore 直読み |
| 講座メタ | Firestore `courses`（管理画面で編集） | Firestore 直読み |
| 講座動画 | R2 署名 URL（SSR / API） | `/api/courses/.../video-url` |
| Podcast メタ | Firestore `podcastEpisodes`（管理画面） | Firestore 直読み（`publishedAt <= now`） |
| Podcast 音声 | R2 署名 URL（管理アップロード） | `/api/podcast/.../audio-url` |
| 実践ツール（BS / 瞑想 / 健康） | 未提供（アプリ専用） | Firestore `users/{uid}/...` |
| 持ち物リスト | 未提供 | 外部 API **Minima** |
| LP / 法務 / 管理 | Web のみ | Universal Link で誘導 |
| 課金 | Stripe Checkout / Portal / Webhook | StoreKit IAP + `/api/apple/*`（Stripe 導線は準備中フラグで停止可） |

---

## 2. 利用サービス一覧

| サービス | 用途 | 共有 |
|---|---|---|
| **Firebase Auth**（プロジェクト `fitw-prod`） | ユーザー認証 | Web / App 共通 |
| **Cloud Firestore**（`fitw-prod`） | 会員状態・講座・Podcast・ユーザーデータ | Web / App 共通 |
| **Cloudflare R2** | Podcast 音声（m4a）・講座動画（mp4）・サムネ | Web Admin SDK が書込、再生は署名 URL |
| **Stripe** | Web / アプリ経由のカード定期課金 | Webhook が Firestore を更新 |
| **App Store Server / StoreKit** | IAP 月額 `com.kk.essence.membership.monthly` | App 購入 → Web API で検証・反映 |
| **Vercel** | Web ホスティング・API | Production / Preview（staging） |
| **microCMS** | ブログ記事（Web 中心。アプリの記事機能は廃止済み） | Web |
| **Minima**（別 Vercel） | Item List / Wishlist / 外部同期 | App のみ（DEBUG/RELEASE 共通 URL） |
| **Discord OAuth** | 会員向け Discord 連携（Web） | Web |
| **Apple HealthKit** | Healthcare 画面 | App のみ |
| **App Store Connect** | 配信・IAP・スクリーンショット | App |
| **Resend** | Course / Podcast 更新の会員向けメール通知 | Web 管理画面から送信 |

### 環境変数（要点）

| 変数 | 用途 |
|---|---|
| `PUBLIC_FIREBASE_*` / `FIREBASE_*` | Web の Firebase Client / Admin |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` | R2 |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `PUBLIC_STRIPE_PRICE_ID` | Stripe（Production=本番キー、Preview=テストキー） |
| `APPLE_APP_APPLE_ID` | 本番 IAP レシート検証用（= App Store ID `6814047000`） |
| `ADMIN_EMAIL` | Podcast / Course 管理画面の管理者判定 |
| `MATERIALS_DOWNLOAD_URL` | 教材ワンタイム購入の DL（未設定だと 503） |
| `RESEND_API_KEY` | 会員向け更新メール（未設定だと通知 API は 503） |
| `RESEND_FROM_EMAIL` | 差出人（既定: `Essence <hello@taroessence.com>`） |

コード定数（`src/lib/essence.ts`）:

| 定数 | 現在値 | 意味 |
|---|---|---|
| `ESSENCE_JOIN_OPEN` | `false` | Stripe 新規参加を止める（準備中） |
| `ESSENCE_APP_STORE_ID` | `6814047000` | ストア URL / 強制アプデの遷移先 |
| `ESSENCE_IOS_APP_ID` | `ZCR4QT36HT.com.kk.essence` | AASA |
| `ESSENCE_IOS_MINIMUM_VERSION` | `1.0` | 強制アップデート閾値 |

---

## 3. 接続先（本番 vs テスト）

### iOS `APIConfig`

| ビルド | Web API ベース | 備考 |
|---|---|---|
| **DEBUG** | `https://my-site-git-essence-staging-kentaros-projects-70c7a0d7.vercel.app/api` | Stripe テストキーの Preview |
| **RELEASE** | `https://taroessence.com/api` | 本番 |
| 両方 | Minima: `https://minima-kentaros-projects-70c7a0d7.vercel.app/api` | ステージング分離なし |
| 両方 | Firebase: `GoogleService-Info.plist` → **`fitw-prod`** | Auth / Firestore は常に本番プロジェクト |

### 重要な注意

- Debug でも Firestore / Auth は本番プロジェクトを共有する。
- Preview の Stripe Webhook も同じ `users` を更新し得る（テスト課金が会員フラグを立てる可能性あり）。
- `essence-staging` ブランチは Debug 用 Preview に追従させること（遅れていると `/api/app/config` 等が 404）。

---

## 4. 認証

| | Web | App |
|---|---|---|
| 方式 | メール + パスワード（Firebase Auth） | 同一 |
| セッション | Session Cookie（`session`）+ middleware で `isPremium` | Firebase ID トークンを `Authorization: Bearer` |
| 会員 Cookie | `isPremium`（stripe \|\| apple が active） | —（都度 Firestore） |
| サインアップ時 | `users/{uid}` に基本フィールド作成 | 同様に `users/{uid}` を `setData`（`createdAt` 等） |

会員判定ヘルパー（Web）: `isActiveMember()`  
→ `stripe_status === 'active' || apple_status === 'active'`

---

## 5. 課金・会員状態

### 5.1 会員の定義

どちらか一方でも `active` なら会員（コース・Podcast・Web 会員ページにアクセス可）。

### 5.2 Stripe（Web 系）

1. Checkout（`/api/stripe/checkout` またはアプリ向け `checkout-app`）で `client_reference_id = uid`
2. Webhook `/api/stripe/webhook` が `users/{uid}` を更新
3. Portal / cancel / resume も Web API 経由

主なフィールド（`users/{uid}`）:

| フィールド | 型 | 意味 |
|---|---|---|
| `stripe_status` | string | `active` / `canceled` 等 |
| `stripe_customer_id` | string | Stripe Customer |
| `stripe_subscription_id` | string | Subscription |
| `stripe_cancel_at_period_end` | bool | 解約予約 |
| `stripe_current_period_end` | Timestamp | 支払済期間終了 |

`ESSENCE_JOIN_OPEN === false` の間、Checkout API は 403（新規参加停止）。

### 5.3 Apple IAP

| 項目 | 値 |
|---|---|
| Product ID | `com.kk.essence.membership.monthly` |
| 購入後 | App → `POST /api/apple/link-transaction`（JWS） |
| サーバ通知 | `POST /api/apple/notifications`（ASSN V2） |
| 検証 | `@apple/app-store-server-library`（本番は `APPLE_APP_APPLE_ID` 必須、失敗時 Sandbox フォールバック） |

反映フィールド:

| フィールド | 意味 |
|---|---|
| `apple_status` | `active` / `canceled` |
| `apple_original_transaction_id` | 元トランザクション |
| `apple_product_id` | 商品 ID |
| `apple_expires_date` | 期限 |

App の Paywall は IAP のみ（Web Stripe への誘導は審査対応で削除済み）。解約導線は IAP 会員と Stripe 会員で出し分け。

---

## 6. Firestore データモデル

ルールファイル: Essence リポジトリの `firestore.rules`（デプロイ先 `fitw-prod`）。

### 6.1 `users/{uid}`（プロフィール・課金）

| フィールド | 備考 |
|---|---|
| `email` | 任意 |
| `displayName` | 掲示板ニックネーム（本人のみ update 可） |
| `stripe_*` / `apple_*` | 上記。クライアント書込禁止（Admin SDK / Webhook のみ） |
| `createdAt` / `updatedAt` | タイムスタンプ |

クライアント読取: 本人のみ。

### 6.2 ユーザー配下（アプリ実践データ）

パスはすべて `users/{uid}/...`。本人のみ read/write。

| コレクション | 用途 | 主なフィールド |
|---|---|---|
| `courseProgress/{courseId}` | 講座進捗（Web も書込） | `completedLessonIds: string[]` |
| `balanceSheetItems/{id}` | 貸借対照表 | `name`, `category`(`asset`\|`liability`), `amount`, `createdAt`, `updatedAt` |
| `fixedCosts/{id}` | 固定費 | `name`, `amount`, `isMonthly`, `debitMonth`, `debitDay`, `memo`, `order`, … |
| `balanceSettings/main` | BS 設定 | （資産配分等） |
| `meditationSessions/{id}` | 瞑想ログ | `startedAt`, `durationSeconds` |
| `healthSummary/{weekId}` | ヘルスケア週次 | `weekStart`, 歩数日次など |
| `items` / `journalEntries` / `deepWorkSessions` | ルール上存在（現行 Essence UI では主に未使用 or 旧機能） | — |

### 6.3 `podcastEpisodes/{episodeId}`（共有・会員のみ読取）

| フィールド | 型 | 必須 |
|---|---|---|
| `title` | string | ✓ |
| `subtitle` | string |  |
| `publishedAt` | Timestamp | ✓ |
| `durationSeconds` | number | ✓ |

- 管理: Web `/admin/podcast`（Admin SDK）
- App 一覧: `publishedAt <= now` でクエリ（予約投稿は非表示）
- 音声本体は R2（メタのみ Firestore）
- **ルール注意:** `publishedAt <= request.time` をルールに入れると一覧クエリが常に permission-denied になるため、予約除外はクライアント + 音声 API で担保

### 6.4 `courses/{courseId}` / `lessons/{lessonId}`（共有・会員のみ読取）

**Course**

| フィールド | 型 |
|---|---|
| `title` | string |
| `description` | string |
| `thumbnailUrl` | string \| null（公開 URL または R2 経由） |
| `category` | string \| null |
| `lessonCount` | number |
| `position` | number |

**Lesson**

| フィールド | 型 |
|---|---|
| `title` | string |
| `description` | string |
| `position` | number |
| `chapterTitle` | string \| null |

動画本体は R2。進捗は `users/{uid}/courseProgress/{courseId}`（Web `/api/courses/.../progress` と App の Firestore 直書きが共有）。

### 6.5 掲示板（Community）

| パス | 内容 |
|---|---|
| `boardPosts/{id}` | `body`, `authorUid`, `authorName`, `createdAt`, `replyCount`, `lastActivityAt` |
| `boardPosts/{id}/replies/{id}` | `body`, `authorUid`, `authorName`, `createdAt` |
| `boardReports/{id}` | 通報（作成のみ、運営は Admin SDK） |

- Firestore: 認証ユーザーが読取可能
- **現行 App UI:** Community は「メンバー数が一定になるまで」ロック表示（機能自体はコード上残存）

---

## 7. オブジェクトストレージ（Cloudflare R2）

| キー | Content-Type | 用途 |
|---|---|---|
| `{episodeId}.m4a` | `audio/mp4` | Podcast 音声 |
| `courses/{courseId}/lessons/{lessonId}.mp4` | `video/mp4` | レッスン動画 |
| `courses/{courseId}/thumbnail` | jpeg/png/webp | 講座サムネ |

- アップロード: 管理画面が署名付き PUT URL を発行 → ブラウザが R2 に直接 PUT（Vercel ボディ上限回避）
- 再生: 会員検証後に GetObject の署名 URL（Podcast 約 10 分、Course 動画約 60 分）
- Podcast の未来 `publishedAt` は audio-url API でも 404

---

## 8. Web API（App が叩くもの）

ベース: `{webBaseURL}/api`  
認証: 特記なき限り `Authorization: Bearer <Firebase ID Token>`

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/app/config` | 強制アプデ（`minimumVersion`, `storeUrl`）※認証不要 |
| GET | `/podcast/episodes/{id}/audio-url` | 音声署名 URL |
| GET | `/courses/{courseId}/lessons/{lessonId}/video-url` | 動画署名 URL |
| POST | `/stripe/checkout-app` | Stripe Checkout URL（JOIN_OPEN 時） |
| POST | `/stripe/portal-app` | Billing Portal |
| POST | `/stripe/cancel-app` | 期末解約予約 |
| POST | `/stripe/resume-app` | 解約予約解除 |
| POST | `/apple/link-transaction` | IAP JWS 検証・反映 |
| POST | `/apple/notifications` | ASSN V2（Apple → サーバ） |
| DELETE | `/account` | アカウント削除（掲示板投稿等も掃除） |

Web 専用（Cookie セッション）の例: `/api/auth/*`, `/api/stripe/checkout`, `/api/courses/.../progress`, `/admin/*`, Discord, materials。

---

## 9. ディープリンク / Universal Links

### AASA

- URL: `https://taroessence.com/.well-known/apple-app-site-association`
- `appIDs`: `ZCR4QT36HT.com.kk.essence`
- パス: `/app`, `/app/*`

### Entitlements

- `applinks:taroessence.com`
- `applinks:taroessence.com?mode=developer`（開発用）

### 挙動

| URL | アプリ入済（リンクタップ） | ブラウザ到達時 |
|---|---|---|
| `https://taroessence.com/app` | アプリ起動 | `/essence` へ 302 |
| `https://taroessence.com/app/podcast` | Podcast 画面 | `/essence` へ 302 |

カスタムスキーム: `com.kk.essence://podcast` 等も App 内でパース可能。  
※ Safari アドレス欄への直打ちでは Universal Link が発火しにくい。

---

## 10. 機能ごとの提供面

| 機能 | Web | App | データ置き場 |
|---|---|---|---|
| LP `/essence` | ✓ | — | 静的 |
| 講座視聴 | ✓（会員） | ✓ | Firestore + R2 |
| Podcast | 管理のみ | ✓ 再生 | Firestore + R2 |
| Item List / Wishlist | — | ✓ | Minima API |
| Meditation Timer | — | ✓ | Firestore + ローカル音声 |
| Balance Sheet | — | ✓ | Firestore |
| Healthcare | — | ✓ | HealthKit + Firestore サマリ |
| Community | 管理（通報） | UI ロック中 | Firestore |
| ダッシュボード / 壁紙 | ✓ | — | 静的 / アセット |
| ブログ / ギア | ✓ | API は残存・UI なし | microCMS |

---

## 11. セキュリティ要約

| 対象 | 方針 |
|---|---|
| 課金フラグ | クライアント書込禁止。Stripe Webhook / Apple API / Admin のみ |
| メディア | R2 非公開。都度署名 URL。会員チェック必須 |
| Podcast 予約 | 一覧クエリ + audio-url の日時チェック |
| 強制アプデ | `/api/app/config` は公開。通信失敗時はアプリ利用継続（全体ブロックしない） |
| 管理者 | `ADMIN_EMAIL` 一致セッションのみ `/admin/*` |

---

## 12. 運用チェックリスト（相互影響）

変更時に両面を見る項目:

1. **Firestore ルールを変えたら** → `firebase deploy --only firestore:rules --project fitw-prod`。App のクエリ形と矛盾しないか確認（特に inequality + `request.time`）。
2. **会員フィールドを増やすなら** → Web `isActiveMember` / middleware / App `RemoteSubscriptionBackend` / Firestore rules の `isMember` を同時更新。
3. **App Store ID / 最低バージョン** → `src/lib/essence.ts`。強制アプデの `storeUrl` にも効く。
4. **IAP 検証** → Vercel に `APPLE_APP_APPLE_ID` があること（本番レシート用）。
5. **staging 追従** → Debug が壊れたら `essence-staging` を main に合わせる。
6. **新規参加再開** → `ESSENCE_JOIN_OPEN = true` + Stripe 本番価格 ID 確認。
7. **R2 キー規約を変えるな** → App / Web の署名パスが壊れる。

---

## 13. 関連ファイル索引

| 内容 | 場所 |
|---|---|
| Web 会員・ストア定数 | `src/lib/essence.ts` |
| R2 キー | `src/lib/r2.ts` |
| 会員ヘルパー | `src/lib/courses.ts` |
| Firestore ルール | Essence `firestore.rules` |
| App API 接続先 | Essence `APIConfig.swift` |
| Podcast 取得 | Essence `FirebasePodcastBackend.swift` |
| 講座取得 | Essence `FirebaseCourseBackend.swift` |
| 課金状態 | Essence `RemoteSubscriptionBackend.swift` |
| Universal Link | `src/pages/.well-known/apple-app-site-association.ts` / `DeepLinkStore.swift` |
| ブランド仕様 | `ESSENCE_MEMBERSHIP_SPEC.md` |
