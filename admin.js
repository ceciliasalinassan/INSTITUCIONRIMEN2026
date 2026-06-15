
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
  appearance:{backgroundImage:'',blue:'#00c8ff',gold:'#f7d36b',overlay:35},
  nextMatch:{rival:'Por definir',logo:'',date:'',place:'',tournament:'',referee:'',broadcast:''},
  history:{text:'Club Deportivo Ricardo Méndez, institución deportiva de San Carlos fundada el 12 de agosto de 1932. Más que un club, una familia.',currentPresident:''},
  directors:[], presidents:[], results:[], news:[], gallery:[], fixture_images:[], standings:{}, sponsors:[], member_requests:[]
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
  try{return merge(DEFAULT_DATA, JSON.parse(localStorage.getItem(DATA_KEY)||'{}'));}
  catch(e){return clone(DEFAULT_DATA);}
}
function saveData(d){ localStorage.setItem(DATA_KEY, JSON.stringify(merge(DEFAULT_DATA,d))); }

function normUrl(u){
  u=String(u||'').trim();
  if(u && !u.startsWith('http') && !u.includes('.supabase.co')) u='https://'+u+'.supabase.co';
  return u.replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'');
}
function getCfg(){try{return JSON.parse(localStorage.getItem(CFG_KEY)||'{}')}catch(e){return {}}}
function setCfg(url,key){localStorage.setItem(CFG_KEY,JSON.stringify({url:normUrl(url),key:String(key||'').trim()}));}
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
function ok(msg){ toast(msg,'success'); status('Estado: '+msg); }
function err(e){ console.error(e); toast(e.message||String(e),'error'); status('Error: '+(e.message||e)); }

function safeFileName(file){
  const original=file?.name||'archivo.jpg';
  const ext=(original.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
  const base=original.replace(/\.[^.]+$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,90)||'archivo';
  return `${Date.now()}_${Math.random().toString(36).slice(2,9)}_${base}.${ext}`;
}
function folderName(folder){
  return ({news:'news',gallery:'gallery',fixture:'fixture',fixtures:'fixture',media:'media',photos:'gallery',presidents:'presidents',sponsors:'sponsors',logos:'logos',backgrounds:'backgrounds',files:'files'}[folder]||folder||'media');
}
async function uploadFile(file, folder='media'){
  if(!file) return '';
  if(!initSB()) throw new Error('Primero guarda/conecta Supabase antes de subir archivos.');
  const path = `${folderName(folder)}/${safeFileName(file)}`;
  const {error}=await supabaseClient.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||'application/octet-stream'});
  if(error) throw new Error('No se pudo subir a club-assets: '+error.message);
  const {data}=supabaseClient.storage.from(BUCKET).getPublicUrl(path);
  if(!data?.publicUrl) throw new Error('No se pudo obtener URL pública.');
  return data.publicUrl;
}

/* Supabase tablas */
async function replaceTable(name, rows){
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
  if(!initSB()) throw new Error('Supabase no conectado.');
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
  Object.entries(d.standings||{}).forEach(([serie,rows])=>(rows||[]).forEach((x,i)=>standings.push({serie,team:x.team||'',pj:+x.pj||0,pg:+x.pg||0,pe:+x.pe||0,pp:+x.pp||0,gf:+x.gf||0,gc:+x.gc||0,dg:+x.dg||0,pts:+x.pts||0,sort_order:i})));
  await replaceTable('standings',standings);
}
async function pullCloud(){
  if(!initSB()) throw new Error('Supabase no conectado.');
  const d=clone(DEFAULT_DATA);
  let res=await supabaseClient.from('settings').select('*');
  if(!res.error && res.data) res.data.forEach(r=>{try{d[r.key]=JSON.parse(r.value)}catch(e){}});
  res=await supabaseClient.from('directors').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data)d.directors=res.data.map(x=>({role:x.role,name:x.name}));
  res=await supabaseClient.from('sponsors').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data)d.sponsors=res.data.map(x=>({name:x.name,url:x.url}));
  res=await supabaseClient.from('fixture_images').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data)d.fixture_images=res.data.map(x=>({title:x.title,image:x.image}));
  res=await supabaseClient.from('results').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data)d.results=res.data.map(x=>({date:x.date_text,match:x.match,score:x.score,scorers:x.scorers}));
  res=await supabaseClient.from('news').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data)d.news=res.data.map(x=>({title:x.title,text:x.text,date:x.date_text,image:x.image}));
  res=await supabaseClient.from('gallery').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data)d.gallery=res.data.map(x=>({title:x.title,type:x.type,url:x.url}));
  res=await supabaseClient.from('presidents').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data)d.presidents=res.data.map(x=>({name:x.name,period:x.period,image:x.image}));
  res=await supabaseClient.from('standings').select('*').order('sort_order',{ascending:true});
  if(!res.error&&res.data){
    d.standings={};
    res.data.forEach(x=>{if(!d.standings[x.serie])d.standings[x.serie]=[];d.standings[x.serie].push({team:x.team,pj:x.pj,pg:x.pg,pe:x.pe,pp:x.pp,gf:x.gf,gc:x.gc,dg:x.dg,pts:x.pts});});
  }
  saveData(d);
  return d;
}
async function saveAll(d){
  saveData(d);
  try{ await pushCloud(d); ok('Información guardada correctamente.'); }
  catch(e){ saveData(d); toast('Guardado local. Revisa Supabase.','error'); status('Estado: guardado local. '+e.message); }
  fillAdmin();
}

