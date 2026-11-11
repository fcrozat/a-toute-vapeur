// Le feuillet du billet n°10, écrit par personne d'autre que le jeu.
//
//   node tests/outillage/ecrire-relecture-10.mjs
//
// Tout ce qui est nombre, seuil ou phrase est lu dans `index.html` ; les chiffres
// viennent du conducteur de mesure (`mesurer-garage.mjs`), rejoués ici, à la graine du
// jeu, à ×1. Une promesse de `tests/regles.test.js` relit le fichier ligne à ligne :
// c'est elle qui empêche ce feuillet de pourrir comme celui du billet 7, qui comptait
// quatorze phrases sur vingt-deux que le jeu ne prononçait plus.
//
// Une vingtaine de secondes. Les gros chiffres d'une heure de machine sont dans la
// mesure consignée avec le billet ; ce feuillet ne redit que ce qu'il rejoue.
import { readFileSync, writeFileSync } from 'node:fs';
import { chargerModele, chargerRegles } from '../harnais.js';
import { mene, PROFILS, FAITS, trajet, e2 } from './mesurer-garage.mjs';

const M = chargerModele();
const R = chargerRegles();
const PAS = 1 / 120;            // l'image de l'écran : ici on joue, on ne saute pas
const SORTIE = new URL('../../docs/relecture-billet-10.md', import.meta.url);
const ROBINET_AVARE = 0.1;      // la vapeur est encore demandée : la fermer ne cale pas
const FEU_MESURE = 0.5;

const roule = (engin) => Math.abs(engin.vitesse()) >= R.VITESSE_D_ROULER;
const NOM = (id) => M.CATALOGUE[id].nom;
const LIGNES_DU_FEUILLET = [];
const p = (...lignes) => LIGNES_DU_FEUILLET.push(...lignes);

function joue(engin, monde, memo, secondes, jusquA = null) {
  let dernier = null;
  for (let t = 0; t < secondes; t += PAS) {
    R.passerLImage(engin, monde, { duree: PAS });
    dernier = R.etatDuJeu(engin, monde, memo);
    if (jusquA && jusquA(dernier)) break;
  }
  return dernier;
}

// L'engin chaud et les pleins faits : on mesure ce qui s'ouvre, pas la faim du foyer.
function machineChauffee(monde, { feu }) {
  const engin = M.nouvelEngin(R.PIECES_DE_BASE);
  engin.soute = 4000;
  engin.citerne = 4000;
  engin.commandes.feu = feu;
  engin.commandes.regulateur = 1;
  joue(engin, monde, R.nouvelleMemo(), 40);
  return engin;
}

// Le geste d'une chute, le seul que l'écran laisse faire : reprendre par-dessus
// VITESSE_D_ROULER, puis le robinet avare sans le fermer, et la laisser se tenir.
function uneChute(engin, monde, memo, n) {
  engin.commandes.regulateur = 1;
  for (let i = 0; i < 12 && !roule(engin); i += 1) {
    R.coupDeBarre(engin, memo);
    joue(engin, monde, memo, 1);
  }
  const relancee = roule(engin);
  engin.commandes.regulateur = ROBINET_AVARE;
  const etat = joue(engin, monde, memo, 60, (e) => e.garage.episodes.calage >= n);
  return { relancee, etat };
}

// Les six mains d'enfant, deux cents secondes de machine chacune, à ×1.
function sixProfils() {
  const lignes = [];
  for (const [nom, reglages] of Object.entries(PROFILS)) {
    lignes.push({ nom, r: mene({ ...reglages, vitesse: 1, secondes: 200 }) });
  }
  return lignes;
}

