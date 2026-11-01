import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderStudioEditor,applyStudioContentType,studioContentTypes} from '../src/studio-content-form.js';
import {parseStudioLinks,matchingAlbums} from '../src/studio-link-import.js';
import {inspectCoverFile} from '../src/studio-cover.js';
import {canonicalProvider,providerMetadata,handleMetadata} from '../supabase/functions/lx-content-metadata/handler.mjs';

test('admin editor includes music, movies, series, doramas, books and live; category hides unrelated fields',()=>{
 const html=renderStudioEditor({type:'Música',title:'Meu MP3',album:'Disco Um',artist:'Cantora Um'});
 for(const name of studioContentTypes)assert.ok(html.includes('<option value="'+name+'"'),'type '+name);
 for(const selector of ['name="audioFile"','name="coverFile"','name="album"','name="artist"','name="episodes"','name="author"','name="sourceUrl"','name="bannerDesktop"'])assert.ok(html.includes(selector),selector);
 const sections=[{dataset:{editorTypes:'Música'},hidden:false,querySelectorAll:()=>[{disabled:false}]},{dataset:{editorTypes:'Série,Dorama,Anime'},hidden:false,querySelectorAll:()=>[{disabled:false}]}];
 const element={elements:{type:{value:'Música'}},querySelectorAll:()=>sections,querySelector:()=>null};
 assert.equal(applyStudioContentType(element),'Música');assert.equal(sections[0].hidden,false);assert.equal(sections[1].hidden,true);
 element.elements.type.value='Dorama';applyStudioContentType(element);assert.equal(sections[0].hidden,true);assert.equal(sections[1].hidden,false);
 assert.ok(html.includes('Disco Um'));assert.ok(html.includes('Meu MP3'));
});
test('bulk import never guesses missing song, artist, or album; only provider metadata creates a titled draft',()=>{
 const spotify='https://open.spotify.com/track/0123456789abcdefghijkl';
 const youtube='https://youtu.be/abcdefghijk';
 const records=parseStudioLinks([spotify,youtube].join('\n'),{type:'Música',metadata:[{url:spotify,provider:'Spotify',title:'Faixa oficial',cover:'https://i.scdn.co/image/photo123'},{url:youtube,provider:'YouTube',title:'Vídeo oficial',cover:'https://i.ytimg.com/vi/abcdefghijk/default.jpg'}]});
 assert.equal(records.length,2);assert.equal(records[0].item.title,'Faixa oficial');assert.equal(records[0].item.album,'');assert.equal(records[0].item.artist,'');assert.equal(records[0].valid,true);assert.equal(records[0].needsReview,true);assert.equal(records[0].item.published,false);
 assert.equal(records[1].item.title,'Vídeo oficial');assert.equal(records[1].item.artist,'');
 assert.equal(parseStudioLinks(youtube,{metadata:[]})[0].valid,false);
 assert.equal(parseStudioLinks(spotify+'\n'+spotify,{metadata:[]})[1].errors.some(x=>x.includes('duplicado')),true);
 assert.equal(parseStudioLinks('https://open.spotify.com/album/0123456789abcdefghijkl',{metadata:[]})[0].valid,false);
});
test('album suggestions only come from matching artist and never cross artists',()=>{
 const items=[{type:'Música',artist:'Cantora Um',album:'Ao Vivo'},{type:'Música',artist:'Outro',album:'Ao Vivo'},{type:'Música',artist:'cantora um',album:'Disco Um'},{type:'Música',artist:'Cantora Um',album:'Ao Vivo'}];
 assert.deepEqual(matchingAlbums(items,'Cantora Um'),['Ao Vivo','Disco Um']);
 assert.deepEqual(matchingAlbums(items,'Desconhecido'),[]);
});
test('cover upload validates bytes, disallows SVG and oversized images',async()=>{
 const jpeg=new Blob([new Uint8Array([255,216,255,0,0,0])],{type:'image/jpeg'});
 assert.deepEqual(await inspectCoverFile(jpeg),{mime:'image/jpeg',extension:'jpg'});
 const svg=new Blob(['<svg onload="alert(1)"/>'],{type:'image/svg+xml'});
 await assert.rejects(inspectCoverFile(svg),/JPG, PNG ou WEBP/);
 const fake=new Blob([new Uint8Array([137,80,78,71,0])],{type:'image/jpeg'});
 await assert.rejects(inspectCoverFile(fake),/não corresponde/);
});
test('oEmbed metadata uses only provider-controlled endpoints, no arbitrary HTTP proxy',async()=>{
 assert.equal(canonicalProvider('https://evil.example.org/?u=https://open.spotify.com/track/0123456789abcdefghijkl'),null);
 assert.equal(canonicalProvider('https://open.spotify.com/playlist/0123456789abcdefghijkl'),null);
 const canonical=canonicalProvider('https://youtu.be/abcdefghijk');
 assert.equal(canonical.url,'https://www.youtube.com/watch?v=abcdefghijk');
 const metadata=await providerMetadata('https://youtu.be/abcdefghijk',{fetcher:async(url)=>{
  assert.ok(url.startsWith('https://www.youtube.com/oembed?'));
  return new Response(JSON.stringify({title:'Título real',author_name:'Canal do vídeo',thumbnail_url:'https://i.ytimg.com/vi/abcdefghijk/0.jpg'}),{status:200});
 }});
 assert.equal(metadata.title,'Título real');assert.equal(metadata.cover,'https://i.ytimg.com/vi/abcdefghijk/0.jpg');assert.equal(metadata.artist,undefined);
});
test('metadata edge requires server-verified admin role before provider fetch',async()=>{
 let providerCalls=0,role='none';
 const fetcher=async url=>{
  if(url.endsWith('/rest/v1/rpc/lx_admin_role'))return new Response(JSON.stringify(role),{status:200});
  providerCalls++;return new Response(JSON.stringify({title:'A real track',thumbnail_url:'https://i.scdn.co/image/real'}),{status:200});
 };
 const env=name=>({SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public-test-key'})[name];
 const request=()=>new Request('https://service.test',{method:'POST',headers:{authorization:'Bearer user-jwt','content-type':'application/json'},body:JSON.stringify({urls:['https://open.spotify.com/track/0123456789abcdefghijkl']})});
 assert.equal((await handleMetadata(request(),{env,fetcher})).status,403);assert.equal(providerCalls,0);
 role='editor';const res=await handleMetadata(request(),{env,fetcher});assert.equal(res.status,200);const body=await res.json();assert.equal(body.items[0].title,'A real track');assert.equal(body.items[0].status,'identified');assert.equal(providerCalls,1);
});
test('admin CSS keeps conditional sections truly hidden and responsive',()=>{
 const css=readFileSync(new URL('../assets/studio-smart.css',import.meta.url),'utf8'),studio=readFileSync(new URL('../src/modules/studio.js',import.meta.url),'utf8');
 assert.match(css,/\[data-editor-types\]\[hidden\]/);assert.match(css,/@media\(max-width:650px\)/);
 assert.match(studio,/renderStudioEditor\(item\)/);assert.match(studio,/inspectCoverFile\(coverFile\)/);assert.match(studio,/parseStudioLinks\(text,/);
});
