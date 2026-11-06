// Mesurer les déclencheurs du garage avant d'écrire les seuils (billet n°10).
//
// Deux questions, une seule réponse mesurée :
//
//   1. la parole brute du modèle change-t-elle assez vite pour qu'un compteur qui la
//      lise ouvre des pièces tout seul ? (c'est le piège écrit au billet, et le #7
//      l'a payé pour la parole) ;
//   2. sur la ligne du jeu — graine 1882, lancée comme la le fait l'écran —, qu'est-ce
//      qui s'ouvre, en secondes de machine et en secondes d'écran, et qu'est-ce qui ne
//      s'ouvre jamais ?
//
// Le outil ne fait que conduire l'engin : les seuils sont lus dans `reglesDuJeu`, les
// épisodes sont comptés par `garage` lui-même. C'est le code livré qui est mesuré, pas
// une copie. Une image sur vingt de seconde, comme la projection.
//
//   node tests/outillage/mesurer-garage.mjs            la ligne du jeu
//   node tests/outillage/mesurer-garage.mjs --markdown  le même tableau en markdown
//
// Les vitesses sont données en secondes de *machine* — à ×4, la machine vit quatre
// secondes pendant que l'enfant en vit une.

import { chargerModele, chargerRegles } from '../harnais.js';

const M = chargerModele();
const R = chargerRegles();
const PAS = 1 / 20;              // une image sur vingt de seconde, comme l'écran

// La table, lue là où elle est écrite.
const FAITS = R.TABLE_DU_GARAGE.map((d) => ({
  fait: d.fait, nom: d.nom, seuil: d.seuil, pieces: d.pieces, du_depart: Boolean(d.du_depart),
}));

// Le départ tel que la projection le fait : les pleins du catalogue, le feu à 80 %,
// le robinet ouvert, quarante secondes de chauffe avant de lâcher la machine.
function depart({ graine = R.GRAINE_DU_JEU, pieces = [], feu = 0.8, chauffer = 40 }) {
  const monde = R.mondeDeLaGraine(graine);
  const engin = M.nouvelEngin([...R.PIECES_DE_BASE, ...pieces]);
  engin.commandes.feu = R.commandeDuCurseur(feu * 100);
  engin.commandes.regulateur = R.commandeDuCurseur(100);
  R.passerLImage(engin, R.mondeSousLesRoues(engin, monde), { duree: chauffer });
  engin.pousser();
  return { engin, monde };
}

// Les profils d'enfant. Chacun est une politesse rendue : ce que l'on fait à la
// machine, image par image, et rien d'autre.
const PROFILS = {
  'laissée à elle-même': {},
  'qui tape la barre toutes les 2 s': { barre: 2 },
  'qui ferme et rouvre le robinet': { robinet: 6 },
  'qui coupe le feu et le reprend': { feuHache: { cycle: 25, coupure: 15 } },
  'feu à fond': { feu: 1 },
  'feu à fond et barre': { feu: 1, barre: 2 },
};

// Le feu qui coupe et reprend : c'est ce que fait une main sur le curseur quand la
// machine s'obstine — fermer, laisser redescendre, rouvrir.
function feuDe({ t, feu = 0.8, cycle = 25, coupure = 15 }) {
  return Math.floor(t / (cycle + coupure)) * (cycle + coupure) + cycle <= t ? 0 : feu;
}

