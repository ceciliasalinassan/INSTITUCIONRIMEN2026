
'use strict';

const DATA_KEY = 'cdrm_final_data_v5_funcional';
const CFG_KEY = 'cdrm_supabase_cfg_v1';
const BUCKET = 'club-assets';
const ADMIN_PASS = 'ADMINRIMEN1932';

const SERIES = [
  "SERIE PEQUES","SERIE SEGUNDA INFANTIL","SERIE PRIMERA INFANTIL","SERIE JUVENILES",
  "SERIE ORO","SERIE SUPER SENIOR","SERIE SENIOR","SERIE SEGUNDA ADULTOS",
  "SERIE PRIMERA ADULTOS","SERIE PLATINOS","SERIE HONOR"
];

const DEFAULT_DATA = {
  settings:{
    clubName:'CLUB DEPORTIVO RICARDO MÉNDEZ',
    subtitle:'Portal oficial · San Carlos',
    founded:'12/08/1932',
    anniversary:'12/08',
    homeTitle:'RICARDO MÉNDEZ',
    homeTagline:'Más que un club, una familia.',
    homeText:'Sitio oficial del Club Deportivo Ricardo Méndez de San Carlos.',
    championships:'0',
    activeMembers:'0',
    series:'11'
  },
  siteConfig:{
    whatsapp:'56994413797',
    instagram:'https://www.instagram.com/cd_ricardomendez_sancarlos',
    facebook:'https://www.facebook.com/RICARDOMENDEZSANCARLOS',
    blue:'#00c8ff',
    gold:'#f7d36b'
  },
  appearance:{
    backgroundImage:'',
    blue:'#00c8ff',
    gold:'#f7d36b',
    overlay:35
  },
  nextMatch:{rival:'Por definir',logo:'',date:'',place:'',tournament:'',referee:'',broadcast:''},
  history:{text:'Club Deportivo Ricardo Méndez, institución deportiva de San Carlos fundada el 12 de agosto de 1932. Más que un club, una familia.',currentPresident:''},
  directors:[],
  presidents:[],
  results:[],
  news:[],
  gallery:[],
  fixture_images:[],
  standings:{},
  sponsors:[],
  member_requests:[]
};

let supabaseClient = null;
const $ = id => document.getElementById(id);

function clone(x){ return JSON.parse(JSON.stringify(x)); }
function merge(a,b){
  if(Array.isArray(a)) return Array.isArray(b) ? b : a;
  if(a && typeof a === 'object' && b && typeof b === 'object'){
    const out = {...a};
    for(const k of Object.keys(b)) out[k] = merge(a[k], b[k]);
    return out;
  }
  return b ?? a;
}
function getData(){
  try{ return merge(DEFAULT_DATA, JSON.parse(localStorage.getItem(DATA_KEY) || '{}')); }
  catch(e){ return clone(DEFAULT_DATA); }
}
function saveData(d){ localStorage.setItem(DATA_KEY, JSON.stringify(merge(DEFAULT_DATA,d))); }

function normUrl(u){
  u=String(u||'').trim();
  if(u && !u.startsWith('http') && !u.includes('.supabase.co')) u='https://'+u+'.supabase.co';
  return u.replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'');
}
function getCfg(){ try{return JSON.parse(localStorage.getItem(CFG_KEY)||'{}')}catch(e){return {}} }
function setCfg(url,key){ localStorage.setItem(CFG_KEY, JSON.stringify({url:normUrl(url), key:String(key||'').trim()})); }
function initSB(){
  const cfg=getCfg();
  if(!window.supabase || !cfg.url || !cfg.key) return false;
  supabaseClient = window.supabase.createClient(normUrl(cfg.url), cfg.key);
  return true;
}

function status(msg){ if($('statusLine')) $('statusLine').textContent = msg; }
function toast(msg,type='success'){
  let box=$('adminConfirmToast');
  if(!box){
    box=document.createElement('div');
    box.id='adminConfirmToast';
    box.className='admin-confirm-toast';
    document.body.appendChild(box);
  }
  box.className='admin-confirm-toast show '+type;
  box.innerHTML=`<strong>${type==='error'?'⚠️ Error':'✅ Listo'}</strong><span>${msg}</span>`;
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>box.classList.remove('show'),3500);
}
function setInline(msg,type='success'){
  if(!location.pathname.includes('admin')) return;
  let el=$('adminInlineConfirm');
  if(!el){
    el=document.createElement('div');
    el.id='adminInlineConfirm';
    el.className='admin-inline-confirm';
    (document.querySelector('#adminPanel')||document.body).prepend(el);
  }
  el.className='admin-inline-confirm '+type;
  el.textContent=(type==='error'?'⚠️ ':'✅ ')+msg;
}
function confirmOk(msg){ toast(msg,'success'); setInline(msg,'success'); }
function confirmError(msg){ toast(msg,'error'); setInline(msg,'error'); }

