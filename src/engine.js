// ===== محرك المحاكاة: الشبكة + أوامر CLI =====
const clone = o => JSON.parse(JSON.stringify(o));

// ---------- أدوات IP ----------
function ipValid(s){ return /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(s) && s.split('.').every(x=>+x<=255); }
function ip2n(s){ return s.split('.').reduce((a,b)=>((a<<8)>>>0)+(+b),0)>>>0; }
function maskValid(m){ if(!ipValid(m)) return false; const n=ip2n(m); const inv=(~n)>>>0; return ((inv+1)&inv)===0 && n!==0; }
function prefix(m){ let n=ip2n(m),c=0; while(n&0x80000000){c++;n=(n<<1)>>>0;} return c; }
function netOf(ip,m){ const x=(ip2n(ip)&ip2n(m))>>>0; return [x>>>24,(x>>16)&255,(x>>8)&255,x&255].join('.'); }
function sameNet(a,b,m){ return ((ip2n(a)&ip2n(m))>>>0)===((ip2n(b)&ip2n(m))>>>0); }

// ---------- أسماء المنافذ ----------
function normIf(s){
  s=String(s).toLowerCase().replace(/\s+/g,'');
  let m=s.match(/^(g|gi|gig|giga|gigabit|gigabitethernet)(\d+\/\d+)$/); if(m) return 'Gi'+m[2];
  m=s.match(/^(f|fa|fas|fast|fastethernet)(\d+\/\d+)$/); if(m) return 'Fa'+m[2];
  return null;
}
const fullIf = n => n.replace(/^Gi/,'GigabitEthernet').replace(/^Fa/,'FastEthernet');

// ---------- الحالة ----------
let S = null;          // حالة اللابة الحالية
let LINK = {};         // خريطة الروابط

function loadLab(lab){
  S = { lab, devices: clone(lab.devices), term:{} };
  for(const [n,d] of Object.entries(S.devices)){
    if(d.type==='switch'){
      d.vlans = d.vlans || {1:'default'};
      for(const p of Object.values(d.ports)){ if(p.mode==null)p.mode='access'; if(p.vlan==null)p.vlan=1; if(p.allowed==null)p.allowed='all'; p.shut=!!p.shut; }
    }
    if(d.type==='router'){ d.routes=d.routes||[]; for(const i of Object.values(d.ifaces)) i.shut=!!i.shut; }
    d.hostname = d.hostname || n;
    S.term[n] = { mode: d.type==='pc'?'pc':'user', cur:null };
  }
  LINK={};
  for(const [a,pa,b,pb] of lab.links){ LINK[a+'|'+pa]=[b,pb]; LINK[b+'|'+pb]=[a,pa]; }
  return S;
}

function getPort(d,p){ const dv=S.devices[d]; if(!dv) return null; if(dv.type==='pc') return {shut:false}; if(dv.type==='router') return dv.ifaces[p]; return dv.ports[p]; }
function portUp(d,p){ const me=getPort(d,p); const l=LINK[d+'|'+p]; if(!me||me.shut||!l) return false; const o=getPort(l[0],l[1]); return !!o && !o.shut; }
function allowed(po,v){ return po.allowed==='all' || po.allowed.includes(+v); }

// كل الأجهزة الطرفية (PC/راوتر) اللي توصلها الإطارات من هذا المنفذ (نفس الـ broadcast domain)
function l2Reach(d,p){
  const res=[]; if(!portUp(d,p)) return res;
  const [pd,pp]=LINK[d+'|'+p]; const dev=S.devices[pd];
  if(dev.type!=='switch'){ res.push({d:pd,p:pp}); return res; }
  const port=dev.ports[pp]; if(port.mode!=='access') return res;
  const seen=new Set(); const q=[[pd,port.vlan]];
  while(q.length){
    const [sw,v]=q.shift(); const key=sw+'|'+v; if(seen.has(key)) continue; seen.add(key);
    const s=S.devices[sw]; if(!s.vlans[v]) continue;
    for(const [pn,po] of Object.entries(s.ports)){
      if(!portUp(sw,pn)) continue;
      const carries = po.mode==='access' ? po.vlan==v : allowed(po,v);
      if(!carries) continue;
      const [od,op]=LINK[sw+'|'+pn]; const odev=S.devices[od];
      if(odev.type==='switch'){
        const opo=odev.ports[op];
        if(po.mode==='trunk' && opo.mode==='trunk' && allowed(opo,v)) q.push([od,v]);
        else if(po.mode==='access' && opo.mode==='access') q.push([od,opo.vlan]);
      } else { if(od===d && op===p) continue; res.push({d:od,p:op}); }
    }
  }
  return res;
}
function epIp(e){ const dv=S.devices[e.d]; if(dv.type==='pc') return dv.ip; const i=dv.ifaces[e.p]; return (!i.shut&&i.ip)?i.ip:null; }
const findIp=(eps,ip)=>eps.find(e=>epIp(e)===ip);
function usable(r,ifn){ const i=S.devices[r].ifaces[ifn]; return i.ip && portUp(r,ifn); }

