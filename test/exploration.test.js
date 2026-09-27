import assert from 'node:assert/strict';
import { bridge, bridgeHeight, canWalk, clearWalk, walkingPath } from '../src/navigation.js';
import { initialQuality, adaptiveQuality } from '../src/performance.js';

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
