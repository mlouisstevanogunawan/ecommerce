# AUDIT_REPORT — Phase 1 & 2

Tanggal audit: 2026-11-03. Ruang lingkup: seluruh `src/` (119 file TS/TSX), 20 route handler API, `supabase/migrations/001–019`, `supabase/seed.sql`, skrip, dokumentasi, dan database Supabase live (`dxjoxhehsvkqduywivac`, PostgreSQL 17.11).

Metode: pembacaan kode + grep lintas repo, verifikasi state DB lewat SQL langsung (bukan lewat asumsi file migrasi), Supabase security/performance advisor, dan uji empiris (query dijalankan sebagai role `anon` di dalam transaksi yang di-rollback).

Klasifikasi penemuan mengikuti directive: A=Bug nyata, B=Kerentanan keamanan, C=Masalah database, D=Data dummy/hardcoded, E=Fitur hilang, F=Implementasi belum selesai, G=Performa, H=UI/UX, I=Konten statis yang sah.

---

## 1. Temuan KRITIS

### 1.1 View `public.profile_public` bisa dipakai menulis dan menghapus data siapa pun (B, C) — KRITIS

- Lokasi: `supabase/migrations/006_rls_hardening.sql:131-142` dan `:407`; dipakai aplikasi di `src/lib/supabase/data.ts:217` (nama penulis review).
- Masalah: view dibuat `OWNER TO postgres` tanpa `security_invoker`, sehingga view menjalankan query memakai hak + identitas owner dan **melewati RLS tabel `profiles`**. Lalu `REVOKE ALL ... FROM PUBLIC` di baris 407 hanya mencabut dari pseudo-role `PUBLIC`, tidak dari `anon`/`authenticated` yang diberi hak eksplisit di baris 140. Hasilnya saat ini: `anon` memegang INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER pada view tersebut.
- Bukti (diuji langsung, lalu di-rollback; jumlah baret tetap 4 setelahnya):
  - `set local role anon; select count(*) from public.profile_public` → **4** (semua profil), sementara `select` langsung ke `profiles` → `42501 permission denied` (anon tidak punya SELECT di tabelnya).
  - `set local role anon; delete from public.profile_public` → **berhasil tanpa error**. View satu tabel = auto-updatable, jadi perintah DELETE diteruskan ke `profiles` sebagai owner.
  - Supabase security advisor melaporkan hal yang sama: `security_definer_view` — level **ERROR**.
- Root cause: migrasi 019 yang menutup lubang TRUNCATE hanya memfilter `pg_class.relkind IN ('r','p')` — view (`relkind='v'`) tidak ikut tercakup.
- Perbaikan: migrasi baru yang mencabut semua hak non-SELECT pada view dari `anon`, `authenticated`, `service_role` dan `PUBLIC`, lalu `GRANT SELECT` kembali (view memang dibutuhkan untuk menampilkan nama penulis review secara publik). Tidak mengubah migrasi 006 yang sudah diterapkan.
- Verifikasi: ulangi `set local role anon; delete from public.profile_public` → harus `42501 permission denied`; `select` tetap 4 baris; advisor `security_definer_view` hilang; harness e2e (67 pemeriksaan) tetap lolos.

### 1.2 Hak tabel jauh lebih luas daripada kebijakan RLS-nya (B) — TINGGI

- Lokasi: grants di skema `public` (dibuat pola `GRANT ALL ON ALL TABLES` di awal proyek).
- Matriks saat ini vs kebutuhan (S=select I=insert U=update D=delete):

| Tabel | anon sekarang | anon seharusnya | auth sekarang | auth seharusnya |
|---|---|---|---|---|
| `payments` | SIUD | **(tidak ada)** | SIUD | **S** |
| `order_items` | ---- | - | SIUD | **S** |
| `products`, `product_images`, `product_variants`, `categories`, `blog_posts`, `blog_categories`, `coupons`, `site_settings` | SIUD | **S** (+I untuk dua tabel pesan/newsletter) | SIUD | sesuai kebijakan |
| `stores` | SI-D | **S** | SIUD | sesuai kebijakan |
| `profiles` | ---- | - | SI-D | **SID + U** |
| `contact_messages` | SIUD | **I** saja | SIUD | SID |
| `newsletter_subscribers` | -I-- | **I** saja | SI-D | SID |

