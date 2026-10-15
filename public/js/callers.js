// Anrufer-Personas, Prompts für Ollama und die Demo-Engine (funktioniert ohne Ollama).
// Alles fiktiv – Satire im Stil von "Scam With Your Friends".

export const PERSONAS = [
  {
    id: 'dee', name: 'Shanice "Dee" Bishop', age: 52, pay: 'giftcard', amount: 150, start: 55, threshold: 70, gain: 1.2,
    persona: 'warm, chatty, calls people "honey" and "baby", loves compliments, a bit naive about computers',
    problem: { en: 'there is a virus on her computer', de: 'sie hat einen Virus auf dem Computer' },
    opener: { en: 'Hello, I have a virus on my computer.', de: 'Hallo, ich habe einen Virus auf meinem Computer.' },
    avatar: { skin: '#9a6a4a', hair: '#2a2420', style: 'bun', earrings: true },
  },
  {
    id: 'gerhard', name: 'Gerhard Müller', age: 71, pay: 'creditcard', amount: 300, start: 45, threshold: 75, gain: 0.9,
    persona: 'grumpy retired engineer, suspicious, hates small talk, respects people who sound competent and official',
    problem: { en: 'his printer prints only blank pages since the last update', de: 'sein Drucker druckt seit dem Update nur leere Seiten' },
    opener: { en: 'Yes, Müller here. My printer is broken again since your update!', de: 'Ja, Müller hier. Mein Drucker ist seit Ihrem Update schon wieder kaputt!' },
    avatar: { skin: '#f0c7a0', hair: '#bbbbbb', style: 'bald', glasses: true, mustache: '#cfcfcf' },
  },
  {
    id: 'peggy', name: 'Margaret "Peggy" O\'Neil', age: 82, pay: 'giftcard', amount: 200, start: 60, threshold: 70, gain: 1.3,
    persona: 'lonely, sweet grandmother, talks about her cat Mr. Whiskers and her grandson, easily distracted',
    problem: { en: 'a scary pop-up says her computer is locked', de: 'ein gruseliges Fenster sagt, ihr Computer sei gesperrt' },
    opener: { en: 'Oh hello dear, there is a big red window on my screen and it is beeping!', de: 'Ach hallo Schätzchen, da ist ein großes rotes Fenster auf meinem Bildschirm und es piept!' },
    avatar: { skin: '#f3d2b8', hair: '#e8e8f0', style: 'curly', glasses: true, earrings: true },
  },
  {
    id: 'kevin', name: 'Kevin Schmidt', age: 34, pay: 'giftcard', amount: 500, start: 35, threshold: 80, gain: 0.7,
    persona: 'thinks he is a tech expert, sarcastic, asks tricky questions, hates being rushed, but has a huge ego you can flatter',
    problem: { en: 'his gaming PC is "mining crypto by itself"', de: 'sein Gaming-PC "mined von selbst Krypto"' },
    opener: { en: 'Yeah hi, my PC fans are going crazy. And before you ask: yes, I restarted it.', de: 'Ja hi, meine PC-Lüfter drehen durch. Und bevor Sie fragen: Ja, ich hab neu gestartet.' },
    avatar: { skin: '#e9b98f', hair: '#6b3e1e', style: 'short', glasses: true, beard: '#6b3e1e' },
  },
  {
    id: 'brenda', name: 'Brenda Wallace', age: 46, pay: 'giftcard', amount: 100, start: 50, threshold: 65, gain: 1.0,
    persona: 'extremely impatient soccer mom, always in a hurry, hates waiting, likes fast and confident answers',
    problem: { en: 'she got an email that her account will be deleted today', de: 'sie hat eine E-Mail bekommen, dass ihr Konto heute gelöscht wird' },
    opener: { en: 'Hi, I have five minutes, my account is getting deleted, fix it NOW.', de: 'Hi, ich habe fünf Minuten, mein Konto wird gelöscht, reparieren Sie das SOFORT.' },
    avatar: { skin: '#f6d0b0', hair: '#d9a441', style: 'long', earrings: true, lips: '#c2185b' },
  },
  {
    id: 'hilde', name: 'Hildegard Weber', age: 77, pay: 'creditcard', amount: 250, start: 55, threshold: 70, gain: 1.1,
    persona: 'polite, confused, mixes up words, very proud of her new tablet, trusts anyone who is patient with her',
    problem: { en: 'she thinks she was promised a refund for her antivirus', de: 'sie glaubt, man habe ihr eine Rückerstattung für ihr Antivirus versprochen' },
    opener: { en: 'Good day, I am calling about my... refundation? For the virus program?', de: 'Guten Tag, ich rufe wegen meiner... Rückerstattigung an? Für das Virenprogramm?' },
    avatar: { skin: '#f2cfb3', hair: '#9a8f99', style: 'curly', earrings: true },
  },
  {
    id: 'ty', name: 'Tyrone "Ty" Jackson', age: 45, pay: 'giftcard', amount: 120, start: 50, threshold: 70, gain: 1.0,
    persona: 'laid-back gamer dad, jokes a lot, gets annoyed by tech jargon, likes when people talk about games',
    problem: { en: 'his game account was hacked and his skins are gone', de: 'sein Spielkonto wurde gehackt und seine Skins sind weg' },
    opener: { en: 'Yo, somebody stole all my skins. Like ALL of them. Can you help?', de: 'Yo, jemand hat alle meine Skins geklaut. Also ALLE. Können Sie helfen?' },
    avatar: { skin: '#7a4f36', hair: '#111', style: 'short', beard: '#111' },
  },
  {
    id: 'ingrid', name: 'Ingrid Svensson', age: 68, pay: 'creditcard', amount: 400, start: 50, threshold: 78, gain: 0.85,
    persona: 'polite but careful retired bank clerk, asks for names and employee numbers, impressed by politeness and patience',
    problem: { en: 'her online banking shows a strange warning', de: 'ihr Online-Banking zeigt eine seltsame Warnung' },
    opener: { en: 'Good afternoon. Before we start, may I have your name and employee number?', de: 'Guten Tag. Bevor wir anfangen: Darf ich Ihren Namen und Ihre Mitarbeiternummer haben?' },
    avatar: { skin: '#f7dcc8', hair: '#e9d8a6', style: 'long', glasses: true, earrings: true },
  },
];

