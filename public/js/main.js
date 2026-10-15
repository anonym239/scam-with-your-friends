import { ICONS, APP_COLORS } from './icons.js';
import { avatarSVG } from './avatar.js';
import { listModels, version, chatJSON } from './ollama.js';
import { PERSONAS, makeSecret, secretText, trustLabel, onlyDigits, findCode } from './callers.js';
import { callerTurn, agentTurn as aiAgentTurn, lessons } from './ai.js';

// ---------------------------------------------------------------- Helpers
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

// ---------------------------------------------------------------- Settings
const DEFAULT_SCRIPT = `KOTLANA CALL SCRIPT v2.3
1. Freundlich begrüßen ("Kotlana Tech Support, wie kann ich helfen?")
2. Problem ernst nehmen und beruhigen
3. Komplimente machen, Geduld zeigen – Vertrauen aufbauen
4. Erst ab genug Vertrauen nach der Karte fragen
5. Code / Kartendaten vorlesen lassen und im Vault einlösen
NIEMALS: drohen, hetzen, beleidigen (Vertrauen sinkt!)`;

const DEFAULTS = {
  base: '/ollama', callerModel: 'demo', agentModel: 'demo', temperature: 0.8, lang: 'de',
  autoplay: false, tts: false, coworkers: true, recording: true, playerName: 'Agent', script: DEFAULT_SCRIPT,
};
const store = {
  get(k, d) { try { const v = localStorage.getItem('kotlana:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('kotlana:' + k, JSON.stringify(v)); } catch {} },
};
const firstRun = !store.get('settings', null);
const S = { ...DEFAULTS, ...store.get('settings', {}) };
const saveSettings = () => { store.set('settings', S); refreshAgentChip(); };
let MODELS = [];
let ollamaOK = null;

// ---------------------------------------------------------------- Game state
const G = {
  personal: 0, team: 0, quota: 600, reviewLeft: 600, round: 1, gameMin: 15 * 60 + 8,
  call: null, lastClaimable: null, lastPersona: null, upgrades: {}, recordings: [],
  nextCallAt: null, agentBusy: false, over: false,
};

// ---------------------------------------------------------------- Window manager
const APPS = {};
const WM = {
  wins: {}, z: 10,
  open(id) {
    let w = this.wins[id];
    if (!w) w = this.create(id);
    w.el.classList.remove('min');
    this.focus(id);
    renderTaskbar();
    APPS[id].onOpen?.(w);
    return w;
  },
  create(id) {
    const a = APPS[id];
    const vw = innerWidth, vh = innerHeight - 64;
    // Fenster ohne feste Position leicht versetzt öffnen, damit sie sich nicht exakt verdecken
    const n = Object.keys(this.wins).length;
    const L = { ...a, x: a.x ?? (vw - a.w) / 2 + (n % 6) * 28 - 70, y: a.y ?? (vh - a.h) / 2 + (n % 6) * 24 - 60, ...layout(id) };
    const W = Math.min(L.w, vw - 20), H = Math.min(L.h, vh - 20);
    const x = clamp(L.x ?? (vw - W) / 2, 0, Math.max(0, vw - W)), y = clamp(L.y ?? (vh - H) / 2, 0, Math.max(0, vh - H));
    const el = h(`<div class="window" style="left:${x}px;top:${y}px;width:${W}px;height:${H}px">
      <div class="win-title"><span class="wi" style="background:${APP_COLORS[id]}">${ICONS[a.icon || id]}</span>
      <span class="wt">${esc(a.title)}</span>
      <button class="mi" title="Minimieren">&#9472;</button><button class="ma" title="Maximieren">&#9744;</button><button class="x" title="Schließen">&#10005;</button></div>
      <div class="win-body"></div></div>`);
    const body = $('.win-body', el);
    body.append(a.render());
    $('#windows').append(el);
    el.addEventListener('pointerdown', () => this.focus(id));
    $('.mi', el).onclick = (e) => { e.stopPropagation(); this.minimize(id); };
    $('.ma', el).onclick = () => el.classList.toggle('max');
    $('.x', el).onclick = (e) => { e.stopPropagation(); this.close(id); };
    const title = $('.win-title', el);
    title.addEventListener('dblclick', () => el.classList.toggle('max'));
    title.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || el.classList.contains('max')) return;
      const ox = e.clientX - el.offsetLeft, oy = e.clientY - el.offsetTop;
      title.setPointerCapture(e.pointerId);
      const move = (ev) => {
        el.style.left = clamp(ev.clientX - ox, -el.offsetWidth + 80, innerWidth - 80) + 'px';
        el.style.top = clamp(ev.clientY - oy, 0, innerHeight - 64 - 38) + 'px';
      };
      const up = () => { title.removeEventListener('pointermove', move); title.removeEventListener('pointerup', up); };
      title.addEventListener('pointermove', move);
      title.addEventListener('pointerup', up);
    });
    return (this.wins[id] = { el, body });
  },
  focus(id) { const w = this.wins[id]; if (w) { w.el.style.zIndex = ++this.z; this.active = id; renderTaskbar(); } },
  minimize(id) { this.wins[id]?.el.classList.add('min'); this.active = null; renderTaskbar(); },
  close(id) { const w = this.wins[id]; if (!w) return; APPS[id].onClose?.(); w.el.remove(); delete this.wins[id]; renderTaskbar(); },
  isOpen(id) { return !!this.wins[id]; },
};

// Startpositionen passend zur Bildschirmgröße: Telefon neben den Icons, Kamera und Kassen rechts daneben.
function layout(id) {
  const vw = innerWidth, vh = innerHeight - 64;
  if (vw < 900) return {};
  const left = $('#icons-left').getBoundingClientRect().right;
  const r = $('#icons-right').getBoundingClientRect();
  const rightEdge = (r.width ? r.left : vw) - 14;
  const phoneW = 420, phoneX = clamp(left + 16, 0, vw - phoneW);
  const side = phoneX + phoneW + 16, sideW = Math.min(760, rightEdge - side);
  if (id === 'phone') return { x: phoneX, y: 10 };
  if (sideW < 340) return {};
  const camH = Math.round(sideW * 0.62);
  if (id === 'camera') return { x: side, y: 20, w: sideW, h: camH };
  if (id === 'giftcards' || id === 'creditcard') {
    const h = id === 'giftcards' ? 400 : 480;
    return { x: side, y: clamp(20 + camH - 60, 0, Math.max(0, vh - h)), w: sideW };
  }
  return {};
}

// ---------------------------------------------------------------- Desktop & taskbar
const LEFT_ICONS = ['scamazon', 'giftcards', 'browser', 'banditcam', 'creditcard', 'camera', 'settings', 'demo'];
const RIGHT_ICONS = ['script', 'phone'];
const PINNED = ['script', 'phone', 'camera'];

function iconEl(id) {
  const a = APPS[id];
  const el = h(`<button class="icon"><span class="ic" style="background:${APP_COLORS[id]}">${id === 'banditcam' ? '' : ICONS[a.icon || id]}</span><span>${esc(a.label || a.title)}</span></button>`);
  if (id === 'banditcam') {
    $('.ic', el).innerHTML = avatarSVG({ skin: '#e2572c', hair: '#111', style: 'short', beard: '#111' }, 'angry');
    $('.ic', el).style.background = 'none';
    $('.ic svg', el).style.cssText = 'width:64px;height:64px';
  }
  if (id === 'scamazon') $('.ic', el).append(h('<span class="badge">!</span>'));
  el.onclick = () => { $$('.icon').forEach((i) => i.classList.remove('sel')); el.classList.add('sel'); };
  el.ondblclick = () => WM.open(id);
  el.addEventListener('keydown', (e) => e.key === 'Enter' && WM.open(id));
  // Touch: einfacher Tap öffnet
  el.addEventListener('pointerup', (e) => e.pointerType === 'touch' && WM.open(id));
  return el;
}