/* Render listas admin */
function listHTML(arr, label){
  return (arr||[]).map((x,i)=>`<div class="list-item"><span>${label(x)}</span><button type="button" class="deleteItem" data-index="${i}">Eliminar</button></div>`).join('');
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
}

/* llenar campos */
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
  if($('siteColorBlue')) $('siteColorBlue').value=d.siteConfig.blue||'#00c8ff';
  if($('siteColorGold')) $('siteColorGold').value=d.siteConfig.gold||'#f7d36b';
  if($('matchRival')) $('matchRival').value=d.nextMatch.rival||'';
  if($('matchTournament')) $('matchTournament').value=d.nextMatch.tournament||'';
  if($('matchReferee')) $('matchReferee').value=d.nextMatch.referee||'';
  if($('matchBroadcast')) $('matchBroadcast').value=d.nextMatch.broadcast||'';
  if($('matchDate')) $('matchDate').value=d.nextMatch.date||'';
  if($('matchPlace')) $('matchPlace').value=d.nextMatch.place||'';
  if($('matchLogoUrl')) $('matchLogoUrl').value=d.nextMatch.logo||'';
  if($('historyText')) $('historyText').value=d.history.text||'';
  if($('presidentName')) $('presidentName').value=d.history.currentPresident||'';
  if($('backgroundUrl')) $('backgroundUrl').value=d.appearance.backgroundImage||'';
  if($('appearanceBlue')) $('appearanceBlue').value=d.appearance.blue||'#00c8ff';
  if($('appearanceGold')) $('appearanceGold').value=d.appearance.gold||'#f7d36b';
  if($('backgroundOverlay')) $('backgroundOverlay').value=d.appearance.overlay??35;
  if($('backgroundOverlayValue')) $('backgroundOverlayValue').textContent=(d.appearance.overlay??35)+'%';
  if($('backgroundPreview')) $('backgroundPreview').style.backgroundImage=d.appearance.backgroundImage?`url("${d.appearance.backgroundImage}")`:'url("estadio_real_publico.jpg")';
  if($('standingSerie') && !$('standingSerie').dataset.loaded){$('standingSerie').dataset.loaded='1';$('standingSerie').innerHTML=SERIES.map(s=>`<option>${s}</option>`).join('');}
  renderAdminLists();
}