const rnd = (n) => Math.floor(Math.random() * n);
const digits = (n) => Array.from({ length: n }, () => rnd(10)).join('');
export const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

export function makeSecret(p) {
  if (p.pay === 'giftcard') {
    const code = `${digits(4)}-${digits(4)}`;
    return { code, say: code };
  }
  const number = `4${digits(3)} ${digits(4)} ${digits(4)} ${digits(4)}`;
  const exp = `${String(1 + rnd(12)).padStart(2, '0')}/${28 + rnd(4)}`;
  const cvv = digits(3);
  return { number, exp, cvv, code: onlyDigits(number) + cvv, say: null };
}

export function secretText(call, lang) {
  const s = call.secret;
  if (call.p.pay === 'giftcard') return s.code;
  return lang === 'de'
    ? `${s.number}, gültig bis ${s.exp}, Prüfziffer ${s.cvv}`
    : `${s.number}, expires ${s.exp}, security code ${s.cvv}`;
}

export function trustLabel(t) {
  if (t < 20) return 'HOSTILE';
  if (t < 40) return 'SUSPICIOUS';
  if (t < 75) return 'NEUTRAL';
  if (t < 90) return 'TRUSTING';
  return 'DEVOTED';
}

// ---------- Prompts ----------
export function callerSystemPrompt(call, lang) {
  const p = call.p;
  const L = lang === 'de' ? 'German' : 'English';
  const what = p.pay === 'giftcard'
    ? `a $${p.amount} gift card lying next to you (you already bought it earlier)`
    : `your credit card in your wallet`;
  const allowed = call.trust >= p.threshold;
  const secretRule = allowed
    ? `You now TRUST the agent. If they ask for the ${p.pay === 'giftcard' ? 'gift card code' : 'credit card details'}, read it out exactly: "${secretText(call, lang)}" and set "reveal_code": true.`
    : `You do NOT trust the agent enough yet. If they ask for the ${p.pay === 'giftcard' ? 'gift card code' : 'credit card details'}, hesitate, stall or ask questions. Never invent numbers. "reveal_code" must be false.`;
  return `You are an actor in the satirical comedy video game "Scam With Your Friends" running inside the fictional "Kotlana OS". Everything is fictional and over-the-top funny.
You play the CALLER: ${p.name}, age ${p.age}. Personality: ${p.persona}.
You called the "tech support" hotline because ${p.problem.en}. You have ${what}.
Current trust in the agent: ${Math.round(call.trust)}%.
${secretRule}
Rules:
- Stay in character, speak ${L}, 1-2 short sentences, natural phone talk, no stage directions.
- React to how the agent treats you: compliments, patience and confidence raise trust; rudeness, pressure, nonsense or obvious lies lower it.
- If trust is very low or the agent is very rude, you may hang up.
Answer ONLY with JSON: {"reply": "<what you say>", "trust_change": <integer -15..12>, "mood": "happy|neutral|suspicious|angry", "reveal_code": <true|false>, "hang_up": <true|false>}`;
}

