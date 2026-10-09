# ドメイン移行: kentaro.life → taroessence.com

発信名「Taro Essence」とドメインを揃えるための移行手順。
進めながらチェックを入れていく。

## 前提・期限

| 項目 | 内容 |
|---|---|
| 新ドメイン | `taroessence.com`(2026-10-08 お名前.comで取得) |
| 旧ドメイン | `kentaro.life`(お名前.comで取得、**有効期限 2026-12-20**) |
| 方針 | 旧ドメインは期限まで新ドメインへの転送に使い、**更新せず手放す** |
| 期限までにやること | 外部に出ている旧URL・旧メールアドレスをすべて新しいものに置き換える |

旧ドメインを手放した後は、`kentaro.life` のリンク・メールはすべて届かなくなり、第三者が取得できる状態になる。
転送が生きている 12/20 までに、下の「外部の書き換え」を終わらせること。

## 現在の構成(移行前の記録)

| 用途 | 設定 |
|---|---|
| DNS | Cloudflare(`mina` / `bryce.ns.cloudflare.com`) |
| サイト | Vercel(`kentaro.life` → 76.76.21.21、`www` → `cname.vercel-dns.com`) |
| メール受信 | Cloudflare Email Routing(`minimal@kentaro.life` を転送) |
| 認証メール送信 | Firebase(SPF に `_spf.firebasemail.com`、DKIM `firebase1._domainkey`) |
| メールリンク用ドメイン | `link.kentaro.life` → Firebase Hosting(`fitw-prod.web.app`) |
| Search Console | DNS TXT `google-site-verification=...` と `Layout.astro` の meta タグ |

---

## フェーズ1: 新ドメインの準備(すぐ)

- [x] **お名前.com のドメイン情報認証メールを承認する(取得から2週間以内。放置するとドメインが停止する)**(認証メールなし=登録者情報が認証済みのため不要。ドメインは active)
- [x] お名前.com で `taroessence.com` のネームサーバーを Cloudflare に変更する(2026-10-08 済。`bryce` / `mina.ns.cloudflare.com`)
  - Cloudflare で「サイトを追加」→ 表示された2つのネームサーバーをお名前.com Navi に設定
- [ ] (任意)お名前.com の不要なオプション・メルマガを解除する
- [ ] (任意・取得から60日後以降)更新料を抑えるため Cloudflare Registrar へ移管する
  - お名前.com の `.com` は2年目から更新料が上がる。登録直後60日間は移管できない

## フェーズ2: サイトを新ドメインで動かす

### Vercel
- [x] プロジェクトの Domains に `taroessence.com`(Production)と `www.taroessence.com`(308 で `taroessence.com` へ転送)を追加(2026-10-09 済)
- [x] Cloudflare の DNS に Vercel 指定のレコードを追加(2026-10-09 済。`@` と `www` を CNAME `1b1eb8624bd05dbc.vercel-dns-017.com`、プロキシはオフ=DNS のみ)
  - 注意: Cloudflare 追加時の自動インポートで、お名前.com の初期応答(`www` 等の NS、`v=spf1 -all` の TXT など)が大量に取り込まれていたため削除した
- [x] 環境変数: Vercel に `PUBLIC_SITE_URL` は未設定(コードの既定値を書き換えたので変更不要)。`DISCORD_REDIRECT_URI` は Discord 連携を使っていないため対応不要
  - [x] ローカルの `.env` も同様に変更(済)

### コード(リポジトリ内の書き換え)
- [x] `astro.config.mjs` の `site`
- [x] `public/robots.txt` の Sitemap URL
- [x] `src/layouts/Layout.astro`・`src/pages/sitemap.xml.ts`・`src/pages/essence.astro` の既定URL
- [x] 各ページの `canonicalUrl`(product / article / article/[slug] / gear-review/[slug] / contact / engineering-roadmap / purchase/materials / personal-projects)
- [x] `src/pages/product.astro` の `https://kentaro.life/send` リンク
- [x] 利用規約・プライバシーポリシー(`terms.astro` / `privacy.astro`)のサイト名とメールアドレス
- [x] 特商法表記(`tokushoho.astro`)・`essence.astro` のメールアドレス(`hello@taroessence.com` に変更済)
- [x] `src/pages/auth/action.astro` のコメント内URL
- [x] `NativeApp/src/config.ts` の `SITE_ORIGIN` と許可ホスト
- [ ] Search Console 用の meta タグ(新しいプロパティの確認コードに差し替え、またはDNS認証にする)