- Dampak: RLS menahan sebagian besar penulisan (tidak ada kebijakan untuk peran itu), jadi ini bukan eksploit langsung — tapi ini defense-in-depth yang bolong dan persis pola yang menghasilkan lubang 1.1. Anon bahkan punya SELECT pada `payments` (catatan pembayaran).
- Perbaikan: bagian dari migrasi 020; cabut semua hak di luar matriks "seharusnya" di atas, lalu grant ulang secara presisi. Tidak ada jalur tulis aplikasi yang terkena: penulisan `payments`/`order_items` hanya lewat RPC `place_order` dan `update_order_status` (SECURITY DEFINER, `src/lib/supabase/data.ts:782`, `:997`).
- Verifikasi: matriks grants dibaca ulang; harness e2e dijalankan penuh.

---

## 2. Bug nyata (A)

| # | Lokasi | Masalah | Severity | Perbaikan | Verifikasi |
|---|---|---|---|---|---|
| A1 | `src/app/admin/orders/page.tsx:73` | Tautan "Invoice" membuka `/account/orders/{order_number}`, tetapi halaman order milik akun membaca lewat `getOrderById` dengan client ter-scope user (`data.ts:840`) dan memakai `id`. Admin melihat order pembeli lain → `notFound()`. | TINGGI | Arahkan ke `/admin/orders?id=…` atau sediakan pembacaan berbasis admin di halaman detail; jangan pakai route milik akun untuk admin. | Buka `/admin/orders` sebagai admin, klik Invoice, harus 200 dan menampilkan baris yang benar. |
| A2 | `src/app/checkout/page.tsx:134-136` | `.catch(() => setCouponDiscount(0))` — kegagalan validasi kupon yang sebenarnya error server ditampilkan sebagai "kupon tidak berlaku" dan pembeli membayar harga penuh. | TINGGI | Bedakan error jaringan/server dari kupon ditolak; tampilkan pesan gagal (`/cart/page.tsx:80-84` sudah benar). | Harness: endpoint coupon 500 → UI menampilkan error, bukan diskon 0 diam-diam. |
| A3 | `src/lib/supabase/result.ts:24-31` | `money()` mengubah angka tak-valid menjadi `0`. Harga rusak tampil gratis dan checkout bisa membuat order bernilai 0. | TINGGI | `money()` harus melempar error, bukan mengembalikan 0 (sudah ada pola `unwrap()` untuk itu). | Unit check: `money('abc')` melempar; harness checkout tetap lolos. |
| A4 | `src/lib/currency/rates.ts:11-20,51-53,64-80` | Jika API kurs gagal **atau** satu currency tidak ada di respons, harga diam-diam dihitung dari `STATIC_FALLBACK_RATES` (IDR 16000, EUR 0.92, JPY 155). Pembeli melihat dan membayar kurs basi tanpa tanda apa pun. | TINGGI | `isFallback` sudah dikembalikan tapi tidak pernah ditampilkan. Tampilkan penanda "kurs tidakสด" dan larang checkout dengan kurs fallback, atau gagal dengan error states. | Matikan API kurs sementara → UI menandai kurs; checkout ditolak dengan pesan jelas. |
| A5 | `src/components/products/ProductDetailView.tsx:36` | Prop `relatedProducts` diterima lalu tidak pernah dirender — datanya tetap di-fetch (biaya query + payload) lalu dibuang. | SEDANG | Render seksi terkait atau hapus fetch-nya. | Produk detail tidak lagi mengirim `relatedProducts` yang tak dipakai. |
| A6 | `src/app/help-center/page.tsx:31` | Pencarian FAQ tidak punya cabang "tidak ada hasil" — kata kunci tak cocok membuat panel kosong tanpa penjelasan. | SEDANG | Tambahkan empty state. | Ketik `zzz` → tampil "tidak ada hasil". |
| A7 | `src/app/products/[slug]/page.tsx:1` | Route duplikat yang hanya meng-impor ulang `src/app/[slug]/page.tsx`; dua URL untuk satu halaman, membingungkan canonical/sitemap. | RENDAH | Putuskan satu route (redirect permanen dari yang lama). | Kedua URL diuji; salah satu 301. |

## 3. Fitur yang hanya UI / belum ada backendnya (E, F)

