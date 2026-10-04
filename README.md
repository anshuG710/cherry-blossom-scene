# Safe Place

A procedural, real-time Three.js cherry blossom valley. No image or video backdrop is used.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates the production bundle in `dist`; `npm run preview` serves it.

## Controls

Drag to orbit a full 360°; scroll or pinch to zoom. The bottom panel adjusts wind, petals, river flow, daylight, fog and bloom. Cinematic camera slowly rotates through a continuous 360° orbit; manual camera interaction disables it. Reset camera eases back to the opening composition.

## Implementation

- `src/landscape.js`: seeded terrain, eroded mountains, tapered curved branches, instanced five-petal blossoms, grass, plants, stones, petals, moving clouds and planar water reflections.
- `src/details.js`: notched and cupped blossom petals, pollen stamens, petal veins, textured cherry bark, and depth-aware water shading with shallow gravel and caustics.
- `src/main.js`: lighting, sky, post-processing, camera constraints, animation and controls.
- `src/style.css`: responsive overlay and controls.

Mobile starts with fewer blossoms, grass blades and petals, and smaller reflection and shadow maps. Sustained slow rendering reduces resolution, grass density and shadow resolution. Fog and feathered light shafts approximate atmospheric scattering; bloom and planar reflections provide the cinematic treatment without expensive volumetric ray marching. WebGL2 and hardware acceleration are required. Google Fonts is optional; local serif/sans-serif fallbacks are included.

The water uses real planar reflections with a procedural riverbed approximation for shallow-water transmission, not full screen-space refraction. Stone wakes and small surface waves follow the river speed control. Mobile uses simpler blossom geometry; desktop blossoms retain modeled pollen stamens.

Wind rotates through all directions with shared local gusts across the canopy, grass and airborne petals. Petals settle on the bank for 24 seconds before fading and recycling, or float downstream on the river. Time of day now spans golden hour, midday, sunset, blue hour and night. Night adds moonlight, stars and fireflies; bloom intensity controls emission on attached flowers only.

## Music and reviews

The Listen panel plays an original, procedurally generated ambient melody using Web Audio after the visitor presses play. It has pause and volume controls and can also loop an audio file chosen from the visitor's device; files are never uploaded. The review card saves one editable star rating and note in browser local storage, with a remove option. These are device-local reviews, not submissions to a server or a shared public review feed.

## Living room listening sequence

Click Listen to enter the house's living hall. The avatar sits on the sofa and the player appears on the physical TV, with play/pause, previous/next, shuffle, seeking and volume. Return outside, close the TV player, or reset the camera to leave and stop playback. The exterior is cut away for the interior camera so the screen stays visible on narrow displays. A browser that blocks delayed playback may require pressing Play on the TV.

## Explore on foot

Choose **Walk around**, then use WASD / arrow keys, click or tap clear ground, or hold the on-screen direction buttons. Drag to orbit the follow camera; scroll or pinch to zoom. Click destinations route around the house and tree trunks and across the wooden bridge. Riverbanks, bridge rails and the exterior house boundary constrain movement. Movement pauses while entering text, opening a dialog, or leaving the tab. Use Listen to enter the living room; free walking is outdoors.

Both blossom trees use the same wind, lighting, glow and petal simulation. The far-bank tree has a narrower, taller, asymmetrical crown. The arched bridge includes individual wood-grained planks, railings, supports and fasteners; the living room includes woven cushions, a rug, wooden flooring, a coffee table, a book, a cup, a plant and a floor lamp.

## Adaptive rendering

Exterior lanterns use shared detailed geometry with curved arms, domed caps, cage ribs and rounded lamp globes. Bridge, bench, house and interior timber share seamless color, relief and roughness maps; terrain and river stones use world-aligned surface relief. A neutral sky environment supplies soft reflections, fabric has a subtle sheen, and distant trees use irregular broadleaf crowns.

To recreate the art in Blender, run `blender --background --python scripts/build-blender-assets.py` from this directory. It writes runtime meshes and surface maps to `src/assets/blender`, an editable `scene-assets.blend`, and a studio preview. The web fallback is `python scripts/bake-surfaces.py` (requires Pillow), followed by `node scripts/build-web-assets.mjs`. Runtime art is bundled locally and does not need Blender to run.

Device CPU/memory hints and input capabilities choose the starting budget. Sustained slow frames reduce render resolution, shadow cost, reflection frequency, blossom density, grass and petals. Stable recovery can restore quality up to the starting budget. Eco bypasses post-processing; Balanced includes color grading and High adds bloom. Nearby blossoms use detailed geometry on High, while distant flowers use fewer than half the triangles and skip flower shadows. Lantern halos work at every quality level. Reflections refresh more frequently while the camera moves to avoid stale viewpoints. Pixel count is capped on large displays, and background tabs skip simulation/rendering. The footer reports the current budget and measured FPS. These are best-effort budgets, not an FPS guarantee; the scene still requires WebGL2. `npm test` covers bridge routing, collisions, lantern lighting, blossom detail budgets and quality adaptation in addition to the environment simulation.

Petal intensity controls both the number of airborne petals and their descent rate. Landed petals have a separate bounded pool, so accumulation no longer reduces the continuing fall. Ground petals remain visible for up to 100 seconds before recycling.

## Share a single HTML file

Run `npm run export:html` to create `share/Safe Place.html`. Send this file as a document and open it in a WebGL2-capable browser. The scene, styles, and ambient music are embedded; offline system fonts replace Google Fonts. A song selected from your device is not included in the export. Phone document previews may not execute JavaScript; hosting the website is preferable for a universally accessible phone link.

## Living environment

Lightweight physical approximations coordinate spring-damped branches, shared wind, ripples, cloud drift, cooler-hour mist, and a wind-driven lantern pendulum. The lantern brightens at dusk. Six fish on mobile (ten on desktop) swim below the reflective surface within the riverbanks, with reduced nighttime activity. Two birds flap and glide through the wind and settle into the canopy at night. These are artistic behavior models, not a scientific ecosystem simulation. Local audio playback has no streaming-service fee; the current chooser accepts one audio file, not service playlists.
