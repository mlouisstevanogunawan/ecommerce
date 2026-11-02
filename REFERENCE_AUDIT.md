# REFERENCE AUDIT — MODESY MARKETPLACE REBUILD

Audit website referensi: `https://modesy.codingest.net/`
Waktu Audit: 2026-10-29

---

## 1. DESAIN SISTEM & IDENTITAS VISUAL

### Palet Warna
- **Warna Utama (Brand Teal/Cyan):** `#00a99d` (Hover: `#008f85`, Light Tint: `#e6f6f5`)
- **Warna Aksen / Badge Diskon:** `#e53935` (Merah diskon `-25%`)
- **Warna Teks Utama:** `#222222` (Heading & teks penting)
- **Warna Teks Sekunder / Muted:** `#777777` / `#868e96`
- **Background Utama:** `#ffffff`
- **Background Sekunder / Section:** `#f8f9fa`
- **Garis Pembatas (Border):** `#e9ecef` / `#dee2e6`
- **Status Warna:**
  - Sukses / In Stock / Free: `#28a745` / `#00a99d`
  - Warning / Rating Stars: `#ffc107`
  - Danger / Error: `#dc3545`

### Tipografi & Iconography
- **Font Utama:** `Open Sans`, `Inter`, sans-serif
- **Heading Styles:** Clean, semibold / bold (font-weight: 600 - 700)
- **Ikon:** Lucide React (shopping cart, heart, search, star, chevron, shield, truck, phone, mail, map-pin, user, menu, x, dll.)

---

## 2. STRUKTUR & KOMPONEN HALAMAN PUBLIK

### A. Header & Navigasi
1. **Top Bar:**
   - Sisi Kiri: Menu link *Contact*, *Sell on Modesy*.
   - Sisi Kanan: Modal Trigger *Location*, Currency Selector (*USD, EUR, GBP, IDR, dll.*), Language Selector (*English, Arabic*), Tombol *Login / Register*.
2. **Main Header:**
   - Brand Logo: Modesy (160x60px rasio aspect).
   - Global Search Bar: Input pencarian komprehensif dengan AJAX suggestion kategori dan brand.
   - Action Items Kanan: Cart icon (badge kuantitas dinamis), Wishlist icon (badge count), dan tombol CTA "Sell Now" berlatar belakang brand `#00a99d`.
3. **Mega Menu Kategori:**
   - Level 1: *Clothing*, *Shoes*, *Home & Living*, *Jewelry & Accessories*, *Toys & Entertainment*, *Graphics & Photos*, *Video & Audio*, *Web Templates & Code*.
   - Hover Mega Dropdown: Menampilkan kolom subkategori hierarkis (Level 2 & Level 3) serta gambar preview kategori unggulan.
   - Mobile Header: Hamburger menu drawer dengan tab navigasi ("Main Menu" & "Categories"), sticky search bar, dan quick cart access.

