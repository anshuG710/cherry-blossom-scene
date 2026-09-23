# Safe Place

A procedural, real-time Three.js cherry blossom valley. No image or video backdrop is used.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates the production bundle in `dist`; `npm run preview` serves it.

## Controls

Drag to orbit; scroll or pinch to zoom. The bottom panel adjusts wind, petals, river flow, daylight, fog and bloom. Cinematic camera slowly orbits; manual camera interaction disables it. Reset camera eases back to the opening composition.

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

## Bench listening sequence

Click Listen to move the camera to the bench, watch the character sit and put on headphones, and start the ambient preview. Return to landscape or Reset camera cancels the sequence and playback. To add the final song, put it in `public/music/` and set `url`, `title`, and `description` in `src/music-config.js`. A browser that blocks delayed media playback may require pressing Play once the character is seated.

Petal intensity controls both the number of airborne petals and their descent rate. Landed petals have a separate bounded pool, so accumulation no longer reduces the continuing fall. Ground petals remain visible for up to 100 seconds before recycling.

## Share a single HTML file

Run `npm run export:html` to create `share/Safe Place.html`. Send this file as a document and open it in a WebGL2-capable browser. The scene, styles, and ambient music are embedded; offline system fonts replace Google Fonts. A song selected from your device is not included in the export. Phone document previews may not execute JavaScript; hosting the website is preferable for a universally accessible phone link.

## Living environment

Lightweight physical approximations coordinate spring-damped branches, shared wind, ripples, cloud drift, cooler-hour mist, and a wind-driven lantern pendulum. The lantern brightens at dusk. Six fish on mobile (ten on desktop) swim below the reflective surface within the riverbanks, with reduced nighttime activity. Two birds flap and glide through the wind and settle into the canopy at night. These are artistic behavior models, not a scientific ecosystem simulation. Local audio playback has no streaming-service fee; the current chooser accepts one audio file, not service playlists.
