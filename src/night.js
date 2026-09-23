import * as THREE from 'three';

export function makeNight(scene) {
  const vertices = [];
  let seed=81573;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for (let i = 0; i < 1000; i++) {
    const angle = random() * Math.PI * 2, y = .07 + random() * .92;
    const radius = Math.sqrt(1 - y * y);
    vertices.push(Math.cos(angle) * radius * 330, y * 330, Math.sin(angle) * radius * 330);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const stars = new THREE.Points(geometry, new THREE.PointsMaterial({color: '#cbdcff', size: .65,
    transparent: true, opacity: 0, depthWrite: false, fog: false}));
  scene.add(stars);
  const moonMaterial = new THREE.ShaderMaterial({transparent: true, uniforms: {night: {value: 0}},
    vertexShader: 'varying vec3 p;varying vec3 n;void main(){p=position;n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 p;varying vec3 n;uniform float night;void main(){
      float craters=sin(p.x*4.+sin(p.y*3.))*sin(p.z*3.7+p.y*2.);
      float phase=smoothstep(-.4,.6,dot(normalize(n),normalize(vec3(-.6,.3,1.))));
      gl_FragColor=vec4(vec3(.71,.80,1.)*(.5+phase*.9)*(1.-max(0.,craters)*.2),night);}`});
  const moon = new THREE.Mesh(new THREE.SphereGeometry(4.1,32,24),moonMaterial);
  moon.position.set(-48,59,-180);scene.add(moon);
  const fireflyPositions=[], phases=[];
  for(let i=0;i<45;i++){
    fireflyPositions.push(-18+(i*7.31%40),1.7+(i*1.31%3),-18+(i*6.71%38));phases.push(i*1.37);
  }
  const fireflyGeometry=new THREE.BufferGeometry();
  fireflyGeometry.setAttribute('position',new THREE.Float32BufferAttribute(fireflyPositions,3));
  fireflyGeometry.setAttribute('phase',new THREE.Float32BufferAttribute(phases,1));
  const fireflyMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{night:{value:0},time:{value:0}},
    vertexShader:`attribute float phase;uniform float time;varying float pulse;void main(){
      vec3 p=position+vec3(sin(time*.23+phase)*.8,sin(time*.7+phase)*.3,cos(time*.3+phase)*.8);
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
      gl_PointSize=clamp(90./-mv.z,1.,5.);pulse=pow(.5+.5*sin(time*1.4+phase),3.);}`,
    fragmentShader:'uniform float night;varying float pulse;void main(){float d=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(1.,.83,.36,max(0.,1.-d)*pulse*night);}'});
  scene.add(new THREE.Points(fireflyGeometry,fireflyMaterial));
  return {set(value){stars.material.opacity=value*.85;moonMaterial.uniforms.night.value=value;moon.visible=value>.001;fireflyMaterial.uniforms.night.value=value;},
    update(time){fireflyMaterial.uniforms.time.value=time;}};
}
