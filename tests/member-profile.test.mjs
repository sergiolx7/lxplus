import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {memberProfileCard} from '../src/member-profile.js';

const person={
 user_id:'70000000-0000-4000-8000-000000000002',name:'Angélica',username:'angelica',
 avatar_url:'https://example.org/avatar.webp',banner_url:'https://example.org/banner.webp',
 bio:'Gosto de doramas, música e filmes.',status_text:'Assistindo doramas',
 verified:true,is_premium:true,relation:'accepted',calls_enabled:true,
 profile_style:{enabled:true,color:'#dd4b4b',secondColor:'#a174ff'},
 premium_profile:{preset:'midnight',effect:'aurora'}
};
test('expanded member profile contains a tall card with real public fields, banner, avatar and premium badge',()=>{
 const markup=memberProfileCard(person,{viewerId:'70000000-0000-4000-8000-000000000001',presence:'<span>Ausente</span>'});
 for(const label of ['profile-summary lx-member-profile-card','profile-banner','profile-avatar lx-member-avatar','Angélica','@angelica','LX Premium','Perfil verificado','SOBRE MIM','Gosto de doramas','Assistindo doramas','Enviar mensagem','Chamada de voz','Ausente'])assert.ok(markup.includes(label),label);
 assert.match(markup,/data-profile-led="on"/);
 assert.match(markup,/data-chat-peer="70000000-0000-4000-8000-000000000002"/);
 assert.ok(!markup.includes('LX-70000000000040008000000000000002'),'do not expose a raw UUID as public code');
});
test('non-premium profile is not falsely verified or premium and cannot call unless enabled',()=>{
 const markup=memberProfileCard({...person,is_premium:false,verified:false,relation:'none',calls_enabled:false,bio:'',username:''},{viewerId:'70000000-0000-4000-8000-000000000001'});
 assert.ok(markup.includes('Adicionar amigo'));
 assert.ok(!markup.includes('LX Premium'));
 assert.ok(!markup.includes('Perfil verificado'));
 assert.ok(!markup.includes('Chamada de voz'));
 assert.ok(markup.includes('A pessoa ainda não escreveu uma biografia.'));
 assert.ok(!markup.includes('Copiar @'));
});
test('profile content is HTML-escaped, and friend profile actions follow server-provided relation',()=>{
 const x=memberProfileCard({...person,name:'<script>bad()</script>',bio:'<img onerror=alert(1)>',relation:'pending',direction:'incoming',verified:false});
 assert.ok(!x.includes('<script>'));assert.ok(!x.includes('<img onerror'));
 assert.ok(x.includes('&lt;script&gt;'));assert.ok(x.includes('&lt;img onerror'));
 assert.ok(x.includes('Aceitar amizade'));assert.ok(!x.includes('Enviar mensagem'));
});
test('standalone dialog CSS has accessible scroll sizing for narrow and low-height screens',()=>{
 const css=readFileSync(new URL('../assets/member-profile.css',import.meta.url),'utf8');
 const social=readFileSync(new URL('../src/modules/social.js',import.meta.url),'utf8');
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(css,/max-height:calc\(100dvh - 32px\)/);
 assert.match(css,/@media\(max-width:480px\)/);
 assert.match(css,/overflow-y:auto/);
 assert.match(social,/lx-member-profile-overlay/);
 assert.match(social,/memberProfileCard\(p,/);
 assert.match(index,/member-profile\.css/);
});
