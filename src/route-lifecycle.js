// A late module must never revive a route after timeout or navigation.
export async function mountRoute(start,{isCurrent=()=>true,timeoutMs=25000,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let expired=false,timer,disposed=false;
 const discard=controller=>{if(!disposed&&controller){disposed=true;controller.destroy?.()}};
 const mounted=Promise.resolve().then(start).then(controller=>{if(expired||!isCurrent()){discard(controller);return null}return controller});
 const timeout=new Promise((_,reject)=>{timer=setTimer(()=>{expired=true;reject(Error('Esta seção demorou para responder. Verifique a conexão e tente novamente.'))},timeoutMs)});
 try{return await Promise.race([mounted,timeout])}catch(error){expired=true;throw error}finally{clearTimer(timer)}
}
