import * as THREE from 'three';

// A small articulated character, modeled in the same soft style as the valley.
export function makeListener(bench) {
  const root = new THREE.Group(); root.visible = false; bench.add(root);
  const skin = new THREE.MeshStandardMaterial({color:'#c99377',roughness:.85});
  const shirt = new THREE.MeshStandardMaterial({color:'#9fae95',roughness:1});
  const pants = new THREE.MeshStandardMaterial({color:'#344558',roughness:.95});
  const hair = new THREE.MeshStandardMaterial({color:'#302725',roughness:1});
  const shoes = new THREE.MeshStandardMaterial({color:'#e4dac7',roughness:.8});
  const black = new THREE.MeshStandardMaterial({color:'#242a30',roughness:.45,metalness:.25});
  function ellipsoid(parent,material,x,y,z,sx,sy,sz){
    const m=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),material);
    m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  const pelvis=ellipsoid(root,pants,0,1,0,.23,.16,.16);
  const torso=ellipsoid(root,shirt,0,1.34,0,.29,.36,.18);
  const head=new THREE.Group();root.add(head);
  ellipsoid(head,skin,0,0,0,.185,.23,.17);
  ellipsoid(head,hair,0,.1,-.025,.19,.16,.175);
  ellipsoid(head,skin,0,-.015,.165,.038,.049,.044);
  for(const side of [-1,1]){
    ellipsoid(head,skin,side*.183,-.018,0,.04,.065,.04);
    ellipsoid(head,black,side*.067,.019,.151,.016,.012,.009);
    ellipsoid(head,hair,side*.067,.065,.147,.04,.01,.009);
  }
  const neck=ellipsoid(root,skin,0,1.65,0,.075,.11,.07);
  const headphones=new THREE.Group();root.add(headphones);
  const arc=new THREE.Mesh(new THREE.TorusGeometry(.225,.021,8,28,Math.PI),black);
  headphones.add(arc);
  for(const side of [-1,1]){
    ellipsoid(headphones,black,side*.222,-.028,0,.047,.09,.075);
    ellipsoid(headphones,shoes,side*.25,-.028,0,.01,.055,.05);
  }
  const limbs=[];
  function limb(material,radius){
    const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(radius,1,4,10),material);
    mesh.castShadow=true;root.add(mesh);limbs.push(mesh);return mesh;
  }
  const legs=[-1,1].map(side=>({side,thigh:limb(pants,.105),shin:limb(pants,.08),foot:ellipsoid(root,shoes,0,0,0,.10,.07,.21)}));
  const arms=[-1,1].map(side=>({side,upper:limb(shirt,.075),fore:limb(skin,.057),hand:ellipsoid(root,skin,0,0,0,.055,.075,.04)}));
  const up=new THREE.Vector3(0,1,0),a=new THREE.Vector3(),b=new THREE.Vector3();
  function bone(mesh,start,end,radius){a.fromArray(start);b.fromArray(end);mesh.position.copy(a).add(b).multiplyScalar(.5);const length=a.distanceTo(b);mesh.quaternion.setFromUnitVectors(up,b.sub(a).normalize());mesh.scale.y=length/(1+radius*2);}
  const smooth=(x)=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
  function update(seconds,playing=false){
    const sit=smooth((seconds-1.1)/1.6),wear=smooth((seconds-2.9)/1.5),lower=smooth((seconds-4.4)/.7);
    root.position.z=THREE.MathUtils.lerp(.8,0,sit);
    const hipY=THREE.MathUtils.lerp(1.10,1.0,sit),lean=Math.sin(sit*Math.PI)*.12;
    pelvis.position.y=hipY;torso.position.set(0,hipY+.31,lean);torso.rotation.x=lean;
    head.position.set(0,hipY+.77,lean*.3);head.rotation.x=playing?Math.sin(seconds*1.5)*.025:0;
    neck.position.set(0,hipY+.63,0);
    for(const leg of legs){const x=leg.side*.145,kneeY=THREE.MathUtils.lerp(.57,.80,sit),kneeZ=.04+sit*.46;
      bone(leg.thigh,[x,hipY,0],[x,kneeY,kneeZ],.105);
      bone(leg.shin,[x,kneeY,kneeZ],[x,.16,kneeZ+.09],.08);
      leg.foot.position.set(x,.105,kneeZ+.19);
    }
    const headphonesY=THREE.MathUtils.lerp(hipY+.12,hipY+.84,wear),headphonesZ=THREE.MathUtils.lerp(.40,0,wear);
    headphones.position.set(0,headphonesY,headphonesZ);headphones.rotation.x=(1-wear)*-.7;
    for(const arm of arms){const side=arm.side;
      const handY=THREE.MathUtils.lerp(headphonesY-.035,hipY+.03,lower),handZ=THREE.MathUtils.lerp(headphonesZ,.35,lower);
      const elbowY=THREE.MathUtils.lerp(hipY+.04,hipY+.39,wear*(1-lower));
      bone(arm.upper,[side*.255,hipY+.5,lean],[side*.34,elbowY,.20],.075);
      bone(arm.fore,[side*.34,elbowY,.20],[side*.24,handY,handZ],.057);
      arm.hand.position.set(side*.24,handY,handZ);
    }
  }
  update(0);
  return {root,update};
}
