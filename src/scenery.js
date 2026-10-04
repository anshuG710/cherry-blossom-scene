import * as THREE from 'three';
import { ground, riverX } from './landscape.js';
import { bridge, bridgeHeight } from './navigation.js';
import { assetGeometry } from './materials.js';
import { hutPlaces } from './places.js';

export function makeScenery(scene, secondBench) {
  const lanterns=[];
  const iron=new THREE.MeshStandardMaterial({color:'#343c35',metalness:.72,roughness:.34});
  const warm=new THREE.MeshStandardMaterial({color:'#ffe5b8',roughness:.24,emissive:'#ffbd61',emissiveIntensity:.2});
  const sphere=new THREE.SphereGeometry(1,12,8);
  // Shared radial halo stays visible even when postprocessing is disabled.
  const pixels=new Uint8Array(64*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
    const r=Math.hypot((x-31.5)/31.5,(y-31.5)/31.5),i=(y*64+x)*4;
    pixels[i]=pixels[i+1]=pixels[i+2]=255;
    pixels[i+3]=Math.round(255*Math.exp(-r*r*7)*Math.pow(Math.max(0,1-r),2));
  }
  const haloTexture=new THREE.DataTexture(pixels,64,64);
  haloTexture.magFilter=haloTexture.minFilter=THREE.LinearFilter;haloTexture.needsUpdate=true;
  const haloMaterial=new THREE.SpriteMaterial({map:haloTexture,color:'#ffc477',transparent:true,
    opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  function lantern(parent,x,y,z,illuminate=true){
    const root=new THREE.Group();root.position.set(x,y,z);parent.add(root);
    const frame=new THREE.Mesh(assetGeometry('lanternMetal'),iron);frame.castShadow=frame.receiveShadow=true;root.add(frame);
    const body=new THREE.Mesh(assetGeometry('lanternGlass'),warm);root.add(body);
    const halo=new THREE.Sprite(haloMaterial);halo.position.set(-.48,2.4,0);halo.scale.set(1.65,1.65,1);root.add(halo);
    const light=illuminate?new THREE.PointLight('#ffd095',0,8,2):null;if(light){light.position.copy(halo.position);root.add(light);}
    lanterns.push({root,light});return root;
  }
  for(const side of [-1,1])for(const t of [-.8,0,.8]){const x=bridge.x+t*bridge.halfLength;lantern(scene,x,bridgeHeight(x),bridge.z+side*(bridge.halfWidth+.12));}
  lantern(secondBench,1.9,0,-.65);
  // Path lamps share geometry; only four extra light sources keep lighting affordable.
  const pathStone=new THREE.MeshStandardMaterial({color:'#b4a78c',roughness:1});
  const pathGeometry=new THREE.CylinderGeometry(.58,.66,.10,7);
  for(const side of [-1,1])for(let i=0;i<7;i++){
    const z=12-i*9,x=side<0?-26+Math.sin((20-z)/1.8*.22)*3:22+Math.sin(z*.05)*3;
    lantern(scene,x+side*1.5,ground(x+side*1.5,z),z,i===1||i===4);
    if(side>0)for(let j=0;j<5;j++){const pz=z-j*1.8,px=22+Math.sin(pz*.05)*3;
      const step=new THREE.Mesh(pathGeometry,pathStone);step.position.set(px,ground(px,pz)+.03,pz);step.receiveShadow=true;scene.add(step);}
  }
  const plaster=new THREE.MeshStandardMaterial({color:'#cebfa1',roughness:1});
  const timber=new THREE.MeshStandardMaterial({color:'#65513e',roughness:.9});
  const roofMat=new THREE.MeshStandardMaterial({color:'#635a45',roughness:1});
  const windowMat=new THREE.MeshStandardMaterial({color:'#bdc6bd',emissive:'#ffbc64',emissiveIntensity:0,roughness:.3});
  const cube=new THREE.BoxGeometry(1,1,1),roofGeo=new THREE.ConeGeometry(4.5,2.1,4);
  function block(parent,mat,x,y,z,sx,sy,sz){const m=new THREE.Mesh(cube,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);}
  for(const place of hutPlaces){
    const hut=new THREE.Group();hut.position.set(place.x,ground(place.x,place.z)-.15,place.z);hut.rotation.y=place.angle;scene.add(hut);
    block(hut,pathStone,0,.3,0,5.7,.6,5.7);block(hut,plaster,0,1.8,0,5.2,3,5.2);
    const roof=new THREE.Mesh(roofGeo,roofMat);roof.position.y=4.25;roof.rotation.y=Math.PI/4;roof.castShadow=true;hut.add(roof);
    for(const x of [-2.65,2.65])for(const z of [-2.65,2.65])block(hut,timber,x,1.9,z,.18,3.3,.18);
    block(hut,timber,0,1.3,2.63,1.05,2,.12);
    for(const x of [-1.7,1.7]){block(hut,timber,x,2,2.65,1.15,1.25,.12);block(hut,windowMat,x,2,2.73,.9,1,.04);block(hut,timber,x,2,2.77,.07,1,.04);}
    block(hut,timber,1.6,4.3,-1.2,.55,2,.55);
    for(let j=1;j<=4;j++){const step=new THREE.Mesh(pathGeometry,pathStone);const local=new THREE.Vector3(0,0,2.8+j*.85).applyAxisAngle(new THREE.Vector3(0,1,0),place.angle);const x=place.x+local.x,z=place.z+local.z;step.position.set(x,ground(x,z)+.04,z);scene.add(step);}
  }
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
  // One shared silhouette mesh adds a wooded depth plane behind the meadow.
  const forest=new THREE.InstancedMesh(assetGeometry('distantTree'),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),90);
  const tint=new THREE.Color();
  for(let i=0;i<forest.count;i++){
    const z=-48-(i*7.37%28),side=i%2?1:-1,x=riverX(z)+side*(20+(i*13.71%75));
    d.position.set(x,ground(x,z)-.15,z);d.rotation.set(0,i*2.4,0);
    const size=.7+(i*1.37%1.1);d.scale.set(size,size*(.8+i%3*.12),size);d.updateMatrix();forest.setMatrixAt(i,d.matrix);
    forest.setColorAt(i,tint.setHSL(.25+i%4*.014,.2,.5+i%5*.025));
  }
  scene.add(forest);
  return {update(day,time){
    const dusk=THREE.MathUtils.smoothstep(day,.56,.9);
    warm.emissiveIntensity=.12+dusk*5;
    haloMaterial.opacity=dusk*.65;
    windowMat.emissiveIntensity=dusk*2.2;
    for(let i=0;i<lanterns.length;i++){
      const {root,light}=lanterns[i];
      root.rotation.z=Math.sin(time*.8+i)*.004;
      if(light){light.visible=dusk>.01;
      light.intensity=dusk*12*(1+Math.sin(time*2.1+i*1.7)*.015);}
    }
  }};
}
