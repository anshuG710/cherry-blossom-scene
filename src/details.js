import * as THREE from 'three';

// Shared textures and geometry keep close-up detail instanced across the canopy.
export function blossomGeometry(detailed = true) {
  const positions = [], uvs = [], colors = [], indices = [];
  const add = (x, y, z, u, v, tint = [1, 1, 1]) => {
    positions.push(x, y, z); uvs.push(u, v); colors.push(...tint);
    return positions.length / 3 - 1;
  };
  for (let petal = 0; petal < 5; petal++) {
    const angle = petal * Math.PI * 2 / 5;
    const point = (x, y, z, u, v) => add(x * Math.cos(angle) + z * Math.sin(angle), y,
      z * Math.cos(angle) - x * Math.sin(angle), u * .49, v);
    const center = point(0, .012, .073, .5, .5);
    const segments = detailed ? 12 : 8;
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * Math.PI * 2;
      const notch = Math.pow(Math.max(0, Math.sin(a)), 24) * .023;
      const x = Math.cos(a) * .067 * (1 + .09 * Math.sin(a));
      const z = .076 + Math.sin(a) * .09 - notch;
      const y = .024 + .027 * Math.pow(Math.sin(a), 2) + Math.cos(a * 3 + petal) * .007;
      point(x, y, z, .5 + x / .145, .5 + (z - .076) / .19);
      if (i < segments) indices.push(center, center + i + 2, center + i + 1);
    }
  }
  const core = add(0, .029, 0, .75, .5, [1, .78, .49]);
  for (let i = 0; i <= 10; i++) {
    const a = i / 10 * Math.PI * 2;
    add(Math.cos(a) * .031, .021, Math.sin(a) * .031, .75, .5, [1, .68, .4]);
    if (i < 10) indices.push(core, core + i + 2, core + i + 1);
  }
  if (detailed) for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7, x = Math.cos(a) * .025, z = Math.sin(a) * .025;
    const base = add(x * .4 - .0018, .025, z * .4, .75, .5, [1, .88, .65]);
    add(x * .4 + .0018, .025, z * .4, .75, .5, [1, .88, .65]);
    add(x, .07 + i % 2 * .008, z, .75, .5, [1, .91, .7]);
    indices.push(base, base + 1, base + 2);
    const tip = add(x - .006, .071, z, .75, .5, [1, .8, .32]);
    add(x + .006, .071, z, .75, .5, [1, .8, .32]);
    add(x, .081, z + .004, .75, .5, [1, .92, .5]);
    indices.push(tip, tip + 1, tip + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function blossomMaterial() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff6df'; ctx.fillRect(0, 0, 512, 512);
  const gradient = ctx.createRadialGradient(128, 440, 5, 128, 240, 320);
  gradient.addColorStop(0, '#b94470'); gradient.addColorStop(.3, '#efb1c8');
  gradient.addColorStop(.7, '#ffe2e9'); gradient.addColorStop(1, '#fff5f3');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 252, 512);
  ctx.lineWidth = 1.3; ctx.strokeStyle = '#bd63802e';
  for (let i = 0; i < 13; i++) {
    const tip = 12 + i * 19;
    ctx.beginPath(); ctx.moveTo(128, 480);
    ctx.bezierCurveTo(128 + (tip - 128) * .25, 345, tip, 190, tip, 12); ctx.stroke();
    for (let j = 0; j < 3; j++) {
      const y = 170 + j * 75;
      ctx.beginPath(); ctx.moveTo(tip * .7 + 38, y + 70);
      ctx.quadraticCurveTo(tip, y + 25, tip + (i < 6 ? -19 : 19), y); ctx.stroke();
    }
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const material = new THREE.MeshPhysicalMaterial({map, vertexColors: true, roughness: .65,
    side: THREE.DoubleSide, sheen: .35, sheenColor: new THREE.Color('#ffe6ee'), sheenRoughness: .8,
    emissive: '#ce789b', emissiveIntensity: .055});
  // A small view-dependent lift approximates light transmitted through thin petals.
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
      'outgoingLight += diffuseColor.rgb * 0.075 * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0);\n#include <opaque_fragment>');
  };
  return material;
}

