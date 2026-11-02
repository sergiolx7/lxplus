// Small header guard: never trust the extension or declared MIME of an uploaded GIF.
export function isGifSignature(value){
 const bytes=value instanceof Uint8Array?value:new Uint8Array(value||[]);
 return bytes.length>=6&&bytes[0]===71&&bytes[1]===73&&bytes[2]===70&&bytes[3]===56&&
   (bytes[4]===55||bytes[4]===57)&&bytes[5]===97;
}
