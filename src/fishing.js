import * as THREE from 'three';
import { riverX,riverWidth } from './landscape.js';
export function fishingPhase(elapsed,biteAt){return elapsed<biteAt?'waiting':elapsed<biteAt+2.5?'bite':'missed';}
export function makeFishing(scene,avatar,ecosystem){
  const button=document.getElementById('fish-toggle'),status=document.getElementById('activity-status');
  let active=false,seconds=0,biteAt=0,caught=0;
  const rod=new THREE.Mesh(new THREE.CylinderGeometry(.015,.025,2.7,8),new THREE.MeshStandardMaterial({color:'#87623b'}));rod.rotation.z=-.6;rod.position.set(.35,1.25,.4);rod.visible=false;avatar.root.add(rod);
  const float=new THREE.Mesh(new THREE.SphereGeometry(.08,10,8),new THREE.MeshStandardMaterial({color:'#ef8569'}));float.visible=false;scene.add(float);
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#ddd4b6',transparent:true,opacity:.7}));line.visible=false;scene.add(line);
  const tip=new THREE.Vector3();
  function cancel(message=''){active=false;rod.visible=float.visible=line.visible=false;button.textContent='Fish';if(message)status.textContent=message;}
  function cast(){
    const p=avatar.root.position,bank=Math.abs(p.x-riverX(p.z))-riverWidth(p.z);
    if(bank<.2||bank>3){status.textContent='Walk to the riverbank, then choose Fish.';return;}
    active=true;seconds=0;biteAt=2+Math.random()*4;rod.visible=float.visible=line.visible=true;
    float.position.set(riverX(p.z)+Math.sign(p.x-riverX(p.z))*(riverWidth(p.z)-1),.28,p.z);
    avatar.root.rotation.y=Math.atan2(float.position.x-p.x,float.position.z-p.z);
    button.textContent='Reel in';status.textContent='Line cast. Wait for a bite, then reel in!';
  }
  function reel(){
    if(fishingPhase(seconds,biteAt)==='bite'){const fish=ecosystem.catchFish(float.position);if(fish){caught++;cancel(`Caught a ${fish.length} cm ${fish.name}! Total catches: ${caught}.`);}else cancel('The fish escaped. Cast again.');}
    else cancel('Too early! Cast again and wait for the bite.');
  }
  button.addEventListener('click',()=>{if(!avatar.root.visible)return;if(active)reel();else{window.dispatchEvent(new Event('anshu:stand'));cast();}});
  window.addEventListener('keydown',e=>{if(e.code==='Space'&&active&&!document.activeElement?.matches('input,textarea,button,[contenteditable=true]')){e.preventDefault();reel();}});
  return {get active(){return active;},cancel,update(dt){if(!active)return;seconds+=dt;const phase=fishingPhase(seconds,biteAt);if(phase==='missed'){cancel('The fish got away. Cast again.');return;}if(phase==='bite')status.textContent='Bite! Tap Reel in or press Space now!';float.position.y=.28+(phase==='bite'?Math.sin(seconds*24)*.09:Math.sin(seconds*3)*.02);rod.localToWorld(tip.set(0,1.35,0));const pos=line.geometry.attributes.position;pos.setXYZ(0,tip.x,tip.y,tip.z);pos.setXYZ(1,float.position.x,float.position.y,float.position.z);pos.needsUpdate=true;line.geometry.computeBoundingSphere();}};
}
