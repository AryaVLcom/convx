/**
 * Convx Web & Dynamic Share Link Resolver
 * Runs on Cloudflare Workers / Edge at convx.aryavl.com
 * Handles Open Graph image preview generation for WhatsApp, Discord, Telegram,
 * Android App Links (/.well-known/assetlinks.json), and deep redirects.
 */

const ANDROID_PACKAGE_NAME = "com.convx.music";

// Android App Link Verification JSON
const ASSET_LINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: ANDROID_PACKAGE_NAME,
      sha256_cert_fingerprints: [
        "B8:4C:E6:E5:8E:9F:8B:2A:4D:1C:3E:5F:7A:9B:0C:2D:4E:6F:8A:1B:3C:5D:7E:9F:0A:2B:4C:6D:8E:0F"
      ]
    }
  }
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // 1. Android App Links verification route
    if (pathname === "/.well-known/assetlinks.json") {
      return new Response(JSON.stringify(ASSET_LINKS, null, 2), {
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400"
        }
      });
    }

    // 2. Extract shared media IDs
    let videoId = searchParams.get("v");
    let playlistId = searchParams.get("list");
    let artistId = null;

    if (!videoId) {
      const vMatch = pathname.match(/^\/(?:watch|song|v)\/([a-zA-Z0-9_-]{11})/);
      if (vMatch) videoId = vMatch[1];
    }

    if (!playlistId) {
      const pMatch = pathname.match(/^\/playlist\/([a-zA-Z0-9_-]+)/);
      if (pMatch) playlistId = pMatch[1];
    }

    const aMatch = pathname.match(/^\/(?:channel|artist)\/([a-zA-Z0-9_-]+)/);
    if (aMatch) artistId = aMatch[1];

    const isShareLink = videoId || playlistId || artistId;

    if (isShareLink) {
      return handleShareLink(request, url, videoId, playlistId, artistId);
    }

    // Fallback static page
    return handleStaticPage(request, url);
  }
};

/**
 * Handles shared music links (/watch, /playlist, /channel)
 * Generates dynamic Open Graph tags and clean liquid glass card
 */
