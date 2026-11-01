import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderMusicRobotAdmin} from '../src/music-robot-admin.js';

const sql=readFileSync(new URL('../supabase/sql/lx-music-robot-autopublish.sql',import.meta.url),'utf8');
const studio=readFileSync(new URL('../src/modules/studio.js',import.meta.url),'utf8');

test('automatic publication is explicit, provider-scoped and keeps official streaming embeds',()=>{
 assert.match(sql,/auto_publish boolean not null default false/);
 assert.match(sql,/set auto_publish=true,updated_at=now\(\)/);
 assert.match(sql,/provider='YouTube'/);
 assert.match(sql,/provider='Spotify'/);
 assert.match(sql,/external='youtube:'\|\|substring/);
 assert.match(sql,/external='spotify:'\|\|substring/);
 assert.match(sql,/officialEmbedded',true/);
 assert.match(sql,/publish_now,now\(\)/);
 assert.match(sql,/music-robot-auto/);
 assert.match(sql,/music-robot-draft/);
 assert.match(sql,/and c\.published=false/);
 assert.match(sql,/not exists\(select 1 from public\.lx_catalog other/);
 assert.match(sql,/importMethod'='music-robot-draft'/);
 assert.doesNotMatch(sql,/\bdelete\s+from\b/i);
});
test('only owner can change auto-publish and general members cannot stage',()=>{
 assert.match(sql,/public\.lx_admin_role\(\) <> 'owner'/);
 assert.match(sql,/revoke all on function public\.lx_music_robot_set_publish\(boolean\) from public,anon/);
 assert.match(sql,/revoke all on function public\.lx_music_robot_stage\(jsonb\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.lx_music_robot_stage\(jsonb\) to service_role/);
});
test('ADM reflects live publishing, with opt-out, unchanged limits and no false draft claims',()=>{
 const html=renderMusicRobotAdmin({enabled:true,auto_publish:true,daily_limit:300,processed:131,keys:{youtube:true,spotify:true},runs:[],queries:['official music']},'owner');
 assert.match(html,/Publicar automaticamente músicas encontradas/);
 assert.match(html,/name="autoPublish" checked/);
 assert.match(html,/Publicação automática ativada/);
 assert.match(html,/Ver catálogo/);
 assert.doesNotMatch(html,/Novos rascunhos|requer revisão do ADM|como rascunhos/);
 assert.match(studio,/lx_music_robot_set_publish/);
 assert.match(studio,/autoPublish=data\.get\('autoPublish'\)==='on'/);
 const paused=renderMusicRobotAdmin({enabled:true,auto_publish:false,keys:{spotify:true},runs:[]},'owner');
 assert.match(paused,/name="autoPublish"/);
 assert.doesNotMatch(paused,/name="autoPublish" checked/);
 assert.doesNotMatch(renderMusicRobotAdmin({keys:{youtube:true},auto_publish:true},'editor'),/name="autoPublish"/);
});
