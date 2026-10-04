import assert from 'node:assert/strict';
import { bridge, bridgeHeight, canWalk, clearWalk, walkingPath } from '../src/navigation.js';
import { initialQuality, adaptiveQuality } from '../src/performance.js';
import * as THREE from 'three';
import { makeScenery } from '../src/scenery.js';
import { assetGeometry } from '../src/materials.js';
import { reelStep, fishingPhase } from '../src/fishing.js';
import { hutPlaces, benchPlaces, secondTree } from '../src/places.js';
import { riverX, riverWidth } from '../src/landscape.js';

let reeling={progress:0,tension:0};
for(let i=0;i<9;i++){reeling=reelStep(reeling.progress,reeling.tension,.8,true);assert.ok(reeling.tension<1,'Measured pulls preserve the line.');}
assert.equal(reeling.progress,1,'Steady reeling lands the fish.');
let rushed={progress:0,tension:0};for(let i=0;i<5;i++)rushed=reelStep(rushed.progress,rushed.tension,0,true);
assert.ok(rushed.tension>=1,'Rapid pulling breaks the line.');
assert.equal(fishingPhase(3,3),'bite');assert.equal(fishingPhase(5.5,3),'missed');
for(const hut of hutPlaces){assert.equal(canWalk(hut.x,hut.z),false);assert.ok(Math.abs(hut.x-riverX(hut.z))>riverWidth(hut.z)+4);}
assert.ok(Math.hypot(benchPlaces[1].x-secondTree.x,benchPlaces[1].z-secondTree.z)<3,'Far bench is under its tree.');

for(const name of ['lanternMetal','lanternGlass','stone','distantTree']){
  const geometry=assetGeometry(name),position=geometry.attributes.position;
  assert.ok(position.count>0&&position.array.every(Number.isFinite),`${name} has valid exported positions.`);
  assert.ok(geometry.attributes.normal.array.every(Number.isFinite));
  const triangles=(geometry.index?.count??position.count)/3;
  assert.ok(triangles<=10000,`${name} stays within the shared mesh triangle budget.`);
  assert.equal(geometry,assetGeometry(name),'Repeated scene props share exported geometry.');
}

const scene=new THREE.Scene(),bench=new THREE.Group();scene.add(bench);
const scenery=makeScenery(scene,bench),lights=[],halos=[];
scene.traverse(object=>{if(object.isPointLight)lights.push(object);if(object.isSprite)halos.push(object);});
assert.equal(lights.length,11,'Bridge, bench and four path light sources illuminate the scene.');
assert.equal(halos.length,21,'Fourteen additional path lanterns share the glow material.');
scenery.update(.24,0);
assert.ok(lights.every(light=>!light.visible&&light.intensity===0));
scenery.update(1,0);
assert.ok(lights.every(light=>light.visible&&light.intensity>0&&!light.castShadow));
assert.ok(halos.every(halo=>halo.material.opacity>0&&!halo.material.depthWrite));
assert.equal(halos[0].material,halos[6].material,'Lantern halos share their texture and material.');

const start={x:-7,z:4},end={x:25,z:-9};
const route=walkingPath(start,end);
assert.ok(route.length>1,'Opposite banks must route over the bridge.');
let from=start;
for(const point of route){assert.ok(clearWalk(from,point),'Every path segment must stay on walkable ground.');from=point;}
assert.deepEqual(route.at(-1),end);
assert.equal(canWalk(bridge.x,bridge.z+5),false,'Cannot walk into the river.');
assert.equal(canWalk(bridge.x,bridge.z),true);
assert.equal(canWalk(-18,-18),false,'House walls are solid.');
assert.ok(bridgeHeight(bridge.x)>bridgeHeight(bridge.x-bridge.halfLength));
assert.deepEqual(walkingPath(start,{x:500,z:500}),[]);
assert.equal(initialQuality({cores:4,memory:8}),0);
assert.equal(initialQuality({cores:12,memory:16}),2);
const quality=adaptiveQuality(2);
let result;
for(let i=0;i<82;i++)result=quality.sample(.05)||result;
assert.equal(result.level,1,'Sustained low FPS reduces quality.');
for(let i=0;i<82;i++)result=quality.sample(.05)||result;
assert.equal(result.level,0);
for(let i=0;i<1000;i++)result=quality.sample(1/60)||result;
assert.equal(result.level,1,'Recovery requires multiple stable windows.');
quality.reset();
assert.equal(quality.sample(.02),null);
console.log('Bridge routing, collision boundaries and adaptive quality checks passed.');
