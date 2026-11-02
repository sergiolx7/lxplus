// Official third-party players remain visible. Never extract streams, conceal ads,
// overlay provider UI or fabricate unsupported audio-only/quality controls.
let youtubeLoader;
let spotifyLoader;
const apiTimeout = 12000;

function sufficientlyVisible(node) {
  if (document.visibilityState === 'hidden') return false;
  const rect = node.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const visibleWidth = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
  const visibleHeight = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
  return visibleWidth * visibleHeight / (rect.width * rect.height) > 0.5;
}

function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeLoader) return youtubeLoader;
  youtubeLoader = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    let settled = false;
    const timer = setTimeout(() => {
      if (window.YT?.Player) finish(window.YT);
      else fail(new Error('A API do YouTube não respondeu.'));
    }, apiTimeout);
    function finish(api) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(api);
    }
    function fail(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    }
    window.onYouTubeIframeAPIReady = () => {
      try { if (typeof previous === 'function') previous(); } catch {}
      if (window.YT?.Player) finish(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => fail(new Error('O script do YouTube foi bloqueado.'));
      document.head.append(script);
    }
  }).catch(error => { youtubeLoader = null; throw error; });
  return youtubeLoader;
}

function loadSpotify() {
  if (spotifyLoader) return spotifyLoader;
  spotifyLoader = new Promise((resolve, reject) => {
    const previous = window.onSpotifyIframeApiReady;
    let settled = false;
    const timer = setTimeout(() => fail(new Error('A API do Spotify não respondeu.')), apiTimeout);
    function finish(api) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(api);
    }
    function fail(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    }
    window.onSpotifyIframeApiReady = api => {
      try { if (typeof previous === 'function') previous(api); } catch {}
      finish(api);
    };
    if (!document.querySelector('script[src="https://open.spotify.com/embed/iframe-api/v1"]')) {
      const script = document.createElement('script');
      script.src = 'https://open.spotify.com/embed/iframe-api/v1';
      script.async = true;
      script.onerror = () => fail(new Error('O script do Spotify foi bloqueado.'));
      document.head.append(script);
    }
  }).catch(error => { spotifyLoader = null; throw error; });
  return spotifyLoader;
}

function plainEmbed(area, source) {
  const frame = document.createElement('iframe');
  frame.className = 'music-official-embed';
  frame.title = 'Reprodução oficial: ' + source.provider;
  frame.src = source.url;
  frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.allowFullscreen = true;
  area.append(frame);
  return { ready: false, snapshot: () => ({ ready: false }), destroy: () => frame.remove() };
}

