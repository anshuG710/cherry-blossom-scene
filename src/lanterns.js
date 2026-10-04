import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sampleWind } from './weather.js';
import { bridge, bridgeHeight } from './navigation.js';

const iron = new THREE.MeshStandardMaterial({color:'#36372f',metalness:.8,roughness:.38});
const paper = new THREE.MeshPhysicalMaterial({color:'#f4d8a0',transparent:true,opacity:.35,roughness:.15,depthWrite:false});
const sphere = new THREE.SphereGeometry(1, 16, 10);

// The curved iron hook and hanging lantern that stands beside a bench.
// Every bench gets an identical one, each with its own wind-driven pendulum.
export function makeHangingLantern(bench) {
  const hook = new THREE.CatmullRomCurve3([new THREE.Vector3(1.9,0,-.65),new THREE.Vector3(1.9,2.8,-.65),new THREE.Vector3(1.8,3.7,-.65),new THREE.Vector3(.9,3.8,-.65),new THREE.Vector3(.65,3.48,-.65)]);
  const post = new THREE.Mesh(new THREE.TubeGeometry(hook,40,.035,8,false),iron);post.castShadow=true;bench.add(post);
  const hanging = new THREE.Group();hanging.position.set(.65,3.48,-.65);bench.add(hanging);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.09,.015,6,16),iron);ring.position.y=-.08;hanging.add(ring);
  const lantern = new THREE.Group();lantern.position.y=-.5;hanging.add(lantern);
  for(const y of [-.29,.29]){
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(y>0?.07:.26,.27,.12,6),iron);cap.position.y=y;cap.castShadow=true;lantern.add(cap);
  }
  lantern.add(new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.5,6),paper));
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;const bar=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.56,5),iron);bar.position.set(Math.cos(a)*.22,0,Math.sin(a)*.22);lantern.add(bar);
  }
  const glow = new THREE.MeshStandardMaterial({color:'#fff0bb',emissive:'#ffbf5e',emissiveIntensity:0,roughness:.6});
  const flame = new THREE.Mesh(sphere,glow);flame.position.y=-.06;flame.scale.set(.07,.16,.07);lantern.add(flame);
  const lamp = new THREE.PointLight('#ffc078',0,16,2);lantern.add(lamp);
  const wind={}, where=new THREE.Vector3();let sway=0,velocity=0;
  return {update(dt,time,settings){
    bench.getWorldPosition(where);sampleWind(time,where.x,where.z,settings.wind,wind);
    // Damped pendulum: gravity restores the lantern, wind supplies torque.
    velocity+=(wind.x*.55-9.81/.5*sway-2.4*velocity)*dt;sway+=velocity*dt;
    hanging.rotation.z=sway;hanging.rotation.x=wind.z*.025;
    const dusk=THREE.MathUtils.smoothstep(settings.day,.56,.88);
    lamp.intensity=dusk*14*(1+Math.sin(time*3.1)*.025);glow.emissiveIntensity=dusk*5;
  }};
}

// Small hexagonal lanterns seated on the bridge's railing posts: both ends and the crown, on both sides.
export function makeBridgeLanterns(scene) {
  const glow = new THREE.MeshStandardMaterial({color:'#ffe9bf',emissive:'#ffb85a',emissiveIntensity:.15,roughness:.5});
  const shade = new THREE.MeshPhysicalMaterial({color:'#f6dcaa',emissive:'#ffb85a',emissiveIntensity:.05,transparent:true,opacity:.55,roughness:.3,depthWrite:false});
  const roof = new THREE.MeshStandardMaterial({color:'#2f302a',metalness:.6,roughness:.45});
  // Parts are merged per material so all six lanterns cost three draw calls.
  const frame=[], shades=[], cores=[], lights=[];
  const length = bridge.halfLength*2, left = bridge.x-bridge.halfLength;
  const put=(list,geometry,x,y,z,sx=1,sy=1,sz=1)=>{geometry.scale(sx,sy,sz);geometry.translate(x,y,z);list.push(geometry);};
  for (const side of [-1,1]) for (const post of [0,6,12]) {
    const x = left+post*length/12, z = bridge.z+side*bridge.halfWidth, y = bridgeHeight(x)+1.12;
    put(frame,new THREE.CylinderGeometry(.13,.16,.08,6),x,y+.04,z);
    put(shades,new THREE.CylinderGeometry(.14,.14,.38,6),x,y+.29,z);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;put(frame,new THREE.BoxGeometry(.02,.4,.02),x+Math.cos(a)*.14,y+.29,z+Math.sin(a)*.14);}
    put(cores,new THREE.SphereGeometry(1,10,8),x,y+.29,z,.055,.12,.055);
    put(frame,new THREE.ConeGeometry(.24,.2,6),x,y+.56,z);
    put(frame,new THREE.SphereGeometry(.035,8,6),x,y+.68,z);
    // Two real lights (one per bridge end) keep the cost low; the rest glow emissively.
    if (side===1 && post!==6) { const lamp = new THREE.PointLight('#ffc27a',0,10,2);lamp.position.set(x,y+.3,z);scene.add(lamp);lights.push(lamp); }
  }
  const merged=(list,material,shadow)=>{const mesh=new THREE.Mesh(mergeGeometries(list),material);list.forEach(g=>g.dispose());mesh.castShadow=shadow;scene.add(mesh);return mesh;};
  merged(frame,roof,true);merged(shades,shade,false);merged(cores,glow,false);
  return {update(time,day){
    const dusk=THREE.MathUtils.smoothstep(day,.5,.9);
    glow.emissiveIntensity=.2+dusk*4.5;shade.emissiveIntensity=.05+dusk*1.2;
    for(const lamp of lights)lamp.intensity=dusk*7*(1+Math.sin(time*2.7+lamp.id)*.03);
  }};
}
