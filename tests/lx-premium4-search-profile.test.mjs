import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchesPerson} from '../src/catalog-search.js';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('global search still matches only the provided visible person records',()=>{
 const publicPerson={user_id:'11111111-1111-4111-8111-111111111111',name:'José Silva',username:'jose'};
 const privatePerson={user_id:'22222222-2222-4222-8222-222222222222',name:'Perfil fora do diretório',username:'privado'};
 assert.equal(matchesPerson(publicPerson,'jose'),true);
 assert.equal(matchesPerson(publicPerson,'JOSÉ'),true);
 assert.equal([publicPerson].filter(p=>matchesPerson(p,'privado')).length,0);
 assert.equal(matchesPerson(privatePerson,'privado'),true,'the directory, not a name guess, determines allowed visibility');
});

test('global search exposes member-specific profile action instead of generic community routing',()=>{
 const code=source('src/modules/search.js');
 assert.match(code,/data-search-person=/);
 assert.match(code,/people\.some\(p=>p\.user_id===b\.dataset\.searchPerson\)/);
 assert.match(code,/ctx\.navigate\('Comunidade',\{term:'profile:'\+b\.dataset\.searchPerson\}\)/);
 assert.match(code,/data-page="Comunidade">Abrir comunidade/,'the separate Communities result still navigates to community');
});

test('community deep links enforce existing directory access and use real profile card',()=>{
 const code=source('src/modules/social.js');
 assert.match(code,/async function showMemberProfile\(id\)/);
 assert.match(code,/if\(id!==me&&!people\.some\(p=>p\.user_id===id\)\)throw Error/);
 assert.match(code,/memberProfileCard\(p,\{viewerId:me/);
 assert.match(code,/requestedProfile=\/\^profile:/);
 assert.match(code,/if\(b\.dataset\.person\)\{await showMemberProfile\(b\.dataset\.person\);return\}/);
});

test('music search clears stale album selection and resets reference pagination',()=>{
 const code=source('src/modules/music.js');
 assert.match(code,/const search=value=>\{term=value;groupSelection=null;groupTracks=\[\];referenceOffset=0/);
 assert.match(code,/tab=b\.dataset\.musicTab;selected=null;groupSelection=null;groupTracks=\[\];items=\[\];total=0;referenceOffset=0/);
 assert.match(code,/findMusicActionTrack/);
});

test('mobile member discovery styles and cache invalidation are present',()=>{
 const css=source('assets/lx-premium4-discovery.css');
 const html=source('index.html');
 assert.match(css,/\.lx-search-person/);
 assert.match(css,/@media\(max-width:470px\)/);
 assert.match(html,/lx-premium4-discovery\.css/);
 assert.match(html,/20261102-premium4-search1/);
});
