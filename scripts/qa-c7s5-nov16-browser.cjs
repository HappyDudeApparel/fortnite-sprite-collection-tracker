/* Browser smoke-test of v2.0.63, independent of saved real-user progress. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    for (const viewport of [{width:390,height:844},{width:1440,height:900}]) {
      const page = await browser.newPage({ viewport });
      const pageErrors = [];
      page.on('pageerror', e => pageErrors.push(e.message));
      await page.goto('http://127.0.0.1:8765/index.html', {waitUntil:'domcontentloaded'});
      await page.waitForSelector('#summary .sumNum', {timeout:25000});
      await page.locator('button.tab[data-season="C7S5"]').click();
      assert(await page.locator('#summary').innerText().then(x=>x.includes('59')),'Missing C7S5 count 59');
      for(const family of ['Mini Miku','Squiplash']){
        const row=page.locator('.familyRow[data-family="'+family+'"]');
        assert.equal(await row.count(),1,'Missing family '+family);
        const imgs=row.locator('.spriteCell img');
        assert.equal(await imgs.count(),4,'Expected four variants of '+family);
        await page.waitForFunction(familyName => {const row=[...document.querySelectorAll(".familyRow")].find(x=>x.dataset.family===familyName);if(!row)return false;const images=[...row.querySelectorAll(".spriteCell img")];return images.length===4&&images.every(i=>i.complete&&i.naturalWidth>0&&i.naturalHeight>0);},family,{timeout:20000});
      }
      const oscar=page.locator('.familyRow[data-family="Sir Oscar the Second"]');
      assert.equal(await oscar.count(),1,'Sir Oscar family must be present');
      assert.equal(await oscar.locator('.spriteCell img').count(),4,'Sir Oscar requires four original portraits');
      await page.waitForFunction(()=>{const row=document.querySelector('.familyRow[data-family="Sir Oscar the Second"]');return row && [...row.querySelectorAll('.spriteCell img')].length===4 && [...row.querySelectorAll('.spriteCell img')].every(i=>i.complete&&i.naturalWidth>0);},null,{timeout:20000});
      const mystery=page.locator('.familyRow[data-family="Zee"]');
      assert.equal(await mystery.count(),1);
      assert((await mystery.innerText()).includes('Mystery Sprite'),'Zee not masked');
      assert.equal(await mystery.locator('img').count(),0,'Secret portrait leaked in overview');
      await mystery.locator('button[data-small="544"]').first().click();
      assert((await mystery.locator('.familyName').innerText()).includes('Zee'),'Secret not revealed upon ownership');
      assert.equal(await mystery.locator('img').count(),2,'Revealed Zee should have two displayed portraits');
      await page.locator('button.tab[data-tab="locker"]').click();
      await page.waitForSelector('#lockerBaseGrid');
      assert(await page.locator('[data-locker-family="Zee"]').count()===1,'Owned Zee absent from Locker');
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForSelector('#summary .sumNum');
      await page.locator('button.tab[data-season="C7S5"]').click();
      assert((await page.locator('.familyRow[data-family="Zee"] .familyName').innerText()).includes('Zee'),'Zee owned state not persisted');
      for(let j=0;j<5;j++)await page.locator('.familyRow[data-family="Zee"] button[data-small="544"]').first().click();
      assert((await page.locator('.familyRow[data-family="Zee"] .familyName').innerText()).includes('Mystery Sprite'),'Unowned Zee did not hide again');
      await page.locator('button.tab[data-tab="locker"]').click();
      assert.equal(await page.locator('[data-locker-family="Zee"]').count(),0,'Unowned Zee leaked into Locker');
      await page.locator('button.tab[data-season="C7S3"]').click();
      assert((await page.locator('#summary').innerText()).includes('117'),'C7S3 count changed');
      await page.locator('button.tab[data-season="C7S4"]').click();
      assert((await page.locator('#summary').innerText()).includes('162'),'C7S4 count changed');
      await page.locator('button.tab[data-season="C7S5"]').click();
      assert((await page.locator('#summary').innerText()).includes('59'),'C7S5 count changed after season switch');
      assert.deepEqual(pageErrors,[],'Uncaught JavaScript errors');
      console.log('PASS browser',viewport.width,'px: 59, portraits, secret reveal/forget, Locker, local persistence, archives');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(err=>{console.error(err);process.exit(1)});