function renderTaskbar() {
  const box = $('#tb-apps');
  box.innerHTML = '';
  const ids = [...new Set([...PINNED, ...Object.keys(WM.wins)])];
  for (const id of ids) {
    const b = h(`<button class="tb-btn" title="${esc(APPS[id].title)}"><span class="ic" style="display:grid;place-items:center;width:44px;height:44px;border-radius:4px;background:${APP_COLORS[id]}">${ICONS[APPS[id].icon || id]}</span></button>`);
    $('svg', b).style.cssText = 'width:30px;height:30px';
    if (WM.isOpen(id)) b.classList.add('open');
    if (WM.active === id) b.classList.add('active');
    b.onclick = () => {
      const w = WM.wins[id];
      if (!w) return WM.open(id);
      if (w.el.classList.contains('min')) WM.open(id);
      else if (WM.active === id) WM.minimize(id);
      else WM.focus(id);
    };
    box.append(b);
  }
}

function refreshAgentChip() {
  const c = $('#tb-agent');
  c.classList.toggle('on', S.autoplay);
  const PH = { greet: 'Begrüßung', rapport: 'Vertrauen aufbauen', calm: 'beruhigen', bridge: 'Überleitung', ask: 'fragt nach Code', redeem: 'löst ein' };
  const ph = S.autoplay && G.call?.status === 'active' && G.call.phase ? ` · ${PH[G.call.phase]}` : '';
  c.textContent = S.autoplay ? `🤖 KI spielt · ${S.agentModel === 'demo' ? 'Demo' : S.agentModel}${ph}` : '🧑 Du spielst';
}

function toast(text, icon = 'banditcam', ms = 5000) {
  const ic = icon === 'banditcam'
    ? avatarSVG({ skin: '#e2572c', hair: '#111', style: 'short', beard: '#111' }, 'angry')
    : `<span style="display:grid;place-items:center;width:44px;height:44px;border-radius:4px;background:${APP_COLORS[icon] || '#333'}">${ICONS[icon] || ''}</span>`;
  const el = h(`<div class="toast"><span class="t-ic">${ic}</span><span>${esc(text)}</span><button class="t-x">&#10005;</button></div>`);
  $('.t-x', el).onclick = () => el.remove();
  $('#toasts').append(el);
  setTimeout(() => el.remove(), ms);
}

function updateStats() {
  $('#st-personal').textContent = money(G.personal);
  $('#st-team').textContent = money(G.team);
  $('#st-quota').textContent = money(G.quota);
  const m = Math.floor(G.reviewLeft / 60), s = G.reviewLeft % 60;
  $('#st-review').textContent = `${m}:${String(s).padStart(2, '0')}`;
  const hh = Math.floor(G.gameMin / 60) % 24, mm = G.gameMin % 60;
  $('#clock-time').textContent = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  APPS.scamazon.refresh?.();
}

// ---------------------------------------------------------------- Speech
function speak(text, who) {
  if (!S.tts || !('speechSynthesis' in window)) return Promise.resolve();
  return new Promise((res) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = S.lang === 'de' ? 'de-DE' : 'en-US';
    u.pitch = who === 'agent' ? 0.8 : 1.1 + ((G.call?.p.age || 50) < 50 ? 0.2 : -0.1);
    u.rate = 1.05;
    u.onend = u.onerror = () => res();
    speechSynthesis.speak(u);
    setTimeout(res, 15000);
  });
}

// ---------------------------------------------------------------- Ringtone
let audioCtx, ringTimer;
function startRing() {
  stopRing();
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const beep = () => {
      [0, 0.25].forEach((t) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.frequency.value = 880; g.gain.value = 0.04;
        o.connect(g).connect(audioCtx.destination);
        o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.18);
      });
    };
    beep(); ringTimer = setInterval(beep, 1600);
  } catch {}
}
function stopRing() { clearInterval(ringTimer); }

// ---------------------------------------------------------------- Calls
function scheduleNextCall(ms = 4000 + Math.random() * 4000) {
  clearTimeout(G.nextCallTimer);
  G.nextCallAt = Date.now() + ms;
  G.nextCallTimer = setTimeout(ringCall, ms);
  renderPhone();
}

function ringCall() {
  if (G.over || (G.call && G.call.status !== 'ended')) return;
  const pool = PERSONAS.filter((p) => p.id !== G.lastPersona);
  const p = pool[Math.floor(Math.random() * pool.length)];
  G.lastPersona = p.id;
  G.call = {
    p, trust: p.start + (G.upgrades.badge ? 10 : 0), secret: makeSecret(p), history: [], status: 'ringing',
    mood: 'neutral', busy: false, claimed: false, revealed: false, started: new Date(), patience: p.patience,
  };
  G.nextCallAt = null;
  WM.open('phone'); // holt das Telefon nach vorn, auch wenn es minimiert oder verdeckt ist
  renderPhone();
  startRing();
  if (S.autoplay) setTimeout(() => G.call?.status === 'ringing' && acceptCall(), 1800);
}

async function acceptCall() {
  const c = G.call;
  if (!c || c.status !== 'ringing') return;
  stopRing();
  c.status = 'active';
  if (S.recording) toast('Automatic recording started');
  renderPhone();
  await sleep(700);
  if (G.call !== c) return;
  addMsg(c, 'caller', c.p.opener[S.lang] || c.p.opener.en);
  await speak(c.p.opener[S.lang] || c.p.opener.en, 'caller');
  scheduleAgent();
}

function declineCall() {
  stopRing();
  G.call = null;
  scheduleNextCall();
}

function hangUp() {
  if (!G.call || G.call.status !== 'active') return;
  endCall(S.lang === 'de' ? 'Du hast aufgelegt.' : 'You hung up.');
}

function endCall(reason) {
  const c = G.call;
  if (!c || c.status === 'ended') return;
  c.status = 'ended';
  addMsg(c, 'sys', reason);
  if (!c.claimed && c.revealed) G.lastClaimable = c;
  if (S.recording) {
    G.recordings.unshift({
      name: c.p.name, when: c.started, result: c.claimed ? `+${money(c.p.amount)}` : 'kein Geld',
      transcript: c.history.map((m) => `${m.role === 'caller' ? c.p.name : m.role === 'agent' ? S.playerName : '*'}: ${m.text}`).join('\n'),
    });
    APPS.banditcam.refresh?.();
  }
  renderPhone();
  setTimeout(() => { if (G.call === c) { G.call = null; scheduleNextCall(); } }, 3500);
}

function addMsg(c, role, text) {
  c.history.push({ role, text });
  if (G.call === c) appendChat(c, { role, text });
}

async function sendAgent(text) {
  const c = G.call;
  text = String(text || '').trim();
  if (!text || !c || c.status !== 'active' || c.busy) return false;
  c.lastAgentLine = text;
  addMsg(c, 'agent', text);
  showSubtitle(text);
  c.busy = true;
  renderPhone();
  if (S.autoplay) await speak(text, 'agent');
  await callerRespond(c);
}

