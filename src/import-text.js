const kinds=new Set(['Filme','Série','Dorama','Anime','Música','Livro','Ao Vivo']);
export function parseCsv(text){
 const input=String(text).replace(/^\uFEFF/,'');const first=input.split(/\r?\n/,1)[0]||'',separator=first.split(';').length>first.split(',').length?';':',';
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(quoted&&input[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===separator&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=''}else cell+=c}
 if(quoted)throw Error('CSV com aspas não fechadas.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 const headers=(rows.shift()||[]).map(x=>x.trim());if(!headers.includes('title'))throw Error('O CSV precisa da coluna title.');return rows.map(values=>Object.fromEntries(headers.map((k,i)=>[k,values[i]||''])));
}
export function parseImportText(text,{format='json',defaultType='Filme'}={}){
 if(String(text).length>4*1024*1024)throw Error('O arquivo deve ter até 4 MB. Divida importações maiores em lotes.');
 let rows;if(format==='csv')rows=parseCsv(text);else if(format==='urls')rows=String(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map((url,i)=>({type:defaultType,title:'Conteúdo para revisão '+(i+1),sourceUrl:url}));else{const parsed=JSON.parse(text);rows=Array.isArray(parsed)?parsed:parsed.items;if(!Array.isArray(rows))throw Error('Use um JSON com uma lista de conteúdos.');}
 if(rows.length>2000)throw Error('Envie até 2.000 registros por lote.');const seen=new Set();
 return rows.map((input,index)=>{
  const r=input?.payload&&typeof input.payload==='object'?input.payload:input||{},item={};
  for(const key of ['title','type','desc','description','cover','banner','bannerMobile','sourceUrl','authorizedAudioUrl','authorizedVideoUrl','artist','album','author','genre','sourceKind'])if(typeof r[key]==='string')item[key]=r[key].trim().slice(0,key==='desc'||key==='description'?2400:3000);
  if(!['auto','video','audio','hls','dash'].includes(item.sourceKind))delete item.sourceKind;
  item.type=kinds.has(item.type)?item.type:defaultType;item.title=String(item.title||'').slice(0,200);item.year=Number(r.year)||null;item.duration=Number(r.duration)||0;item.published=false;
  const errors=[];if(!item.title)errors.push('Título obrigatório');
  for(const key of ['cover','banner','bannerMobile','sourceUrl','authorizedAudioUrl','authorizedVideoUrl'])if(item[key]){try{const u=new URL(item[key]);if(u.protocol!=='https:'||u.username||u.password)throw Error()}catch{errors.push(key+': use HTTPS sem credenciais')}}
  const source=item.authorizedAudioUrl||item.authorizedVideoUrl||item.sourceUrl||'',identity=source||[item.type,item.title.toLowerCase(),item.year].join('|');
  const duplicate=seen.has(identity);seen.add(identity);if(duplicate)errors.push('Duplicado neste lote');
  return {row:index+1,item,valid:errors.length===0,errors,identity};
 });
}
