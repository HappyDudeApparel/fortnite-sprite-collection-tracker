from pathlib import Path
import base64, json, re, time, zipfile, hashlib
import requests

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / 'index.html'
OUT404 = ROOT / '404.html'
SW = ROOT / 'service-worker.js'
VERSION = ROOT / 'version.json'
DIST = ROOT / 'dist'
VERSION_STR = '2.0.17'


def must_replace(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)


def download_image(session, url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://fortnite.gg/sprites',
    }
    last = None
    for attempt in range(4):
        try:
            r = session.get(url, headers=headers, timeout=35, allow_redirects=True)
            r.raise_for_status()
            ctype = (r.headers.get('content-type') or '').split(';',1)[0].strip().lower()
            data = r.content
            if not ctype.startswith('image/'):
                raise RuntimeError(f'non-image response {ctype!r}')
            if len(data) < 1000:
                raise RuntimeError(f'image response too small ({len(data)} bytes)')
            return ctype, data
        except Exception as exc:
            last = exc
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f'Could not download {url}: {last}')


source = INDEX.read_text(encoding='utf-8')
if "const APP_VERSION='2.0.16'" not in source:
    raise RuntimeError('Exact deployed v2.0.16 index was not checked out.')

asset_urls = sorted(set(re.findall(r'https://fortnite[.]gg/img/x/sprites/icons/[^"\'<>\\s]+', source)))
if len(asset_urls) != 43:
    raise RuntimeError(f'Expected 43 runtime Sprite image URLs in deployed v2.0.16, found {len(asset_urls)}')

session = requests.Session()
asset_map = {}
for n, url in enumerate(asset_urls, 1):
    ctype, data = download_image(session, url)
    uri = f'data:{ctype};base64,' + base64.b64encode(data).decode('ascii')
    asset_map[url] = uri
    print(f'Embedded asset {n:02d}/{len(asset_urls)}: {url.rsplit("/",1)[-1]} ({len(data):,} bytes)')

embedded = source
for url, uri in asset_map.items():
    embedded = embedded.replace(url, uri)
if 'fortnite.gg' in embedded.lower():
    raise RuntimeError('Asset embedding left a forbidden runtime host reference in index source.')

(ROOT / 'qa-baseline-v2016.html').write_text(embedded, encoding='utf-8')

html = embedded
html = must_replace(html, '<title>Sprite Collection Locker — v2.0.16</title>', '<title>Sprite Collection Locker — v2.0.17</title>', 'page title version')
html = must_replace(html, "const APP_VERSION='2.0.16'", "const APP_VERSION='2.0.17'", 'app version')

old_state = "let favorites=new Set(JSON.parse(storage.getItem(STORE.favorites)||'[]').map(Number));let levels=JSON.parse(storage.getItem(STORE.levels)||'{}');let selectedId="
new_state = "let favorites=new Set(JSON.parse(storage.getItem(STORE.favorites)||'[]').map(Number));let levels=JSON.parse(storage.getItem(STORE.levels)||'{}');for(const id of favorites){const n=Number(levels[id]);levels[id]=Number.isFinite(n)&&n>=1?Math.min(5,Math.round(n)):1}storage.setItem(STORE.levels,JSON.stringify(levels));let selectedId="
html = must_replace(html, old_state, new_state, 'saved level migration')

old_helpers = "function isCollectible(s){return s&&s.countsTowardCollection!==false&&!s.preview&&s.status!=='Vaulted'&&!LEGACY_FAMILIES.includes(displayFamily(s))}function isAcquired(s){return favorites.has(s.id)}"
new_helpers = "function isCollectible(s){return s&&s.countsTowardCollection!==false&&!s.preview&&s.status!=='Vaulted'&&!LEGACY_FAMILIES.includes(displayFamily(s))}const NON_LEVEL_VARIANTS=new Set(['Gem','Cube','Quack']);function isLevelInteractive(s){return isCollectible(s)&&!NON_LEVEL_VARIANTS.has(s.variantKey)}function isAcquired(s){return favorites.has(s.id)}"
html = must_replace(html, old_helpers, new_helpers, 'interactive eligibility helper')

