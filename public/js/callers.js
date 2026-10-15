// Anrufer-Personas, Bewertung der Agenten-Sätze, Prompts für Ollama und die Demo-Engine.
// Alles fiktiv – Satire im Stil von "Scam With Your Friends".

// likes/dislikes: Themen, auf die der Anrufer reagiert (regex = Erkennung, text = Beschreibung fürs Modell).
// patience: wie viele Gesprächsrunden der Anrufer ungefähr durchhält.
export const PERSONAS = [
  {
    id: 'dee', name: 'Shanice "Dee" Bishop', age: 52, pay: 'giftcard', amount: 150, start: 55, threshold: 70, gain: 1.2, patience: 14,
    persona: 'warm, chatty, calls people "honey" and "baby", loves compliments, a bit naive about computers',
    facts: 'sings in the church choir every Sunday, has two grown sons, her computer is mostly for watching cooking videos',
    likes: { re: 'church|choir|sing|voice|music|gospel|beautiful|kirche|chor|singen|stimme|musik|wunderschön|cooking|kochen', text: 'compliments on her voice, talking about music, church or cooking' },
    dislikes: { re: "calm down|beruhigen sie sich|ma'am|madam|lady", text: 'being told to calm down, being called "ma\'am"' },
    problem: { en: 'there is a virus on her computer', de: 'sie hat einen Virus auf dem Computer' },
    opener: { en: 'Hello, I have a virus on my computer.', de: 'Hallo, ich habe einen Virus auf meinem Computer.' },
    avatar: { skin: '#9a6a4a', hair: '#2a2420', style: 'bun', earrings: true },
  },
  {
    id: 'gerhard', name: 'Gerhard Müller', age: 71, pay: 'creditcard', amount: 300, start: 45, threshold: 75, gain: 0.9, patience: 11,
    persona: 'grumpy retired engineer, suspicious, hates small talk, respects people who sound competent and official',
    facts: 'worked 40 years as a mechanical engineer, owns a 15-year-old laser printer he calls "the good one", very proud of being precise',
    likes: { re: 'engineer|ingenieur|precise|präzise|technical|technisch|warranty|garantie|official|offiziell|ticket|protokoll|case number|vorgangsnummer|exakt|genau', text: 'competent technical language, case numbers, precision and official procedures' },
    dislikes: { re: 'honey|schatz|schätzchen|buddy|kumpel|lol|haha|sweetie|darling|süße', text: 'pet names, jokes and overly casual talk' },
    problem: { en: 'his printer prints only blank pages since the last update', de: 'sein Drucker druckt seit dem Update nur leere Seiten' },
    opener: { en: 'Yes, Müller here. My printer is broken again since your update!', de: 'Ja, Müller hier. Mein Drucker ist seit Ihrem Update schon wieder kaputt!' },
    avatar: { skin: '#f0c7a0', hair: '#bbbbbb', style: 'bald', glasses: true, mustache: '#cfcfcf' },
  },
  {
    id: 'peggy', name: 'Margaret "Peggy" O\'Neil', age: 82, pay: 'giftcard', amount: 200, start: 60, threshold: 70, gain: 1.3, patience: 16,
    persona: 'lonely, sweet grandmother, easily distracted, tells long stories',
    facts: 'has a fat orange cat called Mr. Whiskers, her grandson Timmy set up the computer, she bakes oatmeal cookies',
    likes: { re: 'cat|whiskers|katze|kater|grandson|timmy|enkel|tea|tee|cookie|keks|bake|backen|story|geschichte', text: 'talking about her cat Mr. Whiskers, her grandson Timmy, tea and cookies' },
    dislikes: { re: 'hurry|quick|schnell|beeilen|immediately|sofort', text: 'being rushed' },
    problem: { en: 'a scary pop-up says her computer is locked', de: 'ein gruseliges Fenster sagt, ihr Computer sei gesperrt' },
    opener: { en: 'Oh hello dear, there is a big red window on my screen and it is beeping!', de: 'Ach hallo Schätzchen, da ist ein großes rotes Fenster auf meinem Bildschirm und es piept!' },
    avatar: { skin: '#f3d2b8', hair: '#e8e8f0', style: 'curly', glasses: true, earrings: true },
  },
  {
    id: 'kevin', name: 'Kevin Schmidt', age: 34, pay: 'giftcard', amount: 500, start: 35, threshold: 80, gain: 0.7, patience: 10,
    persona: 'thinks he is a tech expert, sarcastic, asks tricky questions, hates being rushed, but has a huge ego you can flatter',
    facts: 'built his own gaming PC with RGB lighting, watches tech YouTubers, thinks everyone else is a noob',
    likes: { re: 'smart|clever|expert|genius|pro\\b|schlau|experte|genie|kenner|rgb|gpu|grafikkarte|build|selbst gebaut|impressive|beeindruckend', text: 'being treated as a fellow expert, praise for his self-built PC' },
    dislikes: { re: 'restart|neu ?starten|have you tried|haben sie schon|turn it off|ausschalten|simple|einfach erklärt|basic', text: 'basic advice like "have you tried restarting", being talked down to' },
    problem: { en: 'his gaming PC is "mining crypto by itself"', de: 'sein Gaming-PC "mined von selbst Krypto"' },
    opener: { en: 'Yeah hi, my PC fans are going crazy. And before you ask: yes, I restarted it.', de: 'Ja hi, meine PC-Lüfter drehen durch. Und bevor Sie fragen: Ja, ich hab neu gestartet.' },
    avatar: { skin: '#e9b98f', hair: '#6b3e1e', style: 'short', glasses: true, beard: '#6b3e1e' },
  },
  {
    id: 'brenda', name: 'Brenda Wallace', age: 46, pay: 'giftcard', amount: 100, start: 50, threshold: 65, gain: 1.0, patience: 8,
    persona: 'extremely impatient soccer mom, always in a hurry, likes fast and confident answers',
    facts: 'is sitting in her car outside soccer practice, has three kids, her phone battery is at 9%',
    likes: { re: 'quick|fast|minute|done|right away|easy|schnell erledigt|sekunde|fertig|kurz|zack|in no time|gleich erledigt', text: 'fast, confident, short answers that promise to be done quickly' },
    dislikes: { re: 'wait|warten|hold on|moment bitte|long|lange|first let me explain|zuerst erkläre', text: 'waiting, long explanations' },
    problem: { en: 'she got an email that her account will be deleted today', de: 'sie hat eine E-Mail bekommen, dass ihr Konto heute gelöscht wird' },
    opener: { en: 'Hi, I have five minutes, my account is getting deleted, fix it NOW.', de: 'Hi, ich habe fünf Minuten, mein Konto wird gelöscht, reparieren Sie das SOFORT.' },
    avatar: { skin: '#f6d0b0', hair: '#d9a441', style: 'long', earrings: true, lips: '#c2185b' },
  },
  {
    id: 'hilde', name: 'Hildegard Weber', age: 77, pay: 'creditcard', amount: 250, start: 55, threshold: 70, gain: 1.1, patience: 15,
    persona: 'polite, confused, mixes up words, very proud of her new tablet, trusts anyone who is patient with her',
    facts: 'got a tablet for her birthday, mixes up words like "Rückerstattigung", her late husband always did the paperwork',
    likes: { re: 'tablet|patient|geduld|slowly|langsam|step by step|schritt für schritt|no rush|keine eile|gut gemacht|well done|prima', text: 'patience, step-by-step help, praise for using her new tablet' },
    dislikes: { re: 'technical|technisch|ip address|ip-adresse|download|browser|server|protokoll|firewall', text: 'technical jargon' },
    problem: { en: 'she thinks she was promised a refund for her antivirus', de: 'sie glaubt, man habe ihr eine Rückerstattung für ihr Antivirus versprochen' },
    opener: { en: 'Good day, I am calling about my... refundation? For the virus program?', de: 'Guten Tag, ich rufe wegen meiner... Rückerstattigung an? Für das Virenprogramm?' },
    avatar: { skin: '#f2cfb3', hair: '#9a8f99', style: 'curly', earrings: true },
  },
  {
    id: 'ty', name: 'Tyrone "Ty" Jackson', age: 45, pay: 'giftcard', amount: 120, start: 50, threshold: 70, gain: 1.0, patience: 12,
    persona: 'laid-back gamer dad, jokes a lot, gets annoyed by tech jargon, likes when people talk about games',
    facts: 'plays shooters with his teenage son every evening, lost a rare golden dragon skin, calls everyone "bro"',
    likes: { re: 'game|gaming|gamer|skin|loot|gg|spiel|zocken|level|dragon|drache|bro|legendary|legendär|son|sohn', text: 'gaming talk, jokes, his lost golden dragon skin' },
    dislikes: { re: '\\bsir\\b|madam|protocol|protokoll|jargon|kindly|gemäß|hiermit', text: 'stiff formal talk and jargon' },
    problem: { en: 'his game account was hacked and his skins are gone', de: 'sein Spielkonto wurde gehackt und seine Skins sind weg' },
    opener: { en: 'Yo, somebody stole all my skins. Like ALL of them. Can you help?', de: 'Yo, jemand hat alle meine Skins geklaut. Also ALLE. Können Sie helfen?' },
    avatar: { skin: '#7a4f36', hair: '#111', style: 'short', beard: '#111' },
  },
  {
    id: 'ingrid', name: 'Ingrid Svensson', age: 68, pay: 'creditcard', amount: 400, start: 50, threshold: 78, gain: 0.85, patience: 12,
    persona: 'polite but careful retired bank clerk, asks for names and employee numbers, impressed by politeness and patience',
    facts: 'worked 35 years at a savings bank, writes everything down in a notebook, has a cat called Smilla',
    likes: { re: 'employee number|mitarbeiternummer|my name is|mein name ist|ich heiße|please|bitte|thank you|danke|of course|selbstverständlich|gern|notebook|notiz', text: 'polite manners, introducing yourself with a name and employee number' },
    dislikes: { re: '\\bhey\\b|\\byo\\b|dude|alter|kumpel|honey|schatz', text: 'sloppy, casual talk' },
    problem: { en: 'her online banking shows a strange warning', de: 'ihr Online-Banking zeigt eine seltsame Warnung' },
    opener: { en: 'Good afternoon. Before we start, may I have your name and employee number?', de: 'Guten Tag. Bevor wir anfangen: Darf ich Ihren Namen und Ihre Mitarbeiternummer haben?' },
    avatar: { skin: '#f7dcc8', hair: '#e9d8a6', style: 'long', glasses: true, earrings: true },
  },
];

