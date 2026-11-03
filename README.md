# Glow & Glam — Frontend UI Starter

This is a React + Vite UI starter based on the Glow & Glam homepage mockup.

## Included
- Responsive homepage layout
- Glow & Glam branding area
- Five-slide autoplay hero carousel (5-second interval)
- Previous/next controls and slide dots
- Category tiles
- Trending product cards
- Working local UI filters
- Demo Add to Cart and Wishlist interactions
- Instagram profile link and QR image placeholder
- Footer with developer credit
- Mobile layouts for phone, tablet and desktop

## Important: add the original assets
Create `public/assets/` and add these exact files:
- `glow-and-glam-logo.png` — the original logo supplied by the owner
- `glow-and-glam-instagram-qr.png` — the original Instagram QR code for @vidhyafashion06

The UI currently shows a text-based logo fallback and QR placeholder if these files are missing. Do not replace the supplied QR code with a newly generated one.

## Run locally (Windows PowerShell)
```powershell
npm install
npm run dev
```
Open the local URL printed by Vite.

## Build check
```powershell
npm run build
```

## Important limitations
This package is a frontend UI prototype, not a complete production e-commerce system. Cart and wishlist are in-memory UI demos. Search displays a demo notice. There is no FastAPI backend, PostgreSQL database, authentication, real checkout, payment processing, order management, or admin dashboard yet. Add these in later stages and test them before production.

Product photos currently use remote Unsplash image URLs and require internet access. Replace them with licensed or owned product images before publishing.
