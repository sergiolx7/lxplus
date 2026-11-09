// Shared by the browser and the media endpoint. Only Drive file references qualify.
export const validDriveId=value=>typeof value==='string'&&/^[\w-]{10,256}$/.test(value);
export function driveReference(input){
 if(typeof input!=='string'||input.length>3000)return null;
 if(input.startsWith('gdrive:'))return validDriveId(input.slice(7))?{driveId:input.slice(7),resourceKey:''}:null;
 try{
  const u=new URL(input);
  if(u.protocol!=='https:'||u.username||u.password||!['drive.google.com','docs.google.com','drive.usercontent.google.com'].includes(u.hostname))return null;
  const parts=u.pathname.split('/').filter(Boolean);
  if(!['file','open','uc','preview','download'].includes(parts[0]))return null;
  const driveId=parts[0]==='file'&&parts[1]==='d'?parts[2]:u.searchParams.get('id');
  if(!validDriveId(driveId))return null;
  const key=u.searchParams.get('resourcekey')||'';
  return {driveId,resourceKey:/^[\w-]{1,256}$/.test(key)?key:''};
 }catch{return null}
}
export function driveViewUrl({driveId,resourceKey=''}){
 const url=new URL('https://drive.google.com/file/d/'+encodeURIComponent(driveId)+'/view');
 if(resourceKey)url.searchParams.set('resourcekey',resourceKey);
 return url.href;
}
