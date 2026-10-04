import * as THREE from 'three';
import { riverX,riverWidth } from './landscape.js';
export function fishingPhase(elapsed,biteAt){return elapsed<biteAt?'waiting':elapsed<biteAt+2.5?'bite':'missed';}
export function reelStep(progress,tension,dt,pull=false){
  return {progress:Math.max(0,Math.min(1,progress-dt*.035+(pull?.16:0))),tension:Math.max(0,tension-dt*.32)+(pull?.23:0)};
}
export function makeFishing(scene,avatar,ecosystem){
  const button=document.getElementById('fish-toggle'),status=document.getElementById('activity-status');
  let active=false,seconds=0,biteAt=0,caught=0,hooked=false,progress=0,tension=0,landing=0;
  const start=new THREE.Vector3(),target=new THREE.Vector3();
  const feedback=document.createElement('div');feedback.className='fishing-feedback';feedback.hidden=true;
  feedback.innerHTML='<label>Catch progress <progress max="1" value="0"></progress></label><label>Line tension <meter min="0" max="1" low=".3" high=".75" optimum=".4" value="0"></meter></label>';
  status.insertAdjacentElement('afterend',feedback);const progressBar=feedback.querySelector('progress'),tensionBar=feedback.querySelector('meter');
  const rod=new THREE.Mesh(new THREE.CylinderGeometry(.015,.025,2.7,8),new THREE.MeshStandardMaterial({color:'#87623b'}));rod.rotation.z=-.6;rod.position.set(.35,1.25,.4);rod.visible=false;avatar.root.add(rod);
  const float=new THREE.Mesh(new THREE.SphereGeometry(.08,10,8),new THREE.MeshStandardMaterial({color:'#ef8569'}));float.visible=false;scene.add(float);
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#ddd4b6',transparent:true,opacity:.7}));line.visible=false;scene.add(line);
  const tip=new THREE.Vector3();
  const ripple=new THREE.Mesh(new THREE.RingGeometry(.25,.3,32),new THREE.MeshBasicMaterial({color:'#d7ece1',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));ripple.rotation.x=-Math.PI/2;scene.add(ripple);
  const prize=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshStandardMaterial({color:'#d4af76',metalness:.35,roughness:.4}));prize.scale.set(.12,.11,.42);prize.visible=false;scene.add(prize);
  function cancel(message=''){active=false;hooked=false;feedback.hidden=true;rod.visible=float.visible=line.visible=false;ripple.material.opacity=0;button.textContent='Fish';if(message)status.textContent=message;}
  function cast(){
    const p=avatar.root.position,bank=Math.abs(p.x-riverX(p.z))-riverWidth(p.z);
    if(bank<.2||bank>3){status.textContent='Walk to the riverbank, then choose Fish.';return;}
    active=true;hooked=false;progress=tension=0;seconds=0;biteAt=3+Math.random()*3;landing=0;prize.visible=false;rod.visible=float.visible=line.visible=true;
    target.set(riverX(p.z)+Math.sign(p.x-riverX(p.z))*(riverWidth(p.z)-1),.28,p.z);start.copy(p);start.y+=1.5;float.position.copy(target);
    avatar.root.rotation.y=Math.atan2(float.position.x-p.x,float.position.z-p.z);
    button.textContent='Hook fish';status.textContent='Casting… watch the float. Tap when it dips!';
  }
  function reel(){
    if(!hooked){if(fishingPhase(seconds,biteAt)!=='bite'){cancel('Too early! Wait for the float to dip before hooking.');return;}hooked=true;feedback.hidden=false;button.textContent='Pull gently';status.textContent='Fish hooked! Tap or press Space to pull. Pause to ease the tension.';}
    ({progress,tension}=reelStep(progress,tension,0,true));
    progressBar.value=progress;tensionBar.value=Math.min(1,tension);
    if(tension>=1){cancel('The line snapped! Try slower pulls with a pause between them.');return;}
    if(progress>=1){const fish=ecosystem.catchFish(target);if(fish){caught++;prize.position.copy(float.position);prize.visible=true;landing=1.2;cancel(`Caught a ${fish.length} cm ${fish.name}! Released safely. Total catches: ${caught}.`);}else cancel('The fish slipped away. Cast again.');}
  }
  button.addEventListener('click',()=>{if(!avatar.root.visible)return;if(active)reel();else{window.dispatchEvent(new Event('anshu:stand'));cast();}});
  window.addEventListener('keydown',e=>{if(e.code==='Space'&&active&&!document.activeElement?.matches('input,textarea,button,[contenteditable=true]')){e.preventDefault();reel();}});
  return {get active(){return active;},cancel,update(dt){
    if(landing>0){landing=Math.max(0,landing-dt);prize.position.y=.3+Math.sin(landing/1.2*Math.PI)*1.3;prize.rotation.z+=dt*5;prize.visible=landing>0;}
    if(!active)return;seconds+=dt;const phase=fishingPhase(seconds,biteAt);
    if(!hooked&&phase==='missed'){cancel('The fish got away. Watch for the next bite.');return;}
    if(!hooked&&phase==='bite')status.textContent='Bite! The float is dipping — tap Hook fish or press Space!';
    if(hooked){({progress,tension}=reelStep(progress,tension,dt));progressBar.value=progress;tensionBar.value=Math.min(1,tension);}
    const cast=Math.min(1,seconds/.7);float.position.lerpVectors(start,target,cast);float.position.y+=Math.sin(cast*Math.PI)*1.5;
    if(cast===1){float.position.lerp(start,hooked?progress*.65:0);float.position.y=.28+Math.sin(seconds*(hooked||phase==='bite'?24:3))*(hooked||phase==='bite'?.09:.02);}
    ripple.position.set(float.position.x,.24,float.position.z);ripple.scale.setScalar(.6+(seconds%1)*2);ripple.material.opacity=cast===1?(1-seconds%1)*(hooked||phase==='bite'?.7:.22):0;
    rod.rotation.z=-.6+(hooked?Math.sin(seconds*8)*tension*.12:0);
    rod.localToWorld(tip.set(0,1.35,0));const pos=line.geometry.attributes.position;pos.setXYZ(0,tip.x,tip.y,tip.z);pos.setXYZ(1,float.position.x,float.position.y,float.position.z);pos.needsUpdate=true;line.geometry.computeBoundingSphere();}};
}
