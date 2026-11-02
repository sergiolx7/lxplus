import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/20261102044136_lx_cinema_provider_timeout_backoff_v4.sql',import.meta.url),'utf8');
test('cinema timeout backoff is bound to the failed film job and changes no protected data',()=>{
 assert.match(sql,/where kind='films'/);
 assert.match(sql,/status='retry'/);
 assert.match(sql,/last_error ilike '%timed out%'/);
 assert.match(sql,/batch_size=least\(batch_size,20\)/);
 assert.match(sql,/next_run_at=greatest\(next_run_at,now\(\)\+interval '3 minutes'\)/);
 assert.doesNotMatch(sql,/\b(delete|truncate|drop|grant|revoke)\b/i);
});