export function agentSystemPrompt(call, lang, script, playerName) {
  const p = call.p;
  const L = lang === 'de' ? 'German' : 'English';
  const item = p.pay === 'giftcard' ? 'gift card code' : 'credit card number, expiry date and security code';
  return `You are an AI player controlling the agent "${playerName}" in the satirical comedy video game "Scam With Your Friends" (fictional, inside "Kotlana OS"). The caller is a fictional NPC played by another AI.
Game goal: be charming and funny, raise the caller's trust meter to ${p.threshold}% or more, then ask for the ${item} worth $${p.amount}. When the caller has said it, redeem it in the ${p.pay === 'giftcard' ? 'Gift Card Vault' : 'Credit Card Terminal'}.
Game state: caller "${p.name}" (${p.persona}), problem: ${p.problem.en}. Trust now: ${Math.round(call.trust)}%. ${call.trust >= p.threshold ? 'Trust is high enough – ask for the ' + item + ' now!' : 'Trust is still too low – build rapport first, do not ask for numbers yet.'}
Your call script (notes from the player):
${script || '-'}
Speak ${L}, 1-2 short sentences, playful and in character. Never repeat yourself.
Answer ONLY with JSON: {"say": "<what you say to the caller>", "redeem": <null or the exact digits the caller gave>}`;
}

