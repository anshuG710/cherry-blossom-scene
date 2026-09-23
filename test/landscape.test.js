import assert from 'node:assert/strict';
import { ground, riverX, riverWidth } from '../src/landscape.js';
import { blossomGeometry } from '../src/details.js';
import { sampleWind, advancePetal, daylight } from '../src/weather.js';

// Both banks must meet the water continuously along every bend.
for (let z = -155; z <= 65; z += .25) {
  const center = riverX(z), width = riverWidth(z);
  assert.ok(Number.isFinite(center) && width > 0);
  for (const side of [-1, 1]) {
    const edge = center + side * width;
    assert.ok(Math.abs(ground(edge, z) - .22) < 1e-9);
    assert.ok(ground(edge + side, z) > .22);
  }
  assert.ok(Math.abs(riverX(z + .01) - center) < .01);
}
console.log('River continuity and riverbank height checks passed.');

for (const detailed of [false, true]) {
  const geometry = blossomGeometry(detailed);
  const { position, normal, uv, color } = geometry.attributes;
  for (const attribute of [position, normal, uv, color]) {
    assert.equal(attribute.count, position.count);
    assert.ok(attribute.array.every(Number.isFinite));
  }
  assert.ok(geometry.index.array.every(index => index < position.count));
  assert.ok(uv.array.every(value => value >= 0 && value <= 1));
  assert.ok(geometry.index.count / 3 <= 90, 'Keep instanced blossoms within the triangle budget.');
  geometry.dispose();
}
console.log('Detailed and mobile blossom geometry checks passed.');

const directions = new Set();
for (let time = 0; time < 60; time += .25) {
  const wind = sampleWind(time, 0, 0, 1);
  directions.add(`${Math.sign(wind.x)},${Math.sign(wind.z)}`);
  const calm = sampleWind(time, 5, -3, 0);
  assert.equal(Math.abs(calm.x) + Math.abs(calm.y) + Math.abs(calm.z), 0);
}
for (const quadrant of ['1,1', '1,-1', '-1,1', '-1,-1']) {
  assert.ok(directions.has(quadrant), 'Wind must reach all four horizontal quadrants.');
}
const petal = {x: 0, y: 2, z: 0, vx: 0, vy: 0, vz: 0, age: 0, rest: 0, state: 'air', speed: 1};
const surface = {height: .5, water: false, slope: 0};
for (let i = 0; i < 600 && petal.state === 'air'; i++) advancePetal(petal, 1 / 60, i / 60, 0, 1, surface, {});
assert.equal(petal.state, 'ground');
assert.equal(petal.y, .5);
const landed = [petal.x, petal.y, petal.z];
advancePetal(petal, .5, 20, 2, 1, surface, {});
assert.deepEqual([petal.x, petal.y, petal.z], landed, 'Landed petals remain on the ground.');
petal.state = 'water'; petal.rest = 0;
advancePetal(petal, 1, 20, 0, 1, {height: .245, water: true, slope: .2}, {});
assert.ok(petal.z > landed[2], 'Floating petals travel downstream.');
assert.equal(daylight(1).night, 1);
assert.equal(daylight(.24).night, 0);
console.log('Changing wind, petal landing, river drift and night checks passed.');

function landingTime(intensity) {
  const p = {x: 0, y: 12, z: 0, vx: 0, vy: 0, vz: 0, age: 0, rest: 0, state: 'air', speed: 1};
  let time = 0;
  while (p.state === 'air' && time < 30) {
    advancePetal(p, 1 / 60, time, .5, 1, {height: 1, water: false, slope: 0}, {}, intensity);
    time += 1 / 60;
  }
  assert.equal(p.state, 'ground');
  return time;
}
assert.ok(landingTime(1) < landingTime(.2) * .75, 'Higher petal intensity must increase the descent rate.');
console.log('Petal intensity increases the rate of ground landings.');

// Sample multiple full swimming cycles to check water and bank clearance.
const { fishPosition } = await import('../src/ecosystem.js');
for (let t=0;t<300;t+=.5) for(let i=0;i<10;i++){
 const p=fishPosition(t,i);
 assert.ok(Math.abs(p.x-riverX(p.z))+.5<riverWidth(p.z));
 assert.ok(p.y+.11<.19 && p.y-.11>-.85);
}
console.log('Fish remain submerged and within the riverbanks.');
