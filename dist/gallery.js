'use strict';

// The catalog mirrors a Webflow Formats collection related to Video Examples.
// Source order and full-film links come directly from the client's sheet.
const formatDefinitions=[
  ['01','social-video-clips','Social Video Clips','Short-form work made for the feed.','Social-first video examples selected by the Hatch team.'],
  ['02','sizzle-reels-event-recaps','Sizzle Reels & Event Recaps','The moments worth watching again.','Event and campaign highlights selected by the Hatch team.'],
  ['03','customer-exec-testimonials','Customer & Exec Testimonials','Real voices. Lasting proof.','Customer and executive video stories selected by the Hatch team.'],
  ['04','product-demo-walkthrough-videos','Product Demo & Walkthrough Videos','Make every feature easy to understand.','Product demos and walkthroughs selected by the Hatch team.'],
  ['05','product-launch-videos','Product Launch Videos','Give every launch its moment.','Product launch videos selected by the Hatch team.'],
  ['06','youtube-videos','YouTube Videos','Stories built for the channel.','YouTube videos selected by the Hatch team.'],
  ['07','video-podcasts','Video Podcasts','Conversations with a longer life.','Video podcasts selected by the Hatch team.'],
  ['08','brand-campaign-videos','Brand & Campaign Videos','A bigger canvas for the message.','Brand and campaign videos selected by the Hatch team.']
];

const formats=formatDefinitions.map(([number,slug,name,description,detail],formatIndex)=>({
  number,slug,name,description,detail,order:formatIndex+1,published:true,
  examples:window.HATCH_EXAMPLES.filter(item=>item.category===name&&item.published)
})).filter(item=>item.published).sort((a,b)=>a.order-b.order);

const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
const gallery=document.querySelector('#format-gallery');
const pills=document.querySelector('#format-pills');
const modal=document.querySelector('#film-modal');
const modalMedia=document.querySelector('#modal-media');
let activeFormatIndex=0,activeExampleIndex=0,playingCard=null,lastModalTrigger=null,scrollFrame=0,keyboardNavigation=false,nearObserver=null;
const escapeHTML=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const currentFormat=()=>formats[activeFormatIndex];
const currentExamples=()=>currentFormat().examples.filter(item=>item.published).sort((a,b)=>a.order-b.order);

function renderPills(){pills.innerHTML=formats.map((format,index)=>`<button class="format-pill" type="button" role="tab" id="tab-${format.slug}" aria-controls="format-gallery" aria-selected="${index===activeFormatIndex}" data-index="${index}">${escapeHTML(format.name)}</button>`).join('')}

function renderExamples(){
  const format=currentFormat(),examples=currentExamples();
  stopAllPreviews();nearObserver?.disconnect();gallery.scrollLeft=0;
  gallery.setAttribute('aria-labelledby',`tab-${format.slug}`);
  gallery.innerHTML=examples.map((example,index)=>{const project=example.projectName||'Project name',industry=example.industry||'Industry';return `<article class="media-card${index===0?' is-active':''}" id="example-${example.id}" data-index="${index}" data-ratio="${example.ratio}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="Open full video: ${escapeHTML(project)}, ${escapeHTML(industry)}"><div class="media-stage"><img src="${example.poster}" alt="${escapeHTML(project)} — ${escapeHTML(industry)}" width="720" height="720" ${index===0?'fetchpriority="high"':'loading="lazy" decoding="async"'}><video muted playsinline loop preload="none" data-src="${example.preview}" tabindex="-1" aria-hidden="true"></video><span class="card-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></span><span class="media-error" role="status"></span></div><div class="card-caption"><div><strong>${escapeHTML(project)}</strong><p>${escapeHTML(industry)}</p></div></div></article>`}).join('');
  activeExampleIndex=0;document.querySelector('#total-count').textContent=String(examples.length).padStart(2,'0');setActiveExample(0,false);bindCards();
}