function routerFwd(r,dst,ttl){
  if(ttl<=0) return null; const R=S.devices[r];
  for(const [n,i] of Object.entries(R.ifaces)) if(!i.shut && i.ip===dst) return {to:r};
  for(const [n,i] of Object.entries(R.ifaces)) if(usable(r,n) && sameNet(i.ip,dst,i.mask)){ const e=findIp(l2Reach(r,n),dst); return e?{to:e.d}:null; }
  const rt=R.routes.filter(x=>sameNet(x.net,dst,x.mask)).sort((a,b)=>prefix(b.mask)-prefix(a.mask))[0];
  if(!rt) return null;
  for(const [n,i] of Object.entries(R.ifaces)) if(usable(r,n) && sameNet(i.ip,rt.nh,i.mask)){
    const e=findIp(l2Reach(r,n),rt.nh); if(!e||S.devices[e.d].type!=='router') return null;
    return routerFwd(e.d,dst,ttl-1);
  }
  return null;
}
function pcSend(n,dst){
  const pc=S.devices[n]; if(!pc.ip||!pc.mask) return null;
  if(dst===pc.ip) return {to:n};
  const eps=l2Reach(n,'Fa0');
  if(sameNet(pc.ip,dst,pc.mask)){ const e=findIp(eps,dst); return e?{to:e.d}:null; }
  if(!pc.gw||!sameNet(pc.ip,pc.gw,pc.mask)) return null;
  const g=findIp(eps,pc.gw); if(!g||S.devices[g.d].type!=='router') return null;
  return routerFwd(g.d,dst,8);
}
function sendFrom(n,dst){ return S.devices[n].type==='pc'?pcSend(n,dst):routerFwd(n,dst,8); }
function routerSrcIp(r,dst){
  const R=S.devices[r];
  for(const [n,i] of Object.entries(R.ifaces)) if(usable(r,n)&&sameNet(i.ip,dst,i.mask)) return i.ip;
  const rt=R.routes.filter(x=>sameNet(x.net,dst,x.mask)).sort((a,b)=>prefix(b.mask)-prefix(a.mask))[0];
  if(rt) for(const [n,i] of Object.entries(R.ifaces)) if(usable(r,n)&&sameNet(i.ip,rt.nh,i.mask)) return i.ip;
  return null;
}
function ping(src,dst){
  const a=sendFrom(src,dst); if(!a) return false;
  const dv=S.devices[src]; const sip= dv.type==='pc'?dv.ip:routerSrcIp(src,dst); if(!sip) return false;
  if(a.to===src) return true;
  const b=sendFrom(a.to,sip); return !!b && b.to===src;
}
function runTests(){ return S.lab.tests.map(t=>({...t, ok:ping(t.from,t.to)})); }

