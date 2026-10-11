(async () => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const D = window.InvitationData;
  window.INVITATION_CONFIG_READY = D.loadAsync();
  let data = await window.INVITATION_CONFIG_READY;
  const params = new URLSearchParams(location.search);
  const preview = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const invitation = { saludo: params.get('para') || '' };
  let galleryIndex = 0, lightboxIndex = 0, gallerySignature = '', toastTimer;
  let heroIndex = 0, heroSignature = '', heroTimer, heroPaused = reduced, heroHover = false, heroFocus = false;
  const readPath = (obj, path) => path.split('.').reduce((v, key) => v?.[key], obj);
  function node(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; }
  function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4500); }
  function backendEnabled() { return window.AdrianaServicios.available(); }
  function setImage(id, source, alt, position) {
    const img = $(id); if (!img) return;
    const url = D.safeURL(source, true);
    img.alt = alt || 'Fotografía de la celebración'; img.style.objectPosition = /^\d{1,3}% \d{1,3}%$/.test(position || '') ? position : '50% 50%';
    img.onload = () => { img.hidden = false; img.closest('figure')?.classList.remove('image-missing'); };
    img.onerror = () => { img.hidden = true; img.closest('figure')?.classList.add('image-missing'); };
    if (url) { if (img.getAttribute('src') !== url) { img.hidden = false; img.src = url; } }
    else { img.removeAttribute('src'); img.hidden = true; img.closest('figure')?.classList.add('image-missing'); }
  }
  function render() {
    $$('[data-text]').forEach(el => { el.textContent = data.textos[el.dataset.text] ?? ''; });
    $$('[data-value]').forEach(el => { el.textContent = readPath(data, el.dataset.value) ?? ''; });
    $$('[data-monogram]').forEach(el => {
      const url = D.safeURL(data.imagenes.monograma, true);
      el.replaceChildren();
      if (url) { const img = node('img'); img.src = url; img.alt = data.iniciales; el.append(img); }
      else el.textContent = data.iniciales;
    });
    document.title = `${data.textos.heroLinea1} ${data.textos.heroLinea2} · ${data.nombreCompleto}`;
    $('meta[name="description"]').content = `${data.nombreCompleto} · ${data.fechaTexto}. ${data.textos.heroFrase}`;
    $('meta[property="og:title"]').content = document.title;
    $('meta[property="og:description"]').content = `${data.fechaTexto} · ${data.lugar.nombre}. ${data.textos.heroFrase}`;
    renderHeroCarousel();
    const portrait = D.safeURL(data.retrato.archivo, true);
    $('#portraitFrame').dataset.hasPortrait = String(!!portrait); $('#portraitPlaceholder').hidden = !!portrait;
    setImage('#storyImage', portrait || data.imagenes.historia, portrait ? data.retrato.alt : data.imagenes.historiaAlt, portrait ? data.retrato.posicion : data.imagenes.historiaPosicion);
    [['#venueImage','lugar'],['#dressImage','vestimenta']].forEach(([id,key]) => setImage(id, data.imagenes[key], data.imagenes[key+'Alt'], data.imagenes[key+'Posicion']));
    $('#letterText').textContent = data.carta;
    $('#dressNote').textContent = data.vestimenta.nota; $('#dressNote').hidden = !data.vestimenta.nota;
    for (const [id, value] of [['#mapsLink', data.lugar.googleMaps], ['#wazeLink', data.lugar.waze]]) { const a = $(id), url = D.safeURL(value); a.hidden = !url; if (url) a.href = url; else a.removeAttribute('href'); }
    const map=$('#mapContainer iframe');if(map){const src=`https://maps.google.com/maps?q=${encodeURIComponent(data.lugar.mapaConsulta || data.lugar.direccion)}&output=embed`;if(map.src!==src)map.src=src;}
    renderGifts(); renderGallery(); renderPersonal(); renderMessageAvailability();
    // La confirmación vive en su propia página y conserva los datos del enlace personal.
    $$('[data-rsvp-link]').forEach(a => { a.href = 'confirmar.html' + location.search; });
    if (window.PUBLIC_MODE) $$('[data-editor-link]').forEach(el => el.remove());
    window.InvitationContext = { config: data, preview };
    window.dispatchEvent(new CustomEvent('invitation:render', {detail: window.InvitationContext}));
  }
  function renderHeroCarousel() {
    const extras = data.carruselPortada.fotos;
    const photos = [{ archivo: data.imagenes.portada, alt: data.imagenes.portadaAlt, posicion: data.imagenes.portadaPosicion }, ...Array.from({length:4}, (_, i) => extras[i] || window.EVENTO_BASE.carruselPortada.fotos[i])];
    const signature = JSON.stringify([photos, data.carruselPortada.segundos]);
    if (signature === heroSignature) return;
    heroSignature = signature;
    const viewport = $('#heroSlides'), firstImage = $('#heroImage');
    viewport.replaceChildren(); $('#heroDots').replaceChildren();
    photos.forEach((photo, index) => {
      const slide = node('div', 'hero-slide'); slide.setAttribute('role', 'group'); slide.setAttribute('aria-roledescription', 'diapositiva'); slide.setAttribute('aria-label', `${index+1} de ${photos.length}`);
      const img = index === 0 && firstImage ? firstImage : node('img');
      if (index === 0) img.id = 'heroImage';
      img.alt = photo.alt || `Fotografía de portada ${index+1}`; img.width = 1122; img.height = 1402;
      img.style.objectPosition = /^\d{1,3}% \d{1,3}%$/.test(photo.posicion || '') ? photo.posicion : '50% 50%';
      img.fetchPriority = index === 0 ? 'high' : 'low'; img.decoding = 'async';
      img.onload = () => { img.hidden = false; slide.classList.remove('image-missing'); };
      img.onerror = () => { img.hidden = true; slide.classList.add('image-missing'); };
      const source = D.safeURL(photo.archivo, true);
      if (source) { img.hidden = false; if (img.getAttribute('src') !== source) img.src = source; }
      else { img.removeAttribute('src'); img.hidden = true; slide.classList.add('image-missing'); }
      slide.append(img); viewport.append(slide);
      const button = node('button', 'hero-dot'); button.type = 'button'; button.setAttribute('aria-label', `Ver fotografía ${index+1} de ${photos.length}`); button.setAttribute('aria-controls', 'heroSlides');
      button.addEventListener('click', () => showHeroSlide(index)); $('#heroDots').append(button);
    });
    $('#heroCarouselControls').hidden = false;
    showHeroSlide(Math.min(heroIndex, photos.length-1));
  }
  function showHeroSlide(index) {
    const slides = [...$('#heroSlides').children]; if (!slides.length) return;
    heroIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.classList.toggle('is-active', i === heroIndex); slide.setAttribute('aria-hidden', String(i !== heroIndex)); });
    [...$('#heroDots').children].forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === heroIndex)));
    $('#heroPhotoIndex').textContent = ['I.', 'II.', 'III.', 'IV.', 'V.'][heroIndex];
    $('#heroSlides').dataset.index = String(heroIndex);
    scheduleHeroCarousel();
  }
  function scheduleHeroCarousel() {
    clearTimeout(heroTimer);
    const button = $('#heroCarouselPause');
    button.setAttribute('aria-label', heroPaused ? 'Reproducir carrusel' : 'Pausar carrusel'); button.title = button.getAttribute('aria-label');
    button.innerHTML = heroPaused ? '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="m9 5 10 7-10 7Z"/></svg>' : '<svg class="icon" aria-hidden="true"><use href="#i-pause"/></svg>';
    $('#heroSlides').setAttribute('aria-live', heroPaused || heroHover || heroFocus ? 'polite' : 'off');
    if (heroPaused || heroHover || heroFocus || document.hidden || $('#arrivalDialog')?.open) return;
    const seconds = Math.max(3, Math.min(15, Number(data.carruselPortada.segundos) || 5));
    heroTimer = setTimeout(() => showHeroSlide(heroIndex + 1), seconds * 1000);
  }
  $('#heroCarouselPause').addEventListener('click', () => {
    heroPaused = !heroPaused;
    if (!heroPaused) { heroHover = false; heroFocus = false; }
    scheduleHeroCarousel();
  });
  $('#heroCarousel').addEventListener('mouseenter', () => { if (!matchMedia('(hover: hover)').matches) return; heroHover = true; scheduleHeroCarousel(); });
  $('#heroCarousel').addEventListener('mouseleave', () => { heroHover = false; scheduleHeroCarousel(); });
  $('#heroCarousel').addEventListener('focusin', () => { heroFocus = true; scheduleHeroCarousel(); });
  $('#heroCarousel').addEventListener('focusout', event => { heroFocus = $('#heroCarousel').contains(event.relatedTarget); scheduleHeroCarousel(); });
  document.addEventListener('visibilitychange', scheduleHeroCarousel);
  window.addEventListener('invitation:arrival-state', scheduleHeroCarousel);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => { if (event.matches) heroPaused = true; scheduleHeroCarousel(); });
  let swipeStart;
  $('#heroSlides').addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !event.isPrimary) return;
    swipeStart = { x:event.clientX, y:event.clientY, id:event.pointerId };
    $('#heroSlides').setPointerCapture(event.pointerId);
  }, {passive:true});
  $('#heroSlides').addEventListener('pointerup', event => {
    if (!swipeStart || event.pointerId !== swipeStart.id) return;
    const dx=event.clientX-swipeStart.x, dy=event.clientY-swipeStart.y;swipeStart=null;
    if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.4) showHeroSlide(heroIndex+(dx<0?1:-1));
  }, {passive:true});
  $('#heroSlides').addEventListener('pointercancel', () => { swipeStart=null; }, {passive:true});
  function renderGifts() {
    $('#giftEnvelopes').hidden = !data.regalos.lluviaDeSobres;
    const bank = $('#bankDetails'); bank.replaceChildren(); bank.hidden = !data.regalos.cuenta;
    if (data.regalos.cuenta) {
      for (const value of [data.regalos.banco, data.regalos.cuenta, data.regalos.titular]) if (value) bank.append(node('p','',value));
      const button = node('button','text-link',data.textos.copiarCuenta);button.type = 'button';
      button.addEventListener('click',async () => { try { await navigator.clipboard.writeText(data.regalos.cuenta);toast('Número de cuenta copiado.'); } catch { toast(`Número de cuenta: ${data.regalos.cuenta}`); } });bank.append(button);
    }
    $('#giftStores').replaceChildren();
    data.regalos.tiendas.forEach(store => { const url = D.safeURL(store.url);if(!url)return;const a=node('a','text-link',store.nombre);a.href=url;a.target='_blank';a.rel='noopener noreferrer';$('#giftStores').append(a); });
  }
  function renderGallery() {
    const signature = JSON.stringify(data.fotos);if(signature===gallerySignature)return;gallerySignature=signature;
    const track=$('#galleryTrack');track.replaceChildren();
    data.fotos.forEach((photo,index) => {
      const fig=node('figure','gallery-photo reveal');const btn=node('button');btn.type='button';btn.setAttribute('aria-label',`Ampliar fotografía ${index+1}: ${photo.texto || photo.alt || ''}`);btn.dataset.photo=String(index);
      const img=node('img');img.loading='lazy';img.alt=photo.alt || photo.texto || `Fotografía ${index+1}`;img.style.objectPosition=photo.posicion || '50% 50%';const url=D.safeURL(photo.archivo,true);
      if(url)img.src=url;else fig.classList.add('image-missing');img.onerror=()=>{img.hidden=true;fig.classList.add('image-missing');};btn.append(img);
      const caption=node('figcaption');caption.append(node('span','',String(index+1).padStart(2,'0')),node('span','',photo.texto || ''));fig.append(btn,caption);track.append(fig);
    });
    // Espacios reservados para las fotos que la anfitriona añadirá en configuracion.js.
    for(let i=0;i<(data.espaciosAlbum||0);i++) {
      const fig=node('figure','gallery-photo gallery-reserved reveal');const frame=node('div','gallery-reserved-frame');frame.setAttribute('aria-hidden','true');frame.append(node('span','',data.iniciales));
      const caption=node('figcaption');caption.append(node('span','',String(data.fotos.length+i+1).padStart(2,'0')),node('span','',data.textos.galeriaReservado));fig.append(frame,caption);track.append(fig);
    }
    $('#galeria').hidden = !track.children.length;galleryIndex=0;requestAnimationFrame(updateGalleryCounter);
    $('#lightboxPrev').hidden = $('#lightboxNext').hidden = data.fotos.length < 2;
  }
  function updateGalleryCounter() {
    const track=$('#galleryTrack');const count=track.children.length;$('#galleryControls').hidden = count < 2 || track.scrollWidth <= track.clientWidth + 2;
    $('#galleryCounter').textContent=`${String(galleryIndex+1).padStart(2,'0')} / ${String(count).padStart(2,'0')}`;
    $('#galleryPrev').disabled=galleryIndex<=0;$('#galleryNext').disabled=galleryIndex>=count-1;
  }
  function moveGallery(direction) { const track=$('#galleryTrack');galleryIndex=Math.max(0,Math.min(track.children.length-1,galleryIndex+direction));const photo=track.children[galleryIndex];if(photo)track.scrollTo({left:photo.offsetLeft-track.offsetLeft-parseFloat(getComputedStyle(track).paddingLeft),behavior:reduced?'instant':'smooth'});updateGalleryCounter(); }
  function openPhoto(index) {
    if(!data.fotos.length)return;lightboxIndex=(index+data.fotos.length)%data.fotos.length;const photo=data.fotos[lightboxIndex];
    const img=$('#lightboxImage');img.src=D.safeURL(photo.archivo,true);img.alt=photo.alt || photo.texto || '';$('#lightboxCaption').textContent=photo.texto;
    if(!$('#lightbox').open)$('#lightbox').showModal();
  }
  function renderPersonal() {
    const greeting=$('#personalGreeting');greeting.hidden=!invitation.saludo;greeting.textContent=`${data.textos.saludo} ${invitation.saludo}`;
  }
  let messageAttempt = null;
  function renderMessageAvailability() {
    $('#messageAvailability').textContent = backendEnabled() ? 'Tus palabras aparecerán en el libro de mensajes.' : 'El libro de mensajes abrirá próximamente.';
  }
  function messageCard(entry) {
    const card=node('li','wall-card');card.append(node('p','wall-text',entry.mensaje));
    const foot=node('footer');foot.append(node('cite','',entry.nombre));
    const date=new Date(entry.creado);
    if(!Number.isNaN(date.getTime())){const time=node('time','',date.toLocaleDateString('es-PA',{day:'numeric',month:'long'}));time.dateTime=date.toISOString();foot.append(time);}
    card.append(foot);return card;
  }
  function showWall() {
    const count=$('#messageWall').children.length;$('#libro').hidden=!count;
    $('#wallCount').textContent=count===1?'Una carta en el libro':`${count} cartas en el libro`;
  }
  async function loadMessages() {
    if(!backendEnabled())return;
    try {
      const entries=await window.AdrianaServicios.messages();
      $('#messageWall').replaceChildren(...entries.map(messageCard));showWall();
    } catch { /* Sin permiso de lectura o sin conexión: el libro simplemente no se muestra. */ }
  }
  async function submitPrivateMessage(event) {
    event.preventDefault();
    const name=$('#messageName').value.trim(), text=$('#messageText').value.trim();
    const nameOK=name.length>=2&&name.length<=120, textOK=text.length>=2&&text.length<=2000;
    $('#messageNameError').hidden=nameOK;$('#messageTextError').hidden=textOK;
    $('#messageName').setAttribute('aria-invalid',String(!nameOK));$('#messageText').setAttribute('aria-invalid',String(!textOK));
    if(!textOK){$('#messageText').focus();return;}if(!nameOK){$('#messageName').focus();return;}
    const error=$('#messageSendError');error.hidden=true;
    if(!backendEnabled()){error.textContent='El libro de mensajes aún no está abierto. Conserva tus palabras y vuelve pronto.';error.hidden=false;return;}
    const button=$('#sendMessage');if(button.disabled)return;
    if(!messageAttempt||messageAttempt.name!==name||messageAttempt.text!==text)messageAttempt={id:crypto.randomUUID(),name,text};
    button.disabled=true;button.querySelector('span').textContent='Guardando tus palabras…';
    try {
      await window.AdrianaServicios.message(name,text,messageAttempt.id);
      $('#privateMessageForm').hidden=true;$('#messageSuccess').hidden=false;
      $('#messageWall').prepend(messageCard({nombre:name,mensaje:text,creado:new Date().toISOString()}));showWall();
      $('#messageSuccess').scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});
    } catch {
      error.textContent='No pudimos guardar tus palabras. Tu texto sigue aquí; revisa tu conexión e inténtalo de nuevo.';error.hidden=false;
    } finally {button.disabled=false;button.querySelector('span').textContent='Enviar mensaje';}
  }
  let observer;
  function observeReveals() {
    if(reduced)return;document.body.classList.add('js-motion');observer ||= new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}});},{threshold:.08,rootMargin:'0px 0px 35px 0px'});$$('.reveal:not(.visible)').forEach(el=>observer.observe(el));
  }
  function openLetter() {
    if($('#letterDialog').open)return;$('#envelope').classList.add('opening');
    setTimeout(()=>{if(!$('#letterDialog').open)$('#letterDialog').showModal();},reduced?0:450);
  }
  function closeLetter() {$('#letterDialog').close();$('#envelope').classList.remove('opening');}
  $('#openLetter').addEventListener('click',openLetter);$('#openLetterText').addEventListener('click',openLetter);$('#closeLetter').addEventListener('click',closeLetter);
  $('#letterDialog').addEventListener('close',()=>$('#envelope').classList.remove('opening'));
  for(const dialog of [$('#letterDialog'),$('#lightbox')])dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
  $('#menuToggle').addEventListener('click',()=>{const open=$('#menuToggle').getAttribute('aria-expanded')==='true';$('#menuToggle').setAttribute('aria-expanded',String(!open));$('#menuToggle').setAttribute('aria-label',open?'Abrir menú':'Cerrar menú');$('#navLinks').classList.toggle('open',!open);});
  $('#navLinks').addEventListener('click',event=>{if(event.target.closest('a')){$('#navLinks').classList.remove('open');$('#menuToggle').setAttribute('aria-expanded','false');$('#menuToggle').setAttribute('aria-label','Abrir menú');}});
  document.addEventListener('keydown',event=>{if($('#lightbox').open&&event.key==='ArrowRight')openPhoto(lightboxIndex+1);if($('#lightbox').open&&event.key==='ArrowLeft')openPhoto(lightboxIndex-1);if(event.key==='Escape'){$('#navLinks').classList.remove('open');$('#menuToggle').setAttribute('aria-expanded','false');}});
  $('#galleryTrack').addEventListener('click',event=>{const photo=event.target.closest('[data-photo]');if(photo)openPhoto(Number(photo.dataset.photo));});
  $('#galleryTrack').addEventListener('scroll',()=>{const track=$('#galleryTrack');const photos=[...track.children];if(!photos.length)return;let best=0,distance=Infinity;photos.forEach((el,i)=>{const diff=Math.abs(el.offsetLeft-track.offsetLeft-parseFloat(getComputedStyle(track).paddingLeft)-track.scrollLeft);if(diff<distance){distance=diff;best=i;}});galleryIndex=best;updateGalleryCounter();},{passive:true});
  $('#galleryPrev').addEventListener('click',()=>moveGallery(-1));$('#galleryNext').addEventListener('click',()=>moveGallery(1));$('#lightboxPrev').addEventListener('click',()=>openPhoto(lightboxIndex-1));$('#lightboxNext').addEventListener('click',()=>openPhoto(lightboxIndex+1));$('#closeLightbox').addEventListener('click',()=>$('#lightbox').close());
  new ResizeObserver(updateGalleryCounter).observe($('#galleryTrack'));
  $('#mapToggle').addEventListener('click',()=>{const container=$('#mapContainer');const open=container.hidden;container.hidden=!open;$('#mapToggle').setAttribute('aria-expanded',String(open));if(open&&!container.children.length){const iframe=node('iframe');iframe.title='Mapa del lugar de la celebración';iframe.src=`https://maps.google.com/maps?q=${encodeURIComponent(data.lugar.mapaConsulta || data.lugar.direccion)}&output=embed`;iframe.loading='lazy';iframe.referrerPolicy='no-referrer';container.append(iframe);}});
  $('#privateMessageForm').addEventListener('submit',submitPrivateMessage);
  let ticking=false;
  window.addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{const max=document.documentElement.scrollHeight-innerHeight;$('#readingProgress').style.width=(max>0?Math.min(100,scrollY/max*100):0)+'%';ticking=false;});},{passive:true});
  render();observeReveals();void loadMessages();
})();
