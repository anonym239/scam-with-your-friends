// Remote-Update-Prüfung: schaut beim GitHub-Release nach, ob eine neuere Version da ist.
// Funktioniert auf PC (Browser/Exe) und in der Android-App. Fällt bei Fehlern still aus.
// Verglichen wird der eingebackene Commit (version.json) mit dem Commit des neuesten Releases.
const REPO = 'anonym239/scam-with-your-friends';

export async function checkUpdate() {
  let cur = 'dev';
  try {
    const v = await (await fetch('version.json', { cache: 'no-store' })).json();
    cur = v.commit || 'dev';
  } catch {}
  if (cur === 'dev' || cur.length !== 40) return null; // lokal / unbekannt → nicht prüfen

  let rel;
  try {
    rel = await (await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store',
    })).json();
  } catch { return null; }
  if (!rel || !rel.tag_name) return null;

  const latest = String(rel.target_commitish || '');
  // Nur melden, wenn das Release einen echten Commit referenziert, der sich unterscheidet
  if (latest.length === 40 && latest !== cur) {
    return { tag: rel.tag_name, url: rel.html_url || `https://github.com/${REPO}/releases/latest` };
  }
  return null;
}
