import {CatalogError,parseReference,tmdbItem,tmdbCard,googleBook,openBook,openAuthor,musicItem,legacyItem,publicUrl,allowedUrl,integer,list,text} from './universal-core.mjs';

export function createProviders({db,env=(_name)=>'',fetcher=fetch,now=()=>Date.now(),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}) {
  const secrets=new Map();
  async function secret(name,legacy='') {
    const configured=env(name);if(configured)return configured;
    if(!legacy)return '';
    const cached=secrets.get(name);if(cached&&now()-cached.at<300000)return cached.value;
    const {data,error}=await db.from('lx_integrations').select('secret').eq('key',legacy).maybeSingle();
    const value=error?'':String(data?.secret||'');secrets.set(name,{at:now(),value});return value;
  }
  async function cached(key,loader,ttl=21600) {
    const {data}=await db.from('lx_media_cache').select('value,expires_at').eq('key',key).maybeSingle();
    if(data&&+new Date(data.expires_at)>now())return data.value;
    const value=await loader();
    const {error}=await db.from('lx_media_cache').upsert({key,value,expires_at:new Date(now()+ttl*1000).toISOString()});
    if(error)throw new CatalogError('CATALOG_DATABASE_NOT_READY',503);
    return value;
  }
  async function json(url,headers={}) {
    const response=await fetcher(url,{headers:{accept:'application/json',...headers},redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new CatalogError(response.status===429?'PROVIDER_RATE_LIMIT':response.status===401||response.status===403?'PROVIDER_CREDENTIALS_INVALID':'PROVIDER_UNAVAILABLE',response.status===429?429:502);
    const size=Number(response.headers.get('content-length')||0);if(size>3000000)throw new CatalogError('PROVIDER_RESPONSE_TOO_LARGE',502);
    const raw=await response.text();if(raw.length>3000000)throw new CatalogError('PROVIDER_RESPONSE_TOO_LARGE',502);
    try{return JSON.parse(raw);}catch{throw new CatalogError('PROVIDER_INVALID_JSON',502);}
  }
  async function tmdb(path,params={}) {
    if(!/^\/(?:search\/(?:movie|tv|multi)|trending\/(?:all|movie|tv)\/(?:day|week)|(?:movie|tv)\/\d+(?:\/season\/\d+)?|find\/tt\d+|discover\/(?:movie|tv))$/.test(path))throw new CatalogError('INVALID_TMDB_PATH');
    const token=await secret('TMDB_READ_ACCESS_TOKEN'),key=await secret('TMDB_API_KEY','tmdb_v3');
    if(!token&&!key)throw new CatalogError('TMDB_NOT_CONFIGURED',503);
    const allowedParams=['query','page','language','region','append_to_response','include_image_language','external_source','with_genres','with_origin_country','sort_by','primary_release_date.gte','primary_release_date.lte','vote_count.gte'];
    const clean={language:'pt-BR',include_adult:false,...Object.fromEntries(Object.entries(params).filter(([k])=>allowedParams.includes(k)).map(([k,v])=>[k,String(v).slice(0,400)]))};
    const cacheKey='tmdb:'+path+':'+new URLSearchParams(Object.entries(clean).sort()).toString();
    return cached(cacheKey,()=>{
      const u=new URL('https://api.themoviedb.org/3'+path);Object.entries(clean).forEach(([k,v])=>u.searchParams.set(k,String(v)));
      if(!token)u.searchParams.set('api_key',key);
      return json(u.href,token?{authorization:`Bearer ${token}`}:{ });
    },/search|trending|discover/.test(path)?21600:1209600);
  }
  async function mb(namespace,params={},id='') {
    return cached('mb:'+namespace+':'+id+':'+new URLSearchParams(params),async()=>{
      let allowed=false;
      for(let attempt=0;attempt<4&&!allowed;attempt++){
        const {data,error}=await db.rpc('lx_uc_gate',{p_key:'provider:musicbrainz',p_limit:1,p_window_ms:1100});
        if(error)throw new CatalogError('CATALOG_DATABASE_NOT_READY',503);
        allowed=!!data;if(!allowed&&attempt<3)await pause(1100);
      }
      if(!allowed)throw new CatalogError('PROVIDER_RATE_LIMIT',429);
      const u=new URL(`https://musicbrainz.org/ws/2/${namespace}/${id}`);u.searchParams.set('fmt','json');Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));
      return json(u.href,{'user-agent':env('LX_CATALOG_USER_AGENT')||'LXPlus/2.0 (https://github.com/sergiolx7/lxplus)'});
    },id?1209600:21600);
  }
  async function books(q,page=0,id='') {
    const key=await secret('GOOGLE_BOOKS_API_KEY','google_books_api_key');
    if(id&&!key)throw new CatalogError('GOOGLE_BOOKS_NOT_CONFIGURED',503);
    if(key){const u=new URL('https://www.googleapis.com/books/v1/volumes'+(id?'/'+encodeURIComponent(id):''));u.searchParams.set('key',key);
      if(!id){u.searchParams.set('q',q);u.searchParams.set('maxResults','20');u.searchParams.set('startIndex',String(page*20));}
      return cached('gb:'+(id||q+':'+page),async()=>{const data=await json(u.href);return id?googleBook(data):{items:list(data.items).map(googleBook),total:integer(data.totalItems)};},id?1209600:21600);}
    const u=new URL('https://openlibrary.org/search.json');u.searchParams.set('q',q);u.searchParams.set('limit','20');u.searchParams.set('page',String(page+1));u.searchParams.set('fields','key,title,author_name,first_publish_year,cover_i,isbn,subject,number_of_pages_median,publisher');
    return cached('ol:'+q+':'+page,async()=>{const data=await json(u.href);return {items:list(data.docs).map(openBook),total:integer(data.numFound)};});
  }
  async function search(q,filter='all',page=0) {
    const tasks=[],names=[];
    const add=(name,fn)=>{names.push(name);tasks.push(fn());};
    if(['all','movie','series','anime','dorama','documentary','concert'].includes(filter))add('tmdb',async()=>{
      const namespace=filter==='movie'?'movie':['series','dorama'].includes(filter)?'tv':'multi';
      const d=await tmdb('/search/'+namespace,{query:q,page:page+1,region:'BR'});
      const rows=list(d.results).filter(r=>r.media_type!=='person').map(r=>tmdbCard(r,namespace==='multi'?r.media_type:namespace));
      return {items:filter==='all'?rows:rows.filter(r=>r.kind===filter || filter==='series'&&r.kind==='dorama'),total:integer(d.total_results),hasMore:page+1<d.total_pages};
    });
    if(['all','track','artist','album'].includes(filter))add('musicbrainz',async()=>{
      const namespaces=filter==='all'?['recording','artist','release']:[filter==='artist'?'artist':filter==='album'?'release':'recording'];
      const items=[];let total=0,hasMore=false,success=0,lastError;
      for(const namespace of namespaces){try{
        const d=await mb(namespace,{query:q,limit:20,offset:page*20});
        items.push(...list(d[namespace==='release'?'releases':namespace==='artist'?'artists':'recordings']).map(r=>musicItem(r,namespace)));total+=integer(d.count);hasMore||=(page+1)*20<d.count;success++;
      }catch(error){lastError=error;}}
      if(!success)throw lastError;
      return {items,total,hasMore};
    });
    if(['all','book'].includes(filter))add('books',()=>books(q,page));
    if(['all','author'].includes(filter))add('authors',()=>cached('ol:authors:'+q+':'+page,async()=>{
      const u=new URL('https://openlibrary.org/search/authors.json');u.searchParams.set('q',q);u.searchParams.set('limit','20');u.searchParams.set('offset',String(page*20));
      const d=await json(u.href);return {items:list(d.docs).map(openAuthor),total:integer(d.numFound)};
    }));
    const results=await Promise.allSettled(tasks),items=[],providers={},errors=[];let hasMore=false;
    results.forEach((r,i)=>{if(r.status==='fulfilled'){items.push(...r.value.items);providers[names[i]]={status:'online',total:r.value.total};hasMore ||=r.value.hasMore ?? (page+1)*20<r.value.total;}else{const code=r.reason?.code||'PROVIDER_UNAVAILABLE';errors.push({provider:names[i],code});providers[names[i]]={status:code.includes('NOT_CONFIGURED')?'unconfigured':'error'};}});
    return {items,providers,errors,hasMore};
  }
  async function detail(input) {
    const ref=parseReference(input);
    if(ref.provider==='legacy'){const {data,error}=await db.from('lx_catalog').select('id,payload,published').eq('id',ref.id).maybeSingle();if(error||!data)throw new CatalogError('CONTENT_NOT_FOUND',404);return legacyItem(data);}
    if(ref.provider==='imdb'){const d=await tmdb('/find/'+ref.id,{external_source:'imdb_id'});const row=d.movie_results?.[0]||d.tv_results?.[0];if(!row)throw new CatalogError('CONTENT_NOT_FOUND',404);return detail({provider:'tmdb',namespace:d.movie_results?.length?'movie':'tv',id:row.id});}
    if(ref.provider==='tmdb'){
      const append='credits,images,videos,external_ids,keywords,similar,recommendations,'+(ref.namespace==='movie'?'release_dates':'content_ratings');
      let d=await tmdb('/'+ref.namespace+'/'+ref.id,{append_to_response:append,include_image_language:'pt,en,null'});
      if(!d.overview||!(d.title||d.name)){const fallback=await tmdb('/'+ref.namespace+'/'+ref.id,{language:'en-US',append_to_response:append,include_image_language:'en,null'});d={...fallback,...d,overview:d.overview||fallback.overview,title:d.title||fallback.title,name:d.name||fallback.name};}
      return tmdbItem(d,ref.namespace);
    }
    if(ref.provider==='googlebooks')return books('',0,ref.id);
    if(ref.provider==='openlibrary')return cached('ol:detail:'+ref.id,async()=>{
      if(ref.namespace==='author')return openAuthor(await json(`https://openlibrary.org/authors/${ref.id}.json`));
      const d=await json(`https://openlibrary.org/works/${ref.id}.json`);const x=openBook(d);const authors=await Promise.allSettled(list(d.authors).slice(0,4).map(a=>/^\/authors\/OL\d+A$/.test(a.author?.key||'')?json('https://openlibrary.org'+a.author.key+'.json'):null));x.metadata.authors=authors.filter(a=>a.status==='fulfilled'&&a.value?.name).map(a=>a.value.name);return x;
    },1209600);
    if(ref.provider==='musicbrainz'){
      const inc=ref.namespace==='artist'?'tags+genres':ref.namespace==='release'?'artist-credits+recordings+release-groups+tags':'artists+releases+isrcs+tags+genres';
      const x=musicItem(await mb(ref.namespace,{inc},ref.id),ref.namespace);const release=ref.namespace==='release'?ref.id:x.metadata.release_id;
      if(release)try{const arts=await cached('caa:'+release,()=>json(`https://coverartarchive.org/release/${release}`),1209600);x.cover=publicUrl(arts.images?.find(i=>i.front)?.thumbnails?.large||arts.images?.[0]?.thumbnails?.small);}catch{/* Artwork may be absent; metadata still works. */}
      return x;
    }
    if(ref.provider==='plex'){
      const {data}=await db.from('lx_media_provider_links').select('media_id').eq('provider','plex').eq('url',ref.url).maybeSingle();
      if(data)return {existing_id:data.media_id};
      const result=await search(ref.id.replace(/-/g,' '),ref.namespace==='movie'?'movie':'series',0);
      return {needs_selection:true,plex_url:ref.url,candidates:result.items,errors:result.errors};
    }
    throw new CatalogError('UNSUPPORTED_REFERENCE');
  }
  async function season(tmdbId,number) {
    const d=await tmdb(`/tv/${integer(tmdbId,1)}/season/${integer(number,0,200)}`);
    return {number:integer(d.season_number),title:text(d.name,200),description:text(d.overview,8000),episodes:list(d.episodes).map(e=>({number:integer(e.episode_number),title:text(e.name,400),description:text(e.overview,8000),duration:integer(e.runtime),release_date:e.air_date||null,image:e.still_path?`https://image.tmdb.org/t/p/w780${e.still_path}`:'',tmdb_id:e.id}))};
  }
  async function home(kind='movie') {
    const namespace=['series','anime','dorama'].includes(kind)?'tv':'movie';
    const params={page:1,sort_by:'popularity.desc'};if(kind==='anime')Object.assign(params,{with_genres:16,with_origin_country:'JP'});if(kind==='dorama')Object.assign(params,{with_genres:18,with_origin_country:'KR|JP|CN|TH|TW'});
    const date=new Date(now()),end=date.toISOString().slice(0,10);date.setUTCMonth(date.getUTCMonth()-3);
    const definitions=[
      {title:'Em alta no mundo',namespace,path:'/trending/'+namespace+'/week',params:{page:1}},
      {title:namespace==='tv'?'Séries populares':'Filmes populares',namespace,path:'/discover/'+namespace,params}
    ];
    if(kind==='movie')definitions.push(
      {title:'Lançamentos no mundo',namespace:'movie',path:'/discover/movie',params:{page:1,sort_by:'popularity.desc','primary_release_date.gte':date.toISOString().slice(0,10),'primary_release_date.lte':end}},
      {title:'Séries populares',namespace:'tv',path:'/discover/tv',params:{page:1,sort_by:'popularity.desc'}},
      {title:'Animes',kind:'anime',namespace:'tv',path:'/discover/tv',params:{page:1,with_genres:16,with_origin_country:'JP'}},
      {title:'Doramas',kind:'dorama',namespace:'tv',path:'/discover/tv',params:{page:1,with_genres:18,with_origin_country:'KR|JP|CN|TH|TW'}},
      ...[['Terror',27],['Comédia',35],['Ação',28],['Romance',10749],['Ficção científica',878],['Documentários',99]].map(([title,genre])=>({title,namespace:'movie',path:'/discover/movie',params:{page:1,with_genres:genre,sort_by:'popularity.desc'}}))
    );
    const values=await Promise.allSettled(definitions.map(d=>tmdb(d.path,d.params)));
    const sections=values.map((r,i)=>({title:definitions[i].title,items:r.status==='fulfilled'?list(r.value.results).map(d=>tmdbCard(d,definitions[i].namespace)).filter(x=>!definitions[i].kind||x.kind===definitions[i].kind).slice(0,16):[]}));
    if(sections[0].items.length)sections.splice(1,0,{title:'Top 10 em alta no mundo',items:sections[0].items.slice(0,10)});
    return {sections,errors:values.flatMap(r=>r.status==='rejected'?[{provider:'tmdb',code:r.reason?.code||'PROVIDER_UNAVAILABLE'}]:[])};
  }
  async function partner(cursor='') {
    const feed=env('PLEX_PARTNER_FEED_URL'),hosts=String(env('PLEX_PARTNER_ALLOWED_HOSTS')||'').split(',').filter(Boolean);
    const url=allowedUrl(feed,hosts);if(!url)throw new CatalogError('PLEX_PARTNER_NOT_CONFIGURED',503);
    const u=new URL(url);if(cursor)u.searchParams.set('cursor',cursor);u.searchParams.set('limit','100');
    const token=await secret('PLEX_PARTNER_API_TOKEN');if(!token)throw new CatalogError('PLEX_PARTNER_NOT_CONFIGURED',503);
    const d=await json(u.href,{authorization:`Bearer ${token}`});
    if(!Array.isArray(d.items)||d.items.length>100)throw new CatalogError('INVALID_PARTNER_FEED',502);
    return {items:d.items,next_cursor:text(d.nextCursor,400),has_more:!!d.hasMore,scope:env('PLEX_PARTNER_SCOPE')==='playback'?'playback':'catalog'};
  }
  async function status(){return {tmdb:!!(await secret('TMDB_READ_ACCESS_TOKEN')||await secret('TMDB_API_KEY','tmdb_v3')),googlebooks:!!(await secret('GOOGLE_BOOKS_API_KEY','google_books_api_key')),openlibrary:true,musicbrainz:true,plex:!!env('PLEX_PARTNER_FEED_URL')&&!!env('PLEX_PARTNER_ALLOWED_HOSTS')&&!!(await secret('PLEX_PARTNER_API_TOKEN')),plex_scope:env('PLEX_PARTNER_SCOPE')==='playback'?'playback':'catalog'};}
  return {search,detail,season,home,partner,status,tmdb,cached};
}
