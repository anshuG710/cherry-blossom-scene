# Quality plan based on the Sakura River reference

Reference: `20261003-1846-08.3101027.mp4`, 10.77 seconds, 1918 × 904 at 30 recorded frames per second. Inspected sampled frames across the clip, including a full-resolution frame at 2 seconds. The camera moves from a landscape view into the blossom canopy. The UI indicates Dawn, Medium quality, and Petal storm. Its scene FPS display reads approximately 9–11 in inspected frames; recorded frame rate is not scene render performance.

## Visual target

A cinematic, stylized natural landscape: pale peach sunlight near the horizon, lavender sky and distant mountains, dark foreground branches, bright pink-white flowers, rich green grass, long directional shadows, and a broad sparkling reflection on the river. Close-up flowers remain visibly geometric, so matching this reference does not require photographic rendering.

The clip contains no night transition or bench close-up. Night lantern glow must be reviewed separately against the user's lighting request.

## Implementation order

1. **Lighting and atmosphere — highest impact.** In `src/main.js`, coordinate the visible sky sun and directional light: currently the sky uses a fixed sun direction while the actual light moves with time of day. Lower the dawn sun angle, retain long shadows, and reduce fill enough to preserve foreground contrast. Add layered, restrained cloud detail to the existing sky shader and tune distance haze toward lavender. Maintain readable shadows when walking or sitting. Compare the sky, canopy, and river at the same dawn setting before increasing bloom.

2. **River reflections.** In `src/details.js` and `src/landscape.js`, tune the existing water shader toward directional, varied ripples and a coherent sun reflection. Keep reflection distortion small enough for tree silhouettes to remain recognizable. Blend bank edges with wet-earth color, sparse stones, and irregular foam. Test reflection refresh during camera movement: reduced update frequency must not cause visible stepping or stale reflections.

3. **Blossoms and bark.** Reuse the existing instanced five-petal flowers, vein texture, bark bump detail, and sheen. Improve petal curvature and pink centers only for nearby flowers, vary cluster size and orientation, and leave gaps that reveal branches. Tie the thin-petal light effect to sun direction rather than relying only on view angle. Use simpler geometry farther away; the current single geometry choice is made at startup and does not adapt with camera distance. Validate both the wide view and a close canopy view.

4. **Grass and landscape depth.** Increase variation in grass length, hue, and wind phase; place dense detail near the camera and simpler coverage farther away. Add a small set of instanced distant tree silhouettes to separate meadow, wooded ridge, and mountains. Preserve the existing house, bridge, benches, river route, and walking collision boundaries. Reproduce the reference's depth and contrast first; its pagoda and other landmarks are optional art additions.

5. **Bridge and far-bank bench lighting.** Review the recently added halos and point lights at dusk and night. Keep a bright bulb core, a soft amber halo, and localized illumination on wood and ground. Check occlusion so halos disappear behind solid objects. Tune exposure and bloom together to avoid clipping flower detail or washing out the scene. The reference's dawn lanterns provide a color/placement cue, not evidence for night glow intensity.

6. **Performance and finishing.** Measure frame time and draw calls before raising density. Keep geometry and textures shared, use distance-based detail, bound transparent petal overdraw, and avoid lamp shadow maps unless visual review proves them necessary. Check adaptive-quality recovery and reflection costs with all seven exterior lamps active. Keep bloom restrained and preserve the reference palette across quality tiers; Balanced currently bypasses both bloom and color grading, so check for a palette jump during automatic tier changes.

## Review and acceptance

- Capture fixed wide, river, canopy, bridge, and far-bank bench views before and after at the same viewport and time setting.
- Review dawn for reference matching, then dusk and night for lantern glow. Check petals and water while the camera moves, not only in still frames.
- Aim for 60 FPS on the review desktop and a stable 30 FPS on a constrained device, with adaptation enabled. These are targets to measure, not guarantees; hardware must be recorded with results.
- No obvious halo squares, flower shimmer, detached shadows, harsh bank seams, or reflection stepping. Nearby flowers should retain pink centers and readable petal shapes.
- Run existing landscape, navigation, lantern, and adaptive-quality checks, then build and inspect in-browser after each meaningful stage.

Begin with lighting/sky alignment and water. They affect most of the screen and should be approved visually before spending the render budget on more geometry.

## Implementation review

Implemented coordinated sky/sun/water directions, lower golden-hour lighting, layered sky detail, lavender distance haze, finer river ripples, reduced reflection distortion, sun-directed petal backlighting, curved petals, distance-based blossom geometry and shadows, grass flutter, and an instanced woodland depth plane. Balanced now retains color grading. Bloom respects zero intensity, and adaptive sampling starts immediately rather than waiting for four simulated seconds. Camera movement forces fresh water reflections.

Existing checks plus distant-blossom triangle/silhouette checks pass. Golden hour and night were inspected in the local browser with no reported rendering errors. Saved review captures: `quality-dawn.png` and `quality-night.png`. Preview: http://localhost:5174/.

Remaining optional work: a hardware-specific FPS benchmark, desktop wide-view and close-canopy comparisons, and additional landmark art. No measured FPS improvement or pixel-identical reference match is claimed.

## Blender realism pass

Installed Blender 5.2.2 from its official distribution after SHA-256 verification. `scripts/build-blender-assets.py` now generates the editable `scene-assets.blend`, a Cycles studio preview, and locally bundled web geometry and surface maps. Lanterns use detailed shared metalwork and frosted globes; the woodland uses instanced irregular crowns. Bridge, benches, house timber, terrain and rocks have surface detail. Materials receive a baked sky environment, and grass has root-to-tip variation.

Mesh integrity, lantern, navigation and landscape tests pass; the production build passes. Daylight and night render in-browser. The narrow browser viewport limits landmark comparison, and controls were slow with two simultaneous WebGL tabs. No hardware-specific FPS improvement has been measured. The detailed bundled assets increase the production JavaScript payload to about 2.83 MB (1.11 MB gzip).
