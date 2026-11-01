// Read metadata only from the file supplied by the administrator.
// Never guess an album cover from a filename, artist search, or unrelated track.
const limit=5*1024*1024;
const decoder=(encoding,bytes)=>{
 try{return new TextDecoder(encoding,{fatal:false}).decode(bytes).replace(/\0/g,'').replace(/[\u0001-\u001f]/g,' ').trim().slice(0,300)}
 catch{return ''}
};
const synchsafe=b=>(b[0]<<21)|(b[1]<<14)|(b[2]<<7)|b[3];
const be32=b=>(b[0]*16777216+b[1]*65536+b[2]*256+b[3]);
const plain=s=>String(s||'').trim().replace(/\s+/g,' ').slice(0,200);
function textFrame(frame){
 if(!frame?.length)return '';
 const code=frame[0],bytes=frame.subarray(1);
 if(code===0)return plain(decoder('iso-8859-1',bytes));
 if(code===3)return plain(decoder('utf-8',bytes));
 if(code===2)return plain(decoder('utf-16be',bytes));
 if(code===1){
  if(bytes[0]===0xff&&bytes[1]===0xfe)return plain(decoder('utf-16le',bytes.subarray(2)));
  if(bytes[0]===0xfe&&bytes[1]===0xff)return plain(decoder('utf-16be',bytes.subarray(2)));
  return plain(decoder('utf-16le',bytes));
 }
 return '';
}
function artFrame(frame){
 if(!frame||frame.length<20)return null;
 const encoding=frame[0];let at=1,mime='';
 const end=frame.indexOf(0,at);if(end<0)return null;
 mime=decoder('iso-8859-1',frame.subarray(at,end)).toLowerCase();at=end+1;
 if(!['image/jpeg','image/jpg','image/png'].includes(mime))return null;
 if(frame[at++]!==3)return null; // Only the explicitly tagged FRONT cover is unambiguous.
 if(encoding===1||encoding===2){
  while(at+1<frame.length&&(frame[at]!==0||frame[at+1]!==0))at+=2;
  at+=2;
 }else{
  while(at<frame.length&&frame[at]!==0)at++;
  at++;
 }
 if(at>=frame.length||frame.length-at>2*1024*1024)return null;
 const image=frame.subarray(at);
 const jpg=image[0]===0xff&&image[1]===0xd8&&image[2]===0xff;
 const png=image[0]===0x89&&image[1]===0x50&&image[2]===0x4e&&image[3]===0x47;
 if(!(jpg||png))return null;
 if(jpg&&mime==='image/png'||png&&mime!=='image/png')return null;
 mime=jpg?'image/jpeg':'image/png';
 return {blob:new Blob([image],{type:mime}),mime};
}
function unsync(bytes){
 const result=[];
 for(let i=0;i<bytes.length;i++){
  result.push(bytes[i]);
  if(bytes[i]===0xff&&bytes[i+1]===0)i++;
 }
 return new Uint8Array(result);
}
export async function readMp3Metadata(file){
 if(!file||typeof file.slice!=='function'||file.size<10)throw Error('Selecione um MP3 válido.');
 if(file.size>50*1024*1024)throw Error('O MP3 ultrapassa 50 MB.');
 const header=new Uint8Array(await file.slice(0,10).arrayBuffer());
 const output={title:'',artist:'',album:'',year:'',cover:null,origin:'Sem tags ID3'};
 if(decoder('iso-8859-1',header.subarray(0,3))==='ID3'&&[3,4].includes(header[3])){
  const version=header[3],tagSize=synchsafe(header.subarray(6,10));
  if(tagSize>0&&tagSize<=limit&&tagSize<=file.size-10){
   const tag=new Uint8Array(await file.slice(10,10+tagSize).arrayBuffer());
   let at=0;
   if(header[5]&0x40){
    if(tag.length<4)return output;
    const ext=version===4?synchsafe(tag.subarray(0,4)):be32(tag.subarray(0,4))+4;
    if(ext<4||ext>tag.length)return output;
    at=ext;
   }
   for(let count=0;at+10<=tag.length&&count<2048;count++){
    const name=decoder('iso-8859-1',tag.subarray(at,at+4));
    if(!/^[A-Z0-9]{4}$/.test(name))break;
    const length=version===4?synchsafe(tag.subarray(at+4,at+8)):be32(tag.subarray(at+4,at+8));
    const flag=tag[at+9];at+=10;
    if(!length||length>tag.length-at)break;
    let bytes=tag.subarray(at,at+length);at+=length;
    // Compressed or encrypted frames cannot be decoded safely client-side.
    if(flag&(version===4?0x0c:0xc0))continue;
    if(version===4&&flag&0x02||header[5]&0x80)bytes=unsync(bytes);
    if(name==='TIT2')output.title=textFrame(bytes);
    if(name==='TPE1')output.artist=textFrame(bytes);
    if(name==='TALB')output.album=textFrame(bytes);
    if(name==='TYER'||name==='TDRC')output.year=(textFrame(bytes).match(/^\d{4}/)||[])[0]||'';
    if(name==='APIC'&&!output.cover)output.cover=artFrame(bytes);
   }
   if(output.title||output.artist||output.album||output.cover)output.origin='ID3v2.'+version;
  }
 }
 if(output.origin==='Sem tags ID3'&&file.size>=128){
  const tail=new Uint8Array(await file.slice(file.size-128).arrayBuffer());
  if(decoder('iso-8859-1',tail.subarray(0,3))==='TAG'){
   output.title=plain(decoder('iso-8859-1',tail.subarray(3,33)));
   output.artist=plain(decoder('iso-8859-1',tail.subarray(33,63)));
   output.album=plain(decoder('iso-8859-1',tail.subarray(63,93)));
   output.year=(decoder('iso-8859-1',tail.subarray(93,97)).match(/^\d{4}/)||[])[0]||'';
   if(output.title||output.artist)output.origin='ID3v1';
  }
 }
 return output;
}