// ---------- مخرجات show ----------
const pad=(s,n)=>String(s).padEnd(n);
function ifStatus(d,p){ const me=getPort(d,p); if(me.shut) return ['administratively down','down']; return portUp(d,p)?['up','up']:['down','down']; }
function showIpIntBrief(n){
  const d=S.devices[n]; const out=[pad('Interface',23)+pad('IP-Address',16)+'OK? Method '+pad('Status',22)+'Protocol'];
  const list = d.type==='router'?d.ifaces:d.ports;
  for(const p of Object.keys(list)){
    const ip = d.type==='router'&&list[p].ip?list[p].ip:'unassigned';
    const [s,pr]=ifStatus(n,p);
    out.push(pad(fullIf(p),23)+pad(ip,16)+pad(ip==='unassigned'?'YES':'YES',4)+pad(ip==='unassigned'?'unset':'manual',7)+pad(s,22)+pr);
  }
  return out;
}
function vlanListStr(a){ if(a==='all') return '1-1005'; return a.slice().sort((x,y)=>x-y).join(','); }
function showRun(n){
  const d=S.devices[n]; const o=['Building configuration...','','Current configuration : 1024 bytes','!','version 15.1','!','hostname '+d.hostname,'!'];
  if(d.type==='router'){
    for(const [p,i] of Object.entries(d.ifaces)){
      o.push('interface '+fullIf(p)); if(i.desc) o.push(' description '+i.desc);
      o.push(i.ip?' ip address '+i.ip+' '+i.mask:' no ip address'); if(i.shut) o.push(' shutdown'); o.push('!');
    }
    for(const r of d.routes) o.push('ip route '+r.net+' '+r.mask+' '+r.nh);
    if(d.routes.length) o.push('!');
  } else {
    for(const [p,i] of Object.entries(d.ports)){
      o.push('interface '+fullIf(p)); if(i.desc) o.push(' description '+i.desc);
      if(i.mode==='access'){ if(i.vlan!=1) o.push(' switchport access vlan '+i.vlan); o.push(' switchport mode access'); }
      else { if(i.allowed!=='all') o.push(' switchport trunk allowed vlan '+vlanListStr(i.allowed)); o.push(' switchport mode trunk'); }
      if(i.shut) o.push(' shutdown'); o.push('!');
    }
  }
  o.push('line con 0','!','end'); return o;
}
function showVlan(n){
  const d=S.devices[n]; const o=[pad('VLAN',5)+pad('Name',33)+pad('Status',10)+'Ports','---- -------------------------------- --------- -------------------------------'];
  for(const v of Object.keys(d.vlans).map(Number).sort((a,b)=>a-b)){
    const ports=Object.entries(d.ports).filter(([p,i])=>i.mode==='access'&&i.vlan==v).map(([p])=>p);
    o.push(pad(v,5)+pad(d.vlans[v],33)+pad('active',10)+ports.join(', '));
  }
  o.push(pad(1002,5)+pad('fddi-default',33)+'act/unsup'); return o;
}
function showTrunk(n){
  const d=S.devices[n]; const tr=Object.entries(d.ports).filter(([p,i])=>i.mode==='trunk'&&portUp(n,p));
  if(!tr.length) return [];
  const o=[pad('Port',12)+pad('Mode',13)+pad('Encapsulation',15)+pad('Status',14)+'Native vlan'];
  tr.forEach(([p])=>o.push(pad(p,12)+pad('on',13)+pad('802.1q',15)+pad('trunking',14)+'1'));
  o.push('',pad('Port',12)+'Vlans allowed on trunk'); tr.forEach(([p,i])=>o.push(pad(p,12)+vlanListStr(i.allowed)));
  o.push('',pad('Port',12)+'Vlans allowed and active in management domain');
  tr.forEach(([p,i])=>o.push(pad(p,12)+Object.keys(d.vlans).filter(v=>allowed(i,v)).join(',')));
  return o;
}
function showRoute(n){
  const d=S.devices[n]; const o=['Codes: L - local, C - connected, S - static, R - RIP, O - OSPF','','Gateway of last resort is not set',''];
  for(const [p,i] of Object.entries(d.ifaces)) if(usable(n,p)){
    o.push('C    '+netOf(i.ip,i.mask)+'/'+prefix(i.mask)+' is directly connected, '+fullIf(p));
    o.push('L    '+i.ip+'/32 is directly connected, '+fullIf(p));
  }
  for(const r of d.routes){
    const ok=Object.entries(d.ifaces).some(([p,i])=>usable(n,p)&&sameNet(i.ip,r.nh,i.mask));
    if(ok) o.push('S    '+r.net+'/'+prefix(r.mask)+' [1/0] via '+r.nh);
  }
  return o;
}