function mene({ vitesse = 1, secondes = 200, barre = null, robinet = null, feu = 0.8, feuHache = null,
  pieces = [], graine = R.GRAINE_DU_JEU, mondeFixe = null, memo = null }) {
  const { engin, monde } = depart({ pieces, feu, graine });
  const sousLeMonde = mondeFixe || monde;
  const g = memo || R.nouvelleMemo();
  const t = { machine: engin.tempsEcoule };           // l'horloge du profil
  let prochaineBarre = barre === null ? Infinity : barre;
  let ouverteApresRobinet = false;
  const ouvertures = [];
  const images = Math.round(secondes / (PAS * vitesse));
  let bascules = 0;
  let mot = R.situation(engin, sousLeMonde);
  const mots = {};
  let vitesseMax = 0;
  let auRepos = { n: 0, somme: 0, max: 0 };
  const quand = {};

  for (let i = 0; i < images; i += 1) {
    if (feuHache !== null) engin.commandes.feu = R.commandeDuCurseur(feuDe({ ...feuHache, t: t.machine }) * 100);
    // Le geste, s'il est dû.
    if (t.machine >= prochaineBarre) {
      R.coupDeBarre(engin, g);        // le geste de l'écran, avec sa mémoire
      prochaineBarre = t.machine + barre;
    }
    if (robinet !== null) {
      // L'enfant qui joue du robinet : fermé six secondes, rouvert six secondes.
      const cycle = Math.floor(t.machine / robinet) % 2 === 0;
      engin.commandes.regulateur = cycle && !ouverteApresRobinet ? 0 : R.commandeDuCurseur(100);
      ouverteApresRobinet = !cycle;
    }
    R.passerLImage(engin, R.mondeSousLesRoues(engin, sousLeMonde), { duree: PAS * vitesse });
    t.machine = engin.tempsEcoule;

    const etat = R.etatDuJeu(engin, sousLeMonde, g);   // <- `garage` tourne ici
    for (const neuf of etat.garage.recents) {
      ouvertures.push({ ...neuf, machine: engin.tempsEcoule, distance: engin.distance });
    }
    const brut = R.situation(engin, sousLeMonde);
    if (brut !== mot) { bascules += 1; mot = brut; }
    mots[brut] = (mots[brut] || 0) + 1;
    const v = Math.abs(engin.vitesse());
    vitesseMax = Math.max(vitesseMax, v);
    if (v < 0.25) { auRepos.n += 1; auRepos.somme += v; auRepos.max = Math.max(auRepos.max, v); }
    if (quand.citerne === undefined && engin.citerne <= 0) quand.citerne = engin.tempsEcoule;
    if (quand.soute === undefined && engin.soute <= 0) quand.soute = engin.tempsEcoule;
    if (quand.riviere === undefined && R.mondeSousLesRoues(engin, sousLeMonde).riviere) quand.riviere = engin.tempsEcoule;
    if (quand.vent === undefined && R.mondeSousLesRoues(engin, sousLeMonde).vent >= R.VENT_DUNE_VALLEE) quand.vent = engin.tempsEcoule;
    // La pente sous les roues, pas celle du fond : c'est `penteReelle` qui somme le
    // fond et les rampes, comme le modèle.
    if (quand.rampe === undefined && M.penteReelle(engin, sousLeMonde) >= R.PENTE_DUNE_RAMPE) quand.rampe = engin.tempsEcoule;
  }
  const dernier = R.etatDuJeu(engin, sousLeMonde, g);
  return {
    ouvertures, episodes: dernier.garage.episodes, bascules, mots,
    distance: engin.distance, vitesseMax, auRepos, quand,
    citerne: engin.citerne, soute: engin.soute,
  };
}

// Le trajet de la ligne, une fois pour toutes : où sont la butte, la rivière, le
// charbonnage, la vallée et la rampe du bout.
function trajet() {
  const ligne = R.ligneDeLaGraine(R.GRAINE_DU_JEU);
  const bandes = [];
  for (const b of ligne.bosses) bandes.push(`${Math.round(b.a)}-${Math.round(b.a + b.longueur)} m à ${Math.round(b.pente * 100)} %`);
  return {
    bosses: bandes,
    riviere: ligne.riviere ? `${Math.round(ligne.riviere.a)}-${Math.round(ligne.riviere.a + ligne.riviere.longueur)} m` : 'jamais',
    charbon: ligne.charbonnage ? `${Math.round(ligne.charbonnage.a)}-${Math.round(ligne.charbonnage.a + ligne.charbonnage.longueur)} m` : 'jamais',
    vent: ligne.vent ? `${Math.round(ligne.vent.a)}-${Math.round(ligne.vent.a + ligne.vent.longueur)} m, force ${ligne.vent.force ?? ligne.vent.valeur ?? '?'}` : 'jamais',
  };
}