| # | Fitur | Kondisi sebenarnya | Severity | Rencana |
|---|---|---|---|---|
| F1 | **Semua unggah gambar (Phase 8)** | Tidak ada satu pun jalur unggah di aplikasi: `grep` untuk `storage.from(`, `.upload(`, `type="file"` di `src/` → **0 hasil**. Kelima bucket (`products`, `avatars`, `covers`, `blog`, `digital_files`) berisi **0 objek**. `image_url` di admin banner / form produk / store settings adalah kolom teks bebas, dan seluruh gambar produksi datang dari URL Unsplash di `seed.sql` — konten produksi yang diarang-arang. | TINGGI | Implementasikan unggah nyata ke Supabase Storage + kebijakan penyimpanan yang benar (lihat S2) + penggantian/hapus gambar. |
| F2 | Kelola profil | Tidak ada UI. `profiles` punya kebijakan `profiles_update_own_or_admin` tetapi role `authenticated` tidak punya grant UPDATE, jadi menulis juga tidak akan bisa. | SEDANG | Tambah halaman profil + grant UPDATE (ada di migrasi 020). |
| F3 | Kelola alamat | `user_addresses` **dibaca** (`data.ts:707-724` untuk prefill checkout) tetapi tidak pernah **ditulis** dari aplikasi; isinya 1 baris warisan seed. Fitur "Manage addresses" efektif mati. | SEDANG | CRUD alamat nyata; tabel + RLS (`user_addresses_own`) + grant sudah siap. |
| F4 | Notification | Tidak ada tabel `notifications` dan tidak ada UI. Directive menyebut "no fake notifications" — saat ini tidak ada klaim, jadi tidak ada yang palsu. | RENDAH | Jangan buat tabel tanpa fitur; catat sebagai tidak diimplementasikan. |
| F5 | Riwayat status order/pembayaran | Tidak ada tabel history. UI tidak menampilkan timeline, jadi tidak ada klaim palsu. | RENDAH | Tidak dibuat (menghindari skema mati) kecuali timeline diminta. |
| F6 | Admin activity log / moderasi / persetujuan seller | Tidak ada. Keputusan seller otomatis (`handle_new_user` memetakan role). UI admin tidak mengklaim adanya log. | RENDAH | Tidak dibuat; dilaporkan sebagai batas sistem. |
| F7 | Gambar review | `product_reviews` tidak punya kolom/tabel gambar. UI form review hanya teks + bintang → tidak ada klaim palsu. | RENDAH | Tidak dibuat. |
| F8 | Blog & kategori CMS | `blog_posts`/`blog_categories` punya kebijakan INSERT/UPDATE/DELETE admin, tetapi **tidak ada halaman admin untuk blog**. Konten blog hanya bisa diubah lewat SQL. | SEDANG | Tambah admin blog (CRUD nyata) atau tandai sebagai manual-SQL di dokumentasi. |
| F9 | GET route handler tak terpakai | `src/app/api/currency/rates/route.ts` (seluruh handler, 0 pemanggil), `api/follow/route.ts:18` GET (0 pemanggil), dan GET pada `api/admin/{banners,products,users}`, `api/seller/{orders,products,store}` (data selalu lewat SSR). | SEDANG | Hapus yang mati; jangan simpan kode yang tidak dipakai siapa pun. |

## 4. Data dummy / hardcoded (D)

