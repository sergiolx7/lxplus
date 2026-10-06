/* Keep auth tokens durable when the rebuildable catalog fills browser storage. */
(()=>{
 const LX=window.LX;
 LX.authSessionStorage={
  getItem:key=>localStorage.getItem(key),
  removeItem:key=>localStorage.removeItem(key),
  setItem(key,value){
   try{localStorage.setItem(key,value)}catch(error){
    if(error?.name!=='QuotaExceededError'&&![22,1014].includes(error?.code))throw error;
    LX.store.releaseCatalogCache();
    localStorage.setItem(key,value);
   }
  }
 };
})();