// ---------- مطابقة الأوامر (يدعم الاختصارات مثل sh ip int br) ----------
const MIN={show:2,ip:2,interface:2,interfaces:3,brief:2,route:2,'running-config':3,vlan:1,trunk:2,enable:2,disable:4,configure:4,terminal:1,exit:2,end:3,hostname:3,address:2,no:2,shutdown:2,switchport:2,mode:1,access:2,allowed:2,add:3,remove:3,all:3,name:2,ping:2,do:2,write:2,memory:1,copy:2,'startup-config':3,description:4,ipconfig:6,help:1,cls:3,clear:4};
const lit=(t,w)=>w.startsWith(t)&&t.length>=(MIN[w]||w.length);
function ph(w,t){
  if(w==='<ip>') return ipValid(t)?t:null;
  if(w==='<if>') return normIf(t);
  if(w==='<num>') return /^\d+$/.test(t)&&+t>=1&&+t<=4094?+t:null;
  if(w==='<list>') return /^[\d,\-]+$/.test(t)?t:null;
  return t;
}
function match(pat,toks){
  const P=pat.split(' '); const args=[]; let i=0;
  for(let j=0;j<P.length;j++){
    const w=P[j];
    if(w==='<rest>'){ if(i>=toks.length) return {inc:true}; args.push(toks.slice(i).join(' ')); return {args}; }
    if(i>=toks.length) return {inc:true};
    const t=toks[i];
    if(w[0]==='<'){ const v=ph(w,t); if(v==null) return {bad:i}; args.push(v); }
    else if(!lit(t.toLowerCase(),w)) return {bad:i};
    i++;
  }
  if(i<toks.length) return {bad:i};
  return {args};
}
function tokenize(line){
  line=line.trim().replace(/\b(g|gi|gig|gigabitethernet|f|fa|fastethernet)\s+(\d+\/\d+)/ig,'$1$2');
  return line?line.split(/\s+/):[];
}
function parseList(s){ const out=[]; for(const part of s.split(',')){ if(!part) continue; const [a,b]=part.split('-').map(Number); if(b){ for(let x=a;x<=b;x++) out.push(x);} else out.push(a);} return [...new Set(out)]; }

function prompt(n){
  const d=S.devices[n], t=S.term[n];
  if(t.mode==='pc') return 'C:\\>';
  return d.hostname+({user:'>',priv:'#',config:'(config)#',if:'(config-if)#',vlan:'(config-vlan)#'}[t.mode]);
}

const INVALID=(line,toks,bad)=>{
  let pos=0, idx=0; for(let k=0;k<=bad&&k<toks.length;k++){ idx=line.indexOf(toks[k],idx); if(k===bad) pos=idx; idx+=toks[k].length; }
  return [' '.repeat(pos+0)+'^','% Invalid input detected at \'^\' marker.'];
};

