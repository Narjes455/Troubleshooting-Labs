// ===== الواجهة =====
const $=s=>document.querySelector(s);
const LV=['','سهل','متوسط','متقدم'];
const store={get(){try{return JSON.parse(localStorage.getItem('ntlabs')||'{}')}catch(e){return {}}},set(v){try{localStorage.setItem('ntlabs',JSON.stringify(v))}catch(e){}}};
let G=null; // حالة جلسة اللابة
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const fmt=t=>{t=Math.floor(t/1000);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');};

// ---------- الصفحة الرئيسية ----------
function home(){
  stopTimer(); G=null;
  const prog=store.get(); const done=LABS.filter(l=>prog[l.id]).length;
  $('#app').innerHTML=`
  <section class="hero">
    <div class="hero-badge">TROUBLESHOOTING LABS</div>
    <h1>شبكة فيها أعطال.<br><span>اكتشفها وصلّحها.</span></h1>
    <p>كل لابة شبكة جاهزة فيها أخطاء مزروعة. استخدم أوامر <code>show</code> و<code>ping</code> في الـ CLI، حدّد المشكلة، صلّحها، واضغط <b>تحقق</b>.</p>
    <div class="hero-stats"><div><b>${LABS.length}</b><small>لابات</small></div><div><b>${done}</b><small>محلولة</small></div><div><b>${LABS.reduce((a,l)=>a+((prog[l.id]||{}).stars||0),0)}</b><small>نجوم</small></div></div>
  </section>
  <section class="grid">
    ${LABS.map((l,i)=>{const p=prog[l.id];return `
      <a class="card ${p?'done':''}" href="#${l.id}">
        <div class="card-top"><span class="num">${String(i+1).padStart(2,'0')}</span><span class="lvl l${l.level}">${LV[l.level]}</span></div>
        <h3>${l.title}</h3>
        <p>${l.story}</p>
        <div class="card-foot">
          <span class="stars">${[1,2,3].map(k=>`<i class="${p&&p.stars>=k?'on':''}">★</i>`).join('')}</span>
          <span class="meta">${p?'⏱ '+fmt(p.time):l.tests.length+' اختبارات'}</span>
        </div>
      </a>`}).join('')}
  </section>
  <section class="howto">
    <h2>طريقة الحل</h2>
    <ol>
      <li><b>اقرأ التذكرة</b> وجدول التوثيق: هذا وش المفروض تكون عليه الشبكة.</li>
      <li><b>اختبر:</b> افتح جهاز واكتب <code>ping</code> عشان تعرف وين الانقطاع.</li>
      <li><b>افحص:</b> على الراوتر والسويتش اكتب <code>enable</code> ثم أوامر <code>show</code>.</li>
      <li><b>صلّح</b> بـ <code>configure terminal</code> واضغط <b>تحقق</b>.</li>
    </ol>
  </section>
  <footer>أكاديمية الشبكات · نرجس العمري</footer>`;
}

// ---------- صفحة اللابة ----------
function openLab(id){
  const lab=LABS.find(l=>l.id===id); if(!lab) return home();
  loadLab(lab);
  G={lab,hints:0,sol:false,start:Date.now(),done:false,sel:Object.keys(lab.devices).find(n=>lab.devices[n].type!=='pc')||Object.keys(lab.devices)[0],buf:{},hist:{},hi:{},busy:false,results:null};
  for(const n of Object.keys(S.devices)){
    G.buf[n]= S.devices[n].type==='pc'
      ? [{t:'Packet Tracer PC Command Line 1.0',c:'dim'},{t:'اكتب help لعرض الأوامر',c:'dim'},{t:''}]
      : [{t:'Press RETURN to get started.',c:'dim'},{t:'اكتب ? في أي وقت لعرض الأوامر المتاحة',c:'dim'},{t:''}];
    G.hist[n]=[]; G.hi[n]=0;
  }
  const idx=LABS.indexOf(lab);
  $('#app').innerHTML=`
  <div class="labbar">
    <a href="#" class="back">→ اللابات</a>
    <div class="lt"><small>لابة ${idx+1} · ${LV[lab.level]}</small><b>${lab.title}</b></div>
    <div class="timer" id="timer">00:00</div>
  </div>
  <div class="labgrid">
    <aside class="side">
      <div class="panel ticket"><div class="ph">🎫 التذكرة</div><p>${lab.story}</p></div>
      <details class="panel" open><summary class="ph">📄 توثيق الشبكة (الإعدادات الصحيحة)</summary>
        <table class="docs">${lab.docs.map(r=>`<tr><td>${r[0]}</td><td><bdi dir="ltr">${r[1].replace(" /","/")}</bdi></td><td>${r[2]}</td></tr>`).join('')}</table>
      </details>
      <div class="panel"><div class="ph">🎯 المطلوب ينجح</div><ul class="tests" id="tests"></ul>
        <div class="actions">
          <button class="btn primary" id="check">✓ تحقق</button>
          <button class="btn" id="hint">💡 تلميح</button>
          <button class="btn ghost" id="reset">↺ إعادة</button>
        </div>
      </div>
      <details class="panel"><summary class="ph">⌨️ دليل الأوامر</summary>${cheat()}</details>
    </aside>
    <main class="mainc">
      <div class="panel topo"><svg id="topo" viewBox="0 0 800 330"></svg><div class="topo-hint">اضغط على أي جهاز لفتح الـ CLI حقه</div></div>
      <div class="panel termwrap">
        <div class="tabs" id="tabs"></div>
        <div class="term" id="term" dir="ltr"></div>
        <form class="inrow" id="inrow" dir="ltr"><span id="prm"></span><input id="cmd" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send"></form>
        <div class="chips" id="chips"></div>
      </div>
    </main>
  </div>`;
  $('#check').onclick=check; $('#hint').onclick=hintModal; $('#reset').onclick=()=>confirmModal('إعادة اللابة؟','بترجع الشبكة لحالتها الأصلية بأعطالها، وكل تعديلاتك بتنمسح.',()=>openLab(id));
  $('#inrow').onsubmit=e=>{e.preventDefault();submit();};
  $('#cmd').onkeydown=keys;
  $('#term').onclick=()=>$('#cmd').focus({preventScroll:true});
  renderTests(); renderTopo(); select(G.sel);
  startTimer();
}
function cheat(){
  const rows=[['الكمبيوتر','ipconfig · ipconfig &lt;IP&gt; &lt;Mask&gt; &lt;GW&gt; · ping &lt;IP&gt;'],['الدخول','enable · configure terminal · interface g0/0 · exit · end'],['الفحص','show ip interface brief · show running-config · show ip route · show vlan brief · show interfaces trunk'],['منفذ','no shutdown · ip address &lt;IP&gt; &lt;Mask&gt;'],['سويتش','switchport mode access|trunk · switchport access vlan 10 · switchport trunk allowed vlan add 20 · vlan 20'],['راوتر','ip route &lt;net&gt; &lt;mask&gt; &lt;next-hop&gt; · no ip route ...'],['اختصارات','sh ip int br · conf t · int g0/0 · no sh · do sh run']];
  return `<table class="cheat">${rows.map(r=>`<tr><td>${r[0]}</td><td><bdi dir="ltr">${r[1].replace(" /","/")}</bdi></td></tr>`).join('')}</table>`;
}

// ---------- الطوبولوجيا ----------
function icon(d,n){
  if(d.type==='router') return `<circle r="27" class="dv-r"/><path d="M-13 -5 L13 -5 M7 -11 L13 -5 L7 1 M13 5 L-13 5 M-7 -1 L-13 5 L-7 11" class="dv-ln"/>`;
  if(d.type==='switch') return `<rect x="-34" y="-19" width="68" height="38" rx="7" class="dv-s"/><path d="M-20 -7 L20 -7 M14 -12 L20 -7 L14 -2 M20 7 L-20 7 M-14 2 L-20 7 L-14 12" class="dv-ln"/>`;
  if(d.server) return `<rect x="-19" y="-28" width="38" height="56" rx="5" class="dv-p"/><path d="M-11 -16 H11 M-11 -6 H11 M-11 4 H11" class="dv-ln"/><circle cx="9" cy="17" r="3" class="dv-led"/>`;
  return `<rect x="-26" y="-22" width="52" height="34" rx="4" class="dv-p"/><rect x="-21" y="-17" width="42" height="24" rx="2" class="dv-scr"/><path d="M-10 20 H10 M0 12 V20" class="dv-ln"/>`;
}
function renderTopo(){
  const L=G.lab, P=L.pos; let s='';
  for(const [a,pa,b,pb] of L.links){
    const [x1,y1]=P[a],[x2,y2]=P[b]; const up=portUp(a,pa)&&portUp(b,pb);
    const ua=portUp(a,pa)||!getPort(a,pa).shut, ub=portUp(b,pb)||!getPort(b,pb).shut;
    s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="lk ${up?'up':'down'}"/>`;
    const dot=(x,y,ok)=>`<circle cx="${x}" cy="${y}" r="5" class="pt ${ok&&up?'up':'down'}"/>`;
    const f=(t)=>[x1+(x2-x1)*t,y1+(y2-y1)*t];
    const [ax,ay]=f(.3),[bx,by]=f(.7);
    s+=dot(...f(.13),ua)+dot(...f(.87),ub);
    if(pa!=='Fa0') s+=`<text x="${ax}" y="${ay-9}" class="pl">${pa}</text>`;
    if(pb!=='Fa0') s+=`<text x="${bx}" y="${by-9}" class="pl">${pb}</text>`;
  }
  for(const [n,[x,y]] of Object.entries(P)){
    const d=S.devices[n];
    s+=`<g class="dv ${G.sel===n?'sel':''}" transform="translate(${x},${y})" data-n="${n}"><circle r="40" class="hit"/>${icon(d,n)}<text y="${d.type==='router'?46:d.server?46:40}" class="dl">${d.hostname||n}</text></g>`;
  }
  $('#topo').innerHTML=s;
  $('#topo').querySelectorAll('.dv').forEach(g=>g.onclick=()=>select(g.dataset.n));
}

// ---------- الطرفية ----------
function select(n){
  G.sel=n; renderTopo();
  $('#tabs').innerHTML=Object.keys(S.devices).map(k=>`<button class="tab ${k===n?'on':''}" data-n="${k}">${S.devices[k].hostname||k}</button>`).join('');
  $('#tabs').querySelectorAll('.tab').forEach(b=>b.onclick=()=>select(b.dataset.n));
  renderTerm(); renderChips();
  if(window.innerWidth>800) $('#cmd').focus({preventScroll:true});
}
function renderTerm(){
  const b=G.buf[G.sel].slice(-500);
  $('#term').innerHTML=b.map(l=>`<div class="${l.c||''}">${esc(l.t)||'&nbsp;'}</div>`).join('');
  $('#prm').textContent=prompt(G.sel)+' ';
  $('#term').scrollTop=1e9;
}
function out(n,t,c){ G.buf[n].push({t,c}); }
function renderChips(){
  const d=S.devices[G.sel], m=S.term[G.sel].mode;
  let c;
  if(d.type==='pc') c=['ipconfig','ping ','help'];
  else if(m==='user') c=['enable','show ip interface brief','?'];
  else if(m==='priv') c=d.type==='router'?['show ip interface brief','show ip route','show running-config','configure terminal','ping ']:['show vlan brief','show interfaces trunk','show ip interface brief','show running-config','configure terminal'];
  else if(m==='config') c=d.type==='router'?['interface ','ip route ','do show ip route','end']:['interface ','vlan ','do show vlan brief','end'];
  else if(m==='if') c=d.type==='router'?['no shutdown','ip address ','exit','end']:['no shutdown','switchport mode trunk','switchport access vlan ','switchport trunk allowed vlan add ','exit'];
  else c=['name ','exit','end'];
  $('#chips').innerHTML=c.map(x=>`<button type="button" class="chip">${x}</button>`).join('');
  $('#chips').querySelectorAll('.chip').forEach(b=>b.onclick=()=>{ const v=b.textContent; if(v.endsWith(' ')){ $('#cmd').value=v; $('#cmd').focus({preventScroll:true}); } else { $('#cmd').value=v; submit(); } });
}
function keys(e){
  const h=G.hist[G.sel]; if(!h.length) return;
  if(e.key==='ArrowUp'){ e.preventDefault(); G.hi[G.sel]=Math.max(0,G.hi[G.sel]-1); $('#cmd').value=h[G.hi[G.sel]]||''; }
  if(e.key==='ArrowDown'){ e.preventDefault(); G.hi[G.sel]=Math.min(h.length,G.hi[G.sel]+1); $('#cmd').value=h[G.hi[G.sel]]||''; }
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function submit(){
  if(G.busy) return;
  const n=G.sel, line=$('#cmd').value; $('#cmd').value='';
  out(n,prompt(n)+' '+line,'cmdl');
  if(line.trim()){ G.hist[n].push(line); G.hi[n]=G.hist[n].length; }
  if(line.trim().endsWith('?')){ helpFor(n).forEach(l=>out(n,l,'dim')); renderTerm(); return; }
  const r=exec(n,line);
  if(r.clear) G.buf[n]=[];
  r.lines.forEach(l=>out(n,l, /^%|Invalid|↳/.test(l.trim())||/^\s*\^/.test(l)?'err':''));
  renderTerm(); renderChips();
  if(r.ping){ G.busy=true; await animPing(r.ping); G.busy=false; renderTerm(); }
  renderTopo();
}
async function animPing({src,dst,kind}){
  const ok=ping(src,dst);
  if(kind==='pc'){
    out(src,''); out(src,'Pinging '+dst+' with 32 bytes of data:'); out(src,''); renderTerm();
    for(let i=0;i<4;i++){ await sleep(ok?260:650); out(src, ok?`Reply from ${dst}: bytes=32 time<1ms TTL=${S.devices[src].ip===dst?128:126}`:'Request timed out.', ok?'ok':'err'); renderTerm(); }
    out(src,''); out(src,`Ping statistics for ${dst}:`); out(src,`    Packets: Sent = 4, Received = ${ok?4:0}, Lost = ${ok?0:4} (${ok?0:100}% loss),`); out(src,'');
  } else {
    out(src,'Type escape sequence to abort.'); out(src,`Sending 5, 100-byte ICMP Echos to ${dst}, timeout is 2 seconds:`);
    const line={t:'',c:ok?'ok':'err'}; G.buf[src].push(line);
    for(let i=0;i<5;i++){ await sleep(ok?160:450); line.t+=ok?'!':'.'; renderTerm(); }
    out(src,`Success rate is ${ok?100:0} percent (${ok?5:0}/5)`+(ok?', round-trip min/avg/max = 1/1/2 ms':''));
  }
}

// ---------- التحقق ----------
function renderTests(){
  const r=G.results;
  $('#tests').innerHTML=G.lab.tests.map((t,i)=>{const st=r?(r[i].ok?'ok':'no'):'';return `<li class="${st}"><span class="ti">${st==='ok'?'✓':st==='no'?'✕':'○'}</span><span dir="ltr">${t.label}</span><code dir="ltr">ping ${t.to}</code></li>`}).join('');
}
function check(){
  if(G.done) return winModal();
  G.results=runTests(); renderTests();
  const bad=G.results.filter(t=>!t.ok).length;
  if(!bad){
    G.done=true; stopTimer(); G.time=Date.now()-G.start;
    G.stars=G.sol?0:G.hints===0?3:G.hints===1?2:1;
    const p=store.get(), old=p[G.lab.id];
    if(!old||G.stars>old.stars||(G.stars===old.stars&&G.time<old.time)) p[G.lab.id]={stars:G.stars,time:G.time};
    store.set(p); winModal();
  } else toast(`باقي ${bad} من ${G.lab.tests.length} ما نجحت. كمّل البحث 🔍`);
}

// ---------- النوافذ ----------
function modal(html){ const m=document.createElement('div'); m.className='modal'; m.innerHTML=`<div class="box">${html}</div>`; m.onclick=e=>{if(e.target===m)m.remove();}; document.body.appendChild(m); return m; }
function confirmModal(t,b,yes){ const m=modal(`<h3>${t}</h3><p>${b}</p><div class="actions"><button class="btn primary" id="y">نعم</button><button class="btn ghost" id="n">إلغاء</button></div>`); m.querySelector('#y').onclick=()=>{m.remove();yes();}; m.querySelector('#n').onclick=()=>m.remove(); }
function hintModal(){
  const L=G.lab;
  const m=modal(`<h3>💡 التلميحات</h3>
    <ol class="hl">${L.hints.slice(0,G.hints).map(h=>`<li>${h}</li>`).join('')||'<p class="mut">كل تلميح ينقص نجمة من تقييمك.</p>'}</ol>
    ${G.sol?`<div class="sol"><b>الحل:</b><ul>${L.solution.map(s=>`<li dir="ltr">${s}</li>`).join('')}</ul></div>`:''}
    <div class="actions">${G.hints<L.hints.length?'<button class="btn primary" id="nh">تلميح جديد</button>':''}${!G.sol?'<button class="btn danger" id="ss">عرض الحل</button>':''}<button class="btn ghost" id="cl">إغلاق</button></div>`);
  const nh=m.querySelector('#nh'); if(nh) nh.onclick=()=>{G.hints++;m.remove();hintModal();};
  const ss=m.querySelector('#ss'); if(ss) ss.onclick=()=>{m.remove();confirmModal('عرض الحل؟','لو شفت الحل ما بتاخذ نجوم على هذي اللابة. متأكد؟',()=>{G.sol=true;hintModal();});};
  m.querySelector('#cl').onclick=()=>m.remove();
}
function winModal(){
  const i=LABS.indexOf(G.lab), next=LABS[i+1];
  modal(`<div class="win"><div class="burst">🎉</div><h3>الشبكة اشتغلت!</h3>
    <div class="bigstars">${[1,2,3].map(k=>`<i class="${G.stars>=k?'on':''}">★</i>`).join('')}</div>
    <p>الوقت: <b dir="ltr">${fmt(G.time)}</b> · التلميحات: <b>${G.hints}</b>${G.sol?' · استخدمت الحل':''}</p>
    <div class="actions">${next?`<a class="btn primary" href="#${next.id}">اللابة التالية ←</a>`:'<a class="btn primary" href="#">🏆 خلصت كل اللابات</a>'}<a class="btn ghost" href="#">كل اللابات</a></div></div>`);
}
function toast(t){ const e=document.createElement('div'); e.className='toast'; e.textContent=t; document.body.appendChild(e); setTimeout(()=>e.classList.add('show'),10); setTimeout(()=>{e.classList.remove('show');setTimeout(()=>e.remove(),300)},2600); }

// ---------- المؤقت والتنقل ----------
let TI=null;
function startTimer(){ stopTimer(); TI=setInterval(()=>{ const e=$('#timer'); if(e&&G) e.textContent=fmt(Date.now()-G.start); },500); }
function stopTimer(){ if(TI) clearInterval(TI); TI=null; }
function route(){ document.querySelectorAll('.modal').forEach(m=>m.remove()); const h=location.hash.slice(1); if(h&&LABS.some(l=>l.id===h)) openLab(h); else home(); window.scrollTo(0,0); }
window.addEventListener('hashchange',route);
route();
