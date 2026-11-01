export async function inspectCoverFile(file){
 if(!file||!file.size)return null;
 if(file.size>5*1024*1024)throw Error('A capa precisa ter no máximo 5 MB.');
 const bytes=new Uint8Array(await file.slice(0,20).arrayBuffer());
 const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 const mime=jpg?'image/jpeg':png?'image/png':webp?'image/webp':null;
 if(!mime)throw Error('Escolha uma imagem JPG, PNG ou WEBP real. SVG não é permitido.');
 if(file.type&&file.type!==mime&&!(mime==='image/jpeg'&&file.type==='image/jpg'))throw Error('O formato da capa não corresponde ao conteúdo do arquivo.');
 return {mime,extension:jpg?'jpg':png?'png':'webp'};
}