// يرجّع {lines:[...], ping:{src,dst,ok,kind}?}
function exec(n,line){
  const d=S.devices[n], t=S.term[n];
  const toks=tokenize(line);
  if(!toks.length) return {lines:[]};
  if(d.type==='pc') return execPC(n,toks);
  const mode=t.mode;
  const C=[]; // [pattern, fn, modes]
  const add=(p,f,modes)=>C.push([p,f,modes]);
  const isSw=d.type==='switch', isR=d.type==='router';
  const ifList= isR?d.ifaces:d.ports;
  const showSet=(modes)=>{
    add('show ip interface brief',()=>showIpIntBrief(n),modes);
    add('show running-config',()=> t.mode==='user'?['% Invalid input detected at \'^\' marker. (استخدم enable أولاً)']:showRun(n),modes);
    if(isR) add('show ip route',()=>showRoute(n),modes);
    if(isSw){ add('show vlan brief',()=>showVlan(n),modes); add('show vlan',()=>showVlan(n),modes); add('show interfaces trunk',()=>showTrunk(n),modes); }
  };
  showSet(['user','priv']);
  add('enable',()=>{t.mode='priv';return [];},['user']);
  add('disable',()=>{t.mode='user';return [];},['priv']);
  add('exit',()=>{t.mode='user';return ['',d.hostname+' con0 is now available','','Press RETURN to get started.',''];},['user','priv']);
  add('configure terminal',()=>{t.mode='config';return ['Enter configuration commands, one per line.  End with CNTL/Z.'];},['priv']);
  add('ping <ip>',(ip)=>({ping:ip}),['user','priv']);
  add('write memory',()=>['Building configuration...','[OK]'],['priv']);
  add('write',()=>['Building configuration...','[OK]'],['priv']);
  add('copy running-config startup-config',()=>['Destination filename [startup-config]?','Building configuration...','[OK]'],['priv']);
  // config
  add('hostname <word>',(h)=>{d.hostname=h;return [];},['config']);
  const enterIf=(p)=>{ if(!ifList[p]) return ['% Invalid interface: '+p]; t.mode='if'; t.cur=p; return []; };
  add('interface <if>',enterIf,['config','if']);
  if(isR){
    add('ip route <ip> <ip> <ip>',(a,m,h)=>{ if(!maskValid(m)) return ['% Inconsistent address and mask']; if(netOf(a,m)!==a) return ['%Inconsistent address and mask'];
      if(!d.routes.some(r=>r.net===a&&r.mask===m&&r.nh===h)) d.routes.push({net:a,mask:m,nh:h}); return []; },['config']);
    add('no ip route <ip> <ip> <ip>',(a,m,h)=>{ const k=d.routes.findIndex(r=>r.net===a&&r.mask===m&&r.nh===h); if(k<0) return ['%No matching route to delete']; d.routes.splice(k,1); return []; },['config']);
    add('no ip route <ip> <ip>',(a,m)=>{ const b=d.routes.length; d.routes=d.routes.filter(r=>!(r.net===a&&r.mask===m)); return b===d.routes.length?['%No matching route to delete']:[]; },['config']);
  }
  if(isSw){
    add('vlan <num>',(v)=>{ if(!d.vlans[v]) d.vlans[v]='VLAN'+String(v).padStart(4,'0'); t.mode='vlan'; t.cur=v; return []; },['config']);
    add('no vlan <num>',(v)=>{ if(v==1) return ['Default VLAN 1 may not be deleted.']; delete d.vlans[v]; return []; },['config']);
    add('name <word>',(nm)=>{ d.vlans[t.cur]=nm; return []; },['vlan']);
  }
  add('exit',()=>{ t.mode=mode==='config'?'priv':'config'; t.cur=null; return []; },['config','if','vlan']);
  add('end',()=>{ t.mode='priv'; t.cur=null; return []; },['config','if','vlan']);
  add('do <rest>',(rest)=>{ const sv=t.mode; t.mode='priv'; const r=exec(n,rest); t.mode=sv; return r; },['config','if','vlan']);
  // interface
  const I=()=>ifList[t.cur];
  add('shutdown',()=>{ I().shut=true; return ['%LINK-5-CHANGED: Interface '+fullIf(t.cur)+', changed state to administratively down']; },['if']);
  add('no shutdown',()=>{ const was=I().shut; I().shut=false; if(!was) return [];
      const up=portUp(n,t.cur); return ['%LINK-5-CHANGED: Interface '+fullIf(t.cur)+', changed state to '+(up?'up':'down')].concat(up?['%LINEPROTO-5-UPDOWN: Line protocol on Interface '+fullIf(t.cur)+', changed state to up']:[]); },['if']);
  add('description <rest>',(x)=>{ I().desc=x; return []; },['if']);
  add('no description',()=>{ delete I().desc; return []; },['if']);
  if(isR){
    add('ip address <ip> <ip>',(a,m)=>{ if(!maskValid(m)) return ['% Bad mask '+m+' for address '+a];
      if(netOf(a,m)===a) return ['Bad mask /'+prefix(m)+' for address '+a];
      for(const [p,i] of Object.entries(d.ifaces)) if(p!==t.cur&&i.ip&&(sameNet(i.ip,a,i.mask)||sameNet(i.ip,a,m))) return ['% '+netOf(a,m)+' overlaps with '+fullIf(p)];
      I().ip=a; I().mask=m; return []; },['if']);
    add('no ip address',()=>{ I().ip=null; I().mask=null; return []; },['if']);
  }
  if(isSw){
    add('switchport mode access',()=>{ I().mode='access'; return []; },['if']);
    add('switchport mode trunk',()=>{ I().mode='trunk'; return ['','%LINEPROTO-5-UPDOWN: Line protocol on Interface '+fullIf(t.cur)+', changed state to up']; },['if']);
    add('switchport access vlan <num>',(v)=>{ I().vlan=v; if(!d.vlans[v]){ d.vlans[v]='VLAN'+String(v).padStart(4,'0'); return ['% Access VLAN does not exist. Creating vlan '+v]; } return []; },['if']);
    add('no switchport access vlan',()=>{ I().vlan=1; return []; },['if']);
    add('switchport trunk allowed vlan add <list>',(l)=>{ const p=I(); if(p.allowed==='all') return []; p.allowed=[...new Set(p.allowed.concat(parseList(l)))]; return []; },['if']);
    add('switchport trunk allowed vlan remove <list>',(l)=>{ const p=I(); const rm=parseList(l); let base=p.allowed==='all'?Array.from({length:1005},(_,k)=>k+1):p.allowed; p.allowed=base.filter(x=>!rm.includes(x)); return []; },['if']);
    add('switchport trunk allowed vlan all',()=>{ I().allowed='all'; return []; },['if']);
    add('switchport trunk allowed vlan <list>',(l)=>{ I().allowed=parseList(l); return []; },['if']);
  }

  const cands=C.filter(c=>c[2].includes(mode));
  let inc=false, bad=-1;
  for(const [p,f] of cands){
    const r=match(p,toks);
    if(r.args){
      const out=f(...r.args);
      if(out&&out.lines) return out;
      if(out&&out.ping) return {lines:[], ping:{src:n,dst:out.ping,kind:'ios'}};
      return {lines:out||[]};
    }
    if(r.inc) inc=true; else if(r.bad>bad) bad=r.bad;
  }
  if(inc) return {lines:['% Incomplete command.']};
  // تلميح لو الأمر يحتاج وضع مختلف
  const other=C.some(c=>!c[2].includes(mode)&&match(c[0],toks).args);
  const lines=INVALID(line.trim(),toks,Math.max(bad,0)); lines[0]=' '.repeat(prompt(n).length)+lines[0];
  lines[0]=lines[0];
  if(other) lines.push('  ↳ هذا الأمر يشتغل في وضع ثاني ('+(mode==='user'?'جرّب enable':'جرّب exit أو end أو configure terminal')+')');
  return {lines};
}

