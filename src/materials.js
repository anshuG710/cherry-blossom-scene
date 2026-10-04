import * as THREE from 'three';
import assets from './assets/blender/geometry.json' with { type: 'json' };

const textures=new Map(),geometries=new Map();
export function assetGeometry(name){
  if(!geometries.has(name)){
    const geometry=new THREE.BufferGeometryLoader().parse(assets[name]);
    geometry.computeBoundingSphere();geometries.set(name,geometry);
  }
  return geometries.get(name);
}
export function surfaceTexture(name){
  if(!textures.has(name)){
    const texture=new THREE.TextureLoader().load(assets.textures[name]);
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;
    if(name.endsWith('color'))texture.colorSpace=THREE.SRGBColorSpace;
    textures.set(name,texture);
  }
  return textures.get(name);
}
export function woodMaterial(color='#ae8963'){
  return new THREE.MeshStandardMaterial({color,map:surfaceTexture('wood-color'),
    bumpMap:surfaceTexture('wood-height'),bumpScale:.025,roughness:.79,
    roughnessMap:surfaceTexture('wood-height')});
}

// World coordinates keep microdetail continuous across merged banks and rocks.
export function groundDetail(material,scale=1.6,strength=.09){
  material.bumpMap=surfaceTexture('earth-height');material.bumpScale=strength;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 surfacePosition;')
      .replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
        vec4 surfacePoint=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          surfacePoint=instanceMatrix*surfacePoint;
        #endif
        surfacePosition=(modelMatrix*surfacePoint).xyz;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 surfacePosition;')
      .replace('#include <normal_fragment_maps>',`vec2 detailUv=surfacePosition.xz*${scale.toFixed(3)};
        vec2 du=dFdx(detailUv),dv=dFdy(detailUv);
        float height=texture2D(bumpMap,detailUv).r;
        float hx=texture2D(bumpMap,detailUv+du).r-height;
        float hy=texture2D(bumpMap,detailUv+dv).r-height;
        normal=perturbNormalArb(-vViewPosition,normal,vec2(hx,hy)*bumpScale,faceDirection);`)
      .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=.87+.2*texture2D(bumpMap,surfacePosition.xz*.17).r;');
  };
  material.customProgramCacheKey=()=>`ground-detail-${scale}`;
  return material;
}