| # | Lokasi | Isi | Klasifikasi | Tindakan |
|---|---|---|---|---|
| D1 | `supabase/seed.sql:59-88,120-167,176-247,257-285` | 4 akun demo, 2 store, 12 produk + harga, gambar Unsplash, varian, alamat "Jane Doe", 3 review, 4 artikel blog, 2 kupon. File diberi keterangan DEVELOPMENT ONLY. | D (data produksi palsu di DB nyata) | Database live masih berisi baris ini. Perlu keputusan user: hapus vs biarkan sampai konten asli dimasukkan. Tidak saya hapus tanpa izin. |
| D2 | `src/lib/currency/rates.ts:11-20` | Tabel kurs statis dipakai untuk menghitung uang. | D + A4 | Jadikan eksplisit, jangan diam-diam. |
| D3 | `messages/en.json:60-65`, `messages/id.json:60-65` | `hero1Title`…`hero3Subtitle` — slide hero yang sudah dipindah ke tabel `banners`; kuncinya tidak pernah dibaca. | D mati (dead fabricated content) | Hapus kunci yatim. |
| D4 | `messages/*:60-65` (`categories.*`) | 6 nama kategori yang tidak dipakai. | D mati | Hapus yang tidak dirujuk. |
| D5 | `messages/en.json:129` | Placeholder kupon menyebut kode seed `MODESY10`. | D | Ganti contoh netral. |
| D6 | `src/components/home/FeaturedProducts.tsx:17-24,41` | Tab kategori diarang dari slug (`clothing`, `shoes`, `jewelry`) + klaim "verified quality" tanpa kolom `is_verified`. | D | Tab diambil dari tabel `categories` asli; kata "verified" dihapus/diambil dari `stores.is_verified`. |
| D7 | `next.config.ts:24` | Domain `images.unsplash.com` masih diizinkan. | D | Diperlukan selama baris seed ada; hapus bersamaan dengan D1. |
| D8 | `src/app/seller/products/new/NewProductForm.tsx:140` | Contoh placeholder menyebut produk rekaan. | I (petunjuk input) | Biarkan, atau contoh netral. |
| D9 | Dashboard admin/seller (`admin/dashboard/page.tsx:54-89`, `seller/dashboard/page.tsx:70-106`) | Semua metrik agregat dari DB. | bersih | Tidak ada perubahan. |
| D10 | URL gambar eksternal di `src/` | **0** literal tersisa; fallback memakai `/placeholder-product.svg` (ada di repo). | bersih | Tidak ada perubahan. |
| D11 | `supabase/seed-demo-users.sh:24` | Kata sandi bersama `Modesy#Demo2026` dikomit; sama di `scripts/role-probe.mjs:16`, `scripts/race-check.mjs:30`. | B (kredensial di repo) | Ambil dari environment variable, jangan hardcode. |
| D12 | `FINAL_AUDIT_REPORT.md:21,164` | Klaim `.env.local` berisi `dummy-project.supabase.co` dan "app falls back to hydrated runtime memory seeded from audited Modesy data" — keduanya salah sejak pekerjaan sebelumnya. | D (dokumentasi menyesatkan) | Ditulis ulang di Phase 12. |

Konten statis yang **sah** dan dibiarkan (I): navigasi AdminShell/SellerShell (`:18-25`, `:23-28`), label Header/Footer/MegaMenu (via `t()`), kamus i18n `messages/*.json`, token locale & mata uang (`lib/i18n/config.ts:8`, `lib/currency/config.ts:9-69`), salinan legal/about/help-center yang sengaja ditulis sesuai perilaku nyata (tidak ada refund, tidak ada tracking kurir, tidak ada payout), `TrustBadges.tsx:17-40` (nomornya dari `checkout_rules()`), daftar negara `LocationModal.tsx:15-24`, dan nilai CSS.

## 5. Keamanan tambahan (B)

| # | Lokasi | Masalah | Severity | Perbaikan |
|---|---|---|---|---|
| S1 | `pg_policy` storage | `"Admins can upload to blog"` dan `"Sellers can upload product images"` memakai `with_check` hanya `auth.uid() IS NOT NULL`. Nama kebijakan menjanjikan admin/seller, isinya membolehkan **setiap** pengguna yang login menulis ke bucket mana pun dalam daftarnya, tanpa batasan folder milik sendiri. | TINGGI | Kebijakan baru yang memeriksa role (`is_admin()` / `is_seller()`) dan membatasi path ke namespace uid. |
| S2 | `storage.objects` policies | Tidak ada kebijakan UPDATE/DELETE sama sekali → mengganti atau menghapus gambar tidak akan pernah bisa. | TINGGI | Tambah UPDATE/DELETE berbasis kepemilikan path. |
| S3 | bucket `digital_files` | private, 100 MB, tanpa `allowed_mime_types`, tanpa kebijakan, dan tidak dirujuk aplikasi. Kemampuan mati. | RENDAH | Hapus bucket (butuh persetujuan user) atau tandai tidak dipakai. |
| S4 | `product_brands()` | `search_path` belum di-pin (advisor `function_search_path_mutable`, WARN). 21 fungsi lain sudah `search_path=public, pg_temp`. | SEDANG | `ALTER FUNCTION ... SET search_path` di migrasi 020. |
| S5 | RPC yang bisa dipanggil anon | `is_admin()`, `my_store_ids()`, `checkout_rules()`, `is_following_store()`, `store_follower_count()` = SECURITY DEFINER + execute untuk anon (advisor `anon_security_definer_function_executable`, WARN). **Diuji: EXECUTE untuk anon tidak boleh dicabut** — kebijakan `products_select_published_or_owner`, `banners_select_active` dan `coupons_select_active` dipanggil dengan role `anon` dan ekspresinya memakai `is_admin()` / `my_store_ids()`; mencabut EXECUTE akan membuat semua listing publik gagal (`permission denied for function`). | RENDAH (dokumentasi, bukan lubang) | Dibiarkan sesuai kebutuhan; kedua fungsi hanya mengembalikan kosong/false saat `auth.uid()` NULL. Dicatat di SECURITY_AUDIT_REPORT. |
| S6 | Auth | Leaked-password protection **NONAKTIF** (advisor `auth_leaked_password_protection`). | SEDANG | Diubah lewat dashboard/Management API — tidak bisa dari SQL. Masuk daftar tindakan manual. |
| S7 | Bersih | Semua fungsi SECURITY DEFINER sudah pin search_path; `env.ts` menolak nilai placeholder; service key tidak pernah dibaca sisi klien; tidak ada `middleware` pembocor; scan secret pada file terkomit + bundle `.next` bersih; `.env.example` sudah disanitasi. | — | Tidak ada perubahan. Catatan lama: key lama masih ada di history git `d527042` → rotasi tetap perlu. |