function execPC(n,toks){
  const pc=S.devices[n]; const c=toks[0].toLowerCase();
  if(c==='ipconfig'){
    if(toks.length===1||toks[1].toLowerCase()==='/all'){
      return {lines:['','FastEthernet0 Connection:(default port)','','   Connection-specific DNS Suffix..: ','   IPv4 Address....................: '+(pc.ip||'0.0.0.0'),'   Subnet Mask.....................: '+(pc.mask||'0.0.0.0'),'   Default Gateway.................: '+(pc.gw||'0.0.0.0'),'']};
    }
    const [_,ip,mask,gw]=toks;
    if(!ipValid(ip)||!mask||!maskValid(mask)||(gw&&!ipValid(gw))) return {lines:['Invalid Command. الصيغة: ipconfig <IP> <Mask> [Gateway]']};
    pc.ip=ip; pc.mask=mask; pc.gw=gw||null; return {lines:['']};
  }
  if(c==='ping'){ if(!toks[1]||!ipValid(toks[1])) return {lines:['Ping request could not find host. الصيغة: ping <IP>']}; return {lines:[],ping:{src:n,dst:toks[1],kind:'pc'}}; }
  if(c==='help'||c==='?') return {lines:['الأوامر المتاحة:','  ipconfig                         عرض الإعدادات','  ipconfig <IP> <Mask> [Gateway]   تغيير الإعدادات','  ping <IP>                        اختبار الاتصال','  cls                              مسح الشاشة']};
  if(c==='cls'||c==='clear') return {lines:[],clear:true};
  return {lines:['Invalid Command.']};
}

// أوامر IOS في أي وضع مع "?" للمساعدة
function helpFor(n){
  const d=S.devices[n], m=S.term[n].mode;
  if(d.type==='pc') return execPC(n,['help']).lines;
  const H={
    user:['enable','show ip interface brief','ping <ip>'],
    priv:['show ip interface brief','show running-config',...(d.type==='router'?['show ip route']:['show vlan brief','show interfaces trunk']),'ping <ip>','configure terminal','write memory','disable'],
    config:['interface <name>','hostname <name>',...(d.type==='router'?['ip route <net> <mask> <next-hop>','no ip route <net> <mask> <next-hop>']:['vlan <id>']),'do <show ...>','exit / end'],
    if: d.type==='router'?['ip address <ip> <mask>','no shutdown','shutdown','exit / end','do <show ...>']:['switchport mode access|trunk','switchport access vlan <id>','switchport trunk allowed vlan <list>|add <id>|all','no shutdown','shutdown','exit / end'],
    vlan:['name <name>','exit / end']
  };
  return ['الأوامر المتاحة هنا:'].concat(H[m].map(x=>'  '+x));
}

if(typeof module!=='undefined') module.exports={loadLab,exec,runTests,ping,prompt,helpFor,portUp,get S(){return S;}};