function attachPreview(card){const video=card.querySelector('video');if(!video.src){video.src=video.dataset.src;video.load()}}
function releasePreview(card){const video=card?.querySelector('video');if(!video)return;stopPreview(card);video.removeAttribute('src');video.load()}
function stopPreview(card){if(!card)return;const video=card.querySelector('video');video.pause();try{video.currentTime=0}catch{}card.querySelector('.media-stage').classList.remove('is-playing');if(playingCard===card)playingCard=null}
function stopAllPreviews(except){document.querySelectorAll('.media-card').forEach(card=>{if(card!==except)stopPreview(card)})}
async function playPreview(card){if(playingCard===card)return;stopAllPreviews(card);playingCard=card;const video=card.querySelector('video'),error=card.querySelector('.media-error');attachPreview(card);video.muted=true;video.defaultMuted=true;video.volume=0;error.textContent='';try{await video.play();if(playingCard!==card||!card.isConnected){video.pause();return}card.querySelector('.media-stage').classList.add('is-playing')}catch(errorObject){stopPreview(card);error.textContent='Preview unavailable.'}}

function setActiveFormat(index){
  activeFormatIndex=Math.max(0,Math.min(index,formats.length-1));const format=currentFormat();
  document.querySelectorAll('.format-pill').forEach((pill,i)=>pill.setAttribute('aria-selected',i===activeFormatIndex));
  document.querySelector('#active-number').textContent=format.number;document.querySelector('#active-name').textContent=format.name;document.querySelector('#active-description').textContent=format.description;
  document.querySelectorAll('.format-pill')[activeFormatIndex]?.scrollIntoView({behavior:reduceMotion.matches?'auto':'smooth',block:'nearest',inline:'center'});renderExamples();
}
function setActiveExample(index){activeExampleIndex=Math.max(0,Math.min(index,currentExamples().length-1));document.querySelectorAll('.media-card').forEach((card,i)=>card.classList.toggle('is-active',i===activeExampleIndex));document.querySelector('#current-count').textContent=String(activeExampleIndex+1).padStart(2,'0');document.querySelector('#progress-bar').style.width=`${((activeExampleIndex+1)/currentExamples().length)*100}%`}
function scrollToExample(index){const card=document.querySelectorAll('.media-card')[Math.max(0,Math.min(index,currentExamples().length-1))];card?.scrollIntoView({behavior:reduceMotion.matches?'auto':'smooth',block:'nearest',inline:'center'});setActiveExample(Number(card.dataset.index))}
function closestCardToCenter(){const center=gallery.getBoundingClientRect().left+gallery.clientWidth/2;let bestIndex=0,bestDistance=Infinity;document.querySelectorAll('.media-card').forEach((card,index)=>{const rect=card.getBoundingClientRect(),distance=Math.abs(rect.left+rect.width/2-center);if(distance<bestDistance){bestDistance=distance;bestIndex=index}});return bestIndex}