const e2 = (n) => (Number.isFinite(n) ? n.toFixed(1).replace('.', ',') : '—');

function markdownRelances(r) {
  const sortie = ['|lancer|distance|calages|ce qui s ouvre| secondes de machine depuis le lancement|', '|---|---|---|---|---|'];
  for (const l of r.lignes) sortie.push(`|${l.lancer}|${l.distance}|${l.calages}|${l['ce qui s ouvre']}|${l['secondes de machine']}|`);
  return sortie.join('\n');
}

function tableau({ vitesse = 1, secondes = 200 }) {
  const lignes = [];
  for (const [nom, reglages] of Object.entries(PROFILS)) {
    const r = mene({ ...reglages, vitesse, secondes });
    const ouvertes = r.ouvertures.length
      ? r.ouvertures.map((o) => `${o.nom} → ${o.pieces.join(' + ')} @${e2(o.machine)} s`).join(' · ')
      : 'rien';
    const comptes = FAITS.filter((f) => !f.du_depart)
      .map((f) => `${f.fait} ${r.episodes[f.fait] || 0}/${f.seuil}`).join(' · ');
    lignes.push({
      profil: nom,
      'ouvert en s de machine': ouverteSous(r, vitesse),
      'ouvert en s d’écran': `${e2(r.ouvertures.length ? r.ouvertures[0].machine / vitesse : NaN)} / ${e2(r.ouvertures.length ? r.ouvertures[r.ouvertures.length - 1].machine / vitesse : NaN)}`,
      épisodes: comptes,
      distance: `${e2(r.distance)} m`,
      'parole brute': `${r.bascules} bascules`,
      ce_qui_s_ouvre: ouvertes,
    });
  }
  return lignes;
}

// Les deux premières ouvertures, en secondes d'écran : c'est la question du billet.
function ouverteSous(r, vitesse) {
  if (!r.ouvertures.length) return 'rien';
  const premiers = r.ouvertures.filter((o) => o.pieces.length).slice(0, 2);
  return premiers.map((o) => `${o.fait} @${e2(o.machine / vitesse)}`).join(' · ');
}

// Trois lancers d'affilée avec la même mémoire : c'est le geste de l'enfant que
// l'écran lui laisse — cale, on relance. La mémoire du jeu survit d'un essai à
// l'autre (c'est sa raison d'être), donc trois chutes vécues sont trois chutes.
function relances({ n = 4, secondes = 90, vitesse = 1, memo = R.nouvelleMemo(), ...reglages }) {
  const lignes = [];
  let vu = 0;
  for (let k = 1; k <= n; k += 1) {
    const r = mene({ ...reglages, vitesse, secondes, memo });
    const neuves = r.ouvertures.filter((o) => o.pieces.some((p) => p === 'second_cylindre'));
    lignes.push({
      lancer: k,
      distance: `${e2(r.distance)} m`,
      calages: `${r.episodes.calage}/${(FAITS.find((f) => f.fait === 'calage') || {}).seuil}`,
      'ce qui s ouvre': neuves.length ? `second cylindre ouvert au lancer ${k}` : '—',
      'secondes de machine': e2(r.ouvertures.length ? r.ouvertures[r.ouvertures.length - 1].machine : NaN),
    });
    vu = r.episodes.calage;
  }
  return { lignes, calages: vu };
}

