"""Read-only public/anonymous API smoke tests; does not use a user or service key."""
from pathlib import Path
import concurrent.futures
import json
import re
import sys
import urllib.error
import urllib.request

config = Path('src/config.js').read_text()
base = re.search(r"url:'([^']+)'", config).group(1)
key = re.search(r"key:'(sb_publishable_[^']+)'", config).group(1)
cases = [
    ('auth settings', 'GET', '/auth/v1/settings', None, (200,), False, {}),
    ('private messages hidden', 'GET', '/rest/v1/lx_messages?select=id&limit=1', None, (200, 401, 403), True, {}),
    ('private profiles hidden', 'GET', '/rest/v1/lx_profiles?select=user_id&limit=1', None, (200, 401, 403), True, {}),
    ('import review hidden', 'GET', '/rest/v1/lx_import_items?select=id&limit=1', None, (200, 401, 403), True, {}),
    ('admin mutation denied', 'POST', '/rest/v1/rpc/lx_studio_archive', {'p_ids': [], 'p_archive': True}, (401, 403), False, {}),
    ('Drive status requires login', 'POST', '/functions/v1/lx-drive-studio', {'action': 'status'}, (401,), False, {}),
    ('Drive invalid token denied', 'POST', '/functions/v1/lx-drive-studio', {'action': 'status'}, (401,), False, {'Authorization': 'Bearer invalid-validation-token'}),
    ('Drive scheduler protected', 'POST', '/functions/v1/lx-drive-studio', {'action': 'sync_due'}, (401,), False, {}),
    ('Drive GET rejected', 'GET', '/functions/v1/lx-drive-studio', None, (405,), False, {}),
    ('Drive preflight', 'OPTIONS', '/functions/v1/lx-drive-studio', None, (200,), False, {'Origin': 'https://xn--rifamilionria-deb.api.br', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,apikey,content-type'}),
]

def run(case):
    name, method, route, body, expected, private, extra = case
    headers = {'apikey': key, 'Content-Type': 'application/json', **extra}
    request = urllib.request.Request(base + route, method=method, headers=headers, data=None if body is None else json.dumps(body).encode())
    try:
        try:
            response = urllib.request.urlopen(request, timeout=15)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            raw = response.read(1_000_000)
            try:
                payload = json.loads(raw)
            except (ValueError, UnicodeDecodeError):
                payload = None
            passed = response.status in expected and (not private or response.status != 200 or payload == [])
            record = {'test': name, 'http': response.status, 'status': 'pass' if passed else 'fail'}
            if private and response.status == 200:
                record['visible_rows'] = len(payload) if isinstance(payload, list) else 'unexpected response'
            if name == 'auth settings' and isinstance(payload, dict):
                record['email_confirmation_required'] = payload.get('mailer_autoconfirm') is False
                record['email_enabled'] = payload.get('external', {}).get('email')
            if name == 'Drive preflight':
                record['allowed_methods'] = response.headers.get('Access-Control-Allow-Methods')
            return record
    except Exception as error:
        return {'test': name, 'status': 'fail', 'error': type(error).__name__}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(run, cases))
print(json.dumps(results, indent=2, ensure_ascii=False))
if any(r['status'] != 'pass' for r in results):
    sys.exit(1)