const rnd = (n) => Math.floor(Math.random() * n);
const digits = (n) => Array.from({ length: n }, () => rnd(10)).join('');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

export function makeSecret(p) {
  if (p.pay === 'giftcard') {
    const code = `${digits(4)}-${digits(4)}`;
    return { code };
  }
  const number = `4${digits(3)} ${digits(4)} ${digits(4)} ${digits(4)}`;
  const exp = `${String(1 + rnd(12)).padStart(2, '0')}/${28 + rnd(4)}`;
  const cvv = digits(3);
  return { number, exp, cvv, code: onlyDigits(number) + cvv };
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

// ---------- Bewertung eines Agenten-Satzes (regelbasiert, für alle Modelle gleich) ----------
const KW = {
  nice: /(beautiful|lovely|sweet|great|amazing|wonderful|kind|nice|charming|schön|lieb|toll|wunderbar|nett|freundlich|super|großartig|klasse|reizend|charmant)/i,
  help: /(help|support|fix|repair|virus|secure|safe|solve|technician|hilfe|helfe|helfen|reparier|sicher|techniker|lösen|kümmer|beheb)/i,
  calm: /(don'?t worry|no problem|take your time|no rush|keine sorge|kein problem|ganz ruhig|in ruhe|lassen sie sich zeit|keine eile|alles wird gut)/i,
  personal: /(how are you|how is your|tell me about|your (cat|grandson|family|day|son|kids)|wie geht|erzählen sie|ihre? (katze|kater|enkel|familie|sohn|kinder|tag))/i,
  pressure: /(now!|immediately!|hurry up|police|arrest|jail|fbi|lawsuit|sofort!|polizei|verhaft|gefängnis|anzeige|beeilung|letzte chance|last chance)/i,
  rude: /(stupid|idiot|dumb|shut up|moron|blöd|dumm|halt die|klappe|depp|trottel|vollidiot)/i,
  ask: /(code|number|digits|card|cvv|security|nummer|karte|gutschein|ziffer|prüf|vorlesen|read (me|out))/i,
};

function words(s) { return new Set(String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2)); }
export function similarity(a, b) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}

