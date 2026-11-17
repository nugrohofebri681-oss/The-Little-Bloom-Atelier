# The Little Bloom Atelier 🌹

A mobile-first 3D bouquet atelier, currently in **P2.2.1 development**.

## Current build

- Bouquet editing: add, select, arrange, undo/redo, save/load, preview.
- Built-in procedural rose as a fallback.
- **Rose by symension123**: genuine, converted GLB model with mobile-optimized geometry and textures.
- Catalog manifest: `assets/manifest.json`.
- P2.2.1 stability: a secondary GLTFLoader CDN mirror, handled clipboard permission rejection, and confirmation controls that reset cleanly.
- Validation and Android rendering still in progress; this is not yet a production release.

## Run

Serve this repository through HTTP(S) (e.g. GitHub Pages or a local development server), then open `index.html`. Opening directly as `file://` can block manifest/GLB loading.

The app fetches Three.js r128 and GLTFLoader from CDNs, so first load needs internet access.

## Verify source and models

With Node.js 20+ run `node tests/source-smoke.mjs`. It checks inline JavaScript syntax, manifest entries, attribution metadata, installed GLB headers and file lengths. **It does not verify browser rendering, visual quality, or Android FPS.**

## Model provenance and credits

**Rose** — original model by **symension123** on [Sketchfab](https://sketchfab.com/3d-models/rose-5d4ad325925c4b4b8a8b4969b367f91a).

The model is identified as **Creative Commons Attribution (CC BY)**. The *exact CC BY version* remains to be checked on its source page before a public release is declared final. Attribution is required.

Changes include FBX→GLB conversion, material/texture packaging, texture resizing, stem proportion adjustment, and mesh simplification. The source author does not endorse this project.

See `assets/LICENSES.md` for further details.

## Mobile acceptance gate

Test on Samsung Galaxy A05:
1. Rose appears as available and renders in the Flowers catalog.
2. Add flowers; selection, transforms and Auto Arrange work.
3. Undo/Redo and Save/Load survive page refresh.
4. Preview and quality changes work without mesh duplication.
5. Check FPS, draw calls and memory behaviour at 5, 12 and 30 flowers.

**Do not assume Android performance is verified simply because the GLB structure validates.**
