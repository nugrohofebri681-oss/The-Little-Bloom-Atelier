# The Little Bloom Atelier 🌹

A mobile-first 3D bouquet atelier, currently in **P2.9 development**.

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
- **P2.5 floral arrangements:** choose Romantic Dome, Florist Spiral, or Wild Garden under Arrange (Simple). Changing a pattern is undoable, and the choice is included in new design exports without breaking older v1 JSON files.
- **P2.5 true portrait Fit:** the Fit button and smart auto-fit account for narrow horizontal field of view, automatically zooming out as needed for large bouquets instead of using the old 1.4 camera-distance ceiling. Canvas interactions can still zoom and rotate; presets keep the same flower assets.
- **P2.5 scene lifecycle:** obsolete instancing groups are detached when no longer needed; model sharing remains enabled.
- **P2.6 mobile editing:** the bottom editor sheet can be expanded or collapsed with a large touch handle (or a vertical swipe on that handle). After adding a flower it collapses, allowing a larger canvas.
- **Unobstructed safe zone:** camera projection centers the scene inside the actual space between the header and editing controls. The Fit command accounts for the reduced visible viewport and keeps the flower arrangement itself unchanged.
- **Focused editing:** selecting a flower on canvas opens Arrange → Advanced, focuses the camera toward it and keeps it visible above the controls. A 38px screen-space fallback makes small petals easier to tap on phones. Direct touch sliders display numeric values; precise nudges step X/Z/Y by 0.01 units. **Done** collapses the sheet.
- **Preview:** hides header, menus and overlays for a clean 3D presentation. Save data remains backward-compatible with design schema v1.
- **P2.7 lightweight florist wrapping:** procedural, folded 3D paper sleeve with lining, optional ribbon collar and bow. Nothing new needs to be downloaded; no premium 3D flowers are falsely labeled installed. Wrapping is deliberately below the flowers and is not selectable during floral editing.
- **P2.7 styling:** Style → Florist presentation toggles paper and ribbon; choose Champagne, Blush, Sage or Ivory paper and four ribbon colors. All selections participate in Undo/Redo and Save/Load/JSON exports. New bouquets start wrapped; older v1 design JSON without a `wrap` property loads with its original bare-stem appearance.
- **P2.8 sculpted paper and satin ribbon:** multi-ring pleats, a rolled-over lip and dimensional satin bow loops/tails replace the flatter P2.7 presentation. Three prebuilt paper silhouettes are available under Style → Florist presentation: Classic Folds, Fan Pleats and Petal Edge. Changing silhouettes does not fetch a new asset or duplicate flower geometry. The active silhouette is saved with the bouquet and participates in Undo/Redo.
- **P2.8 design compatibility:** P2.7 JSON with wrapping but no silhouette defaults to Classic Folds; older bare-stem v1 JSON still loads without forcing wrapping on.
- **P2.8.1 visual QA refinements:** reviewed actual Android-size and desktop Chromium screenshots. The sleeve mouth expands with the arrangement's radial spread while keeping the tied waist narrow, and the paper lip sits lower on large bouquets to avoid hiding bloom heads. Vertices are updated only when the arrangement width changes, with no new textures or per-frame allocation.
- **Clean editor default:** debug diagnostics and performance stats are hidden initially, available on demand via the **Stats** button. This prevents technical overlays from obstructing the bouquet in mobile portrait view.
- **P2.9 personalized gift note:** optional 3D card tied to the wrapping, with up to 80 characters of plain text, and Ivory/Blush/Sage card themes. Customize it under **Style → Personal gift tag**. The design uses one small 512×320 CanvasTexture; the card's artwork is repainted only when the text or theme changes, not every animation frame. Card selection doesn't interrupt flower picking.
- **P2.9 saved design compatibility:** note text, theme and visibility are included in the existing v1 JSON format and undo history. Earlier designs without the `tag` field load with the note switched off, preserving their original appearance. Text is drawn on a canvas and escaped in the editor, not injected as HTML. Enabling a tag also enables its paper wrapping.
- Validation and physical Android performance still in progress; this is not yet a production release.

## Run

Serve this repository through HTTP(S) (e.g. GitHub Pages or a local development server), then open `index.html`. Opening directly as `file://` can block manifest/GLB loading.

The app fetches Three.js r128 and GLTFLoader from CDNs, so first load needs internet access.

## Verify source and models

With Node.js 20+ run `node tests/source-smoke.mjs`. It checks inline JavaScript syntax, manifest entries, attribution metadata, installed GLB headers and file lengths. **It does not verify browser rendering, visual quality, or Android FPS.**

## Browser regression tests

A GitHub Actions job runs `tests/browser-smoke.mjs` in a headless Chromium desktop viewport and an Android-sized emulated mobile viewport. It checks basic editing, load/save, missing-model preservation and repeated real GLB flowers (5, 12, 30), including whether draw calls remain bounded. P2.5 also verifies arrangement selection, undo/redo, and the mobile Fit camera on 30 roses. P2.6 adds mobile panel collapse/expand, focus checks against the actual safe rectangle, and precision nudge tests. P2.7 tests color palettes, wrapping and ribbon toggles, undo/redo, preserved old JSON behavior, and visibility while handling 30 real roses. P2.8 adds paper silhouette changes, geometry depth checks, and tests for older wrapped designs without a fold property. The latest test also checks the Stats on/off control and that the 30-rose sleeve expands beyond the small-bouquet width. P2.9 also exercises gift-note text input, texture updates, color undo/redo and backward-compatible saved designs. The workflow uploads screenshots and a JSON result as the **browser-review** artifact.

The Android-sized run uses **software-rendered Chromium**: displayed FPS does **not** predict physical Samsung Galaxy A05 performance, temperature, memory pressure or battery usage.

P2.4 reference run (Chromium/SwiftShader, Low mode):

| Real rose count | Reported triangles | Draw calls |
| ---: | ---: | ---: |
| 5 | 82.4k | 24 |
| 12 | 197.9k | 24 |
| 30 | 494.6k | 24 |

This confirms that draw calls stayed flat under instancing in the test environment. **It does not establish acceptable frame pacing on the phone.**

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

1. Confirm that the Sketchfab rose appears and responds to rotation and selection. Tap **Flowers**, add a rose, and confirm the editor sheet collapses to leave the preview unobstructed.
2. Tap the sheet's **Edit** handle to expand it; choose **Arrange → Advanced**, tap a flower on canvas, and check its head appears above the panel. Adjust X/Y/Z and try the 0.01 nudge buttons and **Done**.
3. Open/close the panel while editing and rotate/pinch the canvas; confirm no flower coordinates change unless you edit or re-arrange them.
4. Open **Style** and test Classic Folds, Fan Pleats and Petal Edge. Check their paper silhouettes, color swatches, ribbon toggles and bow colors. Make sure the wrapping remains below the roses while rotating the bouquet and does not block selecting flowers.
5. Open **Style → Personal gift tag**: enable the card, enter a short message, change card colors and check that the 3D note stays attached to the wrapper and doesn't interfere with choosing flowers.
6. Assemble 5, then 12, then 30 flowers. Inspect FPS and responsiveness after each addition.
7. Test Undo/Redo, Save/Load, Preview, camera pinch zoom, and the 30-flower scene.
8. Switch to Medium only if the phone stays responsive and cool. If the renderer feels sluggish, return to Low.
9. Confirm designs remain after refreshing, and that unavailable imports keep their original IDs.

This acceptance gate requires a **physical device**; CI completion is not physical-device approval.

