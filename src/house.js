import * as THREE from 'three';
import { daylight } from './weather.js';

// ── helpers ──────────────────────────────────────────────────────────────────
function box(w, h, d, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ── materials ────────────────────────────────────────────────────────────────
function houseMaterials() {
  // Wall plaster — warm off-white
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = wallCanvas.height = 256;
  const wCtx = wallCanvas.getContext('2d');
  wCtx.fillStyle = '#8f6414';
  wCtx.fillRect(0, 0, 256, 256);
  // Subtle plaster texture
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    wCtx.fillStyle = `rgba(${180 + Math.random() * 30},${170 + Math.random() * 25},${150 + Math.random() * 20},${0.08 + Math.random() * 0.06})`;
    wCtx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const wallMap = new THREE.CanvasTexture(wallCanvas);
  wallMap.colorSpace = THREE.SRGBColorSpace;
  const wall = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.92 });

  // Dark timber
  const timber = new THREE.MeshStandardMaterial({ color: '#4a3225', roughness: 0.85 });

  // Roof tiles — dark slate
  const roofCanvas = document.createElement('canvas');
  roofCanvas.width = 512; roofCanvas.height = 256;
  const rCtx = roofCanvas.getContext('2d');
  rCtx.fillStyle = '#3a3a42';
  rCtx.fillRect(0, 0, 512, 256);
  for (let row = 0; row < 16; row++) {
    const y = row * 16;
    const offset = row % 2 ? 16 : 0;
    for (let col = -1; col < 17; col++) {
      const x = col * 32 + offset;
      rCtx.strokeStyle = '#2a2a30';
      rCtx.lineWidth = 1;
      rCtx.strokeRect(x, y, 32, 16);
      // tile shade variation
      rCtx.fillStyle = `rgba(${50 + Math.random() * 20},${50 + Math.random() * 20},${55 + Math.random() * 20},0.35)`;
      rCtx.fillRect(x + 1, y + 1, 30, 14);
    }
  }
  const roofMap = new THREE.CanvasTexture(roofCanvas);
  roofMap.colorSpace = THREE.SRGBColorSpace;
  roofMap.wrapS = roofMap.wrapT = THREE.RepeatWrapping;
  roofMap.repeat.set(2, 2);
  const roof = new THREE.MeshStandardMaterial({ map: roofMap, roughness: 0.88 });

  // Stone foundation
  const stone = new THREE.MeshStandardMaterial({ color: '#8a8477', roughness: 0.95 });

  // Window glass — transparent, emissive at night
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#89b8d4', transparent: true, opacity: 0.35,
    roughness: 0.1, metalness: 0.05,
    emissive: '#ffcc88', emissiveIntensity: 0,
    side: THREE.DoubleSide, depthWrite: false,
  });

  // Door wood
  const door = new THREE.MeshStandardMaterial({ color: '#6b4226', roughness: 0.78 });

  // Iron for lanterns
  const iron = new THREE.MeshStandardMaterial({ color: '#36372f', metalness: 0.8, roughness: 0.38 });

  // Lantern glass glow
  const lanternGlass = new THREE.MeshStandardMaterial({
    color: '#f4d8a0', transparent: true, opacity: 0.18,
    roughness: 0.15, depthWrite: false,
    emissive: '#ffae48', emissiveIntensity: 0,
  });

  // Fence wood
  const fence = new THREE.MeshStandardMaterial({ color: '#9c7b55', roughness: 0.88 });

  // Stone path
  const pathStone = new THREE.MeshStandardMaterial({ color: '#9b9585', roughness: 0.92 });

  return { wall, timber, roof, stone, glass, door, iron, lanternGlass, fence, pathStone };
}