async function youtubeEmbed(area, source, { onState, onEnd, isActive, autoStart = true }) {
  const frame = document.createElement('iframe');
  const url = new URL(source.url);
  url.searchParams.set('enablejsapi', '1');
  // IFrame API requires a matching origin to prevent accepting commands from another site.
  if (location.origin && location.origin !== 'null') url.searchParams.set('origin', location.origin);
  // Autoplay is attempted only when the official player will be substantially visible.
  if (autoStart && sufficientlyVisible(area)) url.searchParams.set('autoplay', '1');
  frame.src = url.toString();
  frame.className = 'music-official-embed';
  frame.title = 'YouTube — ' + (source.title || 'música');
  frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.allowFullscreen = true;
  area.append(frame);
  let yt;
  let interval;
  let ready = false, playing = false, muted = false, duration = 0, elapsed = 0, volume = 100;
  let destroyed = false, endedSent = false;
  const snapshot = () => ({ ready, playing, muted, duration, elapsed, volume, seekable: ready, volumeSupported: ready });
  const emit = () => { if (!destroyed && isActive()) onState(snapshot()); };
  const read = () => {
    if (!ready || destroyed || !isActive()) return;
    try {
      duration = Math.max(0, Number(yt.getDuration()) || 0);
      elapsed = Math.max(0, Number(yt.getCurrentTime()) || 0);
      volume = Math.max(0, Math.min(100, Number(yt.getVolume()) || 0));
      muted = !!yt.isMuted();
      emit();
    } catch {}
  };
  try {
    const YT = await loadYouTube();
    if (!isActive()) { frame.remove(); return null; }
    yt = new YT.Player(frame, {
      events: {
        onReady: () => {
          if (!isActive() || destroyed) return;
          ready = true;
          interval = setInterval(read, 700);
          emit();
          if (autoStart && sufficientlyVisible(area)) { try { yt.playVideo(); } catch {} }
        },
        onStateChange: event => {
          if (!isActive() || destroyed) return;
          playing = event.data === YT.PlayerState.PLAYING;
          if (playing) endedSent = false;
          read();
          if (event.data === YT.PlayerState.ENDED && !endedSent) {
            endedSent = true;
            onEnd();
          }
        },
        onError: () => emit()
      }
    });
    return {
      get ready() { return ready; },
      snapshot,
      toggle: () => { if (!ready) return; playing ? yt.pauseVideo() : yt.playVideo(); },
      seek: seconds => { if (ready) yt.seekTo(Math.max(0, seconds), true); },
      setVolume: value => { if (!ready) return; yt.unMute(); yt.setVolume(Math.max(0, Math.min(100, value))); },
      toggleMute: () => { if (ready) (muted ? yt.unMute() : yt.mute()); },
      destroy: () => {
        destroyed = true;
        clearInterval(interval);
        try { yt?.destroy(); } catch {}
        frame.remove();
      }
    };
  } catch {
    if (!isActive()) { frame.remove(); return null; }
    // API failure never removes the official, fully usable YouTube player.
    return { ready: false, snapshot: () => ({ ready: false }), destroy: () => frame.remove() };
  }
}

async function spotifyEmbed(area, source, { onState, onEnd, isActive, autoStart = true }) {
  const match = new URL(source.url).pathname.match(new RegExp('^/embed/(track|album|playlist|episode|show)/([A-Za-z0-9]{22})'));
  if (!match) return plainEmbed(area, source);
  let api;
  try { api = await loadSpotify(); } catch { return isActive() ? plainEmbed(area, source) : null; }
  if (!isActive()) return null;
  return new Promise(resolve => {
    try {
      api.createController(area, { uri: 'spotify:' + match[1] + ':' + match[2], width: '100%', height: '152', theme: 'dark' }, controller => {
        if (!isActive()) { controller.destroy(); resolve(null); return; }
        let ready = true, playing = false, elapsed = 0, duration = 0, played = false, completed = false;
        const snapshot = () => ({ ready, playing, elapsed, duration, seekable: false, volumeSupported: false });
        controller.addListener('playback_started', () => {
          if (!isActive()) return;
          playing = true; played = true; completed = false;
          onState(snapshot());
        });
        controller.addListener('playback_update', event => {
          if (!isActive()) return;
          const data = event.data || {};
          const wasPlaying = playing;
          playing = data.isPaused === false;
          elapsed = Math.max(0, (Number(data.position) || 0) / 1000);
          duration = Math.max(0, (Number(data.duration) || 0) / 1000);
          if (playing) played = true;
          onState(snapshot());
          // Spotify exposes no ended event. Only accept its terminal playback state;
          // previews and autoplay remain subject to Spotify/browser restrictions.
          if (played && wasPlaying && !playing && duration > 0 &&
              elapsed >= duration - 0.2 && !completed) {
            completed = true;
            onEnd();
          }
        });
        onState(snapshot());
        if (autoStart && sufficientlyVisible(area)) { try { controller.play(); } catch {} }
        resolve({
          get ready() { return ready; },
          snapshot,
          toggle: () => controller.togglePlay(),
          seek: () => {},
          destroy: () => { ready = false; try { controller.destroy(); } catch {} }
        });
      });
    } catch {
      resolve(isActive() ? plainEmbed(area, source) : null);
    }
  });
}

export function mountOfficialMusic(area, source, callbacks) {
  if (source?.provider === 'YouTube') return youtubeEmbed(area, source, callbacks);
  if (source?.provider === 'Spotify') return spotifyEmbed(area, source, callbacks);
  return Promise.resolve(plainEmbed(area, source));
}
