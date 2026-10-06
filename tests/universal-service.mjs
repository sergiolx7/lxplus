import assert from 'node:assert/strict';
import {createProviders} from '../supabase/functions/_shared/universal-providers.mjs';
import {createCatalogService} from '../supabase/functions/_shared/universal-service.mjs';

function database(tables={},rpcHandler=()=>({data:true,error:null})) {
  const db={calls:[],storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://files.example.com/signed.mp4'},error:null})})}};
  db.rpc=async(name,args)=>{db.calls.push({name,args});return rpcHandler(name,args);};
  db.from=table=>{
    const filters=[];let single=false,patch=null,upsert=null;
    const query={select(){return this},eq(k,v){filters.push(x=>x[k]===v);return this},in(k,v){filters.push(x=>v.includes(x[k]));return this},limit(){return this},order(){return this},update(v){patch=v;return this},upsert(v){upsert=v;return this},maybeSingle(){single=true;return this},single(){single=true;return this},then(resolve,reject){
      let rows=tables[table]||[];
      if(upsert){rows=rows.filter(x=>x.key!==upsert.key).concat(upsert);tables[table]=rows;}
      rows=rows.filter(x=>filters.every(fn=>fn(x)));
      if(patch)rows.forEach(x=>Object.assign(x,patch));
      return Promise.resolve({data:single?rows[0]||null:rows,error:null}).then(resolve,reject);
    }};return query;
  };return db;
}

let clock=0,lastMusic=-Infinity;
const metadataDb=database({},(name,args)=>{
  if(args.p_key==='provider:musicbrainz'){
    const allowed=clock-lastMusic>=1100;if(allowed)lastMusic=clock;
    return {data:allowed,error:null};
  }
  return {data:true,error:null};
});
const requests=[];
const mbId='12345678-1234-4234-8234-123456789abc';
const providerFetch=async(raw,init)=>{
  const u=new URL(raw);requests.push({url:u,headers:init.headers,at:clock});let data;
  if(u.hostname==='api.themoviedb.org'){
    assert.equal(u.searchParams.get('api_key'),'server-only-test-key');
    assert.equal(u.searchParams.get('include_adult'),'false');
    if(u.pathname.includes('/search/'))data={results:[{id:11,media_type:'movie',title:'Filme',origin_country:['BR']}],total_results:1,total_pages:1};
    else if(u.pathname.endsWith('/movie/11'))data={id:11,title:'Filme',overview:u.searchParams.get('language')==='en-US'?'English fallback':'',genres:[],videos:{results:[]}};
    else data={results:[]};
  }else if(u.hostname==='musicbrainz.org'){
    assert(init.headers['user-agent']);
    const namespace=u.pathname.split('/')[3],array={recording:'recordings',artist:'artists',release:'releases'}[namespace];
    data={count:1,[array]:[{id:mbId,title:namespace==='recording'?'Faixa':'Álbum',name:'Artista','artist-credit':[{name:'Artista',artist:{id:mbId}}]}]};
  }else if(u.pathname==='/search/authors.json')data={docs:[{key:'OL1A',name:'Autor'}],numFound:1};
  else if(u.pathname==='/search.json')data={docs:[{key:'/works/OL1W',title:'Livro',author_name:['Autor']}],numFound:1};
  else throw new Error('Unexpected provider request');
  return Response.json(data);
};
const providers=createProviders({db:metadataDb,env:n=>n==='TMDB_API_KEY'?'server-only-test-key':'',fetcher:providerFetch,now:()=>clock,pause:async ms=>{clock+=ms;}});
const all=await providers.search('Busca','all');
assert.deepEqual(new Set(all.items.map(x=>x.kind)),new Set(['movie','track','artist','album','book','author']));
const musicRequests=requests.filter(x=>x.url.hostname==='musicbrainz.org');
assert.equal(musicRequests.length,3);
for(let i=1;i<musicRequests.length;i++)assert(musicRequests[i].at-musicRequests[i-1].at>=1100);
const count=requests.length;await providers.search('Busca','all');assert.equal(requests.length,count,'Cached searches must not repeat provider requests');
const detail=await providers.detail('tmdb:movie:11');assert.equal(detail.description,'English fallback');
assert.equal(JSON.stringify(detail).includes('server-only-test-key'),false);
await providers.tmdb('/search/movie',{query:'Injected',api_key:'attacker',include_adult:true});
assert.equal(requests.at(-1).url.searchParams.get('api_key'),'server-only-test-key');
const unconfigured=createProviders({db:database(),env:()=>'',fetcher:()=>{throw new Error('Network must not be used');}});
await assert.rejects(unconfigured.tmdb('/search/movie'),e=>e.code==='TMDB_NOT_CONFIGURED');
const invalidProvider=createProviders({db:database(),env:()=> 'configured',fetcher:async()=>new Response('Private provider diagnostic',{status:401})});
await assert.rejects(invalidProvider.tmdb('/search/movie'),e=>e.code==='PROVIDER_CREDENTIALS_INVALID'&&!e.message.includes('diagnostic'));

const id='00000000-0000-4000-8000-000000000010',uid='00000000-0000-4000-8000-000000000001';
const makeSource=(sid,url,extra={})=>({id:sid,media_id:id,source_type:'direct',url,authorized:true,drm:'none',status:'unknown',region:[],...extra});
const tables={lx_media_items:[{id,title:'Filme',kind:'movie',published:true,archived:false}],lx_media_sources:[
  makeSource('unauthorized','https://files.example.com/no.mp4',{authorized:false}),
  makeSource('protected','https://files.example.com/drm.mp4',{drm:'protected'}),
  makeSource('offline','https://files.example.com/offline.mp4',{source_type:'lx'}),
  makeSource('online','https://files.example.com/stream',{source_type:'hls'}),
],lx_media_provider_links:[{media_id:id,provider:'plex',url:'https://watch.plex.tv/pt-BR/movie/example',region:[],active:true}]};
const calls=[],db=database(tables,(name,args)=>({data:name==='lx_uc_enqueue'?id:true,error:null}));
const sourceFetch=async(raw,init)=>{calls.push({raw,init});return new Response(null,{status:raw.includes('offline')?404:200,headers:{'content-type':'video/mp4'}});};
const service=createCatalogService({db,env:n=>({SUPABASE_URL:'https://project.supabase.co',LX_MEDIA_ALLOWED_HOSTS:'files.example.com'})[n]||'',resolveDns:async()=>['142.250.0.1'],fetcher:sourceFetch,providers:{status:async()=>({})}});
const resolved=await service.action({action:'resolve',media_id:id},{id:uid,admin:false});
assert.equal(resolved.status,'playable');assert.equal(resolved.source.id,'online');
assert.equal(tables.lx_media_sources[2].status,'offline');
assert.equal(calls.some(x=>/no\.mp4|drm\.mp4/.test(x.raw)),false,'Unauthorized or protected sources must never be fetched');
assert(calls.every(x=>x.init.redirect==='manual'));
const fallback=await service.resolver({media_id:id,exclude:['online']},{id:uid});assert.equal(fallback.status,'external');assert.equal(fallback.provider_links[0].provider,'plex');
tables.lx_media_items[0].legacy_id=12345;tables.lx_catalog=[{id:12345,published:true}];
assert.equal((await service.resolver({media_id:id},{id:uid})).source.id,'online','New explicit alternatives must work for legacy titles');
assert.equal((await service.resolver({media_id:id,exclude:['online']},{id:uid})).status,'legacy');
assert.equal((await service.resolver({media_id:id,exclude:['online','legacy:12345']},{id:uid})).status,'external','Failed legacy playback must not loop');
delete tables.lx_media_items[0].legacy_id;
await assert.rejects(service.action({action:'attach',media_id:id,source:{}},{id:uid,admin:false}),e=>e.code==='ADMIN_REQUIRED');
await assert.rejects(service.action({action:'attach',media_id:id,source:{authorized:true,authorization_note:'Owned media',source_type:'direct',url:'https://evil.example.com/a.mp4'}},{id:uid,admin:true}),e=>e.code==='SOURCE_HOST_NOT_ALLOWED');
await service.action({action:'enqueue',provider:'plex',references:[{provider:'tmdb',namespace:'movie',id:'11',partner_scope:'playback',partner_sources:[{url:'https://evil.example.com/a.mp4'}]}]},{id:uid,admin:true});
assert.deepEqual(db.calls.at(-1).args.p_refs,[{provider:'tmdb',namespace:'movie',id:'11'}]);assert.equal(db.calls.at(-1).args.p_provider,'mixed');

const privateService=createCatalogService({db,env:n=>({SUPABASE_URL:'https://project.supabase.co',LX_MEDIA_ALLOWED_HOSTS:'files.example.com'})[n]||'',resolveDns:async()=>['10.0.0.1'],fetcher:()=>{throw new Error('Private network must never be fetched');},providers:{}});
assert.equal((await privateService.verifySource(makeSource('private','https://files.example.com/a.mp4'))).last_error,'PRIVATE_NETWORK_BLOCKED');
const redirected=createCatalogService({db,env:n=>({SUPABASE_URL:'https://project.supabase.co',LX_MEDIA_ALLOWED_HOSTS:'files.example.com'})[n]||'',resolveDns:async()=>['142.250.0.1'],fetcher:async()=>new Response(null,{status:302,headers:{location:'http://localhost/private'}}),providers:{}});
assert.equal((await redirected.verifySource(makeSource('redirect','https://files.example.com/a.mp4'))).last_error,'REDIRECT_REQUIRES_REVIEW');
const probes=[];
const rangeService=createCatalogService({db,env:n=>({SUPABASE_URL:'https://project.supabase.co',LX_MEDIA_ALLOWED_HOSTS:'files.example.com'})[n]||'',resolveDns:async()=>['142.250.0.1'],fetcher:async(raw,init)=>{probes.push(init);return new Response(null,{status:init.method==='HEAD'?405:206,headers:{'content-type':'video/webm'}});},providers:{}});
assert.equal((await rangeService.verifySource(makeSource('range','https://files.example.com/a.webm'))).status,'online');assert.equal(probes[1].headers.range,'bytes=0-0');
console.log('PASS provider/service: all media families; MusicBrainz global rate gate; cache; pt-BR fallback; server-only credentials; sanitized API errors; approved/admin boundaries; offline failover; DRM rejection; SSRF and redirect protection; bounded Range probe; forged partner jobs rejected.');