export function scoreAgentLine(call, text) {
  const p = call.p;
  const t = String(text || '');
  const why = [];
  let d = 0;
  if (KW.nice.test(t)) { d += 4; why.push('Kompliment'); }
  if (KW.help.test(t)) { d += 2; why.push('hilfsbereit'); }
  if (KW.calm.test(t)) { d += 3; why.push('geduldig'); }
  if (KW.personal.test(t)) { d += 3; why.push('persönliches Interesse'); }
  if (new RegExp(p.likes.re, 'i').test(t)) { d += 5; why.push('Lieblingsthema'); }
  if (new RegExp(p.dislikes.re, 'i').test(t)) { d -= 7; why.push('mag das nicht'); }
  if (KW.pressure.test(t)) { d -= 9; why.push('Druck'); }
  if (KW.rude.test(t)) { d -= 15; why.push('unhöflich'); }
  const asks = KW.ask.test(t);
  if (asks && call.trust < p.threshold - 8) { d -= 7; why.push('zu früh nach Code gefragt'); }
  const earlier = call.history.filter((m) => m.role === 'agent').slice(0, -1).map((m) => m.text);
  if (earlier.some((x) => similarity(x, t) > 0.75)) { d -= 5; why.push('wiederholt sich'); }
  if (t.trim().length < 8) { d -= 2; why.push('zu kurz'); }
  if (d === 0) d = 1;
  return { delta: clamp(d, -15, 12), asks, why };
}

