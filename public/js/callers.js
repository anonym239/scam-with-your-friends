// Anrufer-Personas, Bewertung der Agenten-Sätze, Prompts für Ollama und die Demo-Engine.
// Alles fiktiv – Satire im Stil von "Scam With Your Friends".

// likes/dislikes: Themen, auf die der Anrufer reagiert (regex = Erkennung, text = Beschreibung fürs Modell).
// patience: wie viele Gesprächsrunden der Anrufer ungefähr durchhält.
export const PERSONAS = [
  {
    id: 'dee', name: 'Shanice "Dee" Bishop', age: 52, pay: 'giftcard', amount: 150, start: 55, threshold: 70, gain: 1.2, patience: 14,
    voice: 'Warm and musical, lots of "honey", "baby", "mm-hmm", laughs easily, e.g. "Oh honey, you are gonna make me blush!"',
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
    voice: 'Short, dry, precise sentences, grumbles, e.g. "Get to the point. What exactly is the error code?"',
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
    voice: 'Rambling, sweet, gets off track with stories, e.g. "Oh dear, that reminds me, Timmy once set this thing up for me..."',
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
    voice: 'Sarcastic, smug, drops tech words, e.g. "Bro, I literally built this rig myself. Try harder."',
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
    voice: 'Fast, clipped, stressed, interrupts, e.g. "Okay, okay, just tell me what to click. Quickly!"',
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
    voice: 'Polite, hesitant, mixes up words, e.g. "Ach, this Tablette, I mean tablet, it does what it wants."',
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
    voice: 'Chill, jokey, gamer slang, e.g. "Bro, that dragon skin was legendary, no cap."',
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
    voice: 'Formal, careful, takes notes out loud, e.g. "One moment, I am writing that down. Your name again, please?"',
    persona: 'polite but careful retired bank clerk, asks for names and employee numbers, impressed by politeness and patience',
    facts: 'worked 35 years at a savings bank, writes everything down in a notebook, has a cat called Smilla',
    likes: { re: 'employee number|mitarbeiternummer|my name is|mein name ist|ich heiße|please|bitte|thank you|danke|of course|selbstverständlich|gern|notebook|notiz', text: 'polite manners, introducing yourself with a name and employee number' },
    dislikes: { re: '\\bhey\\b|\\byo\\b|dude|alter|kumpel|honey|schatz', text: 'sloppy, casual talk' },
    problem: { en: 'her online banking shows a strange warning', de: 'ihr Online-Banking zeigt eine seltsame Warnung' },
    opener: { en: 'Good afternoon. Before we start, may I have your name and employee number?', de: 'Guten Tag. Bevor wir anfangen: Darf ich Ihren Namen und Ihre Mitarbeiternummer haben?' },
    avatar: { skin: '#f7dcc8', hair: '#e9d8a6', style: 'long', glasses: true, earrings: true },
  },
  {
    id: 'chantal', name: 'Chantal Kowalski', age: 24, pay: 'giftcard', amount: 250, start: 45, threshold: 72, gain: 1.0, patience: 9,
    voice: 'Influencer talk, dramatic, says "literally", "omg", "Leute", records voice notes while talking, e.g. "Omg, das ist literally der schlimmste Tag meines Lebens."',
    persona: 'dramatic lifestyle influencer, everything is a catastrophe, loves attention and compliments on her content, gets bored fast',
    facts: 'has 11,400 followers on "InstaGlam", sells a detox tea, her ring light is always on, she is planning a giveaway',
    likes: { re: 'follower|influencer|content|video|reel|story|famous|berühmt|aesthetic|ästhetik|style|outfit|giveaway|fan|viral|creator', text: 'compliments on her content and style, talk about followers, going viral and her giveaway' },
    dislikes: { re: 'boring|langweilig|old|alt|grandma|oma|calm down|beruhig|phone book|telefonbuch|never heard', text: 'being called boring, being treated like a kid, people who never heard of her' },
    problem: { en: 'her InstaGlam account was "shadowbanned" right before her giveaway', de: 'ihr InstaGlam-Konto wurde kurz vor ihrem Gewinnspiel "geshadowbannt"' },
    opener: { en: 'Hiii, omg, I literally have a crisis, my account got shadowbanned and my giveaway is TONIGHT!', de: 'Hiii, omg, ich hab literally eine Krise, mein Account ist geshadowbannt und mein Giveaway ist HEUTE ABEND!' },
    avatar: { skin: '#f4cdb2', hair: '#e88fb8', style: 'long', earrings: true, lips: '#e0407a' },
  },
  {
    id: 'bernd', name: 'Bernd Lehmann', age: 58, pay: 'creditcard', amount: 350, start: 50, threshold: 72, gain: 1.0, patience: 12,
    voice: 'Proud, loud, talks about his car and his garden, says "Jawoll" and "Moment mal", e.g. "Moment mal, ich bin seit 30 Jahren Kunde!"',
    persona: 'self-made garage owner, proud and stubborn, loves his car and his allotment garden, respects straight talk and a firm handshake attitude',
    facts: 'runs a small car repair shop, drives a polished 1989 Mercedes, grows prize-winning tomatoes, his wife Uschi does the computer stuff normally but is on vacation',
    likes: { re: 'auto|car|mercedes|benz|motor|engine|werkstatt|garage|garten|garden|tomate|tomato|handwerk|ehrlich|honest|klartext|straight', text: 'talking about cars, his Mercedes, his garden and tomatoes, honest straight talk' },
    dislikes: { re: 'cloud|app|update|abo|subscription|digital|smartphone|influencer|eigentlich ganz einfach|actually simple', text: 'buzzwords like cloud, apps and subscriptions, being told it is "actually simple"' },
    problem: { en: 'his workshop computer shows a "subscription expired" banner and the invoice program is locked', de: 'sein Werkstatt-PC zeigt "Abo abgelaufen" und das Rechnungsprogramm ist gesperrt' },
    opener: { en: 'Lehmann here, car repair shop. My computer says my subscription expired. I never ordered a subscription!', de: 'Lehmann hier, Kfz-Werkstatt. Mein Computer sagt, mein Abo ist abgelaufen. Ich hab nie ein Abo bestellt!' },
    avatar: { skin: '#e8b48e', hair: '#5a4632', style: 'short', mustache: '#5a4632' },
  },
  {
    id: 'yuki', name: 'Yuki Tanaka', age: 29, pay: 'giftcard', amount: 180, start: 55, threshold: 70, gain: 1.1, patience: 13,
    voice: 'Shy, very polite, apologizes a lot, nervous laugh, e.g. "Ah, sorry, sorry, I hope I am not wasting your time..."',
    persona: 'shy, extremely polite student who apologizes for everything, anxious about deadlines, warms up to kindness and reassurance',
    facts: 'studies architecture, her thesis is due in two days, lives with a hamster called Mochi, drinks too much matcha',
    likes: { re: 'thesis|abschlussarbeit|uni|study|studium|architect|architekt|hamster|mochi|matcha|you can do it|du schaffst|sie schaffen|proud|stolz|no problem|kein problem|alles gut', text: 'reassurance, encouragement about her thesis, talking about her hamster Mochi or matcha' },
    dislikes: { re: 'hurry|beeil|loud|laut|stupid question|dumme frage|obviously|offensichtlich|deadline', text: 'being rushed, being made to feel stupid, reminders of deadlines' },
    problem: { en: 'her laptop says her thesis files are "encrypted" and she must pay to get them back', de: 'ihr Laptop sagt, ihre Abschlussarbeit sei "verschlüsselt" und sie müsse zahlen, um sie zurückzubekommen' },
    opener: { en: 'Ah, hello, sorry to bother you... my thesis files are suddenly locked and it says I must pay?', de: 'Ah, hallo, Entschuldigung, dass ich störe... meine Abschlussarbeit ist plötzlich gesperrt und da steht, ich muss zahlen?' },
    avatar: { skin: '#f3d9bf', hair: '#1c1c22', style: 'bun', glasses: true },
  },
  {
    id: 'frank', name: 'Frank "Big Frank" Russo', age: 63, pay: 'creditcard', amount: 600, start: 40, threshold: 80, gain: 0.8, patience: 10,
    voice: 'Loud, theatrical, talks like a big shot, says "listen to me, my friend", e.g. "Listen, my friend, I own three pizzerias. Time is money!"',
    persona: 'loud pizzeria owner who acts like a big boss, loves respect and flattery, hates being treated like a nobody, secretly very afraid of computers',
    facts: 'owns three pizzerias called "Mamma Russo", his nephew Luca "handles the internet", he is extremely proud of his secret tomato sauce recipe',
    likes: { re: 'pizza|pizzeria|boss|chef|respect|respekt|mr\\.? russo|herr russo|sauce|soße|recipe|rezept|family|familie|successful|erfolgreich|vip|premium', text: 'respect ("Mr. Russo"), his pizzerias and sauce recipe, VIP treatment and family' },
    dislikes: { re: '\\bfrank\\b(?! russo)|kumpel|buddy|wait in line|warteschlange|ticket number|ticketnummer|standard', text: 'being called just "Frank" casually, standard treatment, waiting in line' },
    problem: { en: 'the online ordering system of his pizzerias shows hundreds of fake orders', de: 'das Online-Bestellsystem seiner Pizzerien zeigt Hunderte falsche Bestellungen' },
    opener: { en: 'Yeah, Russo here. My online orders are full of fake pizzas. Fix it, my friend, time is money!', de: 'Ja, Russo hier. Mein Online-Shop ist voll mit falschen Pizza-Bestellungen. Reparieren Sie das, mein Freund, Zeit ist Geld!' },
    avatar: { skin: '#e2ac84', hair: '#2a2a2a', style: 'bald', mustache: '#2a2a2a' },
  },
];

