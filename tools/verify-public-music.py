#!/usr/bin/env python3
"""Verify explicit official video references through public YouTube oEmbed.

Never searches a private player, extracts audio, or requests streaming URLs.
Input: [{artist, title, video_id}]. Output keeps metadata and source evidence.
"""
import argparse
import concurrent.futures
import json
import re
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

def norm(value):
    text=unicodedata.normalize('NFKD',str(value)).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+',' ',text).strip()

def verify(row):
    video=str(row.get('video_id',''))
    if not re.fullmatch(r'[\w-]{11}',video):
        return {**row,'verified':False,'reason':'INVALID_VIDEO_ID'}
    url='https://www.youtube.com/watch?v='+video
    endpoint='https://www.youtube.com/oembed?'+urllib.parse.urlencode({'url':url,'format':'json'})
    try:
        request=urllib.request.Request(endpoint,headers={'User-Agent':'LXPlus-Catalog/1.0'})
        with urllib.request.urlopen(request,timeout=18) as response:
            if response.geturl().split('/')[2] not in ('www.youtube.com','youtube.com'):
                raise ValueError('UNEXPECTED_METADATA_HOST')
            data=json.loads(response.read(200_000))
        artist=norm(row['artist'])
        author=norm(data.get('author_name',''))
        title=norm(re.sub(r'\s*\((?:Ao Vivo|feat\.[^)]*)\)','',row['title'],flags=re.I))
        correct_artist=author in (artist,artist.replace(' ',''),artist+'vevo',artist.replace(' ','')+'vevo')
        verified=correct_artist and title in norm(data.get('title',''))
        return {**row,'verified':verified,'url':url,'metadata_endpoint':endpoint,'provider_title':data.get('title',''),'author':data.get('author_name',''),'author_url':data.get('author_url',''),'thumbnail':data.get('thumbnail_url',''),'reason':'' if verified else 'ARTIST_OR_EDITION_REQUIRES_REVIEW'}
    except (urllib.error.URLError,TimeoutError,ValueError,KeyError) as error:
        return {**row,'verified':False,'url':url,'reason':str(error)[:120]}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('input');parser.add_argument('output');args=parser.parse_args()
    with open(args.input,encoding='utf-8') as source:rows=json.load(source)
    if not isinstance(rows,list) or len(rows)>100:raise ValueError('Up to 100 explicit references per verification')
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:result=list(pool.map(verify,rows))
    with open(args.output,'w',encoding='utf-8') as dest:json.dump({'items':result},dest,ensure_ascii=False,indent=2)
    print(json.dumps({'references':len(rows),'verified':sum(x['verified'] for x in result),'pending':sum(not x['verified'] for x in result)}))

if __name__=='__main__':main()
