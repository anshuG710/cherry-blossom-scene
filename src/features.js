import './features.css';
import { tracks } from './music-config.js';
import { makePlayOrder } from './play-order.js';

const $ = id => document.getElementById(id);
const player = $('music-card'), audio = new Audio();
audio.preload='metadata';audio.volume=.35;
let sequencePending=false,atBench=false,playbackEpoch=0,shuffle=true;
let order=makePlayOrder(tracks.length,0,shuffle),cursor=0;
function timeLabel(seconds){
 if(!Number.isFinite(seconds))return '0:00';
 return Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
}
function updateTimeline(){
 const duration=Number.isFinite(audio.duration)?audio.duration:0;
 $('music-seek').disabled=!duration;
 $('music-seek').max=duration||1;$('music-seek').value=audio.currentTime;
 $('music-seek').style.setProperty('--value',duration?`${audio.currentTime/duration*100}%`:'0%');
 $('music-seek').setAttribute('aria-valuetext',`${timeLabel(audio.currentTime)} of ${timeLabel(duration)}`);
 $('music-elapsed').textContent=timeLabel(audio.currentTime);$('music-duration').textContent=timeLabel(duration);
}
function showPlayback(){
 const playing=!audio.paused&&!audio.ended;
 $('music-play').textContent=playing?'Ⅱ':'▶';$('music-play').setAttribute('aria-label',playing?'Pause music':'Play music');
 $('music-open').classList.toggle('is-playing',playing);
 window.dispatchEvent(new CustomEvent('anshu:music-state',{detail:{playing}}));
}
function loadTrack(){
 const track=tracks[order[cursor]];
 audio.src=track.url;$('track-name').textContent=track.title;
 $('music-status').textContent='';updateTimeline();
}
function pause(){playbackEpoch++;audio.pause();showPlayback();}
async function startPlayback(){
 const epoch=++playbackEpoch;
 try{await audio.play();if(epoch!==playbackEpoch){audio.pause();return;}$('music-status').textContent='';}
 catch{if(epoch===playbackEpoch)$('music-status').textContent='Press play to start the song.';}
 showPlayback();
}
function togglePlayer(show) {
  const visible = typeof show === 'boolean' ? show : player.hidden;
  player.hidden = !visible;
  $('music-open').setAttribute('aria-expanded', String(visible));
}

async function enterListening(){
  if(!player.hidden) {
    togglePlayer(false);
    return;
  }
  togglePlayer(true);
  if(sequencePending)return;
  if(atBench){
    if(audio.paused) await startPlayback();
    return;
  }
  sequencePending=true;$('music-play').disabled=true;
  $('music-status').textContent='Finding a seat beneath the blossoms…';
  // Unlock media during the user's gesture, preserving the selected position.
  const savedTime=audio.currentTime;
  audio.muted=true;
  try{await audio.play();audio.pause();audio.currentTime=savedTime;}catch{}finally{audio.muted=false;}
  if(sequencePending)window.dispatchEvent(new Event('anshu:listen-request'));
}
$('music-open').addEventListener('click',enterListening);
const minBtn = $('music-minimize');
if(minBtn) minBtn.addEventListener('click', () => togglePlayer(false));

window.addEventListener('anshu:listen-ready',async()=>{
 if(!sequencePending)return;sequencePending=false;atBench=true;
 await startPlayback();$('music-play').disabled=false;
});
window.addEventListener('anshu:listen-cancel',()=>{
 sequencePending=false;atBench=false;$('music-play').disabled=false;pause();$('music-status').textContent='';
});
$('music-close').addEventListener('click',()=>{
 pause();
 window.dispatchEvent(new Event('anshu:listen-exit'));
 togglePlayer(false);$('music-open').focus();
});
$('music-play').addEventListener('click',async()=>{
 if(!audio.paused){pause();return;}
 if(!atBench){await enterListening();return;}
 await startPlayback();
});
async function skip(direction,ended=false){
 const resume=ended||!audio.paused;
 pause();
 if(direction<0&&audio.currentTime>3){audio.currentTime=0;}
 else{cursor=(cursor+direction+order.length)%order.length;loadTrack();}
 updateTimeline();if(resume&&atBench)await startPlayback();
}
$('music-next').addEventListener('click',()=>skip(1));
$('music-previous').addEventListener('click',()=>skip(-1));
$('music-shuffle').addEventListener('click',()=>{
 shuffle=!shuffle;order=makePlayOrder(tracks.length,order[cursor],shuffle);cursor=0;
 $('music-shuffle').setAttribute('aria-pressed',String(shuffle));
 $('music-shuffle').title=shuffle?'Shuffle on':'Shuffle off';
});
$('music-seek').addEventListener('input',event=>{
 if(Number.isFinite(audio.duration)){audio.currentTime=Math.min(audio.duration,Math.max(0,+event.target.value));updateTimeline();}
});
$('music-volume').addEventListener('input',event=>{audio.volume=+event.target.value;event.target.style.setProperty('--value',`${audio.volume*100}%`);});
$('music-volume').style.setProperty('--value','35%');
for(const event of ['loadedmetadata','durationchange','timeupdate','seeked'])audio.addEventListener(event,updateTimeline);
for(const event of ['play','pause','ended'])audio.addEventListener(event,showPlayback);
audio.addEventListener('ended',()=>skip(1,true));
audio.addEventListener('error',()=>{$('music-status').textContent='Could not load this song. Press next to try another track.';showPlayback();});
loadTrack();

