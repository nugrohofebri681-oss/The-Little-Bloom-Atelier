/**
 * Browser regression tests for The Little Bloom Atelier.
 * Runs against the locally-served site; tests functionality, not real Android GPU FPS.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium, devices} from 'playwright';

const host='http://127.0.0.1:8765';
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
mkdirSync('test-results',{recursive:true});
let browser;
const report=[];
async function runCase(label,options){
  const context=await browser.newContext(options);
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const item={label,errors,steps:[],stats:''};
  report.push(item);
  try{
    await page.goto(host,{waitUntil:'domcontentloaded',timeout:45000});
    // No WebGL context should fail silently: wait for either a first frame or fatal screen.
    await page.waitForFunction(()=>{
      const err=document.querySelector('#err');
      const load=document.querySelector('#load');
      return (err&&getComputedStyle(err).display==='flex')||(load&&getComputedStyle(load).display==='none');
    },null,{timeout:65000});
    const error=await page.locator('#err').evaluate(el=>getComputedStyle(el).display);
    assert.notEqual(error,'flex','app startup fatal: '+await page.locator('#err').innerText());
    assert.match(await page.locator('#diag').innerText(),/First frame/);
    item.steps.push('first WebGL frame');
    await page.locator('[data-tab="flowers"]').click();
    // Keep testing only after manifest fetch and licensed model parse.
    await page.waitForFunction(()=>document.querySelector('#panel')?.innerText.includes('Asset manifest: 2 entries'),null,{timeout:30000});
    await page.waitForFunction(()=>document.querySelector('#panel')?.innerText.includes('1 loaded external'),null,{timeout:30000});
    item.steps.push('manifest and real GLB');

    const button=page.locator('[data-add="rose-sym-5d4ad32"]');
    assert.equal(await button.isDisabled(),false,'Sketchfab rose must be available');
    await button.click();
    assert.equal(await page.locator('#bUndo').isDisabled(),false);
    await page.locator('#bUndo').click();
    assert.equal(await page.locator('#bRedo').isDisabled(),false);
    await page.locator('#bRedo').click();
    item.steps.push('add / undo / redo');

    await page.locator('#bQ').click();
    assert.match(await page.locator('#bQ').innerText(),/Quality:/);
    item.steps.push('quality rebuild');

    await page.locator('[data-tab="save"]').click();
    await page.locator('[data-s="save"]').click();
    await page.locator('[data-s="exp"]').click();
    const json=await page.locator('#js').inputValue();
    const design=JSON.parse(json);
    assert.ok(design.items.length>=6,'export has new flower');
    assert.ok(design.items.some(x=>x.a==='rose-sym-5d4ad32'),'real rose in design');
    item.steps.push('save / export');

    // Return to Save controls; staged confirmation requires a second click.
    await page.locator('[data-s="new"]').click();
    await page.locator('[data-s="new"]').click();
    await page.locator('[data-s="load"]').click();
    await page.locator('[data-s="load"]').click();
    await page.locator('[data-s="exp"]').click();
    const restored=JSON.parse(await page.locator('#js').inputValue());
    assert.equal(restored.items.length,design.items.length,'load restores flower count');
    item.steps.push('new / load');
    // Import a design referencing a missing model: the flower must NOT be discarded.
    const missing={...restored.items[0],id:999,n:999,a:'imp-unavailable-rose',x:0.2,y:0.34,z:0.2,r:0,s:1};
    const withMissing={...restored,items:[...restored.items,missing]};
    await page.locator('#js').fill(JSON.stringify(withMissing));
    await page.locator('[data-s="imp"]').click();
    await page.locator('[data-s="exp"]').click();
    const safe=JSON.parse(await page.locator('#js').inputValue());
    assert.equal(safe.items.length,withMissing.items.length,'missing asset remains in the design');
    assert.ok(safe.items.some(x=>x.a==='imp-unavailable-rose'),'unknown asset ID must survive');
    item.steps.push('missing model preserved');

    await page.locator('[data-tab="preview"]').click();
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('pv')),true);
    await page.locator('#pvx').click();
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('pv')),false);
    item.steps.push('preview / exit');
    await page.screenshot({path:'test-results/'+label+'.png',fullPage:true});
    item.stats=await page.locator('#stats').innerText();
    assert.deepEqual(errors,[],'page errors');
    console.log('PASS',label,item.steps.join(' | '),item.stats.replaceAll('\n',' '));
  }catch(e){
    item.failure=String(e?.stack||e);
    item.diag=await page.locator('#diag').innerText().catch(()=>null);
    item.fatal=await page.locator('#err').innerText().catch(()=>null);
    await page.screenshot({path:'test-results/'+label+'-failed.png',fullPage:true,timeout:5000}).catch(()=>{});
    throw e;
  }finally{await context.close()}
}
try{
  await sleep(1000);
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader']});
  await runCase('desktop',{viewport:{width:1280,height:800},deviceScaleFactor:1});
  await runCase('android-mobile',{...devices['Pixel 5'],viewport:{width:393,height:851}});
}finally{
  writeFileSync('test-results/report.json',JSON.stringify(report,null,2));
  await browser?.close();
  server.kill();
}
