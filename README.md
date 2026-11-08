# مختبر الأعطال · أكاديمية الشبكات
Network Troubleshooting Labs — لابات تفاعلية لاكتشاف أعطال الشبكات وإصلاحها مباشرة من المتصفح.

كل لابة شبكة جاهزة فيها أعطال مزروعة. الطالب يستخدم CLI محاكي (Cisco IOS + PC Command Prompt) ليكتشف الخطأ ويصلحه، والموقع يتحقق تلقائياً بتشغيل اختبارات ping.

## المزايا
- 6 لابات متدرجة: IP / Gateway / Shutdown / VLAN / Trunk / Static Routing
- محاكي أوامر: `show ip interface brief` · `show running-config` · `show ip route` · `show vlan brief` · `show interfaces trunk` · `ping` · `ipconfig`
- يدعم الاختصارات (`sh ip int br` · `conf t` · `no sh`) و `?` للمساعدة
- محرك شبكة حقيقي: VLANs، Trunks، توجيه ثابت، والرد لازم يرجع (Gateway الطرف الثاني مهم)
- تلميحات، حل، نجوم، مؤقت، وحفظ التقدم في المتصفح
- رابط مباشر لكل لابة: `#lab1` … `#lab6`

## التشغيل
افتح `index.html` في المتصفح، أو فعّل GitHub Pages على الفرع `main`.

## إضافة لابة
اللابات معرّفة في مصفوفة `LABS` داخل الملف: الأجهزة، الروابط، الأعطال، الاختبارات، والتلميحات.

---
نرجس العمري

## هيكل المشروع
- `index.html` — الموقع جاهز (ملف واحد)
- `src/` — الكود المصدري: `engine.js` (محرك الشبكة والـ CLI) · `labs.js` (اللابات) · `ui.js` · `style.css`
- لإعادة البناء بعد التعديل: `python3 src/build.py`