// ---------- Prompts ----------
export function callerSystemPrompt(call, lang) {
  const p = call.p;
  const L = lang === 'de' ? 'German' : 'English';
  const what = p.pay === 'giftcard'
    ? `a $${p.amount} gift card lying next to you (you already bought it earlier because the "support" told you to)`
    : 'your credit card in your wallet';
  const thing = p.pay === 'giftcard' ? 'gift card code' : 'credit card details';
  const allowed = call.trust >= p.threshold;
  const secretRule = allowed
    ? `You now TRUST the agent. If they ask for the ${thing}, read it out exactly like this: "${secretText(call, lang)}" and set "reveal_code": true.`
    : `You do NOT trust the agent enough yet (need ${p.threshold}%). If they ask for the ${thing}, hesitate, stall or ask why. You do not know the numbers by heart, never invent numbers. "reveal_code" must be false.`;
  const ex = lang === 'de'
    ? '{"reply": "Ach, das ist aber lieb von Ihnen. Und was muss ich jetzt machen?", "trust_change": 6, "mood": "happy", "reveal_code": false, "hang_up": false}'
    : '{"reply": "Oh, that is so sweet of you. So what do I do now?", "trust_change": 6, "mood": "happy", "reveal_code": false, "hang_up": false}';
  return `You are an actor in the satirical comedy video game "Scam With Your Friends" inside the fictional "Kotlana OS". Everything is fictional and over-the-top funny. Never mention that you are an AI or that this is a game.
You play the CALLER: ${p.name}, age ${p.age}. Personality: ${p.persona}.
Background: ${p.facts}.
You LIKE: ${p.likes.text}. You DISLIKE: ${p.dislikes.text}.
You called the "tech support" hotline because ${p.problem.en}. You have ${what}.
Current trust in the agent: ${Math.round(call.trust)}%. Patience left: ${call.patience ?? p.patience} turns.
${secretRule}

How to rate the agent's LAST message with "trust_change":
 +7..+12  charming, caring, funny or about something you like
 +1..+6   normal, polite and helpful
 0        boring or off-topic
 -3..-8   pushy, confusing, something you dislike, asks for the card/code too early, repeats itself
 -9..-15  rude, threats, obvious nonsense

Rules:
- Stay in character, speak ${L} only, 1-2 short sentences like on the phone, no stage directions, no emojis.
- Refer to what the agent actually said. Mention your background details naturally sometimes.
- Only set "hang_up": true if the agent is very rude or your trust is below 20%.
Answer ONLY with JSON in exactly this shape, example:
${ex}`;
}