/* acciones */
async function action(id){
  const d=getData();
  if(id==='saveSupabase'){setCfg($('supabaseUrl')?.value,$('supabaseKey')?.value);ok('Conexión Supabase guardada.');return;}
  if(id==='loadCloud'){await pullCloud();ok('Datos cargados desde Supabase.');fillAdmin();return;}
  if(id==='saveCloud'){await pushCloud(getData());ok('Datos subidos a Supabase.');return;}
  if(id==='saveGeneral'){d.settings.homeTitle=$('homeTitle')?.value||d.settings.homeTitle;d.settings.homeText=$('homeIntroInput')?.value||'';d.settings.activeMembers=$('metricMembers')?.value||'0';d.settings.championships=$('metricTitles')?.value||'0';d.siteConfig.whatsapp=$('siteWhatsapp')?.value||'';d.siteConfig.instagram=$('siteInstagram')?.value||'';d.siteConfig.facebook=$('siteFacebook')?.value||'';d.siteConfig.blue=$('siteColorBlue')?.value||'#00c8ff';d.siteConfig.gold=$('siteColorGold')?.value||'#f7d36b';await saveAll(d);return;}
  if(id==='saveMatch'){let logo=$('matchLogoUrl')?.value||'';const f=$('matchLogoFile')?.files?.[0];if(f)logo=await uploadFile(f,'logos');d.nextMatch={rival:$('matchRival')?.value||'Por definir',tournament:$('matchTournament')?.value||'',referee:$('matchReferee')?.value||'',broadcast:$('matchBroadcast')?.value||'',date:$('matchDate')?.value||'',place:$('matchPlace')?.value||'',logo};await saveAll(d);return;}
  if(id==='saveHistory'){d.history.text=$('historyText')?.value||'';d.history.currentPresident=$('presidentName')?.value||'';await saveAll(d);return;}
  if(id==='addDirector'){d.directors.push({role:$('directorRole')?.value||'',name:$('directorName')?.value||''});await saveAll(d);return;}
  if(id==='addPresident'){let image='';const f=$('presidentPhoto')?.files?.[0];if(f)image=await uploadFile(f,'presidents');d.presidents.unshift({name:$('presidentGalleryName')?.value||'',period:$('presidentPeriod')?.value||'',image});await saveAll(d);return;}
  if(id==='addResult'){d.results.unshift({date:$('resultDate')?.value||'',match:$('resultMatch')?.value||'',score:$('resultScore')?.value||''});await saveAll(d);return;}
  if(id==='addNews'){let image='';const f=$('newsImage')?.files?.[0];if(f)image=await uploadFile(f,'news');d.news.unshift({title:$('newsTitle')?.value||'',text:$('newsText')?.value||'',date:new Date().toLocaleDateString('es-CL'),image});await saveAll(d);return;}
  if(id==='addMedia'){let url=$('mediaUrl')?.value||'';let type='image';const f=$('mediaFile')?.files?.[0];if(f){url=await uploadFile(f,'gallery');type=f.type?.startsWith('video')?'video':'image';}d.gallery.unshift({title:$('mediaTitle')?.value||'',type,url});await saveAll(d);return;}
  if(id==='addFixture'){let image='';const f=$('fixtureImage')?.files?.[0];if(f)image=await uploadFile(f,'fixture');d.fixture_images.unshift({title:$('fixtureTitle')?.value||'',image});await saveAll(d);return;}
  if(id==='addStanding'){const serie=$('standingSerie')?.value||SERIES[0];if(!d.standings[serie])d.standings[serie]=[];const gf=+$('gf')?.value||0,gc=+$('gc')?.value||0;d.standings[serie].push({team:$('teamName')?.value||'',pj:+$('pj')?.value||0,pg:+$('pg')?.value||0,pe:+$('pe')?.value||0,pp:+$('pp')?.value||0,gf,gc,dg:gf-gc,pts:+$('pts')?.value||0});await saveAll(d);return;}
  if(id==='addSponsor'){let url=$('sponsorUrl')?.value||'';const f=($('sponsorFile')||$('sponsorLogo'))?.files?.[0];if(f)url=await uploadFile(f,'sponsors');d.sponsors.push({name:$('sponsorName')?.value||'',url});await saveAll(d);return;}
  if(id==='saveBackground'){let url=$('backgroundUrl')?.value||'';const f=$('backgroundFile')?.files?.[0];if(f)url=await uploadFile(f,'backgrounds');d.appearance.backgroundImage=url;await saveAll(d);return;}
  if(id==='restoreBackground'){d.appearance.backgroundImage='';await saveAll(d);return;}
  if(id==='saveAppearanceColors'){d.appearance.blue=$('appearanceBlue')?.value||'#00c8ff';d.appearance.gold=$('appearanceGold')?.value||'#f7d36b';d.appearance.overlay=$('backgroundOverlay')?.value||35;d.siteConfig.blue=d.appearance.blue;d.siteConfig.gold=d.appearance.gold;await saveAll(d);return;}
}

/* UI */
function openAdmin(){ $('loginPanel')?.classList.add('hidden'); $('adminPanel')?.classList.remove('hidden'); sessionStorage.setItem('cdrm_admin_ok','1'); fillAdmin(); }
function bindUI(){
  $('loginBtn')?.addEventListener('click',()=>{(($('adminPassword')?.value||'').trim()===ADMIN_PASS)?openAdmin():toast('Clave incorrecta','error');});
  $('adminPassword')?.addEventListener('keydown',e=>{if(e.key==='Enter')$('loginBtn')?.click();});
  if(sessionStorage.getItem('cdrm_admin_ok')==='1') openAdmin();

  document.querySelectorAll('.tabs button').forEach(btn=>{
    btn.addEventListener('click',()=>{document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.tab-content').forEach(t=>t.classList.add('hidden'));$(btn.dataset.tab)?.classList.remove('hidden');});
  });

  document.addEventListener('click',async e=>{
    const btn=e.target.closest('button'); if(!btn) return;
    if(btn.classList.contains('themePreset')){
      e.preventDefault(); const d=getData(); if(btn.dataset.theme==='nike'){d.appearance.blue='#0077ff';d.appearance.gold='#ffffff';d.appearance.overlay=42;}else if(btn.dataset.theme==='adidas'){d.appearance.blue='#00c8ff';d.appearance.gold='#f7d36b';d.appearance.overlay=38;}else{d.appearance.blue='#00bfff';d.appearance.gold='#f3c84b';d.appearance.overlay=35;}await saveAll(d);return;
    }
    const ids=['saveSupabase','loadCloud','saveCloud','saveGeneral','saveMatch','saveHistory','addDirector','addPresident','addResult','addNews','addMedia','addFixture','addStanding','addSponsor','saveBackground','restoreBackground','saveAppearanceColors'];
    if(ids.includes(btn.id)){
      e.preventDefault();
      const old=btn.textContent; btn.disabled=true; btn.textContent='Procesando...';
      try{await action(btn.id);}catch(ex){err(ex);}
      btn.textContent=old; btn.disabled=false;
    }
  },true);

  $('backgroundOverlay')?.addEventListener('input',()=>{if($('backgroundOverlayValue'))$('backgroundOverlayValue').textContent=$('backgroundOverlay').value+'%';});
  fillAdmin();
}

document.addEventListener('DOMContentLoaded', bindUI);