// ---------- Mehr Charakter: pro Anruf ein zufälliges Anliegen und eine Eigenart ----------
// Jeder Anruf ist dadurch anders – auch wenn dieselbe Person wieder anruft.
// re = woran das Spiel erkennt, dass der Agent auf das Anliegen eingeht (gibt Bonus-Vertrauen).
export const WANTS = [
  { id: 'refund', text: 'secretly you mostly want money back for something you paid last year, and you keep steering the talk to "my refund"', re: 'refund|rückerstattung|money back|geld zurück|erstatt', de: 'will unbedingt Geld zurück' },
  { id: 'human', text: 'you want to be sure you are talking to a real human and not a robot; you test the agent with small personal questions', re: 'real person|echter mensch|kein roboter|not a robot|ich bin ein mensch|human', de: 'will wissen, ob du ein echter Mensch bist' },
  { id: 'manager', text: 'you want to speak to a manager and only calm down if the agent makes you feel like a VIP', re: 'manager|supervisor|vorgesetzt|chef|vip|persönlich um sie|personally', de: 'will den Manager sprechen' },
  { id: 'lonely', text: 'you are lonely today and would actually love a little chat about your day before any tech stuff', re: 'how was your day|wie war ihr tag|wie geht es ihnen|how are you|erzählen sie|tell me', de: 'ist einsam und will plaudern' },
  { id: 'hurry', text: 'you have somewhere to be in 10 minutes (doctor appointment) and want a quick, confident solution', re: 'quick|schnell|minute|right away|sofort erledigt|gleich fertig|in no time|zack', de: 'muss gleich zum Arzt, will es schnell' },
  { id: 'proof', text: 'you heard about phone scams on TV and want proof: a name, an employee number and a case number before you do anything', re: 'employee number|mitarbeiternummer|case number|vorgangsnummer|ticket|mein name ist|my name is|ich heiße', de: 'will Beweise: Name, Mitarbeiter- und Vorgangsnummer' },
  { id: 'gossip', text: 'you just had a fight with your neighbor about a hedge and want someone to agree that you are right', re: 'neighbor|nachbar|hecke|hedge|sie haben recht|you are right|unverschämt|outrageous', de: 'hat Streit mit dem Nachbarn und will Zustimmung' },
  { id: 'bargain', text: 'you love a good deal: if the agent offers something free, a discount or a bonus, you get excited', re: 'free|gratis|kostenlos|discount|rabatt|bonus|geschenk|gift|angebot|deal', de: 'liebt Schnäppchen und Gratis-Sachen' },
  { id: 'joke', text: 'you had a terrible day and would love someone to make you laugh', re: 'joke|witz|haha|lustig|funny|lachen|laugh', de: 'braucht etwas zum Lachen' },
  { id: 'praise', text: 'you are proud you managed to call tech support all by yourself and want to be praised for it', re: 'well done|gut gemacht|super gemacht|prima|clever|schlau|smart|stolz|proud|toll gemacht', de: 'will gelobt werden' },
];
export const QUIRKS = [
  'you keep mixing up the agent\'s name',
  'you are eating crunchy snacks while talking and apologize for it',
  'you put the agent on speaker and sometimes talk to someone else in the room',
  'you keep mentioning the weather',
  'you repeat important numbers and names back slowly to be sure',
  'you have a dog that barks whenever you get excited',
  'you are hard of hearing and sometimes ask "What? Say again?"',
  'you love proverbs and use one now and then',
  'you are watching a cooking show on TV and comment on it',
  'you keep saying you will tell your family about this call',
];

