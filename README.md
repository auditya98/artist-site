# Artist Site (Singer + Model)

Modern, fast, and free to host. Includes a portfolio grid, upcoming release countdown, Netlify contact form, and dark/light theme.

## Quick start
- Replace placeholder text (Your Name, links, etc.) in index.html
- Add your images to assets/images:
  - hero.jpg, portrait.jpg, cover.jpg, p1.jpg ... p6.jpg, og-image.jpg
- Optional: add EPK.pdf to assets/docs
- Optional: add teaser.mp3 or hero.mp4 to assets/media
- Add icons to assets/icons:
  - favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png

## Deploy to Netlify (free)
1) Create a GitHub repo and push this folder.
2) In Netlify: New site from Git -> select the repo.
3) Build command: none; Publish directory: .
4) Deploy.
5) In Netlify -> Site settings -> Forms: verify the "contact" form exists.
6) Add email notifications if you want.

## Connect GoDaddy domain
- In Netlify -> Domains: Add custom domain (yourdomain.com)
- Choose "Set up Netlify with an external DNS"
- In GoDaddy DNS:
  - A @ -> 75.2.60.5
  - A @ -> 99.83.190.102
  - CNAME www -> your-site-name.netlify.app
- Back in Netlify: Verify, then Provision certificate (SSL)

## Edit colors
In css/main.css, change:
- --acc and --acc-2 for accent gradients

## Accessibility & performance
- Prefers-reduced-motion respected
- Preloaded hero image for fast LCP
- Basic security headers via netlify.toml
- robots.txt and sitemap.xml included (edit with your real domain)

## License
You own your content (images, text, media). The code here is MIT-licensed—use and modify freely.
