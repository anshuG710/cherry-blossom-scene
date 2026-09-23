import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { makeEcosystem } from './ecosystem.js';
import { makeBench } from './bench.js';
import { makeListener } from './listener.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeLandscape,ground } from './landscape.js';
import './style.css';
import './features.js';
import { sampleWind, daylight } from './weather.js';
import { makeNight } from './night.js';
import { makeHouse } from './house.js';

const canvas=document.querySelector('#scene');
const mobile=matchMedia('(max-width: 700px)').matches;
const settings={wind:.55,petals:.6,river:.8,day:.24,fog:.35,bloom:.3,cinematic:false};
let renderer;
try {renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});} catch(e){document.querySelector('#loading').innerHTML='<p>This landscape needs WebGL. Please enable hardware acceleration and reload.</p>';throw e;}
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.3:1.65));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#c3c9bc',.006);
const camera=new THREE.PerspectiveCamera(mobile?60:48,innerWidth/innerHeight,.15,600);
const start=new THREE.Vector3(mobile?-10:-8,mobile?13:10.8,mobile?52:35),target=new THREE.Vector3(-4,6.5,-20);camera.position.copy(start);
const controls=new OrbitControls(camera,canvas);controls.target.copy(target);controls.enableDamping=true;controls.dampingFactor=.045;controls.minDistance=29;controls.maxDistance=85;controls.minPolarAngle=.3;controls.maxPolarAngle=Math.PI*.475;controls.maxAzimuthAngle=1.15;controls.minAzimuthAngle=-.95;controls.enablePan=false;controls.rotateSpeed=.45;controls.zoomSpeed=.65;controls.update();
const hemi=new THREE.HemisphereLight('#d4e9ec','#354d32',2);scene.add(hemi);
const fill=new THREE.DirectionalLight('#f6dfd2',1.35);fill.position.set(14,20,32);scene.add(fill);
const sun=new THREE.DirectionalLight('#ffe1b2',3.3);sun.position.set(-40,65,-45);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-37,right:37,top:36,bottom:-36,near:1,far:300});sun.shadow.bias=-.0003;sun.shadow.normalBias=.06;sun.shadow.radius=3;sun.target.position.set(0,0,-8);scene.add(sun,sun.target);
const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color('#819ea8')},bottom:{value:new THREE.Color('#edd9b7')},sunColor:{value:new THREE.Color('#ffdfb0')},sunPos:{value:new THREE.Vector3(-.45,.34,-.8).normalize()}},vertexShader:'varying vec3 vWorld;void main(){vWorld=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vWorld;uniform vec3 top;uniform vec3 bottom;uniform vec3 sunColor;uniform vec3 sunPos;void main(){vec3 d=normalize(vWorld);float h=max(0.,d.y);vec3 c=mix(bottom,top,pow(h,.55));float s=max(0.,dot(d,sunPos));c+=sunColor*(pow(s,18.)*.21+pow(s,350.)*.65);gl_FragColor=vec4(c,1.);}`});scene.add(new THREE.Mesh(new THREE.SphereGeometry(450,32,16),skyMat));
const world=makeLandscape(scene,renderer,mobile);
const bench=makeBench(scene,ground);
const listener=makeListener(bench);
const ecosystem=makeEcosystem(scene,bench,world.water,mobile);
const nightSky=makeNight(scene);
const house=makeHouse(scene,ground);
const blossomLight=new THREE.PointLight(0xff8fbd,0,26,2);blossomLight.position.set(-2,10,-3);scene.add(blossomLight);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.18,.65,1.05);composer.addPass(bloom);composer.addPass(new OutputPass());
// A restrained display-space grade: cool shadows, warm highlights, gentle contrast.
const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},saturation:{value:1.12}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform float saturation;varying vec2 vUv;void main(){
 vec4 pixel=texture2D(tDiffuse,vUv);vec3 c=pixel.rgb;
 float luma=dot(c,vec3(.2126,.7152,.0722));
 vec3 graded=mix(vec3(luma),c,saturation);
 graded+=(vec3(-.007,.002,.012)*(1.-smoothstep(.05,.45,luma))+vec3(.012,.005,-.007)*smoothstep(.45,.95,luma));
 graded=(graded-.42)*1.035+.42;
 gl_FragColor=vec4(clamp(mix(c,graded,.7),0.,1.),pixel.a);}`});
composer.addPass(grade);
// Soft, translucent shafts use a feathered profile and do not cast opaque shadows.
const rayGroup=new THREE.Group();scene.add(rayGroup);
const rayMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{opacity:{value:.022}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float opacity;void main(){float a=pow(sin(vUv.x*3.14159),2.)*sin(vUv.y*3.14159)*opacity;gl_FragColor=vec4(1.,.82,.57,a);}'});
for(let i=0;i<5;i++){const g=new THREE.PlaneGeometry(1.4+i*.6,28);const m=new THREE.Mesh(g,rayMaterial);m.position.set(-8+i*3,10,-8-i*2);m.rotation.z=-.6;m.rotation.y=.4;rayGroup.add(m);}
const $=id=>document.getElementById(id);
const moodStops=[0,.46,.70,.86,1];
function momentColor(value, palette, target){
 let i=0;while(i<moodStops.length-2&&value>moodStops[i+1])i++;
 const t=THREE.MathUtils.clamp((value-moodStops[i])/(moodStops[i+1]-moodStops[i]),0,1);
 return target.set(palette[i]).lerp(new THREE.Color(palette[i+1]),t);
}
function light(){
 const v=settings.day,{night,noon}=daylight(v),day=1-night;
 sun.color.set('#ffc79c').lerp(new THREE.Color('#fff4dd'),noon).lerp(new THREE.Color('#a9c8ff'),night);
 sun.intensity=(2.1+noon*.9)*day+.38*night;
 sun.position.set(-55+Math.min(v/.72,1)*100,32+noon*48,-55).lerp(new THREE.Vector3(-48,59,-180),night);
 hemi.intensity=(.85+noon*.55)*day+.27*night;
 hemi.color.set('#d4e9ec').lerp(new THREE.Color('#7a9dce'),night);
 fill.intensity=1.35*day+.19*night;fill.color.set('#f6dfd2').lerp(new THREE.Color('#8aace6'),night);
 skyMat.uniforms.top.value.set('#6695b3').lerp(new THREE.Color('#64a5ca'),noon*.6).lerp(new THREE.Color('#030918'),night);
 skyMat.uniforms.bottom.value.set('#efbfad').lerp(new THREE.Color('#d8e1dd'),noon).lerp(new THREE.Color('#17273e'),night);
 skyMat.uniforms.sunColor.value.set('#ffdfb0').multiplyScalar(day);
 scene.fog.color.copy(skyMat.uniforms.bottom.value).lerp(new THREE.Color('#abbebb'),day*.5);
 scene.fog.density=(.0015+settings.fog*.007)*(1+night*.3+(1-noon)*.12);
 world.water.material.uniforms.sunDirection.value.copy(sun.position).normalize();
 world.water.material.uniforms.sunColor.value.copy(sun.color).multiplyScalar(day+.15*night);
 momentColor(v,['#19745f','#258a85','#50776c','#245371','#071a2c'],world.water.material.uniforms.waterColor.value);
 momentColor(v,['#fff0c9','#dcffe2','#ffd2a2','#a8c6c5','#718a9d'],world.terrainMaterial.color);
 momentColor(v,['#ffe2aa','#d7ffbd','#ffcd9b','#a2ced0','#7295ae'],world.grassMaterial.color);
 momentColor(v,['#fff2e2','#f3fbff','#ffd9c0','#b7c9e1','#809cc8'],world.mountainMaterial.color);
 const ridgeTints=[['#e5e2cb','#d9f2e3','#e8c1a5','#9cb6c1','#69839d'],['#eee9d3','#e2f2ec','#e7c8b5','#aec2d4','#7f96b3'],['#f2e9d8','#ebf3f0','#ead1be','#b7c9d9','#92a9c4']];
 world.ridgeMaterials.forEach((material,i)=>momentColor(v,ridgeTints[i],material.color));
 grade.uniforms.saturation.value=1.10+noon*.07-night*.06;
 world.detailLight.value=day+.12*night;
 for(const cloud of world.clouds)cloud.material.color.set('#fff0e1').lerp(new THREE.Color('#263b60'),night);
 nightSky.set(night);
 bloom.strength=settings.bloom*.12;bloom.threshold=.9;bloom.radius=.12;
 world.blossomMaterial.emissive.set('#ff91c4');
 world.blossomMaterial.emissiveIntensity=settings.bloom*settings.bloom*.32;
 const petalGlow=THREE.MathUtils.smoothstep(v,.9,1)*Math.sqrt(settings.bloom)*.4;
 world.petalMaterial.emissive.set('#ffe0ed');
 world.petalMaterial.emissiveIntensity=petalGlow;
 world.fallenMaterial.emissive.set('#ffe0ed');
 world.fallenMaterial.emissiveIntensity=petalGlow;
 blossomLight.intensity=settings.bloom*settings.bloom*.4*night;
 rayMaterial.uniforms.opacity.value=.026*(1-noon*.45)*day;
 house.update(settings,performance.now()*.001);
}
const labels={wind:v=>v<.1?'Still':v<.8?'Gentle':v<1.4?'Breezy':'Blustery',petals:v=>`${Math.round(v*100)}%`,river:v=>`${v.toFixed(1)}×`,day:v=>v<.27?'Golden hour':v<.54?'Midday':v<.75?'Sunset':v<.9?'Blue hour':'Night',fog:v=>`${Math.round(v*100)}%`,bloom:v=>`${Math.round(v*100)}%`};
for(const name of Object.keys(labels)){const input=$(name);const change=()=>{settings[name]=+input.value;$(name+'-value').value=labels[name](settings[name]);input.style.setProperty('--value',`${100*(+input.value- +input.min)/(+input.max- +input.min)}%`);light();};input.addEventListener('input',change);change();}
function cinematic(on){settings.cinematic=on;$('cinematic').setAttribute('aria-checked',String(on));controls.autoRotate=on;controls.autoRotateSpeed=.22;}
$('cinematic').addEventListener('click',()=>cinematic(!settings.cinematic));controls.addEventListener('start',()=>{cinematic(false);document.body.classList.add('exploring');});
let resetting=false,listenShot=null,listenerSeconds=0,listenerActive=false,musicPlaying=false;
const shotPosition=new THREE.Vector3(),shotTarget=new THREE.Vector3();
function returnToLandscape(){
 listenShot=null;listenerActive=false;listener.root.visible=false;controls.enabled=false;controls.enableDamping=false;
 controls.minDistance=4;cinematic(false);document.body.classList.remove('exploring','listening');resetting=true;
 window.dispatchEvent(new Event('anshu:listen-cancel'));
}
$('reset').addEventListener('click',returnToLandscape);
window.addEventListener('anshu:listen-exit',returnToLandscape);
window.addEventListener('anshu:music-state',event=>{musicPlaying=event.detail.playing;});
window.addEventListener('anshu:listen-request',()=>{
 if(listenShot)return;
 if(listenerActive){window.dispatchEvent(new Event('anshu:listen-ready'));return;}
 resetting=false;cinematic(false);controls.enabled=false;controls.enableDamping=false;controls.minDistance=4;
 listenerActive=true;listenerSeconds=0;listener.root.visible=true;
 bench.updateWorldMatrix(true,false);
 shotPosition.set(mobile?-4.2:-3.8,mobile?3.3:2.8,mobile?9:6.2);bench.localToWorld(shotPosition);
 shotTarget.set(0,1.15,0);bench.localToWorld(shotTarget);
 listenShot={position:camera.position.clone(),target:controls.target.clone()};
 document.body.classList.add('exploring','listening');
 document.querySelector('.dock').classList.add('collapsed');$('collapse').textContent='+';$('collapse').setAttribute('aria-expanded','false');$('collapse').setAttribute('aria-label','Expand controls');
});
$('collapse').addEventListener('click',()=>{const collapsed=document.querySelector('.dock').classList.toggle('collapsed');$('collapse').textContent=collapsed?'+':'−';$('collapse').setAttribute('aria-expanded',String(!collapsed));$('collapse').setAttribute('aria-label',collapsed?'Expand controls':'Collapse controls');});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('fullscreen').title='Fullscreen is unavailable in this preview';}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
const clock=new THREE.Clock();let elapsed=0,waterTime=0,frameCount=0,frameTime=0,qualityAdjusted=false;const branchWind={};
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);if(document.hidden)return;elapsed+=dt;waterTime+=dt*settings.river;
world.water.material.uniforms.time.value=waterTime*.45;world.foam.uniforms.time.value=waterTime;world.timeUniform.value=elapsed;world.windUniform.value=settings.wind;
for(const {group,phase,amp} of world.branches){
 sampleWind(elapsed,group.position.x-2,group.position.z-3,settings.wind,branchWind);
 const flutter=1+Math.sin(elapsed*1.2+phase)*.2;
 const spring=group.userData.spring ||= {x:0,z:0};
 const tx=branchWind.z*amp*flutter*1.7,tz=-branchWind.x*amp*flutter*1.7;
 spring.x+=((tx-group.rotation.x)*12-spring.x*4)*dt;
 spring.z+=((tz-group.rotation.z)*12-spring.z*4)*dt;
 group.rotation.x+=spring.x*dt;group.rotation.z+=spring.z*dt;
}
ecosystem.update(dt,elapsed,settings);
world.water.material.uniforms.distortionScale.value=1.3+settings.wind*1.5;
world.water.material.uniforms.windRipple.value=settings.wind;
world.updatePetals(dt,elapsed,settings.wind,settings.petals,settings.river);nightSky.update(elapsed);
 sampleWind(elapsed,0,0,settings.wind,branchWind);
 for(const c of world.clouds){c.position.x+=dt*branchWind.x*.18;c.position.z+=dt*branchWind.z*.08;if(c.position.x>190)c.position.x=-190;if(c.position.x<-190)c.position.x=190;}
if(listenerActive){
 listenerSeconds+=dt;listener.update(listenerSeconds,musicPlaying);
 if(listenShot){const t=THREE.MathUtils.clamp(listenerSeconds/4.6,0,1),ease=t*t*t*(t*(t*6-15)+10);
 camera.position.lerpVectors(listenShot.position,shotPosition,ease);controls.target.lerpVectors(listenShot.target,shotTarget,ease);
 camera.lookAt(controls.target);
 if(listenerSeconds>=5.35){listenShot=null;controls.enabled=true;controls.enableDamping=true;window.dispatchEvent(new Event('anshu:listen-ready'));}
 }
}
if(resetting){camera.position.lerp(start,1-Math.exp(-dt*4));controls.target.lerp(target,1-Math.exp(-dt*4));if(camera.position.distanceTo(start)<.04){resetting=false;controls.enabled=true;controls.enableDamping=true;controls.minDistance=29;}}
if(settings.cinematic){const a=controls.getAzimuthalAngle();if(a<controls.minAzimuthAngle+.04)controls.autoRotateSpeed=-.22;if(a>controls.maxAzimuthAngle-.04)controls.autoRotateSpeed=.22;}
if(!listenShot)controls.update(dt);camera.position.y=Math.max(camera.position.y,ground(camera.position.x,camera.position.z)+2.2);composer.render();
if(!qualityAdjusted&&elapsed>3){frameCount++;frameTime+=dt;if(frameCount>=120){if(frameTime/frameCount>.027){renderer.setPixelRatio(1);composer.setPixelRatio(1);world.grass.count=Math.floor(world.grass.count*.65);sun.shadow.mapSize.set(1024,1024);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}qualityAdjusted=true;}}
}
frame();requestAnimationFrame(()=>$('loading').classList.add('done'));
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('loading').classList.remove('done');$('loading').innerHTML='<p>The landscape paused. Reload to return to the valley.</p>';});
