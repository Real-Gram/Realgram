from pathlib import Path
from html import escape as e
import re
root=Path('/var/www/realgram'); p=root/'seo-status.html'; old=p.read_text()
backup=root/'.git/seo-backups-20261020/seo-status.html'
if not backup.exists():backup.write_text(old)
queries=[('realgram',121,5,2.17),('real gram',17,0,6.59),('realgram',8,0,8.5),('gram vpn',4,0,7.0),('livegram vpn',2,0,9.5),('vpn gram',1,0,10.0),('وایرگارد یعنی چی',1,0,19.0)]
qrows=''.join('<tr><td class="kw"><bdi>'+e(q)+'</bdi></td><td>'+str(i)+'</td><td>'+str(c)+'</td><td>#'+str(pos).replace('.',',')+'</td></tr>' for q,i,c,pos in queries)
body=f'''<div class="wrap">
<header class="hero"><span class="eyebrow">Internt — ikke indeksert</span><h1>SEO-status for realgram.no</h1>
<p class="lede">Oppdatert med direkte uttrekk fra Google Search Console. Synligheten har økt litt, men klikkene har falt. Nye sider og målefeil er fulgt opp nedenfor.</p>
<div class="meta"><span>Oppdatert 20. oktober 2026</span><span>Dataperiode: 20. september–17. oktober</span><span><a href="https://admin.realgram.no/?page=seoranks">Åpne løpende målinger i admin</a></span></div></header>
<section><div class="head"><h2>Siste 28 dager mot de foregående 28 dagene</h2><p>Hele eiendommen sc-domain:realgram.no, inkludert anonymiserte søk. Tallene er ikke begrenset til søkeordlisten.</p></div>
<div class="card tbl"><table><thead><tr><th>Måling</th><th>23. aug.–19. sep.</th><th>20. sep.–17. okt.</th><th>Endring</th></tr></thead><tbody>
<tr><td>Visninger</td><td>223</td><td>244</td><td>+9,4 %</td></tr>
<tr><td>Klikk</td><td>16</td><td>5</td><td>−68,8 %</td></tr>
<tr><td>Klikkrate</td><td>7,17 %</td><td>2,05 %</td><td>−5,12 prosentpoeng</td></tr>
<tr><td>Gjennomsnittsposisjon</td><td>10,43</td><td>4,55</td><td>Bedre snitt; ulik søkemiks</td></tr>
</tbody></table><p class="note">Dette er observerte Google-tall før dagens endringer. De dokumenterer ikke effekten av de nye sidene. Lavt volum gir store prosentvise utslag.</p></div></section>
<section><div class="head"><h2>Søk Google faktisk rapporterer i denne perioden</h2><p>7 søk med tilgjengelige spørringsdata. Google skjuler enkelte søk; summen nedenfor blir derfor lavere enn 244 visninger.</p></div>
<div class="card tbl"><table><thead><tr><th>Søk</th><th>Visninger</th><th>Klikk</th><th>Snittposisjon</th></tr></thead><tbody>{qrows}</tbody></table>
<p class="note">Ingen rapportert spørringsrad betyr «ingen tilgjengelige søkedata», ikke et bevis på at siden er uindeksert eller utenfor topp 100.</p></div></section>
<section><div class="head"><h2>Hva som holdt arbeidet tilbake</h2></div><div class="card"><ul class="list">
<li><strong>Innholdet sto stille:</strong> Bloggjobben gjenskapte de samme 12 engelske og 12 persiske innleggene fra juli. Den publiserte ikke nytt redaksjonelt innhold av seg selv.</li>
<li><strong>Viktige søk var utelatt:</strong> Den gamle synken lagret bare eksakte treff på den eksisterende mållisten. Reelle søk som «real gram» og «gram vpn» ble utelatt fra panelet.</li>
<li><strong>Feil totalberegning:</strong> Oversikten summerte bare sporede søkeord og utelot øvrige søk og anonymiserte data.</li>
<li><strong>Ufullstendige synker:</strong> Loggen hadde SQLite-feil 17., 18. og 20. oktober. Oppdateringer var ikke samlet i én transaksjon. Den underliggende årsaken til de tidligere I/O-feilene er ikke endelig fastslått.</li>
<li><strong>Manglende landingssider:</strong> Freedom, Shahnameh og Hakim AI var hovedsakelig omtalt på forsiden. En eldre status fra september viste fortsatt planer og manglende data som «ikke rangert».</li>
</ul></div></section>
<section><div class="head"><h2>Utført 20. oktober</h2></div><div class="card"><ul class="list">
<li>90 dager hentet fra Google. 37 søk med observerte målinger i perioden; de 63 opprinnelige målene er bevart. Daglige totaltall hentes separat for hele eiendommen.</li>
<li>Synken bruker transaksjon, sideinndeling, persisk bokstavnormalisering og synlig feilstatus. To påfølgende kjøringer ga samme resultat uten doble GSC-rader; databasekontroll: OK.</li>
<li>Seks produktsider: <a href="/freedom/">Freedom</a> / <a href="/fa/freedom/">فارسی</a>, <a href="/shahnameh/">Shahnameh</a> / <a href="/fa/shahnameh/">فارسی</a>, <a href="/hakim-ai/">Hakim AI</a> / <a href="/fa/hakim-ai/">فارسی</a>. Unike titler, beskrivelser, canonical og gjensidige språklenker.</li>
<li>Ny guide: <a href="/blog/install-realgram-android-apk-guide/">installasjon og oppdatering av Android-appen</a> / <a href="/fa/blog/install-realgram-android-apk-guide-fa/">راهنمای فارسی</a>. Bloggen har nå 13 innlegg per språk.</li>
<li>Forsidens tittel, beskrivelse og hovedoverskrift forklarer produktet tydeligere. Nye produktsider er lenket fra begge forsider. En udokumentert lovnad om satellittforbindelse er erstattet med konkret informasjon om nettverksavhengighet.</li>
<li>Sitemap inneholder 38 unike adresser. Generatoren bevarer eksisterende innhold når API-et svarer feil eller tomt, og beholder de nye produktsidene i sitemap ved vanlige kjøringer.</li>
</ul></div></section>
<section><div class="head"><h2>Hva vi måler videre</h2></div><div class="card"><p>Følg visninger og klikk til de nye produktsidene, og om søk utover merkevaren begynner å vises. Bruk adminpanelet for daglig oppdaterte målinger. Denne siden er en datert status, ikke en automatisk oppdatert rangeringstabell.</p><p>Publisering og sitemap er verifisert. Google avgjør når sidene gjennomsøkes og indekseres; ingen ny rangering er dokumentert samme dag som publisering.</p></div></section>
<footer>Datert status: 20. oktober 2026 · Kilde: Google Search Console · Intern oversikt med noindex</footer></div>'''
p.write_text(old[:old.index('<body>')]+'<body>'+body+'</body></html>')
print('Updated dated SEO status with verified metrics, causes and completed actions.')
