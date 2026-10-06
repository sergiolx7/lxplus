#!/usr/bin/env python3
"""Prepare an additive metadata batch against a private catalog backup."""
import argparse
import collections
import hashlib
import json
import re
import unicodedata
from pathlib import Path


def normalized(value):
    value = unicodedata.normalize('NFKD', str(value or '')).casefold()
    return re.sub(r'\s+', ' ', ''.join(c for c in value if not unicodedata.combining(c))).strip()


def identity(row):
    creator = row.get('artist') or row.get('author') or ''
    year = str(row.get('year') or '') if row.get('type') in ['Filme', 'Série', 'Anime', 'Dorama'] else ''
    return '|'.join([normalized(row['type']), normalized(row['title']), normalized(creator), year])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--backup', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--maximum-new', type=int, default=900)
    args = parser.parse_args()
    collected = json.loads(Path(args.input).read_text())
    backup = json.loads(Path(args.backup).read_text())
    originals = backup['catalog_backup']
    old_keys = {identity(row['payload']) for row in originals}
    old_ids = {int(row['id']) for row in originals}
    old_external = {row['payload'].get('externalId') for row in originals if row['payload'].get('externalId')}
    old_titles = {(normalized(row['payload']['type']), normalized(row['payload']['title'])) for row in originals if row['payload'].get('type') != 'Música'}
    seen_ids, seen_keys, seen_external, fresh, skipped = set(), set(), set(), [], []
    for row in collected['items']:
        key, external = identity(row), row.get('externalId')
        if int(row['id']) in old_ids or key in old_keys or external in old_external or (row['type'] != 'Música' and (normalized(row['type']), normalized(row['title'])) in old_titles):
            skipped.append({'id': row['id'], 'title': row['title'], 'reason': 'existing_catalog'})
            continue
        if row['id'] in seen_ids or key in seen_keys or external in seen_external:
            continue
        if not row.get('cover') or not row.get('catalogOnly') or row.get('mediaKey'):
            raise ValueError('Unsafe/incomplete metadata batch item')
        if row['type'] == 'Música':
            row.pop('externalMusicUrl', None)
        row['catalogIdentity'] = hashlib.sha256(key.encode()).hexdigest()
        seen_ids.add(row['id']);seen_keys.add(key);seen_external.add(external);fresh.append(row)
    # UI36's production client reads one PostgREST page. Keep all current rows
    # visible until the paginated client in the authorized branch is deployed.
    maximum = min(args.maximum_new, max(0, 1000 - len(originals) - 12))
    items = [r for r in fresh if r['type'] != 'Música']
    if len(items) > maximum:
        raise ValueError('Non-music catalog exceeds the safe initial batch')
    artists = collections.OrderedDict()
    for row in fresh:
        if row['type'] == 'Música':
            artists.setdefault(row.get('artist') or '', []).append(row)
    # Include each artist before adding deeper discography; preserve API order.
    while artists and len(items) < maximum:
        for artist in list(artists):
            if len(items) >= maximum:
                break
            items.append(artists[artist].pop(0))
            if not artists[artist]:
                del artists[artist]
    result = {'items': items, 'baseline': {'project': backup['project'], 'fingerprint': backup['fingerprint'], 'original_ids': sorted(old_ids), 'original_count': len(originals)},
              'summary': {'collected': len(collected['items']), 'insert_candidates': len(items), 'types': dict(collections.Counter(r['type'] for r in items)), 'skipped_existing': skipped, 'remaining_metadata': len(fresh) - len(items), 'unresolved_sources': collected.get('errors', [])}}
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps(result['summary'], ensure_ascii=False))


if __name__ == '__main__':
    main()
