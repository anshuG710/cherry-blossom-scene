import * as THREE from 'three';
import { ground, riverX, riverWidth } from './landscape.js';
import { daylight, sampleWind } from './weather.js';

export function fishPosition(time, index) {
  const phase = time * .12 + index * 1.37;
  const z = -6 + Math.sin(phase) * 16 + index * 1.1;
  return new THREE.Vector3(riverX(z) + Math.sin(phase * 1.6 + index) * riverWidth(z) * .48,
    -.22 + Math.sin(phase * 2) * .06, z);
}

export function makeEcosystem(scene, bench, water, mobile) {
  const sphere = new THREE.SphereGeometry(1, 16, 10);
  const dark = new THREE.MeshStandardMaterial({color: '#26332e', roughness: .65});
  function oval(parent, material, position, scale) {
    const mesh = new THREE.Mesh(sphere, material); mesh.position.set(...position); mesh.scale.set(...scale);
    parent.add(mesh); return mesh;
  }
  function fin(parent, material, points) {
    const shape = new THREE.Shape(); shape.moveTo(...points[0]);
    for (const p of points.slice(1)) shape.lineTo(...p);
    shape.closePath(); const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material); parent.add(mesh); return mesh;
  }
  // Submerged geometry sits above a riverbed, under the reflective transparent surface.
  const bed = new THREE.Mesh(water.geometry.clone(), new THREE.MeshStandardMaterial({color: '#44554a', roughness: 1}));
  bed.rotation.copy(water.rotation); bed.position.copy(water.position); bed.position.y = -.85; scene.add(bed);
  water.material.transparent = true; water.material.uniforms.alpha.value = .73;
  const fish = [];
  for (let i = 0; i < (mobile ? 6 : 10); i++) {
    const root = new THREE.Group();
    const scales = new THREE.MeshStandardMaterial({color: i % 3 ? '#bfa97b' : '#c77a45', metalness: .22, roughness: .4});
    const fins = new THREE.MeshStandardMaterial({color: '#7e8f78', side: THREE.DoubleSide, roughness: .6});
    oval(root, scales, [0,0,0], [.12,.105,.44]);
    oval(root, dark, [0,.075,.03], [.075,.035,.32]);
    const tail = fin(root, fins, [[0,0],[-.21,-.26],[0,-.19],[.21,-.26]]);
    tail.rotation.x = Math.PI / 2; tail.position.z = -.36;
    for (const side of [-1,1]) {
      const p = fin(root,fins,[[0,0],[side*.23,-.15],[side*.06,-.23]]); p.rotation.x = Math.PI/2; p.position.set(side*.07,0,.06);
      oval(root,dark,[side*.075,.025,.32],[.018,.019,.018]);
    }
    scene.add(root); fish.push({root,tail});
  }
  const birds = [];
  const feather = new THREE.MeshStandardMaterial({color:'#e8ddd0',roughness:.85,side:THREE.DoubleSide});
  for (let i=0;i<(mobile?4:7);i++) {
    const root = new THREE.Group(); oval(root,feather,[0,0,0],[.16,.18,.38]);
    oval(root,dark,[0,.13,.27],[.13,.13,.15]);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(.05,.18,8),new THREE.MeshStandardMaterial({color:'#c5a171'}));
    beak.rotation.x=Math.PI/2;beak.position.set(0,.11,.44);root.add(beak);
    const wings=[];
    for(const side of [-1,1]){
      const wing = fin(root,feather,[[0,.12],[side*.38,.2],[side*.95,-.15],[side*.64,-.27],[side*.32,-.25],[0,-.16]]);
      wing.rotation.x=Math.PI/2;wing.position.x=side*.1; wings.push(wing);
      for(let j=0;j<4;j++) oval(wing,dark,[side*(.50+j*.10),-.17-j*.015,0],[.11,.055,.012]);
    }
    const tail=fin(root,feather,[[-.16,-.25],[0,-.55],[.16,-.25]]);tail.rotation.x=Math.PI/2;
    scene.add(root);birds.push({root,wings});
  }
  const deer=[],fur=new THREE.MeshStandardMaterial({color:'#9b714b',roughness:1}),cream=new THREE.MeshStandardMaterial({color:'#d9cbb0',roughness:1});
  for(let i=0;i<(mobile?3:5);i++){
    const root=new THREE.Group(),head=new THREE.Group();root.name='Grazing deer';
    oval(root,fur,[0,1.05,0],[.34,.47,.75]);oval(root,cream,[0,.85,.22],[.27,.24,.5]);
    head.position.set(0,1.3,.5);root.add(head);oval(head,fur,[0,.32,.15],[.18,.47,.2]);
    oval(head,fur,[0,.68,.36],[.2,.22,.32]);oval(head,dark,[0,.63,.64],[.13,.09,.08]);
    for(const side of [-1,1]){const ear=oval(head,fur,[side*.2,.95,.22],[.1,.25,.065]);ear.rotation.z=-side*.45;oval(head,dark,[side*.18,.74,.42],[.027,.03,.03]);}
    const legs=[];for(const x of [-.22,.22])for(const z of [-.46,.45]){const leg=new THREE.Group();leg.position.set(x,.95,z);root.add(leg);oval(leg,fur,[0,-.4,0],[.065,.46,.075]);oval(leg,dark,[0,-.86,.025],[.08,.08,.12]);legs.push(leg);}
    const tail=oval(root,cream,[0,1.18,-.75],[.10,.13,.23]);tail.rotation.x=.5;
    root.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(root);deer.push({root,head,legs,x:i<3?-13-i*4:20+(i-3)*5,z:i<3?6-i*5:-9-(i-3)*5});
  }
  const iron = new THREE.MeshStandardMaterial({color:'#36372f',metalness:.8,roughness:.38});
  const hook = new THREE.CatmullRomCurve3([new THREE.Vector3(1.9,0,-.65),new THREE.Vector3(1.9,2.8,-.65),new THREE.Vector3(1.8,3.7,-.65),new THREE.Vector3(.9,3.8,-.65),new THREE.Vector3(.65,3.48,-.65)]);
  const post = new THREE.Mesh(new THREE.TubeGeometry(hook,40,.035,8,false),iron);post.castShadow=true;bench.add(post);
  const hanging = new THREE.Group();hanging.position.set(.65,3.48,-.65);bench.add(hanging);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.09,.015,6,16),iron);ring.position.y=-.08;hanging.add(ring);
  const lantern = new THREE.Group();lantern.position.y=-.5;hanging.add(lantern);
  for(const y of [-.29,.29]){
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(y>0?.07:.26,.27,.12,6),iron);cap.position.y=y;cap.castShadow=true;lantern.add(cap);
  }
  lantern.add(new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.5,6),new THREE.MeshPhysicalMaterial({color:'#f4d8a0',transparent:true,opacity:.35,roughness:.15,depthWrite:false})));
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;const bar=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.56,5),iron);bar.position.set(Math.cos(a)*.22,0,Math.sin(a)*.22);lantern.add(bar);
  }
  const glow = new THREE.MeshStandardMaterial({color:'#fff0bb',emissive:'#ffbf5e',emissiveIntensity:0,roughness:.6});
  oval(lantern,glow,[0,-.06,0],[.07,.16,.07]);
  const lamp = new THREE.PointLight('#ffc078',0,16,2);lantern.add(lamp);
  const wind={};let sway=0,velocity=0,fishClock=0,lastTime=0;
  return { catchFish(target){
    const available=fish.filter(f=>!f.caughtUntil||f.caughtUntil<=lastTime).sort((a,b)=>a.root.position.distanceToSquared(target)-b.root.position.distanceToSquared(target));
    if(!available.length)return null;available[0].caughtUntil=lastTime+45;available[0].root.visible=false;return {name:'River trout',length:Math.round(18+Math.random()*18)};
  }, update(dt,time,settings) {
    lastTime=time;
    const {night}=daylight(settings.day), activity=1-night*.65;
    fishClock+=dt*activity*(.65+settings.river*.35);
    fish.forEach(({root,tail},i)=>{
      root.visible=!(fish[i].caughtUntil>time);if(!root.visible)return;
      const p=fishPosition(fishClock,i), next=fishPosition(fishClock+.04,i);
      root.position.copy(p);root.lookAt(next);tail.rotation.y=Math.sin(time*(4+settings.river)+i)*.4;
    });
    birds.forEach(({root,wings},i)=>{
      const a=time*(.065+i*.002)+i*.62;
      const x=-4+Math.cos(a)*(15+i),z=-20+Math.sin(a)*(11+i*.7);
      sampleWind(time,x,z,settings.wind,wind);
      const perch=THREE.MathUtils.smoothstep(night,.4,1);
      root.position.set(THREE.MathUtils.lerp(x+wind.x*.6,-3+i*1.2,perch),THREE.MathUtils.lerp(14+Math.sin(a*2+i)*1.5+wind.y,12.7+i*.35,perch),THREE.MathUtils.lerp(z+wind.z*.6,-4,perch));
      root.rotation.y=Math.atan2(-15*Math.sin(a),11*Math.cos(a));root.rotation.z=Math.sin(a)*.13*(1-perch);
      wings.forEach((wing,j)=>{wing.rotation.y=(j?1:-1)*THREE.MathUtils.lerp(Math.sin(time*5+i)*.55,1.3,perch);});
    });
    deer.forEach(({root,head,legs,x,z},i)=>{
      const a=time*.035+i,pace=Math.sin(time*.22+i)>.35;
      const px=x+Math.cos(a)*1.8,pz=z+Math.sin(a)*1.4;
      root.position.set(px,ground(px,pz),pz);root.rotation.y=Math.atan2(-1.8*Math.sin(a),1.4*Math.cos(a));
      head.rotation.x=pace?.05:.75+Math.sin(time*1.5+i)*.08;
      legs.forEach((leg,j)=>leg.rotation.x=pace?Math.sin(time*3+i+(j===0||j===3?0:Math.PI))*.16:0);
    });
    sampleWind(time,-6,-4,settings.wind,wind);
    // Damped pendulum: gravity restores the lantern, wind supplies torque.
    velocity+=(wind.x*.55-9.81/.5*sway-2.4*velocity)*dt;sway+=velocity*dt;
    hanging.rotation.z=sway;hanging.rotation.x=wind.z*.025;
    const dusk=THREE.MathUtils.smoothstep(settings.day,.56,.88);
    lamp.intensity=dusk*14*(1+Math.sin(time*3.1)*.025);glow.emissiveIntensity=dusk*5;
  }};
}