export function barkMaterial() {
  const size = 512, canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const warp = x + Math.sin(y * .018) * 5 + Math.sin(y * .061 + x * .023) * 2;
    const groove = Math.pow(.5 + .5 * Math.sin(warp * .19 + Math.sin(warp * .067) * 3), 9);
    const grain = Math.sin(x * 1.73 + y * 2.13) * Math.sin(y * .53 - x * .94);
    const tone = 124 - groove * 46 + grain * 10 + Math.sin(y * .12 + x * .04) * 7;
    const i = (y * size + x) * 4;
    pixels.data[i] = tone; pixels.data[i + 1] = tone * .79; pixels.data[i + 2] = tone * .69; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  // Horizontal lenticels are characteristic of cherry bark.
  for (let i = 0; i < 270; i++) {
    const x = (i * 73.37) % size, y = (i * 131.71) % size, width = 3 + i % 19;
    ctx.fillStyle = '#231f1dcc'; ctx.fillRect(x, y, width, 1.8);
    ctx.fillStyle = '#b2a18a88'; ctx.fillRect(x, y + 2, width * .9, .9);
  }
  // Irregular lichen flecks collect in the bark's older grooves.
  for (let i = 0; i < 155; i++) {
    const x = (i * 83.71) % size, y = (i * 197.39) % size;
    ctx.fillStyle = i % 3 ? '#82947b40' : '#d0c7ad48';
    ctx.beginPath(); ctx.ellipse(x, y, 1.2 + i % 4, .7 + i % 3, .25, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 5; i++) {
    const x = 40 + (i * 97) % 430, y = 60 + (i * 127) % 380;
    for (let ring = 5; ring > 0; ring--) {
      ctx.strokeStyle = ring % 2 ? '#34272199' : '#b6a18a66'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(x, y, 2 + ring * 2, 4 + ring * 3.2, .12, 0, Math.PI * 2); ctx.stroke();
    }
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(2, .55); map.anisotropy = 8;
  const bump = map.clone(); bump.colorSpace = THREE.NoColorSpace;
  return new THREE.MeshStandardMaterial({color: '#f0e0ce', map, bumpMap: bump, bumpScale: .055, roughness: .94});
}

export function detailWater(water) {
  const uniforms = water.material.uniforms;
  uniforms.size.value = 3.2;
  uniforms.windRipple = {value: .55};
  water.material.vertexShader = water.material.vertexShader
    .replace('varying vec4 worldPosition;', 'varying vec4 worldPosition;\nvarying vec2 riverUv;\nuniform float windRipple;')
    .replace('mirrorCoord = modelMatrix * vec4( position, 1.0 );', `
      vec3 waterPosition=position;
      float edgeFade=sin(uv.x*3.14159265);
      waterPosition.z+=edgeFade*(.35+windRipple)*(sin(position.y*1.6+time*3.2+sin(position.x*1.2))*.014+sin(position.y*3.7+time*4.3)*.006);
      mirrorCoord = modelMatrix * vec4(waterPosition,1.);
    `)
    .replace('modelViewMatrix * vec4( position, 1.0 )', 'modelViewMatrix * vec4(waterPosition,1.)')
    .replace('worldPosition = mirrorCoord.xyzw;', 'worldPosition = mirrorCoord.xyzw;\nriverUv = uv;');
  water.material.fragmentShader = water.material.fragmentShader
    .replace('varying vec4 worldPosition;', `varying vec4 worldPosition;
      varying vec2 riverUv;
      float hashBed(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float bedNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hashBed(i),hashBed(i+vec2(1,0)),f.x),mix(hashBed(i+vec2(0,1)),hashBed(i+vec2(1,1)),f.x),f.y);}
      vec3 riverBed(vec2 p){
        vec2 cell=floor(p*6.);vec2 f=fract(p*6.)-.5;
        float pebble=1.-smoothstep(.18,.49,length(f*vec2(1.,1.3)));
        vec3 c=mix(vec3(.10,.14,.105),vec3(.28,.28,.20),hashBed(cell));
        return c*(.52+.48*pebble);
      }
    `)
    .replace('vec4 noise = getNoise( worldPosition.xz * size );', `
      float z=worldPosition.z;
      float center=5.+6.*sin(z*.031+.4)+2.2*sin(z*.081);
      float curve=.186*cos(z*.031+.4)+.1782*cos(z*.081);
      vec2 flow=vec2(worldPosition.x-center,z);
      vec4 noise = getNoise(flow*size+vec2(0.,-time*10.));
    `)
    .replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );', `
      vec3 surfaceNormal=normalize(noise.xzy*vec3(1.05,1.,1.05));
      surfaceNormal.xz=mat2(1.,-curve,curve,1.)*surfaceNormal.xz;
      surfaceNormal=normalize(surfaceNormal);
    `)
    .replace('100.0, 2.0, 0.5', '150.0, 0.75, 0.18')
    .replace('float rf0 = 0.3;', 'float rf0 = 0.025;')
    .replace('vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;', `
      float shore=pow(abs(riverUv.x-.5)*2.,3.);
      float depth=mix(2.8,.12,shore)+bedNoise(flow*.7)*.22;
      vec2 refracted=worldPosition.xz+surfaceNormal.xz*depth*.35;
      vec3 bed=riverBed(refracted);
      float caustic=pow(max(0.,1.-abs(sin(refracted.x*4.+time*1.9+sin(refracted.y*3.))*cos(refracted.y*5.-time*1.4))),18.);
      bed+=vec3(.15,.20,.13)*caustic*shore;
      vec3 transmission=exp(-vec3(.9,.35,.28)*depth);
      vec3 scatter=mix(waterColor*.55,bed,transmission)*(.65+.35*max(0.,dot(surfaceNormal,eyeDirection)));
    `);
  water.material.needsUpdate = true;
}
