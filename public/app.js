(function(){
'use strict';

/* ------------------------------------------------------------------
   Engineering Delivery Flow V24
   Roles: Administrator, Project Manager, Lead, Engineer,
          Main Contractor, Plant Owner
   - Approved baseline (re-baselining logged)
   - Earned value in hours: SPI = EV/PV, CPI = EV/AC
   - Three RAG lights: Schedule, Budget/Hours, Quality/Scope
   - Weekly snapshots, weekly report per audience (publish to customers)
   - OTS count-based progress, punch list (A/B/C), customer data requests
   - OTS | MES switch
   Browser localStorage prototype: one device = one copy of the data.
------------------------------------------------------------------- */

const KEY = 'edf_v24', OLD_KEY = 'edf_v23';
const OTS = ['Design & Review','Process Modelling','Process Integration','Startup Internal','HMI Development','MAT','DCS Workflow','DCS/ESD Integration','Internal preFAT Startup','FAT','SAT'];
const MES = ['Requirements','Functional Design','Configuration','Integration','Testing','Deployment','Go-Live','Hypercare / Support'];
const MILESTONES = {OTS:['Design & Review','MAT','FAT','SAT'], MES:['Testing','Go-Live']};
/* Design & Review checklist: created as tasks in the first OTS stage. The stage is a customer gate (FDS approved). */
const OTS_DESIGN = [
  'Kickoff and OTS scope agreed (units, consoles, hardware, DCS approach)',
  'Design data received (P&IDs, H&MB, DCS database, datasheets)',
  'P&ID scope markup: modelled, simplified, out of scope',
  'FDS prepared',
  'FDS review with customer: comments and holds closed',
  'FDS approved by customer'];
const UNITS = {OTS:['Units modelled','I/O tags emulated','Scenarios built','HMI graphics'], MES:['Requirements','Test cases','Interfaces']};
const ROLES = ['Administrator','Project Manager','Lead','Engineer','Main Contractor','Plant Owner'];
const CUST = ['Main Contractor','Plant Owner'];
const STATUSES = ['Not Started','In Progress','Blocked','Ready for Review','Rework','Completed'];
const CREDIT = {'Not Started':0,'In Progress':10,'Blocked':10,'Rework':40,'Ready for Review':70,'Completed':100};
const Q_STATUS = ['Open','Awaiting customer','Awaiting team','Closed'];
const Q_VIS = {'Internal':'Internal team only','Customer':'Main contractor','All customers':'Main contractor + Plant owner'};

const NAV = {
  'Administrator':   ['dashboard','projects','people','alerts','more'],
  'Project Manager': ['dashboard','tasks','report','reviews','more'],
  'Lead':            ['dashboard','tasks','reviews','punch','more'],
  'Engineer':        ['dashboard','tasks','punch','alerts','more'],
  'Main Contractor': ['dashboard','report','punch','data','queries'],
  'Plant Owner':     ['dashboard','report','queries']
};
const INTERNAL_VIEWS = ['dashboard','projects','tasks','stages','reviews','punch','data','queries','report','team','people','alerts','more'];
const ALLOWED = {
  'Administrator':   [...INTERNAL_VIEWS,'archive','admin'],
  'Project Manager': INTERNAL_VIEWS,
  'Lead':            INTERNAL_VIEWS,
  'Engineer':        ['dashboard','projects','tasks','stages','punch','data','queries','alerts','more'],
  'Main Contractor': ['dashboard','stages','report','punch','data','queries'],
  'Plant Owner':     ['dashboard','stages','report','queries']
};
const ICON = {dashboard:'⌂',projects:'▦',tasks:'◫',stages:'◇',reviews:'✓',queries:'?',team:'♙',report:'▤',people:'☺',archive:'▧',alerts:'!',admin:'⚙',more:'≡',punch:'⚑',data:'⇅'};

/* ---------- storage & migration ---------- */
const seed = () => ({
  version:24, session:'admin',
  users:[{id:'admin',name:'Administrator',role:'Administrator',email:'',companyId:'ADMIN-001',status:'Active'}],
  projects:[], tasks:[], queries:[], punch:[], data:[], archive:[], weekly:{}, reports:{},
  audit:[{at:new Date().toISOString(),by:'System',text:'Fresh workspace created'}]
});
function load(){
  try{ const d = JSON.parse(localStorage.getItem(KEY)||'null'); if(d && d.version===24) return d }catch(e){}
  try{
    const o = JSON.parse(localStorage.getItem(OLD_KEY)||'null');
    if(o && o.version===23){
      o.version = 24; o.punch = []; o.data = []; o.reports = {}; o.weekly = {};
      o.users.forEach(u=>{ if(u.role==='Customer') u.role='Main Contractor' });
      delete o.history; o.audit.unshift({at:new Date().toISOString(),by:'System',text:'Migrated from V23 (Customer → Main Contractor)'});
      return o;
    }
  }catch(e){}
  return seed();
}
let D = load();
['punch','data','archive','tasks','queries','projects'].forEach(k=>D[k]=D[k]||[]); D.weekly=D.weekly||{}; D.reports=D.reports||{};
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(D)) }catch(e){} }

let U = {view:'dashboard', projectId:'', stageId:'', search:'', status:'All', qFilter:'Active', type:'', audience:'', week:'', gate:'All', pStatus:'Open'};

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const sid = p => p + Math.random().toString(36).slice(2,6).toUpperCase();
const iso = d => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
const today = () => iso(new Date());
const dt = s => new Date(s + 'T12:00:00');
const addDays = (s,n) => { const d = dt(s); d.setDate(d.getDate()+n); return iso(d) };
const days = (a,b) => Math.round((dt(b)-dt(a))/864e5);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const weekStart = s => { const d = dt(s); d.setDate(d.getDate()-((d.getDay()+6)%7)); return iso(d) };
const sum = (a,f) => a.reduce((n,x)=>n+(f(x)||0),0);
const r2 = v => v==null ? '—' : v.toFixed(2);
function fmt(s){ if(!s) return '—'; const d = dt(s.slice(0,10)); return isNaN(d) ? '—' : d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) }
function fmtS(s){ if(!s) return '—'; const d = dt(s.slice(0,10)); return isNaN(d) ? '—' : d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) }
function note(t){ const x=$('toast'); x.textContent=t; x.classList.add('show'); clearTimeout(note.t); note.t=setTimeout(()=>x.classList.remove('show'),2800) }
function badge(t,c='grey'){ return `<span class="badge ${c}">${esc(t)}</span>` }
function sColor(s){ return s==='Completed'?'green':s==='Ready for Review'?'gold':(s==='Rework'||s==='Blocked')?'red':s==='In Progress'?'blue':'grey' }
function log(text){ D.audit.unshift({at:new Date().toISOString(), by:me().name, text}); D.audit = D.audit.slice(0,300); save() }
function initials(n){ return String(n||'?').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase() }

/* ---------- identity & permissions ---------- */
function me(){ return D.users.find(u=>u.id===D.session && u.status==='Active') || D.users.find(u=>u.role==='Administrator') || D.users[0] }
function role(){ return me().role }
const isAdmin = () => role()==='Administrator';
const isCust = () => CUST.includes(role());
const isMC = () => role()==='Main Contractor';
const isPO = () => role()==='Plant Owner';
function user(id){ return D.users.find(u=>u.id===id) || {id:'',name:'Unassigned',role:'—',status:'Inactive'} }
function canAddRoles(){ return isAdmin() ? ROLES : ['Project Manager','Lead'].includes(role()) ? ['Engineer','Main Contractor','Plant Owner'] : [] }
function canCreateProject(){ return isAdmin() || role()==='Project Manager' }
function canEditProject(p){ return !!p && (isAdmin() || p.pm===me().id) }
function canPlan(p){ return !!p && (isAdmin() || p.pm===me().id || (role()==='Lead' && (p.members||[]).includes(me().id))) }
function canSeeHours(){ return ['Administrator','Project Manager','Lead'].includes(role()) }
function allowed(v){ return (ALLOWED[role()]||['dashboard']).includes(v) }
function label(v){
  if(v==='tasks' && role()==='Engineer') return 'My work';
  if(v==='stages' && isCust()) return 'Progress';
  return {dashboard:'Home',projects:'Projects',tasks:'Tasks',stages:'Stages',reviews:'Reviews',queries:'Queries',team:'Team',report:'Report',people:'People',archive:'Archive',alerts:'Alerts',admin:'Settings',more:'More',punch:'Punch list',data:'Data requests'}[v];
}
function visible(){ if(isAdmin()) return D.projects; return D.projects.filter(p => p.pm===me().id || (p.members||[]).includes(me().id)) }
function types(){ return [...new Set(visible().map(p=>p.type))].sort().reverse() }
function visibleTyped(){ const v = visible(), t = types(); if(t.length<2 || isCust()) return v; const ty = t.includes(U.type) ? U.type : t[0]; return v.filter(p=>p.type===ty) }
function project(){ const v = visibleTyped(); return v.find(p=>p.id===U.projectId) || v[0] || visible().find(p=>p.id===U.projectId) || null }
function stage(p,id){ return p.stages.find(s=>s.id===id) }
function tasks(p){ return p ? D.tasks.filter(t=>t.p===p.id) : [] }
function liveTasks(p){ return tasks(p).filter(t => { const s = stage(p,t.sid); return s && !s.na }) }
function shownTasks(p){ return role()==='Engineer' ? tasks(p).filter(t=>t.owner===me().id) : tasks(p) }
function addMember(p,id){ if(p && id && id!=='admin' && !(p.members||[]).includes(id)){ p.members = p.members||[]; p.members.push(id) } }
function canSeeQuery(q){ return !isCust() || (isMC() && q.visibility!=='Internal') || (isPO() && q.visibility==='All customers') }
function gates(p){ return p.stages.filter(s=>s.milestone && !s.na) }

/* ---------- progress & earned value (hours) ---------- */
const weight = t => t.plan>0 ? t.plan : 1;
function credit(t){
  if(t.qty && t.qty.target>0 && t.status!=='Completed') return Math.round(clamp((t.qty.done||0)/t.qty.target,0,1)*90);
  return CREDIT[t.status] || 0;
}
function earnedPct(list){ const w = sum(list,weight); return w ? Math.round(sum(list,t=>weight(t)*credit(t))/w) : 0 }
function stagePct(p,s){ return earnedPct(tasks(p).filter(t=>t.sid===s.id)) }
function frac(a,b,at){ const s = dt(a), e = dt(addDays(b,1)); return e>s ? clamp((at-s)/(e-s),0,1) : (at>=e?1:0) }
function bac(p){ return p.baseline ? sum(Object.values(p.baseline.tasks), b=>b.plan>0?b.plan:1) : sum(liveTasks(p),weight) }
function pvAt(p,date){
  const at = date instanceof Date ? date : dt(date);
  if(p.baseline) return sum(Object.values(p.baseline.tasks), b=>(b.plan>0?b.plan:1)*frac(b.start||p.start,b.due||p.end,at));
  return sum(liveTasks(p), t=>weight(t)*frac(t.start||p.start,t.due||p.end,at));
}
function kpis(p){
  const live = liveTasks(p), B = bac(p), ev = sum(live,t=>weight(t)*credit(t)/100), ac = sum(tasks(p),t=>t.actual), pv = pvAt(p,new Date());
  const spi = pv>0 ? ev/pv : null, cpi = ac>0 && ev>0 ? ev/ac : null;
  return {bac:B, ev, ac, pv, spi, cpi, eac: cpi ? B/cpi : null, pct: B ? Math.round(ev/B*100) : 0, ppct: B ? Math.round(pv/B*100) : 0, scope: p.baseline ? sum(live,weight)-B : 0};
}
function projectPct(p){ return kpis(p).pct }
function blEnd(p,s){ return p.baseline && p.baseline.stages[s.id] ? p.baseline.stages[s.id].end : '' }
function slip(p,s){ const b = blEnd(p,s); return b && s.end ? days(b,s.end) : 0 }
function stageState(p,s){
  if(s.na) return {label:'Not applicable', c:'grey', pct:0};
  const pct = stagePct(p,s);
  if(pct===100) return {label:'Completed', c:'green', pct};
  if(s.end && s.end < today()) return {label:'Overdue', c:'red', pct};
  if(pct>0) return {label:'In progress', c:'blue', pct};
  return {label:'Not started', c:'grey', pct};
}
const overdue = t => t.status!=='Completed' && t.due && t.due < today();
const openPunch = p => D.punch.filter(x=>x.p===p.id && x.status!=='Closed');
const lateData = d => d.status!=='Received' && d.needed && d.needed < today();

/* Three RAG lights with documented thresholds (docs/PROGRESS_RULES.md) */
function rags(p){
  const k = kpis(p), ms = gates(p).filter(s=>stagePct(p,s)<100), maxSlip = Math.max(0,...ms.map(s=>slip(p,s)));
  const S = !liveTasks(p).length ? {c:'grey',label:'Not planned',why:'No tasks yet'}
    : (k.spi!=null && k.spi<0.85) || maxSlip>14 ? {c:'red',label:'Red',why:`SPI ${r2(k.spi)}${maxSlip?` · milestone slip ${maxSlip} d`:''}`}
    : (k.spi!=null && k.spi<0.95) || maxSlip>0 ? {c:'gold',label:'Amber',why:`SPI ${r2(k.spi)}${maxSlip?` · milestone slip ${maxSlip} d`:''}`}
    : {c:'green',label:'Green',why:`SPI ${r2(k.spi)}`};
  const Bd = k.cpi==null ? {c:'grey',label:'No data',why:'No hours booked yet'}
    : k.cpi<0.85 ? {c:'red',label:'Red',why:`CPI ${r2(k.cpi)} · forecast ${Math.round(k.eac)} h vs ${Math.round(k.bac)} h`}
    : k.cpi<0.95 ? {c:'gold',label:'Amber',why:`CPI ${r2(k.cpi)} · forecast ${Math.round(k.eac)} h vs ${Math.round(k.bac)} h`}
    : {c:'green',label:'Green',why:`CPI ${r2(k.cpi)}`};
  const op = openPunch(p), openA = op.filter(x=>x.cat==='A'), rework = tasks(p).filter(t=>t.status==='Rework').length;
  const nearA = openA.filter(x=>{ const g = stage(p,x.gate); return g && g.end && g.end <= addDays(today(),14) });
  const scopePct = k.bac ? Math.round(k.scope/k.bac*100) : 0;
  const why = [openA.length?openA.length+' open Cat A punch':'', rework?rework+' task(s) in rework':'', Math.abs(scopePct)>5?`scope ${scopePct>0?'+':''}${scopePct}% vs baseline`:''].filter(Boolean).join(' · ');
  const Q = nearA.length ? {c:'red',label:'Red',why:why+' (gate ≤14 days)'} : (openA.length||rework||Math.abs(scopePct)>5) ? {c:'gold',label:'Amber',why} : {c:'green',label:'Green',why:'No open Cat A punch, no rework'};
  return {schedule:S, budget:Bd, quality:Q};
}
function ragRow(p, only){
  const r = rags(p), items = [['Schedule',r.schedule],['Hours / budget',r.budget],['Quality / scope',r.quality]].filter(x=>!only||only.includes(x[0]));
  return `<div class="rag-row">${items.map(([n,x])=>`<div class="rag ${x.c}"><span class="dot"></span><div><b>${n}</b><small>${esc(x.label)} · ${esc(x.why)}</small></div></div>`).join('')}</div>`;
}

/* ---------- weekly snapshots ---------- */
function snap(p){
  if(!p) return;
  p.stages.forEach(s=>{ const pct = stagePct(p,s); if(pct===100 && !s.doneAt) s.doneAt = today(); if(pct<100) delete s.doneAt });
  const k = kpis(p), wk = weekStart(today()), arr = D.weekly[p.id] = D.weekly[p.id] || [];
  const e = {wk, d:today(), ev:Math.round(k.ev), pv:Math.round(k.pv), ac:k.ac, bac:Math.round(k.bac), pct:k.pct, ppct:k.ppct};
  const i = arr.findIndex(x=>x.wk===wk); if(i>=0) arr[i] = e; else { arr.push(e); arr.sort((a,b)=>a.wk<b.wk?-1:1) }
}

