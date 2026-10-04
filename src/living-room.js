import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { woodMaterial } from './materials.js';

export function makeLivingRoom(house) {
  const room=new THREE.Group();house.add(room);
  const timber=woodMaterial('#c2a17b');
  const fabric=new THREE.MeshPhysicalMaterial({color:'#87917d',roughness:1,sheen:.55,sheenColor:new THREE.Color('#b4bfaa'),sheenRoughness:.85});
  const cream=new THREE.MeshStandardMaterial({color:'#e4d2b4',roughness:1});
  const dark=new THREE.MeshStandardMaterial({color:'#111716',roughness:.3,metalness:.35});
  const weave=document.createElement('canvas');weave.width=weave.height=64;const ctx=weave.getContext('2d');
  ctx.fillStyle='#b9b6a7';ctx.fillRect(0,0,64,64);ctx.fillStyle='#dad4c4';
  for(let y=0;y<64;y+=4)for(let x=0;x<64;x+=4)ctx.fillRect(x+(y%8?1:0),y,2,3);
  const map=new THREE.CanvasTexture(weave);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(8,8);fabric.bumpMap=map;fabric.bumpScale=.018;cream.bumpMap=map;cream.bumpScale=.01;
  function box(w,h,d,material,x,y,z,r=.025){const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,1,r),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;room.add(mesh);return mesh;}
  box(7.7,3.2,.09,cream,0,2.2,-3.01,.008);
  for(const side of [-1,1]){box(.09,3.2,6,cream,side*3.8,2.2,0,.008);box(.06,.14,6,timber,side*3.74,.72,0,.005);}
  for(let i=0;i<20;i++)box(.382,.045,5.9,timber,-3.63+i*.382,.625,0,.004);
  box(4.3,.035,3.4,cream,-.6,.67,.25,.008);
  // Sofa faces the television, with separate cushions, piped edges and feet.
  box(2.9,.3,1.05,fabric,-1.45,1.04,1.4,.12);
  box(2.9,.75,.22,fabric,-1.45,1.45,1.89,.08);
  for(const x of [-2.75,-.15])box(.25,.55,1.08,fabric,x,1.29,1.4,.08);
  for(const x of [-2.12,-.78]){box(1.23,.2,.87,cream,x,1.28,1.34,.08);box(1.18,.51,.18,fabric,x,1.63,1.72,.06);}
  for(const x of [-2.65,-.25])for(const z of [1.02,1.76])box(.09,.25,.09,timber,x,.81,z,.008);
  const pillow=box(.43,.43,.2,cream,-2.4,1.63,1.36,.09);pillow.rotation.z=.2;
  box(2.1,.12,.86,timber,-1.35,1.13,-.27,.045);
  for(const x of [-2.2,-.5])for(const z of [-.57,.02])box(.075,.44,.075,dark,x,.87,z,.008);
  const book=box(.4,.035,.28,cream,-1.8,1.213,-.25,.005);book.rotation.y=.15;
  const cup=new THREE.Mesh(new THREE.CylinderGeometry(.085,.065,.14,16),cream);cup.position.set(-.9,1.26,-.27);room.add(cup);
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.055,.014,5,12),cream);handle.position.set(-.8,1.27,-.27);room.add(handle);
  box(4.1,.38,.42,timber,0,.9,-2.55,.035);
  box(3.74,2.14,.12,dark,0,2.23,-2.79,.035);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(3.6,2.025),new THREE.MeshBasicMaterial({color:'#102923'}));screen.position.set(0,2.23,-2.718);room.add(screen);
  box(1.8,.06,.1,dark,0,1.08,-2.26,.015);
  const glow=new THREE.PointLight('#ffd5a0',7,9,2);glow.position.set(1.9,2.9,0);glow.visible=false;room.add(glow);
  box(.08,1.8,.08,dark,2.85,1.58,-1.8,.015);
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(.3,.46,.55,20,1,true),new THREE.MeshStandardMaterial({color:'#f1dcc0',emissive:'#e4b67b',emissiveIntensity:.3,side:THREE.DoubleSide}));shade.position.set(2.85,2.45,-1.8);room.add(shade);
  const plantMat=new THREE.MeshStandardMaterial({color:'#526e49',roughness:.9});
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.23,.15,.4,12),timber);pot.position.set(-3.2,.87,-2.2);room.add(pot);
  for(let i=0;i<7;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),plantMat);leaf.scale.set(.1,.45,.05);leaf.position.set(-3.2+Math.sin(i)*.2,1.35+(i%3)*.13,-2.2+Math.cos(i)*.2);leaf.rotation.z=Math.sin(i)*.55;room.add(leaf);}
  const seat=new THREE.Group();seat.position.set(-1.45,.38,1.32);seat.rotation.y=Math.PI;room.add(seat);
  return {seat,setActive(on){glow.visible=on;}};
}
