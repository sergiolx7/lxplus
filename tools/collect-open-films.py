#!/usr/bin/env python3
"""Read licensed public film metadata and probe remote video, without uploading media.

Blender film licenses come from the producer, never from an arbitrary mirror label.
Prelinger candidates come from its curated cinema subjects and need their own license.
The report is reviewable input; this program never writes to the LX database.
"""
import argparse
import concurrent.futures
import hashlib
import html
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

UA = 'LXPlus-OpenFilms/1.0 (https://github.com/sergiolx7/lxplus)'
PRELINGER_QUERY = 'collection:prelinger AND mediatype:movies AND licenseurl:* AND (subject:drama OR subject:comedy OR subject:animation OR subject:cartoon)'
BLENDER_QUERY = 'mediatype:movies AND (creator:"Blender Foundation" OR creator:"Blender Studio" OR creator:"Blender Institute")'

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(); self.tags = []; self.text = []; self.feed(source)
    def handle_starttag(self, tag, attrs): self.tags.append((tag, dict(attrs)))
    def handle_data(self, data): self.text.append(data)
    def meta(self, key):
        return next((a.get('content', '') for t, a in self.tags if t == 'meta' and (a.get('property') == key or a.get('name') == key)), '')
    def links(self): return [a['href'] for t, a in self.tags if t == 'a' and a.get('href')]

def text(value):
    if isinstance(value, list): return ' · '.join(map(str, value))
    return str(value or '')

def normalize(value):
    return re.sub(r'[^a-z0-9]+', '', ''.join(c for c in unicodedata.normalize('NFKD', str(value)).casefold() if not unicodedata.combining(c)))

def license_info(url):
    try:
        u = urllib.parse.urlsplit(url)
        if u.scheme not in ('http', 'https') or u.hostname != 'creativecommons.org' or u.username or u.password: return None
        path = re.sub(r'/deed(?:\.[a-zA-Z_-]+)?/?$', '', u.path).rstrip('/')
        if path in ('/licenses/publicdomain', '/publicdomain/zero/1.0'):
            return {'name': 'CC0' if '/zero/' in path else 'Domínio público · dedicação CC', 'url': 'https://creativecommons.org' + path + '/'}
        m = re.fullmatch(r'/licenses/(by|by-sa|by-nd)/(1\.0|2\.0|2\.5|3\.0|4\.0)(?:/(us))?', path)
        if m: return {'name': 'CC ' + m[1].upper() + ' ' + m[2], 'url': 'https://creativecommons.org' + path + '/'}
    except ValueError: pass
    return None

def page_license(page):
    linked = next((x for link in page.links() if (x := license_info(link))), None)
    if linked: return linked
    # A producer may name the license in text without a clickable license URL.
    match = re.search(r'licensed under the Creative Commons Attribution(?:[- ](Share(?:[- ]?)Alike|NoDerivatives))?\s+(1\.0|2\.0|2\.5|3\.0|4\.0)\s+licen[cs]e', ' '.join(page.text), re.I)
    if match:
        kind = 'by-sa' if match[1] and 'share' in match[1].lower() else 'by-nd' if match[1] else 'by'
        return license_info(f'https://creativecommons.org/licenses/{kind}/{match[2]}/')
    return None

