import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
const profile=path.join(tmpdir(),'adriana-qa-'+Date.now());await mkdir(profile,{recursive:true});
const chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--disable-gpu','--disable-extensions','--disable-background-networking','--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const checks=[],visual=[];let socket,closed=false;let sequence=0;const pending=new Map();
function check(name,value,detail){checks.push({name,passed:!!value,...(detail?{detail}:{})});console.log(`${name}: ${!!value}`);}
try{
 let tabs;for(let i=0;i<150;i++){try{tabs=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());if(tabs.some(t=>t.type==='page'))break;}catch{}await pause(100);}if(!tabs)throw new Error('Chrome no inició.');
 socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let requestHandler;
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result);}else if(m.method==='Fetch.requestPaused')requestHandler?.(m.params);};
 function send(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
 async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
 async function until(expression,label){for(let i=0;i<250;i++){try{if(await evaluate(expression))return;}catch{}await pause(100);}throw new Error('Tiempo agotado: '+label);}
 async function shot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(root,'adriana-'+name+'.png'),Buffer.from(r.data,'base64'));}
 await send('Page.enable');await send('Runtime.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.qaErrors=[];window.addEventListener('error',e=>qaErrors.push(e.message));window.addEventListener('unhandledrejection',e=>qaErrors.push(String(e.reason)));try{localStorage.setItem('bridgerton.invitacion.config.v1',JSON.stringify({nombreCompleto:'Nombre anterior',fechaTexto:'3 de octubre'}));}catch{}`});
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 async function navigate(){await send('Page.navigate',{url:'http://127.0.0.1:4173/'});await until('window.InvitationContext&&document.querySelectorAll(".hero-slide img").length===5','página renderizada');await evaluate('document.fonts.ready');}
 if(process.argv.includes('--telefonos-only')){
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  const sizes=[[320,568],[360,800],[375,667],[390,844],[430,932],[844,390]];
  for(const [width,height] of sizes){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await navigate();
   await until('document.querySelector("#heroImage").complete&&document.querySelector("#heroImage").naturalWidth>0','foto de portada');
   await evaluate('window.scrollTo({top:0,behavior:"instant"})');await pause(100);await shot(`telefono-${width}-portada`);
   const metrics=await evaluate(`(()=>{const selectors=['.navigation','.brand','.nav-rsvp','#menuToggle','.hero h1','.hero-meta','#celebrationTitle','.celebration-date','.celebration-time','.celebration-venue','#timeline','.rsvp-form-wrap','.private-letter','.footer-name'];return {overflow:document.documentElement.scrollWidth>innerWidth,clipped:selectors.filter(s=>{const r=document.querySelector(s).getBoundingClientRect();return r.width>0&&(r.left < -1 || r.right>innerWidth+1)}),inputs:[...document.querySelectorAll('.field input,.field textarea')].every(el=>parseFloat(getComputedStyle(el).fontSize)>=16),targets:['#menuToggle','.nav-rsvp','#submitRsvp','#sendMessage','#heroCarouselPause',...Array.from({length:5},(_,i)=>'.hero-dot:nth-child('+(i+1)+')')].every(s=>{const r=document.querySelector(s).getBoundingClientRect();return r.width>=43.5&&r.height>=43.5}),errors:qaErrors};})()`);
   check(`Teléfono ${width} × ${height}: texto, formularios y botones adaptados`,!metrics.overflow&&!metrics.clipped.length&&metrics.inputs&&metrics.targets&&!metrics.errors.length,metrics);
   for(const section of ['celebracion','velada','detalles','confirmar','palabras','final']){
    await evaluate(`document.querySelector('#${section}').scrollIntoView({behavior:'instant'})`);await pause(100);
    if(width===320||width===390||width===844)await shot(`telefono-${width}-${section}`);
   }
   await evaluate('window.scrollTo({top:0,behavior:"instant"});document.querySelector("#menuToggle").click()');
   check(`Menú táctil abre y navega a ${width} px`,await evaluate('document.querySelector("#menuToggle").getAttribute("aria-expanded")==="true"&&getComputedStyle(document.querySelector("#navLinks")).display!=="none"'));
   await evaluate('document.querySelector("#navLinks a").click()');
   check(`Menú cierra después de navegar a ${width} px`,await evaluate('document.querySelector("#menuToggle").getAttribute("aria-expanded")==="false"'));
  }
  check('Botón y descarga de calendario eliminados',await evaluate('!document.querySelector("#calendarButton")&&!document.body.innerText.includes("Guardar la fecha")'));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await navigate();await evaluate('document.querySelector("#heroSlides").scrollIntoView({behavior:"instant",block:"center"})');
  const coords=await evaluate('(()=>{const r=document.querySelector("#heroSlides").getBoundingClientRect();return{x:r.x+r.width*.75,y:r.y+r.height*.5,to:r.x+r.width*.25};})()');
  const before=await evaluate('document.querySelector("#heroSlides").dataset.index');
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:coords.x,y:coords.y,id:1}]});
  for(let i=1;i<=5;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:coords.x+(coords.to-coords.x)*i/5,y:coords.y,id:1}]});await pause(25);}
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  check('Deslizar con el dedo cambia la foto del carrusel',await evaluate('document.querySelector("#heroSlides").dataset.index')!==before);
  await evaluate('document.querySelector("#messageName").focus()');
  check('La música deja libre el formulario durante la escritura',await evaluate('getComputedStyle(document.querySelector("#musicToggle")).pointerEvents==="none"&&parseFloat(getComputedStyle(document.querySelector("#messageName")).fontSize)>=16'));
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});await navigate();await until('document.querySelector("#arrivalDialog").open','entrada en teléfono pequeño');await shot('telefono-320-entrada');
  check('Omitir entrada tiene un área táctil suficiente',await evaluate('document.querySelector("#skipArrival").getBoundingClientRect().height>=44'));
  await evaluate('document.querySelector("#skipArrival").click()');check('Omitir permite usar la página en el teléfono',await evaluate('!document.querySelector("#arrivalDialog").open&&!document.body.classList.contains("arrival-running")'));
  const report={passed:checks.every(c=>c.passed),checks};await writeFile(path.join(root,'resultados-telefonos.json'),JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
  await send('Browser.close');closed=true;
 } else if(process.argv.includes('--baile-only')){
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});await navigate();
  check('Sin dibujos ni imágenes de reemplazo al dejar rutas vacías',await evaluate('document.querySelectorAll("#timeline li").length===6&&!document.querySelector("#timeline svg,#timeline img,[id^=agenda-]")'));
  await evaluate('document.querySelector("#velada").scrollIntoView({behavior:"instant"})');await shot('baile-sin-imagenes-desktop');
  const config=await readFile(path.join(root,'..','configuracion.js'),'utf8');
  let broken=false;
  requestHandler=async({requestId})=>{
   const photographs={recepcion:'assets/jardin-glicinas.png',bienvenida:'assets/te-de-la-temporada.png',presentacion:'assets/detalles-del-baile.png',principal:broken?'assets/baile/no-existe.png':'assets/escalera-del-debut.png',cena:'assets/te-de-la-temporada.png',fiesta:'assets/salon-regency.png'};
   await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript; charset=utf-8'}],body:Buffer.from(config+'\nwindow.CONFIGURACION_ADRIANA.imagenesBaile='+JSON.stringify(photographs)+';').toString('base64')});
  };
  await send('Fetch.enable',{patterns:[{urlPattern:'*/configuracion.js',requestStage:'Request'}]});
  for(const width of [1440,390,320]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:1050,deviceScaleFactor:1,mobile:width<700});await navigate();await evaluate('document.querySelector("#velada").scrollIntoView({behavior:"instant"});document.querySelectorAll(".timeline-photo").forEach(i=>i.loading="eager")');
   await until('document.querySelectorAll(".timeline-photo").length===6&&[...document.querySelectorAll(".timeline-photo")].every(i=>i.complete&&i.naturalWidth>0)','seis imágenes del baile');
   await evaluate('Promise.all([...document.querySelectorAll(".timeline-photo")].map(i=>i.decode()))');await pause(150);
   check('Imágenes configurables completas y sin desbordamiento a '+width+' px',await evaluate('document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll(".timeline-photo")].every(i=>getComputedStyle(i).objectFit==="contain")&&document.querySelectorAll("#timeline li.has-image").length===6&&qaErrors.length===0'));
   await shot('baile-con-imagenes-'+width);
  }
  broken=true;await navigate();await evaluate('document.querySelector("#velada").scrollIntoView({behavior:"instant"});document.querySelectorAll(".timeline-photo").forEach(i=>i.loading="eager")');
  await until('document.querySelectorAll(".timeline-photo").length===5','retirar imagen inexistente');
  check('Una imagen inexistente no deja un icono roto ni elimina el texto',await evaluate('!document.querySelectorAll("#timeline li")[3].classList.contains("has-image")&&document.querySelectorAll("#timeline li")[3].innerText.includes("Evento principal")&&qaErrors.length===0'));
  await send('Fetch.disable');await send('Browser.close');closed=true;
  const report={passed:checks.every(c=>c.passed),checks};await writeFile(path.join(root,'resultados-baile.json'),JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
 } else {
 for(const [name,width,height] of [['desktop',1440,1050],['movil',390,950]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});await navigate();
  for(const section of ['inicio','gaceta','celebracion','velada','detalles','confirmar','palabras','final']){
   await evaluate(`document.getElementById(${JSON.stringify(section)}).scrollIntoView({behavior:'instant'});`);
   await pause(350);await until('[...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&i.getAttribute("src")&&!i.hidden}).every(i=>i.complete&&i.naturalWidth>0)','imágenes '+section);
   const metric=await evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,errors:qaErrors})');
   visual.push({name,section,...metric,passed:metric.scrollWidth<=width&&metric.errors.length===0});await shot(name+'-'+section);
  }
 }
 if(process.argv.includes('--visual-only')){
  const report={passed:visual.every(v=>v.passed),visual};
  await writeFile(path.join(root,'resultados-visuales-adriana.json'),JSON.stringify(report,null,2));
  console.log('Verificación visual final: '+report.passed);
  if(!report.passed)process.exitCode=1;
  await send('Browser.close');closed=true;
 } else {
 check('Todas las secciones adaptadas a escritorio y móvil',visual.every(r=>r.passed));
 check('Contenido fijo de Adriana ignora configuraciones anteriores',await evaluate('document.title.includes("Adriana Victoria Pinzón Jaén")&&!document.body.innerText.includes("Nombre anterior")&&window.PUBLIC_MODE===true'));
 check('Sin editor ni contador en la invitación',await evaluate('!document.querySelector("[data-editor-link],.countdown,#days,#hours,#minutes,#seconds")&&!/Personalizar invitación/.test(document.body.innerText)'));
 check('Fecha, horario, lugar y colores reservados correctos',await evaluate('window.EVENTO_BASE.fechaISO==="2026-11-14T20:00:00-05:00"&&window.EVENTO_BASE.fechaFinISO==="2026-11-15T03:00:00-05:00"&&document.querySelector("#celebracion").innerText.includes("14 DE NOVIEMBRE DE 2026")&&document.querySelector(".celebration-time").textContent==="8:00 P. M. — 3:00 A. M."&&document.querySelector(".venue-address h3").textContent==="Summit Rainforest & Golf Resort"&&document.querySelector(".dress-code").textContent==="Semi-formal"&&document.querySelector("#dressNote").textContent.includes("rosado y azul")'));
 check('Seis momentos sin dibujos de línea en el orden del baile',await evaluate('document.querySelectorAll("#timeline li").length===6&&document.querySelectorAll(".timeline-drawing").length===0'));
 check('Elementos proporcionados y paleta aplicados',await evaluate('document.querySelectorAll(".bee-detail").length===3&&document.querySelectorAll(".celebration-candle").length===2&&document.querySelector(".nav-bridgerton img").naturalWidth===1099&&document.querySelectorAll("img[src=\\"assets/decoracion/logo-bridgerton.png\\"]").length===1&&getComputedStyle(document.documentElement).getPropertyValue("--rose").trim()==="#f8d7e7"&&getComputedStyle(document.documentElement).getPropertyValue("--sage").trim()==="#e3e8dc"'));
 const imageInfo=await evaluate(`(()=>{const img=document.querySelector('.evening-flower'),c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let visible=0,dark=0;for(let i=0;i<a.length;i+=4)if(a[i+3]>20){visible++;if(a[i]+a[i+1]+a[i+2]<150)dark++;}return{visible,dark};})()`);check('Flor aportada contiene dibujo visible con transparencia',imageInfo.visible>0,imageInfo);
 check('El cierre tiene texto de color oscuro legible',await evaluate('getComputedStyle(document.querySelector(".footer-name")).color==="rgb(61, 73, 62)"'));
 for(const pathname of ['editor.html','original/editor-anterior/editor.html','qa/comprobar.html','supabase/adriana.sql'])check('Archivo privado fuera del sitio: '+pathname,(await fetch('http://127.0.0.1:4173/'+pathname)).status===404);
 for(const width of [320,375,768]){await send('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:width<700});await pause(250);check('Sin desbordamiento a '+width+' px',await evaluate('document.documentElement.scrollWidth<=innerWidth'));}
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:950,deviceScaleFactor:1,mobile:true});
 await evaluate(`document.querySelector('#palabras').scrollIntoView({behavior:'instant'});window.apiCalls=[];window.originalFetch=fetch;window.fetch=async(url,options)=>{if(String(url).includes('supabase.co')){apiCalls.push({url,options});return new Response('',{status:500});}return originalFetch(url,options);};document.querySelector('#privateMessageForm').requestSubmit();`);
 check('Mensajes validan nombre y texto antes de enviar',await evaluate('!document.querySelector("#messageNameError").hidden&&!document.querySelector("#messageTextError").hidden&&apiCalls.length===0'));
 await evaluate(`document.querySelector('#messageName').value='Invitada de prueba';document.querySelector('#messageText').value='Adriana, que tengas una noche inolvidable.';document.querySelector('#privateMessageForm').requestSubmit();`);
 check('Sin Supabase no simula un guardado',await evaluate('!document.querySelector("#messageSendError").hidden&&document.querySelector("#messageSuccess").hidden&&apiCalls.length===0'));
 await evaluate(`window.CONFIGURACION_ADRIANA.supabase={url:'https://adriana-prueba.supabase.co',clavePublica:'sb_publishable_prueba'};document.querySelector('#privateMessageForm').requestSubmit();`);await until('apiCalls.length===1&&!document.querySelector("#sendMessage").disabled','error controlado');
 check('Fallo de API conserva carta y permite reintentar',await evaluate('document.querySelector("#messageSuccess").hidden&&!document.querySelector("#privateMessageForm").hidden&&document.querySelector("#messageText").value.includes("inolvidable")&&!document.querySelector("#messageSendError").hidden'));
 await evaluate(`window.fetch=async(url,options)=>{if(String(url).includes('supabase.co')){apiCalls.push({url,options});await new Promise(r=>setTimeout(r,300));return new Response(null,{status:201});}return originalFetch(url,options);};document.querySelector('#privateMessageForm').requestSubmit();document.querySelector('#privateMessageForm').requestSubmit();`);await until('!document.querySelector("#messageSuccess").hidden','carta guardada');
 check('Éxito solo tras respuesta correcta, sin envío doble',await evaluate('apiCalls.length===2&&document.querySelector("#privateMessageForm").hidden&&document.querySelector("#messageSuccess").innerText.includes("Tus palabras han sido guardadas para Adriana")'));
 check('POST privado y UUID estable en el reintento',await evaluate('apiCalls.every(c=>c.options.method==="POST"&&c.url.endsWith("/rest/v1/mensajes_adriana"))&&JSON.parse(apiCalls[0].options.body).id===JSON.parse(apiCalls[1].options.body).id&&JSON.parse(apiCalls[1].options.body).evento==="adriana-victoria-2026"&&apiCalls[1].options.headers.Prefer==="return=minimal"&&!apiCalls[1].options.headers.Authorization'));
 await shot('mensaje-guardado-movil');
 await evaluate(`window.CONFIGURACION_ADRIANA.supabase.clavePublica='sb_secret_prohibida';`);check('Clave privilegiada no se acepta en el navegador',await evaluate('!window.AdrianaServicios.available()'));
 await evaluate(`(async()=>{window.CONFIGURACION_ADRIANA.supabase.clavePublica=btoa('{}')+'.'+btoa(JSON.stringify({role:'anon'}))+'.firma';window.fetch=async(url,options)=>{apiCalls.push({url,options});return new Response(null,{status:201});};await AdrianaServicios.message('Prueba anon','Compatibilidad de clave pública',crypto.randomUUID());})()`);
 check('Clave anon antigua se transmite como Bearer',await evaluate('apiCalls.at(-1).options.headers.Authorization.startsWith("Bearer ")'));
 await evaluate(`window.CONFIGURACION_ADRIANA.supabase.clavePublica=btoa('{}')+'.'+btoa(JSON.stringify({role:'service_role'}))+'.firma';`);check('Clave service_role rechazada',await evaluate('!AdrianaServicios.available()'));
 await navigate();await evaluate('localStorage.removeItem("bridgerton.respuesta."+encodeURIComponent(window.EVENTO_BASE.nombreCompleto+"|"+window.EVENTO_BASE.fechaISO+"|"))');await navigate();
 await evaluate(`document.querySelector('#guestName').value='Invitado de prueba';document.querySelector('input[name=asiste][value=si]').checked=true;document.querySelector('#rsvpForm').requestSubmit();`);
 check('RSVP no confirma con destino pendiente',await evaluate('!document.querySelector("#submitError").hidden&&document.querySelector("#responseCard").hidden'));
 await evaluate(`window.InvitationContext.config.rsvp.whatsapp='+507';document.querySelector('#rsvpForm').requestSubmit();`);check('El prefijo +507 solo no abre WhatsApp',await evaluate('document.querySelector("#responseCard").hidden'));
 await evaluate(`window.InvitationContext.config.rsvp.whatsapp='50712345678';document.querySelector('#rsvpForm').requestSubmit();`);await until('!document.querySelector("#responseCard").hidden','preparar WhatsApp');
 check('WhatsApp prepara el evento de Adriana y mantiene estado pendiente',await evaluate('document.querySelector("#whatsappLink").href.startsWith("https://wa.me/50712345678?")&&decodeURIComponent(document.querySelector("#whatsappLink").href).includes("Adriana Victoria Pinzón Jaén")&&document.querySelector("#responseEyebrow").textContent==="TU CARTA ESTÁ PREPARADA"&&document.querySelector("#passQr").hidden'));
 await navigate();await evaluate('localStorage.removeItem("bridgerton.respuesta."+encodeURIComponent(window.EVENTO_BASE.nombreCompleto+"|"+window.EVENTO_BASE.fechaISO+"|"))');await navigate();
 await evaluate(`window.CONFIGURACION_ADRIANA.supabase={url:'https://adriana-prueba.supabase.co',clavePublica:'sb_publishable_prueba'};window.apiCalls=[];window.fetch=async(url,options)=>{apiCalls.push({url,options});return new Response(null,{status:201});};document.querySelector('#guestName').value='Invitada confirmada';document.querySelector('input[name=asiste][value=si]').checked=true;document.querySelector('#rsvpForm').requestSubmit();`);await until('document.querySelector("#responseEyebrow").textContent==="RESPUESTA GUARDADA"','asistencia guardada');
 check('Asistencia se guarda en tabla privada y muestra sello Accepted',await evaluate('apiCalls.length===1&&apiCalls[0].url.endsWith("/confirmaciones_adriana")&&JSON.parse(apiCalls[0].options.body).asiste==="si"&&!document.querySelector("#acceptedSeal").hidden&&document.querySelector("#acceptedSeal").classList.contains("is-stamped")'));
 await shot('asistencia-guardada-movil');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await navigate();await until('document.querySelector("#arrivalDialog").open','entrada palacio');await pause(1000);await shot('entrada-palacio-movil');
 await until('document.querySelector("#arrivalDialog").dataset.stage==="carta"','carta desplegada');await until('(getComputedStyle(document.querySelector(".arrival-script")).clipPath.match(/[-+]?\\d*\\.?\\d+/g)||[]).every(v=>Number(v)===0)','saludo escrito');
 const greeting=await evaluate('(()=>{const el=document.querySelector(".arrival-script"),r=document.createRange();r.selectNodeContents(el);return r.getBoundingClientRect().width<=el.clientWidth;})()');check('Entrada preserva saludo completo en móvil',greeting);await shot('entrada-carta-movil');
 await until('!document.querySelector("#arrivalDialog").open','entrada termina');
 await evaluate('document.querySelector("#replayArrival").click()');await until('document.querySelector("#arrivalDialog").open','repetir');await evaluate('document.querySelector("#skipArrival").click()');check('Omitir entrada libera la página',await evaluate('!document.querySelector("#arrivalDialog").open&&!document.body.classList.contains("arrival-running")'));
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});await evaluate('document.querySelector("#inicio").scrollIntoView({behavior:"instant"})');
 check('Carrusel mantiene cinco imágenes diferentes',await evaluate('document.querySelectorAll(".hero-slide img").length===5&&new Set([...document.querySelectorAll(".hero-slide img")].map(i=>i.src)).size===5'));
 const before=await evaluate('document.querySelector("#heroSlides").dataset.index');await until(`document.querySelector('#heroSlides').dataset.index!==${JSON.stringify(before)}`,'avance automático');check('Carrusel avanza automáticamente',true);await pause(800);await shot('portada-animada-desktop');
 check('Sin errores de JavaScript tras los envíos y animaciones',await evaluate('qaErrors.length===0'),await evaluate('qaErrors'));
 const report={passed:checks.every(c=>c.passed)&&visual.every(v=>v.passed),checks,visual};await writeFile(path.join(root,'resultados-adriana.json'),JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
 await send('Browser.close');closed=true;
 }
 }
}finally{socket?.close();if(!closed)chrome.kill();}