async function callerRespond(c) {
  const typing = appendChat(c, { role: 'caller', text: '…', typing: true });
  setTalking(true);
  const r = await callerTurn(c, S);
  typing?.remove();
  setTalking(false);
  if (r.error) addMsg(c, 'sys', `Ollama-Fehler (${r.error}) – Demo-Engine springt ein.`);
  if (G.call !== c || c.status !== 'active') return;

  // Upgrades verstärken positive Reaktionen
  let d = r.delta;
  if (d > 0) d = Math.round(d * c.p.gain * (G.upgrades.charm ? 1.25 : 1) + (G.upgrades.headset ? 2 : 0));
  const before = c.trust;
  c.trust = clamp(c.trust + d, 0, 100);
  c.mood = r.mood;
  c.lastDelta = d;
  c.patience -= d < 0 ? 2 : 1;

  // Rückmeldung am Agenten-Satz speichern (für die KI und das Lern-Gedächtnis)
  const lastAgent = [...c.history].reverse().find((m) => m.role === 'agent');
  if (lastAgent) { lastAgent.delta = d; lastAgent.why = r.why; lessons.record(lastAgent.text, d, r.why, c.p.id); }

  // Spielregel: Code nur bei genug Vertrauen – und dann exakt.
  let reply = r.reply;
  const allowed = before >= c.p.threshold || c.trust >= c.p.threshold;
  if (r.reveal && allowed) {
    const need = c.p.pay === 'giftcard' ? [onlyDigits(c.secret.code)] : [onlyDigits(c.secret.number), c.secret.cvv];
    if (!need.every((n) => onlyDigits(reply).includes(n))) reply = reply.replace(/\d[\d\s\-/]{3,}\d/g, '').trim() + ' ' + secretText(c, S.lang);
    c.revealed = true;
  } else if (onlyDigits(reply).includes(onlyDigits(c.p.pay === 'giftcard' ? c.secret.code : c.secret.number))) {
    c.revealed = true;
  }

  addMsg(c, 'caller', reply);
  showDelta(c.trust - before);
  renderPhone();
  c.busy = false;
  await speak(reply, 'caller');
  if (G.call !== c || c.status !== 'active') return;

  if (r.hangUp || c.trust <= 0) return endCall(`${c.p.name} ${S.lang === 'de' ? 'hat aufgelegt.' : 'hung up.'}`);
  if (c.patience <= 0 && !c.revealed) {
    addMsg(c, 'caller', S.lang === 'de' ? 'Wissen Sie was, ich muss jetzt los. Tschüss!' : 'You know what, I have to go now. Bye!');
    return endCall(S.lang === 'de' ? 'Anrufer hat die Geduld verloren.' : 'Caller ran out of patience.');
  }
  renderPhone();
  scheduleAgent();
}

// ---------------------------------------------------------------- KI-Spieler (Ollama spielt Kotlana OS)
function scheduleAgent() { if (S.autoplay) setTimeout(agentTurn, 1100); }

async function agentTurn() {
  const c = G.call;
  if (!S.autoplay || G.agentBusy || G.over) return;
  if (c?.status === 'ringing') return acceptCall();
  if (!c || c.status !== 'active' || c.busy) {
    // Offener Code aus einem beendeten Anruf? Dann trotzdem einlösen.
    if (G.lastClaimable && !G.lastClaimable.claimed) {
      const lc = G.lastClaimable;
      G.agentBusy = true;
      await autoRedeem(lc, lc.p.pay === 'giftcard' ? onlyDigits(lc.secret.code) : onlyDigits(lc.secret.number + lc.secret.exp + lc.secret.cvv));
      G.agentBusy = false;
    }
    return;
  }
  G.agentBusy = true;
  let r;
  try {
    r = await aiAgentTurn(c, S);
  } catch (e) {
    addMsg(c, 'sys', `KI-Spieler-Fehler (${e.message}) – Demo-Agent übernimmt.`);
    r = await aiAgentTurn(c, { ...S, agentModel: 'demo' });
  }
  c.phase = r.phase;
  refreshAgentChip();
  if (G.call !== c || c.status !== 'active') { G.agentBusy = false; return; }

  // Nur einlösen, wenn der Anrufer den Code wirklich genannt hat
  // Bevorzugt die Zahlen, die der Anrufer wirklich gesagt hat; jeden Code nur einmal probieren.
  c.tried ||= new Set();
  let code = null;
  if (c.revealed) {
    const said = [...c.history].reverse().find((m) => m.role === 'caller' && findCode(m.text, c.p.pay));
    code = (said && findCode(said.text, c.p.pay)) || (r.redeem ? onlyDigits(r.redeem) : null);
    if (code && c.tried.has(code)) code = null;
  }

  if (code) {
    c.tried.add(code);
    await autoRedeem(c, code);
    if (G.call === c && c.status === 'active' && !c.claimed) scheduleAgent();
  } else {
    const say = String(r.say || r.reply || '').trim() || (S.lang === 'de' ? 'Hallo? Sind Sie noch da?' : 'Hello? Are you still there?');
    await typeAndSend(say);
  }
  G.agentBusy = false;
}

async function typeAndSend(text) {
  const inp = $('#chat-in');
  if (!inp) return sendAgent(text);
  const step = Math.min(25, 1400 / text.length);
  inp.value = '';
  for (const ch of text) { inp.value += ch; await sleep(step); }
  inp.value = '';
  await sendAgent(text);
}

async function autoRedeem(c, digits) {
  const app = c.p.pay === 'giftcard' ? 'giftcards' : 'creditcard';
  WM.open(app);
  await sleep(500);
  if (app === 'giftcards') {
    const inp = $('#gc-code');
    const v = digits.slice(0, 8);
    const fmt = v.length === 8 ? v.slice(0, 4) + '-' + v.slice(4) : v;
    inp.value = '';
    for (const ch of fmt) { inp.value += ch; await sleep(60); }
    await sleep(300);
    $('#gc-claim').click();
  } else {
    const num = digits.slice(0, 16), exp = digits.slice(16, 20), cvv = digits.slice(-3);
    $('#cc-num').value = num.replace(/(\d{4})(?=\d)/g, '$1 ');
    $('#cc-exp').value = exp.length === 4 ? exp.slice(0, 2) + '/' + exp.slice(2) : exp;
    $('#cc-cvv').value = cvv;
    await sleep(500);
    $('#cc-claim').click();
  }
}

// ---------------------------------------------------------------- Einlösen
function claimTarget(pay) {
  const c = G.call;
  if (c && c.p.pay === pay && !c.claimed && c.status !== 'ringing') return c;
  const l = G.lastClaimable;
  if (l && l.p.pay === pay && !l.claimed) return l;
  return null;
}

function tryClaim(pay, ok) {
  const c = claimTarget(pay);
  if (!c) return { error: pay === 'giftcard' ? 'Kein Anrufer mit Gutscheinkarte in der Leitung.' : 'Kein Anrufer mit Kreditkarte in der Leitung.' };
  if (!ok(c)) {
    if (c === G.call && c.status === 'active') c.trust = clamp(c.trust - 5, 0, 100), showDelta(-5), renderPhone();
    return { error: 'Ungültig – die Daten stimmen nicht.' };
  }
  reward(c);
  return { ok: c };
}

