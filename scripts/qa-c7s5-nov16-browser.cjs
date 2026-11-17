/* Browser smoke-test of v2.0.65, independent of saved real-user progress. */
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
      const zee=page.locator('.familyRow[data-family="Zee"]');
      assert.equal(await zee.count(),1,'Zee family must appear');
      assert((await zee.locator('.familyName').innerText()).includes('Zee'),'Zee name must display before ownership');
      assert.equal(await zee.locator('img').count(),2,'Original Zee portrait should display twice without claiming');
      await page.waitForFunction(()=>{const row=document.querySelector('.familyRow[data-family="Zee"]');return !!row&&[...row.querySelectorAll('img')].length===2&&[...row.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0);},null,{timeout:20000});
      assert.equal(await zee.locator('[data-small="544"]').count(),1,'Zee must retain level/ownership control');
      await page.locator('button.tab[data-tab="locker"]').click();
      await page.waitForSelector('#lockerBaseGrid');
      assert.equal(await page.locator('[data-locker-family="Zee"]').count(),1,'Unowned Zee must be available in Vault');
      await page.locator('button.tab[data-season="C7S5"]').click();
      await zee.locator('button[data-small="544"]').first().click();
      assert.equal(await zee.locator('img').count(),2,'Zee artwork should remain visible after claiming');
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForSelector('#summary .sumNum');
      await page.locator('button.tab[data-season="C7S5"]').click();
      assert((await page.locator('.familyRow[data-family="Zee"] .familyName').innerText()).includes('Zee'),'Zee visible after saved ownership reload');
      for(let j=0;j<5;j++) await page.locator('.familyRow[data-family="Zee"] button[data-small="544"]').first().click();
      assert((await page.locator('.familyRow[data-family="Zee"] .familyName').innerText()).includes('Zee'),'Zee visible after clearing ownership');
      await page.locator('button.tab[data-tab="locker"]').click();
      assert.equal(await page.locator('[data-locker-family="Zee"]').count(),1,'Zee must remain in Vault after clearing');
      await page.locator('button.tab[data-season="C7S5"]').click();
      const sweet=page.locator('.familyRow[data-family="Sweet Dreams"]');
      assert.equal(await sweet.count(),1,'Sweet Dreams missing from Treasure Hunters');
      assert.equal(await sweet.locator('.spriteCell img').count(),1,'Sweet Dreams must be Base only');
      await sweet.locator('button[data-open]').first().click();
      assert((await page.locator('#detailBadges').innerText()).includes('Mythic'),'Sweet Dreams must display Mythic');
      await page.locator('button.tab[data-season="C7S5"]').click();
      await page.locator('button.tab[data-season="C7S3"]').click();
      assert((await page.locator('#summary').innerText()).includes('117'),'C7S3 count changed');
      await page.locator('button.tab[data-season="C7S4"]').click();
      assert((await page.locator('#summary').innerText()).includes('162'),'C7S4 count changed');
      await page.locator('button.tab[data-season="C7S5"]').click();
      assert((await page.locator('#summary').innerText()).includes('59'),'C7S5 count changed after season switch');
      assert.deepEqual(pageErrors,[],'Uncaught JavaScript errors');
      console.log('PASS browser',viewport.width,'px: 59, portraits, visible Zee, Sweet Dreams Mythic, Locker, local persistence, archives');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(err=>{console.error(err);process.exit(1)});