/* ---------- charts ---------- */
function scurve(p){
  if(!p.start || !p.end || p.end<=p.start) return '<div class="empty">Set project dates to draw the S-curve.</div>';
  const B = bac(p); if(!B) return '<div class="empty">Add tasks with dates and planned hours to draw the S-curve.</div>';
  const hist = (D.weekly[p.id]||[]).filter(h=>h.d>=p.start);
  const top = Math.max(100, ...hist.map(h=>h.pct), projectPct(p));
  const s = dt(p.start), e = dt(p.end), span = e - s, W=340, H=190, L=30, R=12, T=10, Bm=28;
  const x = d => (L + (W-L-R)*clamp((d-s)/span,0,1)).toFixed(1), y = v => (T + (H-T-Bm)*(1-v/top)).toFixed(1);
  const plan = []; for(let i=0;i<=40;i++){ const d = new Date(s.getTime()+span*i/40); plan.push(x(d)+','+y(pvAt(p,d)/B*100)) }
  const ev = hist.map(h=>x(dt(h.d))+','+y(h.pct)), last = hist[hist.length-1];
  const now = new Date(), tx = x(now);
  const grid = [0,25,50,75,100].map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--line)"/><text x="${L-5}" y="${+y(v)+3}" text-anchor="end" class="ax">${v}%</text>`).join('');
  const mL = d => d.toLocaleDateString('en-GB',{month:'short',year:'2-digit'});
  return `<svg class="scurve" viewBox="0 0 ${W} ${H}" role="img" aria-label="S-curve planned versus earned">${grid}
    <text x="${L}" y="${H-8}" class="ax">${mL(s)}</text><text x="${W-R}" y="${H-8}" text-anchor="end" class="ax">${mL(e)}</text>
    ${now>s&&now<e?`<line x1="${tx}" x2="${tx}" y1="${T}" y2="${H-Bm}" style="stroke:var(--gold);stroke-dasharray:3 3"/><text x="${tx}" y="${H-8}" text-anchor="middle" class="ax">Today</text>`:''}
    <polyline points="${plan.join(' ')}" style="fill:none;stroke:var(--muted);stroke-width:2;stroke-dasharray:5 4"/>
    ${ev.length>1?`<polyline points="${ev.join(' ')}" style="fill:none;stroke:var(--green);stroke-width:2.5"/>`:''}
    ${last?`<circle cx="${x(dt(last.d))}" cy="${y(last.pct)}" r="4" style="fill:var(--green)"/>`:''}</svg>
  <div class="legend"><span><i class="dash"></i>${p.baseline?'Baseline':'Provisional'} plan ${kpis(p).ppct}% today</span><span><i class="solid"></i>Earned ${projectPct(p)}%</span></div>`;
}
function weekBars(p,n=8){
  const h = (D.weekly[p.id]||[]); if(h.length<2) return '<div class="empty">Weekly bars appear after two weeks of data.</div>';
  const rows = h.slice(-n-1), d = rows.slice(1).map((w,i)=>({wk:w.wk, ev:Math.max(0,w.pct-rows[i].pct), pv:Math.max(0,w.ppct-rows[i].ppct)}));
  const mx = Math.max(1,...d.map(x=>Math.max(x.ev,x.pv))), W=340, H=130, L=8, bw=(W-L*2)/d.length;
  return `<svg class="scurve" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly progress, earned versus planned">${d.map((w,i)=>{const x0=L+i*bw, hp=(H-30)*w.pv/mx, he=(H-30)*w.ev/mx;return `<rect x="${(x0+bw*0.12).toFixed(1)}" y="${(H-20-hp).toFixed(1)}" width="${(bw*0.36).toFixed(1)}" height="${hp.toFixed(1)}" rx="2" style="fill:var(--line)"/><rect x="${(x0+bw*0.5).toFixed(1)}" y="${(H-20-he).toFixed(1)}" width="${(bw*0.36).toFixed(1)}" height="${he.toFixed(1)}" rx="2" style="fill:var(--green)"/><text x="${(x0+bw/2).toFixed(1)}" y="${H-6}" text-anchor="middle" class="ax">${fmtS(w.wk)}</text>${w.ev?`<text x="${(x0+bw*0.68).toFixed(1)}" y="${(H-24-he).toFixed(1)}" text-anchor="middle" class="ax">${w.ev}</text>`:''}`}).join('')}</svg>
  <div class="legend"><span><i class="box grey"></i>Planned % per week</span><span><i class="box green"></i>Earned % per week</span></div>`;
}

/* ---------- layout ---------- */
function modal(title,sub,body,buttons=''){
  $('modal-root').innerHTML = `<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><section class="modal"><header class="modal-head"><div><h3>${title}</h3><small>${sub}</small></div><button class="close" onclick="closeModal()" aria-label="Close">×</button></header><div class="modal-body">${body}</div>${buttons?`<footer class="modal-actions">${buttons}</footer>`:''}</section></div>`;
}
window.closeModal = () => { $('modal-root').innerHTML = '' };
/* In-page confirmation (browser confirm/prompt are blocked in embedded viewers) */
function ask(title, msg, o, cb){
  o = o||{};
  modal(esc(title), '', `<p>${msg}</p>${o.input!=null?`<input id="askv" class="field" placeholder="${esc(o.input)}">`:''}`, `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn ${o.danger?'danger':'primary'}" id="askok">${esc(o.ok||'OK')}</button>`);
  $('askok').onclick = () => { const v = $('askv') ? $('askv').value.trim() : ''; if(o.match && v!==o.match) return note('Type '+o.match+' to confirm.'); closeModal(); cb(v) };
}
const EMBED = !!window.EDF_ARTIFACT;
function page(ey,title,copy,buttons=''){ return `<div class="page-head"><div><div class="eyebrow">${ey}</div><h1>${title}</h1>${copy?`<p class="subcopy">${copy}</p>`:''}</div><div class="actions">${buttons}</div></div>` }
function greeting(){ const h = new Date().getHours(); return h<12?'Good morning':h<18?'Good afternoon':'Good evening' }
function top(){
  const u = me();
  return `<header class="topbar"><button class="brand" onclick="go('dashboard')"><span class="brand-mark">ED</span><span><b>Engineering Delivery Flow</b><small>OTS + MES PROJECT WORKFLOW</small></span></button>
  <div class="top-actions">${!isCust()?`<input class="global-search" placeholder="Search tasks" onkeydown="if(event.key==='Enter')searchAll(this.value)">`:''}
  <button class="avatar-btn" onclick="profile()" aria-label="Switch demo user"><span class="avatar-i">${esc(initials(u.name))}</span><span class="avatar-t"><b>${esc(u.name)}</b><small>${esc(u.role)}</small></span></button></div></header>`;
}
function side(){
  const views = (ALLOWED[role()]||[]).filter(v=>v!=='more');
  const list = isCust() ? '' : visibleTyped().map(p=>`<button class="project-link ${project()&&project().id===p.id?'on':''}" onclick="pick('${p.id}')"><strong>${esc(p.name)}</strong><small>${esc(p.code+' · '+p.type+' · '+p.status)}</small></button>`).join('');
  return `<aside class="sidebar"><div class="nav-group">${views.map(v=>`<button class="nav-btn ${U.view===v?'active':''}" onclick="go('${v}')">${ICON[v]} ${label(v)}</button>`).join('')}</div>
  ${list||canCreateProject()?`<div class="nav-group"><div class="eyebrow">Projects</div>${list}${canCreateProject()?'<button class="side-cta" onclick="projectForm()">＋ New project</button>':''}</div>`:''}</aside>`;
}
function bottom(){
  const v = NAV[role()]||['dashboard'];
  return `<nav class="phone-bottom" style="grid-template-columns:repeat(${v.length},1fr)">${v.map(x=>`<button class="${U.view===x||(x==='more'&&!v.includes(U.view))?'active':''}" onclick="go('${x}')"><span>${ICON[x]}</span>${label(x).replace('Data requests','Data').replace('Punch list','Punch')}</button>`).join('')}</nav>`;
}
function typeToggle(){
  const t = types(); if(t.length<2 || isCust()) return '';
  const cur = t.includes(U.type) ? U.type : t[0];
  return `<div class="seg" role="tablist">${t.map(x=>`<button role="tab" class="${x===cur?'on':''}" onclick="setType('${x}')">${x}</button>`).join('')}</div>`;
}
function switcher(){
  const v = visibleTyped(); if(v.length<2) return '';
  const p = project();
  return `<select class="field switch" onchange="pick(this.value,true)" aria-label="Select project">${v.map(x=>`<option value="${x.id}" ${p&&p.id===x.id?'selected':''}>${esc(x.code+' · '+x.name)}</option>`).join('')}</select>`;
}
function heads(){ return typeToggle()+switcher() }

/* ---------- shared pieces ---------- */
function bar(pct){ return `<div class="progress"><i style="width:${clamp(pct,0,100)}%"></i></div>` }
function metric(l,v,s){ return `<article class="metric"><span class="metric-label">${l}</span><strong>${v}</strong><small>${s}</small></article>` }
function stageCards(p){ return `<div class="stage-strip">${p.stages.map(s=>{const z=stageState(p,s);return `<button class="stage-card ${z.c}" onclick="openStage('${s.id}')"><strong>${esc(s.name)}${s.milestone?' ◆':''}</strong><small>${s.na?'N/A':z.pct+'%'} · ${z.label}</small></button>`}).join('')}</div>` }
function baselineNotice(p){
  if(p.baseline) return `<div class="notice small">Baseline ${p.baseline.n} approved ${fmt(p.baseline.at)} by ${esc(p.baseline.by)}.${kpis(p).scope&&Math.abs(kpis(p).scope)/bac(p)>0.05?` Scope changed ${Math.round(kpis(p).scope)} h since baseline.`:''}${canEditProject(p)?` <button class="link" onclick="approveBaseline()">Re-baseline</button>`:''}</div>`;
  return `<div class="notice warn">Baseline not approved — planned figures are provisional and move when dates change.${canEditProject(p)?' <button class="btn tiny primary" onclick="approveBaseline()">Approve baseline</button>':''}</div>`;
}
function heroInternal(p){
  const k = kpis(p);
  return `<section class="hero"><div><div class="eyebrow light">${esc(p.type+' · '+p.code+' · '+p.status)}</div><h1>${esc(p.name)}</h1><p>${esc(p.customer+' · '+p.location)} · ${fmt(p.start)} – ${fmt(p.end)}</p></div>
  <div class="hero-meta"><div>EARNED<b>${k.pct}%</b></div><div>PLANNED<b>${k.ppct}%</b></div><div>SPI<b>${r2(k.spi)}</b></div>${canSeeHours()?`<div>CPI<b>${r2(k.cpi)}</b></div>`:''}</div></section>`;
}
function heroCustomer(p){
  const k = kpis(p), r = rags(p).schedule, next = gates(p).find(s=>stagePct(p,s)<100);
  return `<section class="hero"><div><div class="eyebrow light">${esc(p.type+' · '+p.code)}</div><h1>${esc(p.name)}</h1><p>${esc(p.location)} · ${fmt(p.start)} – ${fmt(p.end)}</p></div>
  <div class="hero-meta"><div>PROGRESS<b>${k.pct}%</b></div><div>PLANNED<b>${k.ppct}%</b></div><div>SCHEDULE<b>${r.label}</b></div><div>NEXT MILESTONE<b>${next?esc(next.name)+' · '+fmtS(next.end):'All done'}</b></div></div></section>`;
}
function milestoneTable(p){
  const ms = gates(p); if(!ms.length) return '<div class="empty">No milestones defined.</div>';
  return `<div class="ms-table">${ms.map(s=>{const pct=stagePct(p,s), sl=slip(p,s), done=pct===100;return `<div class="ms-row"><span class="ms-dot ${done?'done':sl>0||(s.end<today())?'late':''}"></span><div><b>${esc(s.name)}</b><small>${blEnd(p,s)?'Baseline '+fmtS(blEnd(p,s))+' · ':''}${done?'Achieved '+fmtS(s.doneAt):'Forecast '+fmtS(s.end)}</small></div>${done?badge('Done','green'):sl>0?badge('+'+sl+' d','red'):sl<0?badge(sl+' d','green'):badge(blEnd(p,s)?'On time':'Planned','blue')}</div>`}).join('')}</div>`;
}
function countsPanel(p){
  const units = UNITS[p.type]||[], rows = units.map(u=>{const t=tasks(p).filter(x=>x.qty&&x.qty.unit===u);return {u, done:sum(t,x=>Math.min(x.qty.done||0,x.qty.target)), target:sum(t,x=>x.qty.target)}}).filter(r=>r.target);
  if(!rows.length) return '<div class="empty">No quantities yet. Add a quantity (e.g. I/O tags) to a task.</div>';
  return rows.map(r=>`<div class="bar-row"><span>${esc(r.u)}<small>${r.done.toLocaleString()} / ${r.target.toLocaleString()}</small></span>${bar(Math.round(r.done/r.target*100))}<b>${Math.round(r.done/r.target*100)}%</b></div>`).join('');
}
function punchSummary(p){
  const g = gates(p); if(!g.length) return '<div class="empty">No gates.</div>';
  const all = D.punch.filter(x=>x.p===p.id);
  return `<table class="mini-table"><thead><tr><th>Gate</th><th>A</th><th>B</th><th>C</th><th>Closed</th></tr></thead><tbody>${g.map(s=>{const a=all.filter(x=>x.gate===s.id), o=a.filter(x=>x.status!=='Closed'), c=k=>o.filter(x=>x.cat===k).length;return `<tr><td>${esc(s.name)}</td><td class="${c('A')?'bad':''}">${c('A')}</td><td>${c('B')}</td><td>${c('C')}</td><td>${a.length-o.length}</td></tr>`}).join('')}</tbody></table><small class="muted">Open items by category. A blocks the gate, B blocks start-up, C can close after start-up.</small>`;
}
function dataList(p, owedBy){
  const a = D.data.filter(d=>d.p===p.id && (!owedBy || d.owedBy===owedBy)).sort((x,y)=>(x.status==='Received')-(y.status==='Received')||((x.needed||'')<(y.needed||'')?-1:1));
  return a.map(d=>`<article class="query-card" onclick="openData('${d.id}')"><div class="row"><div><b>${esc(d.title)}</b><div class="meta">Owed by ${esc(d.owedBy)} · needed ${fmtS(d.needed)}${d.blocks&&stage(p,d.blocks)?' · blocks '+esc(stage(p,d.blocks).name):''}</div></div>${badge(lateData(d)?'Late':d.status, lateData(d)?'red':d.status==='Received'?'green':d.status==='Sent'?'gold':'blue')}</div></article>`).join('') || '<div class="empty">No data requests.</div>';
}
function alertList(){ const a = alerts(); return `<div class="action-list">${a.map(x=>`<div class="action-item ${x.c||''}"><span>●</span><div><b>${esc(x.h)}</b><small>${esc(x.x)}</small></div></div>`).join('')}</div>` }