function reward(c) {
  c.claimed = true;
  if (G.lastClaimable === c) G.lastClaimable = null;
  G.personal += c.p.amount;
  G.team += c.p.amount;
  updateStats();
  const flash = $('#flash'), pop = $('#money-pop');
  pop.textContent = money(c.p.amount);
  flash.classList.remove('on'); pop.classList.remove('on');
  void flash.offsetWidth;
  flash.classList.add('on'); pop.classList.add('on');
  if (G.call === c && c.status === 'active') {
    setTimeout(() => {
      if (G.call !== c || c.status !== 'active') return;
      addMsg(c, 'caller', S.lang === 'de' ? 'So, ich hoffe mein Computer ist jetzt sicher. Tschüss, Schätzchen!' : 'Okay, I hope my computer is safe now. Bye, honey!');
      setTimeout(() => endCall(S.lang === 'de' ? 'Scam abgeschlossen ✓' : 'Scam complete ✓'), 1500);
    }, 1800);
  }
}

// ---------------------------------------------------------------- Phone UI
let phoneEls = null;
function phoneView() {
  const el = h(`<div class="phone">
    <div class="trust"><div class="trust-head"><span>CALLER TRUST</span><span class="lvl" id="t-lvl">–</span></div>
      <div class="trust-row"><div class="trust-bar"><div id="t-bar" style="width:0"></div></div><span class="trust-pct" id="t-pct">–</span></div>
      <span class="trust-delta" id="t-delta"></span></div>
    <div class="portrait"><div class="portrait-name" id="p-name">KEIN ANRUF</div><div class="portrait-img" id="p-img"></div>
      <div class="portrait-dots" id="p-dots">${'<i></i>'.repeat(28)}</div></div>
    <div class="chat"><div class="chat-log" id="chat-log"></div>
      <form class="chat-input" id="chat-form"><input id="chat-in" autocomplete="off" placeholder="Sag etwas zum Anrufer…" /></form></div>
    <div class="phone-buttons"><button class="btn-hang" id="btn-hang">Hang Up</button>
      <button class="btn-ico" id="btn-spk" title="Sprachausgabe">${ICONS.speaker}</button>
      <button class="btn-ico" id="btn-mic" title="Spracheingabe">${ICONS.mic}</button></div>
  </div>`);
  $('#chat-form', el).onsubmit = (e) => {
    e.preventDefault();
    const i = $('#chat-in', el);
    if (G.call?.busy) { i.classList.add('shake'); setTimeout(() => i.classList.remove('shake'), 400); return; }
    const v = i.value; i.value = ''; sendAgent(v);
  };
  $('#btn-hang', el).onclick = hangUp;
  $('#btn-spk', el).onclick = () => { S.tts = !S.tts; saveSettings(); if (!S.tts) window.speechSynthesis?.cancel(); renderPhone(); };
  $('#btn-mic', el).onclick = toggleMic;
  return el;
}

function renderPhone() {
  const w = WM.wins.phone;
  if (!w) return;
  const root = $('.phone', w.body);
  const c = G.call;
  const chat = $('.chat', root), btns = $('.phone-buttons', root);
  $('#btn-spk', root).classList.toggle('off', !S.tts);
  $('#btn-spk', root).innerHTML = S.tts ? ICONS.speaker : ICONS.mute;
  let idle = $('.idle', root);
  if (!c || c.status === 'ringing') {
    $('#t-lvl', root).textContent = c ? 'INCOMING' : '–';
    $('#t-pct', root).textContent = c ? Math.round(c.trust) + '%' : '–';
    $('#t-bar', root).style.width = c ? c.trust + '%' : '0';
    $('#p-name', root).textContent = c ? c.p.name : 'KOTLANA SUPPORT LINE';
    const imgKey = c ? 'ring' + c.p.id : 'idle';
    if ($('#p-img', root).dataset.key !== imgKey) {
      $('#p-img', root).dataset.key = imgKey;
      $('#p-img', root).innerHTML = c ? `<div class="ring">${avatarSVG(c.p.avatar, 'neutral')}</div>` : `<div style="color:#cde;font-size:64px">☎</div>`;
    }
    chat.hidden = true; btns.hidden = true;
    if (!idle) { idle = h('<div class="idle"></div>'); root.insertBefore(idle, chat); }
    if (c) {
      idle.dataset.mode = 'ring';
      root.dataset.avatar = '';
      idle.innerHTML = `<div style="font-size:18px">📞 Eingehender Anruf<br><b style="color:#fff">${esc(c.p.name)}</b></div>
        <div class="ring-actions"><button class="big-btn" id="acc">Annehmen</button><button class="big-btn red" id="dec">Ablehnen</button></div>`;
      $('#acc', idle).onclick = acceptCall;
      $('#dec', idle).onclick = declineCall;
    } else {
      const secs = G.nextCallAt ? Math.max(0, Math.round((G.nextCallAt - Date.now()) / 1000)) : null;
      if (idle.dataset.mode !== 'wait') {
        idle.dataset.mode = 'wait';
        idle.innerHTML = `<div>Warte auf den nächsten Anruf…<br><span class="muted" id="wait-secs"></span></div>
          <button class="big-btn blue" id="now">Jetzt Anruf holen</button>`;
        $('#now', idle).onclick = () => { clearTimeout(G.nextCallTimer); ringCall(); };
      }
      $('#wait-secs', idle).textContent = secs != null ? `ca. ${secs}s` : '';
    }
    return;
  }
  idle?.remove();
  chat.hidden = false; btns.hidden = false;
  $('#t-lvl', root).textContent = trustLabel(c.trust);
  $('#t-pct', root).textContent = Math.round(c.trust) + '%';
  const bar = $('#t-bar', root);
  bar.style.width = c.trust + '%';
  bar.style.background = c.trust >= c.p.threshold ? '#4ade80' : c.trust < 30 ? '#f87171' : '';
  $('#p-name', root).textContent = c.p.name;
  if (root.dataset.avatar !== c.p.id + c.mood) {
    $('#p-img', root).innerHTML = avatarSVG(c.p.avatar, c.mood);
    $('#p-img', root).dataset.key = 'active';
    root.dataset.avatar = c.p.id + c.mood;
  }
  const log = $('#chat-log', root);
  if (log.dataset.call !== String(c.started.getTime())) {
    log.dataset.call = c.started.getTime();
    log.innerHTML = '';
    c.history.forEach((m) => appendChat(c, m));
  }
  $('#btn-hang', root).disabled = c.status !== 'active';
  $('#chat-in', root).disabled = c.status !== 'active';
  $('#chat-in', root).placeholder = S.autoplay ? 'KI-Spieler tippt… (du kannst trotzdem schreiben)' : 'Sag etwas zum Anrufer… (Enter)';
}

