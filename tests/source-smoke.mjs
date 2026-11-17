/**
 * Static source smoke checks. No dependencies beyond Node.js 20+.
 * This validates source/manifest/GLB structure, NOT 3D rendering or Android FPS.
 */
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {Script} from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /<title>The Little Bloom Atelier · P2\.9<\/title>/);
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
assert.ok(scripts.length >= 3, 'expected the diagnostic, application and boot scripts');
for (const [i, block] of scripts.entries()) {
  assert.doesNotThrow(() => new Script(block[1], {filename:`inline-script-${i + 1}.js`}));
}
assert.match(html, /function loaderNext\(\)/, 'loader fallback should exist');
assert.match(html, /navigator\.clipboard\.writeText\(t\)\.catch/, 'clipboard rejection should be handled');
assert.match(html, /const its=o\.items;bq=/, 'missing assets must not be filtered from saved designs');
assert.match(html, /portable\?\[1,1\.25,1\.5\]/, 'portable GPU budget should remain');
assert.match(html, /function syncBatches\(\)/, 'GPU instance batcher should be installed');
assert.match(html, /b\.userData\.itemIds\.push/, 'instance selection IDs should be mapped');
assert.match(html, /q:portable\?0:1/, 'mobile should start in efficient low-quality mode');
assert.match(html, /function fitBouquet\(force\)/, 'portrait-aware camera fitting must be available');
assert.match(html, /layout:\["dome","spiral","garden"\]/, 'saved designs should restore arrangement presets');
assert.match(html, /id=layout/, 'arrangement selector should be visible');
assert.match(html, /function safeRect\(\)/, 'mobile unobstructed safe area calculation');
assert.match(html, /function updateSafeProjection\(\)/, 'projection changes with mobile sheet bounds');
assert.match(html, /function focusFlower\(it,zoom\)/, 'focus selected flower');
assert.match(html, /id="sheetHandle"/, 'mobile sheet toggle exists');
assert.match(html, /data-nudge="y:\.01"/, 'accessible precision controls exist');

const manifest = JSON.parse(readFileSync(new URL('../assets/manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.schema, 1);
assert.ok(Array.isArray(manifest.assets) && manifest.assets.length, 'missing manifest assets');
const seen = new Set();
let installed = 0;
for (const entry of manifest.assets) {
  assert.match(entry.id, /^[a-z0-9-]+$/);
  assert.ok(!seen.has(entry.id), 'duplicate asset ID: ' + entry.id);
  seen.add(entry.id);
  assert.ok(entry.name && entry.sci && entry.cat, 'missing catalog label');
  if (!entry.file) continue; // Planned-only assets are allowed.
  assert.match(entry.file, /^assets\/models\/[a-zA-Z0-9._-]+\.glb$/);
  assert.ok(entry.license?.name && /^https:\/\//.test(entry.license.source_url), 'missing source credit');
  assert.equal(typeof entry.license.attribution_required, 'boolean');
  assert.ok(entry.author, 'missing author credit');
  assert.ok(existsSync(new URL('../' + entry.file, import.meta.url)), 'missing model ' + entry.file);
  const model = readFileSync(new URL('../' + entry.file, import.meta.url));
  assert.ok(model.length >= 20 && model.length <= 25_000_000, 'model outside app size budget');
  assert.equal(model.toString('ascii', 0, 4), 'glTF', 'not a GLB file');
  assert.equal(model.readUInt32LE(4), 2, 'expected GLB version 2');
  assert.equal(model.readUInt32LE(8), model.length, 'GLB header length mismatch');
  installed++;
}
assert.ok(installed >= 1, 'no real flower model installed');
console.log(`PASS: ${scripts.length} inline scripts compile, ${manifest.assets.length} catalog entries, ${installed} GLB validated.`);

assert.match(html, /function sleeveGeometry\(fold\)/, 'wrapping has procedural sleeve geometry');
assert.match(html, /function syncWrapping\(\)/, 'wrapping and ribbon update without reloading GLB');
assert.match(html, /wrap:normalizeWrap\(bq\.wrap\)/, 'design exports preserve wrapping choices');
assert.match(html, /wrap:normalizeWrap\(o\.wrap,true\)/, 'old designs without wrapping remain compatible');
assert.match(html, /data-paper=/, 'wrapping colors are selectable');
assert.match(html, /data-ribbon-toggle/, 'ribbon can be toggled');

assert.match(html, /function ribbonStrip\(points,width\)/, 'satin loops use curved 3D ribbon surface');
assert.match(html, /const FOLDS=\{classic:/, 'paper silhouettes are available');
assert.match(html, /for\(const \[name,mesh\] of Object\.entries\(paperMeshes\)\)/, 'one sleeve silhouette is shown at a time');
assert.match(html, /data-fold=/, 'paper folding selector is present');

assert.match(html, /function updatePaperWidth\(\)/, 'florist paper must adapt to the bouquet spread');
assert.match(html, /id="diag" hidden/, 'diagnostic UI should be hidden by default');
assert.match(html, /id="stats" hidden/, 'performance overlay should not obscure preview');

assert.match(html, /function paintGiftTag\(\)/, 'personalized tag texture must render on the GPU');
assert.match(html, /function normalizeTag\(t\)/, 'gift messages must be normalized before display');
assert.match(html, /tag:normalizeTag\(bq\.tag\)/, 'gift message is included in design exports');
assert.match(html, /tag:normalizeTag\(o\.tag\)/, 'legacy design import has optional note');
assert.match(html, /data-tag-toggle/, 'mobile editing provides gift tag toggle');
assert.match(html, /id=tagMessage/, 'note text can be entered');
