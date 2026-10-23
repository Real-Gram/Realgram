'use strict';

// Design playground only. There are no account, advertising, call or VPN APIs.
const icons = {
  chats: '<path d="M4 19V8a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v5a5 5 0 0 1-5 5H9l-5 4Z"/><path d="M9 8h8M9 12h5"/>',
  phone: '<path d="m6 3 4 4-2 3a15 15 0 0 0 6 6l3-2 4 4-2 3C10 23 1 14 3 5Z"/>',
  video: '<rect x="3" y="5" width="12" height="14" rx="3"/><path d="m15 10 6-4v12l-6-4"/>',
  connect: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>',
  clan: '<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 4a3 3 0 0 1 0 6M19 14a6 6 0 0 1 3 5v2"/>',
  profile: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  edit: '<path d="m4 16 12-12 4 4L8 20l-5 1ZM14 6l4 4"/>',
  back: '<path d="m12 4-8 8 8 8M4 12h17"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
  send: '<path d="m3 3 19 9-19 9 4-9ZM7 12h15"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 15q4 4 8 0M8 9h.1M16 9h.1"/>',
  attach: '<path d="m8 13 7-7a3 3 0 0 1 4 4l-9 9a5 5 0 0 1-7-7L13 2M7 15l9-9"/>',
  play: '<path d="m9 5 10 7-10 7Z"/>',
  pause: '<path d="M9 5v14M16 5v14"/>',
  settings: '<path d="m9 3 1-2h4l1 2 3 2 3 1v4l-2 2 2 2v4l-3 1-3 2-1 2h-4l-1-2-3-2-3-1v-4l2-2-2-2V6l3-1Z"/><circle cx="12" cy="12" r="4"/>',
  bell: '<path d="M5 17h14l-2-4V8a5 5 0 0 0-10 0v5ZM10 21h4"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  copy: '<rect x="8" y="8" width="12" height="14" rx="2"/><path d="M16 8V2H3v15h5"/>',
  share: '<circle cx="18" cy="4" r="3"/><circle cx="5" cy="12" r="3"/><circle cx="18" cy="20" r="3"/><path d="m8 11 7-5M8 13l7 5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 18h.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 6h.1"/>',
  document: '<path d="M6 2h9l4 4v16H6ZM14 2v5h5M9 11h7M9 15h7M9 19h4"/>',
  incoming: '<path d="M19 5 5 19M5 9v10h10"/>',
  outgoing: '<path d="M5 19 19 5M9 5h10v10"/>',
  shield: '<path d="m12 2 8 3v7c0 6-8 10-8 10S4 18 4 12V5Z"/><path d="m8 12 3 3 5-6"/>',
};
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.chats}</svg>`;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const people = [
  {id:'sara',name:'Sara',avatar:0,preview:'That voice note 😂',time:'14:25',unread:2,online:true},
  {id:'amir',name:'Amir',avatar:1,preview:'See you tonight? 👀',time:'13:50',unread:1},
  {id:'mina',name:'Mina',avatar:2,preview:'Sent a sticker ✨',time:'12:16',unread:0},
  {id:'weekend',name:'Weekend crew',avatar:3,preview:'Noah: This looks amazing! 🔥',time:'11:24',unread:0,group:true},
  {id:'noah',name:'Noah',avatar:3,preview:'📷 Photo',time:'09:41',unread:0},
  {id:'leila',name:'Leila',avatar:4,preview:"Let’s catch up soon 💜",time:'Yesterday',unread:0},
];
const freshMessages = () => ({
  sara:[{text:'Movie night? 🍿',out:false,time:'14:20'},{text:"I’m in! 🍿\nWhat are we watching?",out:true,time:'14:22'},{text:'Thinking a cozy comedy\nand lots of snacks 😌',out:false,time:'14:23'},{sticker:'popcorn',out:false,time:'14:23',reaction:1},{text:'Sending the playlist now 🎧',out:true,time:'14:24'},{voice:true,out:false,time:'14:25',reaction:1}],
  amir:[{text:'See you tonight? 👀',out:false,time:'13:50'},{text:'Absolutely! Same place?',out:true,time:'13:51'}],
  mina:[{text:'A little love for your day 💕',out:false,time:'12:15'},{sticker:'cat',out:false,time:'12:16'}],
  weekend:[{text:'Noah: This looks amazing! 🔥',out:false,time:'11:24'}],
  noah:[{sticker:'sun',out:false,time:'09:41'}],
  leila:[{text:'Let’s catch up soon 💜',out:false,time:'Yesterday'}],
});
const state = {page:'chats',peer:null,filter:'all',query:'',callFilter:'recent',messages:freshMessages(),name:'Khabat',status:'Good vibes ✨',drawer:null,connected:false,notifications:true,viewport:'auto'};
const app=document.querySelector('#app');
const page=document.querySelector('#page');
const thread=document.querySelector('#thread');
const modal=document.querySelector('#modal');
const modalContent=document.querySelector('#modal-content');
let toastTimer;
let voiceTimer;
function toast(message){const node=document.querySelector('#toast');node.textContent=message;node.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{node.hidden=true;},3500);}
function avatar(person,extra=''){return `<span class="avatar a${person.avatar}${person.online?' online':''} ${extra}" role="img" aria-label="${escapeHTML(person.name)} avatar"></span>`;}
function round(name,action,label,classes=''){return `<button class="round ${classes}" data-action="${action}" aria-label="${escapeHTML(label)}">${icon(name)}</button>`;}
function primary(text,action,name=''){return `<button class="primary" data-action="${action}">${name?icon(name):''}${escapeHTML(text)}</button>`;}
function header(title,actions=''){return `<header class="page-header"><h1>${title}</h1><div class="header-actions">${actions}</div></header>`;}
function search(placeholder='Search messages'){return `<label class="search">${icon('search')}<input id="search-input" autocomplete="off" placeholder="${placeholder}" aria-label="${placeholder}" value="${escapeHTML(state.query)}"></label>`;}
function ad(call=false){return `<aside class="ad" aria-label="Example advertisement"><span class="sprite headphones" role="img" aria-label="Purple headphones"></span><div class="ad-copy"><span class="ad-label">Ad · Demo</span><strong>${call?'Made for your everyday':'Sound your way'}</strong><p>${call?'Clear sound. Brighter mood.':'Premium audio for brighter days.'}</p></div><button class="info" data-action="ad-info" aria-label="About this example ad">ⓘ</button><button class="explore" data-action="ad-explore">Explore</button></aside>`;}
function peopleRow(){return `<div class="people">${[people[0],people[1],people[2],people[4],people[5]].map(p=>`<button class="person" data-peer="${p.id}" aria-label="Open chat with ${p.name}">${avatar(p)}<span>${p.name}</span></button>`).join('')}</div>`;}
function conversation(p){return `<button class="conversation ${state.peer===p.id?'selected':''}" data-peer="${p.id}">${avatar(p)}<span class="copy"><strong>${escapeHTML(p.name)}</strong><p>${escapeHTML(p.preview)}</p></span><span class="meta"><time>${escapeHTML(p.time)}</time>${p.unread?`<span class="badge" aria-label="${p.unread} unread messages">${p.unread}</span>`:''}</span></button>`;}
function filteredPeople(){return people.filter(p=>(state.filter!=='unread'||p.unread)&&(state.filter!=='clan'||p.group)&&(!state.query||`${p.name} ${p.preview} ${(state.messages[p.id]||[]).map(m=>m.text||'').join(' ')}`.toLowerCase().includes(state.query.toLowerCase())));}
function renderConversations(){const root=document.querySelector('#conversation-list');if(root)root.innerHTML=filteredPeople().map(conversation).join('')||'<p class="empty-state">No conversations here.<br>Try another search or start a new chat.</p>';}
function renderChats(){return header('<span class="wordmark">'+icon('chats')+'real<span>gram</span></span>',round('search','focus-search','Search messages','ghost')+`<button data-nav="profile" aria-label="Open your profile"><span class="avatar a5" style="width:35px;height:35px"></span></button>`)+search()+'<div class="section-label"><span>Your people</span><button class="text-link" data-action="new-chat">See all</button></div>'+peopleRow()+loungeEntry()+ad()+`<div class="filters" aria-label="Conversation filters">${['all','unread','clan'].map(f=>`<button class="${state.filter===f?'active':''}" data-filter="${f}" aria-pressed="${state.filter===f}">${f[0].toUpperCase()+f.slice(1)}</button>`).join('')}</div><div id="conversation-list">${filteredPeople().map(conversation).join('')}</div>`+round('edit','new-chat','Start a new chat','gold fab');}
function callRow(p,i,contact=false){return `<div class="call-row">${avatar(p)}<div class="call-copy"><strong>${p.name}</strong><p class="${i===2&&!contact?'missed':''}">${contact?'<span class="gold-text">Realgram contact</span>':`${icon(i%2?'outgoing':'incoming')}${i===2?'Missed call':(i%2?'Outgoing call · 3 min':'Incoming call · 2 min')}`}</p></div>${!contact?`<time class="call-time">${['14:12','12:36','11:28','10:14','09:02'][i]}</time>`:''}<button class="round" data-call="${p.id}" aria-label="Call ${p.name}">${icon('phone')}</button><button class="round" data-video="${p.id}" aria-label="Video call ${p.name}">${icon('video')}</button></div>`;}
function renderCalls(){return header('Calls',round('search','call-search','Search contacts')+round('plus','new-call','New call'))+`<div class="filters" aria-label="Call filters">${['recent','contacts'].map(x=>`<button data-call-filter="${x}" class="${state.callFilter===x?'active':''}" aria-pressed="${state.callFilter===x}">${x==='recent'?'Recent':'Contacts'}</button>`).join('')}</div>`+ad(true)+`<div class="call-section">${state.callFilter==='recent'?'Today':'Your contacts'}</div>`+[people[0],people[1],people[2],people[4],people[5]].map((p,i)=>callRow(p,i,state.callFilter==='contacts')).join('')+'<div class="favorites"><div class="section-label"><span>Favorites</span><button class="text-link" data-action="new-call">See all</button></div>'+peopleRow()+'</div>';}
const menuRow=(name,text,action)=>`<button class="menu-row" data-action="${action}">${icon(name)}<span>${text}</span>${icon('arrow')}</button>`;
function clanCard(){return `<section class="clan-card"><div class="heading">${icon('clan')}<div><h2>Your clan</h2><p>Bring your people</p></div></div><div class="avatar-stack">${[people[2],people[1],people[0]].map(p=>avatar(p)).join('')}${round('plus','invite','Invite a friend')}</div><div class="invite-actions"><div class="invite-code"><small>Example invite code</small><button class="code-copy" data-action="copy-code" aria-label="Copy example invitation code"><span>RG2026</span>${icon('copy')}</button></div>${primary('Invite friends','invite','share')}</div></section>`;}
function renderProfile(){return header('Your space',round('settings','settings','Settings','ghost'))+`<div class="profile-wrap"><section class="identity-card"><span class="avatar a5" role="img" aria-label="Your example avatar"></span><div><h2 id="profile-name">${escapeHTML(state.name)}</h2><p class="handle">@khabat</p><button class="status-chip" data-action="edit-status">${escapeHTML(state.status)} &nbsp;✎</button></div></section><div class="menu-card">${menuRow('profile','Edit profile','edit-profile')}${menuRow('chats','Appearance','appearance')}${menuRow('bell','Notifications','notifications')}${menuRow('lock','Privacy','privacy')}</div>${clanCard()}<div class="menu-card">${menuRow('help','Help & support','support')}${menuRow('document','Terms of use','terms')}${menuRow('info','About Realgram','about')}</div><p class="fine-print">Free to use · Supported by ads</p></div>`;}
function renderClan(){return header('Your people',round('plus','invite','Invite friends','gold'))+`<div class="profile-wrap"><span class="example-pill">Example clan</span><h2 style="font-size:25px;margin-bottom:9px">Better, together.</h2><p class="muted" style="font-size:12px;line-height:1.8;margin-bottom:22px">Your circle, your conversations, your kind of people.</p>${clanCard()}<div class="section-label" style="margin:23px 0 5px"><span>Your crew · 3 friends</span><small>Example invitations</small></div><div class="member-list">${[people[0],people[1],people[2]].map((p,i)=>`<button class="conversation" data-peer="${p.id}">${avatar(p)}<span class="copy"><strong>${p.name}</strong><p>${i?'Joined your example clan':'Your first example invite ✨'}</p></span>${icon('arrow')}</button>`).join('')}</div><p class="fine-print">A place for people. No game access or payments.</p></div>`;}
function renderConnect(){return header('Connection',round('info','connection-info','About connection preview','ghost'))+`<div class="profile-wrap"><div class="connect-hero"><div class="connect-orb">${icon(state.connected?'shield':'connect')}</div><span class="example-pill">Visual preview only</span><h2>${state.connected?'Looking connected ✨':'Your world, closer.'}</h2><p>${state.connected?'This is an example connected state.':'A calmer connection screen.<br>Explore the look before connecting the real service.'}</p>${primary(state.connected?'Reset preview':'Preview connection','connect-preview')}</div><div class="menu-card">${menuRow('connect','Finland · Example location','choose-location')}${menuRow('shield','Connection details','connection-info')}</div>${ad()}<p class="fine-print">No VPN, network tunnel or live connection is started.</p></div>`;}
function renderNav(){document.querySelector('#navigation').innerHTML=[['chats','Chats','chats'],['calls','Calls','phone'],['connect','Connect','connect'],['clan','Clan','clan'],['profile','Profile','profile']].map(([id,label,symbol])=>`<button data-nav="${id}" class="${(state.page===id||(id==='chats'&&state.page==='lounge'))?'active':''}" ${state.page===id?'aria-current="page"':''}>${icon(symbol)}<span>${label}</span></button>`).join('');}
function render(){app.className=`app view-${state.page} ${state.viewport==='phone'?'simulate-phone':''}${state.peer&&state.page==='chats'?' thread-open':''}`;page.innerHTML=({chats:renderChats,calls:renderCalls,connect:renderConnect,clan:renderClan,profile:renderProfile,lounge:renderLounge}[state.page])();renderNav();renderThread();}
function messageMarkup(m,i){if(m.sticker)return `<div class="sticker-message${m.out?' out':''}" style="${m.out?'align-self:flex-end':''}"><span class="sprite ${m.sticker}${m.gif?' preview-gif':''}" role="img" aria-label="${m.sticker} sticker"></span><br><button class="reaction" data-react="${i}" aria-label="React to sticker">❤️ ${m.reaction||0}</button></div>`;if(m.voice)return `<div class="bubble voice">${round('play',`voice-${i}`,'Play example voice note','gold small')}<span class="wave" aria-hidden="true">${Array.from({length:25},(_,n)=>`<i style="height:${7+(n*13%23)}px"></i>`).join('')}</span><small>0:12</small></div>`;return `<div class="bubble${m.out?' out':''}" data-message="${i}">${escapeHTML(m.text).replace(/\n/g,'<br>')}<small>${escapeHTML(m.time)}${m.out?' <span class="ticks">✓✓</span>':''}</small></div>`;}
function renderThread(){thread.hidden=state.page!=='chats';if(!state.peer){thread.innerHTML=`<div class="thread-empty">${icon('chats')}<h2>A little luxury.<br>A lot of you.</h2><p>Open a conversation to try the new Realgram design.</p><p style="margin-top:20px;color:var(--gold)">GOLD AFTER DARK</p></div>`;return;}const p=people.find(x=>x.id===state.peer);thread.innerHTML=`<header class="thread-header">${round('back','back','Back to chats','ghost thread-back')}${avatar(p)}<button class="thread-name" data-action="peer-info" style="text-align:left"><strong>${p.name}</strong><small>${p.group?'Your crew · Example chat':'Online · Example'}</small></button><button class="round" data-call="${p.id}" aria-label="Audio call ${p.name}">${icon('phone')}</button><button class="round" data-video="${p.id}" aria-label="Video call ${p.name}">${icon('video')}</button>${round('more','thread-menu','Conversation options')}</header><div class="thread-body" id="messages" aria-live="polite" aria-relevant="additions"><span class="date-divider">Today · Example conversation</span>${(state.messages[p.id]||[]).map(messageMarkup).join('')}</div><form class="composer" id="composer">${round('plus','attachment','Add an attachment','ghost')}<div class="compose-field"><input id="message-input" placeholder="Message…" aria-label="Write a message" maxlength="2000" autocomplete="off"><button type="button" data-action="stickers" aria-label="Open stickers and emoji">${icon('smile')}</button><button type="button" data-action="attachment" aria-label="Attachments">${icon('attach')}</button></div><button class="round gold" type="submit" id="send-button" aria-label="Send example message">${icon('send')}</button></form>${state.drawer?drawerMarkup():''}`;thread.querySelectorAll('.composer button:not([type])').forEach(b=>{b.type='button';});requestAnimationFrame(()=>{const m=document.querySelector('#messages');if(m)m.scrollTop=m.scrollHeight;});}
function drawerMarkup(){
  const tabs=['emoji','stickers','gifs'].map(x=>`<button data-drawer="${x}" class="${state.drawer===x?'active':''}" aria-pressed="${state.drawer===x}">${{emoji:'Emoji',stickers:'Stickers',gifs:'GIFs'}[x]}</button>`).join('');
  const content=state.drawer==='emoji'
    ? '<div class="emoji-grid">'+['😂','💜','🔥','✨','🍿','😍','🎉','👀','🫶','🥳'].map(e=>`<button data-emoji="${e}" aria-label="Send ${e}">${e}</button>`).join('')+'</div>'
    : '<div class="sticker-grid">'+['popcorn','cat','sun'].map(s=>`<button data-sticker="${s}" aria-label="Send ${s} ${state.drawer==='gifs'?'animation':'sticker'}"><span class="sprite ${s}" role="img" aria-label="${s}"></span></button>`).join('')+'</div>';
  return `<section class="sticker-drawer" aria-label="Stickers and emoji"><div class="drawer-tabs">${tabs}<button data-action="close-drawer" aria-label="Close sticker drawer">✕</button></div>${content}${state.drawer==='gifs'?'<p class="fine-print">Original animated sticker previews · No external GIF service</p>':''}</section>`;
}
function openPeer(id){stopLounge();const person=people.find(p=>p.id===id);if(!person)return;person.unread=0;state.page='chats';state.peer=id;state.drawer=null;state.query='';render();}
function navigate(id){stopLounge();state.page=id;state.peer=null;state.query='';state.drawer=null;render();page.scrollTop=0;}
function showModal(title,body,extra=''){modal.className=extra;modalContent.innerHTML=`<div class="modal-inner"><div class="modal-top"><h2>${escapeHTML(title)}</h2>${round('close','close-modal','Close dialog','ghost small')}</div>${body}</div>`;if(!modal.open)modal.showModal();}
function closeModal(){modal.close();clearTimeout(voiceTimer);}
function now(){return new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
function addMessage(message){if(!state.peer)return;const p=people.find(p=>p.id===state.peer);state.messages[p.id].push({...message,out:true,time:now()});p.preview=message.text||(message.sticker?'Sent a sticker ✨':'Attachment');p.time=now();renderConversations();renderThread();document.querySelector('#message-input')?.focus();}
function showContacts(call=false){showModal(call?'Start a call':'New conversation',`<p>${call?'Choose an example contact. Calls are visual previews only.':'Try a conversation with one of your example contacts.'}</p><div class="compose-contacts">${people.filter(p=>!p.group).map(p=>`<button class="conversation" ${call?`data-call="${p.id}"`:`data-peer="${p.id}"`}>${avatar(p)}<span class="copy"><strong>${p.name}</strong><p>Example Realgram contact</p></span>${icon(call?'phone':'arrow')}</button>`).join('')}</div>`);}
function showCall(id,video=false){const p=people.find(x=>x.id===id);if(!p)return;showModal(video?'Video call preview':'Audio call preview',`<div class="call-modal">${avatar(p)}<h2>${p.name}</h2><p>Visual preview · No call is placed.<br>Your microphone and camera stay off.</p><div class="wave" style="justify-content:center;height:36px" aria-hidden="true">${Array.from({length:13},(_,i)=>`<i style="height:${8+i%5*5}px"></i>`).join('')}</div><button class="round" data-action="close-modal" aria-label="Close call preview">${icon('phone')}</button><p style="font-size:11px">Back to the good vibes.</p></div>`);}
function copyCode(){const value='RG2026 (Realgram design example)';if(navigator.clipboard?.writeText){navigator.clipboard.writeText(value).then(()=>toast('Example invite code copied.')).catch(()=>showModal('Example invite code','<p>Select and copy this example code: <strong>RG2026</strong></p>'));}else showModal('Example invite code','<p>Select and copy this example code: <strong>RG2026</strong></p>');}
const actions={
  'focus-search':()=>document.querySelector('#search-input')?.focus(),
  'new-chat':()=>showContacts(),
  'new-call':()=>showContacts(true),
  'call-search':()=>showContacts(true),
  'back':()=>{state.peer=null;state.drawer=null;render();},
  'close-modal':closeModal,
  'ad-info':()=>showModal('About this ad position','<p>This is an example ad card, placed above the conversation or call log. It shows the intended layout only. No advertising SDK, tracking, impressions or paid ad clicks run in this prototype.</p>'),
  'ad-explore':()=>showModal('Sound your way','<span class="sprite headphones" role="img" aria-label="Purple headphones"></span><p><strong class="gold-text">Example sponsored card.</strong><br>This is a design preview, not a real advertiser or a product offer. In the app, this position will use a properly labeled ad placement.</p>'+primary('Back to Realgram','close-modal')),
  'stickers':()=>{const draft=document.querySelector('#message-input')?.value||'';state.drawer=state.drawer?null:'stickers';renderThread();document.querySelector('#message-input').value=draft;},
  'close-drawer':()=>{const draft=document.querySelector('#message-input')?.value||'';state.drawer=null;renderThread();document.querySelector('#message-input').value=draft;},
  'attachment':()=>showModal('Add a little personality','<p>Try an example sticker attachment. This preview does not upload your files.</p><div class="sticker-grid">'+['popcorn','cat','sun'].map(s=>`<button data-sticker="${s}" aria-label="Send ${s}"><span class="sprite ${s}" role="img" aria-label="${s}"></span></button>`).join('')+'</div>'),
  'peer-info':()=>{const p=people.find(x=>x.id===state.peer);showModal(p.name,`<div style="display:flex;justify-content:center;margin:20px">${avatar(p)}</div><p>This is a fictional contact for testing the new messenger UI.</p>`+primary('Preview audio call',`call-peer`,'phone'));},
  'call-peer':()=>showCall(state.peer),
  'thread-menu':()=>showModal('Conversation',`<div class="menu-card">${menuRow('profile','View example profile','peer-info')}${menuRow('phone','Preview audio call','call-peer')}${menuRow('smile','Open stickers','menu-stickers')}</div><p>Example chat only. Nothing is sent to a live account.</p>`),
  'menu-stickers':()=>{closeModal();state.drawer='stickers';renderThread();},
  'edit-profile':()=>showModal('Make it yours',`<form id="profile-form"><label for="display-name">Display name</label><input id="display-name" value="${escapeHTML(state.name)}" maxlength="40" required><button class="primary" type="submit">Save name</button></form><p style="margin-top:14px;font-size:11px">Changes last for this browser session only.</p>`),
  'edit-status':()=>showModal('Your mood, your words',`<form id="status-form"><label for="status-input">Profile status</label><input id="status-input" value="${escapeHTML(state.status)}" maxlength="50" required><button class="primary" type="submit">Save status</button></form>`),
  'settings':()=>showModal('Your settings',`<div class="menu-card">${menuRow('chats','Appearance','appearance')}${menuRow('bell','Notifications','notifications')}${menuRow('lock','Privacy','privacy')}</div>`),
  'appearance':()=>showModal('Gold After Dark','<p>Near-black, warm charcoal and champagne gold, with lilac, mint and peach details. Both phone and wider Fold layouts stay in dark mode.</p><div style="display:flex;gap:12px;margin:22px 0">'+['#090a0e','#19191e','#e7c778','#b49aff','#73dfbc','#ffbb9a'].map(c=>`<span style="width:36px;height:36px;border-radius:50%;background:${c};border:1px solid #ffffff33"></span>`).join('')+'</div><p>Your system’s reduced-motion preference is respected.</p>'),
  'notifications':()=>showModal('Notifications',`<p>Preview the setting without requesting browser notifications.</p><button class="menu-row" data-action="toggle-notifications">${icon('bell')}<span>Message notifications</span><strong class="gold-text">${state.notifications?'On':'Off'}</strong></button>`),
  'toggle-notifications':()=>{state.notifications=!state.notifications;actions.notifications();},
  'privacy':()=>showModal('Your design playground','<p>The private design chats are fictional. Live Lounge is real and public: your chosen name and messages are sent to the room server and visible to everyone.</p><p>The private design area does not contact the messenger backend, request your contacts, use your camera or microphone, or start a VPN.</p><p>Private design messages and edits reset on reload. Public lounge messages are retained on the server for up to seven days. This preview has no analytics or advertising trackers.</p>'),
  'invite':()=>showModal('Bring your people',`<p>Your clan starts with the people you love talking to. Try the example invite card below; no real invitations are sent.</p><button class="code-copy" data-action="copy-code"><span>RG2026</span>${icon('copy')}</button><p style="margin-top:13px;font-size:11px">Example code · Not redeemable in the live app.</p>`+primary('Copy example code','copy-code','copy')),
  'copy-code':copyCode,
  'support':()=>showModal('We’re here for the conversation','<p>This is the Realgram design playground. Test the menus, send local example messages and try the sticker drawer. For feedback, note the screen, action and what you would change.</p>'),
  'terms':()=>showModal('Design preview terms','<p>This page is a UI prototype with fictional data. Live Lounge sends real public messages. Other chats, calls, ad offers and invitations are design examples.</p>'),
  'about':()=>showModal('Realgram · Gold After Dark','<p>A little luxury. A lot of you.</p><p>A free, ad-supported messenger design with lively avatars, gold accents, expressive conversations and a place for your clan.</p>'+primary('View approved concept','concept')),
  'connect-preview':()=>{state.connected=!state.connected;render();toast(state.connected?'Example connected state. No VPN is started.':'Connection preview reset.');},
  'connection-info':()=>showModal('A connection, reimagined','<p>This screen lets you review the visual connection states. It does not connect to a server, establish a VPN or test network performance.</p>'),
  'choose-location':()=>showModal('Example location','<p>Finland is a placeholder to review the location row. Live location selection will be connected in the native app.</p>'),
  'concept':()=>showModal('Approved design concept','<img src="./assets/design-concept.png" alt="Realgram Gold After Dark approved UI concept showing chats, a conversation, calls and profile.">','concept-modal'),
  'reset':()=>showModal('Start fresh?','<p>Reset the example conversations, display name and preview settings.</p>'+primary('Reset playground','confirm-reset')),
  'confirm-reset':()=>window.location.reload(),
};
// The lounge is real and public; the other design conversations stay local.
const ROOM_ENDPOINT='https://realgram.no/community/room.php';
const lounge={token:null,participant:null,messages:[],recent:0,error:'',timer:null,busy:false,sending:false,revision:0,selected:null,joinName:'',hidden:new Set(),pending:null,rendered:''};
function loungeEntry(){return `<button class="lounge-entry" data-action="lounge">${icon('clan')}<span><strong>Live Lounge <span class="room-live-dot"></span></strong><small>Public room · No friends needed</small></span>${icon('arrow')}</button>`;}
function renderLounge(){
  const top=header('Live Lounge',round('back','leave-lounge','Back to chats','ghost')+round('info','room-info','About the public lounge','ghost'));
  if(!lounge.token)return top+`<div class="room-join"><span class="connect-orb">${icon('clan')}</span><span class="example-pill">A real, public conversation</span><h2>Come as you are.</h2><p>No friends list. No invitation.<br>Join everyone in the Realgram lounge.</p><form id="room-join"><label for="room-name">Public display name</label><input id="room-name" maxlength="32" required value="${escapeHTML(lounge.joinName||state.name)}" autocomplete="nickname"><p class="public-note">Your name and messages will be visible to everyone in this room. Guest names are not verified accounts.</p><button class="primary" type="submit" ${lounge.busy?'disabled':''}>${lounge.busy?'Joining…':'Join lounge'}</button></form>${lounge.error?`<p class="room-error" role="status">${escapeHTML(lounge.error)}</p>`:''}</div>`;
  return top+`<div class="room-notice"><span class="room-live-dot"></span><span>Public · Visible to everyone</span><button data-action="room-refresh" aria-label="Refresh lounge">Refresh</button></div><div id="room-status" class="room-status" role="status"></div><div id="room-messages" class="lounge-body" aria-live="polite" aria-relevant="additions"></div><form class="composer" id="room-send"><div class="compose-field"><input id="room-input" placeholder="Say hello to everyone…" aria-label="Message to public lounge" maxlength="500" autocomplete="off"></div><button class="round gold" type="submit" aria-label="Send to public lounge">${icon('send')}</button></form>`;
}
function updateLounge(){
  const status=document.querySelector('#room-status'),list=document.querySelector('#room-messages');
  if(!status||!list)return;
  status.textContent=lounge.error||`${lounge.recent} active recently · Guest ${String(lounge.participant).slice(0,4)}`;
  status.classList.toggle('room-error',!!lounge.error);
  const rows=lounge.messages.filter(m=>!lounge.hidden.has(m.participant_id));
  const signature=JSON.stringify(rows);
  if(signature===lounge.rendered)return;
  const atBottom=list.scrollHeight-list.clientHeight-list.scrollTop<80;
  list.innerHTML=rows.length?rows.map(m=>`<div class="room-message ${m.mine?'mine':''}"><div class="room-author"><strong>${escapeHTML(m.name)}</strong><small>Guest · ${escapeHTML(m.participant_id.slice(0,4))}</small><button data-room-message="${m.id}" aria-label="Options for message from ${escapeHTML(m.name)}">•••</button></div><div class="bubble ${m.mine?'out':''}">${escapeHTML(m.body).replace(/\n/g,'<br>')}<small>${escapeHTML(new Date(m.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}))}</small></div></div>`).join(''):'<div class="empty-state">The room is quiet.<br>Be the first to say hello ✨</div>';
  lounge.rendered=signature;if(atBottom)list.scrollTop=list.scrollHeight;
}
async function roomRequest(action,body){
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(ROOM_ENDPOINT+'?action='+action,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(lounge.token?{'Authorization':'Bearer '+lounge.token}:{})},...(body?{body:JSON.stringify(body)}:{}),credentials:'omit',cache:'no-store',signal:controller.signal});
    const data=await response.json();
    if(!response.ok||!data.ok){if(response.status===401){lounge.token=null;stopLounge();}throw new Error(data.error||'The lounge is temporarily unavailable.');}
    return data;
  }catch(e){if(e.name==='AbortError')throw new Error('Connection timed out. Please retry.');throw e;}finally{clearTimeout(timeout);}
}
function acceptRoom(data){lounge.messages=data.messages;lounge.recent=data.active_recently;lounge.error='';updateLounge();}
async function refreshLounge(){if(!lounge.token||state.page!=='lounge'||lounge.busy||lounge.sending||document.hidden)return;lounge.busy=true;const revision=lounge.revision;try{const data=await roomRequest('messages');if(revision===lounge.revision)acceptRoom(data);}catch(e){lounge.error=e.message;if(!lounge.token&&state.page==='lounge')render();else updateLounge();}finally{lounge.busy=false;if(!lounge.token&&state.page==='lounge')render();}}
function stopLounge(){clearInterval(lounge.timer);lounge.timer=null;}
function startLounge(){stopLounge();lounge.rendered='';if(lounge.token){updateLounge();void refreshLounge();lounge.timer=setInterval(refreshLounge,3500);}}
function openLounge(){state.page='lounge';state.peer=null;state.drawer=null;render();startLounge();}
async function joinLounge(name){if(lounge.busy)return;lounge.joinName=name;lounge.busy=true;lounge.error='';render();try{const data=await roomRequest('join',{name});lounge.token=data.token;lounge.participant=data.participant_id;lounge.busy=false;render();startLounge();}catch(e){lounge.error=e.message;lounge.busy=false;render();}}
async function sendLounge(){
  if(lounge.sending)return;const field=document.querySelector('#room-input');const text=field.value.trim();if(!text)return;
  const pending=lounge.pending?.body===text?lounge.pending:{body:text,client_id:globalThis.crypto?.randomUUID?.()||('room_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2))};
  lounge.pending=pending;lounge.sending=true;lounge.revision++;const button=document.querySelector('#room-send button');button.disabled=true;
  try{const data=await roomRequest('send',pending);lounge.pending=null;acceptRoom(data);if(field.value.trim()===text)field.value='';}
  catch(e){lounge.error=e.message;updateLounge();if(!lounge.token)render();toast(e.message);}
  finally{lounge.sending=false;if(button.isConnected)button.disabled=false;}
}
function roomMessageOptions(id){const m=lounge.messages.find(x=>x.id===Number(id));if(!m)return;lounge.selected=m;showModal('Public message',`<p><strong>${escapeHTML(m.name)}</strong> · Guest ${escapeHTML(m.participant_id.slice(0,4))}</p><p>${escapeHTML(m.body)}</p>${m.mine?primary('Delete my message','room-delete'):primary('Report message','room-report')}${!m.mine?'<button class="menu-row" data-action="room-hide"><span>Hide this guest on this device</span></button>':''}`);}
async function moderateRoom(action){const m=lounge.selected;if(!m)return;closeModal();try{const result=await roomRequest(action,{message_id:m.id});if(action==='delete')acceptRoom(result);else toast('Report received for review.');}catch(e){toast(e.message);}}
Object.assign(actions,{
  'lounge':openLounge,
  'leave-lounge':()=>{stopLounge();navigate('chats');},
  'room-refresh':()=>{void refreshLounge();},
  'room-info':()=>showModal('Everyone is welcome','<p>This is a real public room, shared by website and design-APK users. You do not need friends or an invite to join.</p><p>Your display name and messages are visible to everyone. Guest names are not verified accounts. Use message options to report, hide a guest locally or delete your own message. Recent public messages are retained for up to seven days.</p>'),
  'room-delete':()=>{void moderateRoom('delete');},
  'room-report':()=>{void moderateRoom('report');},
  'room-hide':()=>{if(lounge.selected)lounge.hidden.add(lounge.selected.participant_id);closeModal();lounge.rendered='';updateLounge();toast('Guest hidden on this device for this session.');},
});
document.addEventListener('click',(event)=>{const b=event.target.closest('[data-room-message]');if(b)roomMessageOptions(b.dataset.roomMessage);});
document.addEventListener('submit',(event)=>{if(event.target.id==='room-join'){event.preventDefault();const value=document.querySelector('#room-name').value.trim();if(value)void joinLounge(value);}if(event.target.id==='room-send'){event.preventDefault();void sendLounge();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopLounge();else if(state.page==='lounge')startLounge();});
window.addEventListener('online',()=>{if(state.page==='lounge')startLounge();});


document.addEventListener('click',(event)=>{
  const target=event.target.closest('button');if(!target)return;
  if(target.dataset.nav){navigate(target.dataset.nav);return;}
  if(target.dataset.peer){closeModal();openPeer(target.dataset.peer);return;}
  if(target.dataset.call){showCall(target.dataset.call);return;}
  if(target.dataset.video){showCall(target.dataset.video,true);return;}
  if(target.dataset.filter){state.filter=target.dataset.filter;render();return;}
  if(target.dataset.callFilter){state.callFilter=target.dataset.callFilter;render();return;}
  if(target.dataset.drawer){const draft=document.querySelector('#message-input')?.value||'';state.drawer=target.dataset.drawer;renderThread();document.querySelector('#message-input').value=draft;return;}
  if(target.dataset.sticker){closeModal();addMessage({sticker:target.dataset.sticker,gif:state.drawer==='gifs'});return;}
  if(target.dataset.emoji){addMessage({text:target.dataset.emoji});return;}
  if(target.dataset.react!==undefined){const m=state.messages[state.peer][Number(target.dataset.react)];m.reaction=m.reaction?0:1;renderThread();return;}
  const action=target.dataset.action;if(action?.startsWith('voice-')){const parent=target.closest('.voice');parent.classList.toggle('playing');target.innerHTML=icon(parent.classList.contains('playing')?'pause':'play');toast('Visual voice-note preview. No audio is recorded or played.');clearTimeout(voiceTimer);voiceTimer=setTimeout(()=>{parent.classList.remove('playing');target.innerHTML=icon('play');},12000);return;}
  if(actions[action])actions[action]();
});
document.addEventListener('input',(event)=>{if(event.target.id==='search-input'){state.query=event.target.value;renderConversations();}});
document.addEventListener('submit',(event)=>{if(event.target.id==='composer'){event.preventDefault();const input=document.querySelector('#message-input');const value=input.value.trim();if(value)addMessage({text:value});else{state.drawer='stickers';renderThread();}return;}if(event.target.id==='profile-form'){event.preventDefault();const value=document.querySelector('#display-name').value.trim();if(!value)return;state.name=value;closeModal();render();toast('Display name updated for this session.');}if(event.target.id==='status-form'){event.preventDefault();const value=document.querySelector('#status-input').value.trim();if(!value)return;state.status=value;closeModal();render();toast('Status updated.');}});
modal.addEventListener('click',(event)=>{if(event.target===modal)closeModal();});
document.querySelector('#concept-open').addEventListener('click',actions.concept);
document.querySelector('#reset').addEventListener('click',actions.reset);
document.querySelector('#phone-view').addEventListener('click',()=>{state.viewport='phone';render();});
document.querySelector('#auto-view').addEventListener('click',()=>{state.viewport='auto';render();});
render();