/* Archivos originales a Storage */
function safeFileName(file){
  const original = file?.name || 'archivo.jpg';
  const ext = (original.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
  const base = original.replace(/\.[^.]+$/,'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9_-]+/g,'_')
    .replace(/^_+|_+$/g,'')
    .slice(0,90) || 'archivo';
  return `${Date.now()}_${Math.random().toString(36).slice(2,9)}_${base}.${ext}`;
}
function folderName(folder){
  const map = {news:'news',gallery:'gallery',fixture:'fixture',fixtures:'fixture',media:'media',photos:'gallery',presidents:'presidents',sponsors:'sponsors',logos:'logos',backgrounds:'backgrounds',files:'files'};
  return map[folder] || folder || 'media';
}
async function uploadFile(file, folder='media'){
  if(!file) return '';
  if(!initSB()) throw new Error('Primero conecta Supabase.');
  const path = `${folderName(folder)}/${safeFileName(file)}`;
  const {error} = await supabaseClient.storage.from(BUCKET).upload(path, file, {
    cacheControl:'3600',
    upsert:false,
    contentType:file.type || 'application/octet-stream'
  });
  if(error){
    console.error(error);
    throw new Error('No se pudo subir el archivo a club-assets. Revisa políticas de Storage.');
  }
  const {data} = supabaseClient.storage.from(BUCKET).getPublicUrl(path);
  if(!data || !data.publicUrl) throw new Error('No se pudo obtener URL pública.');
  confirmOk('Archivo cargado correctamente.');
  return data.publicUrl;
}
async function fileToData(file){ return uploadFile(file,'media'); }

/* Supabase */
async function replaceTable(name,rows){
  if(name==='settings'){
    if(rows.length){
      const {error}=await supabaseClient.from('settings').upsert(rows,{onConflict:'key'});
      if(error) throw error;
    }
    return;
  }
  await supabaseClient.from(name).delete().neq('id','00000000-0000-0000-0000-000000000000');
  if(rows.length){
    const {error}=await supabaseClient.from(name).insert(rows);
    if(error) throw error;
  }
}
async function pushCloud(d){
  if(!initSB()) throw new Error('Supabase no conectado');
  d=merge(DEFAULT_DATA,d);
  await replaceTable('settings',[
    {key:'settings',value:JSON.stringify(d.settings)},
    {key:'siteConfig',value:JSON.stringify(d.siteConfig)},
    {key:'appearance',value:JSON.stringify(d.appearance)},
    {key:'nextMatch',value:JSON.stringify(d.nextMatch)},
    {key:'history',value:JSON.stringify(d.history)}
  ]);
  await replaceTable('directors',(d.directors||[]).map((x,i)=>({role:x.role||'',name:x.name||'',sort_order:i})));
  await replaceTable('sponsors',(d.sponsors||[]).map((x,i)=>({name:x.name||'',url:x.url||'',sort_order:i})));
  await replaceTable('fixture_images',(d.fixture_images||[]).map((x,i)=>({title:x.title||'',image:x.image||'',sort_order:i})));
  await replaceTable('results',(d.results||[]).map((x,i)=>({date_text:x.date||'',match:x.match||'',score:x.score||'',scorers:x.scorers||'',sort_order:i})));
  await replaceTable('news',(d.news||[]).map((x,i)=>({title:x.title||'',text:x.text||'',date_text:x.date||'',image:x.image||'',sort_order:i})));
  await replaceTable('gallery',(d.gallery||[]).map((x,i)=>({title:x.title||'',type:x.type||'image',url:x.url||'',sort_order:i})));
  await replaceTable('presidents',(d.presidents||[]).map((x,i)=>({name:x.name||'',period:x.period||'',image:x.image||'',sort_order:i})));
  const standings=[];
  Object.entries(d.standings||{}).forEach(([serie,rows])=>(rows||[]).forEach((x,i)=>standings.push({
    serie,team:x.team||'',pj:+x.pj||0,pg:+x.pg||0,pe:+x.pe||0,pp:+x.pp||0,gf:+x.gf||0,gc:+x.gc||0,dg:+x.dg||0,pts:+x.pts||0,sort_order:i
  })));
  await replaceTable('standings',standings);
}
async function pullCloud(){
  if(!initSB()) throw new Error('Supabase no conectado');
  const d=clone(DEFAULT_DATA);
  let res=await supabaseClient.from('settings').select('*');
  if(!res.error && res.data){
    res.data.forEach(r=>{ try{ d[r.key]=JSON.parse(r.value); }catch(e){} });
  }
  res=await supabaseClient.from('directors').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data) d.directors=res.data.map(x=>({role:x.role,name:x.name}));
  res=await supabaseClient.from('sponsors').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data) d.sponsors=res.data.map(x=>({name:x.name,url:x.url}));
  res=await supabaseClient.from('fixture_images').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data) d.fixture_images=res.data.map(x=>({title:x.title,image:x.image}));
  res=await supabaseClient.from('results').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data) d.results=res.data.map(x=>({date:x.date_text,match:x.match,score:x.score,scorers:x.scorers}));
  res=await supabaseClient.from('news').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data) d.news=res.data.map(x=>({title:x.title,text:x.text,date:x.date_text,image:x.image}));
  res=await supabaseClient.from('gallery').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data) d.gallery=res.data.map(x=>({title:x.title,type:x.type,url:x.url}));
  res=await supabaseClient.from('presidents').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data) d.presidents=res.data.map(x=>({name:x.name,period:x.period,image:x.image}));
  res=await supabaseClient.from('standings').select('*').order('sort_order',{ascending:true});
  if(!res.error && res.data){
    d.standings={};
    res.data.forEach(x=>{
      if(!d.standings[x.serie]) d.standings[x.serie]=[];
      d.standings[x.serie].push({team:x.team,pj:x.pj,pg:x.pg,pe:x.pe,pp:x.pp,gf:x.gf,gc:x.gc,dg:x.dg,pts:x.pts});
    });
  }
  saveData(d);
  return d;
}
async function saveAll(d){
  saveData(d);
  try{
    await pushCloud(d);
    status('Estado: guardado en Supabase.');
    confirmOk('Información guardada correctamente.');
  }catch(e){
    console.warn(e);
    status('Estado: guardado local. '+e.message);
    confirmError('Guardado local. Revisa Supabase.');
  }
  renderAll();
}

