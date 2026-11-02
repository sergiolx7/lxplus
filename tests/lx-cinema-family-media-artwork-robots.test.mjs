import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cinemaOriginalPoster} from '../src/cinema-original-poster.js';
import {renderCinemaRobotAdmin} from '../src/cinema-robot-admin.js';
import {renderPremiumCatalog} from '../src/premium-ui.js';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('original cinema covers escape malicious titles and provide actual visual artwork',()=>{
 const image=cinemaOriginalPoster({id:85,title:'Filme <script>alert(1)</script>',type:'Dorama',year:2026});
 assert.match(image,/lx-original-cover/);
 assert.match(image,/&lt;script&gt;/);
 assert.doesNotMatch(image,/<script>/);
 assert.match(image,/--lx-poster-hue:\d+/);
 const html=renderPremiumCatalog({page:'Início',items:[{id:1,type:'Filme',title:'Uma história nova',metadataOnly:true,availability:'coming_soon'}],history:{},list:[]});
 assert.match(html,/lx-original-cover/);
 assert.match(html,/EM BREVE/);
 assert.match(file('src/app.js'),/cinemaOriginalPoster\(item\)/);
 assert.match(file('index.html'),/lx-original-cinema-posters\.css/);
});

test('the family robot only releases clearly family-labeled metadata and never inserts playable videos',()=>{
 const sql=file('supabase/migrations/20261102110217_lx_cinema_safe_auto_family_publish_v4.sql');
 assert.match(sql,/family film|children/);
 assert.match(sql,/ageFilter/);
 assert.match(sql,/autoFamilyFiltered/);
 assert.match(sql,/porn\|xxx\|erotic/);
 assert.match(sql,/payload->>'type'|jsonb_build_object/);
 assert.match(sql,/metadataOnly/);
 assert.match(sql,/coming_soon/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/lx-cinema-family-publish/);
 assert.doesNotMatch(sql,/authorizedVideoUrl|mediaKey|https:\/\/archive\.org\/download/);
});

test('independent media robot enforces per-item Prelinger license, verified MP4 and exact title/year',()=>{
 const sql=file('supabase/migrations/20261102110516_lx_cinema_media_and_artwork_robots_v4.sql');
 assert.match(sql,/Internet Archive · Prelinger/);
 assert.match(sql,/sourceVerified/);
 assert.match(sql,/openFilmEvidence/);
 assert.match(sql,/creativecommons\.org\/publicdomain\/zero/);
 assert.match(sql,/c\.payload->>'metadataOnly'='true'/);
 assert.match(sql,/lower\(trim\(c\.payload->>'title'\)\)=lower\(trim\(s\.payload->>'title'\)\)/);
 assert.match(sql,/c\.payload->>'year'/);
 assert.match(sql,/manualLocked/);
 assert.match(sql,/coalesce\(payload->>'archived','false'\)<>'true'/);
 assert.match(sql,/attached_to_existing/);
 assert.match(sql,/mediaKey/);
 assert.match(sql,/native_open_film/);
 assert.match(sql,/lx-cinema-media-source-link/);
 assert.match(sql,/lx-cinema-artwork-refresh/);
 assert.doesNotMatch(sql,/delete from public\.lx_catalog|truncate public\.lx_catalog/i);
});

test('poster bot accepts only verified Commons license sources and never overwrites artwork',()=>{
 const sql=file('supabase/migrations/20261102110516_lx_cinema_media_and_artwork_robots_v4.sql');
 const family=file('supabase/migrations/20261102110217_lx_cinema_safe_auto_family_publish_v4.sql');
 assert.match(sql,/cinema_permitted_cover/);
 assert.match(sql,/coalesce\(c\.payload->>'cover',''\)=''/);
 assert.match(sql,/autoLicensedArtwork/);
 assert.match(family,/upload\[.\]wikimedia\[.\]org/);
 assert.match(family,/commons\[.\]wikimedia\[.\]org/);
 assert.match(family,/CC BY/);
});

test('admin shows separate approved media and original poster robot counters',()=>{
 const html=renderCinemaRobotAdmin({jobs:[{kind:'films',enabled:true,daily_limit:1000,batch_size:20,processed:12}]},[],{bots:{family_public:13,licensed_playable:2,artwork_updated:7,runs:[{bot:'licensed_media',changed:2}]}});
 assert.match(html,/TRÊS AUTOMAÇÕES EM OPERAÇÃO/);
 assert.match(html,/13/);
 assert.match(html,/licenciada|licenciados|licença/);
 assert.match(html,/2 \/ 2|2/);
 assert.match(html,/licensed_media/);
 const studio=file('src/modules/studio.js');
 assert.match(studio,/lx_cinema_bots_dashboard/);
 assert.match(studio,/cinemaBots=bots/);
});
