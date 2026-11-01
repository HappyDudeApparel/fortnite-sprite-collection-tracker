#!/usr/bin/env python3
"""Strict C7S5 asset-only fetch from Fortnite.GG sprite icons (no AI, no crops)."""
import hashlib, io, json, pathlib, re, time, unicodedata, urllib.request
from PIL import Image

ROOT=pathlib.Path(__file__).resolve().parents[1]
HTML=ROOT/'index.html'
SOURCE="https://r.jina.ai/https://fortnite.gg/sprites"
def req(url):
    request=urllib.request.Request(url,headers={
      'User-Agent':'Mozilla/5.0 (compatible; SpriteCollectionLockerSourceAudit/1.0)',
      'Accept':'image/webp,image/*,*/*;q=0.8',
    })
    with urllib.request.urlopen(request,timeout=35) as r:return r.read()
def canonical(s):
    s=unicodedata.normalize('NFKD',s).casefold().replace('’',"'")
    s=re.sub(r'\bsprite\b$', '', s.strip())
    return re.sub(r'[^a-z0-9]','',s)
def main():
    html=HTML.read_text(encoding='utf-8')
    start=html.index('const SPRITES=')+len('const SPRITES=')
    end=html.index('];',start)+1
    records=json.loads(html[start:end])
    before=[x for x in records if x.get('season')!='C7S5']
    new=[x for x in records if x.get('season')=='C7S5']
    assert len(before)==281 and len(new)==33 and len(records)==314,'Unexpected baseline; stop, inspect latest version'
    print('Fetching source index',SOURCE,flush=True)
    data=req(SOURCE).decode('utf-8','replace')
    p=re.compile(r'\[!\[Image\s*\d*:\s*([^\]]+)\]\((https://fortnite\.gg/img/x/sprites/icons/[^)]+\.webp)\)\]\((https://fortnite\.gg/sprites/[^)]+)\)')
    matches=p.findall(data)
    assert len(matches)>300,(len(matches),'Canonical index incomplete')
    refs={}
    for title,url,page in matches:
      key=canonical(title)
      if key in refs: raise ValueError('Duplicate source name: '+title)
      refs[key]={'title':title,'source':url,'page':page}
    downloaded=[]
    unavailable=[]
    for x in new:
        key=canonical(x['name'])
        found=refs.get(key)
        if not found:
           unavailable.append({'name':x['name'],'id':x['id'],'reason':'Variant not listed by Fortnite.GG'})
           print('NO RELEASED SOURCE',x['name'],flush=True)
           continue
        url=found['source']
        payload=req(url)
        if not (payload[:4]==b'RIFF' and payload[8:12]==b'WEBP'):
            raise ValueError('Not a real WebP file: '+url+' '+repr(payload[:60]))
        picture=Image.open(io.BytesIO(payload));picture.load()
        if picture.size[0]<400 or picture.size[1]<400:raise ValueError('Insufficient source image resolution '+url+' '+str(picture.size))
        if len(payload)<4000:raise ValueError('Suspiciously small sprite '+url)
        if picture.getbbox() is None:raise ValueError('Empty portrait '+url)
        target=ROOT/x['image']
        if target.suffix!='.webp' or not target.as_posix().startswith(str(ROOT/'assets/sprites/c7s5/')):
            raise ValueError('Unsafe existing asset path '+str(target))
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(payload)  # exact canonical bytes, no cut, recolor, masks, AI or resize.
        item={'id':x['id'],'name':x['name'],'variant':x['variantKey'],'source':url,'detailPage':found['page'],
          'target':x['image'],'dimensions':list(picture.size),'sha256':hashlib.sha256(payload).hexdigest(),
          'bytes':len(payload),'hasAlpha':('A' in picture.getbands())}
        downloaded.append(item)
        print('OK',item['name'],str(item['dimensions']),item['bytes'],item['target'],flush=True)
    if len(downloaded)!=31 or sorted(x['name'] for x in unavailable)!=['Cursed Sweet Dreams Sprite','Fortune Sweet Dreams Sprite']:
        raise RuntimeError('Unexpected published availability, manually review sources: '+repr(unavailable))
    assert len({x['target'] for x in downloaded})==31
    assert len({x['source'] for x in downloaded})==31
    report={'fetched':'2026-11-01','source':'Fortnite.GG original in-game asset icons',
      'reference':'https://fortnite.gg/sprites','imported_count':len(downloaded),
      'NOT_FOUND_AND_LEFT_AS_OLD_PENDING':unavailable,'images':downloaded,
      'data_policy':'No Sprite entries, IDs, variant associations, ownership, mastery, counts or UI logic altered. Two Sweet Dreams provisional crops remain for separate roster decision.'}
    doc=ROOT/'docs/C7S5-CANONICAL-PORTRAITS-IMPORT.json';doc.parent.mkdir(parents=True,exist_ok=True)
    doc.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    # Version bump forces PWA cache rotation to show true portraits, not the stale sheet.
    v=ROOT/'version.json'
    raw=json.loads(v.read_text(encoding='utf-8'))
    assert raw['version']=='2.0.52', 'Review when app version changes. Never overwrite parallel Astra release.'
    raw['version']='2.0.53'
    raw['notes']='C7S5: 31 individually named original Fortnite.GG Sprite portrait WebPs replace mislabeled collage crops. Two Sweet Dreams variants have no authentic published portraits; pending separate roster correction. No Sprite data, functionality or archives modified.'
    raw['artwork']={'kind':'unmodified source Sprite icons (WebP)','count':31,'source':'Fortnite.GG',
      'status':'31 verified by exact matching named Fortnite.GG sprite detail page; 2 unverified Sweet Dreams variants remain pending and are NOT claimed authentic',
      'manifest':'docs/C7S5-CANONICAL-PORTRAITS-IMPORT.json'}
    v.write_text(json.dumps(raw,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    sw=ROOT/'service-worker.js'
    swtxt=sw.read_text(encoding='utf-8')
    assert '2.0.52' in swtxt
    sw.write_text(swtxt.replace('2.0.52','2.0.53'),encoding='utf-8')
    wm=ROOT/'manifest.webmanifest'
    wtxt=wm.read_text(encoding='utf-8')
    assert 'index.html?v=2.0.52' in wtxt
    wm.write_text(wtxt.replace('index.html?v=2.0.52','index.html?v=2.0.53'),encoding='utf-8')
    am=ROOT/'asset-manifest.json'
    obj=json.loads(am.read_text(encoding='utf-8'))
    assert obj['version']=='2.0.52'
    obj['version']='2.0.53'
    am.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    # Only version markers in HTML; source dataset remains byte-identical.
    htxt=html.replace("const APP_VERSION='2.0.52'","const APP_VERSION='2.0.53'").replace('<title>Sprite Collection Locker — v2.0.52</title>','<title>Sprite Collection Locker — v2.0.53</title>')
    assert htxt!=html and htxt[htxt.index('const SPRITES=')+len('const SPRITES='):htxt.index('];',htxt.index('const SPRITES='))+1]==html[start:end]
    HTML.write_text(htxt,encoding='utf-8')
    print('PASS: 31 original unmodified named WebPs; 2 unverified variants not invented; all 314 dataset entries unchanged; 281 archived entries unchanged; cache version 2.0.53')
if __name__=='__main__':main()