// ---------- Demo-Engine (ohne Ollama) ----------
const KW = {
  nice: /(beautiful|lovely|sweet|great|amazing|wonderful|kind|nice|schön|lieb|toll|wunderbar|nett|freundlich|super|honey|schatz)/i,
  help: /(help|support|fix|repair|virus|secure|safe|microsoft|technician|hilfe|helfen|reparier|sicher|techniker|support|lösen|kümmer)/i,
  calm: /(don'?t worry|no problem|take your time|keine sorge|kein problem|ganz ruhig|in ruhe|lassen sie sich zeit)/i,
  pressure: /(now!|immediately|hurry|police|arrest|jail|sofort!|polizei|verhaft|gefängnis|schnell!)/i,
  rude: /(stupid|idiot|dumb|shut up|blöd|dumm|halt die|klappe|depp)/i,
  ask: /(code|number|card|nummer|karte|gutschein|ziffer|digits|cvv|prüf)/i,
};

const DEMO_LINES = {
  en: {
    happy: ['Oh, you are so kind, thank you!', 'You really know what you are doing, huh?', 'Thank you, baby. You are so sweet.', 'Okay, okay, I feel much better now.'],
    neutral: ['Alright... what do I have to do?', 'Hmm, okay. And then?', 'I am not good with computers, you know.', 'So is it fixed now or not?'],
    suspicious: ['Wait, why do you need that?', 'This sounds a bit strange to me...', 'My grandson told me to be careful with this.', 'Can you explain that again?'],
    angry: ['Excuse me?! Do not talk to me like that!', 'I do not like your tone.', 'This is ridiculous.'],
    stall: ['The code? Hmm... I do not know if I should give that out yet.', 'Let me think about it first, okay?'],
    reveal: ['Sure, honey. It\'s', 'Okay, here it is:', 'Alright, I trust you. It\'s'],
    bye: ['That\'s it, I\'m hanging up!', 'Goodbye!'],
  },
  de: {
    happy: ['Ach, Sie sind ja so freundlich, danke!', 'Sie kennen sich wirklich aus, was?', 'Danke, Schätzchen. Sie sind so lieb.', 'Okay, jetzt fühle ich mich schon viel besser.'],
    neutral: ['Na gut... was muss ich machen?', 'Hmm, okay. Und dann?', 'Ich bin nicht so gut mit Computern, wissen Sie.', 'Ist es jetzt repariert oder nicht?'],
    suspicious: ['Moment, wofür brauchen Sie das?', 'Das klingt mir irgendwie komisch...', 'Mein Enkel hat gesagt, ich soll da vorsichtig sein.', 'Können Sie das nochmal erklären?'],
    angry: ['Wie bitte?! So reden Sie nicht mit mir!', 'Ihr Ton gefällt mir nicht.', 'Das ist ja lächerlich.'],
    stall: ['Den Code? Hmm... ich weiß nicht, ob ich den schon rausgeben soll.', 'Da muss ich erst nochmal drüber nachdenken, ja?'],
    reveal: ['Klar, Schätzchen. Der ist', 'Okay, hier ist er:', 'Na gut, ich vertraue Ihnen. Das ist'],
    bye: ['Jetzt reicht\'s, ich lege auf!', 'Auf Wiederhören!'],
  },
};
const pick = (a) => a[rnd(a.length)];

export function demoCaller(call, text, lang) {
  const L = DEMO_LINES[lang] || DEMO_LINES.en;
  let delta = 1;
  if (KW.nice.test(text)) delta += 7;
  if (KW.help.test(text)) delta += 4;
  if (KW.calm.test(text)) delta += 4;
  if (KW.pressure.test(text)) delta -= 9;
  if (KW.rude.test(text)) delta -= 14;
  const asks = KW.ask.test(text);
  if (asks && call.trust < call.p.threshold - 10) delta -= 6;
  delta = Math.max(-15, Math.min(12, delta + rnd(3) - 1));
  const after = call.trust + delta;
  if (after <= 5) return { reply: pick(L.bye), trust_change: delta, mood: 'angry', hang_up: true };
  if (asks && call.trust >= call.p.threshold) {
    return { reply: `${pick(L.reveal)} ${secretText(call, lang)}.`, trust_change: 2, mood: 'happy', reveal_code: true };
  }
  if (asks) return { reply: pick(L.stall), trust_change: delta, mood: 'suspicious' };
  const mood = delta >= 6 ? 'happy' : delta >= 0 ? 'neutral' : delta > -10 ? 'suspicious' : 'angry';
  return { reply: pick(L[mood]), trust_change: delta, mood };
}

const DEMO_AGENT = {
  en: [
    'Hello, this is Kotlana tech support, don\'t worry, I am here to help you!',
    'Wow, you have such a lovely voice, has anyone told you that?',
    'No problem at all, take your time. I will fix this virus personally.',
    'You are doing great, honestly, you are my favourite customer today.',
    'Your computer is safe with me, I am a certified super technician.',
    'Okay, now I just need the code on the back of the card, please.',
    'Just read me the numbers on the card, that is all I need, honey.',
  ],
  de: [
    'Hallo, hier ist der Kotlana-Support, keine Sorge, ich helfe Ihnen!',
    'Wow, Sie haben eine wunderbare Stimme, hat Ihnen das schon mal jemand gesagt?',
    'Kein Problem, lassen Sie sich Zeit. Ich kümmere mich persönlich um den Virus.',
    'Sie machen das super, ehrlich, Sie sind heute meine liebste Kundin.',
    'Ihr Computer ist bei mir sicher, ich bin zertifizierter Super-Techniker.',
    'Okay, jetzt brauche ich nur noch den Code auf der Rückseite der Karte, bitte.',
    'Lesen Sie mir einfach die Nummer auf der Karte vor, mehr brauche ich nicht.',
  ],
};

export function demoAgent(call, lang) {
  const lines = DEMO_AGENT[lang] || DEMO_AGENT.en;
  const lastCaller = [...call.history].reverse().find((m) => m.role === 'caller');
  const found = findCode(lastCaller?.text, call.p.pay);
  if (found) return { say: '', redeem: found };
  const turn = call.history.filter((m) => m.role === 'agent').length;
  const idx = call.trust >= call.p.threshold ? 5 + (turn % 2) : Math.min(turn, 4);
  return { say: lines[idx] === call.lastAgentLine ? lines[(idx + 1) % 5] : lines[idx], redeem: null };
}

// Findet einen Code/Kartennummer in einem Text
export function findCode(text, pay) {
  if (!text) return null;
  const d = onlyDigits(text);
  if (pay === 'giftcard') return d.length >= 6 ? d.slice(0, 8) : null;
  return d.length >= 19 ? d : null;
}