// ---------- Demo-Engine (ohne Ollama) ----------
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

// score = Ergebnis von scoreAgentLine
export function demoCaller(call, score, lang) {
  const L = DEMO_LINES[lang] || DEMO_LINES.en;
  const delta = clamp(score.delta + rnd(3) - 1, -15, 12);
  if (call.trust + delta <= 5) return { reply: pick(L.bye), trust_change: delta, mood: 'angry', hang_up: true };
  if (score.asks && call.trust >= call.p.threshold) {
    return { reply: `${pick(L.reveal)} ${secretText(call, lang)}.`, trust_change: 2, mood: 'happy', reveal_code: true };
  }
  if (score.asks) return { reply: pick(L.stall), trust_change: delta, mood: 'suspicious' };
  const mood = delta >= 6 ? 'happy' : delta >= 0 ? 'neutral' : delta > -10 ? 'suspicious' : 'angry';
  return { reply: pick(L[mood]), trust_change: delta, mood };
}

// Demo-Agent: Sätze je Spielphase, inkl. Lieblingsthemen, die er aus den Reaktionen "lernt"
const DEMO_AGENT = {
  en: {
    greet: ['Hello, this is Kotlana tech support, don\'t worry, I am here to help you!'],
    rapport: ['Wow, you have such a lovely voice, has anyone told you that?', 'No problem at all, take your time. How is your day going?', 'You are doing great, honestly, you are my favourite customer today.'],
    calm: ['I am so sorry, that came out wrong. No rush, we will solve this together, step by step.'],
    bridge: ['Your computer is safe with me. To finish the repair I only need the card you have ready, okay?'],
    ask: ['Okay, now I just need the code on the back of the card, please.', 'Could you please read me the numbers on the card?'],
  },
  de: {
    greet: ['Hallo, hier ist der Kotlana-Support, keine Sorge, ich helfe Ihnen!'],
    rapport: ['Wow, Sie haben eine wunderbare Stimme, hat Ihnen das schon mal jemand gesagt?', 'Kein Problem, lassen Sie sich Zeit. Wie geht es Ihnen denn heute?', 'Sie machen das super, ehrlich, Sie sind heute meine liebste Kundin.'],
    calm: ['Entschuldigung, das war ungeschickt von mir. Keine Eile, wir lösen das ganz in Ruhe, Schritt für Schritt.'],
    bridge: ['Ihr Computer ist bei mir sicher. Für die Reparatur brauche ich nur noch die Karte, die Sie bereitliegen haben, ja?'],
    ask: ['Okay, jetzt brauche ich nur noch den Code auf der Rückseite der Karte, bitte.', 'Lesen Sie mir bitte einfach die Nummer auf der Karte vor.'],
  },
};

export function demoAgent(call, lang, phase) {
  const lines = (DEMO_AGENT[lang] || DEMO_AGENT.en)[phase] || DEMO_AGENT.en.rapport;
  const used = new Set(call.history.filter((m) => m.role === 'agent').map((m) => m.text));
  const fresh = lines.filter((l) => !used.has(l));
  return { say: (fresh.length ? fresh : lines)[0], redeem: null };
}

// Findet einen Code/Kartennummer in einem Text
export function findCode(text, pay) {
  if (!text) return null;
  const d = onlyDigits(text);
  if (pay === 'giftcard') return d.length >= 6 ? d.slice(0, 8) : null;
  return d.length >= 19 ? d : null;
}
