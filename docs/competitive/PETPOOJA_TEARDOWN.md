# Petpooja — Competitive Teardown

**Snapshot:** 12 Nov 2026  
**Scope:** Public-surface teardown + **static analysis of the Android merchant APK** (v4.4.0), trust portal, merchant portal, pricing, app stores, service catalogue.  
**Not yet covered:** Electron POS static analysis and logged-in dashboard tracing. Both require artifacts/accounts — see [§12](#12-what-is-still-unknown).

**Evidence legend:** `[Observed]` = directly seen in a public artifact · `[Claimed]` = vendor marketing claim, not verified · `[Inferred]` = reasoned from observed signals · `[Unknown]` = not established.

---

## 1. Executive summary

Petpooja is India's largest restaurant POS incumbent: **~1.5 lakh businesses**, **15 years** old, **1,800+ staff**, field sales in **200+ cities**, and **200+ integrations**. It is no longer just a POS — it is assembling an SME operating system: **POSS** (restaurant POS), **Attendo** (payroll/attendance), **Invoice** (retail GST billing), **Stepwise** (tasks), **Purchase Manager**, **Munshi**, **Track**, **Marketing Hub**, plus a food-image **Studio**.

**Commercial shape:** sales-led, demo-only, annual per-outlet subscription with stacked bundles and credit top-ups. Entry is cheap (₹6k–12k/yr), but the full stack reaches **₹60k+/yr** before GST and credits.

**Technical shape:** legacy core, modern edges. Marketing site is CDN-fronted static; merchant portal is a server-rendered app with **Bootstrap 5 + jQuery** (PHP-style stack inferred from its AES-256-CBC client-side password encryption); desktop POS is **Electron**; the Android merchant app is a **thin Flutter shell around the web portal** (Firebase + MoEngage + WebView + RootBeer), not a native offline POS. A real **API gateway** exists at `api.petpooja.com` with client-credential auth, but no public developer docs were found. **SOC 2, ISO 27001:2022 and SOC 1** are attested on their Trust Portal.

**Where they are strong:** breadth, aggregator reconciliation, offline/on-prem POS, payroll hardware bundle, field support, price umbrella, **enterprise compliance (SOC 2 / ISO 27001 / SOC 1)**, switching-cost moat.

**Where they are exposed:** legacy UX, support inconsistency at scale, aggressive upsell/hardware bundling, credit-based feature gating, **60-day inventory edit lock** complaint, no self-serve onboarding, stale secondary apps, data-deletion restrictions, **mobile app is a webview shell**, and a lending/hardware catalogue that creates cross-sell pressure.

**Nammude's realistic openings:** self-serve + transparent pricing, OCR-to-ledger workflow with human verification, hygiene/compliance logs, modern PWA/offline architecture, data ownership/export, and a focused Kerala/vernacular wedge rather than a breadth war.

---

## 2. Company

| Fact | Value | Evidence |
|---|---|---|
| Legal entity | Prayosha Food Services Pvt. Ltd. | [Observed] site footer |
| HQ | Gopal Palace, Nehrunagar, Ambawadi, Ahmedabad, Gujarat 380015 | [Observed] |
| Founded | 2011 (About page); careers timeline says "2015 — The Journey Begins" | [Observed] inconsistent |
| Founders | Parthiv Patel (CEO), Apurv Patel (CSO) | [Observed] |
| Headcount | 1,800+ (careers) / 1,500+ (about) | [Claimed] inconsistent |
| Customers | 1,50,000+ / 1,00,000+ / 75,000+ depending on page | [Claimed] inconsistent |
| Footprint | India, UAE, South Africa (+ selector: Singapore, Malaysia, Thailand, US, Canada) | [Observed] |
| Support | 24×7, 18+ Indian languages, on-ground in 200+ cities | [Claimed] |
| Reseller program | 15% commission; ₹500 referral for existing customers | [Observed] |
| Security program | Bugcrowd-coordinated VDP, safe harbor; SOC 2, ISO 27001:2022, SOC 1 on Trust Portal | [Observed] |

**Read:** the metric inconsistency is normal hypergrowth marketing drift, but it signals **no single source of truth** in their GTM — a small trust opening for a competitor that publishes one honest number.

---

## 3. Product portfolio

| Product | Role | Status signal |
|---|---|---|
| **POSS** | Restaurant POS + back office | Core; ₹12k base |
| **Attendo** (ex-Payroll) | Biometric/face attendance, shifts, salary, PF/ESI/PT | Separate brand, own site `attendohr.com`; Employee app **1M+ downloads** |
| **Invoice** | GST billing/inventory for retail & B2B | Separate product line; weak app ratings (3.4) |
| **Stepwise** (ex-Tasks) | Task assignment/verification, 150+ templates | Separate brand `gostepwise.ai` |
| **Purchase Manager** | AI vendor price comparison (HyperPure, DMart, local) | Free for POSS users; growth hook |
| **Munshi** | AI invoice capture + accounting for **TallyPrime** (`gomunshi.ai`) | New, 10+ downloads — very early |
| **Track** | Delivery/ops tracking | New, 1K+ downloads, 4.8 |
| **Marketing Hub** (ex-Tvito) | Ads/campaigns | 100K+ downloads but **stale since Apr 2024**, 3.6 |
| **Purchase Scan** (Kharcha) | AI digitisation of purchase invoices → inventory/accounting/ERP; vendor payouts, overdraft | 10K+, **3.9** (48 reviews), stale since Jul 2025 |
| **Studio** | Food image library | Marketing asset for merchants |
| **Petpooja GO / PAY** | Paytm-device POS + payments | Hardware partnership |
| **Petpooja Pay** | Own payment stack: Razorpay, Axis Bank, Bijlipay variants | Service-catalogue SKUs 259–261 [Observed] |
| **Embedded finance** | Merchant lending/credit: Open Capital, GetVantage, Tata Capital, FlexiLoans, Incred, Niyogin, LoanTap, Finbii | Service-catalogue SKUs + "Embedded Finance" hiring dept [Observed] |
| **Hardware** | POS terminals from Essae, Posbank, Posiflex, iMin, Lenovo, Intellend; Bluetooth printers; weighing scales | Service-catalogue SKUs [Observed] |
| **Robotics (R&D)** | "Differential-drive service robot" mobility stack | Job listing, Ahmedabad R&D [Observed] |

**Service catalogue:** the logged-out merchant portal embeds a **174-entry service catalogue** with internal IDs and activation handlers (e.g. `activate_swiggy`, `activate_ondc`, `activate_petpooja_pay_razorpay`). It reveals the real commercial surface: 174 monetisable services, not "200 integrations" as a flat count. [Observed]

**Strategic signal:** Attendo is already being marketed as a **hospital/healthcare payroll** product (`/healthcare-hospital-payroll-solution`), not just restaurant payroll. They are testing horizontal expansion of the payroll wedge into other shift-based industries. [Observed]

**Read:** they are expanding horizontally faster than they can maintain secondary apps. The core POS is the moat; the satellites are experiments. A focused competitor can beat the satellites on quality.

---

## 4. Packaging & pricing

### 4.1 Current site pricing (ex-tax, per outlet/year) [Observed]

| Bundle | Tier | Price | Notable inclusions |
|---|---|---|---|
| **Base Plan** | — | **₹12,000** | Cloud billing, inventory, menu, 90+ reports, aggregator integrations, unlimited users/terminals, Smart-Stock, **AI Agent (unlimited queries)**, online training, 24×7 online support |
| **Operations Manager** | Growth | **₹20,000** | Captain app, token mgmt, Zomato/Swiggy reconciliation, Tally, Scan & QR, waiter calling (AMC), KDS, API, SAP/ERP, call centre |
| **Operations Manager** | Scale | **₹30,000** | + Table Reservation Manager, kiosk software, 1,000 e-invoice credits, 2 visits |
| **Marketing Manager** | Core / Growth / Scale | **₹10,000 / ₹20,000 / ₹30,000** | CRM + loyalty, wallet, feedback, reputation, e-bill, WABA credits (4k/8k/10k), AI marketing agent; website + digital display from Growth; Meta ads/influencers at Scale |

**Full stack (Base + Ops Scale + Marketing Scale): ₹72,000/yr ex-tax**, plus 18% GST and credit top-ups.

### 4.2 Channel-listed SKUs (SoftwareSuggest, updated 2 Jul 2026) [Observed]

| SKU | Price |
|---|---|
| POS Lite | ₹6,000 |
| Android POSS | ₹9,000 |
| Electron POSS Core | ₹12,000 |
| Electron POSS Growth | ₹20,000 |
| Electron POSS Scale | ₹30,000 |
| Local POSS Core | ₹20,000 |
| Local POSS Growth | ₹30,000 |
| Local POSS Scale | ₹40,000 |

Also listed: **7-day free trial**, 18% GST, and a per-user annual USD view ($139 first year / $97 renewal).

**Read:**
- **Price umbrella is low.** Undercutting on price alone is a losing move.
- **Bundles are stacked, not tiered.** The real comparison is "what does the owner actually need", and the answer is always "more than Base".
- **Credits** (WABA, e-invoice) are a margin lever and a recurring complaint source — transparent unlimited messaging would be a differentiator.
- **Local/on-prem SKUs cost more** than cloud, which is unusual and signals they monetize data-sovereignty anxiety.

---

## 5. Feature inventory

### 5.1 Billing & orders
- 3-click billing, custom bill formats, dynamic payment QR, logo/branding. [Claimed]
- Multi-terminal sync, station-wise KOT printing, table/area management, tax and discount configuration. [Claimed]
- Split bills, merge tables, multi-tender. [Claimed]
- Works offline; "any hardware"; Windows/Android/iOS; keyboard + touchscreen modes. [Claimed]
- Staff rights, bill-modification/discount/cash-drawer reports. [Claimed]

### 5.2 Inventory & recipes
- Raw material management, central kitchen, multi-stage recipes, automatic deduction. [Claimed]
- Purchase orders, supplier/central-kitchen requests, damaged-stock returns. [Claimed]
- Smart-Stock Manager, low-stock alerts, day-end inventory reports. [Claimed]
- **Purchase Manager:** live vendor price comparison (HyperPure, DMart, local rate cards), "Best Match" cart, automatic inventory update. [Claimed]
- **Purchase Scan** (support email `kharchatech@petpooja.com`) scans purchase invoices and "digitises" them via an AI model; output feeds inventory, accounting, vendor payouts, and ERP/Tally posting, with price-trend analytics and an overdraft facility. Reviews complain it is "too complicated" for small businesses and has recurring glitches. [Observed]
- **Constraint reported by a user:** inventory entries locked beyond **60 days**. [Observed review, unverified]

### 5.3 Online orders & aggregators
- One screen for Swiggy, Zomato, Uber Eats, Talabat, Careem, Keeta, NoonFoods, GrabFood, Magicpin, Dotpe, Gupshup, HungerBox, GrubTech, and more. [Observed — integration list]
- **Order reconciliation:** matched orders, status mismatches, amount variances, missing orders, commission/discount breakdown. [Claimed]
- Rider/OTP handover for Zomato/Swiggy. [Claimed]
- ~40% of Zomato/Swiggy online orders processed (vendor claim). [Claimed]

### 5.4 Kitchen & floor
- KDS on Android/Windows, station-wise routing, mark-ready, out-of-stock marking, aggregated item view. [Claimed]
- Captain app: Android, offline, AI voice item entry, upsell recommendations, UPI/wallet/tap-card settlement, table assignment. [Claimed]
- Token management on Android TV with voice alerts, online/offline. [Claimed]
- Table Reservation Manager: Zomato Dining, District, EazyDiner, own link, phone, walk-ins. [Claimed]
- Waiter calling hardware, self-service kiosk, digital display. [Claimed]

### 5.5 QR, menu, website
- Scan & Order: table QR → guest phone → OTP → KOT in POS; no app install. [Claimed]
- Menu: categories, variants, add-ons, shortcodes, multi-language (configurable national/international). [Claimed]
- Business website: static/dynamic, hosted by Petpooja, online ordering widget, payment gateway, SEO handled. [Claimed]

### 5.6 CRM, loyalty, marketing
- Unified customer pool from online, captain app, website, in-house. [Claimed]
- Purchase history, preferences, notes, labels/segments. [Claimed]
- Loyalty points + virtual wallet, expiry rules, OTP redemption, blacklist. [Claimed]
- Feedback via app, SMS link, QR; negative-feedback alert to POS. [Claimed]
- SMS campaigns with TRAI sender/template IDs; WhatsApp campaigns; WABA credits. [Claimed]
- Reputation: Google/Zomato/Swiggy reviews in one place with AI-drafted replies. [Claimed]
- Meta/Snapchat/OTT ads, influencer marketing, referral. [Claimed]

### 5.7 Reports & finance
- 90+ / 100+ reports; dynamic/custom reports; Excel upload → visualized reports; downloadable; unlimited users. [Claimed]
- Day-end, item sales, order master, executive reports, tax/GST reports, head-office consolidation. [Claimed]
- Tally, SAP/ERP, Zoho Books, BUSY, Masters India integrations. [Observed]
- E-invoice credits at Scale. [Observed]
- Offline POS: day-end/item/order/executive reports from local records; up to **50 outlets** on one on-prem server. [Claimed]

### 5.8 AI features
- **AI Agent** with unlimited queries (Base plan); portal code references an `nrai-banner-wrap`, indicating the agent is branded **Nrai**. [Observed pricing + portal JS]
- AI Marketing Agent; AI-drafted review replies; AI voice ordering in Captain app; AI price-match in Purchase Manager. [Claimed]

**Read:** AI is being used as a **packaging sweetener** (unlimited queries on the cheapest plan) rather than a defensible product. Expect fast-follow parity from competitors.

---

## 6. Integrations & ecosystem

**Claimed 200+ integrations**, grouped as: Online Ordering, Dine-In, Delivery, Loyalty, Payments, CRM & Messaging, Accounting. [Observed]

Named examples:
- **Aggregators:** Swiggy, Zomato, Uber Eats, Talabat, Careem, Keeta, NoonFoods, GrabFood, Magicpin, Dotpe, HungerBox, Toing, GrubTech, 1SuperApp, Aeria, Airmenus, Areakart, BigByts, Bingage, BlendVerse, Bringmea, Busifrog.
- **Dine-in:** Paytm, District, Dukaan, Inresto, 32nd, A2D Eats, Clink, Foodpe, GetRise, Glokal, GreenCode, Growaasan, Hipalz, Masala Box, Muncho, Neuoptic, Pikky, Taptable, Tavahot, uEngage, Upsale, Waitwhiz.
- **Delivery:** ShadowFax, PIDGE, Roadcast, Snowch, uEngage Delivery Chain/Tracking.
- **Loyalty:** Bingage, Froogal, OptCulture, Ewards, Restaverse, 1 Loyalty, 2b Innovations, Aicubix, Batao, Broperks, Casa, CKKA, Clink Rewards, Fanpit, Fudr, GoLoyl, Gratifi, Growaasan, Hashtagloyalty, Knowwu, Levaral, MRP Shop, MyMints, Own Rewards.
- **Payments:** Pine Labs, Paytm, Razorpay, BharatPe, PhonePe, UPI, ICICI, MobiKwik, Mosambee.
- **CRM:** Gupshup, WhatsApp, Route Mobile, Green Receipt.
- **Accounting:** Tally, AWS, SAP (+ Zoho Books, BUSY from SoftwareSuggest).

**Read:** the integration catalogue is the **real moat**. It is expensive to replicate and is the reason multi-outlet chains stay. Nammude should not chase 200; it should own **5–10 high-value Kerala/India integrations** and make them excellent (Swiggy, Zomato, WhatsApp, UPI, Tally, e-invoice).

**ONDC:** Petpooja has a dedicated ONDC onboarding page — POS as the seller-app gateway to multiple buyer apps, with menu sync and payment reconciliation. [Observed] This is a regulatory/network moat that a small competitor cannot easily match; Nammude should either join via a network participant or position around it.

---

## 7. Technical signals

### 7.1 Marketing site `petpooja.com`
- `server: nginx` behind **CloudFront**; images via **Gumlet** CDN. [Observed headers]
- Static-ish HTML with custom JS (`pp_track.js`, `pp_forms.js`, `pp_consent.js`, `youtube-fallback.js`), **jQuery/Bootstrap-era** patterns, GTM, reCAPTCHA v3, YouTube fallback, cookie consent. [Observed]
- GTM snippet appears **twice** on the page — minor implementation debt. [Observed]
- No Next.js/React/Vue markers found in delivered HTML. [Observed]

### 7.2 Merchant portal `billing.petpooja.com`
- Root serves a **login page**, `<meta name="robots" content="noindex">`. [Observed]
- `server: PetPooja` custom header; cookie `PETPOOJA_CO` (3-day, HttpOnly, Secure, SameSite=Lax). [Observed]
- **Server-rendered** app: Bootstrap 5 + jQuery + Popper; CSS/JS from `billingcdn.petpooja.com` with cache-busted filenames. [Observed]
- Login via **phone OTP** and **Google OAuth**. [Observed]
- ContentSquare session analytics + GTM. [Observed]
- No public API docs, sandbox, or developer portal found at common subdomains. [Observed — 404s]

### 7.3 Desktop POS
- **Electron POS** is explicitly in the Vulnerability Disclosure scope. [Observed]
- Implies Chromium renderer, Node main process, auto-update, and a JS/ASAR application layer. [Inferred]
- Local/offline SKUs suggest a bundled local database and sync engine. [Inferred]
- No public installer link found on the marketing site or login page. [Observed]

### 7.4 Mobile
| App | Package | Installs | Rating | Last update |
|---|---|---|---|---|
| Merchant App | `com.petpooja.billing` | 5L+ | 4.8 (26.8K) | 28 Sep 2026 |
| Attendo Employee | `com.petpooja.employeepayroll` | **10L+** | 4.3 | 22 Oct 2026 |
| Attendo Admin | `com.petpooja.attendance` | 10K+ | 3.8 | 27 Oct 2026 |
| Attendo Face | `com.petpooja.facerecognition` | 5K+ | 4.4 | 10 Aug 2026 |
| Invoice | `com.petpooja.invoice` | 10K+ | 3.4 | 3 Nov 2026 |
| Invoice POS | `com.petpooja.retail_invoice` | 1K+ | 4.2 | 22 Oct 2026 |
| Tasks | `com.petpooja.task_manager` | 50K+ | 4.2 | 10 Sep 2026 |
| Reservation | `com.petpooja.reservation_manager` | 1K+ | 4.2 | 27 Oct 2026 |
| Purchase | `com.petpooja.purchase_manager` | 1K+ | 4.3 | 30 Oct 2026 |
| Munshi | `com.petpooja.munshi` | 10+ | — | 30 Oct 2026 |
| Track | `com.petpoojatrack.app` | 1K+ | 4.8 | 5 Nov 2026 |
| Marketing Hub | `com.app.tvito` | 1L+ | 3.6 | **16 Apr 2024** |
| Purchase Scan | `com.invoice.briefcase` | 10K+ | 3.9 | **8 Jul 2025** |

**iOS Merchant App:** 4.7 / 9.2K ratings, 41 MB, iOS 15+, **English only**, v2.1.0 (Oct 2025). [Observed]

**Read:** the **Attendo Employee app has 2× the downloads of the merchant app** — payroll/attendance is a bigger distribution surface than the POS companion. Also, app ratings decline as you move from core (4.8) to satellites (3.4–3.9), and two satellites are abandoned.

### 7.5 Android APK static analysis — `com.petpooja.billing` v4.4.0 (code 57)

**Artifact:** downloaded from Aptoide's mirror of the Play-signed build; MD5 `990fe815b8493801429bdb3dfc010cf3` matches the mirror's record, signature owner `CN=petpooja`, signature validated against Google Play by the mirror. SHA-256 `baaa3d6fdfbeeeb1d27fcb8c21190282b3f02e7a8380e7cbe4ab6989734d88cd`. [Observed]

| Property | Value |
|---|---|
| Runtime | **Flutter** (Dart AOT `libapp.so`), not native Android |
| minSdk / targetSdk | 21 / 34 |
| Classes | 5,253 total, but only **4 app-owned classes**: `MainActivity`, `MerchantApplication`, `MessagingService`, `R` |
| Permissions | INTERNET, NETWORK_STATE, WAKE_LOCK, POST_NOTIFICATIONS, VIBRATE, RECEIVE_BOOT_COMPLETED, FOREGROUND_SERVICE, READ/WRITE_EXTERNAL_STORAGE, **INSTALL_PACKAGES** |
| Native libs | `libflutter.so`, `libapp.so`, `libtoolChecker.so` |
| Key plugins | `flutter_inappwebview`, `flutter_downloader`, `url_launcher`, `firebase_*` (core, analytics, crashlytics, messaging, in-app messaging, sessions, installs), `moengage_flutter`, `permission_handler`, **RootBeer** |
| Analytics / messaging | Firebase project `newagent-261ec`; MoEngage app ID `OKH1FG04HEOIC5QULCCNRVBT` (DC4) |
| Native bridge | 3 `MethodChannel` handlers that only open URLs: `saveFile`, `generatePurchase`, `downloadReport` |
| Security | RootBeer native root detection (`libtoolChecker.so`); `usesCleartextTraffic=false`; no certificate pinning evidence in the shell |

**Architecture read (high confidence):** the merchant "app" is a **Flutter wrapper + InAppWebView** around `billing.petpooja.com`, plus FCM/MoEngage push and URL-launcher handoffs for downloads. It is **not** an offline POS client. All business logic, data and offline capability live in the Electron/Windows POS and the web portal. [Observed/Inferred]

**Implications for Nammude:**
- Their mobile story is a **notification + webview companion**, not a true mobile POS. A genuinely offline-first mobile/PWA app with local persistence is a credible product gap.
- `INSTALL_PACKAGES` is a powerful, unusual permission for a merchant app; combined with RootBeer it signals **self-update / anti-tamper** intent. It is also a trust talking point ("why does a dashboard app need to install packages?").
- Three analytics/messaging SDKs (Firebase Analytics, Crashlytics, MoEngage) on a 5L-install app is normal, but the **webview architecture means UX quality is capped by the portal** — the same Bootstrap/jQuery surface users complain about on desktop.
- `api.petpooja.com` exposes a real gateway (`errorCode GN_101: Client credentials were not found`) — a partner API exists but is undocumented publicly.

### 7.6 Security, privacy & compliance posture
- **Trust Portal** at `trust.petpooja.com` (Next.js) lists **SOC 2**, **ISO 27001:2022**, and **SOC 1** attestations, with public/private documents, controls (access, endpoint, network, app, data, product security), policies, a vulnerability-assessment report, a network diagram, and six sub-processors: **Atlassian, Google, HubSpot, AWS, Sectigo, Cloudflare**. [Observed]
- Bugcrowd VDP with safe harbor; in scope: `*.petpooja.com`, prod APIs, official mobile apps, **Electron POS**; out of scope: `*.petpooja.in`, `#test#.petpooja.com`. [Observed]
- Play data safety: no third-party sharing declared; collects app activity + performance; **encrypted in transit**; **data can't be deleted**. [Observed]
- Merchant login encrypts the password client-side with **AES-256-CBC + PBKDF2-SHA512 (999 iterations)** before POST to `/users/login`; the helper is ported from a PHP OpenSSL pattern, which suggests a PHP backend. [Observed; backend language Inferred]
- Not evidenced: PCI-DSS attestation, ISO 27701, HIPAA. [Unknown]

---

## 8. Customer sentiment

### SoftwareSuggest — 4.7/5, 157 reviews [Observed]
**Pros:** customizable reports, user-friendly, cross-platform, training support, affordable pricing.  
**Cons:** language support gaps, inventory limitations, incomplete features, **slow performance at peak**, inconsistent support.

### Google Play — Merchant App 4.8/5, 26.8K reviews [Observed]
Recurring complaint themes in sampled reviews:
- Relationship-manager and support responsiveness.
- Onboarding/scheduling chaos.
- **Inventory entries locked after 60 days** — a hard product constraint users call "illegal".
- Hardware sold with salesperson commission; perceived pushiness.

### Structural weaknesses to exploit
1. **Sales-led, not product-led.** No self-serve signup; demo required.
2. **Support quality is uneven at 1.5 lakh accounts.** Field-heavy model creates variance.
3. **Upsell fatigue.** Bundles + credits + hardware + VAS.
4. **Legacy UI.** Bootstrap/jQuery portal, Electron desktop, dated satellites.
5. **Data lock-in perception.** "Data can't be deleted", 60-day inventory lock.
6. **Feature gating.** Core capabilities (API, KDS, loyalty) sit in higher bundles.

---

## 9. Nammude vs Petpooja — module matrix

Legend: ✅ parity · 🟡 partial/uncertain · ❌ gap · 🟢 Nammude advantage · 🟣 Petpooja advantage

| # | Nammude module | Petpooja | Verdict | Notes |
|---|---|---|---|---|
| 3.1 | POS | Billing, tables, split/merge, offline | ✅ | Parity expected; verify floor-map UX live |
| 3.2 | Orders/billing/payments | Multi-tender, discounts, tax config, audit reports | ✅ | Their audit is report-based, not tamper-evident |
| 3.3 | Table management | Sections, occupancy, TRM marketplace | 🟣 | TRM is a real differentiator |
| 3.4 | KOT/KDS | Station routing, KDS, mark-ready | ✅ | Aging thresholds unknown |
| 3.5 | QR ordering | Scan & Order with OTP | ✅ | Mature |
| 3.6 | Inventory | Raw materials, central kitchen, smart stock | ✅ | Perpetual ledger design unknown |
| 3.7 | Recipes/wastage/expiry | Multi-stage recipes, auto-deduction; wastage depth unknown | 🟡 | Expiry tracking not evidenced |
| 3.8 | Suppliers/PO/GRN | PO, central kitchen, purchase manager; GRN/AP depth unknown | 🟡 | Strong purchase-side tooling |
| 3.9 | Expenses/cash | Expense management listed; cash-drawer reports | 🟡 | Depth unknown |
| 3.10 | BI | 90–100+ reports, dynamic, head office, tax | 🟣 | Their strongest module |
| 3.11 | OCR documents | **Purchase Scan** (AI invoice digitisation → Tally/ERP) + **Munshi** (TallyPrime) | 🟡 | They already own the purchase/expense OCR lane; Nammude must win on verification UX, handwritten/thermal coverage, and real-time ledger posting |
| 3.12 | Staff/attendance | **Attendo**: biometric, face, payroll, PF/ESI/PT | 🟣🟣 | A separate company-grade product |
| 3.13 | Hygiene/compliance | No dedicated food-safety module found; Stepwise templates could cover checklists | 🟢 | Best whitespace candidate |
| 3.14 | CRM/loyalty | Segmentation, loyalty, wallet, WhatsApp, reputation | 🟣 | Mature |
| 3.15 | Multi-branch | Head office, central kitchen, 50-outlet on-prem | ✅ | Parity |
| 3.16 | SaaS admin/self-serve | Sales-led only; no self-serve signup found | 🟢 | Clear opening |
| 3.17 | Audit/notifications | User rights + modification reports; tamper-evidence unknown | 🟡 | Nammude could win on immutability |
| 3.18 | Integrations/API | 200+ integrations; API top-tier | 🟣 | Moat; do not fight breadth |

**Score:** Petpooja leads 5, parity 6, partial 5, Nammude whitespace 2 (hygiene/compliance, self-serve), one no-contest (payroll).

---

## 10. Where Nammude can win

1. **Self-serve onboarding + published pricing.** Petpooja requires a demo and a sales conversation. A 10-minute, card-less trial with real data import is a structural wedge with younger owners.
2. **OCR → ledger with human verification.** They have **Purchase Scan** and **Munshi**, but both are purchase/expense-focused, low-adoption (10K+/10+ installs), and reviewed as complex and glitchy. Build upload → parse → side-by-side verify → post, covering thermal, A4, handwritten, and both purchases and expenses. The differentiator is **trust and coverage**, not OCR itself.
3. **Hygiene & compliance.** Fridge temperature logs, deep-clean checklists, licence/certificate expiry reminders, audit-ready exports. No dedicated Petpooja module found; Stepwise templates are generic tasks.
4. **Data ownership.** One-click full export, hard delete, retention controls, and no 60-day edit locks. Make this a public promise.
5. **Modern offline-first PWA.** Their offline story requires local server/Electron complexity. A PWA with idempotent sync and conflict resolution is simpler to deploy and support.
6. **Transparent unlimited messaging.** No WABA credits; flat pricing for WhatsApp/SMS with fair-use. Directly attacks their credit model.
7. **Vernacular/Kerala wedge.** They claim 18 languages but the iOS app is English-only and support quality varies. A Malayalam-first product + support + Kerala compliance nuances is defensible.
8. **Audit-grade immutability.** Append-only event log, tamper-evident hashes, exportable audit trail. Their reports are not proof.
9. **Focused integration excellence.** Swiggy, Zomato, WhatsApp, UPI, Tally, e-invoice — done better, not 200 done shallowly.
10. **No hardware bundling.** Hardware-agnostic, bring-your-own-printer/scanner. Their commission-driven hardware sales is a trust liability.
11. **A real mobile app, not a webview.** Their merchant app is a Flutter shell around the portal. An offline-first mobile/PWA with local order capture is a visible, demonstrable difference.
12. **Honest API access.** They have a gateway but no public docs. A documented, self-serve API with keys and webhooks is a developer/partner wedge.

---

## 11. Where Petpooja will win (and Nammude should not fight)

- **Breadth and integrations.** 200+ connectors and aggregator reconciliation are years of BD work.
- **Offline/on-prem enterprise deals.** Local POS up to 50 outlets, data-in-house, field installation.
- **Payroll + POS bundle.** Attendo gives them a second budget line and 1M+ app installs.
- **Price umbrella.** ₹6k–12k entry is hard to undercut sustainably.
- **Field support in 200+ cities.** Physical presence closes large chains.
- **Switching costs.** Menu, inventory recipes, CRM, loyalty balances, and aggregator mappings are sticky.
- **ONDC + horizontal expansion.** They are turning the POS into a network gateway and pushing Attendo into healthcare — more surface area and more budget lines than a pure restaurant SaaS.
- **Enterprise-grade compliance.** SOC 2 Type II, ISO 27001:2022 and SOC 1 with a public trust portal. This wins procurement at chains and cloud kitchens; Nammude cannot match it early.
- **Embedded finance and hardware.** 174 catalogue services including eight lending partners and six hardware brands mean they monetise beyond software.

---

## 12. What is still unknown

To finish the technical teardown, we need artifacts:

| Phase | Needed | What it unlocks |
|---|---|---|
| Desktop POS | Windows installer for Electron POSS | ASAR/JS graph, IPC, native addons, local DB, auto-update, licence/activation, offline sync, printer protocols |
| Live dashboard | Authorized demo/trial account | End-to-end flows, routes, payload shapes, realtime channels, role model |
| Native provider | Ghidra/Hopper/IDA (optional) | Only if the Electron app ships native modules worth decompiling |
| Satellites (optional) | `com.petpooja.task_manager`, `com.invoice.briefcase`, Attendo APKs | Whether satellites share the Flutter shell or are native; OCR model/runtime |

**Done:** Android merchant APK is acquired and analyzed (§7.5). It is a Flutter + WebView companion, so it does **not** unlock offline DB/sync design — those live in the Electron/local POS.

**Constraint:** no auth/DRM/licence bypass. Analysis will be static on lawfully obtained builds and the user's own account.

---

## 13. Recommended next moves

1. **Get a demo account** (or a 7-day trial) and record the billing → KOT → inventory → report flow.
2. **Obtain the Electron installer** through the demo/sales process; then `open_binary` → ASAR → JS graph.
3. **Probe the partner API** (`api.petpooja.com`) with legitimate partner credentials, if available, to map the public surface.
4. **Build the whitespace MVP**: OCR verification workflow + hygiene logs + self-serve onboarding.
5. **Publish a comparison page** that attacks the credit model, 60-day lock, demo-only onboarding, and webview-only mobile app — factually, with sources.
6. **Do not attack compliance.** They have SOC 2 + ISO 27001; a compliance-led pitch will lose. Compete on product speed, transparency, and ownership.

---

## Appendix A — Sources

- https://www.petpooja.com/ (home)
- https://www.petpooja.com/poss (product)
- https://www.petpooja.com/poss/pricing
- https://www.petpooja.com/poss/restaurant-integrations
- https://www.petpooja.com/poss/restaurant-billing-software
- https://www.petpooja.com/poss/restaurant-inventory-management-software
- https://www.petpooja.com/poss/online-order-management-software
- https://www.petpooja.com/poss/reports-and-analytics
- https://www.petpooja.com/poss/restaurant-menu-management-software
- https://www.petpooja.com/poss/restaurant-customer-management-software
- https://www.petpooja.com/poss/purchase-manager
- https://www.petpooja.com/offline-pos
- https://www.petpooja.com/poss/marketing-manager
- https://www.petpooja.com/poss/kitchen-display-system
- https://www.petpooja.com/poss/captain-ordering-app
- https://www.petpooja.com/poss/scan-and-order
- https://www.petpooja.com/poss/self-service-kiosk
- https://www.petpooja.com/poss/online-order-token-management
- https://www.petpooja.com/poss/online-order-reconciliation
- https://www.petpooja.com/poss/restaurant-analytics-insights
- https://www.petpooja.com/poss/restaurant-website
- https://www.petpooja.com/poss/restaurant-loyalty-program
- https://www.petpooja.com/poss/customer-feedback-management
- https://www.petpooja.com/poss/restaurant-sms-service
- https://www.petpooja.com/poss/restaurant-app-marketplace
- https://www.petpooja.com/poss/reseller-program
- https://www.petpooja.com/about-us
- https://www.petpooja.com/careers
- https://www.petpooja.com/security
- https://www.petpooja.com/corporate_information
- https://billing.petpooja.com/ (login)
- https://play.google.com/store/apps/... (13 packages listed in §7.4)
- https://apps.apple.com/in/app/petpooja-merchant-app/id1362012013
- https://www.softwaresuggest.com/petpooja
- https://jobs.klimb.io/petpooja
- https://trust.petpooja.com/ (Trust Portal)
- https://learn.petpooja.com/ (LMS)
- https://billing.petpooja.com/ (login; 174-service catalogue in inline JS)
- https://billingcdn.petpooja.com/js/Encryption.1585206229.js (AES-256-CBC login encryption)
- https://menu.petpooja.com/ (separate menu portal)
- https://inventory.petpooja.com/ (inventory portal)
- https://api.petpooja.com/V1/support/add_firebase_details/ (API gateway probe; GN_101)
- https://ws75.aptoide.com/api/7/app/get/package_name=com.petpooja.billing (APK metadata)
- https://pool.apk.aptoide.com/appupdater/com-petpooja-billing-57-75351988-990fe815b8493801429bdb3dfc010cf3.apk (signed APK mirror)

## Appendix B — Evidence limits

- All vendor claims are self-reported and may be stale or inconsistent.
- Pricing observed on 12 Nov 2026; plans are explicitly "indicative and subject to change".
- SoftwareSuggest pricing may lag the vendor site; treat it as channel/partner data.
- App install bands are Google Play public bands, not exact.
- The Android APK analyzed is v4.4.0 (code 57), mirrored 25 Jun 2026. The Play listing was updated 28 Sept 2026, so a newer build may exist; the shell architecture is unlikely to have changed.
- APK signature was validated by the mirror against Google Play; independent cryptographic verification was not performed locally.
- No Electron build or authenticated dashboard session was analyzed; those architecture statements remain inferred.
- Review quotes are individual, not statistically representative.
- Compliance badges are read from the public Trust Portal; report contents are access-gated and were not reviewed.
