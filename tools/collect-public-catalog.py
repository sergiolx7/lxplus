#!/usr/bin/env python3
"""Collect public catalog metadata. Never read players, manifests or audio previews."""
import argparse
import concurrent.futures
import datetime
import hashlib
import html
import json
import re
import threading
import time
import unicodedata
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

USER_AGENT = 'LXPlus/2.0 (https://github.com/sergiolx7/lxplus; public catalog metadata)'
ALLOWED = {'watch.plex.tv', 'itunes.apple.com', 'openlibrary.org'}
STAMP = datetime.datetime.now(datetime.timezone.utc).isoformat()
gate_lock = threading.Lock()
last_apple = 0.0


def fetch(url):
    global last_apple
    host = urllib.parse.urlsplit(url).hostname
    if host not in ALLOWED:
        raise ValueError('Metadata host not allowed')
    if host == 'itunes.apple.com':
        with gate_lock:
            pause = max(0, last_apple + 3.2 - time.monotonic())
            if pause:
                time.sleep(pause)
            last_apple = time.monotonic()
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Accept': 'application/json,text/html'})
    with urllib.request.urlopen(req, timeout=30) as response:
        if urllib.parse.urlsplit(response.url).hostname not in ALLOWED:
            raise ValueError('Unexpected metadata redirect')
        body = response.read(4_000_001)
        if len(body) > 4_000_000:
            raise ValueError('Metadata response too large')
        return body.decode('utf-8')


class Node:
    def __init__(self, tag='', attrs=(), parent=None):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent
        self.children, self.text = [], ''

    def walk(self):
        yield self
        for child in self.children:
            yield from child.walk()

    def content(self):
        return self.text + ' '.join(c.content() for c in self.children if c.tag not in ['script', 'style'])


class Page(HTMLParser):
    VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

    def __init__(self, source):
        super().__init__()
        self.root, self.meta, self.graph = Node(), {}, []
        self.stack, self.json_script = [self.root], None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag == 'meta':
            self.meta[node.attrs.get('property') or node.attrs.get('name')] = node.attrs.get('content', '')
        if tag == 'script' and node.attrs.get('type') == 'application/ld+json':
            self.json_script = ''
        if tag not in self.VOID:
            self.stack.append(node)

    def handle_endtag(self, tag):
        if tag == 'script' and self.json_script is not None:
            try:
                value = json.loads(self.json_script)
                self.graph.extend(value.get('@graph', [value]) if isinstance(value, dict) else value)
            except (ValueError, TypeError):
                pass
            self.json_script = None
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        if self.json_script is not None:
            self.json_script += data
        if self.stack[-1].tag not in ['script', 'style']:
            self.stack[-1].text += data


def norm(text):
    value = unicodedata.normalize('NFKD', str(text or '')).casefold()
    return re.sub(r'\s+', ' ', ''.join(c for c in value if not unicodedata.combining(c))).strip()


def base(key, kind, title, cover):
    return {'id': 7_000_000_000_000 + int(hashlib.sha256(key.encode()).hexdigest()[:12], 16) % 1_000_000_000_000,
            'type': kind, 'title': html.unescape(title).strip(), 'cover': html.unescape(cover or ''),
            'banner': html.unescape(cover or ''), 'published': True, 'publishedAt': STAMP, 'createdAt': STAMP,
            'importedAt': STAMP, 'importBatch': 'lx-public-catalog-20261006', 'priority': 0,
            'featured': False, 'trending': False, 'newRelease': False, 'catalogOnly': True,
            'availability': 'coming_soon', 'availabilityLabel': 'Disponível em breve',
            'metadataOnly': True, 'mediaKey': '', 'qualityMode': 'pending-media',
            'externalId': key, 'tags': ['Catálogo LX', 'Disponível em breve']}


def public_cards(source):
    p, rows, seen = Page(source), [], set()
    for a in p.root.walk():
        href = a.attrs.get('href', '').split('?')[0]
        if a.tag != 'a' or not re.fullmatch(r'/(?:pt-BR/)?(?:movie|show)/[a-zA-Z0-9_-]+', href) or href in seen:
            continue
        seen.add(href)
        parent = a.parent
        image = next((n for n in parent.walk() if n.tag == 'img'), None)
        if not image and parent.parent:
            image = next((n for n in parent.parent.walk() if n.tag == 'img'), None)
        label = a.attrs.get('aria-label') or parent.content().strip()
        if label and image:
            rows.append({'href': href, 'label': label, 'cover': image.attrs.get('src')})
    return rows


