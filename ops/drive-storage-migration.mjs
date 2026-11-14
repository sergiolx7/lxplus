import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export const DRIVE_OWNER='lxgroup383@gmail.com';
const buckets=new Set(['lx-assets','lx-media','lx-social']);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fingerprint=row=>JSON.stringify([row.id,row.bucket_id,row.name,row.version||null,row.etag||null,Number(row.bytes)]);
const archiveCandidate=row=>row.referenced_by_published===false&&(
 row.bucket_id==='lx-media'&&row.name.startsWith('media/')||
 row.bucket_id==='lx-assets'&&/^(automated|licensed)\//.test(row.name)
);

export function migrationInventory(input){
 const rows=Array.isArray(input)?input:input?.rows;
 if(!Array.isArray(rows))throw Error('INVALID_INVENTORY');
 const identities=new Set();
 return rows.map(row=>{
  if(!row||!buckets.has(row.bucket_id)||typeof row.name!=='string'||!row.name||row.name.startsWith('/')||row.name.split('/').some(part=>part==='..')||/[\x00-\x1f]/.test(row.name))throw Error('INVALID_OBJECT');
  if(typeof row.id!=='string'||!row.id||!Number.isSafeInteger(Number(row.bytes))||Number(row.bytes)<0||typeof row.referenced_by_published!=='boolean')throw Error('INVALID_OBJECT');
  const identity=row.bucket_id+'/'+row.name;if(identities.has(identity))throw Error('DUPLICATE_OBJECT');identities.add(identity);
  return {...row,bytes:Number(row.bytes)};
 });
}

// Both byte arrays must come from actual downloads: the original export and
// a fresh read-back of the uploaded Drive copy. A successful upload is not proof.
export function verifyDriveCopy({source,original,readback,file}){
 migrationInventory([source]);
 if(!file?.id||file.shared!==false||!Array.isArray(file.permissions)||file.permissions.length!==1)throw Error('PRIVATE_DRIVE_COPY_REQUIRED');
 const owner=file.permissions[0];
 if(owner.role!=='owner'||owner.type!=='user'||owner.emailAddress?.toLowerCase()!==DRIVE_OWNER)throw Error('DRIVE_OWNER_MISMATCH');
 if(original.byteLength!==Number(source.bytes)||readback.byteLength!==Number(source.bytes))throw Error('COPY_SIZE_MISMATCH');
 const sourceHash=hash(original),readbackHash=hash(readback);if(sourceHash!==readbackHash)throw Error('COPY_HASH_MISMATCH');
 return {source_id:source.id,source_fingerprint:fingerprint(source),source_sha256:sourceHash,drive_id:file.id,drive_owner:DRIVE_OWNER,drive_private:true,drive_sha256:readbackHash,verified_at:new Date().toISOString()};
}

export function cleanupPlan({inventory,current,receipts=[]}){
 const previous=migrationInventory(inventory),live=migrationInventory(current),now=new Map(live.map(row=>[row.id,row])),proof=new Map();
 for(const receipt of receipts){if(proof.has(receipt.source_id))throw Error('DUPLICATE_RECEIPT');proof.set(receipt.source_id,receipt)}
 const candidates=previous.filter(archiveCandidate),ready=[],pending=[];
 for(const row of candidates){
  const latest=now.get(row.id),receipt=proof.get(row.id);
  let reason='';
  if(!latest||fingerprint(latest)!==fingerprint(row))reason='SOURCE_CHANGED';
  else if(latest.referenced_by_published!==false)reason='NOW_PUBLISHED';
  else if(!receipt)reason='BACKUP_NOT_VERIFIED';
  else if(receipt.source_fingerprint!==fingerprint(row)||!/^\w[\w-]+$/.test(receipt.drive_id||'')||receipt.drive_owner!==DRIVE_OWNER||receipt.drive_private!==true||!/^[a-f0-9]{64}$/.test(receipt.source_sha256||'')||receipt.source_sha256!==receipt.drive_sha256||!Number.isFinite(Date.parse(receipt.verified_at)))reason='INVALID_BACKUP_RECEIPT';
  if(reason)pending.push({id:row.id,reason});else ready.push({id:row.id,bucket_id:row.bucket_id,name:row.name,bytes:row.bytes,drive_id:receipt.drive_id,sha256:receipt.source_sha256});
 }
 return {schemaVersion:1,status:pending.length?'waiting_for_verified_copies':'ready_for_review',totalObjects:previous.length,totalBytes:previous.reduce((n,row)=>n+row.bytes,0),candidateObjects:candidates.length,candidateBytes:candidates.reduce((n,row)=>n+row.bytes,0),ready,pending};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [inventoryFile,currentFile,receiptsFile]=process.argv.slice(2);
 if(!inventoryFile){console.error('Uso: node ops/drive-storage-migration.mjs inventario.json [inventario-atual.json] [recibos.json]');process.exitCode=1}
 else{
  const inventory=JSON.parse(readFileSync(inventoryFile,'utf8')),current=currentFile?JSON.parse(readFileSync(currentFile,'utf8')):inventory,receipts=receiptsFile?JSON.parse(readFileSync(receiptsFile,'utf8')):[];
  console.log(JSON.stringify(cleanupPlan({inventory,current,receipts}),null,2));
 }
}
