import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bridge, bridgeHeight } from './navigation.js';

export function makeBridge(scene) {
  const wood = new THREE.MeshStandardMaterial({ color: '#a8784b', roughness: .86 });
  wood.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 grainPosition;').replace('#include <begin_vertex>', '#include <begin_vertex>\ngrainPosition=position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 grainPosition;').replace('#include <color_fragment>', '#include <color_fragment>\nfloat grain=sin(grainPosition.x*160.+sin(grainPosition.z*3.)*2.);diffuseColor.rgb*=.87+.1*grain;');
  };
  const planks = [], rails = [], bolts = [];
  const length = bridge.halfLength * 2, count = Math.ceil(length / .38);
  const left = bridge.x - bridge.halfLength;
  function box(list, w,h,d,x,y,z) { const g = new THREE.BoxGeometry(w,h,d); g.translate(x,y,z); list.push(g); }
  for (let i = 0; i < count; i++) {
    const x = left + (i + .5) * length / count, y = bridgeHeight(x);
    box(planks, length/count-.014, .16, bridge.halfWidth*2, x,y-.08,bridge.z);
    for (const side of [-1,1]) box(bolts,.04,.008,.04,x,y+.006,bridge.z+side*1.35);
  }
  for (const side of [-1,1]) {
    const z = bridge.z + side * bridge.halfWidth;
    for (let i=0;i<=12;i++) {
      const x=left+i*length/12, y=bridgeHeight(x);
      box(rails,.13,1.14,.13,x,y+.49,z);
      box(rails,.19,.08,.19,x,y+1.08,z);
      if (i<12) for (const height of [.45,1]) {
        const end=left+(i+1)*length/12, endY=bridgeHeight(end);
        const g=new THREE.BoxGeometry(Math.hypot(end-x,endY-y),.095,.11);
        g.rotateZ(Math.atan2(endY-y,end-x)); g.translate((x+end)/2,(y+endY)/2+height,z); rails.push(g);
      }
    }
    for (const fraction of [.2,.5,.8]) {
      const x=left+length*fraction, h=bridgeHeight(x);
      box(rails,.28,h+.6,.28,x,(h-.6)/2,z);
    }
  }
  function combined(parts, material) {
    const mesh=new THREE.Mesh(mergeGeometries(parts),material); parts.forEach(g=>g.dispose());
    mesh.castShadow=mesh.receiveShadow=true; scene.add(mesh); return mesh;
  }
  const deck=combined(planks,wood); deck.userData.walkSurface=true;
  combined(rails,wood); combined(bolts,new THREE.MeshStandardMaterial({color:'#403b34',metalness:.7,roughness:.5}));
  return deck;
}
