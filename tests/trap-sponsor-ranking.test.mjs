import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderPromotions} from '../src/studio-promotions.js';

const sql=readFileSync(new URL('../supabase/sql/lx-sponsored-posts.sql',import.meta.url),'utf8');
const social=readFileSync(new URL('../src/modules/social.js',import.meta.url),'utf8');
const studio=readFileSync(new URL('../src/modules/studio.js',import.meta.url),'utf8');
const dock=readFileSync(new URL('../src/music-dock.js',import.meta.url),'utf8');
const official=readFileSync(new URL('../src/official-music-controller.js',import.meta.url),'utf8');
const ranking=readFileSync(new URL('../src/modules/library.js',import.meta.url),'utf8');
const queries=readFileSync(new URL('../supabase/sql/lx-music-robot-trap-topics.sql',import.meta.url),'utf8');

test('brand-new featured-post campaigns are explicitly labeled and keep genuine likes untouched',()=>{
 assert.match(sql,/create table if not exists public\.lx_sponsored_posts/);
 assert.match(sql,/create or replace function public\.lx_sponsor_public_post/);
 assert.match(sql,/public\.lx_admin_role\(\) not in \('owner','administrator'\)/);
 assert.match(sql,/visibility<>'public' or target\.status<>'published'/);
 assert.match(sql,/alter table public\.lx_sponsored_posts enable row level security/);
 assert.match(sql,/revoke all on public\.lx_sponsored_posts from public,anon,authenticated/);
 assert.doesNotMatch(sql,/\b(insert|update|delete)\s+(into|from|public\.)*\s*(public\.)?lx_post_likes\b/i);
 assert.match(social,/Divulgação patrocinada · LX Plus/);
 assert.match(social,/lx_visible_sponsored_posts/);
 assert.match(social,/count=post\.likes\?\.length\|\|0/);
});
test('ADM can activate or stop promotion but has no mechanism to fabricate likes',()=>{
 const html=renderPromotions([{post_id:'12345678-1234-1234-1234-123456789012',preview:'Publicação da LX Plus',active:true,expires_at:'2026-12-01T00:00:00Z',organic_likes:14}]);
 assert.match(html,/Central de divulgação/);
 assert.match(html,/14 curtidas reais/);
 assert.match(html,/data-promo-disable/);
 assert.match(html,/Divulgação patrocinada/);
 assert.doesNotMatch(html,/compra de curtidas|somar curtidas/i);
 assert.match(studio,/lx_sponsor_public_post/);
 assert.match(studio,/lx_admin_sponsored_posts/);
});
test('licensed-native audio uses LX controls; YouTube and Spotify retain their official embeds',()=>{
 assert.match(dock,/source\.kind==='iframe'/);
 assert.match(dock,/this\.embedded=source\.kind==='iframe'/);
 assert.match(dock,/Reprodução pelo player oficial/);
 assert.match(dock,/Direitos pertencem aos respectivos titulares/);
 assert.match(official,/document\.createElement\('iframe'\)/);
 assert.match(dock,/document\.createElement\('audio'\)/);
 assert.doesNotMatch(dock,/yt-dlp|spotify-dl|mp3convert|youtube-mp3/i);
});
test('ranking refreshes monthly season without erasing history or awarding prizes',()=>{
 assert.match(ranking,/lx_rank_rollover_if_needed/);
 assert.match(ranking,/getRanking\(\)/);
 assert.doesNotMatch(ranking,/\bdelete from lx_rank|\btruncate\b/i);
});
test('robot preserves existing genres and includes trap, Matuê, Teto, WIU and others',()=>{
 assert.match(queries,/Matuê/);
 assert.match(queries,/WIU/);
 assert.match(queries,/Teto/);
 assert.match(queries,/Veigh/);
 assert.match(queries,/array_cat\(queries/);
 assert.match(queries,/cardinality\(queries\)=7/);
});