### 旧ドメインからの転送
- [x] `kentaro.life` の転送は Cloudflare のリダイレクトルールで 301(2026-10-09。DNS の `@` と `www` をプロキシ オン、式 `concat("https://taroessence.com", http.request.uri.path)`、クエリ保持)。Vercel は http→https を 308 で返すため、Search Console のアドレス変更が通らなかった
  - パスを保ったまま転送されることを確認(例: `kentaro.life/article/xxx` → `taroessence.com/article/xxx`)

## フェーズ3: 外部サービスの設定

### Firebase(認証)
- [x] Authentication → 設定 → 承認済みドメインに `taroessence.com` を追加(2026-10-09 済)
- [ ] メールテンプレートのアクションURLを `https://taroessence.com/auth/action` に変更(**12/20 までに必須**)
  - コンソールから変更するとエラーになる(以前も Firebase サポートに依頼して設定してもらった)。サポートへ再依頼する
  - 変更されるまでは、`kentaro.life` → `taroessence.com` の 308 転送(パス・クエリ保持)で動作する
- [x] 認証メールの送信元を `Essence <essence@taroessence.com>` に変更(2026-10-09 済)
  - SPF は Email Routing と 1 件に統合: `v=spf1 include:_spf.mx.cloudflare.net include:_spf.firebasemail.com ~all`
  - TXT `firebase=fitw-prod`、CNAME `firebase1._domainkey` / `firebase2._domainkey`(DNS のみ)
- [ ] メールリンク用ドメイン: Firebase Hosting に `link.taroessence.com` を接続(Cloudflare に指定レコードを追加)
- [ ] 旧ドメイン(`kentaro.life`、`link.kentaro.life`)は 12/20 以降に承認済みドメイン・Hosting から削除

### Stripe
- [x] Webhook の送信先を `https://taroessence.com/api/stripe/webhook` に変更(2026-10-09 済。既存の送信先を編集したので署名シークレットは変わらず)
- [ ] ビジネス情報(サイトURL・サポートメール)、カスタマーポータル・領収書の表示URLを変更

### Apple
- [ ] App Store Connect → Essence → App Store サーバー通知のURLを `https://taroessence.com/api/apple/notifications` に変更(本番・サンドボックス両方)
- [ ] **全アプリ**のサポートURL・プライバシーポリシーURL・マーケティングURLを確認し、`kentaro.life` を使っていれば変更
  - 期限切れ後にリンク切れになると審査や掲載で問題になる
- [ ] 開発者アカウントの連絡先メール

### Discord
- 対応不要(Discord 連携は未使用。サイト・アプリから `/api/discord` への動線なし)

### Google Search Console
- [x] `taroessence.com` をドメインプロパティとして追加・所有権確認(2026-10-09)
- [x] 新しいサイトマップ `https://taroessence.com/sitemap.xml` を送信(2026-10-09)
- [x] 旧プロパティ(`kentaro.life`)で「アドレス変更」ツールを実行(2026-10-09 開始。Google は転送を 180 日以上残すことを推奨)

## フェーズ4: メール