// ── flower materials ─────────────────────────────────────────────────────────
function flowerMaterials() {
  const pink = new THREE.MeshStandardMaterial({ color: '#f2a0b5', roughness: 0.7, side: THREE.DoubleSide });
  const purple = new THREE.MeshStandardMaterial({ color: '#9b6fbd', roughness: 0.7, side: THREE.DoubleSide });
  const yellow = new THREE.MeshStandardMaterial({ color: '#f0d060', roughness: 0.7, side: THREE.DoubleSide });
  const stem = new THREE.MeshStandardMaterial({ color: '#4a7a3a', roughness: 0.9 });
  const leaf = new THREE.MeshStandardMaterial({ color: '#5a8a4a', roughness: 0.85, side: THREE.DoubleSide });
  return { pink, purple, yellow, stem, leaf };
}

// ── small flower geometry ────────────────────────────────────────────────────
function smallFlowerGeo() {
  const positions = [], indices = [];
  // 5 petals, simple
  for (let p = 0; p < 5; p++) {
    const angle = p * Math.PI * 2 / 5;
    const base = positions.length / 3;
    const cx = 0, cy = 0.01, cz = 0;
    positions.push(cx, cy, cz);
    for (let i = 0; i <= 6; i++) {
      const a = angle - 0.55 + i / 6 * 1.1;
      const r = 0.045;
      positions.push(Math.cos(a) * r, cy + 0.005, Math.sin(a) * r);
      if (i < 6) indices.push(base, base + i + 1, base + i + 2);
    }
  }
  // Center
  const c = positions.length / 3;
  positions.push(0, 0.018, 0);
  for (let i = 0; i <= 8; i++) {
    const a = i / 8 * Math.PI * 2;
    positions.push(Math.cos(a) * 0.012, 0.015, Math.sin(a) * 0.012);
    if (i < 8) indices.push(c, c + i + 1, c + i + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ── lantern builder ──────────────────────────────────────────────────────────
function makeLantern(parent, mats, x, y, z, isPost = true) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  if (isPost) {
    // Post
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 1.4, 6),
      mats.iron
    );
    post.position.y = 0.7;
    post.castShadow = true;
    group.add(post);
  }

  const lanternY = isPost ? 1.5 : 0;

  // Top cap
  const topCap = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.15, 4),
    mats.iron
  );
  topCap.position.y = lanternY + 0.32;
  topCap.rotation.y = Math.PI / 4;
  topCap.castShadow = true;
  group.add(topCap);

  // Bottom cap
  box(0.34, 0.06, 0.34, mats.iron, group, 0, lanternY - 0.03, 0);

  // Glass body
  const glassBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.42, 6),
    mats.lanternGlass
  );
  glassBody.position.y = lanternY + 0.18;
  group.add(glassBody);

  // Vertical bars
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.44, 4),
      mats.iron
    );
    bar.position.set(Math.cos(a) * 0.14, lanternY + 0.18, Math.sin(a) * 0.14);
    bar.castShadow = true;
    group.add(bar);
  }

  // Point light
  const light = new THREE.PointLight('#ffc078', 0, 12, 2);
  light.position.y = lanternY + 0.18;
  group.add(light);

  parent.add(group);
  return { group, light, glass: glassBody };
}

