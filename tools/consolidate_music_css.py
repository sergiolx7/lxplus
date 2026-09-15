"""Move all old LX Music CSS into the single v28 stylesheet before final styles."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / 'dist'
MUSIC = re.compile(r'(?:lx-music|music-dock|music-cover|music-info|music-transport|music-timeline|music-right|music-provider|spotify-embed|lx-v27-(?:now|queue|spotify|album|artist|track|preview|music-search)|lx-album|lx-track-list|lx-lyrics|lx-mix|music-viz|#music)', re.I)

def boundary(source, start, opener):
    depth = 0; quote = ''; comment = False; escape = False
    for index in range(start, len(source)):
        char = source[index]; nxt = source[index:index + 2]
        if comment:
            if source[index-1:index+1] == '*/': comment = False
            continue
        if not quote and nxt == '/*': comment = True; continue
        if quote:
            if escape: escape = False
            elif char == '\\': escape = True
            elif char == quote: quote = ''
            continue
        if char in '\"\'': quote = char; continue
        if char == opener: depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0: return index
    raise ValueError('Unclosed CSS block')

def entries(source):
    index = 0
    while index < len(source):
        opening = source.find('{', index)
        if opening < 0:
            tail = source[index:].strip()
            if tail: yield tail, None
            break
        head = source[index:opening].strip()
        closing = boundary(source, opening, '{')
        yield head, source[opening+1:closing]
        index = closing + 1

def split(source):
    regular, moved = [], []
    for head, body in entries(source):
        if body is None:
            regular.append(head); continue
        cleaned = re.sub(r'/\*.*?\*/', '', head, flags=re.S).strip()
        if cleaned.startswith('@media') or cleaned.startswith('@supports'):
            keep, take = split(body)
            if keep.strip(): regular.append(f'{head}{{{keep}}}')
            if take.strip(): moved.append(f'{head}{{{take}}}')
        elif MUSIC.search(head): moved.append(f'{head}{{{body}}}')
        else: regular.append(f'{head}{{{body}}}')
    return '\n'.join(regular) + '\n', '\n'.join(moved) + '\n'

output = ROOT / 'app-v28.css'
foundation = [output.read_text()] if output.exists() else []
for filename in ('app.css', 'app-v27.css'):
    path = ROOT / filename
    keep, take = split(path.read_text())
    path.write_text(keep)
    foundation.append(take.replace('!important', ''))
output.write_text('/* LX Music v28.3 — extracted foundation and final compact layout */\n' + '\n'.join(foundation))
