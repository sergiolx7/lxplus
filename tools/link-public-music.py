#!/usr/bin/env python3
"""Match catalog recordings to public Spotify metadata; never download audio.

Input is a backed-up lx_catalog export and a JSON array of public Spotify URLs.
Output contains verified individual track links and unresolved IDs. Discovery
uses only public album/artist/track pages and the provider's official embeds.
Existing playback sources are excluded. Nothing is written to the database.
"""
import argparse
import base64
import collections
import concurrent.futures
import datetime
import html
import json
import pathlib
import re
import time
import unicodedata
import urllib.error
import urllib.request


def norm(value):
    value = unicodedata.normalize('NFKD', str(value or '')).casefold()
    value = ''.join(ch for ch in value if unicodedata.category(ch) != 'Mn')
    return ' '.join(''.join(ch if ch.isalnum() else ' ' for ch in value).split())


def title_key(value):
    # Formatting of features differs between services; artist names and
    # recording duration are checked separately. Preserve edition markers.
    value = re.sub(r'\s*[([]\s*(?:feat\.?|featuring|with)\b.*?[)\]]', '', str(value), flags=re.I)
    return norm(value)


def album_key(value):
    value = re.sub(r'\s*(?:[([])?(?:deluxe(?: edition)?|expanded(?: edition)?|single|ep)(?:[)\]])?\s*$', '', str(value), flags=re.I)
    return norm(value)


def artist_names(value):
    # Keep names with commas when they are supplied as structured artist lists.
    if isinstance(value, list):
        return {norm(x) for x in value if norm(x)}
    return {norm(x) for x in re.split(r'\s*(?:,|\s&\s|\sfeat\.?\s|\sfeaturing\s)\s*', str(value or ''), flags=re.I) if norm(x)}


def artist_key(value):
    # Services disagree whether a duo is one artist or two. Compare all
    # credited name tokens without losing or inventing any credited artist.
    values = value if isinstance(value, list) else [value]
    return tuple(sorted(norm(' '.join(str(x) for x in values)).split()))


def credited_artist_key(payload):
    # Catalogs sometimes credit guests in the title rather than artist field.
    # Add only explicitly named guests and do not duplicate existing credits.
    credits = collections.Counter(artist_key(payload.get('artist')))
    for feature in re.findall(r'[([]\s*(?:feat\.?|featuring|with)\s+([^\]\)]+)[)\]]', str(payload.get('title') or ''), flags=re.I):
        guest = collections.Counter(artist_key(feature))
        if not guest <= credits:
            credits += guest
    return tuple(sorted(credits.elements()))