// Le bercement seul, joué comme la promesse qui le garde : le plat, un coup de barre au
// lancement, puis le robinet avare et plus personne dessus. Ce qu'on note est le fossé
// entre les bascules de la parole brute et ce que le garage en compte.
function bercement() {
  const monde = M.nouveauMonde();
  const memo = R.nouvelleMemo();
  const engin = M.nouvelEngin(R.PIECES_DE_BASE);
  engin.soute = 4000;
  engin.citerne = 4000;
  engin.commandes.feu = 1;
  engin.commandes.regulateur = 1;
  R.coupDeBarre(engin, memo);
  joue(engin, monde, memo, 40);
  engin.commandes.regulateur = ROBINET_AVARE;
  let bascules = 0;
  let mot = R.situation(engin, monde);
  const mots = {};
  for (let t = 0; t < 200; t += PAS) {
    R.passerLImage(engin, monde, { duree: PAS });
    R.etatDuJeu(engin, monde, memo);
    const brut = R.situation(engin, monde);
    mots[brut] = (mots[brut] || 0) + 1;
    if (brut !== mot) { bascules += 1; mot = brut; }
  }
  const etat = R.etatDuJeu(engin, monde, memo);
  const tenus = Object.entries(mots)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m, n]) => `« ${m} » ${(n * PAS).toFixed(0)} s`);
  return { bascules, episodes: etat.garage.episodes.calage, tenus: tenus.join(' · ') };
}

// Quatre chutes de suite, la même mémoire : ce que la table promet, joué à l'écran.
function quatreChutes() {
  const monde = R.mondeDeLaGraine(R.GRAINE_DU_JEU);
  const memo = R.nouvelleMemo();
  let engin = machineChauffee(monde, { feu: FEU_MESURE });
  const pas = [];
  for (const n of [1, 2, 3, 4]) {
    // La quatrième chute se joue sur une machine relancée : à onze bars la vapeur
    // comprimée ne la lâche plus (section 7). Ce qui compte est la mémoire, pas la machine.
    if (n === 4) engin = machineChauffee(monde, { feu: FEU_MESURE });
    const avant = memo.deblocages.length;
    const { relancee, etat } = uneChute(engin, monde, memo, n);
    pas.push({
      chute: n,
      relancee,
      episodes: etat ? etat.garage.episodes.calage : '—',
      ouvertes: memo.deblocages.slice(avant),
      machine: engin.tempsEcoule.toFixed(0),
    });
  }
  return { pas, deblocages: memo.deblocages };
}

// Combien de chutes on peut enchaîner sans relancer la machine, selon le feu. Trouvé en
// écrivant les promesses ; consigné, le modèle n'est pas de ce billet.
function reprises() {
  const lignes = [];
  for (const feu of [1, 0.5, 0.3]) {
    const monde = R.mondeDeLaGraine(R.GRAINE_DU_JEU);
    const memo = R.nouvelleMemo();
    const engin = machineChauffee(monde, { feu });
    let reussies = 0;
    while (reussies < 6) {
      const { relancee, etat } = uneChute(engin, monde, memo, reussies + 1);
      if (!relancee || !etat) break;
      reussies += 1;
    }
    lignes.push({ feu, reussies, pression: engin.chaudiere.pression.toFixed(0) });
  }
  return lignes;
}