old_cycle = "function cycleSmall(s){if(!s)return;if(!isCollectible(s)){return}if(!isAcquired(s)){favorites.add(s.id);levels[s.id]=Math.max(1,levelOf(s));}else if(levelOf(s)<5){levels[s.id]=5;}else{favorites.delete(s.id);levels[s.id]=1;}saveState();renderMain();if(activeTab==='locker')renderLocker()}"
new_cycle = "function cycleSmall(s){if(!s||!isLevelInteractive(s))return;if(!isAcquired(s)){favorites.add(s.id);levels[s.id]=1}else{const next=levelOf(s)+1;if(next<=5)levels[s.id]=next;else{favorites.delete(s.id);delete levels[s.id]}}saveState();renderMain();if(activeTab==='locker')renderLocker()}function setSmallLevel(s,level){if(!s||!isLevelInteractive(s))return;const next=Math.max(1,Math.min(5,Math.round(Number(level)||1)));favorites.add(s.id);levels[s.id]=next;saveState();renderMain();if(activeTab==='locker')renderLocker()}function levelBarsHtml(s){if(!isLevelInteractive(s))return '';const level=isAcquired(s)?levelOf(s):0;return `<span class=\"spriteLevelBars ${level===5?'mastered':''}\" aria-label=\"${level?`Level ${level}`:'Missing'}\">${[1,2,3,4,5].map(n=>`<span class=\"spriteLevelBar ${level>=n?'filled':''}\" data-level-id=\"${s.id}\" data-level=\"${n}\" title=\"Set Level ${n}\"></span>`).join('')}</span>`}"
html = must_replace(html, old_cycle, new_cycle, 'six-state click cycle')

html = must_replace(html, "const openInstead=!isCollectible(s)||s.preview;", "const openInstead=!isLevelInteractive(s)||s.preview;", 'noninteractive card behavior')
old_cell = 'return `<button class="${cls}" data-variant="${s.variantKey}" data-family="${fam}"${attr} title="${s.name}"><img loading="lazy" src="${s.image}" alt="${s.name}"></button>`;'
new_cell = 'return `<button class="${cls}" data-variant="${s.variantKey}" data-family="${fam}"${attr} title="${s.name}"><img loading="lazy" src="${s.image}" alt="${s.name}">${levelBarsHtml(s)}</button>`;'
html = must_replace(html, old_cell, new_cell, 'level bars markup')

old_bind = "document.querySelectorAll('[data-small]').forEach(b=>b.onclick=e=>{e.stopPropagation();cycleSmall(byId(b.dataset.small))});"
new_bind = "document.querySelectorAll('[data-small]').forEach(b=>b.onclick=e=>{e.stopPropagation();cycleSmall(byId(b.dataset.small))});document.querySelectorAll('[data-level-id]').forEach(bar=>{bar.onpointerdown=e=>e.stopPropagation();bar.onclick=e=>{e.preventDefault();e.stopPropagation();setSmallLevel(byId(bar.dataset.levelId),Number(bar.dataset.level))}});"
html = must_replace(html, old_bind, new_bind, 'direct bar binding')

