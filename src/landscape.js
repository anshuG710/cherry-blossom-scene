import * as THREE from 'three';
import { sampleWind, advancePetal } from './weather.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Water } from 'three/addons/objects/Water.js';
import { blossomGeometry, blossomMaterial, barkMaterial, detailWater } from './details.js';

let seed = 41729;
const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
const range = (a,b) => a+(b-a)*rand();
const dummy = new THREE.Object3D();
const color = new THREE.Color();
export const riverX = z => 5 + 6*Math.sin(z*.031+.4)+2.2*Math.sin(z*.081);
export const riverWidth = z => 3.6 + 1.5*(Math.sin(z*.024+1)+1);
const noise = (x,z) => Math.sin(x*.21+Math.sin(z*.13))*Math.cos(z*.19)+.45*Math.sin(x*.63+z*.37)+.18*Math.cos(x*1.4-z*.87);
export function ground(x,z) {
  const bank=Math.abs(x-riverX(z))-riverWidth(z);
  return .22 + Math.min(1,Math.max(0,bank)*.35) * (1.25 + noise(x,z)*.52 + Math.max(0,-z-22)*.033);
}
function mesh(geo,mat,parent){const m=new THREE.Mesh(geo,mat);parent.add(m);return m;}
function taper(points,radius){
 const curve=new THREE.CatmullRomCurve3(points); const length=curve.getLength(); const steps=Math.max(8,Math.ceil(length*5)); const sides=radius>.4?22:radius>.12?14:7;
 const frames=curve.computeFrenetFrames(steps,false), verts=[], normals=[], uv=[], idx=[];
 for(let i=0;i<=steps;i++){const t=i/steps,p=curve.getPointAt(t);const r=radius*Math.pow(1-t,.85)+Math.max(.0015,radius*.025);for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;const n=frames.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i],Math.sin(a));const rr=r*(1+.07*Math.sin(a*5+t*9)+.035*Math.sin(a*11-t*13));verts.push(p.x+n.x*rr,p.y+n.y*rr,p.z+n.z*rr);normals.push(n.x,n.y,n.z);uv.push(j/sides,t*length);if(i<steps&&j<sides){const k=i*(sides+1)+j;idx.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function makeLandscape(scene,renderer,mobile){
 const anim={branches:[],water:null,grass:null,clouds:[],petals:null,ridgeMaterials:[]};
 const terrainMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});anim.terrainMaterial=terrainMat;
 // Separate riverbanks share the exact water boundary, including through bends.
 for(const side of [-1,1]){const verts=[],cols=[],indices=[], nx=90,nz=220;
  for(let j=0;j<=nz;j++){const z=65-j;for(let i=0;i<=nx;i++){const d=i/nx;const x=riverX(z)+side*(riverWidth(z)+d*d*125);const y=ground(x,z);verts.push(x,y,z);const variation=noise(x,z);color.setHSL(.235+variation*.025,.37+rand()*.16,.18+rand()*.045+variation*.02);if(i<3)color.lerp(new THREE.Color('#9b9075'),.68-i*.17);cols.push(color.r,color.g,color.b);if(i<nx&&j<nz){const a=j*(nx+1)+i;indices.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));g.setIndex(indices);g.computeVertexNormals();const m=mesh(g,terrainMat,scene);m.material.side=THREE.DoubleSide;m.receiveShadow=true;
 }
 // An eroded, ridged mountain massif: layered irregular peaks, with slope-dependent snow.
 const peaks=[[-76,-146,43,29],[-49,-169,59,31],[-12,-163,70,31],[22,-175,80,30],[56,-162,54,29],[87,-187,69,38],[-112,-184,60,39]];
 const mg=new THREE.PlaneGeometry(330,160,230,130);mg.rotateX(-Math.PI/2);mg.translate(0,0,-170);const pos=mg.attributes.position,mc=[];
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);let h=0;for(const [px,pz,ph,pw] of peaks){const dx=(x-px)/pw,dz=(z-pz)/(pw*.8),d=Math.sqrt(dx*dx+dz*dz);h=Math.max(h,ph*.73*Math.max(0,1-d*(.62+.065*Math.sin(Math.atan2(dz,dx)*7+px))));}const ridge=Math.sin(x*.22+z*.17)*2.7+Math.sin(x*.53-z*.29)*1.7+noise(x*1.5,z*1.5)*2.4;h=Math.max(-1,h+ridge*Math.min(h*.08,1));pos.setY(i,h);}
 mg.computeVertexNormals();for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=pos.getY(i),slope=mg.attributes.normal.getY(i);const strata=Math.sin(h*.36+x*.19+noise(x*.7,z*.7)*2.3)*.10;const snow=THREE.MathUtils.smoothstep(h+noise(x*.8,z*.8)*5+(slope-.75)*34,21,30);color.set('#344d62').lerp(new THREE.Color('#f2f6fa'),snow);color.multiplyScalar(.81+rand()*.12+strata*(1-snow*.65));mc.push(color.r,color.g,color.b);}mg.setAttribute('color',new THREE.Float32BufferAttribute(mc,3));const mountainMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,side:THREE.DoubleSide});anim.mountainMaterial=mountainMat;mesh(mg,mountainMat,scene);
 // Lower wooded ridges sit in front of the snowy peaks to separate the depth planes.
 for(let layer=0;layer<3;layer++){const g=new THREE.PlaneGeometry(300,42,120,22);g.rotateX(-Math.PI/2);g.translate(0,0,-83-layer*22);const a=g.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i);const valley=1-Math.exp(-Math.pow((x-riverX(z))/22,2));a.setY(i,1+valley*(7+layer*4+noise(x*.37,z*.35)*4)*(1-Math.pow((z+83+layer*22)/23,2)));}g.computeVertexNormals();const ridgeMat=new THREE.MeshStandardMaterial({color:['#455f57','#637c73','#82918a'][layer],roughness:1});anim.ridgeMaterials.push(ridgeMat);mesh(g,ridgeMat,scene);}
 const wg=new THREE.PlaneGeometry(2,220,34,280);const wp=wg.attributes.position;
 for(let i=0;i<wp.count;i++){const z=-wp.getY(i)-45;wp.setX(i,riverX(z)+wp.getX(i)*riverWidth(z));}wg.computeVertexNormals();
 const size=256,data=new Uint8Array(size*size*4);
 const waves=Array.from({length:18},()=>({x:Math.floor(range(2,24)),y:Math.floor(range(2,24)),p:range(0,6.28),a:range(.8,2.2)}));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;const a=x/size*Math.PI*2,b=y/size*Math.PI*2;let nx=0,nz=0;for(const w of waves){nx+=Math.cos(a*w.x+b*w.y+w.p)*w.a;nz+=Math.sin(a*w.y-b*w.x+w.p)*w.a;}data[i]=128+nx*2;data[i+1]=128+nz*2;data[i+2]=245;data[i+3]=255;}
 const normal=new THREE.DataTexture(data,size,size);normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.needsUpdate=true;
 const water=new Water(wg,{textureWidth:mobile?256:768,textureHeight:mobile?256:768,waterNormals:normal,sunDirection:new THREE.Vector3(-.6,.7,-.4),sunColor:0xffe0b6,waterColor:0x125d53,distortionScale:2.8,fog:true});water.rotation.x=-Math.PI/2;water.position.set(0,.19,-45);detailWater(water);scene.add(water);anim.water=water;
 // Directional surface streaks track the river's changing centerline.
 const foamG=new THREE.PlaneGeometry(2,220,1,220);foamG.rotateX(-Math.PI/2);const fp=foamG.attributes.position;for(let i=0;i<fp.count;i++){let z=fp.getZ(i)-45;fp.setXYZ(i,riverX(z)+fp.getX(i)*riverWidth(z)*.98,.23,z);}foamG.computeVertexNormals();
 const detailLight={value:1};anim.detailLight=detailLight;
 const foamMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},detailLight},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time;uniform float detailLight;void main(){float x=vUv.x;float z=vUv.y*150.+time*1.4;float wave=sin(z*4.+sin(x*57.+z*.3)*2.);float ribbon=pow(max(0.,wave),24.)*pow(max(0.,sin(x*81.+sin(z*.18)*3.)),14.);float edges=pow(abs(x-.5)*2.,16.)*.23;gl_FragColor=vec4(vec3(.85,.94,.84)*detailLight,ribbon*.20+edges*(.4+.3*sin(z*2.)));}`});mesh(foamG,foamMat,scene);anim.foam=foamMat;
 const bark=barkMaterial();
 const tree=new THREE.Group();tree.position.set(-2,ground(-2,-3)-.08,-3);tree.scale.setScalar(1.35);scene.add(tree);
 const trunkPts=[new THREE.Vector3(0,0,0),new THREE.Vector3(-.65,2,.2),new THREE.Vector3(-.25,4,.05),new THREE.Vector3(.6,6.3,-.2),new THREE.Vector3(1,8,-.3)];
 const trunk=mesh(taper(trunkPts,.82),bark,tree);trunk.castShadow=true;trunk.receiveShadow=true;
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2;const p=[new THREE.Vector3(Math.cos(a)*2.4,0,Math.sin(a)*2),new THREE.Vector3(Math.cos(a)*1.1,.2,Math.sin(a)*.9),new THREE.Vector3(0,.85,0)];const m=mesh(taper(p.reverse(),.23),bark,tree);m.castShadow=true;}
 const blossomGeo=blossomGeometry(!mobile);const blossomMat=blossomMaterial();blossomMat.emissiveMap=blossomMat.map;anim.blossomMaterial=blossomMat;
 const fallenMat=blossomMat.clone();fallenMat.emissiveIntensity=0;anim.fallenMaterial=fallenMat;
 const petalSources=[];
 const leafGeo=new THREE.IcosahedronGeometry(1,0);
 const leafMat=new THREE.MeshStandardMaterial({color:'#718263',vertexColors:false,side:THREE.DoubleSide,roughness:.88});
 // Two staggered branch rings fill the whole crown, including its back and upper center.
 for(let b=0;b<20;b++){
  const outer=b<12,ringIndex=outer?b:b-12,ringCount=outer?12:8;
  const angle=(ringIndex+(outer?0:.5))/ringCount*Math.PI*2+.15;
  const group=new THREE.Group();group.position.set(-.15+Math.cos(angle)*.17,outer?4.3+(b%3)*.28:6.3+(b%3)*.35,Math.sin(angle)*.17);tree.add(group);
  anim.branches.push({group,phase:range(0,6),amp:range(.008,.016)});
  const reach=outer?range(5.4,6.9):range(2.6,4.1);
  const end=new THREE.Vector3(Math.cos(angle)*reach,outer?range(2.4,3.3):range(2.2,3.3),Math.sin(angle)*reach*range(.87,1.04));
  const geos=[],tips=[];const base=new THREE.Vector3();
  geos.push(taper([base,new THREE.Vector3(end.x*.2,1.2,end.z*.2),new THREE.Vector3(end.x*.67,end.y*.82,end.z*.75),end],outer?.29:.17));
  function twig(start,dir,length,r,depth){const finish=start.clone().addScaledVector(dir,length);const mid=start.clone().lerp(finish,.5);mid.y+=length*.16;geos.push(taper([start,mid,finish],r));if(depth===0){tips.push(finish);return;}for(let k=0;k<3;k++){const d=dir.clone().add(new THREE.Vector3(range(-.65,.65),range(-.1,.65),range(-.65,.65))).normalize();twig(finish,d,length*range(.5,.72),r*.48,depth-1);}}
  for(let j=0;j<5;j++){const t=.36+j*.14;const start=end.clone().multiplyScalar(t);start.y+=.3;const d=new THREE.Vector3(Math.cos(angle+range(-1.2,1.2))*.8,outer?range(-.12,.48):range(.12,.75),Math.sin(angle+range(-1.2,1.2))*.8).normalize();twig(start,d,range(1.3,2.3),.085,2);}
  const branches=mesh(mergeGeometries(geos),bark,group);branches.castShadow=true;branches.receiveShadow=true;geos.forEach(g=>g.dispose());
  const flowersPerTip=mobile?30:40,count=tips.length*flowersPerTip,blossoms=new THREE.InstancedMesh(blossomGeo,blossomMat,count);let idx=0;
  for(const tip of tips){for(let n=0;n<flowersPerTip;n++){const a=range(0,Math.PI*2),u=range(-1,1),r=Math.cbrt(rand())*range(.45,.88);dummy.position.copy(tip).add(new THREE.Vector3(Math.cos(a)*Math.sqrt(1-u*u)*r,u*r*.72,Math.sin(a)*Math.sqrt(1-u*u)*r));dummy.rotation.set(range(0,6),range(0,6),range(0,6));dummy.scale.setScalar(range(1.08,1.9));dummy.updateMatrix();blossoms.setMatrixAt(idx,dummy.matrix);color.setHSL(range(.93,.98),range(.20,.43),range(.77,.94));blossoms.setColorAt(idx++,color);}petalSources.push({position:tip.clone(),group});}
  blossoms.castShadow=true;blossoms.receiveShadow=true;group.add(blossoms);
  // Sparse pointed leaves and dark buds give each flower cloud a visible stem.
  const leaves=new THREE.InstancedMesh(leafGeo,leafMat,tips.length);
  tips.forEach((tip,i)=>{dummy.position.copy(tip).add(new THREE.Vector3(range(-.2,.2),-.24,range(-.2,.2)));dummy.rotation.set(range(-.7,.7),range(0,6),range(-.6,.6));dummy.scale.set(.055,range(.14,.26),.035);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,color.setHSL(range(.22,.32),range(.20,.40),range(.26,.42)));});
  group.add(leaves);
 }
 // Understory: a single draw call for tens of thousands of wind-bent grass blades.
 const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.045,0,0,.045,0,0,-.035,.35,0,.035,.35,0,.06,.72,0],3));blade.setIndex([0,1,2,1,3,2,2,3,4]);blade.computeVertexNormals();
 const grassMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,side:THREE.DoubleSide});anim.grassMaterial=grassMat;const windUniform={value:.55},timeUniform={value:0};anim.windUniform=windUniform;anim.timeUniform=timeUniform;
 grassMat.onBeforeCompile=s=>{s.uniforms.uTime=timeUniform;s.uniforms.uWind=windUniform;
 s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;uniform float uWind;')
 .replace('#include <begin_vertex>',`#include <begin_vertex>
 vec4 wp=instanceMatrix*vec4(position,1.);
 float angle=uTime*.23+sin(uTime*.17)*.65;
 float gust=uWind*(.75+.25*sin(uTime*1.1+wp.x*.13+wp.z*.09));
 float swirl=sin(wp.x*.16-wp.z*.12+uTime*.7)*.32;
 vec2 bend=vec2(cos(angle+swirl),sin(angle+swirl))*gust*pow(position.y,2.)*.6;
 // Convert world wind into each blade's rotated local frame.
 vec3 localBend=transpose(mat3(instanceMatrix))*vec3(bend.x,0.,bend.y);
 transformed.xz+=localBend.xz;
 `);};
 const grassCount=mobile?18000:42000,grass=new THREE.InstancedMesh(blade,grassMat,grassCount);let gi=0;
 while(gi<grassCount){const near=rand()<.78;const x=near?range(-26,30):range(-55,55),z=near?range(-30,42):range(-65,42),d=Math.abs(x-riverX(z))-riverWidth(z);if(d<.4||rand()>.7)continue;dummy.position.set(x,ground(x,z)-.035,z);dummy.rotation.set(0,range(0,Math.PI*2),range(-.14,.14));dummy.scale.set(range(.7,1.5),range(.25,1.05)*(z<-35?.75:1),1);dummy.updateMatrix();grass.setMatrixAt(gi,dummy.matrix);color.setHSL(range(.18,.28),range(.35,.62),range(.25,.43));grass.setColorAt(gi++,color);}grass.receiveShadow=true;scene.add(grass);anim.grass=grass;
 const rockG=new THREE.IcosahedronGeometry(1,2);const rp=rockG.attributes.position;for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i),r=1+.14*noise(x*3,z*3+y);rp.setXYZ(i,x*r,y*r,z*r);}rockG.computeVertexNormals();
 const rockMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
 rockMat.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vRock;varying float vUp;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRock=position;vUp=normal.y;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vRock;varying float vUp;').replace('#include <color_fragment>','#include <color_fragment>\nfloat moss=smoothstep(.2,.8,vUp+sin(vRock.x*19.+sin(vRock.z*14.))*.23);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.10,.17,.045),moss*.72);');};const rocks=new THREE.InstancedMesh(rockG,rockMat,470);
 for(let i=0;i<470;i++){const z=range(-110,48),side=rand()>.5?1:-1;const x=riverX(z)+side*(riverWidth(z)+range(-.25,5));const s=range(.13,.8)*(i<25?1.7:1);dummy.position.set(x,ground(x,z)-s*.28,z);dummy.rotation.set(range(-.3,.3),range(0,6),range(-.4,.4));dummy.scale.set(s*range(1,1.6),s*.66,s);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);color.setHSL(.16+rand()*.08,.10+rand()*.17,range(.23,.43));rocks.setColorAt(i,color);}rocks.castShadow=true;rocks.receiveShadow=true;scene.add(rocks);
 // Partly submerged stones interrupt the current; their wakes stretch downstream.
 const riverStones=new THREE.InstancedMesh(rockG,rockMat,24);
 const wakeGeo=new THREE.PlaneGeometry(1,1);wakeGeo.rotateX(-Math.PI/2);
 const wakeMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:foamMat.uniforms.time,detailLight},
 vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
 fragmentShader:`varying vec2 vUv;uniform float time;uniform float detailLight;
 void main(){float downstream=1.-vUv.y;float spread=.11+downstream*.35;float edge=abs(abs(vUv.x-.5)-spread);
 float wake=(1.-smoothstep(.008,.045,edge))*pow(1.-downstream,1.4);
 float ripple=pow(max(0.,sin(downstream*55.-time*5.+sin(vUv.x*24.))),9.);
 float broken=.45+.55*sin(downstream*37.+vUv.x*18.-time*3.);
 gl_FragColor=vec4(vec3(.72,.84,.77)*detailLight,wake*(.16+ripple*.32)*broken);}`});
 const wakes=new THREE.InstancedMesh(wakeGeo,wakeMat,24);
 for(let i=0;i<24;i++){const z=range(-57,35),side=i%2?1:-1,r=range(.25,.66);
 const x=riverX(z)+side*riverWidth(z)*range(.62,.9);
 dummy.position.set(x,.10,z);dummy.rotation.set(.1,range(0,6),.16);dummy.scale.set(r*1.5,r*.8,r);dummy.updateMatrix();riverStones.setMatrixAt(i,dummy.matrix);
 riverStones.setColorAt(i,color.setHSL(.18,.14,range(.22,.33)));
 dummy.position.set(x,.239,z+r*2.1);dummy.rotation.set(0,-Math.atan(.186*Math.cos(z*.031+.4)+.1782*Math.cos(z*.081)),0);dummy.scale.set(r*5,1,r*6);dummy.updateMatrix();wakes.setMatrixAt(i,dummy.matrix);}
 riverStones.castShadow=true;riverStones.receiveShadow=true;scene.add(riverStones,wakes);
 // Fern-like understory leaves and small cream wildflowers.
 const leafG=new THREE.SphereGeometry(1,5,3);leafG.scale(.055,.3,.018);leafG.translate(0,.27,0);const plants=new THREE.InstancedMesh(leafG,grassMat,2400);
 for(let i=0;i<2400;i++){const patch=Math.floor(i/12),a=i%12/12*Math.PI*2;const z=-35+(patch*7.71%65),x=riverX(z)+(patch%2?1:-1)*(riverWidth(z)+1+(patch*3.73%15));dummy.position.set(x,ground(x,z),z);dummy.rotation.set(Math.cos(a)*.8,a,Math.sin(a)*.8);dummy.scale.setScalar(.8+(patch*.71%1.3));dummy.updateMatrix();plants.setMatrixAt(i,dummy.matrix);plants.setColorAt(i,color.setHSL(.24,.46,.31));}scene.add(plants);
 const fallen=new THREE.InstancedMesh(blossomGeo,fallenMat,mobile?650:1600);for(let i=0;i<fallen.count;i++){let x=-2+range(-10,11),z=-3+range(-8,10);if(Math.abs(x-riverX(z))<riverWidth(z)+.2)x=riverX(z)-riverWidth(z)-range(.3,4);dummy.position.set(x,Math.max(.245,ground(x,z)+.02),z);dummy.rotation.set(0,range(0,6),0);dummy.scale.setScalar(range(.4,.8));dummy.updateMatrix();fallen.setMatrixAt(i,dummy.matrix);fallen.setColorAt(i,color.setHSL(range(.93,.98),range(.20,.43),range(.77,.94)));}scene.add(fallen);
 const petalG=new THREE.PlaneGeometry(.12,.18,4,5);petalG.rotateX(-Math.PI/2);const pp=petalG.attributes.position;
 for(let i=0;i<pp.count;i++){const x=pp.getX(i),z=pp.getZ(i);const width=Math.sqrt(Math.max(.03,1-(z/.1)**2));pp.setXYZ(i,x*width,.026*(z/.09)**2+.013*Math.sin(x*40),z);}
 petalG.scale(.65,.65,.65);petalG.computeVertexNormals();const pu=petalG.attributes.uv;for(let i=0;i<pu.count;i++)pu.setX(i,pu.getX(i)*.49);
 const pCount=mobile?1000:2400;const petalMat=blossomMat.clone();petalMat.vertexColors=false;petalMat.emissiveIntensity=0;
 anim.petalMaterial=petalMat;
 const petals=new THREE.InstancedMesh(petalG,petalMat,pCount);petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);petals.frustumCulled=false;scene.add(petals);const particles=[];
 const landedCount=mobile?1600:4200,landed=new THREE.InstancedMesh(petalG,petalMat,landedCount);
 landed.instanceMatrix.setUsage(THREE.DynamicDrawUsage);landed.frustumCulled=false;landed.count=0;scene.add(landed);
 let landedIndex=0;const landedTimes=new Float32Array(landedCount);
 scene.updateMatrixWorld(true);
 const sourcePosition=new THREE.Vector3(),petalWind={},surface={};
 function respawn(p,initial=false){
 const source=petalSources[Math.floor(rand()*petalSources.length)];
 sourcePosition.copy(source.position).add(new THREE.Vector3(range(-.4,.4),range(-.3,.3),range(-.4,.4)));
 source.group.localToWorld(sourcePosition);
 Object.assign(p,{x:sourcePosition.x,y:sourcePosition.y,z:sourcePosition.z,age:0,rest:0,state:'air',vx:0,vy:0,vz:0,phase:range(0,6.28),speed:range(.5,1.35)});
 p.tint ||= new THREE.Color();p.tint.setHSL(range(.93,.98),range(.20,.43),range(.77,.94));
 petals.setColorAt(p.index,p.tint);
 if(initial){p.y-=range(0,sourcePosition.y);p.x+=range(-4,4);p.z+=range(-4,4);}
 }
 for(let i=0;i<pCount;i++){const p={index:i};respawn(p,true);particles.push(p);}petals.instanceColor.needsUpdate=true;anim.petals=petals;
 anim.updatePetals=(dt,t,wind,amount,riverSpeed)=>{
 petals.count=Math.floor(pCount*amount);fallen.count=Math.floor((mobile?650:1600)*amount);
 for(let i=0;i<petals.count;i++){
 const p=particles[i];surface.water=Math.abs(p.x-riverX(p.z))<riverWidth(p.z);
 surface.height=surface.water?.245:ground(p.x,p.z)+.10;
 surface.slope=.186*Math.cos(p.z*.031+.4)+.1782*Math.cos(p.z*.081);
 if(advancePetal(p,dt,t,wind,riverSpeed,surface,petalWind,amount))respawn(p);
 if(p.state==='ground'){
   dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.phase,0);dummy.scale.setScalar(1.6+p.speed*.5);dummy.updateMatrix();
   landed.setMatrixAt(landedIndex,dummy.matrix);landed.setColorAt(landedIndex,p.tint);landedTimes[landedIndex]=t;
   landedIndex=(landedIndex+1)%landedCount;landed.count=Math.min(landed.count+1,landedCount);landed.instanceMatrix.needsUpdate=true;landed.instanceColor.needsUpdate=true;
   respawn(p);
 }
 const flying=p.state==='air';
 dummy.position.set(p.x,p.y,p.z);
 if(flying)dummy.rotation.set(Math.sin(t*p.speed+p.phase)*.85,t*.4+p.phase,Math.sin(t*1.2+p.phase)*.75);
 else dummy.rotation.set(0,p.phase,0);
 const fade=flying?1:Math.min(1,((p.state==='ground'?24:32)-p.rest)/5);
 dummy.scale.setScalar((1+p.speed*.5)*Math.max(0,fade));dummy.updateMatrix();petals.setMatrixAt(i,dummy.matrix);
 }
 petals.instanceMatrix.needsUpdate=true;petals.instanceColor.needsUpdate=true;
 // Keep a visible carpet beneath the tree, with a bounded pool and quiet recycling.
 for(let j=0;j<landed.count;j++)if(t-landedTimes[j]>100){landed.getMatrixAt(j,dummy.matrix);dummy.matrix.scale(new THREE.Vector3(.0,.0,.0));landed.setMatrixAt(j,dummy.matrix);landedTimes[j]=Infinity;landed.instanceMatrix.needsUpdate=true;}
 landed.visible=true;
 };
 // Soft cloud billboards, arranged in broad banks rather than discrete spheres.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');const gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,255,255,.7)');gradient.addColorStop(.45,'rgba(255,255,255,.35)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);const cloudTex=new THREE.CanvasTexture(canvas);
 for(let i=0;i<28;i++){const mat=new THREE.SpriteMaterial({map:cloudTex,color:'#fff0e1',transparent:true,opacity:range(.16,.32),depthWrite:false});const cloud=new THREE.Sprite(mat);cloud.position.set(range(-160,160),range(48,79),range(-205,-145));cloud.scale.set(range(35,75),range(5,11),1);scene.add(cloud);anim.clouds.push(cloud);}
 return anim;
}