## 6. Performa & kualitas kode (G)

| # | Lokasi | Masalah | Severity | Perbaikan |
|---|---|---|---|---|
| P1 | advisor `unindexed_foreign_keys` | FK `store_follows_user_id_fkey` tanpa indeks pelengkap. | SEDANG | Indeks di migrasi 020. |
| P2 | advisor `unused_index` (13 indeks) | Indeks jarang dipakai di DB kecil. | RENDAH | Tidak dihapus; biarkan sampai ada data nyata, lalu ukur ulang. |
| P3 | `src/app` | **0** file `loading.tsx`, **0** `error.tsx`, **0** `not-found.tsx`. Lima route memakai `notFound()` tapi tidak punya tampilan sendiri. | TINGGI | Tambah boundary + skeleton untuk route utama. |
| P4 | `src/app/shops/page.tsx:14` | Fetch `getShops(q)` tanpa cabang kosong dan tanpa penanganan error. | TINGGI | Empty + error state. |
| P5 | halaman data lain (`about-us`, `privacy-policy`, `blog`, `categories/[slug]`, `[slug]`, `products`, `profile/[slug]`, `account/orders`, `seller/dashboard`) | Tidak ada try/catch dan tidak ada boundary. | SEDANG | Ditutup P3 + error branch per halaman. |
| P6 | kode mati | Ekspor tanpa importer: `cn` (`lib/utils.ts:5`), `listPrice` (`lib/pricing.ts:20`), `statusOf` (`lib/errors.ts:14`), `orThrow` (`result.ts:15`), `getSupabase` (`auth/session.ts:42`), `getNewArrivals` (`data.ts:187`), `getProductById` (`data.ts:230`), `getSellerStats` (`data.ts:883`), `getContactMessages` (`data.ts:1173`); 15 alias tipe di `schema-map.ts:53-68`; `React` diimpor-tak-pakai di 35 file; ikon mati (`Printer`, `Share2`, `FileText`, `ArrowRight`, `Store`, `Layers`, `Lock`, `Heart`, `Check`, `User`, `ChevronRight`). | SEDANG | Hapus yang benar-benar nol rujukan; jangan simpan scaffolding. |
| P7 | `src/app/api/**/route.ts` | Helper `respond`/`badRequest`/`errorResponse`/`createClient` diduplikasi per route. | RENDAH | Ekstrak satu modul bersama (hanya jika bersih dilakukan tanpa mengubah perilaku). |
| P8 | `test_cart_flow.py`, `test_checkout_bugfix.py`, `test_currency_i18n.py`, `test_forensic.py` (terkomit di root) | Artefak sesi lama, bukan bagian dari suite `npm`, tidak dijalankan CI apa pun. | SEDANG | Hapus atau pindahkan; harness nyata ada di `scripts/e2e-db-check.mjs`. |

## 7. UI/UX & aksesibilitas (H)

