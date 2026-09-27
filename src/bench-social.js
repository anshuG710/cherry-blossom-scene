import { tracks } from './music-config.js';
export function validVisitor(s){return !!s&&typeof s.visible==='boolean'&&typeof s.seated==='boolean'&&[0,1].includes(s.bench)&&[s.x,s.y,s.z,s.angle,s.offset].every(Number.isFinite)&&Math.abs(s.x)<150&&Math.abs(s.z)<200&&s.y>=-1&&s.y<40&&Math.abs(s.offset)<=1;}
export function validMusic(s){return !!s&&Number.isInteger(s.track)&&s.track>=0&&s.track<tracks.length&&Number.isFinite(s.position)&&s.position>=0&&s.position<86400&&typeof s.playing==='boolean'&&Number.isFinite(s.sentAt);}
export function matchesRequest(pending,packet,now=Date.now()){return !!pending&&pending.id===packet.request&&pending.to===packet.from&&pending.expires>now;}

export function makeBenchSocial(){
  const $=id=>document.getElementById(id),id=crypto.randomUUID();
  let channel=null,name='Visitor',peers=new Map(),local=null,music=null,pending=null,incoming=null,session=null,lastTrack=0,lastInvite=0;
  const emit=(type,detail)=>window.dispatchEvent(new CustomEvent(type,{detail}));
  function status(text){$('bench-status').textContent=text;}
  async function send(kind,data={}){if(!channel)return false;try{const result=await channel.send({type:'broadcast',event:'bench',payload:{kind,from:id,...data}});if(result!=='ok'){status('Connection interrupted. Try again when reconnected.');return false;}return true;}catch{status('Connection interrupted.');return false;}}
  function end(notify=true){if(session&&notify)send('leave',{to:session.peer,token:session.token});session=null;pending=null;incoming=null;$('bench-invitation').hidden=true;$('bench-leave').hidden=true;emit('anshu:shared-end');}
  function start(peer,token,host){session={peer,token,host};pending=null;incoming=null;$('bench-invitation').hidden=true;$('bench-leave').hidden=false;status(host?'Sharing your song. You control playback.':'Listening together. Your host controls the song.');}
  function presence(state){
    const next=new Map();for(const list of Object.values(state||{}))for(const p of list){if(typeof p.visitor_id==='string'&&p.visitor_id!==id&&typeof p.display_name==='string')next.set(p.visitor_id,{name:p.display_name.slice(0,40),state:validVisitor(p.scene)?p.scene:null});}
    for(const peer of peers.keys())if(!next.has(peer)){emit('anshu:peer-left',peer);if(session?.peer===peer){end(false);status('Your companion went offline.');}}
    peers=next;const selected=$('bench-peers').value;$('bench-peers').replaceChildren(new Option('Choose an online listener',''));
    for(const [peer,entry] of peers){if(entry.state?.seated)$('bench-peers').add(new Option(`${entry.name} · ${entry.state.bench?'Riverside':'Blossom'} bench`,peer));if(entry.state)emit('anshu:peer-state',{id:peer,state:entry.state});}
    if(peers.has(selected))$('bench-peers').value=selected;
  }
  function receive(p){
    if(!p||typeof p!=='object'||p.from===id||!peers.has(p.from))return;
    if(p.kind==='state'&&validVisitor(p.state)){peers.get(p.from).state=p.state;emit('anshu:peer-state',{id:p.from,state:p.state});return;}
    if(p.to!==id)return;
    if(p.kind==='request'){
      if(session||incoming||!local?.seated||typeof p.request!=='string'||p.request.length>80||!Number.isFinite(p.expires)||p.expires<Date.now()||p.expires>Date.now()+35000)return;
      incoming={...p};$('bench-invitation-text').textContent=`${peers.get(p.from).name} asks to sit beside you and listen to your song.`;$('bench-invitation').hidden=false;emit('anshu:bench-focus');
    }else if(p.kind==='accept'&&matchesRequest(pending,p)&&typeof p.token==='string'&&p.token.length<=80&&[0,1].includes(p.bench)){
      start(p.from,p.token,false);emit('anshu:shared-start');emit('anshu:join-bench',{bench:p.bench});if(validMusic(p.music))emit('anshu:shared-music',p.music);
    }else if(p.kind==='decline'&&matchesRequest(pending,p)){pending=null;status('The invitation was declined.');}
    else if(session&&p.from===session.peer&&p.token===session.token){
      if(p.kind==='music'&&!session.host&&validMusic(p.music))emit('anshu:shared-music',p.music);
      if(p.kind==='leave'){end(false);status('Shared listening ended.');}
    }
  }
  $('bench-request').addEventListener('click',async()=>{
    const to=$('bench-peers').value;if(!channel){status('Join Chat first to connect with other visitors.');return;}
    if(!local?.visible){status('Choose Listen first to bring in your avatar.');return;}
    if(session){status('Leave your current shared session first.');return;}
    if(!peers.get(to)?.state?.seated){status('Choose someone sitting on a bench.');return;}
    if(Date.now()-lastInvite<5000)return;lastInvite=Date.now();pending={id:crypto.randomUUID(),to,expires:Date.now()+30000};
    if(await send('request',{to,request:pending.id,expires:pending.expires}))status('Request sent. Waiting for permission…');else pending=null;
  });
  $('bench-accept').addEventListener('click',async()=>{
    if(!incoming||incoming.expires<Date.now()||!local?.seated||session){status('This request is no longer available.');$('bench-invitation').hidden=true;incoming=null;return;}
    const invite=incoming,token=crypto.randomUUID();start(invite.from,token,true);emit('anshu:host-bench');
    if(!await send('accept',{to:invite.from,request:invite.request,token,bench:local.bench,music})){end(false);status('Could not accept. Please try again.');}
  });
  $('bench-decline').addEventListener('click',()=>{if(incoming)send('decline',{to:incoming.from,request:incoming.request});incoming=null;$('bench-invitation').hidden=true;});
  $('bench-leave').addEventListener('click',()=>{end();status('You left shared listening.');});
  for(const event of ['anshu:leave-seat','anshu:listen-cancel'])window.addEventListener(event,()=>end());
  window.addEventListener('anshu:scene-state',e=>{local=e.detail;if(channel){send('state',{state:local});if(Date.now()-lastTrack>4000){lastTrack=Date.now();channel.track({visitor_id:id,display_name:name,scene:local}).catch(()=>{});}}});
  window.addEventListener('anshu:audio-snapshot',e=>{music=e.detail;if(session?.host)send('music',{to:session.peer,token:session.token,music});});
  setInterval(()=>{const now=Date.now();if(pending&&pending.expires<now){pending=null;status('Request expired. You can ask again.');}if(incoming&&incoming.expires<now){incoming=null;$('bench-invitation').hidden=true;status('Seat request expired.');}},1000);
  return {receive,presence,
    connected(value,displayName){channel=value;name=displayName||'Visitor';channel.track({visitor_id:id,display_name:name,scene:local}).catch(()=>{});$('bench-offline').hidden=false;status('Online. Choose a listener to request a shared seat.');},
    disconnected(){end(false);for(const peer of peers.keys())emit('anshu:peer-left',peer);peers.clear();channel=null;$('bench-peers').replaceChildren(new Option('No listeners connected',''));$('bench-offline').hidden=true;status('Offline. Join Chat to meet visitors.');}
  };
}
