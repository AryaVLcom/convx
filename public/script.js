// Convx Music — Interactive Link Resolver & Mockup Controls

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const shareInput = document.getElementById('share-input');
  const btnResolve = document.getElementById('btn-resolve');
  const sampleTags = document.querySelectorAll('.sample-tag');
  const resolvedImg = document.getElementById('resolved-img');
  const resolvedTitle = document.getElementById('resolved-title');
  const resolvedAuthor = document.getElementById('resolved-author');
  const btnOpenConvx = document.getElementById('btn-open-convx');
  const btnWebStream = document.getElementById('btn-web-stream');
  const btnCopyLink = document.getElementById('btn-copy-link');
  const copyText = document.getElementById('copy-text');

  // Hero Mockup Controls
  const btnMockPlay = document.getElementById('btn-mock-play');
  const visualizer = document.getElementById('audio-visualizer');
  let isPlaying = true;

  btnMockPlay?.addEventListener('click', () => {
    isPlaying = !isPlaying;
    if (isPlaying) {
      btnMockPlay.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
      visualizer?.classList.remove('paused');
    } else {
      btnMockPlay.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      visualizer?.classList.add('paused');
    }
  });

  // Sample Tag Clicks
  sampleTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const link = tag.getAttribute('data-link');
      if (link && shareInput) {
        shareInput.value = link;
        resolveUrl(link);
      }
    });
  });

  // Resolve Button Click
  btnResolve?.addEventListener('click', () => {
    const rawUrl = shareInput?.value?.trim();
    if (rawUrl) {
      resolveUrl(rawUrl);
    }
  });

  // Enter key in input
  shareInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnResolve?.click();
    }
  });

  // Copy Share Link
  btnCopyLink?.addEventListener('click', () => {
    const textToCopy = shareInput?.value || window.location.href;
    navigator.clipboard.writeText(textToCopy).then(() => {
      if (copyText) {
        copyText.textContent = 'Copied!';
        setTimeout(() => {
          copyText.textContent = 'Copy Share Link';
        }, 2000);
      }
    }).catch(() => {
      alert('Copied to clipboard: ' + textToCopy);
    });
  });

  // Function: Parse URL and Extract IDs
  function parseMusicUrl(raw) {
    let url;
    try {
      url = new URL(raw.startsWith('http') ? raw : 'https://' + raw);
    } catch (e) {
      return null;
    }

    const host = url.hostname.toLowerCase();
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    let videoId = searchParams.get('v');
    let playlistId = searchParams.get('list');
    let channelId = null;

    // Path regexes
    if (!videoId) {
      const vMatch = pathname.match(/^\/(?:watch|song|v)\/([a-zA-Z0-9_-]{11})/);
      if (vMatch) videoId = vMatch[1];
      else if (host === 'youtu.be') {
        const seg = pathname.split('/').filter(Boolean)[0];
        if (seg && seg.length === 11) videoId = seg;
      }
    }

    if (!playlistId) {
      const pMatch = pathname.match(/^\/playlist\/([a-zA-Z0-9_-]+)/);
      if (pMatch) playlistId = pMatch[1];
    }

    const cMatch = pathname.match(/^\/(?:channel|artist)\/([a-zA-Z0-9_-]+)/);
    if (cMatch) channelId = cMatch[1];

    return { videoId, playlistId, channelId };
  }

  // Resolve URL and update preview UI
  async function resolveUrl(inputUrl) {
    const parsed = parseMusicUrl(inputUrl);
    if (!parsed) {
      alert('Please enter a valid music URL');
      return;
    }

    if (parsed.videoId) {
      const vid = parsed.videoId;
      resolvedImg.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
      resolvedTitle.textContent = 'Resolving song details...';
      resolvedAuthor.textContent = 'Convx Music Stream';

      // Update deep links
      const convxIntent = `intent://convx.aryavl.com/watch?v=${vid}#Intent;scheme=https;package=com.convx.music;end`;
      btnOpenConvx.href = convxIntent;
      btnWebStream.href = `https://music.youtube.com/watch?v=${vid}`;

      try {
        const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`);
        if (res.ok) {
          const data = await res.json();
          resolvedTitle.textContent = data.title || `Track (${vid})`;
          resolvedAuthor.textContent = `${data.author_name} • Convx Music Stream`;
        } else {
          resolvedTitle.textContent = `Track ID: ${vid}`;
        }
      } catch (err) {
        resolvedTitle.textContent = `Track ID: ${vid}`;
      }
    } else if (parsed.playlistId) {
      const pid = parsed.playlistId;
      resolvedImg.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80';
      resolvedTitle.textContent = `Playlist (${pid})`;
      resolvedAuthor.textContent = 'YouTube Music / Convx Playlist';
      btnOpenConvx.href = `intent://convx.aryavl.com/playlist?list=${pid}#Intent;scheme=https;package=com.convx.music;end`;
      btnWebStream.href = `https://music.youtube.com/playlist?list=${pid}`;
    } else if (parsed.channelId) {
      const cid = parsed.channelId;
      resolvedImg.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80';
      resolvedTitle.textContent = `Artist Channel (${cid})`;
      resolvedAuthor.textContent = 'Convx Artist Profile';
      btnOpenConvx.href = `intent://convx.aryavl.com/channel/${cid}#Intent;scheme=https;package=com.convx.music;end`;
      btnWebStream.href = `https://music.youtube.com/channel/${cid}`;
    }
  }

  // Initial resolve for default sample
  if (shareInput?.value) {
    resolveUrl(shareInput.value);
  }
});
