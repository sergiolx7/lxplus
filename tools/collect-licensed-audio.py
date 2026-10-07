#!/usr/bin/env python3
"""Download a bounded selection published by its creator under CC BY 4.0.

This command prepares files and evidence only. It never writes to the site DB.
"""
import argparse
import concurrent.futures
import hashlib
import json
import subprocess
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

def collect(piece, destination):
    url = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/' + urllib.parse.quote(piece['filename'])
    request = urllib.request.Request(url, headers={'User-Agent': 'LXPlus-LicensedAudio/1.0'})
    with urllib.request.urlopen(request, timeout=25) as response:
        final = urllib.parse.urlsplit(response.url)
        if final.scheme != 'https' or final.hostname not in ('incompetech.com', 'www.incompetech.com', 'static.incompetech.com'):
            raise ValueError('UNAPPROVED_REDIRECT')
        content = response.read(25_000_001)
        if len(content) > 25_000_000:
            raise ValueError('AUDIO_TOO_LARGE')
    code = piece['isrc']
    local = destination / (code + '.mp3')
    local.write_bytes(content)
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(local)], check=True, capture_output=True, text=True, timeout=20)
    info = json.loads(probe.stdout)
    streams = info['streams']
    if not any(s.get('codec_name') == 'mp3' and s.get('codec_type') == 'audio' for s in streams):
        raise ValueError('NOT_MP3')
    duration = float(info['format']['duration'])
    expected = sum(int(n) * (60 ** i) for i, n in enumerate(reversed(piece['length'].split(':'))))
    if abs(duration - expected) > 5:
        raise ValueError('WRONG_DURATION')
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(local), '-t', '3', '-f', 'null', '-'], check=True, capture_output=True, timeout=15)
    return {
        'title': piece['title'], 'artist': 'Kevin MacLeod', 'isrc': code,
        'year': int(piece['uploaded'][:4]), 'releasedAt': piece['uploaded'],
        'duration': round(duration), 'file': str(local),
        'sourceUrl': url, 'sha256': hashlib.sha256(content).hexdigest(),
        'bytes': len(content), 'mimeType': 'audio/mpeg',
        'path': 'licensed/20261007/music/' + code + '.mp3',
        'genreCode': piece.get('genre'), 'verifiedAt': datetime.now(timezone.utc).isoformat(),
        'license': {
            'name': 'CC BY 4.0', 'url': 'https://creativecommons.org/licenses/by/4.0/',
            'evidenceUrl': 'https://incompetech.com/music/royalty-free/licenses/',
            'sourceUrl': 'https://incompetech.com/music/royalty-free/index.html?isrc=' + code,
            'creator': 'Kevin MacLeod',
            'credit': piece['title'] + ' · Kevin MacLeod (incompetech.com) · CC BY 4.0',
            'changes': 'Arquivo MP3 original, reproduzido sem edição pela LX Plus.'
        }
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('catalog')
    parser.add_argument('destination')
    parser.add_argument('report')
    args = parser.parse_args()
    catalog = json.loads(Path(args.catalog).read_text())
    selection = [p for p in catalog if (p.get('uploaded') or '') >= '2023-01-01' and p.get('length', '') < '00:15:00']
    favorites = {'Carefree', 'Life of Riley', 'Sneaky Snitch', 'Monkeys Spinning Monkeys', 'Cipher', 'Fluffing a Duck'}
    selection += [p for p in catalog if p.get('title') in favorites and p not in selection]
    destination = Path(args.destination)
    destination.mkdir(parents=True, exist_ok=True)
    items, failures = [], []
    def task(piece):
        try:
            return collect(piece, destination), None
        except Exception as error:
            return None, {'title': piece['title'], 'reason': str(error)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for item, failure in pool.map(task, selection):
            if item:
                items.append(item)
            if failure:
                failures.append(failure)
            Path(args.report).write_text(json.dumps({'items': items, 'failures': failures, 'complete': False}, ensure_ascii=False, indent=2))
            print(json.dumps({'accepted': len(items), 'failed': len(failures), 'last': item['title'] if item else failure}), flush=True)
    Path(args.report).write_text(json.dumps({'items': items, 'failures': failures, 'complete': True}, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