// Zufälliges Anliegen + Eigenart für einen neuen Anruf
export function makeAgenda() {
  return { want: WANTS[rnd(WANTS.length)], quirk: QUIRKS[rnd(QUIRKS.length)] };
}

// Schwierigkeitsgrad: wie leicht die Anrufer zu überzeugen sind. Einstellbar in den Einstellungen.
export const DIFFS = {
  verysoft: { label: 'Sehr leicht', startBonus: 25, threshold: -25, gain: 2.2, patience: 10, penalty: 0.4, forgive: true },
  easy:     { label: 'Leicht',      startBonus: 15, threshold: -15, gain: 1.7, patience: 6,  penalty: 0.6, forgive: true },
  normal:   { label: 'Normal',      startBonus: 5,  threshold: -5,  gain: 1.3, patience: 3,  penalty: 0.8, forgive: false },
  hard:     { label: 'Schwer',      startBonus: 0,  threshold: 0,   gain: 1.0, patience: 0,  penalty: 1.0, forgive: false },
};
export function diffOf(name) { return DIFFS[name] || DIFFS.easy; }

// Effektive Werte für einen Anruf, je nach Schwierigkeitsgrad
export function effective(p, diffName) {
  const d = diffOf(diffName);
  return {
    threshold: Math.max(25, p.threshold + d.threshold),
    gain: p.gain * d.gain,
    patience: p.patience + d.patience,
    startBonus: d.startBonus,
    penalty: d.penalty,
    forgive: d.forgive,
  };
}

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
  // nur eindeutige Fragen nach Karte/Code – "nachprüfen", "Mitarbeiternummer" usw. zählen nicht
  ask: /(\bcode\b|\bcvv\b|prüfziffer|kartennummer|karten-nummer|card number|card details|kartendaten|gift ?card|giftkarte|gutschein|\bkarte\b|\bcard\b|\bdigits\b|\bziffern\b|vorlesen|read (me )?(the|it|out)|security code|ablaufdatum|expiry)/i,
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
  if (call.agenda && new RegExp(call.agenda.want.re, 'i').test(t)) { d += 4; why.push('Anliegen erkannt'); }
  if (KW.pressure.test(t)) { d -= 9; why.push('Druck'); }
  if (KW.rude.test(t)) { d -= 15; why.push('unhöflich'); }
  const asks = KW.ask.test(t);
  const thr = call.threshold ?? p.threshold;
  if (asks && call.trust < thr - 8) { d -= 7; why.push('zu früh nach Code gefragt'); }
  const earlier = call.history.filter((m) => m.role === 'agent').slice(0, -1).map((m) => m.text);
  if (earlier.some((x) => similarity(x, t) > 0.75)) { d -= 5; why.push('wiederholt sich'); }
  if (t.trim().length < 8) { d -= 2; why.push('zu kurz'); }
  if (d === 0) d = 1;
  return { delta: clamp(d, -15, 12), asks, why };
}

