import * as THREE from 'three';
import { ground } from './landscape.js';
import { bridge, bridgeHeight } from './navigation.js';

export function makeScenery(scene, secondBench) {
  const lanterns=[];
  const iron=new THREE.MeshStandardMaterial({color:'#35382f',metalness:.7,roughness:.5});
  const warm=new THREE.MeshStandardMaterial({color:'#ffe5a3',emissive:'#ffbd61',emissiveIntensity:.2});
  const sphere=new THREE.SphereGeometry(1,12,8);
  function lantern(parent,x,y,z){
    const root=new THREE.Group();root.position.set(x,y,z);parent.add(root);
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.045,.065,2.8,8),iron);post.position.y=1.4;root.add(post);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(.6,.065,.065),iron);arm.position.set(-.25,2.75,0);root.add(arm);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.36,6),warm);body.position.set(-.48,2.4,0);root.add(body);
    for(const height of [2.18,2.62]){const cap=new THREE.Mesh(new THREE.CylinderGeometry(.12,.24,.1,6),iron);cap.position.set(-.48,height,0);root.add(cap);}
    for(let i=0;i<4;i++){const bar=new THREE.Mesh(new THREE.BoxGeometry(.025,.4,.025),iron);bar.position.set(-.48+Math.cos(i*Math.PI/2)*.15,2.4,Math.sin(i*Math.PI/2)*.15);root.add(bar);}
    lanterns.push(root);return root;
  }
  for(const side of [-1,1])for(const t of [-.8,0,.8]){const x=bridge.x+t*bridge.halfLength;lantern(scene,x,bridgeHeight(x),bridge.z+side*(bridge.halfWidth+.12));}
  lantern(secondBench,1.9,0,-.65);
  // Snow-capped, broad volcanic cone behind the left foothills.
  const volcano=new THREE.CylinderGeometry(3,64,84,96,32,true),p=volcano.attributes.position,colors=[];
  const rock=new THREE.Color('#637c89'),snow=new THREE.Color('#f5f0e5');
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x);const grooves=1+Math.sin(a*23)*.025+Math.sin(a*41)*.015;p.setXYZ(i,x*grooves,y,z*grooves);const line=19+Math.sin(a*7)*3+Math.sin(a*13)*2;const c=rock.clone().lerp(snow,THREE.MathUtils.smoothstep(y,line,line+4));c.multiplyScalar(.94+.06*Math.cos(a*23));colors.push(c.r,c.g,c.b);}
  volcano.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));volcano.computeVertexNormals();
  const fuji=new THREE.Mesh(volcano,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));fuji.position.set(-108,36,-245);scene.add(fuji);
  // Layered left meadow, rounded shrubs and a low stone path.
  const green=new THREE.MeshStandardMaterial({color:'#65744c',roughness:1});
  const stone=new THREE.MeshStandardMaterial({color:'#929181',roughness:1});
  const shrubs=new THREE.InstancedMesh(sphere,green,70),stones=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),stone,35),d=new THREE.Object3D();
  for(let i=0;i<70;i++){const x=-30-(i*7.31%45),z=-45-(i*3.73%90);d.position.set(x,ground(x,z)+.3,z);d.scale.set(1.2+i%3,.7+(i%4)*.2,1.3);d.updateMatrix();shrubs.setMatrixAt(i,d.matrix);}
  for(let i=0;i<35;i++){const x=-26+Math.sin(i*.22)*3,z=20-i*1.8;d.position.set(x,ground(x,z),z);d.scale.set(.65,.12,.8);d.rotation.y=i;d.updateMatrix();stones.setMatrixAt(i,d.matrix);}
  shrubs.castShadow=stones.receiveShadow=true;scene.add(shrubs,stones);
  return {update(day,time){warm.emissiveIntensity=.25+THREE.MathUtils.smoothstep(day,.5,.9)*4;for(let i=0;i<lanterns.length;i++)lanterns[i].rotation.z=Math.sin(time*.8+i)*.008;}};
}