def public_entity(url):
    if '/album/' in url or '/playlist/' in url:
        url = url.replace('open.spotify.com/album/', 'open.spotify.com/embed/album/').replace('open.spotify.com/playlist/', 'open.spotify.com/embed/playlist/')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; LXPlusCatalog/1.0)'})
    with urllib.request.urlopen(req, timeout=18) as response:
        page = response.read(3_500_000).decode('utf-8')
    initial = re.search(r'<script id="initialState" type="text/plain">(.*?)</script>', page, re.S)
    if initial:
        # Retain only public content metadata, never the page's session/config.
        state = json.loads(base64.b64decode(initial.group(1)))
        return list(state.get('entities', {}).get('items', {}).values())
    embedded = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', page, re.S)
    if embedded:
        return [json.loads(html.unescape(embedded.group(1)))['props']['pageProps']['state']['data']['entity']]
    raise ValueError('Public metadata unavailable')


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def track_record(value, page_url):
    uri = str(value.get('uri') or '')
    if not re.fullmatch(r'spotify:track:[A-Za-z0-9]{22}', uri):
        return None
    artists = [x.get('profile', {}).get('name') or x.get('name') for x in value.get('artists', {}).get('items', [])] if isinstance(value.get('artists'), dict) else []
    artists = [x for x in artists if x] or [x.strip() for x in str(value.get('subtitle') or '').split(',') if x.strip()]
    duration = value.get('duration')
    duration = duration.get('totalMilliseconds', 0) if isinstance(duration, dict) else duration or 0
    playable = value.get('isPlayable') is True or value.get('playability', {}).get('playable') is True
    title = value.get('name') or value.get('title')
    if not artists or not title or not duration or not playable:
        return None
    album = value.get('albumOfTrack') or {}
    return {'uri': uri, 'url': 'https://open.spotify.com/track/' + uri.split(':')[2], 'title': title, 'artists': artists, 'duration': duration / 1000, 'album': album.get('name', ''), 'albumUri': album.get('uri', ''), 'evidenceUrl': page_url}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalog', required=True)
    parser.add_argument('--seeds', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--max-pages', type=int, default=1800)
    parser.add_argument('--resume', action='store_true')
    parser.add_argument('--no-discovery', action='store_true', help='Verify only supplied pages without expanding related albums/artists.')
    args = parser.parse_args()
    rows = json.loads(pathlib.Path(args.catalog).read_text())['rows']
    missing = [r for r in rows if r['payload'].get('type') == 'Música' and r['payload'].get('catalogOnly') and not any(r['payload'].get(k) for k in ['mediaKey', 'authorizedAudioUrl', 'externalMusicUrl']) and not any(t.get('mediaKey') or t.get('authorizedAudioUrl') for t in r['payload'].get('tracks', []))]
    titles = {}
    for row in missing:
        titles.setdefault(title_key(row['payload']['title']), []).append(row)
    wanted_albums = {album_key(r['payload'].get('album')) for r in missing}
    wanted_artists = set().union(*(artist_names(r['payload'].get('artist')) for r in missing))
    wanted_artists.update(norm(r['payload'].get('artist')) for r in missing)
    queue, seen, matches, failures, proofs = [], set(), {}, [], {}

    def enqueue(uri_or_url):
        match = re.search(r'(?:spotify:|open\.spotify\.com/(?:intl-[^/]+/|embed/)?)(album|artist|track|playlist)[:/]([A-Za-z0-9]{22})', str(uri_or_url))
        if not match:
            return
        url = 'https://open.spotify.com/' + match[1] + '/' + match[2]
        if url not in seen:
            seen.add(url)
            queue.append(url)

    for seed in json.loads(pathlib.Path(args.seeds).read_text()):
        enqueue(seed)
    output = pathlib.Path(args.output)
    if args.resume and output.exists():
        previous = json.loads(output.read_text())
        matches.update((x['catalogId'], x) for x in previous.get('matches', []))
        proofs.update((x['url'], x) for x in previous.get('publicPages', []))
        for url in previous.get('pendingUrls', []):
            enqueue(url)
        seen.update(proofs)
        queue[:] = [url for url in queue if url not in proofs]

    def save():
        result = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'initialMissing': len(missing), 'verifiedCount': len(matches), 'pagesVisited': len(proofs) + len(failures), 'matches': list(matches.values()), 'unresolvedIds': [r['id'] for r in missing if r['id'] not in matches], 'publicPages': list(proofs.values()), 'pendingUrls': queue, 'failures': failures}
        temp = output.with_suffix('.tmp')
        temp.write_text(json.dumps(result, ensure_ascii=False, indent=2))
        temp.replace(output)

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        visited = 0
        while queue and visited < args.max_pages:
            batch = queue[:min(3, args.max_pages - visited)]
            del queue[:len(batch)]
            for url, future in zip(batch, [pool.submit(public_entity, url) for url in batch]):
                visited += 1
                try:
                    entities = future.result()
                    proofs[url] = {'url': url, 'titles': [x.get('name') or x.get('title') or x.get('profile', {}).get('name') for x in entities], 'verifiedTracks': 0}
                    for obj in walk(entities):
                        uri = str(obj.get('uri') or '')
                        name = obj.get('name') or obj.get('profile', {}).get('name')
                        if not args.no_discovery and uri.startswith('spotify:album:') and name and album_key(name) in wanted_albums:
                            enqueue(uri)
                        elif not args.no_discovery and uri.startswith('spotify:artist:') and name and norm(name) in wanted_artists:
                            enqueue(uri)
                        record = track_record(obj, url)
                        if not record:
                            continue
                        for row in titles.get(title_key(record['title']), []):
                            payload = row['payload']
                            candidates = list(record['artists'])
                            # Dominguinho is credited as a collective as well as
                            # its three musicians on Spotify's public recording.
                            candidates = [x for x in candidates if norm(x) != 'dominguinho'] if len(candidates) > 1 else candidates
                            if credited_artist_key(payload) != credited_artist_key({'artist': candidates, 'title': record['title']}):
                                continue
                            seconds = float(payload.get('duration') or 0)
                            if seconds <= 0 or abs(seconds - record['duration']) > 3:
                                continue
                            current = matches.get(row['id'])
                            if current:
                                continue
                            matches[row['id']] = {'catalogId': row['id'], 'catalogTitle': payload['title'], 'catalogArtist': payload['artist'], 'catalogDuration': seconds, 'provider': 'Spotify', **record, 'matchMethod': 'exact_title_artist_duration', 'playbackMode': 'official_embed'}
                            proofs[url]['verifiedTracks'] += 1
                        if not args.no_discovery and record['albumUri'] and album_key(record['album']) in wanted_albums:
                            enqueue(record['albumUri'])
                except Exception as error:
                    failures.append({'url': url, 'reason': str(error)[:180]})
                    if isinstance(error, urllib.error.HTTPError) and error.code == 429:
                        save()
                        print('Provider rate limit; stopped without bypassing it.', flush=True)
                        queue.clear()
                        break
            save()
            print(json.dumps({'pages': visited, 'verified': len(matches), 'queued': len(queue), 'failures': len(failures)}), flush=True)
            time.sleep(0.4)
    save()


if __name__ == '__main__':
    main()
