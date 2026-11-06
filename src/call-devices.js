// Watch an already-authorized microphone. Never open another input automatically.
export function watchInputDevices({devices,track,isCurrent=()=>true,onChange=()=>{},onLost=()=>{}}={}){
 let active=true;
 const change=()=>{if(active&&isCurrent())onChange()};
 const ended=()=>{if(active&&isCurrent())onLost()};
 devices?.addEventListener?.('devicechange',change);
 track?.addEventListener?.('ended',ended);
 return ()=>{active=false;devices?.removeEventListener?.('devicechange',change);track?.removeEventListener?.('ended',ended)};
}