function getEmbedURL(example){
  if(example.provider==='vimeo'&&example.videoId)return `https://player.vimeo.com/video/${encodeURIComponent(example.videoId)}?autoplay=1&muted=0&title=0&byline=0&portrait=0&dnt=1`;
  if(example.provider==='youtube'&&example.videoId)return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(example.videoId)}?autoplay=1&mute=0&playsinline=1&rel=0`;
  return '';
}

function createFullPlayer(example,format){
  const label=`${format.name}, ${example.title} full video`;
  const embedURL=getEmbedURL(example);
  if(embedURL){
    const iframe=document.createElement('iframe');
    iframe.src=embedURL;
    iframe.title=label;
    iframe.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';
    iframe.allowFullscreen=true;
    iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.dataset.provider=example.provider;
    return iframe;
  }
  if(example.provider==='frameio'){
    const iframe=document.createElement('iframe');
    iframe.src=example.fullVideo;
    iframe.title=label;
    iframe.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';
    iframe.allowFullscreen=true;
    iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.dataset.provider='frameio';
    return iframe;
  }
  const video=document.createElement('video');
  video.src=example.fullVideo;
  video.poster=example.poster;
  video.controls=true;
  video.playsInline=true;
  video.preload='metadata';
  video.muted=false;
  video.volume=1;
  video.setAttribute('aria-label',label);
  return video;
}

function openFilm(index,trigger){
  stopAllPreviews();
  const format=currentFormat(),example=currentExamples()[index];
  lastModalTrigger=trigger;
  document.querySelector('#modal-number').textContent=`${format.number}.${String(index+1).padStart(2,'0')}`;
  document.querySelector('#modal-title').textContent=`${example.projectName||example.title} — ${example.industry||format.name}`;
  document.querySelector('#modal-description').textContent=format.detail;
  modalMedia.replaceChildren(createFullPlayer(example,format));
  modal.showModal();
  document.body.classList.add('modal-open');
  const localVideo=modalMedia.querySelector('video');
  if(localVideo)localVideo.play().catch(()=>{});
}
function closeFilm(){
  if(!modal.open)return;
  const video=modalMedia.querySelector('video');
  const iframe=modalMedia.querySelector('iframe');
  if(video){video.pause();video.removeAttribute('src');video.load()}
  if(iframe)iframe.src='about:blank';
  modalMedia.replaceChildren();
  modal.close();
  document.body.classList.remove('modal-open');
  lastModalTrigger?.focus();
}

function bindCards(){
  nearObserver=new IntersectionObserver(entries=>entries.forEach(entry=>entry.isIntersecting?attachPreview(entry.target):releasePreview(entry.target)),{root:gallery,rootMargin:'0px 45%',threshold:0});
  document.querySelectorAll('.media-card').forEach(card=>{nearObserver.observe(card);const stage=card.querySelector('.media-stage');const open=()=>openFilm(Number(card.dataset.index),card);card.addEventListener('click',open);card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}});stage.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&finePointer.matches&&!reduceMotion.matches)playPreview(card)});stage.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse')stopPreview(card)});card.addEventListener('focusin',()=>{if(keyboardNavigation&&!reduceMotion.matches){clearTimeout(card._focusTimer);card._focusTimer=setTimeout(()=>{if(card.contains(document.activeElement)&&playingCard!==card)playPreview(card)},180)}});card.addEventListener('focusout',event=>{clearTimeout(card._focusTimer);if(!card.contains(event.relatedTarget))stopPreview(card)});card.querySelector('video').addEventListener('error',()=>{if(playingCard===card){stopPreview(card);card.querySelector('.media-error').textContent='Preview unavailable.'}})});
}

renderPills();setActiveFormat(0);
pills.addEventListener('click',event=>{const pill=event.target.closest('.format-pill');if(pill)setActiveFormat(Number(pill.dataset.index))});
pills.addEventListener('keydown',event=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();let next=activeFormatIndex;if(event.key==='ArrowRight')next=(next+1)%formats.length;if(event.key==='ArrowLeft')next=(next-1+formats.length)%formats.length;if(event.key==='Home')next=0;if(event.key==='End')next=formats.length-1;setActiveFormat(next);document.querySelectorAll('.format-pill')[next].focus()});
gallery.addEventListener('scroll',()=>{cancelAnimationFrame(scrollFrame);scrollFrame=requestAnimationFrame(()=>setActiveExample(closestCardToCenter()))},{passive:true});
gallery.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();scrollToExample(activeExampleIndex+1)}if(event.key==='ArrowLeft'){event.preventDefault();scrollToExample(activeExampleIndex-1)}if(event.key==='Home'){event.preventDefault();scrollToExample(0)}if(event.key==='End'){event.preventDefault();scrollToExample(currentExamples().length-1)}});
document.querySelector('#previous-card').addEventListener('click',()=>scrollToExample(activeExampleIndex-1));document.querySelector('#next-card').addEventListener('click',()=>scrollToExample(activeExampleIndex+1));document.querySelector('.modal-close').addEventListener('click',closeFilm);modal.addEventListener('click',event=>{if(event.target===modal)closeFilm()});modal.addEventListener('cancel',event=>{event.preventDefault();closeFilm()});document.addEventListener('keydown',event=>{if(event.key==='Tab'||event.key.startsWith('Arrow'))keyboardNavigation=true},{capture:true});document.addEventListener('pointerdown',()=>{keyboardNavigation=false},{capture:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAllPreviews()});reduceMotion.addEventListener('change',()=>stopAllPreviews());
