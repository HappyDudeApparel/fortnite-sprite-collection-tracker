from pathlib import Path
import json,re,zipfile

ROOT=Path(__file__).resolve().parent
FILES=[ROOT/'index.html',ROOT/'404.html']
old="const NON_LEVEL_VARIANTS=new Set(['Gem','Cube','Quack']);function isLevelInteractive(s){return isCollectible(s)&&!NON_LEVEL_VARIANTS.has(s.variantKey)}"
new="function isLevelInteractive(s){return isCollectible(s)}"

for p in FILES:
    s=p.read_text(encoding='utf-8')
    if old not in s:
        raise RuntimeError(f'{p.name}: expected old noninteractive helper not found')
    s=s.replace(old,new,1)
    if 'fortnite.gg' in s.lower():
        raise RuntimeError(f'{p.name}: forbidden fortnite.gg reference remains')
    if "const APP_VERSION='2.0.17'" not in s:
        raise RuntimeError(f'{p.name}: wrong app version')
    p.write_text(s,encoding='utf-8')

s=(ROOT/'index.html').read_text(encoding='utf-8')
start=s.index('const SPRITES=')+len('const SPRITES=')
sprites,_=json.JSONDecoder().raw_decode(s[start:])
c7s3=[x for x in sprites if x.get('season')=='C7S3']
legacy=[x for x in c7s3 if x.get('countsTowardCollection') is False or x.get('preview') or x.get('status')=='Vaulted']
live=[x for x in c7s3 if x.get('countsTowardCollection') is not False and not x.get('preview') and x.get('status')!='Vaulted' and (x.get('displayFamily') or x.get('family')) not in ('Dash','Superman','Legacy')]
if len(c7s3)!=119: raise RuntimeError(f'C7S3 raw roster expected 119 incl Legacy, got {len(c7s3)}')
if len(live)!=117: raise RuntimeError(f'C7S3 live/counting roster expected 117, got {len(live)}')
if len(legacy)!=2: raise RuntimeError(f'C7S3 Legacy/non-counting expected 2, got {len(legacy)}')
if {x.get('name') for x in legacy}!={'Dash Sprite','Superman Sprite'}:
    raise RuntimeError(f'Unexpected C7S3 non-counting entries: {[x.get("name") for x in legacy]}')
variants={}
for x in live: variants[x.get('variantKey')]=variants.get(x.get('variantKey'),0)+1
for required in ('Gem','Cube','Quack'):
    if variants.get(required,0)<1: raise RuntimeError(f'Expected live C7S3 {required} entries')
if "function isLevelInteractive(s){return isCollectible(s)}" not in s:
    raise RuntimeError('All collectible Sprites are not level-interactive')
if 'NON_LEVEL_VARIANTS' in s:
    raise RuntimeError('Old Gem/Cube/Quack level exclusion still present')

# Rebuild minimal overwrite ZIP.
dist=ROOT/'dist';dist.mkdir(exist_ok=True)
zip_path=dist/'Sprite-Collection-Locker-v2.0.17-GitHub-overwrite.zip'
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for name in ('index.html','404.html','service-worker.js','version.json'):
        z.write(ROOT/name,name)
with zipfile.ZipFile(zip_path) as z:
    if sorted(z.namelist())!=['404.html','index.html','service-worker.js','version.json']:
        raise RuntimeError('ZIP content mismatch')
    if sum(z.read(n).lower().count(b'fortnite.gg') for n in z.namelist()):
        raise RuntimeError('ZIP contains forbidden fortnite.gg reference')

print('C7S3_QA_OK')
print('C7S3_RAW=119')
print('C7S3_LIVE_COUNTING=117')
print('C7S3_LEGACY_NONCOUNTING=2')
print('C7S3_VARIANTS='+json.dumps(variants,sort_keys=True))
print('ALL_C7S3_LIVE_LEVEL_INTERACTIVE=YES')
print('FORTNITE_GG_REFS=0')
print('ZIP='+str(zip_path))