def plex_item(card):
    href = card['href']
    if not href.startswith('/pt-BR/'):
        href = '/pt-BR' + href
    url = 'https://watch.plex.tv' + href
    page = Page(fetch(url))
    item = next((x for x in page.graph if isinstance(x, dict) and x.get('@type') in ['Movie', 'TVSeries']), None)
    if not item:
        raise ValueError('No public movie/series metadata')
    kind = card.get('kind') or ('Filme' if item['@type'] == 'Movie' else 'Série')
    title = item.get('name') or page.meta.get('og:title')
    cover = card.get('cover') or page.meta.get('og:image') or item.get('image')
    row = base('plex:' + href.split('/pt-BR/')[-1], kind, title, cover)
    row.update({'year': (item.get('datePublished') or '')[:4], 'rating': item.get('contentRating') or '',
                'desc': 'Disponível em breve no LX Plus. ' + ' '.join(html.unescape(item.get('description') or page.meta.get('og:description') or '').split()[:20]) + '… Consulte a sinopse completa na página oficial.',
                'genre': ' · '.join(item.get('genre') or []) or 'Geral', 'genres': item.get('genre') or [],
                'metadataProvider': 'Plex · página pública', 'metadataUrl': url, 'externalProviderUrl': url,
                'providerLinks': [{'provider': 'plex', 'url': url, 'label': 'Assistir no Plex'}],
                'sourceProvider': 'plex', 'plexSlug': href.split('/')[-1], 'episodes': []})
    row['tags'].extend([row['plexSlug'].replace('-', ' '), kind])
    if row['plexSlug'] == 'leprechaun':
        row['originalTitle'] = 'Leprechaun'
        row['tags'].append('Leprechaun')
    director = item.get('director') or []
    if isinstance(director, dict):
        director = [director]
    row['director'] = ', '.join(x.get('name', '') for x in director if isinstance(x, dict))
    row['cast'] = [x.get('name', '') for x in (item.get('actor') or []) if isinstance(x, dict)][:12]
    duration = re.search(r'T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', item.get('duration') or '')
    if duration:
        h, m, s = [int(v or 0) for v in duration.groups()]
        row['duration'] = f'{round(h * 60 + m + s / 60)} min'
    if kind in ['Anime', 'Dorama']:
        row['tags'].append(kind)
    return row


def music_items(artist):
    url = 'https://itunes.apple.com/search?' + urllib.parse.urlencode({'term': artist, 'country': 'BR', 'media': 'music', 'entity': 'song', 'limit': 50, 'attribute': 'artistTerm'})
    rows = []
    for track in json.loads(fetch(url)).get('results', []):
        if not track.get('trackId') or not track.get('artworkUrl100') or not track.get('trackViewUrl'):
            continue
        cover = track['artworkUrl100'].replace('100x100bb', '600x600bb')
        row = base('itunes:track:' + str(track['trackId']), 'Música', track['trackName'], cover)
        row.update({'artist': track.get('artistName', ''), 'album': track.get('collectionName', ''),
                    'year': (track.get('releaseDate') or '')[:4], 'genre': track.get('primaryGenreName') or 'Outras',
                    'duration': round(track.get('trackTimeMillis', 0) / 1000), 'trackNumber': track.get('trackNumber'),
                    'explicit': track.get('trackExplicitness') == 'explicit', 'itunesTrackId': str(track['trackId']),
                    'itunesArtistId': str(track.get('artistId') or ''), 'itunesAlbumId': str(track.get('collectionId') or ''),
                    'metadataProvider': 'Apple Music / iTunes', 'metadataUrl': track['trackViewUrl'],
                    'externalProviderUrl': track['trackViewUrl'],
                    'providerLinks': [{'provider': 'itunes', 'url': track['trackViewUrl'], 'label': 'Ver no iTunes'}],
                    'desc': f'Disponível em breve no LX Plus. {track["trackName"]} — {track.get("artistName", "")}. Álbum: {track.get("collectionName", "")}. Disponível em breve no player LX; consulte também a página oficial no iTunes.',
                    'needsAudio': True, 'tracks': [{'number': track.get('trackNumber') or 1, 'title': track['trackName'],
                                                  'artist': track.get('artistName', ''), 'album': track.get('collectionName', ''),
                                                  'duration': round(track.get('trackTimeMillis', 0) / 1000), 'cover': cover,
                                                  'mediaKey': '', 'qualityMode': 'pending-audio'}]})
        rows.append(row)
    return rows


