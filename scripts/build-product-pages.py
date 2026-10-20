#!/usr/bin/env python3
"""Build bilingual product guides from reviewed, versioned content."""
from pathlib import Path
from html import escape as e
import json,re,shutil
root=Path(__file__).resolve().parent.parent
pages=json.loads((root/'docs/seo-product-pages.json').read_text())
for lang in ('en','fa'):
    prefix='/fa/' if lang=='fa' else '/'
    home=root/('fa/index.html' if lang=='fa' else 'index.html')
    text=home.read_text()
    backup=root/'.git/seo-backups-20261020'
    backup.mkdir(exist_ok=True)
    target=backup/('home-'+lang+'.html')
    if not target.exists(): shutil.copy2(home,target)
    header=re.search(r'<header class="site-header">[\s\S]*?</header>',text).group()
    header=header.replace('href="#','href="'+prefix+'#')
    analytics=re.search(r'<!-- Google tag[\s\S]*?</script>\s*<script>[\s\S]*?</script>',text).group()
    footer=re.search(r'<footer class="site-footer">[\s\S]*?</footer>',text).group()
    labels={'freedom':'Freedom VPN','shahnameh':'بازی شاهنامه' if lang=='fa' else 'Shahnameh game','hakim-ai':'دستیار حکیم' if lang=='fa' else 'Hakim AI'}
    links=' · '.join('<a href="'+prefix+p['slug']+'/">'+labels[p['slug']]+'</a>' for p in pages)
    band='<section class="wrap" style="padding:32px 24px"><h2>'+('راهنمای امکانات رئال‌گرام' if lang=='fa' else 'Explore RealGram features')+'</h2><p style="line-height:2">'+links+'</p></section>'
    for p in pages:
        d=p[lang]; url='https://realgram.no'+prefix+p['slug']+'/'
        alt='https://realgram.no'+('/' if lang=='fa' else '/fa/')+p['slug']+'/'
        sections=''.join('<section><h2>'+e(h)+'</h2><p>'+e(body)+'</p></section>' for h,body in d['sections'])
        faq=''.join('<details><summary>'+e(q)+'</summary><p>'+e(a)+'</p></details>' for q,a in d['faq'])
        ld={'@context':'https://schema.org','@type':'WebPage','name':d['h1'],'description':d['description'],'url':url,'inLanguage':lang,'dateModified':'2026-10-20','isPartOf':{'@type':'WebSite','name':'RealGram','url':'https://realgram.no/'}}
        download='دریافت رئال‌گرام اندروید' if lang=='fa' else 'Download RealGram for Android'
        ld_json=json.dumps(ld,ensure_ascii=False).replace('<',chr(92)+'u003c')
        head=f'''<!doctype html><html lang="{lang}"{(' dir="rtl"' if lang=='fa' else '')}><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(d['title'])}</title><meta name="description" content="{e(d['description'],quote=True)}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="{lang}" href="{url}"><link rel="alternate" hreflang="{('en' if lang=='fa' else 'fa')}" href="{alt}">
<link rel="alternate" hreflang="x-default" href="https://realgram.no/{p['slug']}/">
<meta property="og:type" content="website"><meta property="og:title" content="{e(d['title'],quote=True)}">
<meta property="og:description" content="{e(d['description'],quote=True)}"><meta property="og:url" content="{url}">
<meta property="og:image" content="https://realgram.no/brand/covers/realgram-home.png">
<link rel="icon" href="/favicon.png"><link rel="stylesheet" href="/style.css">
<style>.product-guide{{max-width:800px;padding:54px 24px}}.product-guide h1{{font-size:clamp(2rem,5vw,3.3rem);line-height:1.2}}.product-guide p{{line-height:1.85;margin:18px 0}}.product-guide section{{margin:36px 0}}.product-guide a{{color:var(--gold,#e2b85a)}}.product-guide summary{{cursor:pointer;padding:15px 0;font-weight:600}}.product-guide details{{border-bottom:1px solid #37404a}}.product-guide .btn{{color:#101010}}.site-header{{position:relative}}</style>
<script type="application/ld+json">{ld_json}</script>
{analytics}</head><body><a class="skip-link" href="#main-content">Skip to main content</a>'''
        page_header=re.sub(r'<a\b[^>]*class="[^"]*\blang-switch\b[^"]*"[^>]*>',lambda m: re.sub(r'href="[^"]*"','href="'+alt+'"',m.group()),header)
        html=head+page_header+'<main id="main-content" class="wrap product-guide"><p><a href="'+prefix+'">RealGram</a> / '+e(labels[p['slug']])+'</p><h1>'+e(d['h1'])+'</h1><p class="lead">'+e(d['intro'])+'</p><a class="btn btn-primary" href="'+prefix+'#get">'+download+'</a>'+sections+'<section><h2>'+('پرسش‌های رایج' if lang=='fa' else 'Frequently asked questions')+'</h2>'+faq+'</section><p>'+links+'</p><p><a href="'+prefix+'blog.html">'+('مطالعه راهنماها در وبلاگ' if lang=='fa' else 'Read the RealGram guides')+'</a></p><p>'+('به‌روزرسانی: ۲۰ اکتبر ۲۰۲۶' if lang=='fa' else 'Updated 20 October 2026')+'</p></main>'+footer+'<script src="/app.js"></script></body></html>'
        dest=root/(prefix.strip('/')+'/'+p['slug'] if prefix!="/" else p['slug'])/'index.html'
        dest.parent.mkdir(parents=True,exist_ok=True); dest.write_text(html)
    # Search-focused homepage metadata; preserve layout and download version.
    title='رئال‌گرام اندروید | وی‌پی‌ان Freedom، پیام‌رسان و بازی شاهنامه' if lang=='fa' else 'RealGram for Android | Freedom VPN, messaging & Shahnameh'
    desc='رئال‌گرام اندروید را دانلود کنید؛ اتصال Freedom، پیام‌رسان، بازی شاهنامه، کیف پول REAL و دستیار حکیم با یک REAL-ID.' if lang=='fa' else 'Download RealGram for Android. Explore Freedom VPN, messaging, the Shahnameh game, REAL Wallet and Hakim AI with one REAL-ID.'
    text=re.sub(r'<title>.*?</title>','<title>'+title+'</title>',text,count=1)
    text=re.sub(r'<meta name="description" content="[^"]*" />','<meta name="description" content="'+desc+'" />',text,count=1)
    h1='رئال‌گرام؛ اتصال، پیام‌رسانی<br>و شاهنامه در یک اپلیکیشن.' if lang=='fa' else 'RealGram: VPN, messaging<br>and Shahnameh in one app.'
    text=re.sub(r'<h1>[\s\S]*?</h1>','<h1>'+h1+'</h1>',text,count=1)
    # Replace unverified satellite connectivity promise with verifiable usage.
    if lang=='en':
        text=re.sub(r'(<section id="freedom"[\s\S]*?<p class="lead">)[\s\S]*?</p>',r'\1Freedom brings connection controls into RealGram, with VLESS and Reality transport support. Connection availability depends on your network and the configured server. Read the guide for Android setup and troubleshooting.</p>',text,count=1)
        text=text.replace('Freedom · always-on connect','Freedom · connection tools')
        text=text.replace("Routing that keeps adapting while you're already connected",'Connection controls inside RealGram').replace('Satellite-backed fallback for when towers and fiber both fail','Android setup and troubleshooting guide')
    else:
        text=re.sub(r'(<section id="freedom"[\s\S]*?<p class="lead">)[\s\S]*?</p>',r'\1Freedom ابزار اتصال را با پشتیبانی از VLESS و Reality در رئال‌گرام قرار می‌دهد. دسترسی به اتصال به شبکه و تنظیمات سرور بستگی دارد. برای نصب اندروید و بررسی مشکل اتصال، راهنمای Freedom را بخوانید.</p>',text,count=1)
        text=text.replace('Freedom · اتصال همیشه‌برقرار','Freedom · ابزار اتصال').replace('مسیریابی‌ای که حتی وقتی از قبل متصلید هم تطبیق پیدا می‌کند','کنترل اتصال در رئال‌گرام').replace('پشتیبان ماهواره‌ای برای وقتی که هم دکل‌ها و هم فیبر قطع‌اند','راهنمای نصب اندروید و بررسی مشکل اتصال')
    marker='<!-- PRODUCT_GUIDES_START -->'
    block=marker+band+'<!-- PRODUCT_GUIDES_END -->'
    if marker in text: text=re.sub(r'<!-- PRODUCT_GUIDES_START -->[\s\S]*?<!-- PRODUCT_GUIDES_END -->',block,text)
    else: text=text.replace('</main>',block+'\n</main>',1)
    home.write_text(text)
print('Built 6 product pages and linked them from both homepages.')