function taskButtons(t){
  const p = D.projects.find(x=>x.id===t.p);
  let out = `<button class="btn tiny ghost" onclick="openTask('${t.id}')">Open</button>`;
  if(canPlan(p)) out += `<button class="btn tiny soft" onclick="taskForm('${t.id}')">Edit</button>`;
  else if(t.owner===me().id && t.status!=='Completed') out += `<button class="btn tiny primary" onclick="myWork('${t.id}')">Update</button>`;
  if(t.status==='Ready for Review' && (isAdmin()||t.reviewer===me().id)) out += `<button class="btn tiny primary" onclick="review('${t.id}')">Review</button>`;
  return out;
}
function qtyText(t){ return t.qty&&t.qty.target ? ` · ${(t.qty.done||0).toLocaleString()}/${t.qty.target.toLocaleString()} ${esc(t.qty.unit.split(' ')[0].toLowerCase())}` : '' }
function taskCards(list){
  return list.map(t=>{const p=D.projects.find(x=>x.id===t.p), s=p&&stage(p,t.sid);return `<article class="task-card"><div class="row"><div><b>${esc(t.title)}</b><div class="meta">${esc(s?s.name:'—')} · ${esc(user(t.owner).name)} · due ${fmtS(t.due)}${canSeeHours()||t.owner===me().id?` · ${t.actual}/${t.plan} h`:''}${qtyText(t)}${overdue(t)?' · <span class="late">overdue</span>':''}</div></div>${badge(t.status,sColor(t.status))}</div><div class="actions">${taskButtons(t)}</div></article>`}).join('') || '<div class="empty">No tasks here.</div>';
}
function taskTable(list){
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Task</th><th>Stage</th><th>Assignee</th><th>Reviewer</th><th>Dates</th>${canSeeHours()?'<th>Hours</th>':''}<th>Qty</th><th>Status</th><th></th></tr></thead><tbody>${list.map(t=>{const p=D.projects.find(x=>x.id===t.p),s=p&&stage(p,t.sid);return `<tr><td><b>${esc(t.title)}</b><br><small>${esc(t.id)}</small></td><td>${esc(s?s.name:'—')}</td><td>${esc(user(t.owner).name)}</td><td>${esc(user(t.reviewer).name)}</td><td>${fmt(t.start)} → ${fmt(t.due)}${overdue(t)?'<br><span class="late">overdue</span>':''}</td>${canSeeHours()?`<td>${t.actual}/${t.plan} h</td>`:''}<td>${t.qty&&t.qty.target?`${(t.qty.done||0).toLocaleString()}/${t.qty.target.toLocaleString()}<br><small>${esc(t.qty.unit)}</small>`:'—'}</td><td>${badge(t.status,sColor(t.status))}</td><td><div class="actions">${taskButtons(t)}</div></td></tr>`}).join('')||'<tr><td colspan="9">No tasks</td></tr>'}</tbody></table></div><div class="mobile-cards">${taskCards(list)}</div>`;
}

/* ---------- alerts per role ---------- */
function alerts(){
  const a = [], t0 = today(), r = role(), id = me().id, projs = (isAdmin()||isCust()) ? visible() : visibleTyped();
  if(r==='Administrator'){
    if(!D.users.some(u=>u.role==='Project Manager'&&u.status==='Active')) a.push({h:'No Project Manager yet', x:'Add a Project Manager in People.', c:'warn'});
    projs.forEach(p=>{
      if(!p.pm || user(p.pm).status!=='Active') a.push({h:p.code+' has no active PM', x:'Assign a Project Manager.', c:'warn'});
      if(!p.baseline) a.push({h:p.code+': baseline not approved', x:'Planned figures are provisional.', c:'warn'});
      const rg = rags(p); ['schedule','budget','quality'].forEach(k=>{ if(rg[k].c==='red') a.push({h:p.code+': '+k+' red', x:rg[k].why, c:'warn'}) });
    });
  }
  if(r==='Project Manager' || r==='Lead'){
    projs.forEach(p=>{
      if(r==='Project Manager' && p.pm===id && !p.baseline) a.push({h:p.code+': approve the baseline', x:'Until then the S-curve plan moves with every date change.', c:'warn'});
      tasks(p).filter(t=>t.status==='Ready for Review'&&t.reviewer===id).forEach(t=>a.push({h:'Review waiting', x:p.code+' · '+t.title}));
      tasks(p).filter(t=>t.status==='Blocked').forEach(t=>a.push({h:'Blocked task', x:p.code+' · '+t.title+' · '+user(t.owner).name, c:'warn'}));
      tasks(p).filter(overdue).forEach(t=>a.push({h:'Overdue', x:p.code+' · '+t.title+' (due '+fmtS(t.due)+')', c:'warn'}));
      D.data.filter(d=>d.p===p.id&&lateData(d)).forEach(d=>a.push({h:'Customer data late', x:p.code+' · '+d.title+' ('+d.owedBy+')', c:'warn'}));
      openPunch(p).filter(x=>x.cat==='A').forEach(x=>a.push({h:'Open Cat A punch', x:p.code+' · '+x.title, c:'warn'}));
      D.queries.filter(q=>q.p===p.id&&q.status==='Awaiting team'&&(q.owner===id||r==='Project Manager')).forEach(q=>a.push({h:'Query waiting for team', x:p.code+' · '+q.title}));
    });
  }
  if(r==='Engineer'){
    projs.forEach(p=>{
      tasks(p).filter(t=>t.owner===id&&t.status==='Rework').forEach(t=>a.push({h:'Rework returned', x:t.title, c:'warn'}));
      tasks(p).filter(t=>t.owner===id&&t.status!=='Completed'&&t.due&&t.due<=addDays(t0,7)).forEach(t=>a.push({h:overdue(t)?'Overdue':'Due within 7 days', x:t.title+' · '+fmtS(t.due), c:overdue(t)?'warn':''}));
      openPunch(p).filter(x=>x.owner===id&&x.status==='Open').forEach(x=>a.push({h:'Punch item '+x.cat+' assigned to you', x:x.title, c:x.cat==='A'?'warn':''}));
      D.queries.filter(q=>q.p===p.id&&q.owner===id&&q.status!=='Closed').forEach(q=>a.push({h:q.kind+' assigned to you', x:q.title}));
    });
  }
  if(isCust()){
    projs.forEach(p=>{
      D.data.filter(d=>d.p===p.id&&d.owedBy===r&&d.status==='Requested').forEach(d=>a.push({h:lateData(d)?'Data you owe is late':'Data requested from you', x:d.title+' · needed '+fmtS(d.needed), c:lateData(d)?'warn':''}));
      D.queries.filter(q=>q.p===p.id&&canSeeQuery(q)&&q.status==='Awaiting customer').forEach(q=>a.push({h:'Waiting for your response', x:q.title, c:'warn'}));
      if(isMC()) openPunch(p).filter(x=>x.status==='Fixed').forEach(x=>a.push({h:'Punch item fixed — please verify', x:x.title}));
    });
  }
  return a.length ? a : [{h:'Nothing urgent', x:'No item needs your action right now.'}];
}

/* ---------- empty state ---------- */
function emptyWorkspace(){
  if(isAdmin()){
    const hasPM = D.users.some(u=>u.role==='Project Manager'&&u.status==='Active');
    return page('Fresh workspace','Welcome, Administrator','Start real work, or load the demo to explore every role.')+
    `<section class="panel"><h3>Getting started</h3><ol class="steps"><li class="${hasPM?'done':''}">Add a Project Manager and a Lead <button class="btn tiny primary" onclick="personForm()">＋ Add person</button></li><li>Project Manager creates the OTS or MES project and approves the baseline</li><li>PM or Lead adds Engineers, the Main Contractor and the Plant Owner</li></ol></section>${demoPanel()}`;
  }
  if(role()==='Project Manager') return page('Project Manager','No project yet','Create your first OTS or MES project.','<button class="btn primary" onclick="projectForm()">＋ New project</button>');
  return page(role(),'No project assigned','Ask the Project Manager or Lead to add you to a project.');
}

/* ---------- dashboards ---------- */
function dashboard(){
  const r = role();
  if(r==='Administrator') return adminDash();
  const p = project(); if(!p) return emptyWorkspace();
  if(r==='Main Contractor') return mcDash(p);
  if(r==='Plant Owner') return poDash(p);
  if(r==='Engineer') return engineerDash(p);
  if(r==='Lead') return leadDash(p);
  return pmDash(p);
}
function adminDash(){
  if(!D.projects.length) return emptyWorkspace();
  const active = D.users.filter(u=>u.status==='Active'), list = visibleTyped();
  return page('Administrator overview',greeting()+'.','Portfolio health, people and system control.', '<button class="btn soft" onclick="personForm()">＋ Person</button><button class="btn primary" onclick="projectForm()">＋ Project</button>')+
  `<div class="head-tools">${typeToggle()}</div>
  <div class="metric-grid">${metric('Active projects',D.projects.length,D.archive.length+' archived')}${metric('People',active.filter(u=>!CUST.includes(u.role)).length,active.filter(u=>CUST.includes(u.role)).length+' customer contacts')}${metric('Reviews waiting',D.tasks.filter(t=>t.status==='Ready for Review').length,'All projects')}${metric('Open Cat A punch',D.punch.filter(x=>x.cat==='A'&&x.status!=='Closed').length,'All projects')}</div>
  <section class="panel"><div class="panel-head"><h3>Portfolio</h3></div>${list.map(p=>{const k=kpis(p),g=rags(p);return `<button class="portfolio-row" onclick="pick('${p.id}');go('report')"><div><b>${esc(p.name)}</b><small>${esc(p.code+' · '+p.type+' · PM '+user(p.pm).name)}${p.baseline?'':' · no baseline'}</small></div><div class="pf-right">${bar(k.pct)}<small>${k.pct}% earned · ${k.ppct}% planned · SPI ${r2(k.spi)}</small><span class="dots">${['schedule','budget','quality'].map(x=>`<i class="d ${g[x].c}" title="${x}"></i>`).join('')}<small>Schedule · Hours · Quality</small></span></div></button>`}).join('')}</section>
  <div class="content-grid"><section class="panel"><div class="panel-head"><h3>Needs attention</h3></div>${alertList()}</section>${demoPanel()}</div>`;
}
function pmDash(p){
  const id = me().id, t = tasks(p), k = kpis(p);
  return page('Project Manager', greeting()+', '+esc(me().name.split(' ')[0])+'.','Schedule, hours, quality and customer items.', canCreateProject()?'<button class="btn primary" onclick="projectForm()">＋ Project</button>':'')+
  `<div class="head-tools">${heads()}</div>`+heroInternal(p)+baselineNotice(p)+ragRow(p)+
  `<div class="metric-grid">${metric('Reviews for you',t.filter(x=>x.status==='Ready for Review'&&x.reviewer===id).length,'Approve or return')}${metric('Hours',k.ac+' / '+Math.round(k.bac),k.eac?'Forecast '+Math.round(k.eac)+' h':'Actual / baseline')}${metric('Late customer data',D.data.filter(d=>d.p===p.id&&lateData(d)).length,'Blocks progress')}${metric('Open punch',openPunch(p).length,openPunch(p).filter(x=>x.cat==='A').length+' Cat A')}</div>
  <div class="content-grid"><section class="panel"><div class="panel-head"><h3>S-curve</h3><button class="btn tiny soft" onclick="go('report')">Weekly report</button></div>${scurve(p)}</section><section class="panel"><div class="panel-head"><h3>Action center</h3></div>${alertList()}</section></div>
  <div class="content-grid"><section class="panel"><h3>Milestones</h3>${milestoneTable(p)}</section><section class="panel"><h3>${p.type==='OTS'?'OTS quantities':'Quantities'}</h3>${countsPanel(p)}</section></div>
  <section class="panel"><div class="panel-head"><h3>Stages</h3><button class="btn tiny soft" onclick="go('stages')">Open</button></div>${stageCards(p)}</section>`;
}
function leadDash(p){
  const id = me().id, t = tasks(p);
  const team = (p.members||[]).map(user).filter(u=>['Engineer','Lead'].includes(u.role));
  return page('Lead', greeting()+', '+esc(me().name.split(' ')[0])+'.','Team workload, reviews, blockers and punch items.', canPlan(p)?'<button class="btn primary" onclick="taskForm()">＋ Task</button>':'')+
  `<div class="head-tools">${heads()}</div>`+heroInternal(p)+ragRow(p)+
  `<div class="metric-grid">${metric('Reviews for you',t.filter(x=>x.status==='Ready for Review'&&x.reviewer===id).length,'Approve or return')}${metric('Blocked',t.filter(x=>x.status==='Blocked').length,'Need help')}${metric('Overdue',t.filter(overdue).length,'Past due date')}${metric('Open punch',openPunch(p).length,openPunch(p).filter(x=>x.cat==='A').length+' Cat A')}</div>
  <div class="content-grid"><section class="panel"><div class="panel-head"><h3>Team workload</h3><button class="btn tiny soft" onclick="go('team')">Team</button></div>${team.map(u=>{const a=t.filter(x=>x.owner===u.id),open=a.filter(x=>x.status!=='Completed');return `<div class="load-row"><div><b>${esc(u.name)}</b><small>${esc(u.role)} · ${open.length} open · ${a.filter(overdue).length} overdue · ${openPunch(p).filter(x=>x.owner===u.id).length} punch</small></div><span>${sum(a,x=>x.actual)}/${sum(a,x=>x.plan)} h</span></div>`}).join('')||'<div class="empty">No engineers yet.</div>'}</section><section class="panel"><div class="panel-head"><h3>Action center</h3></div>${alertList()}</section></div>
  <div class="content-grid"><section class="panel"><h3>${p.type==='OTS'?'OTS quantities':'Quantities'}</h3>${countsPanel(p)}</section><section class="panel"><div class="panel-head"><h3>Punch list</h3><button class="btn tiny soft" onclick="go('punch')">Open</button></div>${punchSummary(p)}</section></div>`;
}
function engineerDash(p){
  const id = me().id, mine = tasks(p).filter(t=>t.owner===id), open = mine.filter(t=>t.status!=='Completed').sort((a,b)=>(a.due||'')<(b.due||'')?-1:1);
  const myPunch = openPunch(p).filter(x=>x.owner===id);
  return page('My work', greeting()+', '+esc(me().name.split(' ')[0])+'.','Your tasks and punch items. Submit for review when done.')+
  `<div class="head-tools">${heads()}</div>
  <section class="panel compact"><div class="row"><div><div class="eyebrow">${esc(p.code)}</div><b>${esc(p.name)}</b></div><b>${projectPct(p)}%</b></div>${bar(projectPct(p))}<small class="muted">Overall project progress</small></section>
  <div class="metric-grid">${metric('My open tasks',open.length,'Not completed')}${metric('Rework',mine.filter(t=>t.status==='Rework').length,'Returned by reviewer')}${metric('Due in 7 days',open.filter(t=>t.due&&t.due<=addDays(today(),7)).length,'Including overdue')}${metric('My punch items',myPunch.length,myPunch.filter(x=>x.cat==='A').length+' Cat A')}</div>
  <section class="panel"><div class="panel-head"><h3>Next up</h3></div>${taskCards(open)}</section>
  ${myPunch.length?`<section class="panel"><h3>My punch items</h3>${myPunch.map(punchCard).join('')}</section>`:''}`;
}
function latestPublished(p){ const r = D.reports[p.id]||{}; return Object.keys(r).filter(w=>r[w].frozen).sort().pop() }
function mcDash(p){
  const actions = alerts().filter(a=>a.h!=='Nothing urgent'), lp = latestPublished(p);
  return page('Main contractor', greeting()+'.','Progress against baseline, milestones, punch list and what we need from you.', switcher())+
  heroCustomer(p)+(p.baseline?'':'<div class="notice warn">Baseline not yet approved by the project team — planned figures are provisional.</div>')+
  `<div class="content-grid"><section class="panel"><div class="panel-head"><h3>Actions for you</h3></div>${actions.length?`<div class="action-list">${actions.map(x=>`<div class="action-item ${x.c||''}"><span>●</span><div><b>${esc(x.h)}</b><small>${esc(x.x)}</small></div></div>`).join('')}</div>`:'<div class="empty">Nothing needed from you.</div>'}</section>
  <section class="panel"><h3>Milestones</h3>${milestoneTable(p)}</section></div>
  <div class="content-grid"><section class="panel"><div class="panel-head"><h3>Punch list</h3><button class="btn tiny soft" onclick="go('punch')">Open</button></div>${punchSummary(p)}</section><section class="panel"><h3>${p.type==='OTS'?'OTS quantities':'Quantities'}</h3>${countsPanel(p)}</section></div>
  <section class="panel compact"><div class="row"><div><b>Weekly report</b><small class="muted block">${lp?'Latest: week of '+fmt(lp):'Not published yet'}</small></div>${lp?'<button class="btn tiny primary" onclick="go(\'report\')">Open</button>':''}</div></section>
  ${contact(p)}`;
}
function poDash(p){
  const actions = alerts().filter(a=>a.h!=='Nothing urgent'), lp = latestPublished(p), op = openPunch(p);
  return page('Plant owner', greeting()+'.','Progress, milestones and items that need your input.', switcher())+
  heroCustomer(p)+
  `<div class="content-grid"><section class="panel"><h3>Milestones</h3>${milestoneTable(p)}</section>
  <section class="panel"><h3>Actions for you</h3>${actions.length?`<div class="action-list">${actions.map(x=>`<div class="action-item ${x.c||''}"><span>●</span><div><b>${esc(x.h)}</b><small>${esc(x.x)}</small></div></div>`).join('')}</div>`:'<div class="empty">Nothing needed from you.</div>'}</section></div>
  <section class="panel"><h3>Acceptance status</h3><p>${op.length} open punch item(s): <b>${op.filter(x=>x.cat==='A').length}</b> category A, ${op.filter(x=>x.cat==='B').length} B, ${op.filter(x=>x.cat==='C').length} C.</p></section>
  <section class="panel compact"><div class="row"><div><b>Weekly report</b><small class="muted block">${lp?'Latest: week of '+fmt(lp):'Not published yet'}</small></div>${lp?'<button class="btn tiny primary" onclick="go(\'report\')">Open</button>':''}</div></section>
  ${contact(p)}`;
}
function contact(p){ const pm = user(p.pm); return `<section class="panel compact"><small class="muted">Project contact</small><br><b>${esc(pm.name)}</b> · Project Manager${pm.email?' · '+esc(pm.email):''}</section>` }

/* ---------- pages ---------- */
function tasksPage(){
  const p = project(); if(!p) return emptyWorkspace();
  const q = U.search.toLowerCase(), eng = role()==='Engineer';
  const list = shownTasks(p).filter(t=>(U.status==='All'||t.status===U.status)&&(!q||(t.title+' '+user(t.owner).name).toLowerCase().includes(q)));
  return page(esc(p.code), eng?'My work':'Tasks', eng?'Update hours, counts and status. Completed is set only by your reviewer.':'Plan work, owners, reviewers, dates, hours and quantities.', canPlan(p)?'<button class="btn primary" onclick="taskForm()">＋ Task</button>':'')+
  `<div class="head-tools">${heads()}</div><section class="panel"><div class="toolbar"><input class="field search-field" placeholder="Search" value="${esc(U.search)}" oninput="findT(this.value)"><select class="filter" onchange="setStatus(this.value)"><option>All</option>${STATUSES.map(x=>`<option ${U.status===x?'selected':''}>${x}</option>`).join('')}</select></div>${taskTable(list)}</section>`;
}
function projectsPage(){
  const a = visibleTyped();
  return page('Portfolio','Projects', isAdmin()?'Administrators archive, restore or permanently delete projects.':'Your projects.', canCreateProject()?'<button class="btn primary" onclick="projectForm()">＋ Project</button>':'')+
  `<div class="head-tools">${typeToggle()}</div><section class="panel">${a.map(p=>{const k=kpis(p),g=rags(p);return `<div class="user-row"><div><b>${esc(p.name)}</b><small>${esc(p.code+' · '+p.type+' · '+p.customer+' · '+p.status)}</small><div class="mini">${bar(k.pct)}</div><small>${k.pct}% earned · SPI ${r2(k.spi)}</small><span class="dots">${['schedule','budget','quality'].map(x=>`<i class="d ${g[x].c}"></i>`).join('')}</span></div><div class="actions"><button class="btn tiny ghost" onclick="pick('${p.id}')">Open</button>${canEditProject(p)?`<button class="btn tiny soft" onclick="projectForm('${p.id}')">Edit</button><button class="btn tiny soft" onclick="finishProject('${p.id}')">Finish</button>`:''}${isAdmin()?`<button class="btn tiny danger" onclick="archiveProject('${p.id}')">Archive</button>`:''}</div></div>`}).join('')||'<div class="empty">No active projects.</div>'}</section>`;
}
function stageBars(p){ return p.stages.filter(s=>!s.na).map(s=>{const z=stageState(p,s);return `<div class="bar-row"><span>${esc(s.name)}<small>${fmtS(s.start)} – ${fmtS(s.end)}${slip(p,s)>0?' · +'+slip(p,s)+' d':''}</small></span>${bar(z.pct)}<b>${z.pct}%</b></div>`}).join('') }
function stagesPage(){
  const p = project(); if(!p) return emptyWorkspace();
  if(isCust()) return page(esc(p.code),'Progress','Stage progress, baseline and forecast dates.', switcher())+`<section class="panel"><h3>Milestones</h3>${milestoneTable(p)}</section><section class="panel"><h3>Stages</h3>${stageBars(p)}</section>`;
  const s = stage(p,U.stageId) || p.stages[0], z = stageState(p,s), list = shownTasks(p).filter(t=>t.sid===s.id);
  return page(esc(p.code),'Stages','Stages can overlap. End dates are the forecast; the baseline stays fixed until re-baselined.', canPlan(p)?'<button class="btn primary" onclick="editStages()">Edit stages</button>':'')+
  `<div class="head-tools">${heads()}</div><section class="panel stage-detail"><aside class="stage-list">${p.stages.map(x=>{const y=stageState(p,x);return `<button class="${x.id===s.id?'active':''}" onclick="openStage('${x.id}')">${esc(x.name)}${x.milestone?' ◆':''}<br><small>${x.na?'N/A':y.pct+'%'} · ${y.label}</small></button>`}).join('')}</aside>
  <div><div class="panel-head"><div><h2>${esc(s.name)}${s.milestone?' <small class="muted">◆ gate</small>':''}</h2>${badge(z.label,z.c)}</div></div><p class="muted">Forecast ${fmt(s.start)} – ${fmt(s.end)}${blEnd(p,s)?` · baseline end ${fmt(blEnd(p,s))}${slip(p,s)?` (${slip(p,s)>0?'+':''}${slip(p,s)} d)`:''}`:''}</p>${bar(z.pct)}<p>${z.pct}% earned</p>${s.na?'<div class="empty">Not applicable.</div>':taskCards(list)}</div></section>`;
}
function reviewsPage(){
  const p = project(); if(!p) return emptyWorkspace();
  const a = tasks(p).filter(t=>t.status==='Ready for Review'), rw = tasks(p).filter(t=>t.status==='Rework');
  return page(esc(p.code),'Reviews','Only the assigned reviewer can approve. Approval is the only way a task becomes Completed.')+
  `<div class="head-tools">${heads()}</div><section class="panel"><h3>Waiting for review</h3>${a.map(t=>`<article class="review-card"><div class="row"><div><b>${esc(t.title)}</b><div class="meta">Assignee ${esc(user(t.owner).name)} · Reviewer ${esc(user(t.reviewer).name)}${qtyText(t)}</div></div>${(isAdmin()||t.reviewer===me().id)?`<button class="btn tiny primary" onclick="review('${t.id}')">Review</button>`:badge('Other reviewer')}</div></article>`).join('')||'<div class="empty">Nothing waiting.</div>'}</section>
  <section class="panel"><h3>In rework</h3>${taskCards(rw)}</section>`;
}
function queryCard(q){
  const c = isCust();
  return `<article class="query-card" onclick="openQuery('${q.id}')"><div class="row"><div><div class="eyebrow">${esc(q.kind+' · '+q.id+' · '+q.priority)}${!c?' · '+esc(Q_VIS[q.visibility]||q.visibility):''}</div><b>${esc(q.title)}</b><div class="meta">${c?'':'Owner '+esc(user(q.owner).name)+' · '}${q.due?'Due '+fmtS(q.due):'No due date'}</div></div>${badge(q.status,q.status==='Closed'?'green':q.status==='Awaiting customer'?'gold':'blue')}</div></article>`;
}
function queriesPage(){
  const p = project(); if(!p) return emptyWorkspace();
  let a = D.queries.filter(q=>q.p===p.id&&canSeeQuery(q));
  if(U.qFilter==='Active') a = a.filter(q=>q.status!=='Closed'); else if(U.qFilter==='Customer-facing') a = a.filter(q=>q.visibility!=='Internal'); else if(U.qFilter!=='All') a = a.filter(q=>q.visibility===U.qFilter||q.status===U.qFilter);
  const filters = isCust()?['Active','Awaiting customer','Closed','All']:['Active','Customer-facing','Internal','Closed','All'];
  return page(esc(p.code),'Queries & Issues', isCust()?'Questions between you and the project team.':'Each item is internal, shared with the main contractor, or shared with both customers.', '<button class="btn primary" onclick="queryForm()">＋ New</button>')+
  `<div class="head-tools">${heads()}</div><section class="panel"><div class="chips">${filters.map(f=>`<button class="chip ${U.qFilter===f?'on':''}" onclick="qf('${f}')">${f}</button>`).join('')}</div>${a.map(queryCard).join('')||'<div class="empty">No records.</div>'}</section>`;
}
function punchCard(x){
  const p = D.projects.find(q=>q.id===x.p), g = p && stage(p,x.gate);
  return `<article class="query-card" onclick="openPunch('${x.id}')"><div class="row"><div><div class="eyebrow">${esc(x.id)} · ${esc(g?g.name:'—')} · Category ${x.cat}</div><b>${esc(x.title)}</b><div class="meta">${isCust()?'':'Owner '+esc(user(x.owner).name)+' · '}Raised ${fmtS(x.at)} by ${esc(user(x.raisedBy).role===role()||!isCust()?user(x.raisedBy).name:'Project team')}</div></div>${badge(x.status,x.status==='Closed'?'green':x.status==='Fixed'?'gold':x.cat==='A'?'red':'blue')}</div></article>`;
}
function punchPage(){
  const p = project(); if(!p) return emptyWorkspace();
  let a = D.punch.filter(x=>x.p===p.id);
  if(U.gate!=='All') a = a.filter(x=>x.gate===U.gate);
  if(U.pStatus!=='All') a = a.filter(x=>U.pStatus==='Open'?x.status!=='Closed':x.status===U.pStatus);
  a.sort((x,y)=>x.cat<y.cat?-1:x.cat>y.cat?1:0);
  const canRaise = !isPO();
  return page(esc(p.code),'Punch list','Items found at MAT, FAT and SAT (or test/go-live for MES). A blocks the gate, B blocks start-up, C can close later.', canRaise?'<button class="btn primary" onclick="punchForm()">＋ Punch item</button>':'')+
  `<div class="head-tools">${heads()}</div><section class="panel">${punchSummary(p)}</section>
  <section class="panel"><div class="chips">${['All',...gates(p).map(g=>g.id)].map(g=>`<button class="chip ${U.gate===g?'on':''}" onclick="setGate('${g}')">${g==='All'?'All gates':esc(stage(p,g).name)}</button>`).join('')}</div>
  <div class="chips">${['Open','Fixed','Closed','All'].map(s=>`<button class="chip ${U.pStatus===s?'on':''}" onclick="setPS('${s}')">${s}</button>`).join('')}</div>${a.map(punchCard).join('')||'<div class="empty">No punch items.</div>'}</section>`;
}
function dataPage(){
  const p = project(); if(!p) return emptyWorkspace();
  const owed = isPO() ? 'Plant Owner' : '';
  return page(esc(p.code),'Customer data requests', isCust()?'Information the project team needs from you. Mark items as sent when you have shared them.':'P&IDs, heat & material balance, DCS database, graphics standards… Late data is the top OTS schedule risk.', !isCust()&&canPlan(p)?'<button class="btn primary" onclick="dataForm()">＋ Request</button>':'')+
  `<div class="head-tools">${heads()}</div><section class="panel">${dataList(p,owed)}</section>`;
}
function teamPage(){
  const p = project(); if(!p) return emptyWorkspace();
  const mem = (p.members||[]).map(user).filter(u=>u.id), internal = mem.filter(u=>!CUST.includes(u.role)), cust = mem.filter(u=>CUST.includes(u.role));
  const t = tasks(p), planner = canPlan(p);
  return page(esc(p.code),'Team','Who is on this project.', planner?'<button class="btn primary" onclick="memberForm()">＋ Add to project</button>':'')+
  `<div class="head-tools">${heads()}</div><section class="team-grid">${internal.map(u=>{const a=t.filter(x=>x.owner===u.id);return `<article class="person-card"><header><span class="person-avatar">${esc(initials(u.name))}</span><div><b>${esc(u.name)}</b><small>${esc(u.role)}${u.id===p.pm?' · PM of project':''}${u.status!=='Active'?' · inactive':''}</small></div>${planner&&u.id!==p.pm?`<button class="btn tiny ghost push" onclick="removeMember('${u.id}')">Remove</button>`:''}</header><div class="person-stats"><span><small>Open</small><strong>${a.filter(x=>x.status!=='Completed').length}</strong></span><span><small>Overdue</small><strong>${a.filter(overdue).length}</strong></span><span><small>Hours</small><strong>${sum(a,x=>x.actual)}/${sum(a,x=>x.plan)}</strong></span></div></article>`}).join('')||'<div class="empty">No team members.</div>'}</section>
  <section class="panel"><h3>Customer contacts</h3>${cust.map(u=>`<div class="user-row"><div><b>${esc(u.name)}</b><small>${esc(u.role+' · '+(u.org||'')+' · '+u.companyId)}</small></div>${planner?`<button class="btn tiny ghost" onclick="removeMember('${u.id}')">Remove</button>`:''}</div>`).join('')||'<div class="empty">Add the Main Contractor and Plant Owner so they can follow progress.</div>'}</section>`;
}
function peoplePage(){
  const roles = canAddRoles(), list = D.users.filter(u=>isAdmin()||['Engineer',...CUST].includes(u.role));
  const group = r => { const a = list.filter(u=>u.role===r); return a.length?`<div class="eyebrow pad">${r}</div>`+a.map(u=>`<div class="user-row"><div><b>${esc(u.name)}</b><small>${esc([u.companyId,u.org,u.email].filter(Boolean).join(' · '))}${u.status!=='Active'?' · inactive':''}</small><small>${esc(D.projects.filter(p=>p.pm===u.id||(p.members||[]).includes(u.id)).map(p=>p.code).join(', ')||'No project')}</small></div>${u.id!=='admin'&&roles.includes(u.role)?`<button class="btn tiny soft" onclick="personForm('${u.id}')">Edit</button>`:''}</div>`).join(''):'' };
  return page('People','People', isAdmin()?'Administrator adds Project Managers and Leads. PMs and Leads add Engineers, Main Contractors and Plant Owners.':'You can add Engineers, Main Contractor and Plant Owner contacts.', roles.length?'<button class="btn primary" onclick="personForm()">＋ Add person</button>':'')+
  `<section class="panel">${ROLES.map(group).join('')||'<div class="empty">No people yet.</div>'}</section>`;
}
function archivePage(){
  return page('Administrator','Archived projects','Restore or permanently delete.')+`<section class="panel">${D.archive.map(p=>`<div class="user-row"><div><b>${esc(p.name)}</b><small>${esc(p.code+' · '+(p.archived?.reason||''))}</small></div><div class="actions"><button class="btn tiny primary" onclick="restore('${p.id}')">Restore</button><button class="btn tiny danger" onclick="deleteForever('${p.id}')">Delete</button></div></div>`).join('')||'<div class="empty">No archived projects.</div>'}</section>`;
}
function demoPanel(){
  const has = D.users.some(u=>u.demo);
  return `<section class="panel"><div class="panel-head"><h3>Demo data</h3>${has?badge('Loaded','gold'):''}</div><p class="muted">${has?'Demo people and 2 demo projects are loaded. Removing them keeps everything you created yourself.':'Loads 1 OTS and 1 MES demo project with PM, Lead, Engineers, Main Contractor and Plant Owners, so you can switch roles and see every view.'}</p>${has?'<button class="btn danger" onclick="removeDemo()">Remove demo data</button>':'<button class="btn primary" onclick="loadDemo()">Load demo (1 OTS + 1 MES)</button>'}</section>`;
}
function adminPage(){
  return page('Administrator','Settings','Demo data, backup, audit and app access.')+
  `<div class="admin-layout"><div>${demoPanel()}<section class="panel"><h3>Backup</h3><p class="muted">Data lives only in this browser. Download a backup regularly.</p><div class="actions">${EMBED?'':'<button class="btn soft" onclick="backup()">Download backup</button>'}<button class="btn ghost" onclick="auditLog()">Audit log</button></div></section>
  <section class="panel danger-zone"><h3>Start fresh</h3><p class="muted">Deletes all people except Administrator, and all projects, tasks, punch items, data requests and reports on this device.</p><button class="btn danger" onclick="startFresh()">Start fresh</button></section></div>
  <section class="panel"><h3>Open on a phone</h3><div class="qr-wrap"><div id="qr-admin" class="qr-box">QR</div><p class="muted">Scan to open the app, then "Add to Home Screen". No App Store needed.</p></div></section></div>`;
}
function alertsPage(){ return page('Action center','Alerts','Items for your role.')+`<section class="panel">${alertList()}</section>` }
function morePage(){
  const v = (ALLOWED[role()]||[]).filter(x=>!(NAV[role()]||[]).includes(x)&&x!=='more');
  return page('Menu','More','')+`<section class="panel more-grid">${v.map(x=>`<button class="more-btn" onclick="go('${x}')"><span>${ICON[x]}</span>${label(x)}</button>`).join('')}</section>
  <section class="panel compact"><small class="muted">Signed in as</small><br><b>${esc(me().name)}</b> · ${esc(role())}<br><button class="btn ghost full" onclick="profile()">Switch demo user</button></section>`;
}

/* ---------- weekly report ---------- */
const AUD = {mgmt:'Management', eng:'Engineering leads', mc:'Main contractor', po:'Plant owner'};
function inputs(p,wk){ const r = D.reports[p.id] = D.reports[p.id]||{}; return r[wk] = r[wk] || {narrative:'',custNarrative:'',decisions:'',custActions:'',risks:'',nextWeek:''} }
function lines(s){ return String(s||'').split('\n').map(x=>x.trim()).filter(Boolean) }
function list(s, empty){ const a = lines(s); return a.length ? `<ul class="rlist">${a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="muted">${empty}</p>` }
function reportBody(p, aud, inp){
  const k = kpis(p), internal = aud==='mgmt'||aud==='eng', cust = aud==='mc'||aud==='po';
  const owedBy = aud==='mc' ? 'Main Contractor' : aud==='po' ? 'Plant Owner' : '';
  const qWait = D.queries.filter(q=>q.p===p.id&&q.status==='Awaiting customer'&&(aud==='mc'?q.visibility!=='Internal':aud==='po'?q.visibility==='All customers':false));
  const dataOwed = D.data.filter(d=>d.p===p.id&&d.status==='Requested'&&(aud==='mc'||d.owedBy===owedBy));
  const op = openPunch(p), nextDue = tasks(p).filter(t=>t.status!=='Completed'&&t.due&&t.due<=addDays(today(),7));
  let h = `<div class="r-head"><div><div class="eyebrow">${esc(p.type+' · '+p.code)} · Weekly report · ${AUD[aud]}</div><h2>${esc(p.name)}</h2><small class="muted">Week of ${fmt(weekStart(today()))} · status date ${fmt(today())} · ${p.baseline?'baseline '+p.baseline.n+' ('+fmtS(p.baseline.at)+')':'<b>provisional – no approved baseline</b>'}</small></div></div>`;
  h += internal ? ragRow(p) : ragRow(p,['Schedule']);
  h += `<div class="kpi-row"><div><small>Earned</small><b>${k.pct}%</b></div><div><small>Planned</small><b>${k.ppct}%</b></div><div><small>Variance</small><b class="${k.pct-k.ppct<0?'neg':''}">${k.pct-k.ppct>0?'+':''}${k.pct-k.ppct} pts</b></div>${internal?`<div><small>SPI</small><b>${r2(k.spi)}</b></div><div><small>CPI</small><b>${r2(k.cpi)}</b></div><div><small>Hours</small><b>${k.ac} / ${Math.round(k.bac)}</b><small>${k.eac?'forecast '+Math.round(k.eac):''}</small></div>`:''}</div>`;
  h += `<h3>Summary</h3>${(internal?lines(inp.narrative):lines(inp.custNarrative)).length?`<p>${esc(internal?inp.narrative:inp.custNarrative).replace(/\n/g,'<br>')}</p>`:'<p class="muted">No summary written for this week.</p>'}`;
  if(internal){ h += `<h3>Decisions needed</h3>${list(inp.decisions,'None this week.')}<h3>Top risks</h3>${list(inp.risks,'None recorded.')}` }
  if(cust){ h += `<h3>Actions needed from you</h3>${list(inp.custActions,'')}${dataOwed.map(d=>`<p class="ritem">${lateData(d)?badge('Late','red'):badge('Data','blue')} ${esc(d.title)} · needed ${fmtS(d.needed)}</p>`).join('')}${qWait.map(q=>`<p class="ritem">${badge('Query','gold')} ${esc(q.title)}</p>`).join('')}${!lines(inp.custActions).length&&!dataOwed.length&&!qWait.length?'<p class="muted">Nothing needed from you this week.</p>':''}` }
  h += `<h3>Milestones</h3>${milestoneTable(p)}`;
  if(aud==='eng'||aud==='mc'||aud==='mgmt') h += `<h3>S-curve</h3>${scurve(p)}`;
  if(aud==='eng') h += `<h3>Weekly progress</h3>${weekBars(p)}`;
  if(aud!=='mgmt' && aud!=='po') h += `<h3>${p.type==='OTS'?'OTS quantities':'Quantities'}</h3>${countsPanel(p)}`;
  h += `<h3>Punch list</h3>${aud==='po'?`<p>${op.length} open: ${op.filter(x=>x.cat==='A').length} A · ${op.filter(x=>x.cat==='B').length} B · ${op.filter(x=>x.cat==='C').length} C</p>`:punchSummary(p)}`;
  if(aud==='mc') h += op.filter(x=>x.cat!=='C').map(x=>`<p class="ritem">${badge(x.cat,x.cat==='A'?'red':'gold')} ${esc(x.title)} · ${esc(x.status)}</p>`).join('');
  if(aud==='eng'){
    h += `<h3>Customer data</h3>${D.data.filter(d=>d.p===p.id&&d.status!=='Received').map(d=>`<p class="ritem">${lateData(d)?badge('Late','red'):badge(d.status,'blue')} ${esc(d.title)} · ${esc(d.owedBy)} · ${fmtS(d.needed)}</p>`).join('')||'<p class="muted">All data received.</p>'}`;
    h += `<h3>Blocked / overdue</h3>${tasks(p).filter(t=>t.status==='Blocked'||overdue(t)).map(t=>`<p class="ritem">${badge(t.status,sColor(t.status))} ${esc(t.title)} · ${esc(user(t.owner).name)} · due ${fmtS(t.due)}</p>`).join('')||'<p class="muted">None.</p>'}`;
    h += `<h3>Due in the next 7 days</h3>${nextDue.map(t=>`<p class="ritem">${esc(t.title)} · ${esc(user(t.owner).name)} · ${fmtS(t.due)}</p>`).join('')||'<p class="muted">None.</p>'}`;
  }
  h += `<h3>Next week</h3>${list(inp.nextWeek,'Not written.')}`;
  return h;
}
function reportText(p, aud, inp){
  const k = kpis(p), r = rags(p), internal = aud==='mgmt'||aud==='eng', L = [];
  L.push(`${p.name} (${p.code}) — weekly report, week of ${fmt(weekStart(today()))}`);
  L.push(p.baseline ? `Baseline ${p.baseline.n} approved ${fmt(p.baseline.at)}` : 'Provisional: baseline not approved');
  L.push('');
  L.push(internal ? `Schedule: ${r.schedule.label} (${r.schedule.why}) | Hours: ${r.budget.label} (${r.budget.why}) | Quality: ${r.quality.label} (${r.quality.why})` : `Schedule: ${r.schedule.label}`);
  L.push(`Progress: ${k.pct}% earned vs ${k.ppct}% planned${internal?` | SPI ${r2(k.spi)} | CPI ${r2(k.cpi)} | ${k.ac}/${Math.round(k.bac)} h`:''}`);
  L.push(''); L.push('Summary'); L.push((internal?inp.narrative:inp.custNarrative)||'—');
  if(internal){ L.push(''); L.push('Decisions needed'); lines(inp.decisions).forEach(x=>L.push('• '+x)); L.push(''); L.push('Top risks'); lines(inp.risks).forEach(x=>L.push('• '+x)) }
  else { L.push(''); L.push('Actions needed from you'); lines(inp.custActions).forEach(x=>L.push('• '+x)); D.data.filter(d=>d.p===p.id&&d.status==='Requested'&&(aud==='mc'||d.owedBy==='Plant Owner')).forEach(d=>L.push(`• ${d.title} (needed ${fmt(d.needed)})`)) }
  L.push(''); L.push('Milestones'); gates(p).forEach(s=>{ const sl=slip(p,s); L.push(`• ${s.name}: ${stagePct(p,s)===100?'achieved '+fmt(s.doneAt):'forecast '+fmt(s.end)}${blEnd(p,s)?` (baseline ${fmt(blEnd(p,s))}${sl?`, ${sl>0?'+':''}${sl} d`:''})`:''}`) });
  const op = openPunch(p); L.push(''); L.push(`Punch list: ${op.length} open (A ${op.filter(x=>x.cat==='A').length}, B ${op.filter(x=>x.cat==='B').length}, C ${op.filter(x=>x.cat==='C').length})`);
  if(lines(inp.nextWeek).length){ L.push(''); L.push('Next week'); lines(inp.nextWeek).forEach(x=>L.push('• '+x)) }
  return L.join('\n');
}
function reportPage(){
  const p = project(); if(!p) return emptyWorkspace();
  const wk = weekStart(today());
  if(isCust()){
    const aud = isMC()?'mc':'po', r = D.reports[p.id]||{}, weeks = Object.keys(r).filter(w=>r[w].frozen&&r[w].frozen[aud]).sort().reverse();
    const w = weeks.includes(U.week) ? U.week : weeks[0];
    return page(esc(p.code),'Weekly report','Published by the project team.', switcher())+
    (w?`<div class="chips">${weeks.slice(0,8).map(x=>`<button class="chip ${x===w?'on':''}" onclick="setWeek('${x}')">${fmtS(x)}</button>`).join('')}</div><section class="panel report">${r[w].frozen[aud]}</section>${EMBED?'':'<div class="actions"><button class="btn ghost" onclick="window.print()">Print / PDF</button></div>'}`:'<section class="panel"><div class="empty">No report published yet.</div></section>');
  }
  const aud = AUD[U.audience] ? U.audience : (role()==='Engineer'?'eng':'mgmt'), inp = inputs(p,wk), rec = (D.reports[p.id]||{})[wk];
  const pub = rec && rec.frozen;
  return page(esc(p.code),'Weekly report','One report, four audiences. Customers never see hours, CPI, internal risks or decisions.', canPlan(p)?'<button class="btn soft" onclick="reportInputs()">Write this week</button>':'')+
  `<div class="head-tools">${heads()}</div>${baselineNotice(p)}
  <div class="chips">${Object.keys(AUD).map(a=>`<button class="chip ${a===aud?'on':''}" onclick="setAud('${a}')">${AUD[a]}</button>`).join('')}</div>
  <section class="panel report">${reportBody(p,aud,inp)}</section>
  <div class="actions sticky-actions"><button class="btn ghost" onclick="copyReport('${aud}')">Copy as e-mail text</button>${EMBED?'':'<button class="btn ghost" onclick="window.print()">Print / PDF</button><button class="btn ghost" onclick="exportExcel()">Excel</button>'}${canEditProject(p)?`<button class="btn primary" onclick="publishReport()">${pub?'Re-publish':'Publish'} to customers</button>`:''}</div>
  ${pub?`<p class="muted small">Published to customers ${fmt(pub.at)} by ${esc(pub.by)}.</p>`:''}`;
}

/* ---------- render ---------- */
function body(){
  if(!allowed(U.view)) U.view = 'dashboard';
  const fn = {dashboard,projects:projectsPage,tasks:tasksPage,stages:stagesPage,reviews:reviewsPage,queries:queriesPage,team:teamPage,report:reportPage,people:peoplePage,archive:archivePage,admin:adminPage,alerts:alertsPage,more:morePage,punch:punchPage,data:dataPage}[U.view] || dashboard;
  return `${top()}<div class="layout">${side()}<main class="workspace">${fn()}</main></div>${bottom()}`;
}
function render(){ $('app').innerHTML = body(); drawQR('qr-admin') }
function drawQR(id){ const el=$(id); if(!el||typeof qrcode!=='function') return; try{ const q=qrcode(0,'M'); q.addData(new URL('./app.html',location.href).href); q.make(); el.innerHTML=q.createImgTag(4,1) }catch(e){} }

/* ---------- navigation ---------- */
window.go = v => { U.view = v; render(); window.scrollTo(0,0) };
window.pick = (id,stay) => { U.projectId = id; U.stageId = ''; U.gate='All'; const p = D.projects.find(x=>x.id===id); if(p) U.type = p.type; if(!stay) U.view = 'dashboard'; render() };
window.setType = t => { U.type = t; U.projectId = ''; U.stageId=''; U.gate='All'; render() };
window.openStage = id => { U.stageId = id; U.view = 'stages'; render() };
window.findT = v => { U.search = v; render(); const f=document.querySelector('.search-field'); if(f){ f.focus(); f.setSelectionRange(v.length,v.length) } };
window.setStatus = v => { U.status = v; render() };
window.searchAll = v => { U.search = v; U.view = 'tasks'; render() };
window.qf = v => { U.qFilter = v; render() };
window.setGate = v => { U.gate = v; render() };
window.setPS = v => { U.pStatus = v; render() };
window.setAud = v => { U.audience = v; render() };
window.setWeek = v => { U.week = v; render() };
window.profile = () => {
  const opts = ROLES.map(r=>{const a=D.users.filter(u=>u.role===r&&u.status==='Active');return a.length?`<optgroup label="${r}">${a.map(u=>`<option value="${u.id}" ${u.id===D.session?'selected':''}>${esc(u.name)}</option>`).join('')}</optgroup>`:''}).join('');
  modal('Switch user','Demo only. Production uses company e-mail sign-in.',`<select id="who" class="field">${opts}</select>`,`<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="switchUser()">Continue</button>`);
};
window.switchUser = () => { D.session = $('who').value; save(); closeModal(); U = {view:'dashboard',projectId:'',stageId:'',search:'',status:'All',qFilter:'Active',type:'',audience:'',week:'',gate:'All',pStatus:'Open'}; render() };

/* ---------- people ---------- */
window.personForm = id => {
  const u = id ? user(id) : null, roles = canAddRoles();
  if(!roles.length) return note('You cannot add people.');
  const projs = visible().filter(p=>canPlan(p)), r0 = u?.role || roles[0], isC = r => CUST.includes(r);
  modal(u?'Edit person':'Add person', isAdmin()?'Administrator adds PMs and Leads; PMs and Leads add Engineers and customer contacts.':'You can add Engineers, Main Contractor and Plant Owner contacts.',
  `<div class="form-grid"><div class="form-group"><label>Role</label><select id="urole" class="field" onchange="const c=['Main Contractor','Plant Owner'].includes(this.value);document.getElementById('orgbox').style.display=c?'flex':'none';document.getElementById('idlbl').textContent=c?'Customer ID':'Company ID'">${roles.map(r=>`<option ${r0===r?'selected':''}>${r}</option>`).join('')}</select></div>
  <div class="form-group"><label>Name</label><input id="uname" class="field" value="${esc(u?.name||'')}"></div>
  <div class="form-group"><label id="idlbl">${isC(r0)?'Customer ID':'Company ID'}</label><input id="ucid" class="field" value="${esc(u?.companyId||'')}"></div>
  <div class="form-group"><label>E-mail</label><input id="uemail" type="email" class="field" value="${esc(u?.email||'')}"></div>
  <div class="form-group" id="orgbox" style="display:${isC(r0)?'flex':'none'}"><label>Organisation</label><input id="uorg" class="field" value="${esc(u?.org||'')}"></div>
  ${!u&&projs.length?`<div class="form-group"><label>Add to project</label><select id="uproj" class="field"><option value="">— none —</option>${projs.map(p=>`<option value="${p.id}" ${project()&&project().id===p.id?'selected':''}>${esc(p.code)}</option>`).join('')}</select></div>`:''}
  ${u?`<div class="form-group"><label>Status</label><select id="ustatus" class="field"><option ${u.status==='Active'?'selected':''}>Active</option><option ${u.status==='Inactive'?'selected':''}>Inactive</option></select></div>`:''}</div>`,
  `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="savePerson('${u?.id||''}')">Save</button>`);
};
window.savePerson = id => {
  const name = $('uname').value.trim(), cid = $('ucid').value.trim(), r = $('urole').value;
  if(!name || !cid) return note('Name and ID are required.');
  if(D.users.some(x=>x.companyId.toLowerCase()===cid.toLowerCase() && x.id!==id)) return note('That ID is already used.');
  if(!canAddRoles().includes(r)) return note('You cannot assign that role.');
  const u = id ? user(id) : {id:uid('u'), status:'Active'};
  Object.assign(u, {name, companyId:cid, role:r, email:$('uemail').value.trim(), org:CUST.includes(r)?$('uorg').value.trim():''});
  if($('ustatus')) u.status = $('ustatus').value;
  if(!id){ D.users.push(u); const pid = $('uproj')&&$('uproj').value; if(pid) addMember(D.projects.find(p=>p.id===pid), u.id) }
  log((id?'Updated ':'Added ')+r+' '+name); closeModal(); render();
};
window.memberForm = () => {
  const p = project(); if(!canPlan(p)) return;
  const cand = D.users.filter(u=>u.status==='Active'&&u.role!=='Administrator'&&u.id!==p.pm&&!(p.members||[]).includes(u.id)&&(isAdmin()||role()==='Project Manager'||['Engineer',...CUST].includes(u.role)));
  modal('Add to project',p.code, cand.length?`<select id="mem" class="field">${cand.map(u=>`<option value="${u.id}">${esc(u.name+' · '+u.role)}</option>`).join('')}</select>`:'<div class="empty">Everyone available is already on this project.</div>',
  `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn soft" onclick="closeModal();personForm()">＋ New person</button>${cand.length?'<button class="btn primary" onclick="saveMember()">Add</button>':''}`);
};
window.saveMember = () => { const p = project(); addMember(p, $('mem').value); log('Added '+user($('mem').value).name+' to '+p.code); closeModal(); render() };
window.removeMember = id => {
  const p = project(); if(!canPlan(p)) return;
  if(tasks(p).some(t=>t.status!=='Completed'&&(t.owner===id||t.reviewer===id)) || openPunch(p).some(x=>x.owner===id)) return note('Reassign this person’s open tasks and punch items first.');
  p.members = (p.members||[]).filter(x=>x!==id); log('Removed '+user(id).name+' from '+p.code); render();
};

/* ---------- projects & baseline ---------- */
function makeStages(type,start,end){
  const names = type==='MES'?MES:OTS, n = names.length, span = Math.max(1, days(start,end)), unit = span/(n+2);
  return names.map((name,i)=>({id:'s'+i, name, start:addDays(start,Math.round(i*unit)), end:addDays(start,Math.round((i+3)*unit)), milestone:MILESTONES[type].includes(name), na:false}));
}
window.projectForm = id => {
  if(!canCreateProject() && !id) return;
  const old = id ? D.projects.find(p=>p.id===id) : null;
  const pms = D.users.filter(u=>u.status==='Active'&&u.role==='Project Manager'), leads = D.users.filter(u=>u.status==='Active'&&u.role==='Lead');
  if(!old && isAdmin() && !pms.length) return note('Add a Project Manager first (People).');
  const pmSel = old?.pm || (role()==='Project Manager'?me().id:''), t0 = today();
  modal(old?'Edit project':'New project','Stage dates are generated and can be edited in Stages. Approve the baseline once the plan is ready.',
  `<div class="form-grid">${old?'':`<div class="form-group"><label>Type</label><select id="ptype" class="field"><option>OTS</option><option>MES</option></select></div>`}
  <div class="form-group"><label>Code (optional)</label><input id="pcode" class="field" value="${esc(old?.code||'')}"></div>
  <div class="form-group full"><label>Project name</label><input id="pname" class="field" value="${esc(old?.name||'')}"></div>
  <div class="form-group"><label>Customer (plant)</label><input id="pcust" class="field" value="${esc(old?.customer||'')}"></div>
  <div class="form-group"><label>Location</label><input id="ploc" class="field" value="${esc(old?.location||'')}"></div>
  <div class="form-group"><label>Start</label><input id="pstart" type="date" class="field" value="${old?.start||t0}"></div>
  <div class="form-group"><label>End</label><input id="pend" type="date" class="field" value="${old?.end||addDays(t0,180)}"></div>
  <div class="form-group"><label>Budget hours</label><input id="pbud" type="number" min="0" class="field" value="${old?.budget||0}"></div>
  <div class="form-group"><label>Project Manager</label><select id="ppm" class="field" ${role()==='Project Manager'&&!isAdmin()?'disabled':''}>${pms.map(u=>`<option value="${u.id}" ${u.id===pmSel?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div>
  <div class="form-group"><label>Lead</label><select id="plead" class="field"><option value="">— later —</option>${leads.map(u=>`<option value="${u.id}" ${(old?.members||[]).includes(u.id)?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div>${old?'':`<div class="form-group full"><label><input type="checkbox" id="pdesign" checked> OTS: add the Design &amp; Review tasks (${OTS_DESIGN.length}, editable)</label></div>`}</div>`,
  `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveProject('${old?.id||''}')">Save</button>`);
};
function addDesignChecklist(p){
  const s = p.stages.find(x=>x.name==='Design & Review'); if(!s) return 0;
  const lead = (p.members||[]).find(m=>user(m).role==='Lead'), owner = lead || p.pm, reviewer = lead ? p.pm : 'admin';
  OTS_DESIGN.forEach(title=>D.tasks.push({id:sid('T-'), p:p.id, sid:s.id, title, owner, reviewer, start:s.start, due:s.end, plan:0, actual:0, status:'Not Started', location:'', notes:[], qty:null}));
  return OTS_DESIGN.length;
}
window.saveProject = id => {
  const name = $('pname').value.trim(), start = $('pstart').value, end = $('pend').value;
  if(!name) return note('Enter a project name.');
  if(!start || !end || end<=start) return note('End date must be after start date.');
  const pm = $('ppm').value; if(!pm) return note('Choose a Project Manager.');
  let p = id ? D.projects.find(x=>x.id===id) : null;
  if(!p){
    const type = $('ptype').value;
    const code = $('pcode').value.trim() || `${type}-${String(new Date().getFullYear()).slice(-2)}-${String(D.projects.length+D.archive.length+1).padStart(3,'0')}`;
    p = {id:uid('p'), type, code, status:'Active', stages:makeStages(type,start,end), members:[]};
    D.projects.push(p);
  } else if($('pcode').value.trim()) p.code = $('pcode').value.trim();
  Object.assign(p, {name, customer:$('pcust').value.trim()||'TBD', location:$('ploc').value.trim()||'TBD', start, end, budget:Number($('pbud').value)||0, pm});
  addMember(p, pm); addMember(p, $('plead').value);
  if(!id && p.type==='OTS' && $('pdesign') && $('pdesign').checked) addDesignChecklist(p);
  snap(p); log((id?'Updated ':'Created ')+p.code); U.projectId = p.id; U.type = p.type; closeModal(); U.view='dashboard'; render();
};
function takeBaseline(p, by, reason){
  const n = p.baseline ? p.baseline.n+1 : 1;
  p.baselines = p.baselines||[]; if(p.baseline) p.baselines.push({n:p.baseline.n, at:p.baseline.at, by:p.baseline.by, reason:p.baseline.reason, bac:Math.round(bac(p))});
  const tk = {}; liveTasks(p).forEach(t=>tk[t.id]={start:t.start, due:t.due, plan:t.plan});
  const st = {}; p.stages.forEach(s=>st[s.id]={start:s.start, end:s.end});
  p.baseline = {n, at:new Date().toISOString(), by, reason:reason||'', tasks:tk, stages:st};
}
window.approveBaseline = () => {
  const p = project(); if(!canEditProject(p)) return note('Only the project’s PM or the Administrator can approve the baseline.');
  if(!liveTasks(p).length) return note('Add tasks with dates and hours first.');
  const re = !!p.baseline;
  modal(re?'Re-baseline':'Approve baseline', p.code, `<p>${re?`Replaces baseline ${p.baseline.n}. The old baseline is kept in the history and the change is logged.`:'Freezes today’s task dates, planned hours and stage dates. From now on, slips show against this plan.'}</p><p><b>${liveTasks(p).length}</b> tasks · <b>${sum(liveTasks(p),weight)}</b> planned hours</p>${re?'<textarea id="blr" class="field" placeholder="Reason for re-baselining (required)"></textarea>':''}`,
  `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="confirmBaseline()">${re?'Re-baseline':'Approve'}</button>`);
};
window.confirmBaseline = () => {
  const p = project(), r = $('blr') ? $('blr').value.trim() : '';
  if(p.baseline && !r) return note('Give a reason for re-baselining.');
  takeBaseline(p, me().name, r); snap(p); log(`Baseline ${p.baseline.n} approved for ${p.code}${r?': '+r:''}`); closeModal(); render(); note('Baseline approved.');
};
window.finishProject = id => {
  const p = D.projects.find(x=>x.id===id); if(!canEditProject(p)) return;
  const ot = tasks(p).filter(t=>t.status!=='Completed').length, oq = D.queries.filter(q=>q.p===id&&q.status!=='Closed').length, opn = openPunch(p).filter(x=>x.cat!=='C').length;
  if(ot||oq||opn) return note(`Cannot finish: ${ot} open task(s), ${oq} open query/issue(s), ${opn} open A/B punch item(s).`);
  p.status = 'Completed'; log('Finished '+p.code); render();
};
window.archiveProject = id => {
  if(!isAdmin()) return; const p = D.projects.find(x=>x.id===id);
  ask('Archive '+p.code, 'The project moves to the archive. An Administrator can restore it.', {input:'Archive reason', ok:'Archive', danger:true}, reason => {
  p.archived = {at:new Date().toISOString(), by:me().name, reason:reason||'No reason recorded'};
  D.archive.push(p); D.projects = D.projects.filter(x=>x.id!==id); log('Archived '+p.code); U.projectId=''; U.view='archive'; render(); });
};
window.restore = id => { const p = D.archive.find(x=>x.id===id); D.archive = D.archive.filter(x=>x.id!==id); delete p.archived; D.projects.push(p); log('Restored '+p.code); U.projectId=p.id; U.view='projects'; render() };
window.deleteForever = id => {
  const p = D.archive.find(x=>x.id===id); ask('Delete '+p.code+' permanently', 'This cannot be undone. Type <b>DELETE '+esc(p.code)+'</b> to confirm.', {input:'DELETE '+p.code, match:'DELETE '+p.code, ok:'Delete', danger:true}, () => {
  D.archive = D.archive.filter(x=>x.id!==id); ['tasks','queries','punch','data'].forEach(k=>D[k]=D[k].filter(t=>t.p!==id)); delete D.weekly[id]; delete D.reports[id];
  log('Permanently deleted '+p.code); render(); });
};

/* ---------- stages ---------- */
window.editStages = () => {
  const p = project(); if(!canPlan(p)) return;
  modal('Edit stages', p.code+' · dates here are the forecast; the baseline does not change', p.stages.map(s=>`<div class="stage-edit"><input class="field" id="sn_${s.id}" value="${esc(s.name)}"><div class="se-row"><input type="date" class="field" id="ss_${s.id}" value="${s.start||''}"><input type="date" class="field" id="se_${s.id}" value="${s.end||''}"></div><div class="se-row"><label><input type="checkbox" id="sm_${s.id}" ${s.milestone?'checked':''}> Gate / milestone</label><label><input type="checkbox" id="sa_${s.id}" ${s.na?'checked':''}> Not applicable</label>${blEnd(p,s)?`<small class="muted">baseline end ${fmtS(blEnd(p,s))}</small>`:''}</div></div>`).join(''),
  '<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveStages()">Save</button>');
};
window.saveStages = () => {
  const p = project();
  for(const s of p.stages){ const a=$('ss_'+s.id).value, b=$('se_'+s.id).value; if(a&&b&&b<a) return note(s.name+': end is before start.') }
  p.stages.forEach(s=>{ const n=$('sn_'+s.id).value.trim(); if(n) s.name=n; s.start=$('ss_'+s.id).value; s.end=$('se_'+s.id).value; s.milestone=$('sm_'+s.id).checked; s.na=$('sa_'+s.id).checked });
  snap(p); log('Edited stages '+p.code); closeModal(); render();
};

/* ---------- tasks ---------- */
window.taskForm = id => {
  const t = id ? D.tasks.find(x=>x.id===id) : null, p = t ? D.projects.find(x=>x.id===t.p) : project();
  if(!canPlan(p)) return note('Only the PM or a Lead on this project can plan tasks.');
  const people = D.users.filter(u=>u.status==='Active'&&['Engineer','Lead','Project Manager'].includes(u.role));
  const reviewers = D.users.filter(u=>u.status==='Active'&&['Lead','Project Manager','Administrator'].includes(u.role));
  const sts = STATUSES.filter(s=>s!=='Completed'||t?.status==='Completed'), st = p.stages.filter(s=>!s.na), s0 = t ? stage(p,t.sid) : (stage(p,U.stageId)||st[0]);
  const defRev = t ? t.reviewer : ((p.members||[]).find(m=>user(m).role==='Lead')||p.pm);
  modal(t?'Edit task':'New task', p.code+' · assigning someone adds them to the project',
  `<div class="form-grid"><div class="form-group full"><label>Task</label><input id="ttitle" class="field" value="${esc(t?.title||'')}"></div>
  <div class="form-group"><label>Stage</label><select id="tstage" class="field">${st.map(s=>`<option value="${s.id}" ${s0&&s0.id===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
  <div class="form-group"><label>Status</label><select id="tstatus" class="field">${sts.map(s=>`<option ${(t?.status||'Not Started')===s?'selected':''}>${s}</option>`).join('')}</select></div>
  <div class="form-group"><label>Assignee</label><select id="towner" class="field">${people.map(u=>`<option value="${u.id}" ${t?.owner===u.id?'selected':''}>${esc(u.name+' · '+u.role)}</option>`).join('')}</select></div>
  <div class="form-group"><label>Reviewer</label><select id="trev" class="field">${reviewers.map(u=>`<option value="${u.id}" ${defRev===u.id?'selected':''}>${esc(u.name+' · '+u.role)}</option>`).join('')}</select></div>
  <div class="form-group"><label>Start</label><input id="tstart" type="date" class="field" value="${t?.start||s0?.start||p.start}"></div>
  <div class="form-group"><label>Due</label><input id="tdue" type="date" class="field" value="${t?.due||s0?.end||p.end}"></div>
  <div class="form-group"><label>Planned hours</label><input id="tplan" type="number" min="0" class="field" value="${t?.plan||0}"></div>
  <div class="form-group"><label>Actual hours</label><input id="tact" type="number" min="0" class="field" value="${t?.actual||0}"></div>
  <div class="form-group"><label>Quantity measured (optional)</label><select id="qunit" class="field"><option value="">— none (status-based) —</option>${(UNITS[p.type]||[]).map(u=>`<option ${t?.qty?.unit===u?'selected':''}>${u}</option>`).join('')}</select></div>
  <div class="form-group"><label>Quantity: target / done</label><div class="se-row"><input id="qtarget" type="number" min="0" class="field" placeholder="target" value="${t?.qty?.target||''}"><input id="qdone" type="number" min="0" class="field" placeholder="done" value="${t?.qty?.done||''}"></div></div>
  <div class="form-group full"><label>Work location / link</label><input id="tloc" class="field" value="${esc(t?.location||'')}" placeholder="SharePoint or folder link"></div></div>`,
  `${t?`<button class="btn danger" onclick="deleteTask('${t.id}')">Delete</button>`:''}<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveTask('${t?.id||''}')">Save</button>`);
};
window.saveTask = id => {
  const title = $('ttitle').value.trim(); if(!title) return note('Enter a task name.');
  const owner = $('towner').value, reviewer = $('trev').value;
  if(owner===reviewer) return note('The reviewer must be a different person from the assignee.');
  const start = $('tstart').value, due = $('tdue').value; if(start&&due&&due<start) return note('Due date is before start date.');
  const unit = $('qunit').value, target = Number($('qtarget').value)||0, done = Number($('qdone').value)||0;
  if(unit && !target) return note('Enter the quantity target.');
  let t = id ? D.tasks.find(x=>x.id===id) : null; const p = t ? D.projects.find(x=>x.id===t.p) : project();
  if(!t){ t = {id:sid('T-'), p:p.id, notes:[]}; D.tasks.push(t) }
  Object.assign(t, {title, sid:$('tstage').value, owner, reviewer, start, due, plan:Number($('tplan').value)||0, actual:Number($('tact').value)||0, status:$('tstatus').value, location:$('tloc').value.trim(), qty: unit ? {unit, target, done:Math.min(done,target)} : null});
  addMember(p, owner); addMember(p, reviewer);
  snap(p); log((id?'Updated ':'Created ')+t.id); closeModal(); render();
};
window.deleteTask = id => ask('Delete task', 'Delete this task and its history?', {ok:'Delete', danger:true}, () => { const t=D.tasks.find(x=>x.id===id), p=D.projects.find(x=>x.id===t.p); D.tasks=D.tasks.filter(x=>x.id!==id); snap(p); log('Deleted '+id); render() });
window.openTask = id => {
  const t = D.tasks.find(x=>x.id===id), p = D.projects.find(x=>x.id===t.p), s = stage(p,t.sid);
  modal(esc(t.title), esc(t.id+' · '+(s?s.name:'')), `<p>${badge(t.status,sColor(t.status))} <small class="muted">earned ${credit(t)}%</small></p><p><b>Assignee:</b> ${esc(user(t.owner).name)}<br><b>Reviewer:</b> ${esc(user(t.reviewer).name)}<br><b>Dates:</b> ${fmt(t.start)} → ${fmt(t.due)}${p.baseline&&p.baseline.tasks[t.id]&&p.baseline.tasks[t.id].due!==t.due?` <small class="muted">(baseline ${fmtS(p.baseline.tasks[t.id].due)})</small>`:''}${canSeeHours()||t.owner===me().id?`<br><b>Hours:</b> ${t.actual} / ${t.plan}`:''}${t.qty?`<br><b>${esc(t.qty.unit)}:</b> ${(t.qty.done||0).toLocaleString()} / ${t.qty.target.toLocaleString()}`:''}<br><b>Location:</b> ${t.location?esc(t.location):'—'}</p>${(t.notes||[]).length?'<h4>History</h4>'+t.notes.map(n=>`<p class="note-line"><small>${esc(n.at?fmt(n.at):'')} · ${esc(n.by||'')}</small><br>${esc(n.text||n)}</p>`).join(''):''}`,
  `<button class="btn ghost" onclick="closeModal()">Close</button>${canPlan(p)?`<button class="btn soft" onclick="taskForm('${t.id}')">Edit</button>`:''}${t.owner===me().id&&t.status!=='Completed'?`<button class="btn primary" onclick="myWork('${t.id}')">Update my work</button>`:''}`);
};
window.myWork = id => {
  const t = D.tasks.find(x=>x.id===id);
  modal('Update my work', esc(t.title), `<div class="form-grid"><div class="form-group"><label>Actual hours</label><input id="mh" type="number" min="0" class="field" value="${t.actual}"></div><div class="form-group"><label>Status</label><select id="ms" class="field">${['In Progress','Blocked','Ready for Review'].map(s=>`<option ${t.status===s?'selected':''}>${s}</option>`).join('')}</select></div>${t.qty?`<div class="form-group"><label>${esc(t.qty.unit)} done (of ${t.qty.target.toLocaleString()})</label><input id="mq" type="number" min="0" max="${t.qty.target}" class="field" value="${t.qty.done||0}"></div>`:''}<div class="form-group full"><label>Note (required if blocked)</label><textarea id="mn" class="field"></textarea></div></div>`,
  `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveMyWork('${id}')">Save</button>`);
};
window.saveMyWork = id => {
  const t = D.tasks.find(x=>x.id===id), n = $('mn').value.trim(), st = $('ms').value;
  if(st==='Blocked' && !n) return note('Say what is blocking you.');
  t.actual = Number($('mh').value)||0; t.status = st;
  if(t.qty && $('mq')) t.qty.done = clamp(Number($('mq').value)||0, 0, t.qty.target);
  (t.notes=t.notes||[]).push({at:new Date().toISOString(), by:me().name, text:st+(t.qty?` · ${t.qty.done}/${t.qty.target}`:'')+(n?': '+n:'')});
  snap(D.projects.find(p=>p.id===t.p)); log('Updated '+id+' → '+st); closeModal(); render();
};
window.review = id => {
  const t = D.tasks.find(x=>x.id===id); if(!(isAdmin()||t.reviewer===me().id)) return note('Only the assigned reviewer can act.');
  modal('Review', esc(t.title), `<p>Assignee: ${esc(user(t.owner).name)}<br>Hours: ${t.actual}/${t.plan}${t.qty?`<br>${esc(t.qty.unit)}: ${t.qty.done}/${t.qty.target}`:''}<br>Location: ${t.location?esc(t.location):'—'}</p><textarea id="rc" class="field" placeholder="Comment (required for rework)"></textarea>`,
  `<button class="btn ghost" onclick="closeModal()">Close</button><button class="btn danger" onclick="reviewAction('${id}','Rework')">Return for rework</button><button class="btn primary" onclick="reviewAction('${id}','Approved')">Approve</button>`);
};
window.reviewAction = (id,act) => {
  const t = D.tasks.find(x=>x.id===id), c = $('rc').value.trim();
  if(act==='Rework' && !c) return note('Explain what needs rework.');
  t.status = act==='Approved' ? 'Completed' : 'Rework';
  if(act==='Approved' && t.qty) t.qty.done = t.qty.target;
  (t.notes=t.notes||[]).push({at:new Date().toISOString(), by:me().name, text:act+(c?': '+c:'')});
  snap(D.projects.find(p=>p.id===t.p)); log(act+' '+id); closeModal(); render();
};

/* ---------- queries ---------- */
window.queryForm = () => {
  const p = project(); if(!p) return; const c = isCust();
  const owners = D.users.filter(u=>u.status==='Active'&&!CUST.includes(u.role)&&(p.pm===u.id||(p.members||[]).includes(u.id)));
  modal(c?'Ask the project team':'New query / issue', p.code, `<div class="form-grid">${c?'':`<div class="form-group"><label>Type</label><select id="qkind" class="field"><option>Query</option><option>Issue</option></select></div><div class="form-group"><label>Visible to</label><select id="qvis" class="field">${Object.entries(Q_VIS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>`}
  <div class="form-group full"><label>Title</label><input id="qtitle" class="field"></div>
  <div class="form-group"><label>Priority</label><select id="qpri" class="field"><option>Medium</option><option>High</option><option>Low</option></select></div>
  ${c?'':`<div class="form-group"><label>Owner</label><select id="qowner" class="field">${owners.map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select></div>`}
  <div class="form-group"><label>Response needed by</label><input id="qdue" type="date" class="field"></div>
  <div class="form-group full"><label>Details</label><textarea id="qdet" class="field"></textarea></div></div>`,
  `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveQuery()">Save</button>`);
};
window.saveQuery = () => {
  const p = project(), title = $('qtitle').value.trim(); if(!title) return note('Enter a title.');
  const c = isCust(), kind = c?'Query':$('qkind').value, vis = c?(isPO()?'All customers':'Customer'):$('qvis').value, det = $('qdet').value.trim();
  const q = {id:sid(kind==='Query'?'Q-':'I-'), p:p.id, kind, title, visibility:vis, priority:$('qpri').value, owner:c?p.pm:$('qowner').value, raised:me().id, due:$('qdue').value, status:c?'Awaiting team':'Open', notes:det?[{at:new Date().toISOString(), by:me().id, text:det, shared:vis!=='Internal'}]:[]};
  D.queries.push(q); log('Created '+q.id); closeModal(); render();
};
function who(n){ const u = user(n.by); return CUST.includes(u.role) ? `${u.name} (${u.role.toLowerCase()})` : (isCust()?'Project team':u.name) }
window.openQuery = id => {
  const q = D.queries.find(x=>x.id===id), c = isCust(); if(!canSeeQuery(q)) return;
  const notes = (q.notes||[]).filter(n=>!c||n.shared);
  modal(esc(q.title), esc(q.id+' · '+q.kind+' · '+q.priority+(c?'':' · '+Q_VIS[q.visibility])),
  `<p>${badge(q.status,q.status==='Closed'?'green':'blue')} ${q.due?'<small class="muted">Response by '+fmt(q.due)+'</small>':''}</p>
  <div class="thread">${notes.map(n=>`<div class="msg ${n.shared?'':'internal'}"><small>${esc(who(n))} · ${esc(n.at?fmt(n.at):'')}${!c&&!n.shared?' · internal':''}</small><p>${esc(n.text)}</p></div>`).join('')||'<div class="empty">No messages yet.</div>'}</div>
  ${q.status==='Closed'&&c?'':`<textarea id="qc" class="field" placeholder="${c?'Your reply':'Comment'}"></textarea>`}
  ${!c?`<div class="se-row">${q.visibility!=='Internal'?'<label><input type="checkbox" id="qshare" checked> Visible to customer</label>':''}<select id="qs" class="field">${Q_STATUS.map(s=>`<option ${q.status===s?'selected':''}>${s}</option>`).join('')}</select></div>`:''}`,
  `<button class="btn ghost" onclick="closeModal()">Close</button>${q.status==='Closed'&&c?'':`<button class="btn primary" onclick="saveComment('${id}')">${c?'Send reply':'Save'}</button>`}`);
};
window.saveComment = id => {
  const q = D.queries.find(x=>x.id===id), c = isCust(), txt = $('qc') ? $('qc').value.trim() : '';
  if(c && !txt) return note('Write a reply.');
  if(txt) (q.notes=q.notes||[]).push({at:new Date().toISOString(), by:me().id, text:txt, shared:c || (q.visibility!=='Internal' && $('qshare') && $('qshare').checked)});
  if(c) q.status = 'Awaiting team'; else q.status = $('qs').value;
  log('Updated '+id); closeModal(); render();
};

/* ---------- punch list ---------- */
window.punchForm = () => {
  const p = project(); if(!p || isPO()) return;
  const g = gates(p); if(!g.length) return note('Mark at least one stage as a gate first.');
  const owners = D.users.filter(u=>u.status==='Active'&&['Engineer','Lead','Project Manager'].includes(u.role)&&(p.pm===u.id||(p.members||[]).includes(u.id)));
  const cur = g.find(s=>stagePct(p,s)<100) || g[0];
  modal('New punch item', p.code, `<div class="form-grid"><div class="form-group full"><label>Finding</label><input id="pt" class="field" placeholder="e.g. Column pressure response 15% off design at turndown"></div>
  <div class="form-group"><label>Gate</label><select id="pg" class="field">${g.map(s=>`<option value="${s.id}" ${s.id===cur.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
  <div class="form-group"><label>Category</label><select id="pc" class="field"><option value="A">A – blocks the gate</option><option value="B" selected>B – blocks start-up</option><option value="C">C – minor, can close later</option></select></div>
  ${isCust()?'':`<div class="form-group"><label>Owner</label><select id="po" class="field">${owners.map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select></div>`}
  <div class="form-group full"><label>Details</label><textarea id="pd" class="field"></textarea></div></div>`,
  `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="savePunch()">Save</button>`);
};
window.savePunch = () => {
  const p = project(), title = $('pt').value.trim(); if(!title) return note('Describe the finding.');
  const x = {id:sid('P-'), p:p.id, gate:$('pg').value, cat:$('pc').value, title, raisedBy:me().id, owner:isCust()?((p.members||[]).find(m=>user(m).role==='Lead')||p.pm):$('po').value, status:'Open', at:new Date().toISOString(), notes:[]};
  const d = $('pd').value.trim(); if(d) x.notes.push({at:x.at, by:me().id, text:d});
  D.punch.push(x); log('Raised punch '+x.id+' ('+x.cat+')'); closeModal(); render();
};
window.openPunch = id => {
  const x = D.punch.find(q=>q.id===id), p = D.projects.find(q=>q.id===x.p), g = stage(p,x.gate), c = isCust();
  if(isPO()) return;
  const canFix = !c && (x.owner===me().id || canPlan(p)), canClose = canPlan(p) || isMC() || x.raisedBy===me().id;
  const opts = [];
  if(x.status==='Open' && canFix) opts.push('Fixed');
  if(x.status!=='Closed' && canClose) opts.push('Closed');
  if(x.status!=='Open' && (canPlan(p)||isMC())) opts.push('Open');
  modal(esc(x.title), `${esc(x.id)} · ${esc(g?g.name:'')} · Category ${x.cat}`, `<p>${badge(x.status,x.status==='Closed'?'green':x.status==='Fixed'?'gold':'blue')} <small class="muted">${c?'':'Owner '+esc(user(x.owner).name)+' · '}raised ${fmt(x.at)}</small></p>
  <div class="thread">${(x.notes||[]).map(n=>`<div class="msg"><small>${esc(who(n))} · ${esc(fmt(n.at))}</small><p>${esc(n.text)}</p></div>`).join('')||'<div class="empty">No notes.</div>'}</div>
  <textarea id="pn" class="field" placeholder="Note"></textarea>${opts.length?`<div class="se-row"><label>Set status</label><select id="ps" class="field"><option value="">— keep ${esc(x.status)} —</option>${opts.map(o=>`<option>${o}</option>`).join('')}</select></div>`:''}`,
  `<button class="btn ghost" onclick="closeModal()">Close</button><button class="btn primary" onclick="savePunchNote('${id}')">Save</button>`);
};
window.savePunchNote = id => {
  const x = D.punch.find(q=>q.id===id), n = $('pn').value.trim(), s = $('ps') ? $('ps').value : '';
  if(!n && !s) return closeModal();
  if(n) (x.notes=x.notes||[]).push({at:new Date().toISOString(), by:me().id, text:(s?s+': ':'')+n});
  else if(s) x.notes.push({at:new Date().toISOString(), by:me().id, text:'Status → '+s});
  if(s){ x.status = s; if(s==='Closed') x.closedAt = new Date().toISOString(); else delete x.closedAt }
  log('Punch '+id+(s?' → '+s:' note')); closeModal(); render();
};

/* ---------- customer data requests ---------- */
window.dataForm = id => {
  const p = project(); if(!canPlan(p)) return; const d = id ? D.data.find(x=>x.id===id) : null;
  modal(d?'Edit data request':'New data request', p.code, `<div class="form-grid"><div class="form-group full"><label>What is needed</label><input id="dt" class="field" value="${esc(d?.title||'')}" placeholder="e.g. DCS database export, rev D"></div>
  <div class="form-group"><label>Owed by</label><select id="do" class="field">${CUST.map(c=>`<option ${d?.owedBy===c?'selected':''}>${c}</option>`).join('')}</select></div>
  <div class="form-group"><label>Needed by</label><input id="dn" type="date" class="field" value="${d?.needed||addDays(today(),14)}"></div>
  <div class="form-group"><label>Blocks stage (optional)</label><select id="db" class="field"><option value="">—</option>${p.stages.filter(s=>!s.na).map(s=>`<option value="${s.id}" ${d?.blocks===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div></div>`,
  `${d?`<button class="btn danger" onclick="deleteData('${d.id}')">Delete</button>`:''}<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveData('${d?.id||''}')">Save</button>`);
};
window.saveData = id => {
  const p = project(), title = $('dt').value.trim(); if(!title) return note('Describe what is needed.');
  let d = id ? D.data.find(x=>x.id===id) : null;
  if(!d){ d = {id:sid('D-'), p:p.id, status:'Requested', at:new Date().toISOString(), notes:[]}; D.data.push(d) }
  Object.assign(d, {title, owedBy:$('do').value, needed:$('dn').value, blocks:$('db').value});
  log((id?'Updated ':'Requested ')+d.id); closeModal(); render();
};
window.deleteData = id => ask('Delete request', 'Delete this data request?', {ok:'Delete', danger:true}, () => { D.data = D.data.filter(x=>x.id!==id); render() });
window.openData = id => {
  const d = D.data.find(x=>x.id===id), p = D.projects.find(x=>x.id===d.p), c = isCust();
  const mine = c && (isMC() || d.owedBy===role());
  modal(esc(d.title), `${esc(d.id)} · owed by ${esc(d.owedBy)}`, `<p>${badge(lateData(d)?'Late':d.status, lateData(d)?'red':d.status==='Received'?'green':'blue')} <small class="muted">needed ${fmt(d.needed)}${d.receivedAt?' · received '+fmt(d.receivedAt):''}${d.sentAt?' · sent '+fmt(d.sentAt):''}</small></p>
  <div class="thread">${(d.notes||[]).map(n=>`<div class="msg"><small>${esc(who(n))} · ${esc(fmt(n.at))}</small><p>${esc(n.text)}</p></div>`).join('')}</div><textarea id="dnn" class="field" placeholder="${c?'Where/how you shared it':'Note'}"></textarea>`,
  `<button class="btn ghost" onclick="closeModal()">Close</button>${!c&&canPlan(p)?`<button class="btn soft" onclick="dataForm('${id}')">Edit</button>`:''}${mine&&d.status==='Requested'?`<button class="btn primary" onclick="dataAct('${id}','Sent')">Mark as sent</button>`:''}${!c&&d.status!=='Received'?`<button class="btn primary" onclick="dataAct('${id}','Received')">Mark received</button>`:''}${!c?`<button class="btn ghost" onclick="dataAct('${id}','')">Save note</button>`:''}`);
};
window.dataAct = (id,s) => {
  const d = D.data.find(x=>x.id===id), n = $('dnn').value.trim();
  if(n || s) (d.notes=d.notes||[]).push({at:new Date().toISOString(), by:me().id, text:(s?s+(n?': ':''):'')+n});
  if(s==='Sent'){ d.status='Sent'; d.sentAt=new Date().toISOString() }
  if(s==='Received'){ d.status='Received'; d.receivedAt=new Date().toISOString() }
  log('Data '+id+(s?' → '+s:'')); closeModal(); render();
};

/* ---------- weekly report inputs & publishing ---------- */
window.reportInputs = () => {
  const p = project(); if(!canPlan(p)) return; const inp = inputs(p, weekStart(today()));
  const f = (id,lab,ph,val) => `<div class="form-group full"><label>${lab}</label><textarea id="${id}" class="field" placeholder="${ph}">${esc(val)}</textarea></div>`;
  modal('This week’s report', `${p.code} · week of ${fmt(weekStart(today()))} · numbers are calculated automatically`,
  `<div class="form-grid">${f('rn','Internal summary (management & leads)','What changed, what it means, what is needed — 3–4 sentences',inp.narrative)}${f('rd','Decisions needed (one per line)','Topic – options – recommendation',inp.decisions)}${f('rr','Top risks (one per line, max 3)','Risk – impact – mitigation',inp.risks)}${f('rc','Customer summary (main contractor & plant owner)','No hours, costs or internal names',inp.custNarrative)}${f('ra','Actions needed from customers (one per line)','Late data and open queries are added automatically',inp.custActions)}${f('rx','Next week (one per line)','Key activities and milestones',inp.nextWeek)}</div>`,
  `<button class="btn ghost" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="saveInputs()">Save</button>`);
};
window.saveInputs = () => {
  const p = project(), inp = inputs(p, weekStart(today()));
  Object.assign(inp, {narrative:$('rn').value.trim(), decisions:$('rd').value.trim(), risks:$('rr').value.trim(), custNarrative:$('rc').value.trim(), custActions:$('ra').value.trim(), nextWeek:$('rx').value.trim()});
  log('Wrote weekly report '+p.code); closeModal(); render();
};
window.publishReport = () => {
  const p = project(); if(!canEditProject(p)) return; const wk = weekStart(today()), inp = inputs(p,wk);
  if(!inp.custNarrative) return note('Write the customer summary first (Write this week).');
  ask('Publish weekly report', 'The Main Contractor and Plant Owner versions are frozen exactly as they look now.', {ok:'Publish'}, () => {
  snap(p); inp.frozen = {at:new Date().toISOString(), by:me().name, mc:reportBody(p,'mc',inp), po:reportBody(p,'po',inp)};
  log('Published weekly report '+p.code+' '+wk); render(); note('Published to customers.'); });
};
window.copyReport = aud => {
  const p = project(), txt = reportText(p, aud, inputs(p, weekStart(today())));
  const done = () => note('Copied — paste into your e-mail.');
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, ()=>showText(txt)); else showText(txt);
};
function showText(txt){ modal('Report text','Select all and copy',`<textarea class="field mono" rows="16">${esc(txt)}</textarea>`,'<button class="btn ghost" onclick="closeModal()">Close</button>') }

/* ---------- admin tools ---------- */
window.backup = () => { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(D,null,2)],{type:'application/json'})); a.download='engineering-delivery-flow-backup-'+today()+'.json'; a.click(); URL.revokeObjectURL(a.href) };
window.auditLog = () => modal('Audit log','Latest 300 actions', D.audit.map(a=>`<p class="note-line"><small>${esc(a.at.slice(0,16).replace('T',' ')+' · '+a.by)}</small><br>${esc(a.text)}</p>`).join(''), '<button class="btn ghost" onclick="closeModal()">Close</button>');
window.startFresh = () => ask('Start fresh', 'Deletes everything on this device except the Administrator. Type <b>RESET</b> to confirm.', {input:'RESET', match:'RESET', ok:'Start fresh', danger:true}, () => { D = seed(); save(); U.projectId=''; U.view='dashboard'; render(); note('Fresh workspace ready.') });
window.removeDemo = () => {
  ask('Remove demo data', 'Removes all demo people and demo projects. Everything you created yourself stays.', {ok:'Remove', danger:true}, () => {
  const ids = new Set(D.users.filter(u=>u.demo).map(u=>u.id)), pids = new Set([...D.projects,...D.archive].filter(p=>p.demo).map(p=>p.id));
  D.users = D.users.filter(u=>!u.demo); D.projects = D.projects.filter(p=>!p.demo); D.archive = D.archive.filter(p=>!p.demo);
  ['tasks','queries','punch','data'].forEach(k=>D[k]=D[k].filter(t=>!pids.has(t.p))); pids.forEach(id=>{ delete D.weekly[id]; delete D.reports[id] });
  D.projects.forEach(p=>{ p.members=(p.members||[]).filter(m=>!ids.has(m)); if(ids.has(p.pm)) p.pm='' });
  D.tasks.forEach(t=>{ if(ids.has(t.owner)) t.owner=''; if(ids.has(t.reviewer)) t.reviewer='' });
  if(ids.has(D.session)) D.session='admin';
  log('Removed demo data'); U.projectId=''; render(); note('Demo data removed.'); });
};
window.loadDemo = () => {
  if(D.users.some(u=>u.demo)) return note('Demo data is already loaded.');
  const t0 = today(), mk = (name,r,cid,extra={}) => { const u = Object.assign({id:uid('d'), name, role:r, companyId:cid, email:'', status:'Active', demo:true}, extra); D.users.push(u); return u };
  const pm = mk('Demo Project Manager','Project Manager','DEMO-PM',{email:'pm@demo.invalid'}), ld = mk('Demo Lead','Lead','DEMO-LD');
  const e1 = mk('Demo Engineer 1','Engineer','DEMO-E1'), e2 = mk('Demo Engineer 2','Engineer','DEMO-E2');
  const mc = mk('Demo Main Contractor','Main Contractor','MC-01',{org:'Demo Automation Vendor'});
  const po1 = mk('Demo Plant Owner (OTS)','Plant Owner','PO-OTS-01',{org:'Demo Refinery Co.'}), po2 = mk('Demo Plant Owner (MES)','Plant Owner','PO-MES-01',{org:'Demo Chemicals Co.'});
  const proj = (type,code,name,customer,s,e,budget,members) => { const p = {id:uid('p'), type, code, name, customer, location:'Demo site', start:addDays(t0,s), end:addDays(t0,e), budget, pm:pm.id, status:'Active', members, demo:true}; p.stages = makeStages(type,p.start,p.end); D.projects.push(p); return p };
  const task = (p,si,title,o,st,plan,act,qty) => { const s = p.stages[si], t = {id:sid('T-'), p:p.id, sid:s.id, title, owner:o.id, reviewer:(o.id===ld.id?pm.id:ld.id), start:s.start, due:s.end, plan, actual:act, status:st, location:'', notes:[], qty:qty?{unit:qty[0],target:qty[1],done:qty[2]}:null}; D.tasks.push(t); return t };

  /* OTS project */
  const p1 = proj('OTS','OTS-DEMO-01','Crude Unit OTS (Demo)','Demo Refinery Co.',-120,120,1700,[pm.id,ld.id,e1.id,e2.id,mc.id,po1.id]);
  const T = [[1,'Crude & preheat train model',e1,'Completed',160,170,['Units modelled',10,10]],[1,'Fractionator & side strippers model',e2,'Completed',140,152,['Units modelled',6,6]],[2,'Model integration & tuning',e1,'Completed',120,131],[3,'Cold start-up runs',e2,'Completed',80,86],[3,'Trip & malfunction scenarios',e1,'Ready for Review',60,58,['Scenarios built',40,40]],[4,'Overview & unit graphics',e2,'In Progress',120,96,['HMI graphics',60,26]],[4,'Faceplates',e1,'Completed',60,60],[5,'MAT procedure & execution',ld,'In Progress',120,30],[6,'DCS database import',e2,'Blocked',100,30,['I/O tags emulated',5200,1300]],[7,'ESD logic emulation',e1,'Rework',120,62],[8,'Internal preFAT run',e2,'Not Started',80,0],[9,'FAT with customer',ld,'Not Started',100,0],[10,'SAT & handover',ld,'Not Started',60,0]].map(a=>task(p1,...a));
  OTS_DESIGN.forEach(title=>task(p1,0,title,ld,'Completed',16,18));
  takeBaseline(p1, pm.name, ''); p1.baseline.at = new Date(Date.now()-110*864e5).toISOString();
  T[5].plan = 140; T[5].due = addDays(T[5].due,14); T[8].due = addDays(T[8].due,21);
  p1.stages.forEach((s,i)=>{ if(i>=4){ s.end = addDays(s.end, i>=9?10:7) } });

  /* MES project */
  const p2 = proj('MES','MES-DEMO-01','Batch MES Rollout (Demo)','Demo Chemicals Co.',-60,150,900,[pm.id,ld.id,e1.id,e2.id,po2.id]);
  [[0,'User requirements workshop',e2,'Completed',60,64,['Requirements',120,120]],[0,'Requirements register',ld,'Ready for Review',40,38],[1,'Functional design specification',e1,'In Progress',120,70],[2,'Recipe model configuration',e2,'In Progress',100,22],[3,'ERP / DCS interface mapping',e1,'Not Started',80,0,['Interfaces',6,0]],[4,'Integrated test',ld,'Not Started',80,0,['Test cases',150,0]],[5,'Deployment',ld,'Not Started',40,0],[6,'Go-live support',e2,'Not Started',40,0],[7,'Hypercare',e2,'Not Started',60,0]].forEach(a=>task(p2,...a));
  takeBaseline(p2, pm.name, ''); p2.baseline.at = new Date(Date.now()-55*864e5).toISOString();

  const isoN = n => new Date(Date.now()+n*864e5).toISOString();
  const qq = (p,kind,vis,title,pri,st,owner,raised,due,notes) => D.queries.push({id:sid(kind==='Query'?'Q-':'I-'), p:p.id, kind, visibility:vis, title, priority:pri, status:st, owner:owner.id, raised:raised.id, due:due?addDays(t0,due):'', notes:notes.map(n=>({at:isoN(n[0]), by:n[1].id, text:n[2], shared:n[3]}))});
  qq(p1,'Query','Customer','Confirm DCS database revision for import','High','Awaiting customer',pm,pm,5,[[-6,pm,'Please confirm which DCS database revision we should import for the OTS.',true],[-5,e2,'Import blocked: tags differ between rev C and D.',false]]);
  qq(p1,'Issue','Internal','Fractionator model unstable at low feed rate','Medium','Open',e2,e2,10,[[-3,e2,'Pressure oscillates below 40% feed. Checking tray hydraulics.',false]]);
  qq(p1,'Query','All customers','Proposed FAT dates','Low','Awaiting team',pm,po1,14,[[-2,po1,'Our operators are available for FAT in the second half of the month. Please propose dates.',true]]);
  qq(p2,'Query','All customers','Recipe naming convention','Medium','Awaiting team',ld,po2,7,[[-1,po2,'Should recipe names follow our SAP material codes?',true]]);

  const mat = p1.stages.find(s=>s.name==='MAT');
  const pu = (cat,title,st,owner,raised,ago,txt) => D.punch.push({id:sid('P-'), p:p1.id, gate:mat.id, cat, title, raisedBy:raised.id, owner:owner.id, status:st, at:isoN(-ago), closedAt:st==='Closed'?isoN(-1):undefined, notes:txt?[{at:isoN(-ago), by:raised.id, text:txt}]:[]});
  pu('A','Column T-101 pressure response 15% off design at turndown','Open',e2,mc,4,'Seen during MAT run 2, 40% feed case.');
  pu('B','Missing alarm limits on 12 tags in crude section','Open',e1,mc,4,'');
  pu('B','Faceplate colours not per site standard','Fixed',e1,mc,6,'');
  pu('C','Typo in malfunction scenario name','Closed',e1,ld,8,'');

  const dr = (p,title,owedBy,needed,status,blocks) => D.data.push({id:sid('D-'), p:p.id, title, owedBy, needed:addDays(t0,needed), status, blocks:blocks||'', at:isoN(-30), notes:[], receivedAt:status==='Received'?isoN(needed):undefined});
  dr(p1,'P&IDs, revision C','Main Contractor',-90,'Received');
  dr(p1,'Heat & material balance','Plant Owner',-95,'Received');
  dr(p1,'DCS database export, revision D','Main Contractor',-5,'Requested',p1.stages[6].id);
  dr(p1,'Graphics style guide','Plant Owner',7,'Requested',p1.stages[4].id);
  dr(p2,'SAP material master extract','Plant Owner',10,'Requested',p2.stages[3].id);

  /* weekly history since start */
  [p1,p2].forEach(p=>{
    const k = kpis(p), s = dt(p.start), now = new Date(), n = Math.floor((now-s)/(7*864e5)), arr = [];
    for(let i=1;i<=n;i++){ const d = new Date(s.getTime()+i*7*864e5), f = (d-s)/(now-s), ev = k.ev*Math.pow(f,1.35), pv = pvAt(p,d);
      arr.push({wk:weekStart(iso(d)), d:iso(d), ev:Math.round(ev), pv:Math.round(pv), ac:Math.round(k.ac*Math.pow(f,1.3)), bac:Math.round(k.bac), pct:Math.round(ev/k.bac*100), ppct:Math.round(pv/k.bac*100)}) }
    D.weekly[p.id] = arr.filter((x,i,a)=>a.findIndex(y=>y.wk===x.wk)===i); snap(p);
  });

  const inp = inputs(p1, weekStart(t0));
  Object.assign(inp, {
    narrative:'Modelling and integration are complete; HMI graphics and DCS work are behind because the DCS database revision D has not been received (5 days late). MAT started with one Category A finding on column T-101. ESD logic emulation is in rework. Without the database by next week, preFAT moves by about two weeks.',
    decisions:'Proceed with DCS import on revision C and re-import later (+40 h) – recommended\nWait for revision D (no extra hours, FAT likely slips 2 weeks)',
    risks:'DCS database late – preFAT/FAT slip – escalate via main contractor\nGraphics scope grew by 20 h – CPI pressure – review with customer\nT-101 Cat A punch – MAT not closable – tray hydraulics review this week',
    custNarrative:'Process modelling and model integration are complete. MAT is in progress with one open Category A item on column T-101, which we are resolving this week. HMI graphics and DCS integration are waiting for the DCS database revision D.',
    custActions:'Confirm the DCS database revision to import',
    nextWeek:'Close T-101 Cat A punch item\nContinue HMI graphics (target 40 of 60)\nStart DCS import once revision is confirmed'});
  inp.frozen = {at:new Date().toISOString(), by:pm.name, mc:reportBody(p1,'mc',inp), po:reportBody(p1,'po',inp)};

  log('Loaded demo data'); U.projectId=p1.id; U.type='OTS'; render(); note('Demo loaded. Use the top-right button to switch users.');
};

window.exportExcel = () => {
  const p = project(); if(!p) return; if(typeof XLSX==='undefined') return note('Excel library unavailable offline.');
  const wb = XLSX.utils.book_new(), add = (rows,n) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length?rows:[{}]), n);
  add(tasks(p).map(t=>({ID:t.id, Task:t.title, Stage:(stage(p,t.sid)||{}).name, Assignee:user(t.owner).name, Reviewer:user(t.reviewer).name, Start:t.start, Due:t.due, Baseline_due:p.baseline&&p.baseline.tasks[t.id]?p.baseline.tasks[t.id].due:'', Planned_h:t.plan, Actual_h:t.actual, Quantity:t.qty?t.qty.unit:'', Qty_target:t.qty?t.qty.target:'', Qty_done:t.qty?t.qty.done:'', Status:t.status, Earned_pct:credit(t)})), 'Tasks');
  add(p.stages.map(s=>({Stage:s.name, Forecast_start:s.start, Forecast_end:s.end, Baseline_end:blEnd(p,s), Slip_days:slip(p,s), Gate:s.milestone?'Yes':'', Applicable:s.na?'No':'Yes', Earned_pct:s.na?'':stagePct(p,s)})), 'Stages');
  add((D.weekly[p.id]||[]).map(w=>({Week:w.wk, Planned_pct:w.ppct, Earned_pct:w.pct, PV_h:w.pv, EV_h:w.ev, AC_h:w.ac, SPI:w.pv?+(w.ev/w.pv).toFixed(2):'', CPI:w.ac?+(w.ev/w.ac).toFixed(2):''})), 'Weekly');
  add(D.punch.filter(x=>x.p===p.id).map(x=>({ID:x.id, Gate:(stage(p,x.gate)||{}).name, Category:x.cat, Finding:x.title, Owner:user(x.owner).name, Status:x.status, Raised:x.at.slice(0,10), Closed:x.closedAt?x.closedAt.slice(0,10):''})), 'Punch');
  add(D.data.filter(d=>d.p===p.id).map(d=>({ID:d.id, Item:d.title, Owed_by:d.owedBy, Needed:d.needed, Status:lateData(d)?'Late':d.status})), 'Data requests');
  add(D.queries.filter(q=>q.p===p.id).map(q=>({ID:q.id, Type:q.kind, Visibility:Q_VIS[q.visibility], Title:q.title, Priority:q.priority, Status:q.status, Owner:user(q.owner).name, Due:q.due})), 'Queries');
  XLSX.writeFile(wb, p.code+'-report-'+today()+'.xlsx');
};

D.projects.forEach(snap); save();
if(EMBED && !D.projects.length && !D.users.some(u=>u.demo)){ loadDemo(); const pm = D.users.find(u=>u.name==='Demo Project Manager'); if(pm){ D.session = pm.id; save() } U.view='dashboard' }
render();
if(EMBED) note('Demo data loaded. Tap the round avatar (top right) to switch roles.');
try{ if(!EMBED && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{}) }catch(e){}
})();
