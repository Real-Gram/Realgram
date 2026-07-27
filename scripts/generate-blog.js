#!/usr/bin/env node
/**
 * Generates static, server-rendered blog pages + sitemap.xml from the live
 * blog API (shahnameh-backend), so Google indexes real content/URLs without
 * executing any client JS. Idempotent -- safe to re-run any time; run via
 * cron so new posts get a page + sitemap entry automatically.
 *
 * Writes:
 *   /var/www/realgram/blog/<slug>/index.html  (one per published post)
 *   /var/www/realgram/blog.html               (grid between BLOG_POSTS markers)
 *   /var/www/realgram/sitemap.xml             (home/faq/blog + every post)
 */
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');

const SITE_ROOT = '/var/www/realgram';
const SITE_URL = 'https://realgram.no';
const API_BASE = 'https://shahnameh.setaei.com/api/blog';
const STATS_API = 'https://shahnameh.setaei.com/api/public/stats';
const VERSION_API = 'https://setalink.no/download/version.json';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('bad JSON from ' + url + ': ' + e.message)); }
      });
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout: ' + url)); });
  });
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function fmtDateLong(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
function fmtDateShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function isoDate(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

function postTemplate(p, faSlug) {
  const url = SITE_URL + '/blog/' + encodeURIComponent(p.slug) + '/';
  const title = esc(p.title) + ' — RealGram';
  const desc = esc(p.excerpt || '');
  const hasImage = !!p.cover_image;
  const cardType = hasImage ? 'summary_large_image' : 'summary';
  const faUrl = faSlug ? SITE_URL + '/fa/blog/' + encodeURIComponent(faSlug) + '/' : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.excerpt || undefined,
    datePublished: p.published_at || undefined,
    url,
    image: p.cover_image || undefined,
    author: { '@type': 'Organization', name: 'RealGram' },
    publisher: { '@type': 'Organization', name: 'RealGram' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
  const jsonLdStr = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return '<!DOCTYPE html>\n'
    + '<html lang="en">\n'
    + '<head>\n'
    + '<!-- Google tag (gtag.js) -->\n'
    + '<script async src="https://www.googletagmanager.com/gtag/js?id=G-C6DPYN2MQZ"></script>\n'
    + '<script>\n'
    + '  window.dataLayer = window.dataLayer || [];\n'
    + '  function gtag(){dataLayer.push(arguments);}\n'
    + "  gtag('js', new Date());\n"
    + "  gtag('config', 'G-C6DPYN2MQZ');\n"
    + '</script>\n'
    + '<meta charset="UTF-8" />\n'
    + '<meta http-equiv="X-UA-Compatible" content="IE=edge" />\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
    + '<title>' + title + '</title>\n'
    + '<meta name="description" content="' + desc + '" />\n'
    + '<meta name="theme-color" content="#030609" />\n'
    + '<link rel="canonical" href="' + url + '" />\n'
    + '<link rel="icon" type="image/png" href="/favicon.png" />\n'
    + '<link rel="alternate" hreflang="en" href="' + url + '" />\n'
    + (faUrl ? '<link rel="alternate" hreflang="fa" href="' + faUrl + '" />\n' : '')
    + '\n'
    + '<meta property="og:type" content="article" />\n'
    + '<meta property="og:title" content="' + title + '" />\n'
    + '<meta property="og:description" content="' + desc + '" />\n'
    + '<meta property="og:url" content="' + url + '" />\n'
    + '<meta property="og:site_name" content="RealGram" />\n'
    + (p.published_at ? '<meta property="article:published_time" content="' + esc(p.published_at) + '" />\n' : '')
    + (hasImage ? '<meta property="og:image" content="' + esc(p.cover_image) + '" />\n' : '')
    + '\n'
    + '<meta name="twitter:card" content="' + cardType + '" />\n'
    + '<meta name="twitter:title" content="' + title + '" />\n'
    + '<meta name="twitter:description" content="' + desc + '" />\n'
    + (hasImage ? '<meta name="twitter:image" content="' + esc(p.cover_image) + '" />\n' : '')
    + '\n'
    + '<script type="application/ld+json">' + jsonLdStr + '</script>\n'
    + '\n'
    + '<link rel="preconnect" href="https://fonts.googleapis.com" />\n'
    + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n'
    + '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />\n'
    + '<link rel="stylesheet" href="/style.css" />\n'
    + '<style>\n'
    + '  .post-wrap { max-width:720px; }\n'
    + '  .post-date { font-size:.78rem; letter-spacing:.04em; text-transform:uppercase; color:#7A9BC0; }\n'
    + '  .post-cover { width:100%; border-radius:14px; margin:20px 0; display:block; }\n'
    + '  .post-body { font-size:1rem; line-height:1.75; color:#DDE6F0; }\n'
    + '  .post-body h2 { margin-top:2em; }\n'
    + '  .post-body a { color:#C77DFF; }\n'
    + '  .post-body p { margin:1em 0; }\n'
    + '  .post-back { display:inline-block; margin-bottom:20px; color:#7A9BC0; text-decoration:none; font-size:.85rem; }\n'
    + '  .post-back:hover { color:#C77DFF; }\n'
    + '</style>\n'
    + '</head>\n'
    + '<body>\n'
    + '<a class="skip-link" href="#main-content">Skip to main content</a>\n'
    + '<div class="bg-field" aria-hidden="true"></div>\n'
    + '<canvas id="cinematicDust" class="cinematic-dust" aria-hidden="true"></canvas>\n'
    + '\n'
    + '<header class="site-header">\n'
    + '  <div class="wrap header-inner">\n'
    + '    <a class="brand" href="/" aria-label="RealGram home">\n'
    + '      <img class="brand-mark" src="/brand/realtoken.png" width="44" height="44" alt="" aria-hidden="true">\n'
    + '      <span class="brand-word">Real<b>Gram</b></span>\n'
    + '    </a>\n'
    + '    <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">\n'
    + '      <span></span><span></span><span></span>\n'
    + '      <span class="sr-only">Menu</span>\n'
    + '    </button>\n'
    + '    <nav id="site-nav" class="site-nav" aria-label="Main">\n'
    + '      <a href="/#journey">How it works</a>\n'
    + '      <a href="/#ecosystem">Ecosystem</a>\n'
    + '      <a href="/#platforms">Where to play</a>\n'
    + '      <a href="/faq.html">FAQ</a>\n'
    + '      <a href="/blog.html">Blog</a>\n'
    + '      <a href="/#get" class="btn btn-small">Get RealGram</a>\n'
    + '    </nav>\n'
    + '  </div>\n'
    + '</header>\n'
    + '\n'
    + '<main id="main-content">\n'
    + '  <section class="wrap post-wrap" style="padding-top:48px">\n'
    + '    <a class="post-back" href="/blog.html">← Back to Blog</a>\n'
    + '    <span class="post-date">' + esc(fmtDateLong(p.published_at)) + '</span>\n'
    + '    <h1 style="margin:.4em 0 0">' + esc(p.title) + '</h1>\n'
    + (hasImage ? '    <img class="post-cover" src="' + esc(p.cover_image) + '" alt="' + esc(p.title) + '">\n' : '')
    + '    <div class="post-body">' + (p.body_html || '') + '</div>\n'
    + '  </section>\n'
    + '\n'
    + '  <section class="cta-band wrap">\n'
    + '    <h2>Want RealGram itself?</h2>\n'
    + '    <p>One app, one identity, one economy.</p>\n'
    + '    <div class="hero-actions center">\n'
    + '      <a href="/#get" class="btn btn-primary">Get RealGram</a>\n'
    + '    </div>\n'
    + '  </section>\n'
    + '</main>\n'
    + '\n'
    + '<footer class="site-footer">\n'
    + '  <div class="wrap footer-grid">\n'
    + '    <div class="footer-col">\n'
    + '      <span class="footer-brand"><img class="footer-brand-mark" src="/brand/realtoken.png" alt="" loading="lazy" /> RealGram</span>\n'
    + '      <p class="footer-tagline">One account. One identity. One app.</p>\n'
    + '    </div>\n'
    + '    <div class="footer-col">\n'
    + '      <p class="footer-col-title">Product</p>\n'
    + '      <a href="/#journey">How it works</a>\n'
    + '      <a href="/#ecosystem">Ecosystem</a>\n'
    + '      <a href="/#platforms">Where to play</a>\n'
    + '    </div>\n'
    + '    <div class="footer-col">\n'
    + '      <p class="footer-col-title">Resources</p>\n'
    + '      <a href="/faq.html">FAQ</a>\n'
    + '      <a href="/blog.html">Blog</a>\n'
    + '    </div>\n'
    + '    <div class="footer-col">\n'
    + '      <p class="footer-col-title">Company</p>\n'
    + '      <p class="footer-fine">RealGram is an independent product and is not\n'
    + '        affiliated with, endorsed by, or an official client of any messaging\n'
    + '        platform it may interoperate with.</p>\n'
    + '    </div>\n'
    + '  </div>\n'
    + '  <div class="wrap footer-bottom">\n'
    + '    <p class="footer-parts">Freedom · Shahnameh · REAL Wallet · Messages · Clan · Hakim AI</p>\n'
    + '    <p class="footer-copy">© 2026 SETAEI (<a href="https://www.setai.no">setai.no</a>). Part of the REAL ecosystem.</p>\n'
    + '  </div>\n'
    + '</footer>\n'
    + '\n'
    + '<script src="/app.js"></script>\n'
    + '</body>\n'
    + '</html>\n';
}

function renderCard(p) {
  const url = '/blog/' + encodeURIComponent(p.slug) + '/';
  const date = fmtDateShort(p.published_at);
  const img = p.cover_image ? '<img src="' + esc(p.cover_image) + '" alt="" loading="lazy">' : '';
  return '<a class="blog-card reveal" href="' + url + '">'
    + img
    + '<div class="blog-card-body">'
    + '<span class="blog-card-date">' + esc(date) + '</span>'
    + '<h3>' + esc(p.title) + '</h3>'
    + '<p>' + esc(p.excerpt || '') + '</p>'
    + '</div></a>';
}

function fmtDateFa(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderCardFa(p) {
  const url = '/fa/blog/' + encodeURIComponent(p.slug) + '/';
  const date = fmtDateFa(p.published_at);
  const img = p.cover_image ? '<img src="' + esc(p.cover_image) + '" alt="" loading="lazy">' : '';
  return '<a class="blog-card reveal" href="' + url + '">'
    + img
    + '<div class="blog-card-body">'
    + '<span class="blog-card-date">' + esc(date) + '</span>'
    + '<h3>' + esc(p.title) + '</h3>'
    + '<p>' + esc(p.excerpt || '') + '</p>'
    + '</div></a>';
}

/* Persian post page -- mirrors postTemplate() structurally (same CSS
   classes, same [dir="rtl"] rules already in style.css) but with RTL
   chrome and Persian nav/footer text. */
function postTemplateFa(p) {
  const url = SITE_URL + '/fa/blog/' + encodeURIComponent(p.slug) + '/';
  const title = esc(p.title) + ' — رئال‌گرام';
  const desc = esc(p.excerpt || '');
  const hasImage = !!p.cover_image;
  const cardType = hasImage ? 'summary_large_image' : 'summary';
  const enUrl = p.translation_of ? SITE_URL + '/blog/' + encodeURIComponent(p.translation_of) + '/' : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.excerpt || undefined,
    datePublished: p.published_at || undefined,
    url,
    image: p.cover_image || undefined,
    inLanguage: 'fa',
    author: { '@type': 'Organization', name: 'RealGram' },
    publisher: { '@type': 'Organization', name: 'RealGram' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
  const jsonLdStr = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return '<!DOCTYPE html>\n'
    + '<html lang="fa" dir="rtl">\n'
    + '<head>\n'
    + '<!-- Google tag (gtag.js) -->\n'
    + '<script async src="https://www.googletagmanager.com/gtag/js?id=G-C6DPYN2MQZ"></script>\n'
    + '<script>\n'
    + '  window.dataLayer = window.dataLayer || [];\n'
    + '  function gtag(){dataLayer.push(arguments);}\n'
    + "  gtag('js', new Date());\n"
    + "  gtag('config', 'G-C6DPYN2MQZ');\n"
    + '</script>\n'
    + '<meta charset="UTF-8" />\n'
    + '<meta http-equiv="X-UA-Compatible" content="IE=edge" />\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
    + '<title>' + title + '</title>\n'
    + '<meta name="description" content="' + desc + '" />\n'
    + '<meta name="theme-color" content="#030609" />\n'
    + '<link rel="canonical" href="' + url + '" />\n'
    + '<link rel="icon" type="image/png" href="/favicon.png" />\n'
    + (enUrl ? '<link rel="alternate" hreflang="en" href="' + enUrl + '" />\n' : '')
    + '<link rel="alternate" hreflang="fa" href="' + url + '" />\n'
    + '\n'
    + '<meta property="og:type" content="article" />\n'
    + '<meta property="og:title" content="' + title + '" />\n'
    + '<meta property="og:description" content="' + desc + '" />\n'
    + '<meta property="og:url" content="' + url + '" />\n'
    + '<meta property="og:site_name" content="RealGram" />\n'
    + '<meta property="og:locale" content="fa_IR" />\n'
    + (p.published_at ? '<meta property="article:published_time" content="' + esc(p.published_at) + '" />\n' : '')
    + (hasImage ? '<meta property="og:image" content="' + esc(p.cover_image) + '" />\n' : '')
    + '\n'
    + '<meta name="twitter:card" content="' + cardType + '" />\n'
    + '<meta name="twitter:title" content="' + title + '" />\n'
    + '<meta name="twitter:description" content="' + desc + '" />\n'
    + (hasImage ? '<meta name="twitter:image" content="' + esc(p.cover_image) + '" />\n' : '')
    + '\n'
    + '<script type="application/ld+json">' + jsonLdStr + '</script>\n'
    + '\n'
    + '<link rel="preconnect" href="https://fonts.googleapis.com" />\n'
    + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n'
    + '<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />\n'
    + '<link rel="stylesheet" href="/style.css" />\n'
    + '<style>\n'
    + '  .post-wrap { max-width:720px; }\n'
    + '  .post-date { font-size:.78rem; letter-spacing:.04em; text-transform:uppercase; color:#7A9BC0; }\n'
    + '  .post-cover { width:100%; border-radius:14px; margin:20px 0; display:block; }\n'
    + '  .post-body { font-size:1rem; line-height:1.9; color:#DDE6F0; }\n'
    + '  .post-body h2 { margin-top:2em; }\n'
    + '  .post-body a { color:#C77DFF; }\n'
    + '  .post-body p { margin:1em 0; }\n'
    + '  .post-back { display:inline-block; margin-bottom:20px; color:#7A9BC0; text-decoration:none; font-size:.85rem; }\n'
    + '  .post-back:hover { color:#C77DFF; }\n'
    + '</style>\n'
    + '</head>\n'
    + '<body>\n'
    + '<a class="skip-link" href="#main-content">رفتن به محتوای اصلی</a>\n'
    + '<div class="bg-field" aria-hidden="true"></div>\n'
    + '<canvas id="cinematicDust" class="cinematic-dust" aria-hidden="true"></canvas>\n'
    + '\n'
    + '<header class="site-header">\n'
    + '  <div class="wrap header-inner">\n'
    + '    <a class="brand" href="/fa/" aria-label="خانه رئال‌گرام">\n'
    + '      <img class="brand-mark" src="/brand/realtoken.png" width="44" height="44" alt="" aria-hidden="true">\n'
    + '      <span class="brand-word"><b>رئال‌گرام</b></span>\n'
    + '    </a>\n'
    + '    <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">\n'
    + '      <span></span><span></span><span></span>\n'
    + '      <span class="sr-only">منو</span>\n'
    + '    </button>\n'
    + '    <nav id="site-nav" class="site-nav" aria-label="منوی اصلی">\n'
    + '      <a href="/fa/#journey">چگونه کار می‌کند</a>\n'
    + '      <a href="/fa/#ecosystem">اکوسیستم</a>\n'
    + '      <a href="/fa/#platforms">از کجا شروع کنم</a>\n'
    + '      <a href="/fa/faq.html">سوالات متداول</a>\n'
    + '      <a href="/fa/blog.html">وبلاگ</a>\n'
    + '      <a href="/fa/#get" class="btn btn-small">دریافت رئال‌گرام</a>\n'
    + '    </nav>\n'
    + '  </div>\n'
    + '</header>\n'
    + '\n'
    + '<main id="main-content">\n'
    + '  <section class="wrap post-wrap" style="padding-top:48px">\n'
    + '    <a class="post-back" href="/fa/blog.html">→ بازگشت به وبلاگ</a>\n'
    + '    <span class="post-date">' + esc(fmtDateFa(p.published_at)) + '</span>\n'
    + '    <h1 style="margin:.4em 0 0">' + esc(p.title) + '</h1>\n'
    + (hasImage ? '    <img class="post-cover" src="' + esc(p.cover_image) + '" alt="' + esc(p.title) + '">\n' : '')
    + '    <div class="post-body">' + (p.body_html || '') + '</div>\n'
    + '  </section>\n'
    + '\n'
    + '  <section class="cta-band wrap">\n'
    + '    <h2>رئال‌گرام را می‌خواهید؟</h2>\n'
    + '    <p>یک اپ، یک هویت، یک اقتصاد.</p>\n'
    + '    <div class="hero-actions center">\n'
    + '      <a href="/fa/#get" class="btn btn-primary">دریافت رئال‌گرام</a>\n'
    + '    </div>\n'
    + '  </section>\n'
    + '</main>\n'
    + '\n'
    + '<footer class="site-footer">\n'
    + '  <div class="wrap footer-grid">\n'
    + '    <div class="footer-col">\n'
    + '      <span class="footer-brand"><img class="footer-brand-mark" src="/brand/realtoken.png" alt="" loading="lazy" /> رئال‌گرام</span>\n'
    + '      <p class="footer-tagline">یک حساب. یک هویت. یک اپلیکیشن.</p>\n'
    + '    </div>\n'
    + '    <div class="footer-col">\n'
    + '      <p class="footer-col-title">محصول</p>\n'
    + '      <a href="/fa/#journey">چگونه کار می‌کند</a>\n'
    + '      <a href="/fa/#ecosystem">اکوسیستم</a>\n'
    + '      <a href="/fa/#platforms">از کجا شروع کنم</a>\n'
    + '    </div>\n'
    + '    <div class="footer-col">\n'
    + '      <p class="footer-col-title">منابع</p>\n'
    + '      <a href="/fa/faq.html">سوالات متداول</a>\n'
    + '      <a href="/fa/blog.html">وبلاگ</a>\n'
    + (enUrl ? '      <a href="' + enUrl + '" class="lang-switch" aria-label="Switch to English" title="English"><span aria-hidden="true">🌐 EN</span></a>\n' : '')
    + '    </div>\n'
    + '    <div class="footer-col">\n'
    + '      <p class="footer-col-title">شرکت</p>\n'
    + '      <p class="footer-fine">رئال‌گرام محصولی مستقل است و وابسته به،\n'
    + '        تأییدشده از سوی، یا کلاینت رسمی هیچ پلتفرم پیام‌رسانی که ممکن است\n'
    + '        با آن تعامل داشته باشد، نیست.</p>\n'
    + '    </div>\n'
    + '  </div>\n'
    + '  <div class="wrap footer-bottom">\n'
    + '    <p class="footer-parts">Freedom · شاهنامه · کیف پول REAL · پیام‌رسان · کلن · حکیم AI</p>\n'
    + '    <p class="footer-copy">© ۲۰۲۶ SETAEI (<a href="https://www.setai.no">setai.no</a>). بخشی از اکوسیستم REAL.</p>\n'
    + '  </div>\n'
    + '</footer>\n'
    + '\n'
    + '<script src="/app.js"></script>\n'
    + '</body>\n'
    + '</html>\n';
}

function buildSitemap(posts, postsFa) {
  const urls = [
    { loc: SITE_URL + '/', changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_URL + '/fa/', changefreq: 'weekly', priority: '1.0' },
    { loc: SITE_URL + '/faq.html', changefreq: 'monthly', priority: '0.6' },
    { loc: SITE_URL + '/fa/faq.html', changefreq: 'monthly', priority: '0.6' },
    { loc: SITE_URL + '/blog.html', changefreq: 'weekly', priority: '0.7' },
    { loc: SITE_URL + '/fa/blog.html', changefreq: 'weekly', priority: '0.7' },
  ].concat(posts.map((p) => ({
    loc: SITE_URL + '/blog/' + encodeURIComponent(p.slug) + '/',
    changefreq: 'monthly',
    priority: '0.6',
    lastmod: isoDate(p.published_at),
  }))).concat((postsFa || []).map((p) => ({
    loc: SITE_URL + '/fa/blog/' + encodeURIComponent(p.slug) + '/',
    changefreq: 'monthly',
    priority: '0.6',
    lastmod: isoDate(p.published_at),
  })));

  const body = urls.map((u) => (
    '  <url>\n'
    + '    <loc>' + u.loc + '</loc>\n'
    + (u.lastmod ? '    <lastmod>' + u.lastmod + '</lastmod>\n' : '')
    + '    <changefreq>' + u.changefreq + '</changefreq>\n'
    + '    <priority>' + u.priority + '</priority>\n'
    + '  </url>'
  )).join('\n');

  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + body + '\n'
    + '</urlset>\n';
}

async function fetchFullPosts(locale) {
  const listResp = await get(API_BASE + '/posts?locale=' + encodeURIComponent(locale));
  const listedPosts = (listResp && listResp.status && listResp.posts) || [];
  const full = [];
  for (const p of listedPosts) {
    try {
      const detail = await get(API_BASE + '/posts/' + encodeURIComponent(p.slug));
      full.push((detail && detail.status && detail.post) ? detail.post : p);
    } catch (e) {
      console.error('generate-blog: failed to fetch detail for ' + p.slug + ', using list data:', e.message);
      full.push(p);
    }
  }
  return full;
}

async function main() {
  // Blog-post generation and the homepage stats/version refresh are
  // independent concerns hitting the same flaky upstream (shahnameh-backend
  // restarts under load on this 1GB box). Previously a single failed fetch
  // anywhere in the blog-post path (thrown before reaching updateStats())
  // aborted the whole run, which is why the homepage numbers/version string
  // went stale for good instead of just retrying clean on the next 15-min
  // cron tick -- confirmed via generate-blog.cron.log showing zero
  // successful "homepage stats updated" runs ever logged. Isolating this
  // block means a blog-fetch blip no longer blocks the stats/version half.
  try {
    await generateBlogPages();
  } catch (e) {
    console.error('generate-blog: blog-post generation failed, leaving blog pages/sitemap as last-generated:', e.message);
  }

  await updateStats();
  await updateVersion();
}

async function generateBlogPages() {
  const fullPosts = await fetchFullPosts('en');
  const fullPostsFa = await fetchFullPosts('fa');
  const faBySource = new Map(fullPostsFa.map((p) => [p.translation_of, p]));

  // Write one static page per post; remove stale directories for posts that
  // no longer exist so old/deleted posts don't stay indexable forever.
  const blogDir = path.join(SITE_ROOT, 'blog');
  fs.mkdirSync(blogDir, { recursive: true });
  const currentSlugs = new Set(fullPosts.map((p) => p.slug));
  for (const entry of fs.readdirSync(blogDir, { withFileTypes: true })) {
    if (entry.isDirectory() && !currentSlugs.has(entry.name)) {
      fs.rmSync(path.join(blogDir, entry.name), { recursive: true, force: true });
    }
  }
  for (const p of fullPosts) {
    const dir = path.join(blogDir, p.slug);
    fs.mkdirSync(dir, { recursive: true });
    const translated = faBySource.get(p.slug);
    fs.writeFileSync(path.join(dir, 'index.html'), postTemplate(p, translated ? translated.slug : null));
  }

  // Regenerate the blog.html listing grid between its markers.
  const blogHtmlPath = path.join(SITE_ROOT, 'blog.html');
  let blogHtml = fs.readFileSync(blogHtmlPath, 'utf8');
  const cardsHtml = fullPosts.length
    ? fullPosts.map(renderCard).join('\n      ')
    : '<p style="text-align:center;color:#7A9BC0;padding:40px 0;grid-column:1/-1">No posts yet — check back soon.</p>';
  const marker = /(<!-- BLOG_POSTS_START[\s\S]*?-->\s*<div class="blog-grid" id="blog-grid">)([\s\S]*?)(<\/div>\s*<!-- BLOG_POSTS_END -->)/;
  if (marker.test(blogHtml)) {
    blogHtml = blogHtml.replace(marker, (_m, pre, _mid, post) => pre + '\n      ' + cardsHtml + '\n    ' + post);
    fs.writeFileSync(blogHtmlPath, blogHtml);
  } else {
    console.error('generate-blog: BLOG_POSTS markers not found in blog.html -- grid NOT updated');
  }

  // Write one static page per Persian post, same stale-directory cleanup
  // as the English side.
  const blogDirFa = path.join(SITE_ROOT, 'fa', 'blog');
  fs.mkdirSync(blogDirFa, { recursive: true });
  const currentSlugsFa = new Set(fullPostsFa.map((p) => p.slug));
  for (const entry of fs.readdirSync(blogDirFa, { withFileTypes: true })) {
    if (entry.isDirectory() && !currentSlugsFa.has(entry.name)) {
      fs.rmSync(path.join(blogDirFa, entry.name), { recursive: true, force: true });
    }
  }
  for (const p of fullPostsFa) {
    const dir = path.join(blogDirFa, p.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), postTemplateFa(p));
  }

  // Persian blog listing: use the real fa card wherever a translation
  // exists (matched via translation_of, faBySource built above), fall
  // back to the English card (English title, /blog/<slug>/ link) for
  // posts not translated yet -- upgrades automatically as more
  // translations get published, no code change needed.
  const blogHtmlFaPath = path.join(SITE_ROOT, 'fa', 'blog.html');
  if (fs.existsSync(blogHtmlFaPath)) {
    let blogHtmlFa = fs.readFileSync(blogHtmlFaPath, 'utf8');
    const mergedCards = fullPosts.map((p) => {
      const translated = faBySource.get(p.slug);
      return translated ? renderCardFa(translated) : renderCard(p);
    });
    const cardsHtmlFa = mergedCards.length
      ? mergedCards.join('\n      ')
      : '<p style="text-align:center;color:#7A9BC0;padding:40px 0;grid-column:1/-1">به‌زودی مقاله‌ای منتشر می‌شود.</p>';
    const markerFa = /(<!-- BLOG_POSTS_START_FA[\s\S]*?-->\s*<div class="blog-grid" id="blog-grid">)([\s\S]*?)(<\/div>\s*<!-- BLOG_POSTS_END_FA -->)/;
    if (markerFa.test(blogHtmlFa)) {
      blogHtmlFa = blogHtmlFa.replace(markerFa, (_m, pre, _mid, post) => pre + '\n      ' + cardsHtmlFa + '\n    ' + post);
      fs.writeFileSync(blogHtmlFaPath, blogHtmlFa);
    } else {
      console.error('generate-blog: BLOG_POSTS_FA markers not found in fa/blog.html -- grid NOT updated');
    }
  }

  // Regenerate sitemap.xml.
  fs.writeFileSync(path.join(SITE_ROOT, 'sitemap.xml'), buildSitemap(fullPosts, fullPostsFa));

  console.log('generate-blog: ' + fullPosts.length + ' en post(s), ' + fullPostsFa.length + ' fa post(s) -> blog/<slug>/, fa/blog/<slug>/, blog.html, fa/blog.html, sitemap.xml');
}

const FA_DIGITS = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
function toFaDigits(n) {
  return String(n).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
}

/* Real, live numbers only on the homepage stat strip -- no fabricated
   social proof (standing rule, see realgram-docs/content/SEO_STRATEGY.md).
   Pulls from the public
   stats API and substitutes the two <span class="stat-num"> values
   between the STATS markers in each homepage, leaving everything else
   (labels, markup) untouched. */
async function updateStats() {
  let stats;
  try {
    const resp = await get(STATS_API);
    if (!resp || resp.status !== 1 || !resp.stats) throw new Error('bad response shape');
    stats = resp.stats;
  } catch (e) {
    console.error('generate-blog: failed to fetch stats, leaving homepage numbers as last-generated:', e.message);
    return;
  }

  const patchNums = (html, markerStart, markerEnd, values) => {
    const re = new RegExp('(<!-- ' + markerStart + '[\\s\\S]*?-->)([\\s\\S]*?)(<!-- ' + markerEnd + ' -->)');
    const m = html.match(re);
    if (!m) {
      console.error('generate-blog: ' + markerStart + '/' + markerEnd + ' markers not found -- stats NOT updated');
      return html;
    }
    let section = m[2];
    let i = 0;
    section = section.replace(/(<span class="stat-num">)([^<]*)(<\/span>)/g, (_full, a, _old, c) => a + values[i++] + c);
    return html.slice(0, m.index) + m[1] + section + m[3] + html.slice(m.index + m[0].length);
  };

  const enPath = path.join(SITE_ROOT, 'index.html');
  fs.writeFileSync(enPath, patchNums(
    fs.readFileSync(enPath, 'utf8'), 'STATS_START', 'STATS_END',
    [String(stats.total_users), String(stats.players_with_progress)]
  ));

  const faPath = path.join(SITE_ROOT, 'fa', 'index.html');
  if (fs.existsSync(faPath)) {
    fs.writeFileSync(faPath, patchNums(
      fs.readFileSync(faPath, 'utf8'), 'STATS_START_FA', 'STATS_END_FA',
      [toFaDigits(stats.total_users), toFaDigits(stats.players_with_progress)]
    ));
  }
}

/* Android "direct APK" version pill on the homepage -- pulls the same
   version.json the app itself uses for update checks (top-level `version`,
   i.e. whichever build the "direct APK" link on this same page actually
   downloads), so the two can never drift apart the way the hand-typed
   string did (was stuck at v0.9.91 while three releases shipped). */
async function updateVersion() {
  let version;
  try {
    const resp = await get(VERSION_API);
    if (!resp || !resp.version) throw new Error('bad response shape');
    version = resp.version;
  } catch (e) {
    console.error('generate-blog: failed to fetch version.json, leaving homepage version as last-generated:', e.message);
    return;
  }

  const patchSpan = (html, markerStart, markerEnd, spanHtml) => {
    const re = new RegExp('(<!-- ' + markerStart + ' -->)([\\s\\S]*?)(<!-- ' + markerEnd + ' -->)');
    const m = html.match(re);
    if (!m) {
      console.error('generate-blog: ' + markerStart + '/' + markerEnd + ' markers not found -- version NOT updated');
      return html;
    }
    return html.slice(0, m.index) + m[1] + spanHtml + m[3] + html.slice(m.index + m[0].length);
  };

  const enPath = path.join(SITE_ROOT, 'index.html');
  fs.writeFileSync(enPath, patchSpan(
    fs.readFileSync(enPath, 'utf8'), 'VERSION_START', 'VERSION_END',
    '<span class="platform-dl-version">v' + version + ' · direct APK</span>'
  ));

  const faPath = path.join(SITE_ROOT, 'fa', 'index.html');
  if (fs.existsSync(faPath)) {
    fs.writeFileSync(faPath, patchSpan(
      fs.readFileSync(faPath, 'utf8'), 'VERSION_START_FA', 'VERSION_END_FA',
      '<span class="platform-dl-version">نسخه‌ی ' + toFaDigits(version) + ' · APK مستقیم</span>'
    ));
  }
}

main().catch((err) => {
  console.error('generate-blog FAILED:', err);
  process.exitCode = 1;
});