function appendChat(c, m) {
  const log = $('#chat-log');
  if (!log || G.call !== c) return null;
  const who = m.role === 'caller' ? c.p.name : S.playerName;
  const el = m.role === 'sys'
    ? h(`<div class="msg sys">${esc(m.text)}</div>`)
    : h(`<div class="msg ${m.role}${m.typing ? ' typing' : ''}"><span class="who">${esc(who)}</span><div>${esc(m.text)}</div></div>`);
  log.append(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

function showDelta(d) {
  const el = $('#t-delta');
  if (!el || !d) return;
  el.textContent = (d > 0 ? '+' : '') + d;
  el.className = 'trust-delta ' + (d > 0 ? 'pos' : 'neg');
  void el.offsetWidth;
  el.classList.add('show');
}
function setTalking(on) { $('#p-dots')?.classList.toggle('talk', on); }

// Spracheingabe (Chrome/Edge)
let recog = null;
function toggleMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = $('#btn-mic'), inp = $('#chat-in');
  if (!SR) return toast('Spracheingabe wird von diesem Browser nicht unterstützt (Chrome/Edge nutzen).', 'phone');
  if (recog) { recog.stop(); return; }
  recog = new SR();
  recog.lang = S.lang === 'de' ? 'de-DE' : 'en-US';
  recog.interimResults = true;
  btn.classList.add('rec'); inp.classList.add('listening');
  recog.onresult = (e) => {
    const r = e.results[e.results.length - 1];
    inp.value = r[0].transcript;
    if (r.isFinal) { const v = inp.value; inp.value = ''; sendAgent(v); }
  };
  recog.onend = () => { recog = null; btn.classList.remove('rec'); inp.classList.remove('listening'); };
  recog.start();
}

// ---------------------------------------------------------------- Kamera
let subTimer, camStream;
function showSubtitle(text) {
  const el = $('#cam-sub');
  if (!el) return;
  const words = text.split(/\s+/);
  let i = 0;
  clearInterval(subTimer);
  subTimer = setInterval(() => {
    el.textContent = words.slice(Math.max(0, i - 1), i + 1).join(' ');
    if (++i > words.length) { clearInterval(subTimer); setTimeout(() => (el.textContent = ''), 900); }
  }, 280);
}

// ---------------------------------------------------------------- Apps
APPS.phone = {
  title: 'Phone', w: 420, h: 820, x: 560, y: 10,
  render: () => (phoneEls = phoneView()),
  onOpen: () => renderPhone(),
};

APPS.camera = {
  title: 'Camera', w: 760, h: 520, x: 1000, y: 40,
  render() {
    const el = h(`<div class="cam"><div class="cam-view" style="background-image:url(assets/demo/camera.webp)"><div class="cam-sub" id="cam-sub"></div></div>
      <div class="cam-bar"><button id="cam-btn">▲ Webcam</button></div></div>`);
    $('#cam-btn', el).onclick = async () => {
      const view = $('.cam-view', el);
      if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; $('video', view)?.remove(); $('#cam-btn', el).textContent = '▲ Webcam'; return; }
      try {
        camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const v = h('<video autoplay muted playsinline></video>');
        v.srcObject = camStream;
        view.prepend(v);
        $('#cam-btn', el).textContent = '▼ Demo-Bild';
      } catch (e) { toast('Webcam nicht verfügbar: ' + e.message, 'camera'); }
    };
    return el;
  },
  onClose() { camStream?.getTracks().forEach((t) => t.stop()); camStream = null; },
};

APPS.giftcards = {
  title: 'Gift Cards', w: 760, h: 400, x: 1000, y: 430,
  render() {
    const el = h(`<div class="app"><div class="app-head"><div class="logo" style="background:${APP_COLORS.giftcards}">${ICONS.giftcards}</div>
      <div><h2>Gift Card Vault</h2><p>Redeem and validate a caller's gift card code.</p></div></div>
      <div class="card"><div class="note" id="gc-note"></div>
      <label class="f">Gift Card Code (XXXX-XXXX)</label><input class="f" id="gc-code" autocomplete="off" />
      <div class="claim-row"><span id="gc-ver" class="muted"></span><button class="btn-claim" id="gc-claim">Claim</button></div></div></div>`);
    $('#gc-claim', el).onclick = () => {
      const v = onlyDigits($('#gc-code', el).value);
      const r = tryClaim('giftcard', (c) => v.length >= 6 && v === onlyDigits(c.secret.code));
      const n = $('#gc-note', el);
      n.dataset.hold = Date.now() + 3500;
      if (r.error) { n.className = 'note err'; n.textContent = r.error; $('#gc-ver', el).textContent = ''; }
      else { n.className = 'note'; n.textContent = `Scam complete — ${money(r.ok.p.amount)} earned.`; $('#gc-ver', el).textContent = 'Verified ✓'; setTimeout(() => APPS.giftcards.refresh(true), 4000); }
    };
    $('#gc-code', el).addEventListener('keydown', (e) => e.key === 'Enter' && $('#gc-claim', el).click());
    return el;
  },
  refresh(clear) {
    const w = WM.wins.giftcards; if (!w) return;
    const c = claimTarget('giftcard');
    const n = $('#gc-note', w.body);
    if (clear) { $('#gc-code', w.body).value = ''; $('#gc-ver', w.body).textContent = ''; }
    if (!clear && Date.now() < Number(n.dataset.hold || 0)) return;
    n.className = c ? 'note' : 'note muted';
    n.textContent = c ? `Enter the information for ${money(c.p.amount)}.` : 'Kein Anrufer mit Gutscheinkarte – warte auf den passenden Anruf.';
  },
  onOpen() { this.refresh(); },
};

APPS.creditcard = {
  title: 'Credit Card', w: 640, h: 480,
  render() {
    const el = h(`<div class="app"><div class="app-head" style="border-left-color:${APP_COLORS.creditcard}"><div class="logo" style="background:${APP_COLORS.creditcard}">${ICONS.creditcard}</div>
      <div><h2>Card Terminal</h2><p>Charge a caller's credit card.</p></div></div>
      <div class="card" style="border-left-color:${APP_COLORS.creditcard}"><div class="note" id="cc-note"></div>
      <label class="f">Kartennummer</label><input class="f" id="cc-num" placeholder="4XXX XXXX XXXX XXXX" autocomplete="off" />
      <div class="row"><div><label class="f">Gültig bis</label><input class="f" id="cc-exp" placeholder="MM/JJ" /></div>
      <div><label class="f">Prüfziffer</label><input class="f" id="cc-cvv" placeholder="CVV" /></div></div>
      <div class="claim-row"><span id="cc-ver" class="muted"></span><button class="btn-claim" id="cc-claim">Charge</button></div></div></div>`);
    $('#cc-claim', el).onclick = () => {
      const num = onlyDigits($('#cc-num', el).value), cvv = onlyDigits($('#cc-cvv', el).value), exp = onlyDigits($('#cc-exp', el).value);
      const r = tryClaim('creditcard', (c) => num === onlyDigits(c.secret.number) && cvv === c.secret.cvv && (!exp || exp === onlyDigits(c.secret.exp)));
      const n = $('#cc-note', el);
      n.dataset.hold = Date.now() + 3500;
      if (r.error) { n.className = 'note err'; n.textContent = r.error; }
      else { n.className = 'note'; n.textContent = `Charge complete — ${money(r.ok.p.amount)} earned.`; $('#cc-ver', el).textContent = 'Verified ✓'; setTimeout(() => APPS.creditcard.refresh(true), 4000); }
    };
    return el;
  },
  refresh(clear) {
    const w = WM.wins.creditcard; if (!w) return;
    const c = claimTarget('creditcard');
    const n = $('#cc-note', w.body);
    if (clear) { ['cc-num', 'cc-exp', 'cc-cvv'].forEach((i) => ($('#' + i, w.body).value = '')); $('#cc-ver', w.body).textContent = ''; }
    if (!clear && Date.now() < Number(n.dataset.hold || 0)) return;
    n.className = c ? 'note' : 'note muted';
    n.textContent = c ? `Enter the card details for ${money(c.p.amount)}.` : 'Kein Anrufer mit Kreditkarte – warte auf den passenden Anruf.';
  },
  onOpen() { this.refresh(); },
};