// ── main export ──────────────────────────────────────────────────────────────
export function makeHouse(scene, ground) {
  const mats = houseMaterials();
  const flMats = flowerMaterials();
  const houseGroup = new THREE.Group();

  // House position — behind the tree, to the left
  const hx = -18, hz = -18;
  const hy = ground(hx, hz);
  houseGroup.position.set(hx, hy, hz);
  houseGroup.rotation.y = 0.3; // slight angle toward camera

  // ── Foundation ──
  box(8.5, 0.6, 6.5, mats.stone, houseGroup, 0, 0.3, 0);

  // ── First floor walls ──
  const floorH = 3.2;
  // Front wall (z+)
  box(8, floorH, 0.2, mats.wall, houseGroup, 0, 0.6 + floorH / 2, 3.05);
  // Back wall
  box(8, floorH, 0.2, mats.wall, houseGroup, 0, 0.6 + floorH / 2, -3.05);
  // Left wall
  box(0.2, floorH, 6, mats.wall, houseGroup, -3.9, 0.6 + floorH / 2, 0);
  // Right wall
  box(0.2, floorH, 6, mats.wall, houseGroup, 3.9, 0.6 + floorH / 2, 0);

  // ── Second floor walls ──
  const floor2Y = 0.6 + floorH;
  // Floor plate
  box(8.2, 0.18, 6.3, mats.timber, houseGroup, 0, floor2Y, 0);
  // Front wall
  box(8, floorH - 0.4, 0.2, mats.wall, houseGroup, 0, floor2Y + (floorH - 0.4) / 2, 3.05);
  // Back wall
  box(8, floorH - 0.4, 0.2, mats.wall, houseGroup, 0, floor2Y + (floorH - 0.4) / 2, -3.05);
  // Left wall
  box(0.2, floorH - 0.4, 6, mats.wall, houseGroup, -3.9, floor2Y + (floorH - 0.4) / 2, 0);
  // Right wall
  box(0.2, floorH - 0.4, 6, mats.wall, houseGroup, 3.9, floor2Y + (floorH - 0.4) / 2, 0);

  // ── Timber frame — horizontal beams ──
  const beamH = 0.12;
  // First floor horizontal beams
  for (const face of [3.15, -3.15]) {
    box(8.3, beamH, 0.14, mats.timber, houseGroup, 0, 0.6, face);
    box(8.3, beamH, 0.14, mats.timber, houseGroup, 0, 0.6 + floorH * 0.5, face);
    box(8.3, beamH, 0.14, mats.timber, houseGroup, 0, 0.6 + floorH, face);
  }
  // Vertical timber posts
  for (const x of [-3.95, -1.3, 1.3, 3.95]) {
    for (const face of [3.15, -3.15]) {
      box(0.14, floorH + 0.1, 0.14, mats.timber, houseGroup, x, 0.6 + floorH / 2, face);
      box(0.14, floorH - 0.3, 0.14, mats.timber, houseGroup, x, floor2Y + (floorH - 0.4) / 2, face);
    }
  }
  // Side wall vertical posts
  for (const z of [-1.5, 0, 1.5]) {
    for (const side of [-3.95, 3.95]) {
      box(0.14, floorH + 0.1, 0.14, mats.timber, houseGroup, side, 0.6 + floorH / 2, z);
      box(0.14, floorH - 0.3, 0.14, mats.timber, houseGroup, side, floor2Y + (floorH - 0.4) / 2, z);
    }
  }
  // Side wall horizontal beams
  for (const side of [-3.95, 3.95]) {
    box(0.14, beamH, 6.3, mats.timber, houseGroup, side, 0.6, 0);
    box(0.14, beamH, 6.3, mats.timber, houseGroup, side, 0.6 + floorH * 0.5, 0);
    box(0.14, beamH, 6.3, mats.timber, houseGroup, side, 0.6 + floorH, 0);
  }

  // ── Windows ──
  const windowGlassPanes = [];
  function addWindow(wx, wy, wz, rotY = 0) {
    // Frame
    const frame = new THREE.Group();
    frame.position.set(wx, wy, wz);
    frame.rotation.y = rotY;
    // Outer frame
    box(1.1, 1.4, 0.08, mats.timber, frame, 0, 0, 0);
    // Glass pane
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 1.2),
      mats.glass
    );
    pane.position.z = 0.02;
    frame.add(pane);
    windowGlassPanes.push(pane);
    // Cross bars
    box(0.9, 0.04, 0.06, mats.timber, frame, 0, 0, 0.03);
    box(0.04, 1.2, 0.06, mats.timber, frame, 0, 0, 0.03);
    houseGroup.add(frame);
  }
  // Front windows — first floor
  addWindow(-2.2, 0.6 + floorH * 0.55, 3.2);
  addWindow(2.2, 0.6 + floorH * 0.55, 3.2);
  // Front windows — second floor
  addWindow(-2.2, floor2Y + (floorH - 0.4) * 0.5, 3.2);
  addWindow(2.2, floor2Y + (floorH - 0.4) * 0.5, 3.2);
  // Side windows
  addWindow(-3.98, 0.6 + floorH * 0.55, 1.2, Math.PI / 2);
  addWindow(-3.98, floor2Y + (floorH - 0.4) * 0.5, 1.2, Math.PI / 2);
  addWindow(3.98, 0.6 + floorH * 0.55, 1.2, -Math.PI / 2);
  addWindow(3.98, floor2Y + (floorH - 0.4) * 0.5, 1.2, -Math.PI / 2);

  // ── Front door ──
  box(1.2, 2.2, 0.15, mats.door, houseGroup, 0, 0.6 + 1.1, 3.18);
  // Door frame
  box(1.5, 0.12, 0.2, mats.timber, houseGroup, 0, 0.6 + 2.28, 3.2);
  box(0.12, 2.3, 0.18, mats.timber, houseGroup, -0.68, 0.6 + 1.15, 3.2);
  box(0.12, 2.3, 0.18, mats.timber, houseGroup, 0.68, 0.6 + 1.15, 3.2);
  // Small overhang above door
  box(2.2, 0.08, 0.9, mats.roof, houseGroup, 0, 0.6 + 2.5, 3.5);
  // Overhang supports
  box(0.06, 0.5, 0.06, mats.timber, houseGroup, -0.9, 0.6 + 2.25, 3.55);
  box(0.06, 0.5, 0.06, mats.timber, houseGroup, 0.9, 0.6 + 2.25, 3.55);

  // ── Roof (Explicit Vertex Geometry) ──
  const roofY = floor2Y + floorH - 0.4;
  const roofPeakH = 2.2;
  const yRidge = roofY + roofPeakH;
  const overhangX = 4.8;
  const overhangZ = 3.95;

  // 1. Roof Slopes (Front & Back)
  const roofGeo = new THREE.BufferGeometry();
  const roofPositions = new Float32Array([
    // Front Slope (facing +Z, +Y)
    -overhangX, yRidge, 0,          // 0: top-left
     overhangX, yRidge, 0,          // 1: top-right
     overhangX, roofY,  overhangZ,  // 2: bottom-right
    -overhangX, roofY,  overhangZ,  // 3: bottom-left

    // Back Slope (facing -Z, +Y)
     overhangX, yRidge, 0,          // 4: top-right
    -overhangX, yRidge, 0,          // 5: top-left
    -overhangX, roofY, -overhangZ,  // 6: bottom-left
     overhangX, roofY, -overhangZ,  // 7: bottom-right
  ]);

  const roofUVs = new Float32Array([
    // Front Slope
    0, 2,
    4, 2,
    4, 0,
    0, 0,
    // Back Slope
    0, 2,
    4, 2,
    4, 0,
    0, 0,
  ]);

  const roofIndices = [
    0, 3, 1,  1, 3, 2,  // Front slope (+Z, +Y)
    6, 5, 7,  7, 4, 5   // Back slope (-Z, +Y)
  ];

  roofGeo.setAttribute('position', new THREE.BufferAttribute(roofPositions, 3));
  roofGeo.setAttribute('uv', new THREE.BufferAttribute(roofUVs, 2));
  roofGeo.setIndex(roofIndices);
  roofGeo.computeVertexNormals();

  mats.roof.side = THREE.DoubleSide;
  const roofMesh = new THREE.Mesh(roofGeo, mats.roof);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  houseGroup.add(roofMesh);

  // 2. Gable End Walls (Left & Right triangles)
  const gableGeo = new THREE.BufferGeometry();
  const wallX = 3.95;
  const wallZ = 3.15;
  const gablePositions = new Float32Array([
    // Left Gable (facing -X)
    -wallX, roofY, -wallZ,   // 0: back bottom
    -wallX, roofY,  wallZ,   // 1: front bottom
    -wallX, yRidge, 0,       // 2: peak

    // Right Gable (facing +X)
     wallX, roofY,  wallZ,   // 3: front bottom
     wallX, roofY, -wallZ,   // 4: back bottom
     wallX, yRidge, 0        // 5: peak
  ]);

  const gableUVs = new Float32Array([
    0, 0,  2, 0,  1, 1,
    0, 0,  2, 0,  1, 1,
  ]);

  const gableIndices = [
    0, 1, 2,  // Left gable (-X)
    3, 4, 5   // Right gable (+X)
  ];

  gableGeo.setAttribute('position', new THREE.BufferAttribute(gablePositions, 3));
  gableGeo.setAttribute('uv', new THREE.BufferAttribute(gableUVs, 2));
  gableGeo.setIndex(gableIndices);
  gableGeo.computeVertexNormals();

  mats.wall.side = THREE.DoubleSide;
  const gableMesh = new THREE.Mesh(gableGeo, mats.wall);
  gableMesh.castShadow = true;
  gableMesh.receiveShadow = true;
  houseGroup.add(gableMesh);

  // 3. Ridge Beam
  box(overhangX * 2 + 0.2, 0.16, 0.16, mats.timber, houseGroup, 0, yRidge + 0.05, 0);

  // 4. Eave Trims (Front & Back horizontal edge beams)
  box(overhangX * 2 + 0.1, 0.1, 0.14, mats.timber, houseGroup, 0, roofY, overhangZ);
  box(overhangX * 2 + 0.1, 0.1, 0.14, mats.timber, houseGroup, 0, roofY, -overhangZ);

  // 5. Bargeboards (Sloped edge trims on left and right sides)
  const slopeLen = Math.sqrt(roofPeakH * roofPeakH + overhangZ * overhangZ);
  const slopeAngle = Math.atan2(roofPeakH, overhangZ);

  for (const sideX of [-overhangX - 0.02, overhangX + 0.02]) {
    // Front slope bargeboard
    const bbFront = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, slopeLen), mats.timber);
    bbFront.position.set(sideX, roofY + roofPeakH * 0.5, overhangZ * 0.5);
    bbFront.rotation.x = slopeAngle;
    bbFront.castShadow = true;
    houseGroup.add(bbFront);

    // Back slope bargeboard
    const bbBack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, slopeLen), mats.timber);
    bbBack.position.set(sideX, roofY + roofPeakH * 0.5, -overhangZ * 0.5);
    bbBack.rotation.x = -slopeAngle;
    bbBack.castShadow = true;
    houseGroup.add(bbBack);
  }

  // ── Second floor balcony (front) ──
  // Floor
  box(5, 0.08, 1.2, mats.timber, houseGroup, 0, floor2Y, 3.7);
  // Railing posts
  for (let i = -2; i <= 2; i++) {
    box(0.06, 0.7, 0.06, mats.timber, houseGroup, i * 1.1, floor2Y + 0.35, 4.2);
  }
  // Railing top bar
  box(5, 0.06, 0.06, mats.timber, houseGroup, 0, floor2Y + 0.7, 4.2);
  // Railing bottom bar
  box(5, 0.04, 0.04, mats.timber, houseGroup, 0, floor2Y + 0.22, 4.2);

  // ── Chimney ──
  box(0.7, 2.5, 0.6, mats.stone, houseGroup, -3.2, roofY + roofPeakH - 0.5, -1.2);
  box(0.85, 0.15, 0.75, mats.stone, houseGroup, -3.2, roofY + roofPeakH + 0.75, -1.2);

  // ── Small step at front door ──
  box(1.8, 0.18, 0.6, mats.stone, houseGroup, 0, 0.6 - 0.08, 3.45);

  scene.add(houseGroup);

  // ── Lanterns ──────────────────────────────────────────────────────────────
  const lanterns = [];

  // Convert local house positions to world positions for lantern placement
  function worldPos(lx, ly, lz) {
    const v = new THREE.Vector3(lx, ly, lz);
    houseGroup.localToWorld(v);
    return v;
  }

  // We need to update the matrix first
  houseGroup.updateMatrixWorld(true);

  // Front door lanterns (wall-mounted, on each side of door)
  const doorLanternY = 0.6 + 2.0;
  const wp1 = worldPos(-1.3, doorLanternY, 3.35);
  lanterns.push(makeLantern(scene, mats, wp1.x, wp1.y, wp1.z, false));
  const wp2 = worldPos(1.3, doorLanternY, 3.35);
  lanterns.push(makeLantern(scene, mats, wp2.x, wp2.y, wp2.z, false));

  // Garden path lanterns (post lanterns)
  const pathStart = worldPos(0, 0, 5.5);
  lanterns.push(makeLantern(scene, mats, pathStart.x - 1.2, ground(pathStart.x - 1.2, pathStart.z), pathStart.z, true));
  lanterns.push(makeLantern(scene, mats, pathStart.x + 1.2, ground(pathStart.x + 1.2, pathStart.z), pathStart.z, true));

  // Corner lanterns
  const corner1 = worldPos(-4.5, 0, 3.5);
  lanterns.push(makeLantern(scene, mats, corner1.x, ground(corner1.x, corner1.z), corner1.z, true));
  const corner2 = worldPos(4.5, 0, 3.5);
  lanterns.push(makeLantern(scene, mats, corner2.x, ground(corner2.x, corner2.z), corner2.z, true));

  // ── Flower Garden ─────────────────────────────────────────────────────────
  const flowerGeo = smallFlowerGeo();
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // Garden area — in front of the house
  const gardenCenter = worldPos(0, 0, 5.8);
  const gcx = gardenCenter.x, gcz = gardenCenter.z;

  // Pink flowers
  const pinkFlowers = new THREE.InstancedMesh(flowerGeo, flMats.pink, 120);
  for (let i = 0; i < 120; i++) {
    const fx = gcx + (Math.random() - 0.5) * 7;
    const fz = gcz + (Math.random() - 0.3) * 3.5;
    const fy = ground(fx, fz);
    dummy.position.set(fx, fy + 0.02, fz);
    dummy.rotation.set(0, Math.random() * 6.28, 0);
    dummy.scale.setScalar(0.7 + Math.random() * 0.8);
    dummy.updateMatrix();
    pinkFlowers.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.95 + Math.random() * 0.04, 0.3 + Math.random() * 0.3, 0.75 + Math.random() * 0.15);
    pinkFlowers.setColorAt(i, color);
  }
  pinkFlowers.instanceColor.needsUpdate = true;
  scene.add(pinkFlowers);

  // Purple flowers (lavender-like — taller, using cylinders)
  const lavGeo = new THREE.ConeGeometry(0.03, 0.18, 5);
  const purpleFlowers = new THREE.InstancedMesh(lavGeo, flMats.purple, 80);
  for (let i = 0; i < 80; i++) {
    const fx = gcx + (Math.random() - 0.5) * 6;
    const fz = gcz + (Math.random() - 0.3) * 3;
    const fy = ground(fx, fz);
    dummy.position.set(fx, fy + 0.12, fz);
    dummy.rotation.set(0, Math.random() * 6.28, (Math.random() - 0.5) * 0.3);
    dummy.scale.setScalar(0.8 + Math.random() * 0.6);
    dummy.updateMatrix();
    purpleFlowers.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.76 + Math.random() * 0.06, 0.35 + Math.random() * 0.25, 0.5 + Math.random() * 0.2);
    purpleFlowers.setColorAt(i, color);
  }
  purpleFlowers.instanceColor.needsUpdate = true;
  scene.add(purpleFlowers);

  // Yellow wildflowers
  const yellowFlowers = new THREE.InstancedMesh(flowerGeo, flMats.yellow, 60);
  for (let i = 0; i < 60; i++) {
    const fx = gcx + (Math.random() - 0.5) * 6.5;
    const fz = gcz + (Math.random() - 0.3) * 3;
    const fy = ground(fx, fz);
    dummy.position.set(fx, fy + 0.02, fz);
    dummy.rotation.set(0, Math.random() * 6.28, 0);
    dummy.scale.setScalar(0.5 + Math.random() * 0.5);
    dummy.updateMatrix();
    yellowFlowers.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.13 + Math.random() * 0.04, 0.6 + Math.random() * 0.3, 0.55 + Math.random() * 0.2);
    yellowFlowers.setColorAt(i, color);
  }
  yellowFlowers.instanceColor.needsUpdate = true;
  scene.add(yellowFlowers);

  // Leaf clumps at flower bases
  const leafGeo = new THREE.SphereGeometry(1, 4, 3);
  leafGeo.scale(0.06, 0.04, 0.08);
  const leaves = new THREE.InstancedMesh(leafGeo, flMats.leaf, 200);
  for (let i = 0; i < 200; i++) {
    const fx = gcx + (Math.random() - 0.5) * 7.5;
    const fz = gcz + (Math.random() - 0.3) * 4;
    const fy = ground(fx, fz);
    dummy.position.set(fx, fy + 0.01, fz);
    dummy.rotation.set(Math.random() * 0.5, Math.random() * 6.28, Math.random() * 0.5);
    dummy.scale.setScalar(0.6 + Math.random() * 1.0);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.28 + Math.random() * 0.06, 0.3 + Math.random() * 0.25, 0.28 + Math.random() * 0.15);
    leaves.setColorAt(i, color);
  }
  leaves.instanceColor.needsUpdate = true;
  scene.add(leaves);

  // ── Stone stepping path ──
  const pathDir = new THREE.Vector3(
    gcx - hx, 0, gcz - hz
  ).normalize();
  for (let i = 0; i < 7; i++) {
    const px = gcx + pathDir.x * (i * 1.1 - 2) + (Math.random() - 0.5) * 0.3;
    const pz = gcz + pathDir.z * (i * 1.1 - 2) + (Math.random() - 0.5) * 0.3;
    const py = ground(px, pz);
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3 + Math.random() * 0.15, 0.35 + Math.random() * 0.15, 0.06, 7),
      mats.pathStone
    );
    stone.position.set(px, py + 0.03, pz);
    stone.rotation.y = Math.random() * 6.28;
    stone.receiveShadow = true;
    scene.add(stone);
  }

  // ── Low fence around garden ──
  const fencePoints = [
    [gcx - 4, gcz - 1.5],
    [gcx - 4, gcz + 2.5],
    [gcx + 4, gcz + 2.5],
    [gcx + 4, gcz - 1.5],
  ];
  for (let i = 0; i < fencePoints.length; i++) {
    const [x1, z1] = fencePoints[i];
    const [x2, z2] = fencePoints[(i + 1) % fencePoints.length];
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const segments = Math.floor(len / 1.2);
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const fx = x1 + dx * t, fz = z1 + dz * t;
      const fy = ground(fx, fz);
      // Post
      const postMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.035, 0.5, 5),
        mats.fence
      );
      postMesh.position.set(fx, fy + 0.25, fz);
      postMesh.castShadow = true;
      scene.add(postMesh);
    }
    // Horizontal rails
    const midX = (x1 + x2) / 2, midZ = (z1 + z2) / 2;
    const midY = ground(midX, midZ);
    const angle = Math.atan2(dx, dz);
    for (const rh of [0.18, 0.38]) {
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, len, 4),
        mats.fence
      );
      rail.position.set(midX, midY + rh, midZ);
      rail.rotation.z = Math.PI / 2;
      rail.rotation.y = -angle;
      // Rotate to be horizontal along the fence direction
      rail.rotation.set(0, 0, 0);
      rail.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      rail.rotateZ(Math.PI / 2);
      rail.castShadow = true;
      scene.add(rail);
    }
  }

  // ── Update function — drives lanterns by day/night ──
  return {
    update(settings, time) {
      const { night } = daylight(settings.day);
      const dusk = THREE.MathUtils.smoothstep(settings.day, 0.56, 0.88);

      for (let i = 0; i < lanterns.length; i++) {
        const l = lanterns[i];
        // Warm glow that comes on at dusk, with subtle flicker
        const flicker = 1 + Math.sin(time * 3.1 + i * 1.7) * 0.03 + Math.sin(time * 7.3 + i * 2.9) * 0.015;
        l.light.intensity = dusk * 3.5 * flicker;
        l.glass.material.emissiveIntensity = dusk * 2.5;
        l.glass.material.opacity = 0.18 + dusk * 0.35;
      }

      // Window glow at night
      const windowGlow = dusk * 1.8;
      mats.glass.emissiveIntensity = windowGlow;
      mats.glass.opacity = 0.35 + dusk * 0.25;
    }
  };
}
