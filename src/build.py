css=open('src/style.css').read(); js='\n'.join(open('src/'+f).read() for f in ['engine.js','labs.js','ui.js'])
html=f'''<!DOCTYPE html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>مختبر الأعطال · أكاديمية الشبكات</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<style>{css}</style></head><body>
<header><a href="#" class="logo">&gt;_</a><div><b>أكاديمية الشبكات</b><small>مختبر الأعطال · Troubleshooting Labs</small></div></header>
<div id="app"></div>
<script>{js}</script></body></html>'''
open('index.html','w').write(html)
