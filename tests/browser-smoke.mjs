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
    assert.match(await page.locator('#diag').textContent(),/First frame/);
    assert.equal(await page.locator('#stats').isVisible(),false,'debug stats must be hidden in the normal editor');
    await page.locator('#bPerf').click();
    assert.equal(await page.locator('#stats').isVisible(),true,'Stats button should reveal diagnostics');
    await page.locator('#bPerf').click();
    assert.equal(await page.locator('#stats').isVisible(),false,'Stats button must restore clean preview');
    item.steps.push('first WebGL frame');
    await page.locator('[data-tab="flowers"]').click();
    // Keep testing only after manifest fetch and licensed model parse.
    await page.waitForFunction(()=>document.querySelector('#panel')?.innerText.includes('Asset manifest: 2 entries'),null,{timeout:30000});
    await page.waitForFunction(()=>document.querySelector('#panel')?.innerText.includes('1 loaded external'),null,{timeout:30000});
    item.steps.push('manifest and real GLB');

    const button=page.locator('[data-add="rose-sym-5d4ad32"]');
    assert.equal(await button.isDisabled(),false,'Sketchfab rose must be available');
    await button.click();
    if(label==='android-mobile'){
      await page.waitForFunction(()=>{
        const q=window.__atelierQA?.();
        return q?.sheetCompact && q?.selectedScreen &&
          q.selectedScreen.y>q.safe.top+10 && q.selectedScreen.y<q.safe.bottom-10;
      },null,{timeout:15000});
      item.mobileAddUI=await page.evaluate(()=>window.__atelierQA());
      assert.equal(await page.locator('#sheetHandle').getAttribute('aria-expanded'),'false');
      // A canvas tap on the selected flower's projected center must open
      // precision editing; the target gets a 38px touch tolerance on mobile.
      const target=item.mobileAddUI.selectedScreen;
      await page.mouse.click(target.x,target.y);
      await page.waitForFunction(()=>{
        const q=window.__atelierQA?.();
        return q?.selectedId!==null && q?.panelVisible &&
          document.querySelector('[data-m="adv"]')?.getAttribute('aria-pressed')==='true';
      },null,{timeout:15000});
      item.steps.push('tap-to-select opens advanced panel');
      await page.locator('#sheetHandle').click();
      assert.equal(await page.locator('#sheetHandle').getAttribute('aria-expanded'),'false');
      await page.locator('#sheetHandle').click();
      assert.equal(await page.locator('#sheetHandle').getAttribute('aria-expanded'),'true');
      await page.locator('[data-m="adv"]').click();
      const before=Number(await page.locator('[data-k="x"]').inputValue());
      await page.locator('[data-nudge="x:.01"]').click();
      const after=Number(await page.locator('[data-k="x"]').inputValue());
      assert.ok(after>before,'precision nudge should move selected flower');
      await page.waitForFunction(()=>{
        const q=window.__atelierQA?.();
        return q?.selectedScreen && q.selectedScreen.y>q.safe.top && q.selectedScreen.y<q.safe.bottom;
      },null,{timeout:10000});
      item.mobileEditUI=await page.evaluate(()=>window.__atelierQA());
      await page.locator('[data-a="done"]').click();
      assert.equal(await page.locator('#sheetHandle').getAttribute('aria-expanded'),'false');
      await page.locator('#sheetHandle').click();
      item.steps.push('mobile collapse / safe focus / precision nudge');
      await page.screenshot({path:'test-results/android-safe-edit.png',fullPage:true});
    }
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
    await page.waitForFunction(()=>document.querySelector('#toast')?.textContent.includes('Design loaded'),null,{timeout:10000});
    await page.locator('[data-s="exp"]').click();
    const restored=JSON.parse(await page.locator('#js').inputValue());
    assert.equal(restored.items.length,design.items.length,'load restores flower count');
    item.steps.push('new / load');
    // Import a design referencing a missing model: the flower must NOT be discarded.
    const missing={...restored.items[0],id:999,n:999,a:'imp-unavailable-rose',x:0.2,y:0.34,z:0.2,r:0,s:1};
    const withMissing={...restored,items:[...restored.items,missing]};
    await page.locator('#js').fill(JSON.stringify(withMissing));
    await page.locator('[data-s="imp"]').click();
    await page.waitForFunction(()=>document.querySelector('#toast')?.textContent.includes('1 unavailable model'),null,{timeout:10000});
    await page.locator('[data-s="exp"]').click();
    const safe=JSON.parse(await page.locator('#js').inputValue());
    assert.equal(safe.items.length,withMissing.items.length,'missing asset remains in the design');
    assert.ok(safe.items.some(x=>x.a==='imp-unavailable-rose'),'unknown asset ID must survive');
    item.steps.push('missing model preserved');

    // Arrangement choices must stay editable, undoable, and compatible with v1 JSON.
    await page.locator('[data-tab="arrange"]').click();
    await page.locator('[data-m="simple"]').click();
    assert.equal(await page.locator('#layout').inputValue(),'dome');
    await page.locator('#layout').selectOption('garden');
    await page.locator('[data-tab="save"]').click();
    await page.locator('[data-s="exp"]').click();
    assert.equal(JSON.parse(await page.locator('#js').inputValue()).layout,'garden');
    await page.locator('#bUndo').click();
    await page.locator('[data-s="exp"]').click();
    assert.equal(JSON.parse(await page.locator('#js').inputValue()).layout,'dome');
    await page.locator('#bRedo').click();
    await page.locator('[data-s="exp"]').click();
    assert.equal(JSON.parse(await page.locator('#js').inputValue()).layout,'garden');
    item.steps.push('floral layout and undo/redo');

    // P2.7: wrapping is real scene geometry, customizable, undoable and persisted.
    await page.locator('[data-tab="style"]').click();
    let wrapping=await page.evaluate(()=>window.__atelierQA().wrap);
    assert.equal(wrapping.enabled,true);
    assert.equal(wrapping.paper,'champagne');
    assert.equal(await page.evaluate(()=>window.__atelierQA().wrapVisible),true);
    const geometry=await page.evaluate(()=>window.__atelierQA());
    assert.equal(geometry.paperMeshCount,1,'one visible folded sleeve for efficient rendering');
    assert.ok(geometry.paperTriangles>450,'the sleeve should have multi-ring 3D folds');
    assert.ok(geometry.bowDepth>.04,'bow must have real 3D depth instead of flat shapes');
    await page.locator('[data-fold="fan"]').click();
    assert.equal((await page.evaluate(()=>window.__atelierQA().wrap)).fold,'fan');
    await page.locator('[data-fold="petal"]').click();
    assert.equal((await page.evaluate(()=>window.__atelierQA().wrap)).fold,'petal');
    await page.locator('#bUndo').click();
    assert.equal((await page.evaluate(()=>window.__atelierQA().wrap)).fold,'fan');
    await page.locator('#bRedo').click();
    assert.equal((await page.evaluate(()=>window.__atelierQA().wrap)).fold,'petal');
    await page.locator('[data-fold="fan"]').click();
    item.steps.push('multi-ring paper folds / 3D bow volume / preset undo');
    if(label==='android-mobile')await page.screenshot({path:'test-results/android-fan-fold.png',fullPage:true});
    await page.locator('[data-paper="sage"]').click();
    await page.locator('[data-bow="champagne"]').click();
    wrapping=await page.evaluate(()=>window.__atelierQA().wrap);
    assert.equal(wrapping.paper,'sage');
    assert.equal(wrapping.bow,'champagne');
    assert.equal(await page.evaluate(()=>window.__atelierQA().paperColor),0x9baf99);
    await page.locator('[data-ribbon-toggle]').click();
    assert.equal((await page.evaluate(()=>window.__atelierQA().wrap)).ribbon,false);
    await page.locator('#bUndo').click();
    assert.equal((await page.evaluate(()=>window.__atelierQA().wrap)).ribbon,true);
    await page.locator('#bRedo').click();
    assert.equal((await page.evaluate(()=>window.__atelierQA().wrap)).ribbon,false);
    await page.locator('[data-ribbon-toggle]').click();
    await page.locator('[data-wrap-toggle]').click();
    assert.equal(await page.evaluate(()=>window.__atelierQA().wrapVisible),false);
    await page.locator('#bUndo').click();
    assert.equal(await page.evaluate(()=>window.__atelierQA().wrapVisible),true);
    item.steps.push('wrapping palette / ribbon toggle / undo/redo');
    if(label==='android-mobile')await page.screenshot({path:'test-results/android-florist-style.png',fullPage:true});
    await page.locator('[data-tab="save"]').click();
    await page.locator('[data-s="exp"]').click();
    const wrapped=JSON.parse(await page.locator('#js').inputValue());
    assert.equal(wrapped.wrap.paper,'sage');
    assert.equal(wrapped.wrap.bow,'champagne');
    assert.equal(wrapped.wrap.fold,'fan');
    // P2.7 designs with wrapping but without the new fold property remain classic.
    const olderWrap={...wrapped,wrap:{...wrapped.wrap}};
    delete olderWrap.wrap.fold;
    await page.locator('#js').fill(JSON.stringify(olderWrap));
    await page.locator('[data-s="imp"]').click();
    await page.waitForFunction(()=>window.__atelierQA?.().wrap.fold==='classic',null,{timeout:10000});
    // Older v1 designs do not have a wrapping key: keep their former bare-stem appearance.
    const legacy={...wrapped};delete legacy.wrap;
    await page.locator('#js').fill(JSON.stringify(legacy));
    await page.locator('[data-s="imp"]').click();
    await page.waitForFunction(()=>window.__atelierQA?.().wrapVisible===false,null,{timeout:10000});
    assert.equal((await page.evaluate(()=>window.__atelierQA().wrap)).enabled,false);
    await page.locator('#js').fill(JSON.stringify(wrapped));
    await page.locator('[data-s="imp"]').click();
    await page.waitForFunction(()=>window.__atelierQA?.().wrapVisible===true,null,{timeout:10000});
    assert.equal((await page.evaluate(()=>window.__atelierQA().wrap)).paper,'sage');
    assert.equal((await page.evaluate(()=>window.__atelierQA().wrap)).fold,'fan');
    item.steps.push('legacy save compatibility / florist style restore');

    // P2.9: optional personalized 3D card, one cached CanvasTexture, safe JSON restore.
    assert.equal(await page.evaluate(()=>window.__atelierQA().tagVisible),false);
    await page.locator('[data-tab="style"]').click();
    await page.locator('[data-tag-toggle]').click();
    assert.equal(await page.evaluate(()=>window.__atelierQA().tagVisible),true);
    const note='Untukmu, semoga hari ini seindah bunga-bunga ini.';
    await page.locator('#tagMessage').fill(note);
    await page.locator('[data-tag-tone="sage"]').click();
    let gift=await page.evaluate(()=>window.__atelierQA());
    assert.equal(gift.tag.text,note);
    assert.equal(gift.tag.tone,'sage');
    assert.equal(gift.tagVisible,true);
    assert.ok(gift.tagPaintKey.includes(note),'gift card texture must refresh after editing');
    await page.locator('#bUndo').click();
    assert.equal((await page.evaluate(()=>window.__atelierQA().tag)).tone,'ivory');
    await page.locator('#bRedo').click();
    assert.equal((await page.evaluate(()=>window.__atelierQA().tag)).tone,'sage');
    if(label==='android-mobile')
      await page.screenshot({path:'test-results/android-gift-note.png',fullPage:true});
    await page.locator('[data-tab="save"]').click();
    await page.locator('[data-s="exp"]').click();
    const withNote=JSON.parse(await page.locator('#js').inputValue());
    assert.equal(withNote.tag.text,note,'export must preserve custom message');
    assert.equal(withNote.tag.enabled,true);
    // Existing saved designs with no 'tag' key keep gift note disabled.
    const noNote={...withNote};delete noNote.tag;
    await page.locator('#js').fill(JSON.stringify(noNote));
    await page.locator('[data-s="imp"]').click();
    await page.waitForFunction(()=>window.__atelierQA?.().tagVisible===false,null,{timeout:10000});
    await page.locator('#js').fill(JSON.stringify(withNote));
    await page.locator('[data-s="imp"]').click();
    await page.waitForFunction(()=>window.__atelierQA?.().tagVisible===true,null,{timeout:10000});
    assert.equal((await page.evaluate(()=>window.__atelierQA().tag)).text,note);
    item.steps.push('3D gift note editing / tone undo / JSON / old-design support');

    await page.locator('[data-tab="preview"]').click();
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('pv')),true);
    await page.locator('#pvx').click();
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('pv')),false);
    item.steps.push('preview / exit');
    await page.screenshot({path:'test-results/'+label+'.png',fullPage:true});
    item.stats=await page.locator('#stats').textContent();

    // GPU instancing workload: verify draw calls stay nearly flat with 5, 12 and 30 REAL roses.
    // These FPS numbers use SwiftShader software rendering and are NOT Samsung A05 benchmarks.
    if(label==='android-mobile'){
      while((await page.locator('#bQ').innerText()).trim()!=='Quality: Low'){
        await page.locator('#bQ').click();
      }
      item.bouquetBenchmarks=[];
      const template=design.items.find(x=>x.a==='rose-sym-5d4ad32');
      let baselineCalls=null;
      for(const count of [5,12,30]){
        const items=Array.from({length:count},(_,i)=>{
          const angle=i*2.399963229728653,rad=Math.min(.55,.08*Math.sqrt(i));
          return {...template,id:i+1,n:i+1,a:'rose-sym-5d4ad32',
            x:+(rad*Math.cos(angle)).toFixed(4),y:+(.36-rad*.13).toFixed(4),
            z:+(rad*Math.sin(angle)).toFixed(4),r:0,s:1};
        });
        await page.locator('#js').fill(JSON.stringify({...design,items}));
        await page.locator('[data-s="imp"]').click();
        await page.locator('[data-tab="arrange"]').click();
        await page.waitForFunction(n=>document.querySelector('#panel')?.innerText.includes(n+'/30 flowers'),count,{timeout:30000});
        await page.waitForTimeout(1300);
        const stats=await page.locator('#stats').textContent();
        const calls=Number(stats.match(/Draw calls (\d+)/)?.[1]);
        const fps=Number(stats.match(/(\d+) fps/)?.[1]);
        assert.ok(Number.isFinite(calls)&&calls>0,'missing draw-call measurement');
        if(baselineCalls===null)baselineCalls=calls;
        assert.ok(calls<=baselineCalls+6,'draw calls unexpectedly scale with repeated models: '+calls+' > '+baselineCalls);
        assert.equal(await page.locator('#err').evaluate(el=>getComputedStyle(el).display),'none','fatal error during stress');
        const paperMouthRadius=await page.evaluate(()=>window.__atelierQA().paperMouthRadius);
        assert.ok(Number.isFinite(paperMouthRadius)&&paperMouthRadius>=.176,'adaptive wrapping must report a valid mouth radius');
        if(count===30)assert.ok(paperMouthRadius>.38,'large bouquets need a wider paper sleeve: '+paperMouthRadius);
        item.bouquetBenchmarks.push({count,calls,fps,paperMouthRadius,stats:stats.replaceAll('\n',' ')});
        if(count===30){
          await page.locator('#bReset').click();
          await page.waitForTimeout(700);
          const radius=Number(await page.locator('#stats').getAttribute('data-view-radius'));
          assert.ok(radius>1.4,'Fit must zoom out enough for a full 30-rose mobile bouquet: '+radius);
          item.fitRadius=radius;
          const fit=await page.evaluate(()=>window.__atelierQA());
          item.mobileFitUI=fit;
          assert.ok(fit.safe.height>100,'a usable viewport must remain above editing controls');
          await page.screenshot({path:'test-results/android-30-roses.png',fullPage:true});
        }
        await page.locator('[data-tab="save"]').click();
      }
      item.steps.push('5 / 12 / 30 real-rose GPU instancing');
      console.log('BENCHMARK',JSON.stringify(item.bouquetBenchmarks));
    }
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
