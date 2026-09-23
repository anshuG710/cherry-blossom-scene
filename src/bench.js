import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function makeBench(scene, ground) {
  const bench = new THREE.Group();
  bench.position.set(-6.1, ground(-6.1, -4.5), -4.5);
  bench.rotation.y = -.18;
  const wood = new THREE.MeshStandardMaterial({color: '#aa7950', roughness: .82});
  wood.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 plankPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nplankPosition=position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 plankPosition;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float grain=sin(plankPosition.z*190.+plankPosition.y*160.+sin(plankPosition.x*2.8)*3.);
        float fine=sin(plankPosition.z*540.+plankPosition.y*390.+sin(plankPosition.x*5.)*2.);
        diffuseColor.rgb*=.83+.11*grain+.04*fine;`);
  };
  const metal = new THREE.MeshStandardMaterial({color: '#323b37', metalness: .72, roughness: .48});
  function part(width, height, depth, x, y, z, material, tilt = 0) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 2, Math.min(.035, height / 4)), material);
    mesh.position.set(x, y, z); mesh.rotation.x = tilt;
    mesh.castShadow = mesh.receiveShadow = true; bench.add(mesh);
  }
  // Separate rounded slats, open gaps, recessed supports and visible fasteners.
  for (let i = 0; i < 4; i++) part(3.25, .10, .21, 0, .84, -.36 + i * .24, wood);
  for (let i = 0; i < 3; i++) part(3.25, .20, .095, 0, 1.13 + i * .235, -.49 - i * .025, wood, -.1);
  for (const side of [-1, 1]) {
    for (const z of [-.34, .34]) part(.09, .82, .1, side * 1.25, .41, z, metal, z * .2);
    part(.12, .12, 1.0, side * 1.25, .74, 0, metal);
    part(.085, 1.1, .09, side * 1.25, 1.12, -.56, metal, -.1);
    part(.10, .34, .10, side * 1.46, 1.00, .2, metal);
    part(.15, .08, .82, side * 1.46, 1.2, -.03, wood);
    for (let i = 0; i < 3; i++) {
      const bolt = new THREE.Mesh(new THREE.SphereGeometry(.024, 6, 4), metal);
      bolt.position.set(side * 1.25, 1.13 + i * .235, -.427 - i * .025); bench.add(bolt);
    }
  }
  // Plant every foot on the gently sloping bank without floating or leaning the seat.
  const world = new THREE.Vector3();
  for (const x of [-1.25, 1.25]) for (const z of [-.34, .34]) {
    world.set(x, 0, z).applyAxisAngle(new THREE.Vector3(0,1,0), bench.rotation.y).add(bench.position);
    const footY = ground(world.x, world.z) - bench.position.y;
    if (footY < 0) part(.10, -footY + .06, .12, x, footY / 2, z, metal);
  }
  scene.add(bench);
  return bench;
}