def book_items(subject):
    url = 'https://openlibrary.org/subjects/' + urllib.parse.quote(subject) + '.json?limit=30'
    rows = []
    for book in json.loads(fetch(url)).get('works', []):
        if not book.get('cover_id') or not book.get('key'):
            continue
        authors = ', '.join(a.get('name', '') for a in book.get('authors', []))
        row = base('openlibrary:' + book['key'], 'Livro', book['title'], f'https://covers.openlibrary.org/b/id/{book["cover_id"]}-L.jpg')
        official = 'https://openlibrary.org' + book['key']
        row.update({'author': authors, 'year': book.get('first_publish_year') or '',
                    'genre': subject.replace('_', ' ').title(), 'openLibraryId': book['key'], 'chapters': [],
                    'metadataProvider': 'Open Library', 'metadataUrl': official, 'externalProviderUrl': official,
                    'providerLinks': [{'provider': 'openlibrary', 'url': official, 'label': 'Ver na Open Library'}],
                    'desc': f'Disponível em breve no LX Plus. {book["title"]}, de {authors}. Livro cadastrado com capa e identificação da Open Library; leitura no LX disponível em breve, após adicionar o arquivo autorizado.'})
        rows.append(row)
    return rows


ANIME = ['naruto', 'naruto-shippuden', 'one-piece', 'attack-on-titan', 'death-note', 'fullmetal-alchemist-brotherhood',
         'demon-slayer-kimetsu-no-yaiba', 'jujutsu-kaisen', 'dragon-ball-z', 'dragon-ball-super', 'spy-x-family',
         'one-punch-man', 'chainsaw-man', 'bleach', 'my-hero-academia', 'solo-leveling', 'hunter-x-hunter-2011']
DORAMA = ['squid-game', 'all-of-us-are-dead', 'crash-landing-on-you', 'business-proposal', 'true-beauty',
          'extraordinary-attorney-woo', 'king-the-land', 'queen-of-tears', 'hometown-cha-cha-cha', 'vincenzo',
          'descendants-of-the-sun', 'goblin', 'its-okay-to-not-be-okay', 'the-glory', 'weak-hero-class-1',
          'my-demon', 'strong-woman-do-bong-soon', 'hidden-love']
ARTISTS = ['Anitta', 'Marília Mendonça', 'Henrique e Juliano', 'Matheus e Kauan', 'Gusttavo Lima', 'Luan Santana',
           'Matuê', 'Veigh', 'MC Cabelinho', 'MC Ryan SP', 'Pedro Sampaio', 'Alok', 'Zé Neto e Cristiano', 'Nattan',
           'Wesley Safadão', 'Xand Avião', 'João Gomes', 'Grelo', 'Léo Foguete', 'Jorge e Mateus', 'Cazuza',
           'Legião Urbana', 'Chico Buarque', 'Tim Maia', 'Caetano Veloso', 'Taylor Swift', 'Bad Bunny', 'The Weeknd',
           'BTS', 'BLACKPINK', 'Dua Lipa', 'Billie Eilish', 'Ariana Grande', 'Rihanna', 'Drake', 'Michael Jackson',
           'Bruno Mars', 'Coldplay', 'Ed Sheeran']


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--home-html', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    cards = public_cards(Path(args.home_html).read_text())
    cards.append({'href': '/pt-BR/movie/leprechaun', 'label': 'Leprechaun'})
    cards.extend({'href': '/pt-BR/show/' + slug, 'kind': 'Anime', 'label': slug} for slug in ANIME)
    cards.extend({'href': '/pt-BR/show/' + slug, 'kind': 'Dorama', 'label': slug} for slug in DORAMA)
    unique = {c['href']: c for c in cards}
    tasks = [('plex', c['href'], plex_item, c) for c in unique.values()]
    tasks.extend(('music', a, music_items, a) for a in ARTISTS)
    tasks.extend(('book', s, book_items, s) for s in ['fantasy', 'science_fiction', 'romance', 'horror', 'mystery', 'young_adult', 'brazilian_literature', 'portuguese_literature'])
    rows, errors, seen = [], [], set()
    output = Path(args.output)

    def save():
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps({'items': rows, 'errors': errors, 'collected_at': STAMP}, ensure_ascii=False, indent=2))

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        pending = {executor.submit(fn, value): (group, label) for group, label, fn, value in tasks}
        for index, future in enumerate(concurrent.futures.as_completed(pending), 1):
            group, label = pending[future]
            try:
                result = future.result()
                for row in result if isinstance(result, list) else [result]:
                    key = (row['type'], norm(row['title']), norm(row.get('artist') or row.get('author')))
                    if key not in seen and row.get('cover'):
                        seen.add(key)
                        rows.append(row)
            except Exception as error:
                errors.append({'source': group, 'reference': label, 'error': type(error).__name__})
            save()
            print(json.dumps({'completed': index, 'total': len(tasks), 'items': len(rows), 'errors': len(errors), 'last': group}), flush=True)
    print(json.dumps({'output': str(output), 'items': len(rows), 'errors': len(errors)}), flush=True)


if __name__ == '__main__':
    main()