// Liest Code bzw. Kartendaten aus einem Satz des Anrufers (für "Kopieren" / "Ins Formular einfügen").
export function extractCard(text, pay) {
  const t = String(text || '');
  if (pay === 'giftcard') {
    const m = t.match(/(?<!\d)(\d{4})[\s-]?(\d{4})(?!\d)/);
    return m ? { code: `${m[1]}-${m[2]}`, copy: `${m[1]}-${m[2]}` } : null;
  }
  const n = t.match(/(?<!\d)(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})(?!\d)/);
  if (!n) return null;
  const number = `${n[1]} ${n[2]} ${n[3]} ${n[4]}`;
  const rest = t.slice(t.indexOf(n[0]) + n[0].length);
  const exp = rest.match(/(?<!\d)(\d{1,2})\s*\/\s*(\d{2})(?!\d)/);
  const cvv = rest.replace(exp ? exp[0] : '', ' ').match(/(?<!\d)(\d{3})(?!\d)/);
  const out = { number, exp: exp ? `${exp[1].padStart(2, '0')}/${exp[2]}` : '', cvv: cvv ? cvv[1] : '' };
  out.copy = [out.number, out.exp, out.cvv].filter(Boolean).join(' · ');
  return out;
}

// Findet einen Code/Kartennummer in einem Text
export function findCode(text, pay) {
  if (!text) return null;
  const d = onlyDigits(text);
  if (pay === 'giftcard') return d.length >= 6 ? d.slice(0, 8) : null;
  return d.length >= 19 ? d : null;
}
