/* LX Plus — Player Audio V11 compatibility shim
   V11's same-source bridge could not convert unsupported codecs.
   Load the real V12 AAC companion runtime and keep the old global as an alias for Watch Together.
*/
(()=>{'use strict';
  function alias(){if(window.LXPlayerAudioV12){window.LXPlayerAudioV11=window.LXPlayerAudioV12;return true}return false}
  if(alias())return;
  if(!document.getElementById('lxPlayerAudioV12Script')){
    const s=document.createElement('script');s.id='lxPlayerAudioV12Script';s.src='lxplus.player-audio-v12.js?v=UI27';s.async=true;s.onload=alias;s.onerror=()=>console.warn('LX Player Audio V12 unavailable');document.body.appendChild(s);
  }
  const t=setInterval(()=>{if(alias())clearInterval(t)},250);setTimeout(()=>clearInterval(t),15000);
})();