// ── Review: two-step flow ───────────────────────────────────────────
const dialog      = $('review-dialog');
const form        = $('review-form');
const nameStep    = $('review-name-step');
const mainStep    = $('review-main-step');
const nameForm    = $('review-name-form');
const nameInput   = $('review-name-input');
const storageKey  = 'anshu-review-v1';
const nameKey     = 'anshu-reviewer-name-v1'; // persists name independently

let saved;
let reviewerName = localStorage.getItem(nameKey) || null; // null = first time

try {
  const value = JSON.parse(localStorage.getItem(storageKey));
  if (value && Number.isInteger(value.rating) && value.rating >= 1 && value.rating <= 5 &&
    typeof value.message === 'string' && value.message.length <= 600 &&
    typeof value.name === 'string' && value.name.length <= 60) saved = value;
} catch { /* form remains usable when storage is unavailable */ }

/** Show step 1 (name) or step 2 (review) depending on context. */
function showStep(step) {
  const onName = step === 'name';
  nameStep.hidden = !onName;
  mainStep.hidden = onName;
  if (onName) {
    nameInput.value = reviewerName || '';
    setTimeout(() => nameInput.focus(), 80);
  }
}

/** Transition into the main review form, carrying the name forward. */
function enterMainStep(name) {
  reviewerName = name;
  try { localStorage.setItem(nameKey, name); } catch {}
  $('review-name').value = name;          // hidden input on review form
  showStep('main');
  renderReview();
  if (!saved) setTimeout(() => $('review-message').focus(), 80);
}

function renderReview() {
  // If a saved review exists, hide the form and show the saved article.
  const hasSaved = !!saved;
  form.hidden = hasSaved;
  $('saved-review').hidden = !hasSaved;
  if (!hasSaved) return;
  $('saved-name').textContent    = saved.name || 'Your review';
  $('saved-rating').textContent  = '★'.repeat(saved.rating) + '☆'.repeat(5 - saved.rating);
  $('saved-rating').setAttribute('aria-label', `${saved.rating} out of 5 stars`);
  $('saved-message').textContent = saved.message;
  $('review-status').textContent = 'Thank you for sharing a little of your moment. Saved on this device.';
}

/** Open dialog: show name step only on very first visit; otherwise go straight to review. */
$('review-open').addEventListener('click', () => {
  dialog.showModal();
  if (reviewerName === null) {
    // First time ever — ask for name
    showStep('name');
  } else {
    // Returning visitor — jump straight to review
    enterMainStep(reviewerName);
  }
});

// Name form: pressing Continue (or Enter) advances to step 2
nameForm.addEventListener('submit', event => {
  event.preventDefault();
  const name = nameInput.value.trim().slice(0, 60);
  enterMainStep(name);
});

$('review-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog &&
    (event.clientX < bounds.left || event.clientX > bounds.right ||
     event.clientY < bounds.top  || event.clientY > bounds.bottom)) dialog.close();
});

function highlightStars(value) {
  for (const radio of form.querySelectorAll('[name=rating]'))
    radio.parentElement.classList.toggle('selected', +radio.value <= value);
}
form.addEventListener('change', () => highlightStars(+(new FormData(form).get('rating') || 0)));
$('review-message').addEventListener('input', () => $('review-message').setCustomValidity(''));

form.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form), message = String(data.get('message') || '').trim();
  if (message.length < 3) {
    $('review-message').setCustomValidity('Please write at least three characters.');
    form.reportValidity(); return;
  }
  const review = {
    name:    String(data.get('name') || reviewerName || '').trim().slice(0, 60),
    message: message.slice(0, 600),
    rating:  +data.get('rating')
  };
  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(review));
    saved = review; renderReview(); $('review-edit').focus();
  } catch {
    $('review-status').textContent = 'Your browser could not save this review. Please allow local storage and try again. Your text is still here.';
  }
});

$('review-edit').addEventListener('click', () => {
  form.hidden = false; $('saved-review').hidden = true; $('review-status').textContent = '';
  $('review-name').value = saved.name;
  $('review-message').value = saved.message;
  form.querySelector(`[name=rating][value="${saved.rating}"]`).checked = true;
  highlightStars(saved.rating); $('review-message').focus();
});

$('review-remove').addEventListener('click', () => {
  try {
    localStorage.removeItem(storageKey);
    saved = undefined; form.reset(); highlightStars(0); renderReview();
    $('review-status').textContent = 'Your saved review has been removed.';
  } catch {
    $('review-status').textContent = 'Your browser could not remove the saved review. Please try again.';
  }
});
window.addEventListener('pagehide', () => { void pause(); });