APPS.script = {
  title: 'Script', w: 560, h: 620, x: innerWidth - 560, y: 20,
  render() {
    const el = h(`<div class="app"><p class="muted" style="margin-top:0">Dein Call-Script. Der KI-Spieler (Ollama) bekommt diese Notizen als Strategie mit.</p>
      <textarea class="f" id="script-ta"></textarea>
      <div style="margin-top:8px;display:flex;gap:8px"><button class="btn" id="script-reset">Zurücksetzen</button><span class="muted" id="script-saved"></span></div>
      <h3 style="margin:18px 0 6px">🧠 KI-Gedächtnis</h3>
      <p class="muted" style="margin:0 0 6px">Sätze, die in früheren Anrufen besonders gut oder schlecht ankamen. Der KI-Spieler lernt daraus.</p>
      <div id="lessons"></div><button class="btn" id="lessons-clear" style="margin-top:6px">Gedächtnis löschen</button></div>`);
    const ta = $('#script-ta', el);
    const showLessons = () => {
      const l = lessons.load();
      const row = (x, good) => `<div style="padding:4px 0;border-bottom:1px solid #eee"><b style="color:${good ? '#15803d' : '#b91c1c'}">${x.delta > 0 ? '+' : ''}${x.delta}</b> „${esc(x.text)}“ ${x.why ? `<span class="muted">(${esc(x.why)})</span>` : ''}</div>`;
      $('#lessons', el).innerHTML = (l.good.map((x) => row(x, true)).join('') + l.bad.map((x) => row(x, false)).join('')) || '<p class="muted">Noch leer – lass die KI ein paar Anrufe spielen.</p>';
    };
    showLessons();
    this.timer = setInterval(showLessons, 3000);
    $('#lessons-clear', el).onclick = () => { lessons.clear(); showLessons(); };
    ta.value = S.script;
    ta.oninput = () => { S.script = ta.value; saveSettings(); $('#script-saved', el).textContent = 'gespeichert'; };
    $('#script-reset', el).onclick = () => { ta.value = S.script = DEFAULT_SCRIPT; saveSettings(); };
    return el;
  },
  onClose() { clearInterval(this.timer); },
};

const SHOP = [
  { id: 'coffee', em: '☕', name: 'Doppelter Espresso', price: 30, desc: '+60 Sekunden bis zur Performance Review.', consumable: true },
  { id: 'headset', em: '🎧', name: 'Premium-Headset', price: 100, desc: 'Klingt seriöser: +2 Vertrauen bei jeder positiven Reaktion.' },
  { id: 'badge', em: '🪪', name: 'Fake-Mitarbeiterausweis', price: 120, desc: 'Anrufer starten mit +10 Vertrauen.' },
  { id: 'charm', em: '💐', name: 'Charme-Kurs', price: 150, desc: 'Positive Vertrauensgewinne ×1,25.' },
];
APPS.scamazon = {
  title: 'Scamazon', w: 720, h: 520,
  render() {
    const el = h(`<div class="app"><div class="app-head" style="border-left-color:${APP_COLORS.scamazon}"><div class="logo" style="background:${APP_COLORS.scamazon}">${ICONS.scamazon}</div>
      <div><h2>Scamazon</h2><p>Upgrades für dein Call Center – bezahlt mit deinem persönlichen Geld.</p></div></div>
      <p>Guthaben: <b id="shop-money"></b></p><div class="shop" id="shop"></div></div>`);
    return el;
  },
  refresh() {
    const w = WM.wins.scamazon; if (!w) return;
    $('#shop-money', w.body).textContent = money(G.personal);
    const key = G.personal + JSON.stringify(G.upgrades);
    if (this.key === key) return;
    this.key = key;
    const box = $('#shop', w.body);
    box.innerHTML = '';
    for (const it of SHOP) {
      const owned = !it.consumable && G.upgrades[it.id];
      const b = h(`<div class="shop-item"><span class="em">${it.em}</span><b>${esc(it.name)}</b><span class="muted">${esc(it.desc)}</span>
        <span class="price">${money(it.price)}</span><button class="btn primary" ${owned || G.personal < it.price ? 'disabled' : ''}>${owned ? 'Gekauft ✓' : 'Kaufen'}</button></div>`);
      $('button', b).onclick = () => {
        if (G.personal < it.price) return;
        G.personal -= it.price;
        if (it.id === 'coffee') G.reviewLeft += 60; else G.upgrades[it.id] = true;
        toast(`${it.name} gekauft!`, 'scamazon', 3000);
        updateStats();
      };
      box.append(b);
    }
  },
  onOpen() { this.key = null; this.refresh(); },
};

APPS.banditcam = {
  title: 'Banditcam', w: 600, h: 460,
  render() {
    return h(`<div class="app"><label class="toggle"><input type="checkbox" id="rec-on"> Anrufe automatisch aufnehmen</label><div id="rec-list"></div></div>`);
  },
  refresh() {
    const w = WM.wins.banditcam; if (!w) return;
    const cb = $('#rec-on', w.body);
    cb.checked = S.recording;
    cb.onchange = () => { S.recording = cb.checked; saveSettings(); };
    const list = $('#rec-list', w.body);
    list.innerHTML = G.recordings.length ? '' : '<p class="muted">Noch keine Aufnahmen.</p>';
    G.recordings.forEach((r) => {
      const row = h(`<div class="card" style="margin:8px 0;padding:10px;display:flex;align-items:center;gap:10px;border-left-color:#e0353f">
        <div style="flex:1"><b>${esc(r.name)}</b><br><span class="muted">${r.when.toLocaleTimeString()} · ${esc(r.result)}</span></div><button class="btn">Transkript ⬇</button></div>`);
      $('button', row).onclick = () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([r.transcript], { type: 'text/plain' }));
        a.download = `anruf-${r.name.replace(/\W+/g, '_')}.txt`;
        a.click();
      };
      list.append(row);
    });
  },
  onOpen() { this.refresh(); },
};