class Collector:
    def __init__(self, cache): self.cache = cache; cache.mkdir(parents=True, exist_ok=True)
    def get(self, url, json_data=False):
        key = self.cache / (hashlib.sha256(url.encode()).hexdigest() + ('.json' if json_data else '.html'))
        if key.exists(): data = key.read_bytes()
        else:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=20) as response:
                data = response.read(5_000_001)
                if len(data) > 5_000_000: raise ValueError('METADATA_TOO_LARGE')
            if json_data: json.loads(data)
            key.write_bytes(data)
        return json.loads(data) if json_data else data.decode('utf-8', 'replace')
    def search(self, query):
        rows, start, total = [], 1, None
        while total is None or len(rows) < total:
            url = 'https://archive.org/advancedsearch.php?' + urllib.parse.urlencode({'q': query, 'output': 'json', 'rows': 1000, 'page': start, 'sort[]': 'downloads desc', 'fl[]': ['identifier', 'title', 'creator', 'licenseurl', 'year', 'runtime', 'subject']}, doseq=True)
            result = self.get(url, True)['response']; total = int(result['numFound'])
            rows.extend(result['docs']); start += 1
            if not result['docs']: break
        return rows
    def probe(self, url, image=False):
        u = urllib.parse.urlsplit(url)
        if u.scheme != 'https' or u.username or u.password or u.hostname not in ('archive.org', 'studio.blender.org', 'download.blender.org'): raise ValueError('UNAPPROVED_MEDIA_HOST')
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA, 'Origin': 'https://xn--rifamilionria-deb.api.br', 'Range': 'bytes=0-8191'}), timeout=20) as response:
            prefix = response.read(8192); mime = response.headers.get('Content-Type', '').split(';')[0]
            if image:
                if response.status not in (200, 206) or not mime.startswith('image/') or len(prefix) < 30: raise ValueError('COVER_UNAVAILABLE')
            elif response.status != 206 or 'ftyp' not in prefix[:256].decode('latin1') or not response.headers.get('Content-Range', '').startswith('bytes 0-'): raise ValueError('NATIVE_MP4_RANGE_UNAVAILABLE')
            return {'url': url, 'status': response.status, 'contentType': mime, 'contentRange': response.headers.get('Content-Range'), 'cors': response.headers.get('Access-Control-Allow-Origin'), 'bytesChecked': len(prefix), 'checkedAt': datetime.now(timezone.utc).isoformat()}
    def archive_media(self, identifier, expected_seconds=0):
        data = self.get('https://archive.org/metadata/' + urllib.parse.quote(identifier, safe=''), True)
        metadata = data.get('metadata', {})
        if metadata.get('access-restricted-item') in ('true', True) or metadata.get('is_dark') or data.get('is_dark'): raise ValueError('RESTRICTED_ITEM')
        files = [f for f in data.get('files', []) if str(f.get('name', '')).lower().endswith('.mp4') and str(f.get('format', '')).lower() in ('h.264', 'h.264 hd', 'h.264 ia', 'mpeg4', '512kb mpeg4') and not f.get('private') and int(f.get('size') or 0) > 1000000 and not re.search(r'trailer|teaser|preview|sample|making|bonus', f.get('name', ''), re.I)]
        # Generic MPEG4 labels still require the separate actual-byte codec verification.
        files.sort(key=lambda f: (not str(f.get('format', '')).lower().startswith('h.264'), abs(int(f.get('height') or 720) - 720), int(f.get('size') or 0)))
        errors = []
        for file in files[:4]:
            duration = float(file.get('length') or 0)
            if expected_seconds and duration and not expected_seconds * .88 <= duration <= expected_seconds * 1.12: continue
            url = 'https://archive.org/download/' + urllib.parse.quote(identifier, safe='') + '/' + urllib.parse.quote(file['name'], safe='/')
            try: return {'url': url, 'duration': duration, 'filename': file['name'], 'fileFormat': file.get('format'), 'probe': self.probe(url)}, metadata
            except Exception as error: errors.append(str(error))
        raise ValueError('NO_VALID_FULL_FILM_MP4' + (':' + ','.join(errors) if errors else ''))
    def prelinger(self, candidate):
        identifier = candidate['identifier']
        if re.search(r'\btrailers?\b|\bteasers?\b|\bpreviews?\b', text(candidate.get('title')), re.I): raise ValueError('TRAILER_NOT_FULL_FILM')
        media, metadata = self.archive_media(identifier)
        collections = metadata.get('collection', [])
        if isinstance(collections, str): collections = [collections]
        if 'prelinger' not in collections: raise ValueError('NOT_CURATED_PRELINGER')
        license = license_info(text(metadata.get('licenseurl')))
        if not license: raise ValueError('LICENSE_NOT_APPROVED')
        title = text(metadata.get('title')).strip(); creator = text(metadata.get('creator')).strip(); year = re.search(r'\b(18\d\d|19\d\d|20\d\d)\b', text(metadata.get('year') or metadata.get('date')))
        if re.search(r'\btrailers?\b|\bteasers?\b|\bpreviews?\b', title, re.I): raise ValueError('TRAILER_NOT_FULL_FILM')
        cover = 'https://archive.org/services/img/' + urllib.parse.quote(identifier, safe=''); cover_proof = self.probe(cover, True)
        subjects = text(metadata.get('subject')).casefold(); genre = 'Animação' if any(s in subjects for s in ['animation', 'cartoon']) else 'Clássicos'
        return self.item('prelinger:' + identifier, title, int(year[1]) if year else '', genre, cover, media, license, 'Prelinger Archives / Internet Archive', creator, 'https://archive.org/details/' + identifier, 'Filme do acervo histórico Prelinger Archives' + (f', produzido por {creator}' if creator else '') + (f' em {year[1]}' if year else '') + '.', {'catalog': 'Prelinger cinema subjects', 'licenseEvidence': 'https://archive.org/details/' + identifier, 'reusePolicy': 'https://archivesupport.zendesk.com/hc/en-us/articles/360004715031-Prelinger-Archive', 'coverProbe': cover_proof})
    def blender(self, slug, mirrors):
        url = f'https://studio.blender.org/projects/{slug}/'; page = Page(self.get(url))
        title = page.meta('og:title').removesuffix(' - Blender Studio').strip()
        if not title: raise ValueError('NO_FILM_TITLE')
        license_pages = [urllib.parse.urljoin(url, x) for x in page.links() if f'/projects/{slug}/pages/' in x and any(s in x for s in ('licens', 'about', 'credits', 'sharing'))]
        license_pages += {'elephants-dream': ['https://orange.blender.org/download/'], 'big-buck-bunny': ['https://peach.blender.org/about/'], 'sintel': ['https://durian.blender.org/sharing/'], 'tears-of-steel': ['https://mango.blender.org/sharing/']}.get(slug, [])
        if slug == 'agent-327': license_pages = ['https://studio.blender.org/blog/agent-327-film-file-released-as-cc-by-nd/']
        license, proof = None, ''
        for link in license_pages:
            p = Page(self.get(link)); license = page_license(p)
            if license: proof = link; break
        if not license: raise ValueError('NO_PRODUCER_LICENSE')
        # The producer's full-film watch button is distinct from trailers and galleries.
        youtube = next((html.unescape(a.get('data-video', '')) for t, a in page.tags if t == 'button' and 'video-modal-link' in a.get('class', '') and a.get('data-video')), '')
        full_button = re.search(r'<button[^>]*video-modal-link[\s\S]{0,700}?<span>\s*Watch (?!the trailer|Trailer)', self.get(url), re.I)
        if not full_button or not youtube: raise ValueError('NO_RELEASED_FULL_FILM')
        duration_by_slug = {'big-buck-bunny': 596, 'elephants-dream': 654, 'sintel': 888, 'tears-of-steel': 734, 'cosmos-laundromat': 648, 'caminandes-2': 146, 'caminandes-3': 150, 'glass-half': 193, 'agent-327': 231, 'hero': 227, 'dailydweebs': 60, 'spring': 476, 'coffee-run': 182, 'sprite-fright': 630, 'charge': 270, 'wing-it': 241, 'singularity': 360}
        needles = {'big-buck-bunny': ['bigbuckbunny'], 'glass-half': ['glasshalf', 'glass'], 'dailydweebs': ['dailydweebs'], 'caminandes-2': ['caminandes2'], 'caminandes-3': ['caminandes3', 'caminandesllamigos'], 'cosmos-laundromat': ['cosmoslaundromat']}.get(slug, [normalize(title)])
        candidates = [m for m in mirrors if any(k in normalize(m.get('title', '')) for k in needles) and not re.search(r'trailer|teaser|teaching|demo|sculpt|radio|homemade|dvd|8k.*3d', m.get('title', ''), re.I)]
        media = None
        for mirror in candidates[:5]:
            try: media, _ = self.archive_media(mirror['identifier'], duration_by_slug.get(slug, 0)); break
            except Exception: continue
        if not media: raise ValueError('NO_PUBLIC_NATIVE_COPY')
        cover = page.meta('og:image'); cover_proof = self.probe(cover, True)
        year = {'elephants-dream': 2006, 'big-buck-bunny': 2008, 'sintel': 2010, 'tears-of-steel': 2012, 'caminandes-2': 2013, 'cosmos-laundromat': 2015, 'glass-half': 2015, 'caminandes-3': 2016, 'agent-327': 2017, 'dailydweebs': 2018, 'hero': 2018, 'spring': 2019, 'coffee-run': 2020, 'sprite-fright': 2021, 'charge': 2022, 'wing-it': 2023, 'singularity': 2026}.get(slug, '')
        return self.item('blender:' + slug, title, year, 'Animação' if slug != 'tears-of-steel' else 'Ficção científica', cover, media, license, 'Blender Studio', 'Blender Foundation', url, '', {'licenseEvidence': proof, 'producerPage': url, 'officialWatchUrl': youtube, 'coverProbe': cover_proof})
    def item(self, key, title, year, genre, cover, media, license, provider, creator, page, description, evidence):
        stamp = datetime.now(timezone.utc).isoformat(); identifier = 9200000000000 + int(hashlib.sha256(key.encode()).hexdigest()[:9], 16)
        seconds = int(media.get('duration') or 0)
        return {'id': identifier, 'type': 'Filme', 'title': title, 'year': year, 'genre': genre, 'genres': [genre, 'Cinema livre'], 'cover': cover, 'banner': cover, 'desc': description or f'Curta-metragem de {creator}, disponibilizado sob {license["name"]}. Assista à versão integral no player LX Plus.', 'creator': creator, 'studio': creator, 'duration': f'{max(1, round(seconds / 60))} min' if seconds else '', 'durationSeconds': seconds, 'published': True, 'featured': False, 'trending': False, 'priority': 0, 'createdAt': stamp, 'importedAt': stamp, 'openFilm': True, 'catalogOnly': False, 'metadataOnly': False, 'availability': 'available', 'mediaKey': media['url'], 'authorizedVideoUrl': media['url'], 'sourceProvider': provider, 'metadataProvider': provider, 'metadataUrl': page, 'externalId': key, 'catalogIdentity': hashlib.sha256(key.encode()).hexdigest(), 'sourceVerified': True, 'sourceVerifiedAt': stamp, 'playbackMode': 'native_remote', 'license': {**license, 'creator': creator, 'sourceUrl': page, 'evidenceUrl': evidence['licenseEvidence'], 'credit': f'{title} · {creator or provider} · {license["name"]}', 'changes': 'Reproduzido sem edição pela LX Plus.'}, 'openFilmEvidence': {**evidence, 'fileFormat': media['fileFormat'], 'filename': media['filename'], 'streamProbe': media['probe']}}

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--cache', required=True); parser.add_argument('--output', required=True); parser.add_argument('--providers', default='blender,prelinger'); args = parser.parse_args()
    c = Collector(Path(args.cache)); tasks = []; mirrors = []
    if 'blender' in args.providers.split(','):
        home = Page(c.get('https://studio.blender.org/films/')); mirrors = c.search(BLENDER_QUERY)
        slugs = sorted({m[1] for link in home.links() if (m := re.fullmatch(r'/projects/([a-z0-9-]+)/', link))})
        tasks.extend(('blender', slug) for slug in slugs)
    if 'prelinger' in args.providers.split(','): tasks.extend(('prelinger', row) for row in c.search(PRELINGER_QUERY))
    items, failed = [], []; target = Path(args.output)
    def run(task):
        provider, candidate = task
        try: return c.blender(candidate, mirrors) if provider == 'blender' else c.prelinger(candidate), None
        except Exception as error: return None, {'provider': provider, 'id': candidate if isinstance(candidate, str) else candidate['identifier'], 'reason': str(error)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for i, (item, error) in enumerate(pool.map(run, tasks), 1):
            if item: items.append(item)
            if error: failed.append(error)
            target.write_text(json.dumps({'items': items, 'failures': failed, 'candidates': len(tasks), 'processed': i, 'complete': i == len(tasks)}, ensure_ascii=False, indent=2))
            print(json.dumps({'processed': i, 'candidates': len(tasks), 'accepted': len(items), 'last': item['title'] if item else error}), flush=True)
    print(json.dumps({'accepted': len(items), 'failed': len(failed), 'complete': True}), flush=True)

if __name__ == '__main__': main()
