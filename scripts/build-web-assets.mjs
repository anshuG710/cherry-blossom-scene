// Rebuild the runtime art when Blender is unavailable. Blender's companion
// script exports the same asset format and additionally saves editable source.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
const out=new URL('../src/assets/blender/',import.meta.url),metal=[];
await mkdir(out,{recursive:true});
function part(geometry,x,y,z){if(geometry.index)geometry=geometry.toNonIndexed();geometry.translate(x,y,z);geometry.deleteAttribute('uv');metal.push(geometry);}
part(new THREE.CylinderGeometry(.047,.052,2.68,24),0,1.36,0);
part(new THREE.CylinderGeometry(.065,.12,.23,24),0,.115,0);
for(const [y,r] of [[.31,.057],[2.53,.06],[2.7,.067]])part(new THREE.CylinderGeometry(r,r,.045,24),0,y,0);
const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,2.64,0),new THREE.Vector3(-.13,2.88,0),new THREE.Vector3(-.45,2.88,0),new THREE.Vector3(-.48,2.68,0)]);
part(new THREE.TubeGeometry(curve,20,.031,8,false),0,0,0);
const roof=new THREE.LatheGeometry([new THREE.Vector2(0,2.73),new THREE.Vector2(.065,2.7),new THREE.Vector2(.12,2.65),new THREE.Vector2(.21,2.61),new THREE.Vector2(.225,2.585),new THREE.Vector2(.2,2.57),new THREE.Vector2(.145,2.57)],24);
part(roof,-.48,0,0);
const rim=new THREE.LatheGeometry([new THREE.Vector2(.145,2.23),new THREE.Vector2(.19,2.22),new THREE.Vector2(.19,2.18),new THREE.Vector2(.145,2.15),new THREE.Vector2(.035,2.13),new THREE.Vector2(0,2.13)],24);
part(rim,-.48,0,0);
for(let i=0;i<6;i++){
  const a=i*Math.PI/3;part(new THREE.CylinderGeometry(.013,.013,.37,8),-.48+Math.cos(a)*.163,2.4,Math.sin(a)*.163);
}
for(const y of [2.24,2.56]){const g=new THREE.TorusGeometry(.164,.012,6,24);g.rotateX(Math.PI/2);part(g,-.48,y,0);}
part(new RoundedBoxGeometry(.13,.025,.13,1,.006),0,.27,0);
const glass=new THREE.SphereGeometry(1,20,10);glass.scale(.145,.17,.145);glass.translate(-.48,2.4,0);glass.deleteAttribute('uv');
function irregular(geometry,amount){
  geometry.deleteAttribute('uv');geometry.deleteAttribute('normal');geometry=mergeVertices(geometry);
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+amount*(Math.sin(x*8+y*5)*Math.cos(z*7-x*3)+.4*Math.sin(y*19+z*11));
    p.setXYZ(i,x*r,y*r,z*r);
  }
  geometry.computeVertexNormals();return geometry;
}
const stone=irregular(new THREE.IcosahedronGeometry(1,2),.1);stone.scale(1,.78,1);
const crowns=[];
for(let i=0;i<9;i++){
  const g=irregular(new THREE.IcosahedronGeometry(1,2),.14),a=i*2.39996,r=i===0?0:1.1+i%3*.25;
  g.scale(1.35,1.1+i%2*.2,1.1);g.translate(Math.cos(a)*r,3.6+i%3*.58,Math.sin(a)*r);
  const c=new THREE.Color().setRGB(.12+i%3*.025,.19+i%3*.02,.11),colors=[];
  for(let j=0;j<g.attributes.position.count;j++)colors.push(c.r,c.g,c.b);
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));crowns.push(g);
}
const trunk=new THREE.CylinderGeometry(.07,.18,3.5,10);trunk.translate(0,1.75,0);trunk.deleteAttribute('uv');
trunk.setAttribute('color',new THREE.Float32BufferAttribute(Array.from({length:trunk.attributes.position.count},()=>[.08,.065,.045]).flat(),3));crowns.push(trunk);
const serialize=geometry=>new THREE.BufferGeometry().copy(geometry).toJSON();
const assets={lanternMetal:serialize(mergeGeometries(metal)),lanternGlass:serialize(glass),stone:serialize(stone),distantTree:serialize(mergeGeometries(crowns)),textures:{},generator:'Three.js fallback; Blender source generator available in scripts/build-blender-assets.py'};
for(const name of ['wood-color','wood-height','earth-height','stone-height'])assets.textures[name]='data:image/png;base64,'+(await readFile(new URL(name+'.png',out))).toString('base64');
await writeFile(new URL('geometry.json',out),JSON.stringify(assets));
console.log('Built shared lantern, river stone and distant tree geometry.');