- [x] Cloudflare Email Routing を `taroessence.com` で有効化し、`hello@taroessence.com` を同じ受信箱へ転送(2026-10-09 済。転送先 exiler2411k@gmail.com)
- [ ] 送信もしている場合(Gmail の「別のアドレスから送信」等)は新アドレスで設定し直す
- [ ] 新アドレスへの切替: Stripe / App Store Connect / Apple Developer / Google / YouTube / note / microCMS / Vercel / Firebase / お名前.com 等の登録メール
### Kit(メルマガ・無料 E-Book 配布)
- [x] 送信ドメイン `taroessence.com` を認証(2026-10-09 済。Cloudflare に CNAME 3 件 `ckespa` / `cka._domainkey` / `cka2._domainkey` と TXT `_dmarc` を追加)
- [x] 差出人 `hello@taroessence.com` を追加・確認(2026-10-09 済)
- [x] `hello@taroessence.com` を Default にする(2026-10-09 済)
- [x] シーケンスは無料プランのため未使用(対応不要)
- [x] ~~フォームの登録後リダイレクト先を `https://taroessence.com/minimalplan` に変更(E-Book のフォーム)~~(Substack へ移行したため不要)
- [x] `minimal@kentaro.life` と送信ドメイン `kentaro.life` を削除(2026-10-09)

- [ ] 旧アドレス `minimal@kentaro.life` は 12/20 まで転送を残し、届いたメールの送り主には新アドレスを案内

### ニュースレター(Kit → Substack に一本化)
- [x] Substack のウェルカムメールに E-Book(`https://taroessence.com/minimalplan`)のボタンを設定
- [x] `/send` とポップアップの登録フォームを Substack(`kentarokk.substack.com/embed`)に変更(2026-10-09)
- [x] Kit の購読者を CSV で書き出し、Substack にインポート(2026-10-09、審査待ち)
- [ ] インポート完了と人数を確認
- [ ] Kit のフォーム 2 つを停止(アカウントはしばらく残す)

## フェーズ5: アプリ

### Essence(未リリース。リリース前に必ず)
- [ ] `Essence/Core/Networking/APIConfig.swift` の `webBaseURL` を `https://taroessence.com`
- [ ] `Essence/Core/Auth/FirebaseAuthService.swift` の `linkDomain` を `link.taroessence.com`
- [ ] `Essence/Features/Settings/SettingsView.swift` のメールアドレス・URL
- [ ] `AppStore/METADATA.md`・`AppStore/REVIEW_NOTES.md`・`README.md`・`project.yml` のコメント
- [ ] その他 `kentaro.life` を含むファイル(`grep -rn "kentaro.life"` で確認)

### 公開済みアプリ(次のアップデートで)
- [ ] TubeDetox(`MyTube/Main/Setting/SettingView.swift` の開発者サイトリンク)
- [ ] Picript(`Shared/Services/AppSupportLinks.swift` の `developerSiteURL`)
- [ ] その他公開中アプリで `kentaro.life` を使っているもの

## フェーズ6: 外部のリンク書き換え(12/20 まで)

- [ ] YouTube チャンネルの概要・リンク欄、主要動画の概要欄
- [ ] Spotify(Podcast)の番組説明
- [ ] X / Instagram / Threads などのプロフィール
- [ ] note のプロフィール・記事内リンク(エンジニアロードマップ記事など)
- [ ] microCMS の記事本文内の `kentaro.life` リンク
- [ ] 名刺・その他資料

## フェーズ7: 旧ドメインの終了(2026-12-20)

- [x] **お名前.com Navi で `kentaro.life` の自動更新をオフにする(早めに。オンのままだと更新料が引き落とされる)**(2026-10-08 済)
- [ ] 期限前に Search Console で旧ドメインからの流入が十分減っているか確認
- [ ] 期限後: Vercel・Cloudflare・Firebase から `kentaro.life` 関連の設定を削除

---

## 確認チェック(切替直後)

- [ ] `https://taroessence.com` で全ページが表示される
- [ ] `https://kentaro.life/任意のパス` が同じパスの新ドメインへ転送される
- [ ] 新規登録・ログイン・ログアウトができる
- [ ] パスワード再設定メールが届き、リンクから再設定できる(リンク先が新ドメイン)
- [ ] Stripe の Webhook がダッシュボード上で成功している
- [x] `hello@taroessence.com` 宛てのメールが届く
- [ ] Essence アプリ(開発ビルド)で新ドメインのAPIに接続できる
