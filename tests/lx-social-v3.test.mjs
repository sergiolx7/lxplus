import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {communityFeed,socialComposerDraft,socialComposerIdeas,communityStats,socialTimeAgo} from '../src/social-experience.js';
const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const social=source('src/modules/social.js');

const posts=[
 {id:'older',author_id:'alice',body:'Dica de filme incrível',likes:[{user_id:'z'}],comments:[],created_at:'2026-10-30T10:00:00Z'},
 {id:'newer',author_id:'bob',body:'Novo dorama',likes:[],comments:[],created_at:'2026-11-01T10:00:00Z'},
 {id:'viral',author_id:'cara',body:'Minha música preferida',likes:[{user_id:'z'},{user_id:'y'}],comments:[{id:1},{id:2}],created_at:'2026-10-29T10:00:00Z'},
 {id:'mine',author_id:'me',body:'Meu livro',likes:[],comments:[],created_at:'2026-11-01T10:30:00Z'}
];

test('new LX Social feed respects friends, follows and owner posts without granting broader visibility',()=>{
 const all=communityFeed(posts,{viewerId:'me'});assert.equal(all.length,4);
 const friends=communityFeed(posts,{viewerId:'me',filter:'friends',friends:['alice']});
 assert.deepEqual(friends.map(x=>x.id),['mine','older']);
 const following=communityFeed(posts,{viewerId:'me',filter:'following',following:['cara']});
 assert.deepEqual(following.map(x=>x.id),['mine','viral']);
 assert.deepEqual(communityFeed(posts,{viewerId:'me',filter:'following'}).map(x=>x.id),['mine']);
});
test('popular uses authentic loaded interactions; sponsored items only pinned in general feed',()=>{
 const popular=communityFeed(posts,{filter:'popular',sponsored:['newer']});
 assert.equal(popular[0].id,'viral');
 const general=communityFeed(posts,{filter:'all',sponsored:['older']});
 assert.equal(general[0].id,'older');
 assert.equal(communityFeed([],{}).length,0);
});
test('local search matches post text, member name or @identifier and ignores case',()=>{
 const withProfile=posts.map(x=>({...x,author_username:x.author_id==='bob'?'dorameira':'outro'}));
 assert.deepEqual(communityFeed(withProfile,{search:'DORAMA'}).map(x=>x.id),['newer']);
 assert.deepEqual(communityFeed(withProfile,{search:'dorameira'}).map(x=>x.id),['newer']);
 assert.deepEqual(communityFeed(withProfile,{search:'não existe'}),[]);
});
test('composer ideas append valid text without losing the existing draft',()=>{
 const ideas=socialComposerIdeas();assert.deepEqual(ideas.map(x=>x.id),['film','dorama','music','book']);
 assert.equal(socialComposerDraft('Minha opinião','🎬 Dica de filme: '),'Minha opinião\n🎬 Dica de filme: ');
 assert.equal(socialComposerDraft('','📚 Minha leitura da vez: '),'📚 Minha leitura da vez: ');
 assert.equal(socialComposerDraft('a'.repeat(4000),'novo'),'a'.repeat(4000));
});
test('community stats report only actual approved directory friendships and followed accounts',()=>{
 const people=[{user_id:'me',relation:'accepted'},{user_id:'alice',relation:'accepted'},{user_id:'bob',relation:'pending'},{user_id:'cara',relation:'accepted'}];
 const follows=new Map([['alice',{is_following:true}],['bob',{is_following:true}]]);
 assert.deepEqual(communityStats({people,posts,me:'me',follows}),{friends:2,following:2,posts:4});
 assert.equal(socialTimeAgo('2026-11-01T09:59:00Z',Date.parse('2026-11-01T10:00:00Z')),'1 min');
});
test('filters and search are wired to the actual community feed, not only decorative chips',()=>{
 assert.match(social,/import \{communityFeed,socialComposerIdeas,socialComposerDraft,communityStats\}/);
 assert.match(social,/function visiblePosts\(\)\{return communityFeed\(/);
 assert.match(social,/data-feed-filter=".*feedFilter===/);
 assert.match(social,/filter:feedFilter,search:feedSearch/);
 assert.match(social,/feedFilter=b\.dataset\.feedFilter;updateFeedResults\(\)/);
 assert.match(social,/if\(e\.target\.id==='feedSearch'\)/);
 assert.match(social,/setTimeout\(\(\)=>\{if\(alive&&tab==='Feed'\)updateFeedResults\(\)\},140\)/);
 assert.match(social,/clearTimeout\(feedSearchTimer\)/);
 assert.match(social,/em alta entre os posts carregados/);
});
test('composer shortcuts preserve drafts and save notes with an accessible character counter',()=>{
 assert.match(social,/data-post-idea/);
 assert.match(social,/socialComposerIdeas\(\)/);
 assert.match(social,/socialComposerDraft\(area\.value,idea\.prefix\)/);
 assert.match(social,/drafts\.set\('post',postDraft\)/);
 assert.match(social,/lxComposeCount/);
 assert.match(social,/aria-live="polite"/);
 assert.match(social,/data-jump-compose/);
});
test('new profile discovery works through existing permitted directory and profile modal',()=>{
 assert.match(social,/function suggestedProfiles\(\)/);
 assert.match(social,/data-person="\+esc\(p\.user_id\)/);
 assert.match(social,/data-person="\+esc\(post\.author_id\)/);
 assert.match(social,/if\(b\.dataset\.person\)/);
 assert.match(social,/profileReturnFocus/);
 assert.match(social,/lx-social-suggestion/);
 assert.match(social,/lx-social-quick-grid/);
});
test('social page stays responsive and prior features are intact',()=>{
 const css=source('assets/lx-social-v3.css');
 assert.match(css,/\.social-page/);
 assert.match(css,/@media\(max-width:710px\)/);
 assert.match(css,/@media\(max-width:440px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/lx-feed-author-avatar/);
 assert.match(source('index.html'),/lx-social-v3\.css/);
 assert.match(social,/lx_social_follow_toggle/);
 assert.match(social,/lx_post_likes/);
 assert.match(social,/lx_group_create/);
 assert.match(social,/lx_send_message/);
 assert.match(social,/lx_featured_sponsored_posts/);
 assert.match(social,/lx_demo_social_public/);
});