css = r'''
<style id="v2017-five-level-bars">
/* v2.0.17 — five-level card indicator. Absolute positioning preserves v2.0.16 row geometry. */
.spriteCell .spriteLevelBars{
  position:absolute;left:50%;bottom:1px;transform:translateX(-50%);z-index:6;
  width:min(62px,calc(100% - 10px));height:11px;display:flex;align-items:center;gap:2px;
  opacity:.94;pointer-events:auto
}
.spriteCell .spriteLevelBar{position:relative;display:block;flex:1 1 0;height:11px;min-width:0;cursor:pointer;touch-action:manipulation}
.spriteCell .spriteLevelBar:before{content:'';position:absolute;left:0;right:0;top:50%;height:3px;transform:translateY(-50%);border-radius:999px;background:rgba(162,179,210,.22);box-shadow:inset 0 0 0 1px rgba(255,255,255,.045);transition:background .14s ease,box-shadow .14s ease,transform .14s ease}
.spriteCell .spriteLevelBar.filled:before{background:linear-gradient(90deg,#38d8ff,#7c6cff);box-shadow:0 0 5px rgba(64,216,255,.54)}
.spriteCell .spriteLevelBars.mastered .spriteLevelBar:before{background:linear-gradient(90deg,#e8a929,#ffe36a);box-shadow:0 0 6px rgba(255,210,67,.72)}
.spriteCell .spriteLevelBar:hover:before,.spriteCell .spriteLevelBar:focus-visible:before{transform:translateY(-50%) scaleY(1.55)}
.spriteCell.missing .spriteLevelBars{opacity:.72}
@media(max-width:760px){
  .spriteCell .spriteLevelBars{width:min(48px,calc(100% - 8px));height:10px;bottom:0;gap:1.5px}
  .spriteCell .spriteLevelBar{height:10px}
  .spriteCell .spriteLevelBar:before{height:2.5px}
}
</style>
<!-- v2.0.17: sequential Levels 1–5, direct level bars, safe saved-progress migration, self-contained Sprite artwork. -->
'''
html = must_replace(html, '</body></html>', css + '</body></html>', 'v2.0.17 CSS insertion')

if 'fortnite.gg' in html.lower():
    raise RuntimeError('Forbidden runtime host reference remains in final HTML.')
for required in ["const APP_VERSION='2.0.17'", 'id="v2017-five-level-bars"', 'function setSmallLevel', 'data-level-id', "const NON_LEVEL_VARIANTS=new Set(['Gem','Cube','Quack'])"]:
    if required not in html:
        raise RuntimeError(f'Missing required v2.0.17 marker: {required}')
if "else if(levelOf(s)<5){levels[s.id]=5;}" in html:
    raise RuntimeError('Old short mastery cycle still present.')

INDEX.write_text(html, encoding='utf-8')
OUT404.write_text(html, encoding='utf-8')

sw = """const APP_VERSION = '2.0.17';
const CACHE_NAME = `sprites-tracker-${APP_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './version.json',
  './assets/icons/favicon-32.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(cached => cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
        return response;
      }))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response && response.status === 200 && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
"""
SW.write_text(sw, encoding='utf-8')
VERSION.write_text(json.dumps({
    'version': VERSION_STR,
    'published': '2026-08-21',
    'notes': 'Five-step Sprite leveling with direct level selection, safe saved-progress migration, and fully self-contained Sprite artwork.'
}, indent=2) + '\n', encoding='utf-8')

DIST.mkdir(exist_ok=True)
zip_path = DIST / 'Sprite-Collection-Locker-v2.0.17-GitHub-overwrite.zip'
with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in [INDEX, OUT404, SW, VERSION]:
        z.write(p, p.name)

with zipfile.ZipFile(zip_path) as z:
    names = sorted(z.namelist())
    if names != ['404.html','index.html','service-worker.js','version.json']:
        raise RuntimeError(f'Unexpected ZIP contents: {names}')
    forbidden = sum(z.read(name).lower().count(b'fortnite.gg') for name in names)
    if forbidden:
        raise RuntimeError(f'Final ZIP contains {forbidden} forbidden host references.')

if "const APP_VERSION = '2.0.17';" not in SW.read_text() or 'sprites-tracker-${APP_VERSION}' not in SW.read_text():
    raise RuntimeError('Service worker version/cache mismatch.')
if json.loads(VERSION.read_text())['version'] != VERSION_STR:
    raise RuntimeError('version.json mismatch.')

print('BUILD_OK')
print(f'ZIP={zip_path}')
print(f'ZIP_SHA256={hashlib.sha256(zip_path.read_bytes()).hexdigest()}')
print('FORBIDDEN_RUNTIME_REFS=0')