/* Apariencia */
function applyAppearance(d){
  d=d||getData();
  const app=d.appearance||{};
  const bg=app.backgroundImage||'';
  const blue=app.blue||d.siteConfig?.blue||'#00c8ff';
  const gold=app.gold||d.siteConfig?.gold||'#f7d36b';
  const overlay=Number(app.overlay ?? 35);
  document.documentElement.style.setProperty('--blue',blue);
  document.documentElement.style.setProperty('--gold',gold);
  document.documentElement.style.setProperty('--gold-soft',gold);
  document.documentElement.style.setProperty('--bg-overlay',overlay/100);
  if(bg){
    document.documentElement.style.setProperty('--custom-bg-image',`url("${bg}")`);
    document.body.classList.add('custom-background-active');
  }else{
    document.documentElement.style.removeProperty('--custom-bg-image');
    document.body.classList.remove('custom-background-active');
  }
}

/* Render público */
function imgTag(url,alt,cls=''){return url?`<img class="${cls}" src="${url}" alt="${alt||''}" loading="lazy">`:''}
function renderSponsorTicker(d){
  const el=$('sponsorTicker'); if(!el) return;
  const list=d.sponsors||[];
  if(!list.length){el.innerHTML='<div class="ticker-empty">CARGA TUS AUSPICIADORES DESDE ADMIN</div>';return;}
  el.innerHTML=[...list,...list].map(s=>`<div class="ticker-sponsor"><div class="ticker-logo-box">${imgTag(s.url,s.name,'ticker-sponsor-img')}</div><span>${s.name||''}</span></div>`).join('');
}
function renderSponsors(d){
  const el=$('sponsorsGrid'); if(!el) return;
  const list=d.sponsors||[];
  el.innerHTML=list.length?list.map(s=>`<article class="sponsor-card"><div class="sponsor-logo-box">${imgTag(s.url,s.name,'sponsor-img')||'<div class="sponsor-fallback">'+(s.name||'Auspiciador')+'</div>'}</div><h3>${s.name||''}</h3></article>`).join(''):'<div class="empty-state">Aún no hay auspiciadores cargados.</div>';
}
function renderPublic(){
  const d=getData();
  applyAppearance(d);
  if($('homeIntro')) $('homeIntro').textContent=d.settings.homeText||'';
  if($('metrics')) $('metrics').innerHTML=`<div class="metric"><span>Socios</span><b>${d.settings.activeMembers||0}</b></div><div class="metric"><span>Series</span><b>${d.settings.series||0}</b></div><div class="metric"><span>Campeonatos</span><b>${d.settings.championships||0}</b></div><div class="metric"><span>Fundado</span><b>1932</b></div>`;
  if($('nextMatchCard')){
    const n=d.nextMatch||{};
    $('nextMatchCard').innerHTML=`<h3 class="featured-title">★ Próximo partido</h3><div class="match-pro-logos"><div class="match-team local-team"><img class="match-logo-img" src="logo_ricardo_mendez.png"><span>Ricardo Méndez</span></div><strong>VS</strong><div class="match-team rival-team">${imgTag(n.logo,n.rival,'match-logo-img')||'<div class="sponsor-fallback">RIVAL</div>'}<span>${n.rival||'Por definir'}</span></div></div><div class="match-info"><h3 class="match-title">Ricardo Méndez vs ${n.rival||'Por definir'}</h3><p>${n.tournament||''}</p><p>${n.date||''}</p><b>${n.place||''}</b></div>`;
  }
  renderSponsorTicker(d); renderSponsors(d);
  if($('newsGrid')) $('newsGrid').innerHTML=(d.news||[]).map(n=>`<article class="news-card">${imgTag(n.image,n.title)}<h3>${n.title||''}</h3><p>${n.text||''}</p></article>`).join('')||'<div class="empty-state">Aún no hay noticias cargadas.</div>';
  if($('galleryGrid')) $('galleryGrid').innerHTML=(d.gallery||[]).map(m=>`<article class="media-card">${m.type==='video'?`<video controls src="${m.url}"></video>`:imgTag(m.url,m.title)}<h3>${m.title||''}</h3></article>`).join('')||'<div class="empty-state">Aún no hay fotos o videos cargados.</div>';
  if($('fixtureGrid')) $('fixtureGrid').innerHTML=(d.fixture_images||[]).map(f=>`<article class="fixture-card">${imgTag(f.image,f.title)}<h3>${f.title||''}</h3></article>`).join('')||'<div class="empty-state">Aún no hay fixture cargado.</div>';
  if($('presidentsGrid')) $('presidentsGrid').innerHTML=(d.presidents||[]).map(p=>`<article class="president-card">${imgTag(p.image,p.name)}<h3>${p.name||''}</h3><p>${p.period||''}</p></article>`).join('')||'<div class="empty-state">Aún no hay presidentes cargados.</div>';
  if($('resultsGrid')) $('resultsGrid').innerHTML=(d.results||[]).map(r=>`<article class="result-card"><h3>${r.match||''}</h3><b>${r.score||''}</b><p>${r.date||''}</p></article>`).join('')||'<div class="empty-state">Aún no hay resultados cargados.</div>';
  if($('historyBox')) $('historyBox').innerHTML=`<h2>Historia</h2><p>${d.history.text||''}</p>`;
  if($('serieSelect')){
    if(!$('serieSelect').dataset.loaded){$('serieSelect').innerHTML=SERIES.map(s=>`<option>${s}</option>`).join('');$('serieSelect').dataset.loaded='1';$('serieSelect').onchange=renderStandings;}
    renderStandings();
  }
}
function renderStandings(){
  const d=getData(), tbody=$('standingsRows'); if(!tbody)return;
  const serie=$('serieSelect')?.value||SERIES[0];
  const rows=(d.standings&&d.standings[serie])||[];
  tbody.innerHTML=rows.map((x,i)=>`<tr><td>${i+1}</td><td>${x.team||''}</td><td>${x.pj||0}</td><td>${x.pg||0}</td><td>${x.pe||0}</td><td>${x.pp||0}</td><td>${x.gf||0}</td><td>${x.gc||0}</td><td>${x.dg||0}</td><td>${x.pts||0}</td></tr>`).join('');
}
function renderAll(){renderPublic();}