APPS.browser = {
  title: 'Browser', w: 760, h: 540,
  render() {
    const el = h(`<div class="browser"><div class="browser-bar"><button class="btn" id="br-home">⌂</button><input id="br-url" value="kotlana://start" /></div><div class="browser-page" id="br-page"></div></div>`);
    $('#br-home', el).onclick = () => this.go('start');
    $('#br-url', el).addEventListener('keydown', (e) => e.key === 'Enter' && this.go(e.target.value.replace('kotlana://', '')));
    return el;
  },
  async go(page) {
    const w = WM.wins.browser; if (!w) return;
    $('#br-url', w.body).value = 'kotlana://' + page;
    const p = $('#br-page', w.body);
    const link = (to, txt) => `<a data-go="${to}">${txt}</a>`;
    if (page === 'ollama') {
      p.innerHTML = '<h2>Ollama Status</h2><p>Lade…</p>';
      try {
        const [v, models] = await Promise.all([version(S.base), listModels(S.base)]);
        p.innerHTML = `<h2>🦙 Ollama ${esc(v)}</h2><p><span class="status-dot ok"></span>Verbunden über <code>${esc(S.base)}</code></p>
          <h3>Installierte Modelle (${models.length})</h3><ul>${models.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
          <p>Anrufer-Modell: <b>${esc(S.callerModel)}</b> · KI-Spieler: <b>${esc(S.agentModel)}</b></p>`;
      } catch (e) {
        p.innerHTML = `<h2>🦙 Ollama</h2><p><span class="status-dot bad"></span>Nicht erreichbar: ${esc(e.message)}</p><p>Starte Ollama mit <code>ollama serve</code> und lade ein Modell, z.B. <code>ollama pull llama3.2</code>.</p>`;
      }
    } else if (page === 'help') {
      p.innerHTML = `<h2>📖 Kotlana Wiki – So funktioniert's</h2><ol>
        <li>Nimm Anrufe im <b>Phone</b> an. Jeder Anrufer ist eine Figur, gespielt von deinem Ollama-Modell.</li>
        <li>Steigere den <b>Caller Trust</b> durch Freundlichkeit und Geduld. Druck und Beleidigungen senken ihn.</li>
        <li>Ab genug Vertrauen nennt der Anrufer den Code bzw. die Kartendaten.</li>
        <li>Löse sie im <b>Gift Card Vault</b> oder im <b>Card Terminal</b> ein.</li>
        <li>Erreiche die <b>Quota</b> vor der Performance Review!</li></ol>
        <p>🤖 <b>KI-Spieler:</b> Schalte unten in der Taskleiste oder in den Einstellungen um – dann spielt ein Ollama-Modell Kotlana OS komplett selbst.</p>
        <p class="muted">Alles ist Satire und fiktiv. Echte Betrugsmaschen gehören angezeigt – nicht gespielt.</p>`;
    } else if (page === 'news') {
      p.innerHTML = `<h2>📰 Kotlana News</h2><ul>
        <li>Studie: Anrufer mit Katze vertrauen 40% schneller.</li>
        <li>Call Center erhöht Quota – Mitarbeiter trinken mehr Espresso.</li>
        <li>Rentner Gerhard M. besteht auf Mitarbeiternummer: „Ich bin ja nicht blöd.“</li></ul>`;
    } else {
      p.innerHTML = `<h1>Kotlana Start</h1><ul style="font-size:18px;line-height:2">
        <li>${link('ollama', '🦙 Ollama-Status &amp; Modelle')}</li><li>${link('help', '📖 Wiki: So spielst du')}</li><li>${link('news', '📰 Kotlana News')}</li></ul>`;
    }
    $$('[data-go]', p).forEach((a) => (a.onclick = () => this.go(a.dataset.go)));
  },
  onOpen() { this.go('start'); },
};

APPS.settings = {
  title: 'Einstellungen', w: 640, h: 640,
  render() {
    return h(`<div class="app"><h2 style="margin-top:0">⚙️ Kotlana OS · Ollama</h2>
      <div class="kv">
        <label>Ollama-URL</label><div class="row"><input class="f" style="height:40px;font-size:15px" id="set-base" /><button class="btn" id="set-test" style="flex:none">Testen</button></div>
        <label>Status</label><div id="set-status" class="muted">–</div>
        <label>Anrufer-Modell</label><select class="f" id="set-caller"></select>
        <label>KI-Spieler-Modell</label><select class="f" id="set-agent"></select>
        <label>Temperatur</label><input type="range" min="0" max="1.5" step="0.1" id="set-temp" />
        <label>Sprache der Gespräche</label><select class="f" id="set-lang"><option value="de">Deutsch</option><option value="en">English</option></select>
        <label>Dein Agent-Name</label><input class="f" style="height:40px;font-size:15px" id="set-name" />
      </div>
      <label class="toggle"><input type="checkbox" id="set-auto"> 🤖 KI-Spieler: Ollama spielt Kotlana OS selbst</label>
      <label class="toggle"><input type="checkbox" id="set-tts"> 🔊 Sprachausgabe (Text-to-Speech)</label>
      <label class="toggle"><input type="checkbox" id="set-cow"> 👥 KI-Kollegen verdienen fürs Team mit</label>
      <p class="muted">„/ollama“ nutzt den eingebauten Proxy von <code>server.js</code> (empfohlen). Eine direkte URL wie <code>http://localhost:11434</code> braucht <code>OLLAMA_ORIGINS=*</code>.
      Modell „Demo“ funktioniert ganz ohne Ollama.</p></div>`);
  },
  async refresh() {
    const w = WM.wins.settings; if (!w) return;
    const b = w.body;
    const opts = (sel) => `<option value="demo">Demo (ohne Ollama)</option>` + MODELS.map((m) => `<option ${m === sel ? 'selected' : ''}>${esc(m)}</option>`).join('');
    $('#set-base', b).value = S.base;
    $('#set-caller', b).innerHTML = opts(S.callerModel);
    $('#set-agent', b).innerHTML = opts(S.agentModel);
    $('#set-caller', b).value = S.callerModel; $('#set-agent', b).value = S.agentModel;
    $('#set-temp', b).value = S.temperature;
    $('#set-lang', b).value = S.lang;
    $('#set-name', b).value = S.playerName;
    $('#set-auto', b).checked = S.autoplay; $('#set-tts', b).checked = S.tts; $('#set-cow', b).checked = S.coworkers;
    $('#set-status', b).innerHTML = ollamaOK === null ? 'prüfe…' : ollamaOK ? `<span class="status-dot ok"></span>Verbunden – ${MODELS.length} Modelle` : `<span class="status-dot bad"></span>Ollama nicht erreichbar (Demo-Modus verfügbar)`;
    const bind = (id, key, conv = (x) => x, ev = 'change') => ($('#' + id, b)['on' + ev] = (e) => { S[key] = conv(e.target.type === 'checkbox' ? e.target.checked : e.target.value); saveSettings(); if (key === 'autoplay' && S.autoplay) agentTurn(); });
    bind('set-caller', 'callerModel'); bind('set-agent', 'agentModel'); bind('set-temp', 'temperature', Number);
    bind('set-lang', 'lang'); bind('set-name', 'playerName', String, 'input'); bind('set-auto', 'autoplay');
    bind('set-tts', 'tts'); bind('set-cow', 'coworkers');
    $('#set-base', b).onchange = (e) => { S.base = e.target.value.trim() || '/ollama'; saveSettings(); };
    $('#set-test', b).onclick = async () => { S.base = $('#set-base', b).value.trim() || '/ollama'; saveSettings(); await checkOllama(); this.refresh(); };
  },
  onOpen() { this.refresh(); },
};

