/* ===== LX v25.50 resilient SDK loader ===== */
(()=>{
  const LX=window.LX=window.LX||{};
  let sdkPromise=null;
  function loadScript(src,timeout=7000){return new Promise((resolve,reject)=>{const s=document.createElement('script');let done=false,timer=null;const finish=(ok,e)=>{if(done)return;done=true;clearTimeout(timer);ok?resolve(true):reject(e||new Error('SCRIPT_LOAD_FAILED'))};s.src=src;s.async=true;s.crossOrigin='anonymous';s.onload=()=>finish(true);s.onerror=()=>finish(false,new Error('SCRIPT_LOAD_FAILED '+src));document.head.appendChild(s);timer=setTimeout(()=>{s.remove();finish(false,new Error('SCRIPT_TIMEOUT '+src))},timeout)})}
  LX.ensureSupabase=async function(){if(window.supabase?.createClient)return true;if(sdkPromise)return sdkPromise;sdkPromise=(async()=>{const sources=['vendor/supabase-2.117.2.js','https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js','https://unpkg.com/@supabase/supabase-js@2.117.2/dist/umd/supabase.js'];let last;for(const src of sources){try{await loadScript(src,6500);if(window.supabase?.createClient)return true}catch(e){last=e}}sdkPromise=null;throw last||new Error('Failed to load Supabase SDK')})();return sdkPromise};
  LX.ensureTus=async function(){if(window.tus?.Upload)return true;try{await loadScript('https://cdn.jsdelivr.net/npm/tus-js-client@4/dist/tus.min.js',6500);return !!window.tus?.Upload}catch{return false}};
  LX.ensureEpub=async function(){if(window.ePub)return true;try{await loadScript('https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js',6500);return !!window.ePub}catch{return false}};
  let spotifySdkPromise=null;
  LX.ensureSpotifyEmbed=async function(){if(LX.spotifyEmbed?.api)return true;if(spotifySdkPromise)return spotifySdkPromise;spotifySdkPromise=(async()=>{await loadScript('https://open.spotify.com/embed/iframe-api/v1',7000);if(LX.spotifyEmbed?.api)return true;await new Promise((resolve,reject)=>{const ok=()=>{cleanup();resolve(true)},cleanup=()=>{clearTimeout(tm);document.removeEventListener('lx:spotify-ready',ok)},tm=setTimeout(()=>{cleanup();reject(new Error('SPOTIFY_API_TIMEOUT'))},4500);document.addEventListener('lx:spotify-ready',ok,{once:true})});return true})().finally(()=>{spotifySdkPromise=null});return spotifySdkPromise};
  // PWA cache rotation is handled by service-worker.js. Do not unregister the active app worker on every load.
})();