// Les promesses du billet, relues là où elles sont écrites.
function promessesDuBillet() {
  const source = readFileSync(new URL('../regles.test.js', import.meta.url), 'utf8');
  const debut = source.indexOf('// --- Le garage s\'agrandit par le problème');
  if (debut < 0) throw new Error('le bloc du billet n°10 n’est plus dans tests/regles.test.js');
  return [...source.slice(debut).matchAll(/^test\('(.+?)', (?:async )?\(\)/gm)].map((m) => m[1]);
}

const SIX = sixProfils();
const BE = bercement();
const CHUTES = quatreChutes();
const REPRISES = reprises();
const PROMESSES = promessesDuBillet();
const TRAJET = trajet();
const CLEFS = Object.keys(R.PAROLES);
const SEUILS = R.TABLE_DU_GARAGE;
const CALAGE = SEUILS.find((d) => d.fait === 'calage');

// Ce que la ligne du jeu ne rencontre pas, calculé sur les six mains d'enfant.
const SCORES = SEUILS.filter((d) => !d.du_depart).map((d) => ({
  fait: d.fait,
  nom: d.nom,
  seuil: d.seuil,
  pieces: d.pieces.map(NOM).join(' + '),
  meilleur: Math.max(...SIX.map(({ r }) => r.episodes[d.fait] || 0)),
})).sort((a, b) => a.meilleur - b.meilleur || b.seuil - a.seuil);
const score = (fait) => SCORES.find((s) => s.fait === fait);

p(`# Relecture du billet 10 — ce qui s'ouvre, et ce que la ligne du jeu ne rencontre pas`, ``);
p(`Un fichier pour un humain. Il est écrit par \`tests/outillage/ecrire-relecture-10.mjs\` : ne`, `pas corriger à la main, corriger le jeu ou le générateur, puis rejouer`, `\`node tests/outillage/ecrire-relecture-10.mjs\` (une vingtaine de secondes).`, `Une promesse relit ce fichier ligne à ligne (\`tests/regles.test.js\`, « le feuillet de`, `relecture du billet dit ce que le code dit »). Le billet 7 avait eu le droit de pourrir en`, `une passe : quatorze phrases sur vingt-deux que le jeu ne prononçait plus.`, ``);
p(`## 1. Ce que le billet décide`, ``);
p(`Une pièce nouvelle vient de l'ennui rencontré, jamais d'un niveau franchi ni d'une monnaie`, `comptée (ADR 0006). Le garage tient une seule table de seuils. Les trois gags — l'éolipyle,`, `la fusée, la remorque — sont sur l'établi à la première image : leur punition est`, `automatique, ils pèsent, ils ne se gagnent pas.`, ``);
p(`|fait|nom|seuil|ce que ça ouvre|l'ennui, énoncé|`, `|---|---|---|---|---|`);
for (const d of SEUILS) p(`|${d.fait}|${d.nom}|${d.seuil}|${d.pieces.map(NOM).join(' + ')}|${d.episode}|`);
p(``);
p(`Sept lignes, sept énoncés, relus dans \`TABLE_DU_GARAGE\`. Une autre promesse compte les`, `\`seuil:\` écrits dans le fichier et vérifie qu'il n'y en a pas un hors de cette table, ni un second`, `endroit où écrire \`deblocages.push\`.`);
p(``, `## 2. Ses phrases`, ``);
p(`Elle ne dit **${CLEFS.length} phrases** : les ${CLEFS.length} ci-dessous, mot pour mot, et aucune autre. Cocher`, `celles qu'on a entendues à l'écran en jouant la section 3. Aucune n'est une leçon, aucune ne`, `propose une réparation, aucune ne dit « appuie sur ».`);
p(``, `|clef|la phrase|entendue ?|`, `|---|---|---|`);
for (const clef of CLEFS) p(`|${clef}|${R.PAROLES[clef]}|☐|`);
p(``);
p(`## 3. Ce que la ligne du jeu rend, mesuré`, ``);
p(`Deux cents secondes de machine à ×1, à la graine du jeu (\`${R.GRAINE_DU_JEU}\`), par le conducteur`, `de \`mesurer-garage.mjs\`. Six mains d'enfant, chacune une politesse rendue à la machine, image`, `par image. « parole brute », c'est le nombre de fois où le mot du modèle change pendant la`, `partie : c'est le bercement — précisément ce que le compteur du garage ne lit pas.`, ``);
p(`- pentes : ${TRAJET.bosses.join(' ; ')}`);
p(`- rivière : ${TRAJET.riviere} · charbonnage : ${TRAJET.charbon} · vallée ventée : ${TRAJET.vent}`, ``);
p(`|main d'enfant|épisodes|distance|parole brute|ce qui s'ouvre (en secondes de machine)|`, `|---|---|---|---|---|`);
for (const { nom, r } of SIX) {
  const comptes = FAITS.filter((f) => !f.du_depart).map((f) => `${f.fait} ${r.episodes[f.fait] || 0}/${f.seuil}`).join(' · ');
  const ouvertes = r.ouvertures.length
    ? r.ouvertures.map((o) => `${o.nom} → ${o.pieces.join(' + ')} @${e2(o.machine)}`).join(' · ')
    : 'rien';
  p(`|${nom}|${comptes}|${e2(r.distance)} m|${r.bascules} bascules|${ouvertes}|`);
}
p(``);
p(`## 4. Le bercement : le risque n°1 du billet`, ``);
const FOND = SIX.find(({ nom }) => nom === 'feu à fond').r;
p(`Sur le plat, lancée, le robinet avare à \`${e2(ROBINET_AVARE)}\` et plus personne dessus, deux cents`, `secondes : la parole brute du modèle bascule **${BE.bascules} fois**, le garage compte`, `**${BE.episodes} calage** et n'ouvre rien. Les trois mots les plus tenus pendant ce temps-là :`, `${BE.tenus}.`, ``);
p(`Sur la ligne du jeu à feu d'enfer, le bercement est bien plus fort : **${FOND.bascules} bascules**`, `en deux cents secondes, ${FOND.episodes.calage || 0} chute tenue — il en faut ${CALAGE.seuil} pour ouvrir une pièce.`, `C'est là qu'est le piège : un compteur qui lirait la parole du modèle ouvrirait le second cylindre en`, `trente secondes de point mort.`);
p(`C'est la mesure qui prouve que le compteur compte des chutes tenues et non des bascules.`, `Deux promesses la gardent, l'une à la règle nue, l'autre sur la ligne du jeu par le même`, `conducteur que ce feuillet. Le seuil est à ${CALAGE.seuil} : ${BE.episodes} en deux cents secondes, ça ne`, `passe pas — et c'est exactement ce qu'on veut.`, ``);
p(`## 5. Trois chutes, trois lancers, la même mémoire`, ``);
p(`Le geste, écrit avec les seules commandes de l'écran : elle reprend la barre jusque`, `par-dessus \`${e2(R.VITESSE_D_ROULER)}\` m/s — sans ça, rien n'arme la chute suivante —, puis le robinet`, `avare sans le fermer (\`estPrise\` veut la vapeur demandée), et on la laisse se tenir deux`, `secondes. Un feu mesuré (${e2(FEU_MESURE)}), pas le feu d'enfer, pour la raison écrite à la section 7.`, ``);
p(`|chute|relancée|calages comptés|ce que ça ouvre|à|`, `|---|---|---|---|---|`);
for (const q of CHUTES.pas) {
  p(`|${q.chute}|${q.relancee ? 'oui' : 'non'}|${q.episodes}|${q.ouvertes.length ? q.ouvertes.map(NOM).join(', ') : 'rien'}|${q.machine} s|`);
}
p(``, `Les trois gags ouvrent à la première image consultée, ici pendant la première reprise : ils`, `n'ont rencontré aucun ennui, ils sont là. La troisième ouverture est bien celle de la`, `table ; la quatrième chute, jouée sur une machine relancée avec la même mémoire, ne rouvre`, `rien et ne redit pas la phrase. \`${CHUTES.deblocages.join('`, \`')}\` : la mémoire de la partie à la fin.`, `Deux promesses, pas une observation.`);
p(``, `## 6. Ce qui ne s'ouvre pas sur la ligne du jeu`, ``);
p(`Écrit ici parce que c'est un constat, pas un réglage. Aucun seuil n'a été descendu pour`, `faire joli : les nombres du billet sont ceux de la table, et la ligne du jeu ne les`, `rencontre pas tous.`, ``);
p(`|fait|seuil|meilleur score des six mains|ce que ça ouvre|`, `|---|---|---|---|`);
for (const s of SCORES) p(`|${s.fait}|${s.seuil}|${s.meilleur}/${s.seuil}|${s.pieces}|`);
p(``);
p(`- **le second cylindre n'ouvre pas sous une main qui laisse le robinet ouvert** : aucune des`);
p(`  six mains mesurées ici ne l'a ouvert, et le meilleur score de chutes tenues reste`);
p(`  ${score('calage').meilleur}/${CALAGE.seuil} — en deux cents secondes comme en une heure (mesure longue consignée`);
p(`  avec le billet). Ce n'est pas une porte fermée : la section 8 joue les trois chutes à`);
p(`  l'écran, avec le seul doigt d'un enfant, et la pièce s'y ouvre. Ce que ces six mains ne`);
p(`  font pas, c'est refermer le robinet pour la laisser s'asseoir. Un enfant qui ne cherche`);
p(`  pas le point mort ne verra pas la pièce : c'est le risque assumé du « par le problème ».`);
p(`- la soute vide (${score('soute').meilleur}/${score('soute').seuil}) attend le charbonnage : les pleins du catalogue tiennent`);
p(`  au-delà de deux cents secondes sur la ligne. La pièce est branchable, sa condition est rare.`);
p(``, `## 7. Ce qui borne le nombre de chutes : la vapeur comprimée la retient`, ``);
p(`Trouvé en écrivant les promesses, consigné sans toucher au modèle — il n'est pas de ce`, `billet. Après une chute tenue, la barre doit lui rendre \`${e2(R.VITESSE_D_ROULER)}\` m/s pour armer la`, `suivante. À feu d'enfer la pression monte à ${REPRISES[0].pression} bars et la vapeur comprimée la tient :`);
p(`elle ne repart plus, et la quatrième chute n'a plus rien à rencontrer.`, ``);
p(`|feu|chutes enchaînées sans relancer|pression à la fin|`, `|---|---|---|`);
for (const r of REPRISES) p(`|${r.feu}|${r.reussies} sur 6|${r.pression} bars|`);
p(``);
p(`Personne n'enchaîne six chutes sans relancer la machine : au mieux ${Math.max(...REPRISES.map((r) => r.reussies))} sur six, et dès`, `${REPRISES[0].reussies} sur six à feu d'enfer. Un enfant qui laisse le feu à fond perd donc la`, `partie de calage tout de suite : il faut couper le feu, ou ne pas l'ouvrir à fond, ou`, `relancer. À juger au regard — c'est une punition automatique qui ressemble à un mur, pas à`, `une leçon. La promesse du bercement est jouée à feu d'enfer exprès : c'est là que la parole`, `bascule le plus.`);
p(``, `## 8. À l'écran, aujourd'hui`, ``);
p(`Tout ce feuillet est écrit à la couture des règles. Le billet demandait aussi l'image : elle`);
p(`est jouée dans la page du dépôt elle-même, Playwright en tête-à-tête, Playwright et son`);
p(`chromium restés au cache de travail — le dépôt ne reçoit que des PNG. Les trois images`);
p(`ci-dessous montrent le jeu tel qu'il est maintenant, après les billets #11, #12, #14, #19`);
p(`et #20 : les unités justes à la soute et à la citerne, la masse qui suit ce qu'on embarque,`);
p(`le levier de changement de marche sur l'établi. Les captures de l'époque du billet, qui`);
p(`montraient une soute en litres et une masse sourde aux réservoirs, ont été retirées du`);
p(`dépôt : une image qui ment sur le jeu ment deux fois.`);
p(``, `|moment|à l'écran|`, `|---|---|`);
p(`|le lever de rideau|la machine roule, Braise nomme ce qui se passe — capture-ecran-roule.png|`);
p(`|la barre à son régime|elle échappe aux mains, et Braise le dit — capture-ecran-parole.png|`);
p(`|le garage ouvert|l'établi compte les pièces de l'engin d'ouverture, changement de marche compris — capture-ecran-garage.png|`);
p(``);
p(`Ce que la section 7 mesurait reste vrai, et l'écran le dit mieux que la couture : à ne pas`);
p(`refermer le robinet, une seule chute tenue suffit à la verrouiller et plus rien ne la fait`);
p(`repartir. Ce n'est pas le seuil qui est dur, c'est la vapeur comprimée.`); 
p(``, `## 9. Ce que les promesses gardent`, ``);
p(`${PROMESSES.length} promesses écrites à la fin de \`tests/regles.test.js\`, dans le bloc « Le garage`, `s'agrandit par le problème ». \`tests/modele.test.js\` n'a pas bougé d'un caractère.`, ``);
for (const t of PROMESSES) p(`- ${t}`);
p(``);

writeFileSync(SORTIE, `${LIGNES_DU_FEUILLET.join('\n')}\n`);
console.log(`${SORTIE.pathname} : ${CLEFS.length} phrases, ${SEUILS.length} seuils, ${PROMESSES.length} promesses, ${BE.bascules} bascules de bercement, ${BE.episodes} calage.`);
