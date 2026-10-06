#!/usr/bin/env python3
"""Verify actual MP4 codec/first-frame bytes before a catalog import.

Only bounded prefixes are kept in the QA cache, never complete film uploads.
The input is the collector report; the output is a sanitized import manifest.
"""
import argparse
import concurrent.futures
import hashlib
import json
import subprocess
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

UA = 'LXPlus-OpenFilms/1.0'

def verify(item, cache):
    for value in [item['mediaKey'], item['cover']]:
        parsed = urllib.parse.urlsplit(value)
        if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.hostname not in ('archive.org', 'studio.blender.org', 'download.blender.org'):
            raise ValueError('UNAPPROVED_MEDIA_HOST')
    url = item['mediaKey']; key = hashlib.sha256(url.encode()).hexdigest(); path = cache / (key + '.mp4')
    proof = None
    for limit in [1048576, 4194304]:
        if not path.exists() or path.stat().st_size < limit and not proof:
            request = urllib.request.Request(url, headers={'User-Agent': UA, 'Range': f'bytes=0-{limit - 1}'})
            with urllib.request.urlopen(request, timeout=25) as response:
                if response.status != 206 or not response.headers.get('Content-Range', '').startswith('bytes 0-'):
                    raise ValueError('RANGE_FAILED')
                path.write_bytes(response.read(limit))
        result = subprocess.run(['ffprobe', '-v', 'error', '-read_intervals', '%+#20', '-show_streams', '-show_format', '-show_frames', '-show_entries', 'stream=codec_name,codec_type,width,height:format=duration:frame=width,height', '-of', 'json', str(path)], capture_output=True, text=True, timeout=20)
        try: data = json.loads(result.stdout)
        except ValueError: data = {}
        video = next((s for s in data.get('streams', []) if s.get('codec_type') == 'video'), {})
        audio = next((s for s in data.get('streams', []) if s.get('codec_type') == 'audio'), {})
        frames = [f for f in data.get('frames', []) if f.get('width', 0) > 0]
        duration = float(data.get('format', {}).get('duration') or 0)
        if video.get('codec_name') == 'h264' and audio.get('codec_name', 'none') in ('aac', 'mp3', 'none') and frames and duration > 0:
            proof = {'status': 'verified', 'url': url, 'videoCodec': 'h264', 'audioCodec': audio.get('codec_name', 'none'), 'width': video['width'], 'height': video['height'], 'durationSeconds': duration, 'decodedFirstFrame': True, 'bytesChecked': path.stat().st_size, 'checkedAt': datetime.now(timezone.utc).isoformat()}
            break
    if not proof: raise ValueError('NATIVE_CODEC_OR_FIRST_FRAME_FAILED')
    cover_key = hashlib.sha256(item['cover'].encode()).hexdigest(); cover_path = cache / (cover_key + '.image')
    if not cover_path.exists():
        with urllib.request.urlopen(urllib.request.Request(item['cover'], headers={'User-Agent': UA}), timeout=25) as response:
            mime = response.headers.get('Content-Type', '').split(';')[0]; content = response.read(1048577)
            if not mime.startswith('image/') or len(content) > 1048576: raise ValueError('COVER_DOWNLOAD_FAILED')
            cover_path.write_bytes(content); cover_path.with_suffix('.mime').write_text(mime)
    item['openFilmEvidence']['codecProbe'] = proof
    item['durationSeconds'] = round(proof['durationSeconds']); item['duration'] = f"{max(1, round(proof['durationSeconds'] / 60))} min"
    return item

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('input'); parser.add_argument('output'); parser.add_argument('--cache', required=True); args = parser.parse_args()
    report = json.loads(Path(args.input).read_text()); cache = Path(args.cache); cache.mkdir(parents=True, exist_ok=True)
    items, failed = [], []
    def task(item):
        try: return verify(item, cache), None
        except Exception as error: return None, {'provider': item['sourceProvider'], 'id': item['externalId'], 'reason': str(error)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for count, (item, error) in enumerate(pool.map(task, report['items']), 1):
            if item: items.append(item)
            if error: failed.append(error)
            output = {**report, 'items': items, 'verificationFailures': failed, 'verified': count, 'complete': count == len(report['items'])}
            Path(args.output).write_text(json.dumps(output, ensure_ascii=False, indent=2))
            print(json.dumps({'verified': count, 'candidates': len(report['items']), 'accepted': len(items), 'last': item['title'] if item else error}), flush=True)

if __name__ == '__main__': main()
