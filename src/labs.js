// ===== اللابات =====
// لإضافة لابة جديدة: انسخ أي لابة، غيّر الأجهزة والروابط، وازرع الأخطاء، واكتب الاختبارات.
const M24='255.255.255.0', M30='255.255.255.252';
const LABS=[
{
  id:'lab1', title:'مكتب صغير', level:1,
  story:'موظفين المكتب يشتكون: ما أحد يقدر يوصل للسيرفر، وجهاز PC2 ما يشوف حتى زميله PC1.',
  docs:[['PC1','192.168.1.10 /24','GW 192.168.1.1'],['PC2','192.168.1.20 /24','GW 192.168.1.1'],['R1 Gi0/0','192.168.1.1 /24','LAN'],['R1 Gi0/1','10.0.0.1 /24','Server side'],['Server','10.0.0.10 /24','GW 10.0.0.1']],
  tests:[{from:'PC1',to:'192.168.1.20',label:'PC1 → PC2'},{from:'PC1',to:'10.0.0.10',label:'PC1 → Server'},{from:'PC2',to:'10.0.0.10',label:'PC2 → Server'}],
  hints:['ابدأ من الراوتر R1: اكتب enable ثم show ip interface brief. هل كل المنافذ up؟','افتح PC2 واكتب ipconfig، وقارن عنوانه بجدول التوثيق.'],
  solution:['R1: enable → configure terminal → interface g0/0 → no shutdown','PC2: ipconfig 192.168.1.20 255.255.255.0 192.168.1.1'],
  pos:{PC1:[90,70],PC2:[90,250],SW1:[270,160],R1:[460,160],Server:[680,160]},
  devices:{
    PC1:{type:'pc',ip:'192.168.1.10',mask:M24,gw:'192.168.1.1'},
    PC2:{type:'pc',ip:'192.168.10.20',mask:M24,gw:'192.168.1.1'},
    SW1:{type:'switch',ports:{'Fa0/1':{},'Fa0/2':{},'Gi0/1':{}}},
    R1:{type:'router',ifaces:{'Gi0/0':{ip:'192.168.1.1',mask:M24,shut:true},'Gi0/1':{ip:'10.0.0.1',mask:M24}}},
    Server:{type:'pc',server:true,ip:'10.0.0.10',mask:M24,gw:'10.0.0.1'}
  },
  links:[['PC1','Fa0','SW1','Fa0/1'],['PC2','Fa0','SW1','Fa0/2'],['SW1','Gi0/1','R1','Gi0/0'],['R1','Gi0/1','Server','Fa0']]
},
{
  id:'lab2', title:'قسم المحاسبة', level:1,
  story:'بعد صيانة أمس، قسم المحاسبة ما يقدر يفتح السيرفر. PC2 يقول إن الراوتر يرد عليه بس السيرفر لا. أما PC1 فما يطلع من الشبكة أبداً.',
  docs:[['PC1','192.168.1.10 /24','GW 192.168.1.1'],['PC2','192.168.1.20 /24','GW 192.168.1.1'],['R1 Gi0/0','192.168.1.1 /24','LAN'],['R1 Gi0/1','10.0.0.1 /24','Server side'],['Server','10.0.0.10 /24','GW 10.0.0.1']],
  tests:[{from:'PC1',to:'10.0.0.10',label:'PC1 → Server'},{from:'PC2',to:'10.0.0.10',label:'PC2 → Server'},{from:'R1',to:'10.0.0.10',label:'R1 → Server'}],
  hints:['قارن الـ Default Gateway عند PC1 وPC2 باستخدام ipconfig.','في R1 جرّب show ip route: هل الشبكة 10.0.0.0/24 كاملة موجودة؟ ثم show running-config وشوف الـ mask.','حتى لو الطلب وصل للسيرفر، لازم الرد يرجع. افحص Gateway السيرفر.'],
  solution:['PC1: ipconfig 192.168.1.10 255.255.255.0 192.168.1.1','R1: conf t → int g0/1 → ip address 10.0.0.1 255.255.255.0','Server: ipconfig 10.0.0.10 255.255.255.0 10.0.0.1'],
  pos:{PC1:[90,70],PC2:[90,250],SW1:[270,160],R1:[460,160],Server:[680,160]},
  devices:{
    PC1:{type:'pc',ip:'192.168.1.10',mask:M24,gw:'192.168.1.254'},
    PC2:{type:'pc',ip:'192.168.1.20',mask:M24,gw:'192.168.1.1'},
    SW1:{type:'switch',ports:{'Fa0/1':{},'Fa0/2':{},'Gi0/1':{}}},
    R1:{type:'router',ifaces:{'Gi0/0':{ip:'192.168.1.1',mask:M24},'Gi0/1':{ip:'10.0.0.1',mask:M30}}},
    Server:{type:'pc',server:true,ip:'10.0.0.10',mask:M24,gw:'10.0.0.254'}
  },
  links:[['PC1','Fa0','SW1','Fa0/1'],['PC2','Fa0','SW1','Fa0/2'],['SW1','Gi0/1','R1','Gi0/0'],['R1','Gi0/1','Server','Fa0']]
},
{
  id:'lab3', title:'شبكات VLAN', level:2,
  story:'الشركة قسمت الشبكة: VLAN 10 للمبيعات وVLAN 20 للموارد البشرية. موظف المبيعات PC2 انقطع عن زميله PC1، وجهاز PC3 في الموارد البشرية ما يشتغل نهائياً.',
  docs:[['PC1','192.168.10.11 /24','VLAN 10 · Fa0/1'],['PC2','192.168.10.12 /24','VLAN 10 · Fa0/2'],['PC3','192.168.20.13 /24','VLAN 20 · Fa0/3'],['R1 Gi0/0','192.168.10.1 /24','VLAN 10 · Fa0/24'],['R1 Gi0/1','192.168.20.1 /24','VLAN 20 · Fa0/23']],
  tests:[{from:'PC1',to:'192.168.10.12',label:'PC1 → PC2'},{from:'PC2',to:'192.168.20.13',label:'PC2 → PC3'},{from:'PC3',to:'192.168.10.11',label:'PC3 → PC1'}],
  hints:['في SW1: show vlan brief. هل كل منفذ في الـ VLAN الصحيحة حسب التوثيق؟','نفس الأمر: منفذ واحد ما يظهر حالته up. جرّب show ip interface brief.'],
  solution:['SW1: conf t → int fa0/2 → switchport access vlan 10','SW1: int fa0/3 → no shutdown'],
  pos:{PC1:[90,50],PC2:[90,160],PC3:[90,280],SW1:[330,160],R1:[600,160]},
  devices:{
    PC1:{type:'pc',ip:'192.168.10.11',mask:M24,gw:'192.168.10.1'},
    PC2:{type:'pc',ip:'192.168.10.12',mask:M24,gw:'192.168.10.1'},
    PC3:{type:'pc',ip:'192.168.20.13',mask:M24,gw:'192.168.20.1'},
    SW1:{type:'switch',vlans:{1:'default',10:'SALES',20:'HR'},ports:{'Fa0/1':{vlan:10},'Fa0/2':{vlan:20},'Fa0/3':{vlan:20,shut:true},'Fa0/23':{vlan:20},'Fa0/24':{vlan:10}}},
    R1:{type:'router',ifaces:{'Gi0/0':{ip:'192.168.10.1',mask:M24},'Gi0/1':{ip:'192.168.20.1',mask:M24}}}
  },
  links:[['PC1','Fa0','SW1','Fa0/1'],['PC2','Fa0','SW1','Fa0/2'],['PC3','Fa0','SW1','Fa0/3'],['SW1','Fa0/24','R1','Gi0/0'],['SW1','Fa0/23','R1','Gi0/1']]
},
{
  id:'lab4', title:'الـ Trunk المكسور', level:2,
  story:'المبنى فيه سويتشين مربوطين ببعض. المفروض موظفين VLAN 10 يشوفون بعض في الطابقين، ونفس الشي لـ VLAN 20. حالياً ما أحد يشوف أحد في الطابق الثاني.',
  docs:[['PC1','192.168.10.1 /24','SW1 · VLAN 10'],['PC2','192.168.20.1 /24','SW1 · VLAN 20'],['PC3','192.168.10.2 /24','SW2 · VLAN 10'],['PC4','192.168.20.2 /24','SW2 · VLAN 20'],['SW1 Gi0/1 ↔ SW2 Gi0/1','Trunk','يمرر VLAN 10 و 20']],
  tests:[{from:'PC1',to:'192.168.10.2',label:'PC1 → PC3 (VLAN 10)'},{from:'PC2',to:'192.168.20.2',label:'PC2 → PC4 (VLAN 20)'}],
  hints:['جرّب show interfaces trunk على السويتشين. لازم الرابط يكون trunk من الطرفين.','في SW1 شوف "Vlans allowed on trunk": هل VLAN 20 مسموحة؟','في SW2 جرّب show vlan brief: هل VLAN 20 موجودة أصلاً؟'],
  solution:['SW2: conf t → int g0/1 → switchport mode trunk','SW1: int g0/1 → switchport trunk allowed vlan add 20','SW2: vlan 20 → name HR'],
  pos:{PC1:[80,60],PC2:[80,260],SW1:[260,160],SW2:[540,160],PC3:[720,60],PC4:[720,260]},
  devices:{
    PC1:{type:'pc',ip:'192.168.10.1',mask:M24,gw:null},
    PC2:{type:'pc',ip:'192.168.20.1',mask:M24,gw:null},
    PC3:{type:'pc',ip:'192.168.10.2',mask:M24,gw:null},
    PC4:{type:'pc',ip:'192.168.20.2',mask:M24,gw:null},
    SW1:{type:'switch',vlans:{1:'default',10:'SALES',20:'HR'},ports:{'Fa0/1':{vlan:10},'Fa0/2':{vlan:20},'Gi0/1':{mode:'trunk',allowed:[10]}}},
    SW2:{type:'switch',vlans:{1:'default',10:'SALES'},ports:{'Fa0/1':{vlan:10},'Fa0/2':{vlan:20},'Gi0/1':{mode:'access',vlan:1}}}
  },
  links:[['PC1','Fa0','SW1','Fa0/1'],['PC2','Fa0','SW1','Fa0/2'],['SW1','Gi0/1','SW2','Gi0/1'],['PC3','Fa0','SW2','Fa0/1'],['PC4','Fa0','SW2','Fa0/2']]
},
{
  id:'lab5', title:'فرعين وراوترين', level:3,
  story:'الفرع الرئيسي (192.168.1.0) والفرع الثاني (192.168.2.0) مربوطين بخط بين R1 وR2. الفرعين ما يشوفون بعض، والمهندس السابق ترك التوجيه الثابت (Static Routing) ناقص.',
  docs:[['PC1','192.168.1.10 /24','GW 192.168.1.1'],['R1 Gi0/0','192.168.1.1 /24','LAN 1'],['R1 Gi0/1','10.1.1.1 /30','WAN'],['R2 Gi0/1','10.1.1.2 /30','WAN'],['R2 Gi0/0','192.168.2.1 /24','LAN 2'],['PC2','192.168.2.10 /24','GW 192.168.2.1']],
  tests:[{from:'PC1',to:'10.1.1.2',label:'PC1 → R2 (WAN)'},{from:'PC1',to:'192.168.2.10',label:'PC1 → PC2'},{from:'PC2',to:'192.168.1.10',label:'PC2 → PC1'}],
  hints:['ابدأ بالطبقة الأولى: show ip interface brief على R1 وR2.','show ip route على R1: هل فيه طريق للشبكة 192.168.2.0؟ قارن الـ network بالتوثيق.','show running-config على R2: هل الـ next-hop في ip route صحيح؟'],
  solution:['R2: int g0/1 → no shutdown','R1: conf t → no ip route 192.168.3.0 255.255.255.0 10.1.1.2 → ip route 192.168.2.0 255.255.255.0 10.1.1.2','R2: conf t → no ip route 192.168.1.0 255.255.255.0 10.1.1.5 → ip route 192.168.1.0 255.255.255.0 10.1.1.1'],
  pos:{PC1:[60,160],SW1:[190,160],R1:[330,160],R2:[500,160],SW2:[630,160],PC2:[750,160]},
  devices:{
    PC1:{type:'pc',ip:'192.168.1.10',mask:M24,gw:'192.168.1.1'},
    SW1:{type:'switch',ports:{'Fa0/1':{},'Gi0/1':{}}},
    R1:{type:'router',ifaces:{'Gi0/0':{ip:'192.168.1.1',mask:M24},'Gi0/1':{ip:'10.1.1.1',mask:M30}},routes:[{net:'192.168.3.0',mask:M24,nh:'10.1.1.2'}]},
    R2:{type:'router',ifaces:{'Gi0/0':{ip:'192.168.2.1',mask:M24},'Gi0/1':{ip:'10.1.1.2',mask:M30,shut:true}},routes:[{net:'192.168.1.0',mask:M24,nh:'10.1.1.5'}]},
    SW2:{type:'switch',ports:{'Fa0/1':{},'Gi0/1':{}}},
    PC2:{type:'pc',ip:'192.168.2.10',mask:M24,gw:'192.168.2.1'}
  },
  links:[['PC1','Fa0','SW1','Fa0/1'],['SW1','Gi0/1','R1','Gi0/0'],['R1','Gi0/1','R2','Gi0/1'],['R2','Gi0/0','SW2','Gi0/1'],['SW2','Fa0/1','PC2','Fa0']]
},
{
  id:'lab6', title:'التحدي النهائي', level:3,
  story:'شبكة شركة كاملة فيها VLANs وراوترين. وصلتك تذكرة: "الإدارة ما توصل للسيرفر في الفرع الثاني، والمبيعات ما تقدر تشوف الإدارة". فيه 4 أعطال مخفية. وقتك يبدأ الحين.',
  docs:[['PC1','192.168.10.10 /24','VLAN 10 · GW .10.1'],['PC2','192.168.20.10 /24','VLAN 20 · GW .20.1'],['SW1 Fa0/23','VLAN 20','→ R1 Gi0/2'],['SW1 Fa0/24','VLAN 10','→ R1 Gi0/0'],['R1 Gi0/0','192.168.10.1 /24',''],['R1 Gi0/2','192.168.20.1 /24',''],['R1 Gi0/1','10.2.2.1 /30','WAN'],['R2 Gi0/1','10.2.2.2 /30','WAN'],['R2 Gi0/0','172.16.0.1 /24',''],['Server','172.16.0.100 /24','GW 172.16.0.1']],
  tests:[{from:'PC1',to:'172.16.0.100',label:'PC1 → Server'},{from:'PC2',to:'172.16.0.100',label:'PC2 → Server'},{from:'PC1',to:'192.168.20.10',label:'PC1 → PC2'}],
  hints:['قسّم المشكلة: أول شي تأكد إن PC1 يوصل لبوابته، وPC2 يوصل لبوابته.','show vlan brief على SW1 وقارن بالتوثيق.','على R2: هل يعرف طريق الرجوع لشبكتين 192.168.10.0 و192.168.20.0؟'],
  solution:['SW1: int fa0/23 → switchport access vlan 20','R1: int g0/2 → no shutdown','R2: ip route 192.168.20.0 255.255.255.0 10.2.2.1','PC1: ipconfig 192.168.10.10 255.255.255.0 192.168.10.1'],
  pos:{PC1:[60,70],PC2:[60,250],SW1:[210,160],R1:[380,160],R2:[560,160],Server:[730,160]},
  devices:{
    PC1:{type:'pc',ip:'192.168.10.10',mask:'255.255.0.0',gw:'192.168.10.1'},
    PC2:{type:'pc',ip:'192.168.20.10',mask:M24,gw:'192.168.20.1'},
    SW1:{type:'switch',vlans:{1:'default',10:'SALES',20:'ADMIN'},ports:{'Fa0/1':{vlan:10},'Fa0/2':{vlan:20},'Fa0/23':{vlan:10},'Fa0/24':{vlan:10}}},
    R1:{type:'router',ifaces:{'Gi0/0':{ip:'192.168.10.1',mask:M24},'Gi0/1':{ip:'10.2.2.1',mask:M30},'Gi0/2':{ip:'192.168.20.1',mask:M24,shut:true}},routes:[{net:'172.16.0.0',mask:M24,nh:'10.2.2.2'}]},
    R2:{type:'router',ifaces:{'Gi0/0':{ip:'172.16.0.1',mask:M24},'Gi0/1':{ip:'10.2.2.2',mask:M30}},routes:[{net:'192.168.10.0',mask:M24,nh:'10.2.2.1'}]},
    Server:{type:'pc',server:true,ip:'172.16.0.100',mask:M24,gw:'172.16.0.1'}
  },
  links:[['PC1','Fa0','SW1','Fa0/1'],['PC2','Fa0','SW1','Fa0/2'],['SW1','Fa0/24','R1','Gi0/0'],['SW1','Fa0/23','R1','Gi0/2'],['R1','Gi0/1','R2','Gi0/1'],['R2','Gi0/0','Server','Fa0']]
}
];
if(typeof module!=='undefined') module.exports=LABS;
