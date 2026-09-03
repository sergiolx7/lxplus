(()=>{const LX=window.LX;const PREFIX='lx16_';
const keys={accounts:'accounts',users:'users',catalog:'catalog',session:'session',history:'history',list:'list',theme:'theme',accent:'accent',notices:'notices',requests:'requests',ratings:'ratings',analytics:'analytics',publicLists:'publicLists',preferences:'preferences',subscriptions:'subscriptions',profileStyles:'profileStyles',layoutMode:'layoutMode',motion:'motion'};
const read=(k,d)=>{try{const x=JSON.parse(localStorage.getItem(PREFIX+k));return x??d}catch{return d}};const write=(k,v)=>localStorage.setItem(PREFIX+k,JSON.stringify(v));
let dbp;function db(){if(!dbp)dbp=new Promise((res,rej)=>{const r=indexedDB.open('LXPlus16Media',1);r.onupgradeneeded=()=>r.result.createObjectStore('media');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return dbp}
async function putMedia(key,blob){const d=await db();return new Promise((res,rej)=>{const tx=d.transaction('media','readwrite');tx.objectStore('media').put(blob,key);tx.oncomplete=()=>res(key);tx.onerror=()=>rej(tx.error)})}
async function getMedia(key){if(!key)return null;const d=await db();return new Promise((res,rej)=>{const r=d.transaction('media').objectStore('media').get(key);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
LX.store={keys,read,write,putMedia,getMedia,reset(){Object.values(keys).forEach(k=>localStorage.removeItem(PREFIX+k))}}})();
