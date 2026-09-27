import * as THREE from 'three';
import { walkHeight, clearWalk, walkingPath } from './navigation.js';

export function makeWalking({scene,camera,controls,canvas,avatar}) {
  let enabled=false,path=[],phase=0,pointer=null,arrive=null;
  const stick=new THREE.Vector2(),joystick=document.getElementById('joystick'),knob=document.getElementById('joystick-knob');let stickPointer=null;
  const touches=new Set();
  const keys=new Set(), status=document.getElementById('walk-status');
  const forward=new THREE.Vector3(),right=new THREE.Vector3(),move=new THREE.Vector3(),delta=new THREE.Vector3();
  const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
  const marker=new THREE.Mesh(new THREE.RingGeometry(.25,.36,24),new THREE.MeshBasicMaterial({color:'#ffe5a6',side:THREE.DoubleSide,depthWrite:false}));
  marker.rotation.x=-Math.PI/2;marker.visible=false;scene.add(marker);
  const surfaces=[];scene.traverse(o=>{if(o.userData.walkSurface)surfaces.push(o);});
  const codeMap={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
  const editing=()=>document.activeElement?.matches('input,textarea,select,[contenteditable=true]')||!!document.querySelector('dialog[open]');
  function clear(){keys.clear();path=[];marker.visible=false;arrive=null;stick.set(0,0);knob.style.transform='translate(0,0)';stickPointer=null;}
  function steer(e){if(stickPointer!==e.pointerId)return;const r=joystick.getBoundingClientRect(),radius=r.width*.32;stick.set((e.clientX-r.left-r.width/2)/radius,(e.clientY-r.top-r.height/2)/radius);if(stick.length()>1)stick.normalize();knob.style.transform=`translate(${stick.x*radius}px,${stick.y*radius}px)`;path=[];arrive=null;marker.visible=false;}
  joystick.addEventListener('pointerdown',e=>{e.preventDefault();stickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);steer(e);});
  joystick.addEventListener('pointermove',steer);
  for(const name of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(name,()=>{stickPointer=null;stick.set(0,0);knob.style.transform='translate(0,0)';});
  window.addEventListener('keydown',e=>{if(!enabled||editing()||!codeMap[e.code])return;e.preventDefault();keys.add(codeMap[e.code]);path=[];marker.visible=false;});
  window.addEventListener('keyup',e=>keys.delete(codeMap[e.code]));
  window.addEventListener('blur',clear);
  document.addEventListener('visibilitychange',clear);
  for(const button of document.querySelectorAll('[data-walk]')){
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.walk);path=[];marker.visible=false;});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>keys.delete(button.dataset.walk));
  }
  canvas.addEventListener('pointerdown',e=>{touches.add(e.pointerId);pointer=touches.size===1?{x:e.clientX,y:e.clientY,id:e.pointerId}:null;});
  canvas.addEventListener('pointercancel',e=>{touches.delete(e.pointerId);pointer=null;});
  canvas.addEventListener('pointerup',e=>{
    touches.delete(e.pointerId);
    if(!enabled||!pointer||pointer.id!==e.pointerId||Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>7)return;
    pointer=null;const rect=canvas.getBoundingClientRect();
    mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
    ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(surfaces,false)[0];
    if(!hit)return;
    path=walkingPath(avatar.root.position,{x:hit.point.x,z:hit.point.z});
    marker.visible=path.length>0;
    if(marker.visible)marker.position.set(hit.point.x,walkHeight(hit.point.x,hit.point.z)+.08,hit.point.z);
    status.textContent=path.length?'Walking to your destination.':'Choose clear ground or the bridge.';
  });
  return {
    goTo(destination,onArrival){path=walkingPath(avatar.root.position,destination);arrive=path.length?onArrival:null;return path.length>0;},
    get enabled(){return enabled;},
    set(on){enabled=on;clear();document.body.classList.toggle('walking',on);document.getElementById('walk-toggle').setAttribute('aria-pressed',String(on));document.getElementById('walk-pad').hidden=!on;
      if(on){status.textContent='WASD / arrows · tap ground to walk · drag to look';controls.minDistance=4;controls.maxDistance=18;controls.maxPolarAngle=Math.PI*.46;
        controls.target.copy(avatar.root.position).add(new THREE.Vector3(0,1.1,0));camera.position.copy(controls.target).add(new THREE.Vector3(0,5,9));controls.update();}
      else status.textContent='';
    },
    update(dt){
      if(!enabled)return;
      if(editing()){clear();avatar.walk(phase,false);return;}
      camera.getWorldDirection(forward);forward.y=0;forward.normalize();right.crossVectors(forward,camera.up).normalize();
      move.set(0,0,0);
      move.addScaledVector(forward,Number(keys.has('up'))-Number(keys.has('down'))-stick.y).addScaledVector(right,Number(keys.has('right'))-Number(keys.has('left'))+stick.x);
      const p=avatar.root.position;
      if(!move.lengthSq()&&path.length){move.set(path[0].x-p.x,0,path[0].z-p.z);if(move.length()<.12){path.shift();if(!path.length){marker.visible=false;const callback=arrive;arrive=null;if(callback){callback();return;}}move.set(0,0,0);}}
      const distance=Math.min(move.length(),dt*3.2);move.normalize().multiplyScalar(distance);
      const next={x:p.x+move.x,z:p.z+move.z};
      const moving=distance>0&&clearWalk(p,next);
      if(moving){delta.copy(p);p.set(next.x,walkHeight(next.x,next.z),next.z);delta.subVectors(p,delta);camera.position.add(delta);controls.target.add(delta);
        const angle=Math.atan2(move.x,move.z);avatar.root.rotation.y+=Math.atan2(Math.sin(angle-avatar.root.rotation.y),Math.cos(angle-avatar.root.rotation.y))*Math.min(1,dt*12);phase+=dt;
      }else if(distance>0){path=[];marker.visible=false;status.textContent='Use the bridge to cross; keep clear of walls and trees.';}
      avatar.walk(phase,moving);
    }
  };
}
