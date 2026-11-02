import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const social=readFileSync(new URL('../src/modules/social.js',import.meta.url),'utf8');

test('every own post offers a real edit action and modal with escaped existing content',()=>{
 assert.match(social,/mine\?'<button data-edit-post=/);
 assert.match(social,/if\(b\.dataset\.editPost\)\{/);
 assert.match(social,/p\.author_id===me&&p\.status==='published'/);
 assert.equal((social.match(/select\\('id,author_id,body,media_path,media_type,visibility,status,created_at'\\)/g)||[]).length,2,'post selectors must include status for edit guard');
 assert.match(social,/dialog\('Editar publicação'/);
 assert.match(social,/esc\(post\.body\)/);
 assert.match(social,/name="visibility"/);
});

test('edited posts update only editable fields and always preserve attachments, author and status',()=>{
 assert.match(social,/if\(form\.id==='editPostForm'\)/);
 assert.match(social,/db\.from\('lx_posts'\)\.update\(\{body,visibility,updated_at:new Date\(\)\.toISOString\(\)\}\)/);
 assert.match(social,/\.eq\('id',post\.id\)\.eq\('author_id',me\)\.eq\('status','published'\)\.select\('id'\)/);
 assert.match(social,/if\(!saved\?\.length\)throw Error/);
 assert.match(social,/if\(!\['public','friends','private'\]\.includes\(visibility\)\)/);
 assert.doesNotMatch(social,/\.update\(\{[^}]*author_id:/);
});

test('editor honors text or existing media, and preserves usual publication and DM handlers',()=>{
 assert.match(social,/if\(!body&&!post\.media_path\)throw Error/);
 assert.match(social,/closeDialog\(\);await loadPosts\(\);ctx\.toast\('Publicação atualizada\.'\)/);
 assert.match(social,/if\(form\.id==='postForm'\)/);
 assert.match(social,/if\(form\.id==='messageForm'\)/);
 assert.match(social,/if\(b\.dataset\.deletePost\)/);
});