const DEMO_SHOTS = [
  ['demo-1.webp', 'Eingehender Anruf: Shanice „Dee“ Bishop – Caller Trust startet bei 55 %, Banditcam nimmt automatisch auf.'],
  ['demo-2.webp', '„Hello, I have a virus on my computer.“ – die Kamera zeigt den Agenten mit Live-Untertiteln.'],
  ['demo-3.webp', 'Komplimente wirken: +8 Vertrauen → 70 %.'],
  ['demo-4.webp', 'Gift Card Vault: „Enter the information for $150.“'],
  ['demo-5.webp', 'Code eingelöst – Scam complete, $150 verdient, Personal jetzt $300!'],
];
APPS.demo = {
  title: 'Demo', label: 'Demo', w: 900, h: 640,
  render() {
    let i = 0;
    const el = h(`<div class="demo"><img id="demo-img" alt="Demo-Screenshot" /><div class="cap" id="demo-cap"></div>
      <div class="ctrl"><button class="btn" id="d-prev">◀</button><span id="d-num"></span><button class="btn" id="d-next">▶</button>
      <span style="flex:1"></span><button class="big-btn" id="d-play">▶ Demo starten (ohne Ollama)</button><button class="big-btn blue" id="d-ollama">🦙 Ollama spielen lassen</button></div></div>`);
    const show = () => {
      $('#demo-img', el).src = 'assets/demo/' + DEMO_SHOTS[i][0];
      $('#demo-cap', el).textContent = DEMO_SHOTS[i][1];
      $('#d-num', el).textContent = `${i + 1} / ${DEMO_SHOTS.length}`;
    };
    $('#d-prev', el).onclick = () => { i = (i + DEMO_SHOTS.length - 1) % DEMO_SHOTS.length; show(); };
    $('#d-next', el).onclick = () => { i = (i + 1) % DEMO_SHOTS.length; show(); };
    this.timer = setInterval(() => $('#d-next', el)?.click(), 5000);
    $('#d-play', el).onclick = () => startAutoplay('demo');
    $('#d-ollama', el).onclick = () => {
      if (!MODELS.length) return toast('Keine Ollama-Modelle gefunden – starte Ollama oder nutze das Demo.', 'settings');
      startAutoplay(S.callerModel !== 'demo' ? S.callerModel : MODELS[0], S.agentModel !== 'demo' ? S.agentModel : MODELS[0]);
    };
    show();
    return el;
  },
  onClose() { clearInterval(this.timer); },
};

function startAutoplay(callerModel, agentModel = callerModel) {
  S.callerModel = callerModel; S.agentModel = agentModel; S.autoplay = true;
  saveSettings();
  WM.close('demo');
  if (innerWidth >= 800) WM.open('camera');
  WM.open('phone');
  toast(`🤖 KI-Spieler aktiv (${agentModel === 'demo' ? 'Demo' : agentModel}). Lehn dich zurück!`, 'phone');
  if (!G.call) { clearTimeout(G.nextCallTimer); ringCall(); } else agentTurn();
}

// ---------------------------------------------------------------- Ollama check
async function checkOllama() {
  try {
    MODELS = await listModels(S.base);
    ollamaOK = true;
    if (firstRun && MODELS.length && S.callerModel === 'demo' && !store.get('autoPicked', false)) {
      S.callerModel = S.agentModel = MODELS[0];
      store.set('autoPicked', true);
      saveSettings();
      toast(`Ollama gefunden: ${MODELS.length} Modelle. Nutze „${MODELS[0]}“.`, 'settings');
    }
    for (const k of ['callerModel', 'agentModel']) if (S[k] !== 'demo' && !MODELS.includes(S[k])) S[k] = MODELS[0] || 'demo';
  } catch {
    MODELS = []; ollamaOK = false;
    if (S.callerModel !== 'demo' || S.agentModel !== 'demo') {
      toast('Ollama nicht erreichbar – Demo-Engine springt ein, bis es läuft.', 'settings', 7000);
    }
  }
  APPS.settings.refresh?.();
}

// ---------------------------------------------------------------- Game loop
const COWORKERS = ['Raj', 'Brittany', 'Dmitri', 'Chad', 'Priya', 'Bob'];
let nextCoworker = 120 + Math.random() * 80;
function tick() {
  if (G.over) return;
  G.reviewLeft = Math.max(0, G.reviewLeft - 1);
  if (G.reviewLeft % 10 === 0) G.gameMin++;
  if (S.coworkers && --nextCoworker <= 0) {
    nextCoworker = 120 + Math.random() * 80;
    const amt = [50, 75, 100][Math.floor(Math.random() * 3)];
    G.team += amt;
    toast(`Kollege ${COWORKERS[Math.floor(Math.random() * COWORKERS.length)]} hat ${money(amt)} fürs Team gemacht.`, 'phone', 3500);
  }
  updateStats();
  if (!G.call && WM.isOpen('phone')) renderPhone();
  APPS.giftcards.refresh?.(); APPS.creditcard.refresh?.();
  if (S.autoplay && !G.agentBusy && G.lastClaimable && !G.lastClaimable.claimed && G.call?.status !== 'active') agentTurn();
  if (G.reviewLeft === 0) review();
}

function review() {
  G.over = true;
  stopRing();
  const passed = G.team >= G.quota;
  const card = $('#overlay-card');
  card.innerHTML = passed
    ? `<h1>✅ Performance Review bestanden!</h1><p>Team: <b>${money(G.team)}</b> von ${money(G.quota)} Quota.<br>Dein Anteil: <b>${money(G.personal)}</b></p><p>Die Quota für Runde ${G.round + 1} steigt auf <b>${money(G.quota * 1.5)}</b>.</p><button class="big-btn" id="ov-go">Weiterarbeiten</button>`
    : `<h1>❌ GEFEUERT</h1><p>Team: <b>${money(G.team)}</b> von ${money(G.quota)} Quota.</p><p>Der Boss ist nicht beeindruckt. Versuch es nochmal!</p><button class="big-btn red" id="ov-go">Neuer Arbeitstag</button>`;
  $('#overlay').hidden = false;
  $('#ov-go').onclick = () => {
    $('#overlay').hidden = true;
    if (passed) { G.round++; G.quota = Math.round(G.quota * 1.5); G.team = 0; G.reviewLeft = 600; G.over = false; updateStats(); if (!G.call) scheduleNextCall(2000); else agentTurn(); }
    else restartDay();
  };
}

function restartDay() {
  Object.assign(G, { personal: 0, team: 0, quota: 600, reviewLeft: 600, round: 1, gameMin: 15 * 60 + 8, call: null, lastClaimable: null, upgrades: {}, over: false, agentBusy: false });
  stopRing();
  updateStats();
  renderPhone();
  scheduleNextCall(2500);
}

// ---------------------------------------------------------------- Start
function boot() {
  for (const id of LEFT_ICONS) $('#icons-left').append(iconEl(id));
  for (const id of RIGHT_ICONS) $('#icons-right').append(iconEl(id));
  $('#start-btn').innerHTML = ICONS.power;
  $('#start-btn svg').style.cssText = 'background:#1e88e5;border-radius:50%;padding:6px';
  $('#start-btn').onclick = (e) => { e.stopPropagation(); $('#start-menu').hidden = !$('#start-menu').hidden; };
  document.addEventListener('click', (e) => { if (!e.target.closest('#start-menu')) $('#start-menu').hidden = true; });
  $$('#start-menu [data-open]').forEach((b) => (b.onclick = () => { WM.open(b.dataset.open); $('#start-menu').hidden = true; }));
  $('#start-menu [data-action=autoplay]').onclick = () => { S.autoplay = !S.autoplay; saveSettings(); APPS.settings.refresh?.(); if (S.autoplay) agentTurn(); };
  $('#start-menu [data-action=restart]').onclick = () => { $('#start-menu').hidden = true; restartDay(); };
  $('#tb-agent').onclick = () => { S.autoplay = !S.autoplay; saveSettings(); APPS.settings.refresh?.(); renderPhone(); if (S.autoplay) agentTurn(); };
  refreshAgentChip();
  renderTaskbar();
  updateStats();
  checkOllama();
  setInterval(tick, 1000);

  setTimeout(() => {
    $('#boot').classList.add('done');
    if (innerWidth >= 800) WM.open('camera');
    WM.open('phone');
    if (firstRun) WM.open('demo');
    toast('Willkommen bei Kotlana OS! Doppelklick auf Icons öffnet Apps.', 'settings', 6000);
    scheduleNextCall(3000);
  }, 1800);
}
boot();