### B. Homepage Sections
1. **Hero Main Slider:** Swiper/carousel responsif dengan banner promosi resolusi tinggi, caption animasi (Judul, Subjudul, tombol CTA "Explore Now" / "Buy Now").
2. **Shop By Category:** Grid kartu bulat (rounded 1:1 image) dengan efek hover zoom, nama kategori, dan overlay badge "Shop Now ->".
3. **Special Offers (Flash Sale / Promo):** Slider kartu produk dengan badge persentase diskon (`-25%`, `-18%`, dll.), dual-image hover preview (default & hover image flip), harga asli dicoret dan harga diskon hijau, tombol overlay *Add to Cart* dan *Add to Wishlist*.
4. **Promo Banners (Grid 2 Kolom):** Banner promosi kategori dengan aspect ratio proporsional (635x332px).
5. **Featured Products (Promoted Showcase):** Grid produk rekomendasi dengan badge "Featured", rating bintang, nama penjual yang dapat diklik ke profil toko, dan tombol "Load More".
6. **New Arrivals Section:** Grid produk terbaru (4 per baris desktop, 2 per baris mobile) dengan tombol "View All".
7. **Secondary Banners (Grid 3 Kolom):** Banner promosi sekunder (Home & Living, Shoes, Women's Clothing).
8. **Category Product Showcases:** Showcase produk per kategori utama dengan carousel geser.
9. **Latest Blog Posts:** Carousel 3 kolom artikel blog terbaru (thumbnail, kategori tag, judul, meta tanggal, excerpt singkat).
10. **Footer Lengkap:**
    - Kolom 1: Logo Modesy, deskripsi singkat marketplace, tautan media sosial.
    - Kolom 2: Daftar tautan Kategori Populer.
    - Kolom 3: Quick Links (Home, Blog, Shops, Help Center) & Information (Terms & Conditions, About Us).
    - Kolom 4: Formulir Langganan Newsletter dan ikon pembayaran (Visa, Mastercard, Maestro, Amex, Discover).
    - Bottom bar: Hak cipta dan link Privacy Policy & Cookie Policy.

### C. Halaman Detail Produk (`/[slug]`)
- **Breadcrumbs:** Navigasi jalur kategori hierarkis (`Home > Clothing > Women's Clothing > Dresses > Product Title`).
- **Galeri Produk (Kiri):**
  - Thumbnail vertical/horizontal preview.
  - Gambar utama dengan indikator zoom / lightbox preview.
- **Informasi Produk (Kanan):**
  - Judul Produk (H1).
  - Meta info: Nama Toko/Penjual (link ke profil), Bintang ulasan & jumlah review, jumlah komentar, jumlah wishlist, jumlah viewer.
  - Blok Harga: Harga diskon (hijau besar), harga asli dicoret, badge persentase diskon.
  - Quick Contacts: Tombol Chat WhatsApp dengan teks otomatis, Tombol "Ask Question" (Modal pesan).
  - Status Ketersediaan: "In Stock" / "Out of Stock" dan SKU produk.
  - Selector Varian: Pilihan warna (swatch warna) atau ukuran (S, M, L, XL) yang memperbarui SKU, harga, dan ketersediaan stok secara reaktif.
  - Quantity Spinner: Tombol minus (`-`), input kuantitas, tombol plus (`+`) dengan batas minimum 1 dan maksimum stok.
  - Tombol Tindakan: "Add to Cart" (dengan ikon keranjang) dan "Add to Wishlist".
  - Informasi Pengiriman & Estimasi: "Ready to ship in 1 Business Day", Estimasi tanggal tiba, tombol ganti lokasi.
  - Social Share Buttons: Facebook, Twitter/X, WhatsApp, Pinterest, LinkedIn, Telegram.
- **Tabs Konten di Bawah:**
  - Tab 1: Description (Konten teks kaya, spesifikasi).
  - Tab 2: Product Details / Attributes (Brand, kondisi, material, berat, dimensi).
  - Tab 3: Shipping & Location.
  - Tab 4: Reviews & Ratings (Ringkasan rata-rata bintang, progress bar review 1-5 bintang, daftar review pembeli asli, dan formulir rating/ulasan).
  - Tab 5: Comments / Diskusi Produk.
- **Rekomendasi:** "Other Products from this Seller" dan "Related Products".

### D. Halaman Katalog & Filter (`/products` & `/category/[slug]`)
- **Filter Sidebar:**
  - Kategori & Subkategori filter.
  - Brand filter dengan pencarian brand instan dan checkbox.
  - Price Range filter: Input Min dan Max dengan tombol apply.
  - Keyword Search filter.
- **Toolbar Atas:**
  - Sorting dropdown: "Most Recent", "Lowest Price", "Highest Price", "Highest Rating".
  - Reset filters badge tag.
  - Toggle filter untuk tampilan mobile.
- **Grid Produk:**
  - Layout responsive (4 kolom desktop, 3 kolom tablet, 2 kolom mobile).
  - State kosong jika tidak ada produk yang cocok dengan filter.
  - Pagination numerik yang terhubung ke query string URL.

### E. Halaman Daftar Toko (`/shops`) & Profil Penjual (`/profile/[slug]`)
- **Daftar Toko (`/shops`):**
  - Filter toko dan search bar seller.
  - Kartu Toko: Avatar seller, Nama Toko, Badge terverifikasi, Jumlah produk aktif, Tombol Follow.
- **Profil Penjual / Toko (`/profile/[slug]`):**
  - Cover Banner toko lebar (1920x400px).
  - Card profil: Avatar, Nama toko, badge verified, status "Last seen", rating bintang & total penjualan, bio deskripsi, nomor telepon (dengan tombol "Show"), alamat email, tombol "Ask Question" & "Follow".
  - Tab Toko: *Products* (daftar produk toko), *Followers*, *Following*, *Reviews*.

### F. Keranjang Belanja (`/cart`) & Checkout (`/checkout`)
- **Halaman Cart:**
  - Tabel produk: thumbnail, judul produk, varian yang dipilih, harga satuan, quantity spinner interaktif, subtotal baris, dan tombol hapus item.
  - Kolom Ringkasan Pesanan (Order Summary): Subtotal, Diskon Kupon, Estimasi Ongkir, Total Akhir, Input Kupon Diskon dengan validasi.
  - Tombol CTA "Proceed to Checkout".
  - Empty Cart State yang elegan dengan tombol "Shop Now".
- **Halaman Checkout:**
  - Step 1: Informasi Alamat Pengiriman (Pilih alamat tersimpan atau input alamat baru: Nama lengkap, No telepon, Alamat lengkap, Negara, Provinsi, Kota, Kode Pos).
  - Step 2: Opsi Pembayaran (Simulasi kartu kredit/debit sandbox, Bank Transfer, Cash on Delivery / Bayar di Tempat).
  - Step 3: Verifikasi Pesanan & Konfirmasi atomic di server (mengurangi stok secara aman, mencatat order, order items, dan riwayat transaksi).

### G. Customer Account (`/account/*`)
- **Dashboard Profil:** Edit profil, ganti foto avatar, ganti kata sandi.
- **Riwayat Pesanan (`/account/orders`):** Daftar pesanan dengan kode invoice, status pesanan (Pending, Processing, Shipped, Completed, Cancelled), total harga, tanggal, dan halaman detail pesanan lengkap.
- **Buku Alamat (`/account/addresses`):** Tambah, ubah, dan hapus alamat pengiriman.
- **Wishlist (`/wishlist`):** Daftar produk favorit yang disimpan dengan kemampuan langsung dipindahkan ke keranjang belanja atau dihapus.

### H. Multi-Vendor Seller Dashboard (`/seller/*`)
- **Ringkasan Toko (`/seller/dashboard`):** Metrik penjualan riil (Total Revenue, Pesanan Masuk, Produk Aktif, Saldo Toko).
- **Manajemen Produk (`/seller/products`):**
  - Tambah Produk Baru (`/seller/products/new`): Judul, Kategori/Subkategori, Deskripsi, Harga Normal, Harga Diskon, Stok, SKU, Atribut/Varian (Ukuran/Warna), Multi-image upload, Opsi tipe produk (Fisik atau Digital File).
  - Edit & Hapus Produk.
- **Manajemen Pesanan (`/seller/orders`):** Daftar pesanan yang memuat produk milik toko tersebut dengan kontrol update status pemrosesan.
- **Pengaturan Toko (`/seller/store-settings`):** Ubah nama toko, bio, nomor telepon, alamat, upload avatar toko dan banner cover.

### I. Administrator Dashboard (`/admin/*`)
- **Overview Dashboard:** Total Pengguna, Total Penjual, Total Transaksi, Pendapatan Platform, Moderasi Menunggu.
- **Manajemen Pengguna & Role:** Daftar akun terdaftar, toggle role (Customer, Seller, Admin).
- **Moderasi Produk:** Menyetujui produk seller baru, mengaktifkan/menonaktifkan listing, menetapkan status "Featured" atau "Special Offer".
- **Manajemen Kategori:** Tambah, edit, dan hapus kategori induk serta subkategori beserta icon/gambar.
- **Manajemen Pesanan Platform:** Memantau semua transaksi masuk dan status pembayaran.
- **Manajemen Blog:** Tambah, edit, publish artikel edukatif & inspirasi belanja.
- **Site Settings:** Nama situs, mata uang default, email kontak, banner homepage.

### J. Blog, Informasi, & Support
- **Blog (`/blog` & `/blog/[slug]`):** Grid artikel, filter kategori blog, halaman detail artikel dengan Rich Content, breadcrumbs, tags, dan artikel terkait.
- **Halaman Statis/Informasi:** `/about-us`, `/help-center`, `/terms-conditions`, `/privacy-policy`.
- **Halaman Kontak (`/contact`):** Form kirim pesan interaktif, detail kontak (telepon, email, alamat kantor), dan embed peta lokasi.

---

## 3. CHECKLIST KEBUTUHAN TEKNIS & INTEGRASI

- [x] Next.js 14/15 App Router dengan TypeScript Strict.
- [x] Tailwind CSS dikonfigurasi dengan tema warna `#00a99d` dan desain token Modesy.
- [x] Database PostgreSQL Supabase dengan schema lengkap: profiles, stores, categories, products, product_images, product_variants, carts, cart_items, wishlists, orders, order_items, reviews, blog_posts, site_settings, contact_messages.
- [x] Row Level Security (RLS) diaktifkan untuk semua tabel dengan policy ketat (Public read, Owner CRUD, Seller isolation, Admin bypass).
- [x] Server-side calculations untuk kalkulasi harga belanja, kupon diskon, dan proteksi dari manipulasi client.
- [x] Supabase Auth dengan penanganan cookie session (Server Actions & Route Handlers).
- [x] Error handling yang rapi, empty states, skeleton loading, dan Zod validation di semua input.