/* Admin */
function openAdmin(){
  $('loginPanel')?.classList.add('hidden');
  $('adminPanel')?.classList.remove('hidden');
  try{sessionStorage.setItem('cdrm_admin_ok','1')}catch(e){}
  fillAdmin();
}
function listHTML(arr,label){return (arr||[]).map((x,i)=>`<div class="list-item"><span>${label(x)}</span><button data-del="${i}" type="button">Eliminar</button></div>`).join('')}
function bindDelete(listId,arrName){
  const el=$(listId); if(!el)return;
  el.querySelectorAll('[data-del]').forEach(btn=>btn.onclick=async()=>{const d=getData();d[arrName].splice(+btn.dataset.del,1);await saveAll(d);fillAdmin();});
}
function renderAdminLists(){
  const d=getData();
  if($('directorsList')) $('directorsList').innerHTML=listHTML(d.directors,x=>`${x.role||''}: ${x.name||''}`);
  if($('presidentsList')) $('presidentsList').innerHTML=listHTML(d.presidents,x=>`${x.name||''} ${x.period||''}`);
  if($('resultsList')) $('resultsList').innerHTML=listHTML(d.results,x=>`${x.match||''} ${x.score||''}`);
  if($('newsList')) $('newsList').innerHTML=listHTML(d.news,x=>x.title||'Noticia');
  if($('galleryList')) $('galleryList').innerHTML=listHTML(d.gallery,x=>x.title||'Galería');
  if($('fixtureList')) $('fixtureList').innerHTML=listHTML(d.fixture_images,x=>x.title||'Fixture');
  if($('sponsorsList')) $('sponsorsList').innerHTML=listHTML(d.sponsors,x=>x.name||'Auspiciador');
  if($('standingsList')) $('standingsList').innerHTML=Object.entries(d.standings||{}).map(([s,rows])=>`<h4>${s}</h4>`+listHTML(rows,x=>`${x.team||''} - ${x.pts||0} pts`)).join('');
  bindDelete('directorsList','directors'); bindDelete('presidentsList','presidents'); bindDelete('resultsList','results'); bindDelete('newsList','news'); bindDelete('galleryList','gallery'); bindDelete('fixtureList','fixture_images'); bindDelete('sponsorsList','sponsors');
}
function fillAppearanceAdmin(){
  const d=getData(), app=d.appearance||{};
  if($('backgroundUrl')) $('backgroundUrl').value=app.backgroundImage||'';
  if($('appearanceBlue')) $('appearanceBlue').value=app.blue||d.siteConfig.blue||'#00c8ff';
  if($('appearanceGold')) $('appearanceGold').value=app.gold||d.siteConfig.gold||'#f7d36b';
  if($('backgroundOverlay')) $('backgroundOverlay').value=app.overlay??35;
  if($('backgroundOverlayValue')) $('backgroundOverlayValue').textContent=(app.overlay??35)+'%';
  if($('backgroundPreview')) $('backgroundPreview').style.backgroundImage=app.backgroundImage?`url("${app.backgroundImage}")`:'url("estadio_real_publico.jpg")';
}
function fillAdmin(){
  const d=getData(), cfg=getCfg();
  if($('supabaseUrl')) $('supabaseUrl').value=cfg.url||'';
  if($('supabaseKey')) $('supabaseKey').value=cfg.key||'';
  if($('homeTitle')) $('homeTitle').value=d.settings.homeTitle||'';
  if($('homeIntroInput')) $('homeIntroInput').value=d.settings.homeText||'';
  if($('metricMembers')) $('metricMembers').value=d.settings.activeMembers||'';
  if($('metricTitles')) $('metricTitles').value=d.settings.championships||'';
  if($('siteWhatsapp')) $('siteWhatsapp').value=d.siteConfig.whatsapp||'';
  if($('siteInstagram')) $('siteInstagram').value=d.siteConfig.instagram||'';
  if($('siteFacebook')) $('siteFacebook').value=d.siteConfig.facebook||'';
  if($('siteColorBlue')) $('siteColorBlue').value=d.siteConfig.blue||'';
  if($('siteColorGold')) $('siteColorGold').value=d.siteConfig.gold||'';
  if($('matchRival')) $('matchRival').value=d.nextMatch.rival||'';
  if($('matchTournament')) $('matchTournament').value=d.nextMatch.tournament||'';
  if($('matchReferee')) $('matchReferee').value=d.nextMatch.referee||'';
  if($('matchBroadcast')) $('matchBroadcast').value=d.nextMatch.broadcast||'';
  if($('matchDate')) $('matchDate').value=d.nextMatch.date||'';
  if($('matchPlace')) $('matchPlace').value=d.nextMatch.place||'';
  if($('matchLogoUrl')) $('matchLogoUrl').value=d.nextMatch.logo||'';
  if($('historyText')) $('historyText').value=d.history.text||'';
  if($('presidentName')) $('presidentName').value=d.history.currentPresident||'';
  fillAppearanceAdmin(); renderAdminLists();
}
function bindTabs(){
  document.querySelectorAll('.tabs button').forEach(btn=>{
    if(btn.dataset.tabBound)return; btn.dataset.tabBound='1';
    btn.onclick=()=>{document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.tab-content').forEach(t=>t.classList.add('hidden'));$(btn.dataset.tab)?.classList.remove('hidden');};
  });
}
function bindAdmin(){
  if($('loginBtn')&&!$('loginBtn').dataset.bound){$('loginBtn').dataset.bound='1';$('loginBtn').onclick=()=>{(($('adminPassword')?.value||'').trim()===ADMIN_PASS)?openAdmin():confirmError('Clave incorrecta');};}
  $('adminPassword')?.addEventListener('keydown',e=>{if(e.key==='Enter')$('loginBtn')?.click();});
  try{if(sessionStorage.getItem('cdrm_admin_ok')==='1')openAdmin();}catch(e){}
  bindTabs();

  $('saveSupabase')?.addEventListener('click',()=>{setCfg($('supabaseUrl')?.value,$('supabaseKey')?.value);confirmOk('Conexión Supabase guardada.');});
  $('loadCloud')?.addEventListener('click',async()=>{try{await pullCloud();confirmOk('Datos cargados desde Supabase.');renderAll();fillAdmin();}catch(e){confirmError(e.message);}});
  $('saveCloud')?.addEventListener('click',async()=>{try{await pushCloud(getData());confirmOk('Datos subidos a Supabase.');}catch(e){confirmError(e.message);}});
  $('saveGeneral')?.addEventListener('click',async()=>{const d=getData();d.settings.homeTitle=$('homeTitle')?.value||d.settings.homeTitle;d.settings.homeText=$('homeIntroInput')?.value||'';d.settings.activeMembers=$('metricMembers')?.value||'0';d.settings.championships=$('metricTitles')?.value||'0';d.siteConfig.whatsapp=$('siteWhatsapp')?.value||'';d.siteConfig.instagram=$('siteInstagram')?.value||'';d.siteConfig.facebook=$('siteFacebook')?.value||'';d.siteConfig.blue=$('siteColorBlue')?.value||'#00c8ff';d.siteConfig.gold=$('siteColorGold')?.value||'#f7d36b';await saveAll(d);fillAdmin();});
  $('saveMatch')?.addEventListener('click',async()=>{try{const d=getData();let logo=$('matchLogoUrl')?.value||'';const f=$('matchLogoFile')?.files?.[0];if(f)logo=await uploadFile(f,'logos');d.nextMatch={rival:$('matchRival')?.value||'Por definir',tournament:$('matchTournament')?.value||'',referee:$('matchReferee')?.value||'',broadcast:$('matchBroadcast')?.value||'',date:$('matchDate')?.value||'',place:$('matchPlace')?.value||'',logo};await saveAll(d);fillAdmin();}catch(e){confirmError(e.message);}});
  $('saveHistory')?.addEventListener('click',async()=>{const d=getData();d.history.text=$('historyText')?.value||'';d.history.currentPresident=$('presidentName')?.value||'';await saveAll(d);fillAdmin();});
  $('addDirector')?.addEventListener('click',async()=>{const d=getData();d.directors.push({role:$('directorRole')?.value||'',name:$('directorName')?.value||''});await saveAll(d);fillAdmin();});
  $('addPresident')?.addEventListener('click',async()=>{try{const d=getData();let image='';const f=$('presidentPhoto')?.files?.[0];if(f)image=await uploadFile(f,'presidents');d.presidents.unshift({name:$('presidentGalleryName')?.value||'',period:$('presidentPeriod')?.value||'',image});await saveAll(d);fillAdmin();}catch(e){confirmError(e.message);}});
  $('addResult')?.addEventListener('click',async()=>{const d=getData();d.results.unshift({date:$('resultDate')?.value||'',match:$('resultMatch')?.value||'',score:$('resultScore')?.value||''});await saveAll(d);fillAdmin();});
  $('addNews')?.addEventListener('click',async()=>{try{const d=getData();let image='';const f=$('newsImage')?.files?.[0];if(f)image=await uploadFile(f,'news');d.news.unshift({title:$('newsTitle')?.value||'',text:$('newsText')?.value||'',date:new Date().toLocaleDateString('es-CL'),image});await saveAll(d);fillAdmin();}catch(e){confirmError(e.message);}});
  $('addMedia')?.addEventListener('click',async()=>{try{const d=getData();let url=$('mediaUrl')?.value||'';const f=$('mediaFile')?.files?.[0];let type='image';if(f){url=await uploadFile(f,'gallery');type=f.type&&f.type.startsWith('video')?'video':'image';}d.gallery.unshift({title:$('mediaTitle')?.value||'',type,url});await saveAll(d);fillAdmin();}catch(e){confirmError(e.message);}});
  $('addFixture')?.addEventListener('click',async()=>{try{const d=getData();let image='';const f=$('fixtureImage')?.files?.[0];if(f)image=await uploadFile(f,'fixture');d.fixture_images.unshift({title:$('fixtureTitle')?.value||'',image});await saveAll(d);fillAdmin();}catch(e){confirmError(e.message);}});
  $('addStanding')?.addEventListener('click',async()=>{const d=getData();const serie=$('standingSerie')?.value||SERIES[0];if(!d.standings[serie])d.standings[serie]=[];const gf=+$('gf')?.value||0,gc=+$('gc')?.value||0;d.standings[serie].push({team:$('teamName')?.value||'',pj:+$('pj')?.value||0,pg:+$('pg')?.value||0,pe:+$('pe')?.value||0,pp:+$('pp')?.value||0,gf,gc,dg:gf-gc,pts:+$('pts')?.value||0});await saveAll(d);fillAdmin();});
  $('addSponsor')?.addEventListener('click',async()=>{try{const d=getData();let url=$('sponsorUrl')?.value||'';const f=($('sponsorFile')||$('sponsorLogo'))?.files?.[0];if(f)url=await uploadFile(f,'sponsors');d.sponsors.push({name:$('sponsorName')?.value||'',url});await saveAll(d);fillAdmin();}catch(e){confirmError(e.message);}});
  $('saveBackground')?.addEventListener('click',async()=>{try{const d=getData();let url=$('backgroundUrl')?.value||'';const f=$('backgroundFile')?.files?.[0];if(f)url=await uploadFile(f,'backgrounds');d.appearance.backgroundImage=url;await saveAll(d);fillAdmin();}catch(e){confirmError(e.message);}});
  $('restoreBackground')?.addEventListener('click',async()=>{const d=getData();d.appearance.backgroundImage='';await saveAll(d);fillAdmin();});
  $('saveAppearanceColors')?.addEventListener('click',async()=>{const d=getData();d.appearance.blue=$('appearanceBlue')?.value||'#00c8ff';d.appearance.gold=$('appearanceGold')?.value||'#f7d36b';d.appearance.overlay=$('backgroundOverlay')?.value||35;d.siteConfig.blue=d.appearance.blue;d.siteConfig.gold=d.appearance.gold;await saveAll(d);fillAdmin();});
  $('backgroundOverlay')?.addEventListener('input',()=>{if($('backgroundOverlayValue'))$('backgroundOverlayValue').textContent=$('backgroundOverlay').value+'%';});
  document.querySelectorAll('.themePreset').forEach(btn=>{if(btn.dataset.themeBound)return;btn.dataset.themeBound='1';btn.onclick=async()=>{const d=getData();d.appearance=d.appearance||{};if(btn.dataset.theme==='nike'){d.appearance.blue='#0077ff';d.appearance.gold='#ffffff';d.appearance.overlay=42;}else if(btn.dataset.theme==='adidas'){d.appearance.blue='#00c8ff';d.appearance.gold='#f7d36b';d.appearance.overlay=38;}else{d.appearance.blue='#00bfff';d.appearance.gold='#f3c84b';d.appearance.overlay=35;}await saveAll(d);fillAdmin();};});
}

/* Form socios */
function bindSocioForm(){
  const form=$('socioForm'); if(!form||form.dataset.bound)return; form.dataset.bound='1';
  form.onsubmit=async e=>{e.preventDefault();const d=getData();d.member_requests.push({nombre:$('socioNombre')?.value||'',rut:$('socioRut')?.value||'',telefono:$('socioTelefono')?.value||'',correo:$('socioCorreo')?.value||'',serie:$('socioSerie')?.value||'',fecha:new Date().toISOString()});await saveAll(d);alert('Solicitud enviada correctamente.');form.reset();};
}

/* Lightbox */
function bindLightbox(){
  document.querySelectorAll('#newsGrid img,#galleryGrid img,#fixtureGrid img,#presidentsGrid img').forEach(img=>{
    if(img.dataset.lb)return; img.dataset.lb='1'; img.style.cursor='pointer';
    img.onclick=()=>{const div=document.createElement('div');div.className='image-lightbox-final show';div.innerHTML=`<button class="lightbox-final-close">×</button><img src="${img.src}">`;document.body.appendChild(div);div.onclick=e=>{if(e.target===div||e.target.className==='lightbox-final-close')div.remove();};};
  });
}

/* RM IA */
function bindRmIa(){
  const toggle=$('rmIaToggle'),panel=$('rmIaPanel'),form=$('rmIaForm'),input=$('rmIaInput'); if(!toggle||!panel||!form||toggle.dataset.bound)return; toggle.dataset.bound='1';
  toggle.onclick=()=>panel.classList.toggle('show'); $('rmIaClose')?.addEventListener('click',()=>panel.classList.remove('show'));
  const add=(t,w='bot')=>{const box=$('rmIaMessages');if(!box)return;const m=document.createElement('div');m.className='rm-ia-msg '+w;m.textContent=t;box.appendChild(m);box.scrollTop=box.scrollHeight;};
  const answer=q=>{const d=getData();q=q.toLowerCase();if(q.includes('partido')||q.includes('juega'))return d.nextMatch.rival&&d.nextMatch.rival!=='Por definir'?`Próximo partido: Ricardo Méndez vs ${d.nextMatch.rival}. ${d.nextMatch.date||''} ${d.nextMatch.place||''}`:'Aún no hay próximo partido cargado.';if(q.includes('noticia'))return(d.news||[]).length?`Hay ${d.news.length} noticia(s) cargada(s).`:'Aún no hay noticias cargadas.';if(q.includes('auspiciador'))return(d.sponsors||[]).length?`Hay ${d.sponsors.length} auspiciador(es).`:'Aún no hay auspiciadores cargados.';if(q.includes('socio'))return'Puedes hacerte socio usando el formulario o el botón Hazte socio.';if(q.includes('historia'))return d.history.text;return'Puedo responder sobre partido, noticias, socios, historia, fixture, resultados, tablas y auspiciadores.';};
  form.onsubmit=e=>{e.preventDefault();const q=input.value.trim();if(!q)return;input.value='';add(q,'user');setTimeout(()=>add(answer(q),'bot'),200);};
  document.querySelectorAll('.rm-ia-quick button').forEach(b=>b.onclick=()=>{const q=b.dataset.q||b.textContent;add(q,'user');setTimeout(()=>add(answer(q),'bot'),200);});
}

/* Acceso Admin */
(function(){
  function goAdmin(){location.href=location.origin+'/admin.html';}
  let typed='';
  document.addEventListener('keydown',e=>{const key=(e.key||'').toLowerCase();const tag=(e.target?.tagName||'').toLowerCase();const typing=['input','textarea','select'].includes(tag);if(key==='a'&&((e.ctrlKey&&e.altKey)||(e.ctrlKey&&e.shiftKey))){e.preventDefault();goAdmin();}if(!typing&&key.length===1){typed=(typed+key).slice(-10);if(typed.includes('admin'))goAdmin();}},true);
})();

document.addEventListener('DOMContentLoaded',()=>{
  renderAll();
  bindAdmin();
  bindSocioForm();
  bindRmIa();
  setTimeout(bindLightbox,300);
  setInterval(bindLightbox,1200);
});


/* =========================================================
   FIX DEFINITIVO BOTONES ADMIN
   Delegación global: todos los botones del Admin funcionan aunque el HTML cambie.
========================================================= */
async function adminActionById(id){
  const d = getData();

  try{
    if(id === 'saveSupabase'){
      setCfg(document.getElementById('supabaseUrl')?.value, document.getElementById('supabaseKey')?.value);
      confirmOk('Conexión Supabase guardada.');
      return;
    }

    if(id === 'loadCloud'){
      await pullCloud();
      confirmOk('Datos cargados desde Supabase.');
      renderAll();
      fillAdmin();
      return;
    }

    if(id === 'saveCloud'){
      await pushCloud(getData());
      confirmOk('Datos subidos a Supabase.');
      return;
    }

    if(id === 'saveGeneral'){
      d.settings.homeTitle = document.getElementById('homeTitle')?.value || d.settings.homeTitle;
      d.settings.homeText = document.getElementById('homeIntroInput')?.value || '';
      d.settings.activeMembers = document.getElementById('metricMembers')?.value || '0';
      d.settings.championships = document.getElementById('metricTitles')?.value || '0';
      d.siteConfig.whatsapp = document.getElementById('siteWhatsapp')?.value || '';
      d.siteConfig.instagram = document.getElementById('siteInstagram')?.value || '';
      d.siteConfig.facebook = document.getElementById('siteFacebook')?.value || '';
      d.siteConfig.blue = document.getElementById('siteColorBlue')?.value || '#00c8ff';
      d.siteConfig.gold = document.getElementById('siteColorGold')?.value || '#f7d36b';
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'saveMatch'){
      let logo = document.getElementById('matchLogoUrl')?.value || '';
      const f = document.getElementById('matchLogoFile')?.files?.[0];
      if(f) logo = await uploadFile(f, 'logos');
      d.nextMatch = {
        rival: document.getElementById('matchRival')?.value || 'Por definir',
        tournament: document.getElementById('matchTournament')?.value || '',
        referee: document.getElementById('matchReferee')?.value || '',
        broadcast: document.getElementById('matchBroadcast')?.value || '',
        date: document.getElementById('matchDate')?.value || '',
        place: document.getElementById('matchPlace')?.value || '',
        logo
      };
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'saveHistory'){
      d.history.text = document.getElementById('historyText')?.value || '';
      d.history.currentPresident = document.getElementById('presidentName')?.value || '';
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addDirector'){
      d.directors.push({
        role: document.getElementById('directorRole')?.value || '',
        name: document.getElementById('directorName')?.value || ''
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addPresident'){
      let image = '';
      const f = document.getElementById('presidentPhoto')?.files?.[0];
      if(f) image = await uploadFile(f, 'presidents');
      d.presidents.unshift({
        name: document.getElementById('presidentGalleryName')?.value || '',
        period: document.getElementById('presidentPeriod')?.value || '',
        image
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addResult'){
      d.results.unshift({
        date: document.getElementById('resultDate')?.value || '',
        match: document.getElementById('resultMatch')?.value || '',
        score: document.getElementById('resultScore')?.value || ''
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addNews'){
      let image = '';
      const f = document.getElementById('newsImage')?.files?.[0];
      if(f) image = await uploadFile(f, 'news');
      d.news.unshift({
        title: document.getElementById('newsTitle')?.value || '',
        text: document.getElementById('newsText')?.value || '',
        date: new Date().toLocaleDateString('es-CL'),
        image
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addMedia'){
      let url = document.getElementById('mediaUrl')?.value || '';
      let type = 'image';
      const f = document.getElementById('mediaFile')?.files?.[0];
      if(f){
        url = await uploadFile(f, 'gallery');
        type = f.type && f.type.startsWith('video') ? 'video' : 'image';
      }
      d.gallery.unshift({
        title: document.getElementById('mediaTitle')?.value || '',
        type,
        url
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addFixture'){
      let image = '';
      const f = document.getElementById('fixtureImage')?.files?.[0];
      if(f) image = await uploadFile(f, 'fixture');
      d.fixture_images.unshift({
        title: document.getElementById('fixtureTitle')?.value || '',
        image
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addStanding'){
      const serie = document.getElementById('standingSerie')?.value || SERIES[0];
      if(!d.standings[serie]) d.standings[serie] = [];
      const gf = Number(document.getElementById('gf')?.value || 0);
      const gc = Number(document.getElementById('gc')?.value || 0);
      d.standings[serie].push({
        team: document.getElementById('teamName')?.value || '',
        pj: Number(document.getElementById('pj')?.value || 0),
        pg: Number(document.getElementById('pg')?.value || 0),
        pe: Number(document.getElementById('pe')?.value || 0),
        pp: Number(document.getElementById('pp')?.value || 0),
        gf, gc, dg: gf - gc,
        pts: Number(document.getElementById('pts')?.value || 0)
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'addSponsor'){
      let url = document.getElementById('sponsorUrl')?.value || '';
      const fileInput = document.getElementById('sponsorFile') || document.getElementById('sponsorLogo');
      const f = fileInput?.files?.[0];
      if(f) url = await uploadFile(f, 'sponsors');
      d.sponsors.push({
        name: document.getElementById('sponsorName')?.value || '',
        url
      });
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'saveBackground'){
      let url = document.getElementById('backgroundUrl')?.value || '';
      const f = document.getElementById('backgroundFile')?.files?.[0];
      if(f) url = await uploadFile(f, 'backgrounds');
      d.appearance = d.appearance || {};
      d.appearance.backgroundImage = url;
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'restoreBackground'){
      d.appearance = d.appearance || {};
      d.appearance.backgroundImage = '';
      await saveAll(d);
      fillAdmin();
      return;
    }

    if(id === 'saveAppearanceColors'){
      d.appearance = d.appearance || {};
      d.appearance.blue = document.getElementById('appearanceBlue')?.value || '#00c8ff';
      d.appearance.gold = document.getElementById('appearanceGold')?.value || '#f7d36b';
      d.appearance.overlay = document.getElementById('backgroundOverlay')?.value || 35;
      d.siteConfig.blue = d.appearance.blue;
      d.siteConfig.gold = d.appearance.gold;
      await saveAll(d);
      fillAdmin();
      return;
    }

  }catch(e){
    console.error('Error botón Admin:', id, e);
    confirmError(e.message || 'Error al ejecutar acción.');
  }
}

(function(){
  if(window.__ADMIN_BUTTONS_DELEGATED_FINAL) return;
  window.__ADMIN_BUTTONS_DELEGATED_FINAL = true;

  document.addEventListener('click', async function(e){
    const btn = e.target.closest('button');
    if(!btn) return;

    const id = btn.id || '';
    const adminIds = [
      'saveSupabase','loadCloud','saveCloud','saveGeneral','saveMatch','saveHistory',
      'addDirector','addPresident','addResult','addNews','addMedia','addFixture',
      'addStanding','addSponsor','saveBackground','restoreBackground','saveAppearanceColors'
    ];

    if(adminIds.includes(id)){
      e.preventDefault();
      e.stopPropagation();
      btn.disabled = true;
      const oldText = btn.textContent;
      btn.textContent = 'Procesando...';
      await adminActionById(id);
      btn.textContent = oldText;
      btn.disabled = false;
    }

    if(btn.classList.contains('themePreset')){
      e.preventDefault();
      e.stopPropagation();
      const d = getData();
      d.appearance = d.appearance || {};
      if(btn.dataset.theme === 'nike'){
        d.appearance.blue = '#0077ff';
        d.appearance.gold = '#ffffff';
        d.appearance.overlay = 42;
      }else if(btn.dataset.theme === 'adidas'){
        d.appearance.blue = '#00c8ff';
        d.appearance.gold = '#f7d36b';
        d.appearance.overlay = 38;
      }else{
        d.appearance.blue = '#00bfff';
        d.appearance.gold = '#f3c84b';
        d.appearance.overlay = 35;
      }
      await saveAll(d);
      fillAdmin();
    }
  }, true);
})();


/* FIX SELECT SERIES ADMIN */
document.addEventListener('DOMContentLoaded', ()=>{
  setTimeout(()=>{
    const sel = document.getElementById('standingSerie');
    if(sel && !sel.dataset.loadedSeries){
      sel.dataset.loadedSeries = '1';
      sel.innerHTML = SERIES.map(s=>`<option>${s}</option>`).join('');
    }
  }, 500);
});
