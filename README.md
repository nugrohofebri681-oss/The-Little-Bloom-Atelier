# The Little Bloom Atelier 🌹

A mobile-first 3D bouquet atelier, currently in **P2.4 development**.

## Current build

- Bouquet editing: add, select, arrange, undo/redo, save/load, preview.
- Built-in procedural rose as a fallback.
- **Rose by symension123**: genuine, converted GLB model with mobile-optimized geometry and textures.
- Catalog manifest: `assets/manifest.json`.
- P2.2.1 stability: a secondary GLTFLoader CDN mirror, handled clipboard permission rejection, and confirmation controls that reset cleanly.
- **P2.3** keeps missing imported flowers in saved designs and renders procedural placeholders rather than silently dropping them. Restoring the GLB preserves the original ID in the exported JSON.
- **P2.3 mobile budget** caps the pixel ratio and shadow map size for Android/iOS; manual Low, Medium and High quality remain available.
- **P2.4 real-rose GPU instancing:** repeated rigid GLB flowers share renderer batches by geometry and material, rather than incurring a new draw call for every copy. Selection maps each hit back to its flower ID. Browsers without WebGL instancing use the original meshes.
- **P2.4 Android-first defaults:** Low quality starts automatically on Android/iOS, switching off expensive shadows; Medium and High remain selectable. Controls form a two-row toolbar at phone widths. Full-resolution assets and credits are unchanged.
- Validation and Android rendering still in progress; this is not yet a production release.

## Run

Serve this repository through HTTP(S) (e.g. GitHub Pages or a local development server), then open `index.html`. Opening directly as `file://` can block manifest/GLB loading.

The app fetches Three.js r128 and GLTFLoader from CDNs, so first load needs internet access.

## Verify source and models

With Node.js 20+ run `node tests/source-smoke.mjs`. It checks inline JavaScript syntax, manifest entries, attribution metadata, installed GLB headers and file lengths. **It does not verify browser rendering, visual quality, or Android FPS.**

## Browser regression tests

A GitHub Actions job runs `tests/browser-smoke.mjs` in a headless Chromium desktop viewport and an Android-sized emulated mobile viewport. It checks basic editing, load/save, missing-model preservation and repeated real GLB flowers (5, 12, 30), including whether draw calls remain bounded. The workflow uploads screenshots and a JSON result as the **browser-review** artifact.

The Android-sized run uses **software-rendered Chromium**: displayed FPS does **not** predict physical Samsung Galaxy A05 performance, temperature, memory pressure or battery usage.

Run locally with Node 22+, Python 3 and installed Playwright Chromium:
```sh
npm install --no-save playwright@1.58.2
npx playwright install chromium
node tests/browser-smoke.mjs
```

## Model provenance and credits

**Rose** — original model by **symension123** on [Sketchfab](https://sketchfab.com/3d-models/rose-5d4ad325925c4b4b8a8b4969b367f91a).

The model is identified as **Creative Commons Attribution (CC BY)**. The *exact CC BY version* remains to be checked on its source page before a public release is declared final. Attribution is required.

Changes include FBX→GLB conversion, material/texture packaging, texture resizing, stem proportion adjustment, and mesh simplification. The source author does not endorse this project.

See `assets/LICENSES.md` for further details.

## Android device acceptance gate

On a physical Samsung Galaxy A05, open the served site in Chrome, select **Stats**, and check the following in **Low** quality first. Use a fresh browser tab or save/export your design before stress testing.

1. Confirm that the Sketchfab rose appears and responds to rotation and selection.
2. Assemble 5, then 12, then 30 flowers. Inspect FPS and responsiveness after each addition.
3. Test Undo/Redo, Save/Load, Preview, camera pinch zoom, and the 30-flower scene.
4. Switch to Medium only if the phone stays responsive and cool. If the renderer feels sluggish, return to Low.
5. Confirm designs remain after refreshing, and that unavailable imports keep their original IDs.

This acceptance gate requires a **physical device**; CI completion is not physical-device approval.

## Mobile acceptance gate

Test on Samsung Galaxy A05:
1. Rose appears as available and renders in the Flowers catalog.
2. Add flowers; selection, transforms and Auto Arrange work.
3. Undo/Redo and Save/Load survive page refresh.
4. Preview and quality changes work without mesh duplication.
5. Check FPS, draw calls and memory behaviour at 5, 12 and 30 flowers.

**Do not assume Android performance is verified simply because the GLB structure validates.**