function markdown() {
  const sortie = [];
  sortie.push('### Le trajet de la graine du jeu');
  const t = trajet();
  sortie.push(`- pentes : ${t.bosses.join(' ; ')}`);
  sortie.push(`- rivière : ${t.riviere} · charbonnage : ${t.charbon} · vallée ventée : ${t.vent}`);
  for (const vitesse of [1, 4]) {
    sortie.push('');
    sortie.push(`### Ce qui s'ouvre à ×${vitesse} — 200 s de machine`);
    const lignes = tableau({ vitesse });
    const clefs = Object.keys(lignes[0]);
    sortie.push(`|${clefs.join('|')}|`);
    sortie.push(`|${clefs.map(() => '---').join('|')}|`);
    for (const l of lignes) sortie.push(`|${clefs.map((c) => l[c]).join('|')}|`);
  }
  sortie.push('');
  sortie.push('### Trois chutes, trois lancers, la même mémoire');
  sortie.push('');
  sortie.push('*lancée et laissée* :');
  sortie.push(markdownRelances(relances({ n: 4 })));
  sortie.push('|lancer|distance|calages|ce qui s ouvre| secondes de machine depuis le lancement|');
  sortie.push('|---|---|---|---|---|');
  for (const l of relance.lignes) sortie.push(`|${l.lancer}|${l.distance}|${l.calages}|${l['ce qui s ouvre']}|${l['secondes de machine']}|`);
  sortie.push('');
  sortie.push('*qui ferme le robinet quand elle s arrête* :');
  sortie.push(markdownRelances(relances({ n: 4, ...PROFILS['qui ferme et rouvre le robinet'] })));
  sortie.push('');
  sortie.push('### Ce qui narrive jamais sur la ligne, et à quel prix');
  for (const [nom, reglages] of Object.entries(PROFILS)) {
    const r = mene({ ...reglages, vitesse: 1, secondes: 3600 });
    sortie.push(`- **${nom}** : distance ${e2(r.distance)} m · citerne sèche à ${e2(r.quand.citerne)} s · soute vide à ${e2(r.quand.soute)} s · rivière à ${e2(r.quand.riviere)} s · vallée ventée à ${e2(r.quand.vent)} s · rampe de 20 % à ${e2(r.quand.rampe)} s · ouvert : ${r.ouvertures.map((o) => o.nom).join(', ') || 'rien'}`);
  }
  return sortie.join('\n');
}

if (process.argv.includes('--markdown')) {
  console.log(markdown());
} else {
  const t = trajet();
  console.log('trajet de la graine du jeu :');
  console.log(`  pentes ${t.bosses.join(' ; ')}`);
  console.log(`  rivière ${t.riviere} · charbon ${t.charbon} · vent ${t.vent}`);
  console.log('');
  for (const vitesse of [1, 4]) {
    console.log(`— à ×${vitesse}, 200 s de machine —`);
    console.table(tableau({ vitesse }));
  }
  console.log('— trois chutes, trois lancers, la même mémoire : lancée et laissée —');
  console.table(relances({ n: 4 }).lignes);
  console.log('— même chose, en fermant le robinet quand elle s arrête —');
  console.table(relances({ n: 4, ...PROFILS['qui ferme et rouvre le robinet'] }).lignes);
  console.log('— 3600 s de machine (une heure) : ce qui ne tombe jamais —');
  console.table(Object.entries(PROFILS).map(([nom, r]) => {
    const x = mene({ ...r, vitesse: 1, secondes: 3600 });
    return {
      profil: nom, distance: `${e2(x.distance)} m`,
      'citerne sèche': e2(x.quand.citerne), 'soute vide': e2(x.quand.soute),
      rivière: e2(x.quand.riviere), 'vallée ventée': e2(x.quand.vent),
      'rampe 20 % sous les roues': e2(x.quand.rampe), ouvert: x.ouvertures.map((o) => o.nom).join(', ') || 'rien',
    };
  }));
}

export { mene, relances, trajet, FAITS };