async function handleShareLink(request, url, videoId, playlistId, artistId) {
  let title = "Shared Track";
  let artist = "Convx Music";
  let description = "Stream ad-free on Convx with synchronized lyrics. Powered by ARYAVL.COM";
  let image = "https://raw.githubusercontent.com/cosmictaserdev-creator/Convx/main/assets/convx-banner.png";
  let deepLink = `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=${ANDROID_PACKAGE_NAME};end`;
  let downloadUrl = "https://github.com/cosmictaserdev-creator/Convx/releases/latest";

  if (videoId) {
    image = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { headers: { "User-Agent": "ConvxResolver/2.0" } }
      );
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        title = oembed.title || `Track (${videoId})`;
        artist = oembed.author_name || "Convx Music";
        description = `${artist} • Listen ad-free on Convx. Powered by ARYAVL.COM`;
      }
    } catch (e) {
      // Fallback
    }
  } else if (playlistId) {
    title = "Shared Playlist";
    artist = `Playlist (${playlistId})`;
    image = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85";
  } else if (artistId) {
    title = "Artist Channel";
    artist = `Artist (${artistId})`;
    image = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=85";
  }

  const safeTitle = escapeHtml(title);
  const safeArtist = escapeHtml(artist);
  const safeDesc = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(url.href);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} — Convx Music</title>
  <meta name="description" content="${safeDesc}">
  
  <!-- Open Graph / WhatsApp / Discord / Telegram -->
  <meta property="og:type" content="music.song">
  <meta property="og:site_name" content="Convx Music">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:width" content="1280">
  <meta property="og:image:height" content="720">
  <meta property="og:url" content="${safeUrl}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">
  
  <meta name="theme-color" content="#0d0c0a">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,300&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background:#0d0c0a;
      color:#f5eee6;
      font-family:'Plus Jakarta Sans', sans-serif;
      min-height:100vh;
      display:flex;
      flex-direction:column;
      justify-content:space-between;
      align-items:center;
      padding:32px 20px 24px;
      position:relative;
      overflow-x:hidden;
    }
    .bg-shape {
      position:fixed;
      border-radius:50%;
      filter:blur(90px);
      pointer-events:none;
      z-index:0;
      opacity:0.6;
    }
    .shape-1 {
      width:600px;
      height:600px;
      background:radial-gradient(circle, #d97724 0%, rgba(180,83,9,0.5) 45%, transparent 75%);
      top:-100px;
      left:10%;
    }
    .shape-2 {
      width:550px;
      height:550px;
      background:radial-gradient(circle, #293d22 0%, #132415 50%, transparent 75%);
      bottom:-80px;
      right:15%;
    }
    .top-bar { position:relative; z-index:10; margin-bottom:24px; }
    .brand-capsule {
      display:inline-flex;
      align-items:center;
      gap:10px;
      padding:8px 20px;
      border-radius:999px;
      background:rgba(255,255,255,0.04);
      backdrop-filter:blur(14px);
      border:1px solid rgba(255,255,255,0.08);
      font-family:'Space Mono', monospace;
      font-size:0.85rem;
      letter-spacing:0.08em;
      text-transform:uppercase;
      color:#f5eee6;
      text-decoration:none;
    }
    .brand-capsule span {
      width:8px;
      height:8px;
      border-radius:50%;
      background:#d97724;
      box-shadow:0 0 10px #d97724;
      display:inline-block;
    }
    .card-wrap {
      position:relative;
      z-index:10;
      width:100%;
      max-width:520px;
      margin:auto 0;
    }
    .card {
      background:linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 40%, rgba(15,13,10,0.4) 100%);
      backdrop-filter:blur(28px) saturate(190%);
      -webkit-backdrop-filter:blur(28px) saturate(190%);
      border:1px solid rgba(255,250,240,0.22);
      border-radius:32px;
      padding:clamp(24px, 5vw, 36px);
      text-align:center;
      box-shadow:0 32px 70px -15px rgba(0,0,0,0.8);
    }
    .art-wrap {
      width:100%;
      aspect-ratio:16/9;
      border-radius:20px;
      overflow:hidden;
      background:#000;
      margin-bottom:24px;
      box-shadow:0 20px 40px rgba(0,0,0,0.65);
    }
    .art-wrap img { width:100%; height:100%; object-fit:cover; display:block; }
    h1 {
      font-family:'Fraunces', serif;
      font-size:clamp(1.45rem, 3.2vw, 1.95rem);
      font-weight:500;
      line-height:1.22;
      color:#fff;
      margin-bottom:8px;
      word-break:break-word;
    }
    .artist {
      font-size:1.05rem;
      color:#9e968c;
      margin-bottom:28px;
    }
    .btns { display:flex; flex-direction:column; gap:12px; }
    .btn {
      display:flex;
      align-items:center;
      justify-content:center;
      gap:10px;
      padding:16px 24px;
      font-size:1rem;
      font-weight:600;
      text-decoration:none;
      border-radius:999px;
      transition:all 0.3s ease;
    }
    .btn-primary {
      background:linear-gradient(135deg, rgba(217,119,36,0.75) 0%, rgba(217,119,36,0.35) 100%);
      border:1px solid rgba(255,220,180,0.45);
      color:#fff;
      box-shadow:0 12px 28px -6px rgba(217,119,36,0.35);
    }
    .btn-primary:hover { transform:translateY(-2px); box-shadow:0 16px 36px -4px rgba(217,119,36,0.45); }
    .btn-secondary {
      background:rgba(255,255,255,0.07);
      border:1px solid rgba(255,255,255,0.14);
      color:#f5eee6;
    }
    .btn-secondary:hover { background:rgba(255,255,255,0.14); transform:translateY(-2px); }
    footer {
      position:relative;
      z-index:10;
      width:100%;
      max-width:600px;
      text-align:center;
      margin-top:36px;
      padding-top:20px;
      border-top:1px solid rgba(255,255,255,0.08);
      display:flex;
      flex-direction:column;
      gap:8px;
    }
    .footer-desc { font-size:0.84rem; color:#9e968c; line-height:1.5; }
    .footer-meta {
      display:flex;
      justify-content:center;
      align-items:center;
      gap:14px;
      flex-wrap:wrap;
      font-family:'Space Mono', monospace;
      font-size:0.78rem;
      color:#645f56;
      margin-top:4px;
    }
    .footer-meta a { color:#9e968c; text-decoration:none; }
    .footer-meta a:hover { color:#fff; }
    .powered-by { color:#d97724; font-weight:700; letter-spacing:0.06em; text-decoration:none; }
    .powered-by:hover { text-decoration:underline; }
  </style>
</head>
<body>
  <div class="bg-shape shape-1"></div>
  <div class="bg-shape shape-2"></div>

  <header class="top-bar">
    <a href="/" class="brand-capsule">
      <span></span> CONVX MUSIC
    </a>
  </header>

  <main class="card-wrap">
    <div class="card">
      <div class="art-wrap">
        <img src="${safeImage}" alt="Cover Art">
      </div>
      <h1>${safeTitle}</h1>
      <p class="artist">${safeArtist}</p>
      
      <div class="btns">
        <a href="${escapeHtml(deepLink)}" class="btn btn-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Open in Convx
        </a>
        <a href="${escapeHtml(downloadUrl)}" class="btn btn-secondary" target="_blank" rel="noopener">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download Convx
        </a>
      </div>
    </div>
  </main>

  <footer>
    <p class="footer-desc">
      Convx is an ad-free, open-source music player featuring synchronized lyrics, gapless playback, and high-fidelity audio streams.
    </p>
    <div class="footer-meta">
      <span>HOSTED AT: <a href="https://convx.aryavl.com">convx.aryavl.com</a></span>
      <span>•</span>
      <span><a href="https://github.com/cosmictaserdev-creator/Convx" target="_blank" rel="noopener">SOURCE (GPL-3.0)</a></span>
      <span>•</span>
      <span>POWERED BY <a href="https://aryavl.com" target="_blank" rel="noopener" class="powered-by">ARYAVL.COM</a></span>
    </div>
  </footer>
</body>
</html>`;

  return new Response(html, {
    headers: { 
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}

/**
 * Serves static landing page or files
 */
async function handleStaticPage(request, url) {
  return fetch(request);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
