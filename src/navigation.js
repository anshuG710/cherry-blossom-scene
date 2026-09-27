import { ground, riverX, riverWidth } from './landscape.js';
import { secondTree, benchPlaces } from './places.js';
export { secondTree } from './places.js';

export const bridge = { z: 9, x: riverX(9), halfLength: riverWidth(9) + 4, halfWidth: 1.65 };
export function bridgeHeight(x) {
  const t = Math.max(0, Math.min(1, (x - bridge.x + bridge.halfLength) / (2 * bridge.halfLength)));
  const left = ground(bridge.x - bridge.halfLength, bridge.z);
  const right = ground(bridge.x + bridge.halfLength, bridge.z);
  return left * (1 - t) + right * t + Math.sin(t * Math.PI) * 1.3 + .12;
}
export function onBridge(x, z) {
  return Math.abs(x - bridge.x) <= bridge.halfLength && Math.abs(z - bridge.z) <= bridge.halfWidth;
}
export const walkHeight = (x, z) => onBridge(x, z) ? bridgeHeight(x) : ground(x, z);
export function canWalk(x, z) {
  if (!Number.isFinite(x + z) || x < -42 || x > 44 || z < -48 || z > 40) return false;
  if (onBridge(x, z)) return Math.abs(z - bridge.z) < bridge.halfWidth - .3;
  if (Math.abs(x - riverX(z)) < riverWidth(z) + .35) return false;
  if (Math.hypot(x + 2, z + 3) < 1.8 || Math.hypot(x - secondTree.x, z - secondTree.z) < 1.6) return false;
  // Exterior walls, porch, bench and garden fence remain solid.
  const dx = x + 18, dz = z + 18;
  const localX = dx * Math.cos(.3) - dz * Math.sin(.3);
  const localZ = dx * Math.sin(.3) + dz * Math.cos(.3);
  if (Math.abs(localX) < 4.65 && Math.abs(localZ) < 4.4) return false;
  const gardenX=-18+Math.sin(.3)*5.8,gardenZ=-18+Math.cos(.3)*5.8;
  if(Math.abs(x-gardenX)<4.35&&z>gardenZ-1.85&&z<gardenZ+2.85)return false;
  for(const bench of benchPlaces){const dx=x-bench.x,dz=z-bench.z;const bx=dx*Math.cos(bench.angle)-dz*Math.sin(bench.angle),bz=dx*Math.sin(bench.angle)+dz*Math.cos(bench.angle);if(Math.abs(bx)<1.95&&Math.abs(bz)<.95)return false;}
  return true;
}
export function clearWalk(a, b) {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .2);
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    if (!canWalk(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
  }
  return true;
}
// Bounded one-metre grid, searched only on a click. It routes across the bridge.
export function walkingPath(start, end) {
  if (!canWalk(end.x, end.z)) return [];
  if (clearWalk(start, end)) return [end];
  const key = p => `${p.x},${p.z}`;
  const origin = { x: Math.round(start.x), z: Math.round(start.z) };
  if (!clearWalk(start, origin)) return [];
  const queue = [origin], parents = new Map([[key(origin), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (Math.hypot(p.x - end.x, p.z - end.z) < 1.5 && clearWalk(p, end)) {
      const path = [end];
      for (let at = p; at; at = parents.get(key(at))) path.push(at);
      path.reverse();
      const smooth = []; let from = start;
      for (let n = 0; n < path.length;) {
        let far = n;
        while (far + 1 < path.length && clearWalk(from, path[far + 1])) far++;
        smooth.push(path[far]); from = path[far]; n = far + 1;
      }
      return smooth;
    }
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const next = { x: p.x + dx, z: p.z + dz };
      if (!parents.has(key(next)) && clearWalk(p, next)) { parents.set(key(next), p); queue.push(next); }
    }
  }
  return [];
}