| # | Lokasi | Masalah | Severity |
|---|---|---|---|
| U1 | `LocationModal.tsx:53` | Tombol tutup hanya ikon tanpa `aria-label`; modal tanpa `role="dialog"`, `aria-modal`, focus trap, atau Esc. | TINGGI |
| U2 | `AddedToCartModal.tsx:38` | `aria-label` sudah ada, tetap tanpa `role="dialog"`/focus handling/Esc. | TINGGI |
| U3 | `cart/page.tsx:260`, `AdminCategoriesManager.tsx:221`, `Header.tsx:194` | Ikon trash/search tanpa nama aksesibel. | TINGGI/SEDANG |
| U4 | `ProductDetailView.tsx:336,343,353,580` | Tombol +/- dan bintang rating tanpa nama aksesibel; input jumlah tanpa label. | SEDANG |
| U5 | `AdminUsersTable.tsx:111`, `SellerOrdersTable.tsx:121`, `SellerProductsTable.tsx:171` | `<select>` tanpa `<label>`/`aria-label`. | SEDANG |
| U6 | 8 input pencarian/kolom hanya ber-`placeholder` (`shops:39`, `help-center:61`, `Header:124,187`, `cart:327`, `checkout:504`, `NewProductForm:236`, `ProductFiltersSidebar:206,215,239`) | Tanpa label terkait. | SEDANG |
| U7 | `login/page.tsx:138` | `id="login-password"` tanpa `htmlFor` yang cocok. | RENDAH |
| U8 | `ProductFiltersSidebar.tsx:157` | Tombol buka/tutup tanpa `aria-expanded`. | SEDANG |

Tidak ditemukan: `href="#"`, handler kosong, `alert()`/`console.log()` sebagai pengganti aksi, form yang berpura-pura submit, atau tautan ke route yang tidak ada. Semua form mengirim ke route handler nyata.

## 8. State database live (verifikasi Phase 2/3)

- 22 tabel + 1 view, 62 kebijakan RLS, 20 trigger, 24 fungsi, 81 indeks, 5 ekstensi; semua tabel `relrowsecurity=true` (`relforcerowsecurity=false` — owner tetap lewat, termasuk lewat view; inilah mekanisme 1.1).
- **Migrasi**: `supabase_migrations.schema_migrations` berisi 14 versi bertimestamp (`20261030140500…20261030152945`) yang **tidak** berkorelasi dengan penomoran 001–019 di repo. Jadi state tidak bisa dibaca dari riwayat. Verifikasi dilakukan dengan mencocokkan objek khas tiap migrasi: kolom `orders.currency`/`exchange_rate` (004), trigger `handle_new_user` di `profiles` (005), `place_order` (007), `contact_messages` (008), indeks `product_variants_one_name_per_product` (010), 18 fungsi tanpa EXECUTE anon (013), `banners` (014), `store_follows` (015), `newsletter_subscribers` + kolom sosial `site_settings` (016), `product_brands()` (017), `banners.category_id` (018), dan revoke non-DML (019). **Semua ada → 001–019 diterapkan, tidak ada drift.**
- Isi data: profiles 4, stores 2, products 34 (12 published), product_images 32, variants 7, orders 37, order_items 49, payments 37, reviews 3, categories 14, blog_posts 4, coupons 2, site_settings 1, carts 3, wishlists 1, user_addresses 1, contact_messages 12, **banners 0**, store_follows 0, newsletter 0. Semua bucket storage 0 objek.
- Auth: 4 user, semuanya `email_confirmed_at` terisi, tidak ada yang banned.
- Artefak uji sesi lalu yang masih hidup di DB: 22 produk `e2e-verified-%`/`cross-store-%` (sudah saya turunkan ke `status='draft'`), 37 order milik akun demo, 11 `contact_messages` `e2e@modesy.dev`, 1 review harness, metrik `trendshop` yang terinflasi 51 penjualan / $2,614.20. Perlu keputusan user (lihat §9).

## 9. Yang tidak bisa saya putuskan sendiri (butuh persetujuan user)

1. Menghapus baris seed/artefak uji (D1, §8) dari database live — destruktif terhadap data.
2. Menghapus view `profile_public` (alternatif dari 1.1: saya pilih membuatnya read-only, bukan menghapus, karena dipakai `data.ts:217`).
3. Menghapus bucket `digital_files` (S3) dan file Python terkomit (P8).
4. Mengganti kata sandi akun demo dan merotasi key lama yang masih ada di history git (S7, D11).
5. Mengaktifkan leaked-password protection + SMTP/inbox untuk memverifikasi reset sandi dan konfirmasi email (S6) — di luar akses SQL.
6. `SUPABASE_SERVICE_ROLE_KEY` di `.env.local` masih ditolak proyek (`Unregistered API key`) → `/admin/users` belum bisa mengubah role. Key `sb_secret_…` yang valid dari dashboard dibutuhkan; kredensial pooler PostgreSQL yang baru diberikan **tidak** menggantikannya.
