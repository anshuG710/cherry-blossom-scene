import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ground, riverX, riverWidth } from './landscape.js';
import { torii, pagoda } from './places.js';

function merged(scene, parts, material, shadow = true) {
  const mesh = new THREE.Mesh(mergeGeometries(parts), material);
  parts.forEach(g => g.dispose());
  mesh.castShadow = shadow; mesh.receiveShadow = true; scene.add(mesh);
  return mesh;
}
const at = (geometry, x, y, z, ry = 0) => { if (ry) geometry.rotateY(ry); geometry.translate(x, y, z); return geometry; };

// Paper lanterns strung on sagging ropes between posts along both riverbanks; they glow from dusk.
function makeLanternStrings(scene) {
  const posts = [], rope = [], red = [], cream = [], caps = [];
  const sphere = new THREE.SphereGeometry(1, 12, 9);
  for (const side of [-1, 1]) {
    let previous = null;
    for (let z = -40; z <= 32; z += 4.6) {
      if (Math.abs(z - 9) < 3.4) { previous = null; continue; }   // leave the bridge clear
      const x = riverX(z) + side * (riverWidth(z) + .22), y = ground(x, z);
      posts.push(at(new THREE.CylinderGeometry(.035, .05, 2.2, 6), x, y + 1.1, z));
      const top = new THREE.Vector3(x, y + 2.1, z);
      if (previous) {
        const sag = .38;
        for (let i = 0; i < 12; i++) {
          const a = i / 12, b = (i + 1) / 12;
          const p = previous.clone().lerp(top, a); p.y -= sag * 4 * a * (1 - a);
          const q = previous.clone().lerp(top, b); q.y -= sag * 4 * b * (1 - b);
          rope.push(p.x, p.y, p.z, q.x, q.y, q.z);
        }
        [.25, .5, .75].forEach((t, k) => {
          const p = previous.clone().lerp(top, t); p.y -= sag * 4 * t * (1 - t) + .24;
          const body = sphere.clone(); body.scale(.15, .19, .15); body.translate(p.x, p.y, p.z);
          ((k + Math.round(z)) % 2 ? red : cream).push(body);
          for (const dy of [-.19, .19]) caps.push(at(new THREE.CylinderGeometry(.075, .075, .035, 8), p.x, p.y + dy, p.z));
        });
      }
      previous = top;
    }
  }
  const wood = new THREE.MeshStandardMaterial({ color: '#3b2f27', roughness: .9 });
  merged(scene, posts, wood);
  merged(scene, caps, new THREE.MeshStandardMaterial({ color: '#222', roughness: .6 }), false);
  const ropeGeometry = new THREE.BufferGeometry(); ropeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rope, 3));
  scene.add(new THREE.LineSegments(ropeGeometry, new THREE.LineBasicMaterial({ color: '#4a4038', transparent: true, opacity: .75 })));
  const redPaper = new THREE.MeshStandardMaterial({ color: '#d23a2c', emissive: '#ff5a32', emissiveIntensity: .1, roughness: .7 });
  const creamPaper = new THREE.MeshStandardMaterial({ color: '#f5e7cc', emissive: '#ffcf8a', emissiveIntensity: .1, roughness: .7 });
  merged(scene, red, redPaper, false); merged(scene, cream, creamPaper, false);
  return { update(dusk, time) {
    const flicker = 1 + Math.sin(time * 2.3) * .03;
    redPaper.emissiveIntensity = (.12 + dusk * 2.4) * flicker;
    creamPaper.emissiveIntensity = (.08 + dusk * 2.1) * flicker;
  } };
}

// Vermilion torii framing the path to the bridge.
function makeTorii(scene) {
  const red = [], black = [];
  const { x, z, span, angle } = torii;
  // Built around the origin, then placed: pillars sit at ±span along the gate's local z axis.
  for (const s of [-1, 1]) {
    red.push(at(new THREE.CylinderGeometry(.16, .19, 3.5, 12), 0, 1.75, s * span));
    black.push(at(new THREE.CylinderGeometry(.24, .26, .32, 12), 0, .16, s * span));
  }
  red.push(at(new THREE.BoxGeometry(.2, .24, span * 2 + .9), 0, 2.75, 0));          // nuki (tie beam)
  red.push(at(new THREE.BoxGeometry(.28, .3, span * 2 + 1.6), 0, 3.38, 0));          // shimaki
  red.push(at(new THREE.BoxGeometry(.18, .55, .3), 0, 3.0, 0));                       // gakuzuka strut
  // Kasagi: the black top beam with gently upswept ends.
  const kasagi = new THREE.BoxGeometry(.4, .26, span * 2 + 2.4, 1, 1, 16), p = kasagi.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = p.getZ(i) / (span + 1.2); p.setY(i, p.getY(i) + t * t * t * t * .32); }
  kasagi.computeVertexNormals(); black.push(at(kasagi, 0, 3.66, 0));
  const y = Math.min(...[-1, 1].map(s => ground(x + s * span * Math.sin(angle), z + s * span * Math.cos(angle))));
  for (const mesh of [merged(scene, red, new THREE.MeshStandardMaterial({ color: '#c63b26', roughness: .55 })),
    merged(scene, black, new THREE.MeshStandardMaterial({ color: '#1f1b1a', roughness: .6 }))]) { mesh.position.set(x, y, z); mesh.rotation.y = angle; }
}

// Five-storey pagoda on the far-left hillside, beneath Mount Fuji.
function makePagoda(scene) {
  const walls = [], roofs = [], metal = [];
  const { x, z } = pagoda, y = ground(x, z);
  walls.push(at(new THREE.BoxGeometry(6.4, .8, 6.4), x, y + .4, z));
  let height = y + .8;
  for (let i = 0; i < 5; i++) {
    const w = 4.4 - i * .5, h = 1.9 - i * .08;
    walls.push(at(new THREE.BoxGeometry(w, h, w), x, height + h / 2, z));
    height += h;
    // Wide, thin, slightly flared roof: a four-sided frustum rotated to square.
    const roof = new THREE.CylinderGeometry(w * .55, w * 1.02, .62, 4, 1); roof.rotateY(Math.PI / 4);
    const rp = roof.attributes.position;
    for (let k = 0; k < rp.count; k++) { const r = Math.hypot(rp.getX(k), rp.getZ(k)); rp.setY(k, rp.getY(k) + Math.max(0, r - w * .7) * .25); }
    roof.computeVertexNormals(); roofs.push(at(roof, x, height + .2, z));
    height += .5;
  }
  metal.push(at(new THREE.CylinderGeometry(.08, .12, 4.2, 8), x, height + 2.1, z));
  for (let r = 0; r < 7; r++) metal.push(at(new THREE.TorusGeometry(.3 - r * .02, .05, 6, 14).rotateX(Math.PI / 2), x, height + .7 + r * .38, z));
  merged(scene, walls, new THREE.MeshStandardMaterial({ color: '#8c3a28', roughness: .8 }));
  const roof = merged(scene, roofs, new THREE.MeshStandardMaterial({ color: '#34302e', roughness: .7 }));
  merged(scene, metal, new THREE.MeshStandardMaterial({ color: '#b08b4a', metalness: .7, roughness: .4 }), false);
  for (const mesh of [roof]) mesh.material.userData.haze = 1.1;
}

export function makeJapan(scene) {
  const strings = makeLanternStrings(scene);
  makeTorii(scene);
  makePagoda(scene);
  return { update(day, time) { strings.update(THREE.MathUtils.smoothstep(day, .5, .88), time); } };
}
