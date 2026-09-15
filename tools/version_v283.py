from pathlib import Path
import json,re
base=Path('dist');p=base/'index.html';s=p.read_text();s=s.replace('27.2','28.3').replace('assets/lxplus-logo-v27.png?v=27.0','assets/lxplus-logo-v27.png?v=28.3');s=s.replace('<link rel="stylesheet" href="app-v27.css?v=28.3">','<link rel="stylesheet" href="app-v27.css?v=28.3">\n  <link rel="stylesheet" href="app-v28.css?v=28.3">');s=s.replace('<script src="lxplus.js?v=28.3"></script>','<script src="lxplus-artwork.js?v=28.3"></script>\n  <script src="lxplus.js?v=28.3"></script>');a=s.index('  <script>\n  (function(){\n    var BUILD=');b=s.index('  </script>',a)+len('  </script>');s=s[:a]+'''  <script>
  (function(){
    var BUILD='28.3',KEY='lxplus_build_seen';
    try{if(localStorage.getItem(KEY)!==BUILD){localStorage.setItem(KEY,BUILD);if('caches'in window)caches.keys().then(keys=>Promise.all(keys.filter(k=>/^lxplus-/.test(k)&&k!=='lxplus-shell-v2803').map(k=>caches.delete(k)))).catch(()=>{});if('serviceWorker'in navigator)navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.update?.())).catch(()=>{})}}
    catch(error){console.warn('LX PWA build refresh',error)}
    if('serviceWorker'in navigator){navigator.serviceWorker.addEventListener('controllerchange',function(){if(sessionStorage.getItem('lxplus_sw_reload')===BUILD)return;sessionStorage.setItem('lxplus_sw_reload',BUILD);location.reload()})}
  })();
  </script>'''+s[b:];p.write_text(s)
m=base/'manifest.webmanifest';obj=json.loads(m.read_text());obj['version']='28.3';obj['start_url']='./?v=28.3';m.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
core=base/'lxplus.js';s=core.read_text().replace("window.__LX_JS_BUILD='27.0'","window.__LX_JS_BUILD='28.3'").replace("  version:'27.0'","  version:'28.3'");core.write_text(s)
css=base/'app-v28.css';s=css.read_text();s+='\n.lx-music-carousel .lx-music-feature[hidden]{display:none}\n';css.write_text(s)
