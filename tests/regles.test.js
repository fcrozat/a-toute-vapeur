// Les promesses de l'écran.
//
// Ici on n'ouvre pas le capot : on amène l'engin à un état par la couture
// physique (pasDeTemps), puis on interroge les règles — `situation`,
// `etatDuJeu` — telles que la projection les lit. Le dessin sur le canvas et la
// boucle d'images ne se testent pas (spec, Testing Decisions) : c'est
// l'étroitesse d'`etatDuJeu`, plus une promesse de complétude qui lit la
// projection comme du texte pour vérifier qu'elle ne demande à l'état du jeu que
// ce qu'il rend, qui tiennent lieu de garde.
//
// Les règles sont extraites d'index.html par tests/harnais.js, comme le modèle,
// et reçoivent le modèle comme unique point de départ : elles ne voient ni un
// pixel ni une touche de clavier.

import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerModele, chargerRegles, sourceModele, sourceRegles, sourceProjection } from './harnais.js';

const M = chargerModele();
const R = chargerRegles();

const PAS = 1 / 120;
const CHAUFFE = 50; // secondes de feu avant de démarrer : la vapeur monte, lentement et pour de vrai

// La machine des promesses, telle que le joueur la monte en partant.
const MACHINE = [
  'chaudiere', 'foyer', 'soute', 'citerne', 'cylindre', 'tiroir', 'excentrique',
  'regulateur', 'crosse', 'bielle', 'roues', 'boite_a_fumee', 'soupape',
];

function machineVapeur({ pieces = [], feu = 1, regulateur = 1 } = {}) {
  const engin = M.nouvelEngin([...MACHINE, ...pieces]);
  engin.soute = 4000;   // on teste la conduite, pas la faim du foyer
  engin.citerne = 4000;
  engin.commandes.feu = feu;
  engin.commandes.regulateur = regulateur;
  return engin;
}

const plaine = (regles = {}) => M.nouveauMonde(regles);

function rouler(engin, monde, { duree }) {
  let t = 0;
  while (t < duree) {
    M.pasDeTemps(engin, monde, PAS);
    t += PAS;
  }
  return engin;
}

// Chauffe, coup de barre, puis on la laisse faire : le geste du joueur, dans l'ordre.
function demarrer(engin, monde, { chauffe = CHAUFFE, elan = 0.4, suite = 40 } = {}) {
  rouler(engin, monde, { duree: chauffe });
  engin.pousser(elan);
  rouler(engin, monde, { duree: suite });
  return engin;
}

// On la laisse rouler jusqu’au point demandé, sans jamais forcer la machine.
function roulerJusquA(engin, monde, distanceCible, dureeMax = 300) {
  let t = 0;
  while (engin.distance < distanceCible && t < dureeMax) {
    M.pasDeTemps(engin, monde, PAS);
    t += PAS;
  }
  assert.ok(
    engin.distance >= distanceCible,
    `la machine n’atteint pas sa cible : ${engin.distance.toFixed(1)} m après ${dureeMax} s`
  );
  return engin;
}

// Chaque état de l’engin, amené par le seul jeu des commandes et du terrain.
function enginARret() {
  const engin = machineVapeur({ feu: 0 });
  rouler(engin, plaine(), { duree: 20 });
  return { engin, monde: plaine() };
}

function enginCalant() {
  const engin = machineVapeur();
  rouler(engin, plaine(), { duree: 60 });
  return { engin, monde: plaine() };
}

function enginRoulant() {
  const engin = demarrer(machineVapeur(), plaine());
  return { engin, monde: plaine() };
}

function enginSoufflant() {
  // Elle roule, mais le régulateur est bas : la vapeur ne peut plus assez sortir
  // par le cylindre et la soupape part en fumée. Le charbon brûle, la machine
  // traîne, et elle siffle.
  const engin = machineVapeur({ regulateur: 0.3 });
  rouler(engin, plaine(), { duree: CHAUFFE });
  engin.pousser(4);
  rouler(engin, plaine(), { duree: 60 });
  return { engin, monde: plaine() };
}

function enginPatinent() {
  // Une rampe d'acier : les roues s'emballent, la machine ne monte pas.
  const engin = machineVapeur();
  rouler(engin, plaine({ pente: 0.35 }), { duree: CHAUFFE });
  engin.pousser(4);
  rouler(engin, plaine({ pente: 0.35 }), { duree: 60 });
  return { engin, monde: plaine({ pente: 0.35 }) };
}

function enginASec() {
  const engin = demarrer(machineVapeur(), plaine());
  engin.chaudiere.niveauEau = 0;
  engin.citerne = 0;
  rouler(engin, plaine(), { duree: 5 });
  return { engin, monde: plaine() };
}

function enginEnDanger() {
  // La machine des treize pièces, moins sa soupape : rien ne limite plus la vapeur.
  const engin = M.nouvelEngin(MACHINE.filter((id) => id !== 'soupape'));
  engin.soute = 4000;
  engin.citerne = 4000;
  engin.commandes.feu = 1;
  engin.commandes.regulateur = 0;
  rouler(engin, plaine(), { duree: 90 });
  return { engin, monde: plaine() };
}

// 13
test("lancée sur le plat, la machine dit qu'elle roule", () => {
  const engin = demarrer(machineVapeur(), plaine());
  assert.equal(engin.machine.cale, false, 'la machine devrait faire des tours dans cette plaine');
  assert.equal(R.situation(engin, plaine()), 'roule');
});

// 14
test("feu bas et rien qui tourne : l'engin est à l'arrêt, il n'est pas calé", () => {
  // Le chauffeur n'a pas encore allumé, ou a quitté le foyer : la chaudière
  // est froide et la machine dort. Le mot d'à-côté ne doit pas être « calée »,
  // qui veut dire « tenue à son point mort par la vapeur ».
  const engin = machineVapeur({ feu: 0 });
  rouler(engin, plaine(), { duree: 20 });
  assert.equal(engin.machine.cale, true, 'sans feu, la machine ne fait plus de tours');
  assert.ok(engin.chaudiere.pression < 2, `la chaudière est à ${engin.chaudiere.pression.toFixed(1)} bar : elle n'était pas froide`);
  assert.equal(R.situation(engin, plaine()), 'arret');
});

// 15
test('chauffée à blanc sans élan, la machine se dit calée', () => {
  // Le joueur a monté le feu, la pression est haute, et rien ne tourne : la
  // vapeur renfermée tient le piston à son point mort. Ce n'est pas un arrêt.
  const engin = machineVapeur();
  rouler(engin, plaine(), { duree: 60 });
  assert.ok(engin.chaudiere.pression > 4, `la chaudière n'a pas chauffé (${engin.chaudiere.pression.toFixed(1)} bar)`);
  assert.equal(engin.machine.cale, true, 'sans coup de barre, la machine reste prise au point mort');
  assert.equal(R.situation(engin, plaine()), 'cale');
});

// 16
test('la jauge de pression monte sous les yeux et marque la zone de la soupape', () => {
  // Le joueur doit voir la pression avant de la comprendre, et voir aussi où
  // elle ne sert plus à rien : la zone où la vapeur s'en va par la soupape.
  const monde = plaine();
  const engin = machineVapeur();

  const froide = R.etatDuJeu(engin, monde).jauge;
  assert.equal(froide.pression, M.PRESSION_AMBIANTE, 'à froid, la jauge ne part pas de la pression du jour');
  assert.equal(froide.fond, M.PRESSION_MAX, 'la jauge ne va pas jusqu au plafond de la chaudière');
  assert.ok(froide.soupape > froide.pression, 'la zone de la soupape est marquée dès le bas de la jauge');
  assert.ok(froide.soupape < froide.fond, 'la zone de la soupape serait hors de la jauge');

  let t = 0;
  let dernier = froide.pression;
  while (t < 90) {
    M.pasDeTemps(engin, monde, PAS);
    t += PAS;
    const jauge = R.etatDuJeu(engin, monde).jauge;
    assert.equal(jauge.pression, engin.chaudiere.pression, 'la jauge ne dit pas la pression de la chaudière');
    assert.ok(jauge.pression >= dernier - 1e-9, 'la jauge redescend pendant que le feu monte');
    dernier = jauge.pression;
  }
  assert.ok(dernier > froide.pression + 5, `la jauge n'a pas monté : ${dernier.toFixed(1)} bar`);
  assert.equal(engin.chaudiere.soupapeSiffle, true, 'la soupape devrait souffler à ce moment-là');
  assert.ok(
    Math.abs(R.etatDuJeu(engin, monde).jauge.soupape - dernier) < 0.2,
    `la zone marquée (${R.etatDuJeu(engin, monde).jauge.soupape}) n est pas là où la soupape souffle (${dernier.toFixed(2)})`
  );
});

// 25
test('les règles disent avec quelle machine on ouvre le jeu', () => {
  // La projection ne choisit pas ce qu’elle dessine : elle demande la machine de
  // départ, et elle la trouve assemblée.
  const pieces = R.PIECES_DE_BASE;
  assert.ok(Array.isArray(pieces) && pieces.length === 13, `la machine de départ n’est pas la machine des treize pièces : ${pieces && pieces.length}`);
  for (const id of ['chaudiere', 'foyer', 'roues', 'cylindre', 'tiroir', 'excentrique']) {
    assert.ok(pieces.includes(id), `la machine de départ n’a pas de ${id} à dessiner`);
  }

  // Et surtout : avec ces pièces-là, le chauffeur qui ouvre le feu et le
  // régulateur, puis donne un coup de barre, part sur le plat.
  const monde = plaine();
  const engin = M.nouvelEngin(pieces);
  engin.commandes.feu = 1;
  engin.commandes.regulateur = 1;
  demarrer(engin, monde);
  assert.equal(R.situation(engin, monde), 'roule', 'à l’ouverture, la machine de départ ne roule pas');
});

// 24
test('ni le modèle ni les règles ne savent qu’il y a un écran', () => {
  // La ligne de flottaison (spec, décision 3) : le modèle et les règles rendent
  // des nombres, la projection touche au DOM. Elle ne se vérifie qu’en lisant les
  // deux sections comme du texte — d’où le harnais qui les extrait.
  const INTERDITS = ['document', 'window', 'localStorage', 'requestAnimationFrame'];
  const sections = [['le modèle', sourceModele()], ['les règles', sourceRegles()]];
  for (const [nom, source] of sections) {
    assert.ok(source.length > 200, `la section « ${nom} » est vide : le harnais ne trouve plus ses marques`);
    for (const mot of INTERDITS) {
      assert.equal(source.includes(mot), false, `${nom} parle déjà d’écran : « ${mot} » s’y glisse`);
    }
  }
});

// 23
test('le sol défile sous les roues et dit la pente du chemin', () => {
  // Sentir la vitesse et voir la bosse arriver : le tracé vient de l’état du jeu,
  // pas d’une bande qui glisse pour faire joli.
  const monde = M.nouveauMonde({ pente: 0.01, bosses: [{ a: 20, longueur: 40, pente: 0.1 }] });
  const engin = machineVapeur();
  rouler(engin, monde, { duree: CHAUFFE });
  engin.pousser(4);

  const sol = R.etatDuJeu(engin, monde).sol;
  assert.equal(sol.distance, engin.distance, 'le sol ne défile pas de la distance parcourue');
  assert.deepEqual(sol.bosses, monde.bosses, 'la bosse qui vient n’est pas donnée au dessin');

  // Le dessin n’a pas à connaître les règles du terrain : il demande la pente où
  // il pose son crayon.
  assert.equal(sol.penteEn(0), 0.01, 'avant la bosse, le chemin n’est pas à sa pente de fond');
  assert.equal(sol.penteEn(30), 0.11, 'la bosse ne se laisse pas deviner sous la roue');
  assert.equal(sol.penteEn(80), 0.01, 'la rampe ne finit jamais sur la jauge');
  assert.equal(sol.pente, sol.penteEn(engin.distance), 'la pente annoncée n’est pas celle des roues');

  // Et la machine y monte vraiment : la pente sous les roues change sous les yeux.
  const grimpee = roulerJusquA(engin, monde, 30);
  assert.ok(grimpee.distance > sol.distance, 'le sol recule pendant que la machine avance');
  assert.equal(R.etatDuJeu(grimpee, monde).sol.pente, 0.11, 'dans la bosse, l’écran ne connaît pas la rampe');
});

// 22
test('la fumée s’épaissit quand on monte le feu', () => {
  // Le chauffeur doit voir le foyer qu’il règle : une cheminée qui sort la même
  // fumée à feu doux et à feu d’enfer ne dit rien de ce qui pousse.
  const monde = plaine();
  const doucement = machineVapeur({ feu: 0.3 });
  const aFond = machineVapeur({ feu: 1 });
  rouler(doucement, monde, { duree: 30 });
  rouler(aFond, monde, { duree: 30 });

  const nuance = R.etatDuJeu(doucement, monde).fumee.densite;
  const aFondFume = R.etatDuJeu(aFond, monde).fumee.densite;
  assert.ok(aFondFume > nuance, `feu d’enfer fume comme feu doux : ${aFondFume} contre ${nuance}`);
  assert.ok(aFondFume <= 1, `la densité de fumée sort de l’écran : ${aFondFume}`);

  const eteinte = R.etatDuJeu(machineVapeur({ feu: 0 }), monde).fumee.densite;
  assert.equal(eteinte, 0, 'un foyer froid fume encore');

  // Un foyer qui n’a plus de charbon ne fume pas : la fumée est liée au feu,
  // pas au dessin.
  const affame = machineVapeur({ feu: 1 });
  affame.soute = 0;
  rouler(affame, monde, { duree: 10 });
  assert.equal(R.etatDuJeu(affame, monde).fumee.densite, 0, 'la cheminée fume sans charbon');

  // Billet #18 : la soute démontée garde sa charge — c'est le billet #8 qui le veut —
  // mais le charbon n'est plus à portée de la grille. La cheminée dit le feu du
  // modèle, pas le charbon qui dort dans une pièce ôtée.
  const sansSoute = machineVapeur({ feu: 1 });
  const memo = R.nouvelleMemo();
  rouler(sansSoute, monde, { duree: 10 });
  assert.ok(R.etatDuJeu(sansSoute, monde).fumee.densite > 0, 'avant le geste, la cheminée ne fume déjà plus');
  assert.equal(R.demonterPiece(sansSoute, memo, 'soute'), true, "l'établi refuse de démonter la soute");
  rouler(sansSoute, monde, { duree: 10 });
  assert.ok(sansSoute.soute > 0, 'la soute démontrée a perdu son charbon : le billet #8 est tenu, pas celui-ci');
  assert.equal(R.etatDuJeu(sansSoute, monde).fumee.densite, 0, 'la cheminée fume un feu que la grille ne peut plus nourrir');
});

// 21
test('l’état du jeu dit quelles pièces portent l’engin', () => {
  // Le dessin ne compte pas les pièces à sa façon : il demande ce que l’engin
  // porte, et il dessine ça. Une pièce de plus doit donc passer par ici.
  const monde = plaine();
  const seule = R.etatDuJeu(machineVapeur(), monde).pieces;
  assert.equal(seule.cylindre, 1, 'le dessin ne voit pas le cylindre');
  assert.equal(seule.excentrique, 1, 'le dessin ne voit pas l’excentrique');
  assert.equal(seule.second_cylindre, undefined, 'le dessin invente un second cylindre');

  const double = R.etatDuJeu(machineVapeur({ pieces: ['second_cylindre'] }), monde).pieces;
  assert.equal(double.second_cylindre, 1, 'un second cylindre branché ne passe pas à l’écran');
});

// 20
test('l’état du jeu dit où est le vilebrequin et où en est le tiroir', () => {
  // Le dessin ne calcule aucune physique, mais il a besoin des angles : le
  // vilebrequin, et la place du tiroir sur sa glace.
  const monde = plaine();
  const engin = demarrer(machineVapeur(), monde);
  const etat = R.etatDuJeu(engin, monde);

  assert.equal(etat.machine.angle, engin.machine.angle, 'le dessin ne retrouve pas l’angle du vilebrequin');
  assert.ok(etat.machine.angle >= 0 && etat.machine.angle < 2 * Math.PI, `le vilebrequin sort du tour : ${etat.machine.angle}`);
  assert.equal(etat.machine.tours, engin.machine.tours, 'les tours faits ne sont pas ceux de la machine');
  assert.equal(etat.machine.cale, engin.machine.cale, 'l’écran ne sait pas si la machine est calée');
  assert.equal(etat.machine.patine, engin.machine.patine, 'l’écran ne sait pas si les roues patinent');
  // L’avance à l’admission : c’est elle qui donne la phase de l’excentrique, donc
  // la façon dont sa tige s’accroche au tiroir.
  assert.equal(etat.machine.avance, engin.machine.avance, 'l’excentrique ne connaît pas son avance');
  // Et l’élan de la roue : la barre s’en sert pour ne jamais freiner une machine lancée.
  assert.equal(etat.machine.elan, Math.abs(engin.machine.vitesseAngulaire), 'la barre ignore à quelle vitesse tourne la roue');

  // On laisse la machine faire des tours, telle qu’elle les fait : le tiroir
  // dessiné doit balaier toute sa glace, ouvrir les deux lumières l’une après
  // l’autre, et jamais les deux à la fois.
  const pas = 1 / 240;
  let t = 0;
  let plusHaut = -Infinity;
  let plusBas = Infinity;
  let ouverteAvant = 0;
  let ouverteArriere = 0;
  let echappeAuMoinsUne = false;
  let deuxALaFois = 0;
  while (t < 4) {
    M.pasDeTemps(engin, monde, pas);
    t += pas;
    const d = R.etatDuJeu(engin, monde).distribution;
    plusHaut = Math.max(plusHaut, d.tiroir);
    plusBas = Math.min(plusBas, d.tiroir);
    if (d.lumiere.avant > 0) ouverteAvant += 1;
    if (d.lumiere.arriere > 0) ouverteArriere += 1;
    if (d.lumiere.avant > 0 && d.lumiere.arriere > 0) deuxALaFois += 1;
    if (d.echappement.avant || d.echappement.arriere) echappeAuMoinsUne = true;
  }
  assert.ok(ouverteAvant > 0, 'la lumière d’avant ne s’ouvre jamais sous les yeux');
  assert.ok(ouverteArriere > 0, 'la lumière d’arrière ne s’ouvre jamais sous les yeux');
  assert.equal(deuxALaFois, 0, 'le dessin ouvre les deux lumières d’admission à la fois');
  assert.equal(echappeAuMoinsUne, true, 'l’échappement ne se voit jamais ouvert');
});

// 19
test('en marche arrière, la vitesse reste une vitesse et le sens est dit', () => {
  // La vitesse angulaire est signée. Une jauge qui prend la valeur brute affiche
  // des kilomètres par heure négatifs : l’enfant lit une erreur, pas un recul.
  const monde = plaine();
  const engin = machineVapeur({ pieces: ['changement_de_marche'] });
  engin.machine.marche = 'arriere';
  demarrer(engin, monde);
  assert.ok(engin.distance < -20, `la machine ne recule pas (${engin.distance.toFixed(1)} m)`);

  const vitesse = R.etatDuJeu(engin, monde).vitesse;
  assert.equal(vitesse.sens, 'arriere', 'le sens de la marche n’est pas dit à l’écran');
  assert.ok(vitesse.kmh > 0, `la vitesse s’affiche négative : ${vitesse.kmh}`);
  assert.equal(String(vitesse.chiffres).includes('-'), false, `les chiffres portent un signe : ${vitesse.chiffres}`);
});

// 18
test('la vitesse se dit en chiffres et en mots', () => {
  // Avant la bosse, l’élève doit savoir d’un coup d’œil s’il a de l’élan : les
  // chiffres pour mesurer, les mots pour les enfants qui ne lisent pas encore
  // une jauge.
  const monde = plaine();
  const engin = demarrer(machineVapeur(), monde);
  const vitesse = R.etatDuJeu(engin, monde).vitesse;
  const attendue = engin.vitesse() * 3.6;
  assert.ok(attendue > 3, `la machine ne roule pas assez pour juger (${attendue.toFixed(1)} km/h)`);

  const lis = Number(String(vitesse.chiffres).replace(',', '.').replace(' km/h', ''));
  assert.ok(Number.isFinite(lis), `les chiffres de la vitesse ne se lisent pas : ${vitesse.chiffres}`);
  assert.ok(Math.abs(lis - attendue) < 0.15, `les chiffres ne disent pas la vitesse : ${vitesse.chiffres} pour ${attendue.toFixed(1)} km/h`);
  assert.equal(typeof vitesse.mots, 'string', 'la vitesse ne se dit pas en mots');
  assert.equal(/[0-9]/.test(vitesse.mots), false, 'les mots de la vitesse récitent des chiffres');
  assert.ok(vitesse.mots.length <= 16, `le mot de la vitesse est trop long pour l'écran : ${vitesse.mots}`);

  const froide = R.etatDuJeu(machineVapeur({ feu: 0 }), monde).vitesse;
  assert.equal(froide.kmh, 0, "une machine immobile n'a pas une vitesse de 0");
  assert.notEqual(froide.mots, vitesse.mots, 'immobile et lancée portent le même mot');
});

// 17
test('un coup de barre ne freine jamais la machine', () => {
  // Le geste est `engin.pousser()` et les règles n'ont plus de valeur à rendre
  // pour le défendre : il ne reste qu'à lire l'élan de la machine. Jamais la barre
  // ne le diminue — et là où deux bras suivent encore la manivelle, elle l'accroît.
  const lancée = demarrer(machineVapeur(), plaine());
  const avant = R.etatDuJeu(lancée, plaine()).machine.elan;
  assert.ok(avant > 2, `la machine n'était pas lancée (${avant})`);
  lancée.pousser();
  const apres = R.etatDuJeu(lancée, plaine()).machine.elan;
  assert.ok(apres >= avant, `la barre a freiné la machine : ${avant} puis ${apres} d'élan`);

  lancée.machine.vitesseAngulaire = 1;
  lancée.pousser();
  const rattrapee = R.etatDuJeu(lancée, plaine()).machine.elan;
  assert.ok(rattrapee > 1.39, `la barre n'a rien ajouté à la machine qui traîne : ${rattrapee} d'élan`);

  const recul = demarrer(machineVapeur(), plaine());
  recul.machine.marche = 'arriere';
  rouler(recul, plaine(), { duree: 60 });
  const avantRecul = R.etatDuJeu(recul, plaine()).machine.elan;
  assert.ok(avantRecul > 2, `la machine ne reculait pas (${avantRecul})`);
  recul.pousser();
  const apresRecul = R.etatDuJeu(recul, plaine()).machine.elan;
  assert.ok(apresRecul >= avantRecul, `la barre a freiné la marche arrière : ${avantRecul} puis ${apresRecul}`);
  recul.machine.vitesseAngulaire = -1;
  recul.pousser();
  assert.ok(R.etatDuJeu(recul, plaine()).machine.elan > 1.39, "la barre n'a rien ajouté au recul");
});

test("chaque état de l'engin a son mot à l'écran", () => {
  // Sept états, sept mots différents : l'élève ne doit pas dépendre d'une couleur
  // pour savoir ce que fait la machine. C'est la promesse qui remplace les tests
  // de rendu (spec, Testing Decisions).
  const etats = [
    ['arret', enginARret],
    ['cale', enginCalant],
    ['roule', enginRoulant],
    ['souffle', enginSoufflant],
    ['patine', enginPatinent],
    ['sec', enginASec],
    ['danger', enginEnDanger],
  ];
  const mots = new Set();
  for (const [attendue, fabrique] of etats) {
    const { engin, monde } = fabrique();
    assert.equal(R.situation(engin, monde), attendue, `état « ${attendue} » non obtenu`);
    const etat = R.etatDuJeu(engin, monde);
    assert.equal(etat.situation, attendue, `l'état du jeu ne rend pas la situation « ${attendue} »`);
    assert.equal(typeof etat.mot, 'string', `aucun mot pour l'état « ${attendue} »`);
    assert.ok(etat.mot.trim().length > 0, `mot vide pour l'état « ${attendue} »`);
    assert.ok(etat.mot.length <= 24, `le mot de « ${attendue} » déborde de l'écran : ${etat.mot}`);
    mots.add(etat.mot);
  }
  assert.equal(mots.size, etats.length, "deux états de l'engin portent le même mot à l'écran");
});

// Les sept états nommés, réunis pour les promesses qui doivent tous les regarder.
const FABRIQUES = {
  danger: enginEnDanger,
  sec: enginASec,
  cale: enginCalant,
  patine: enginPatinent,
  souffle: enginSoufflant,
  roule: enginRoulant,
  arret: enginARret,
};

// Le modèle sous écoute : on compte les pas qu'il reçoit, sans rien lui changer.
function modeleAuxPasComptes() {
  const modele = chargerModele();
  const recus = [];
  const espion = {
    ...modele,
    simuler(engin, monde, options) {
      recus.push(options.duree);
      return modele.simuler(engin, monde, options);
    },
  };
  return { recus, regles: chargerRegles(espion) };
}

// Les noms que l'écran affiche, image après image : à 20 images la seconde, comme
// la boucle du jeu.
function situationsVues(engin, monde, { pendant }) {
  const vues = [];
  let t = 0;
  while (t < pendant) {
    M.simuler(engin, monde, PAS_IMAGE);
    t += PAS_IMAGE;
    vues.push(R.situation(engin, monde));
  }
  return vues;
}

const PAS_IMAGE = 1 / 20;

// 23
test('le régulateur dose la vapeur admise sans rien changer à l’avance de l’excentrique', () => {
  const monde = plaine();
  const ouverte = demarrer(machineVapeur(), monde);
  const serree = demarrer(machineVapeur(), monde);
  serree.commandes.regulateur = R.commandeDuCurseur(40);
  rouler(serree, monde, { duree: 40 });
  rouler(ouverte, monde, { duree: 40 });

  // Ce que le régulateur règle : la vapeur. La chaudière garde sa pression quand
  // le passage se referme, et la machine pousse moins.
  assert.ok(
    R.etatDuJeu(serree, monde).jauge.pression > R.etatDuJeu(ouverte, monde).jauge.pression + 1,
    'serrer le régulateur ne change rien à la vapeur'
  );
  assert.ok(serree.distance < ouverte.distance - 5, 'serrer le régulateur ne ralentit pas la machine');

  // Ce qu'il ne règle pas : la distribution. L'avance sur l'excentrique est celle
  // du modèle, ouverte ou serrée, et l'excentrique la garde pour lui.
  assert.equal(ouverte.avanceEffective(), M.AVANCE_NOMINALE);
  assert.equal(serree.avanceEffective(), M.AVANCE_NOMINALE);
  assert.equal(serree.machine.avance, ouverte.machine.avance, 'le régulateur a décalé l’excentrique');
  assert.equal(serree.machine.recouvrement, ouverte.machine.recouvrement, 'le régulateur a changé le recouvrement');
  assert.equal(
    R.etatDuJeu(serree, monde).machine.avance,
    R.etatDuJeu(ouverte, monde).machine.avance,
    'le dessin voit une avance différente'
  );
});

// 23
test('le curseur du régulateur rend la commande du modèle, fermé compris', () => {
  // Plus de fond à deux pour cent sous le doigt du joueur : le modèle sait rendre
  // la vapeur fermée, donc le curseur peut descendre jusqu'à zéro (ADR 0009).
  assert.equal(R.commandeDuCurseur(100), 1, 'curseur au max : la vapeur devrait être grande ouverte');
  assert.equal(R.commandeDuCurseur(37), 0.37, 'la position du curseur ne passe pas telle quelle');
  assert.equal(R.commandeDuCurseur(140), 1, 'le curseur ouvre plus que tout');
  assert.equal(R.commandeDuCurseur(0), 0, 'le curseur ne sait plus fermer la vapeur');
  assert.equal(R.commandeDuCurseur(-20), 0, 'le curseur ferme plus que tout');
  assert.equal(R.commandeDuCurseur(''), 0, 'un curseur qui ne dit rien devrait fermer');
  assert.equal(R.commandeDuCurseur(80), 0.8, 'la barre du feu ne convertit pas comme le régulateur');

  // Et le mot que l'écran montre : un pourcentage tant qu'il reste de la vapeur à
  // doser, le mot « fermé » quand il n'en reste plus. Le nombre seul mentirait.
  assert.equal(R.motDuRegulateur(1), '100 %', 'grande ouverte, l’écran ne le dit pas');
  assert.equal(R.motDuRegulateur(0.37), '37 %', 'serrée aux deux tiers, l’écran ne le dit pas');
  assert.equal(R.motDuRegulateur(0), 'fermé', 'fermée, l’écran affiche encore un pourcentage');
  assert.equal(/[0-9]/.test(R.motDuRegulateur(0)), false, 'le mot du régulateur fermé récite un chiffre');
});

// Scène tenue à la main, côté règles : régulateur fermé à chaud.
test('fermé à chaud, le régulateur prend la machine — et l’écran le dit', () => {
  const monde = plaine();
  const engin = demarrer(machineVapeur(), monde);
  assert.equal(R.situation(engin, monde), 'roule', 'la machine ne roulait pas avant le geste');

  engin.commandes.regulateur = R.commandeDuCurseur(0);   // le chauffeur ferme à fond

  // La machine a son élan : elle roule encore un moment, se fait prendre, casse
  // une fois, puis reste prise. On regarde après qu'elle s'est rangée.
  rouler(engin, monde, { duree: 10 });
  const vues = situationsVues(engin, monde, { pendant: 20 });
  const distanceEnPrise = engin.distance;
  assert.ok(
    vues.every((s) => s === 'cale'),
    `la machine fermée à chaud n'est pas tenue prise : ${vues.filter((s) => s !== 'cale').join(', ')}`
  );

  const etat = R.etatDuJeu(engin, monde);
  assert.equal(etat.commandes.mot, 'fermé', 'la vapeur est fermée, l’écran affiche un pourcentage');
  assert.equal(etat.commandes.regulateur, 0, 'l’état du jeu ne rend pas la commande fermée');
  assert.equal(etat.mot, R.MOTS_DE_SITUATION.cale, 'le mot de la machine prise n’est pas celui de l’état');
  assert.equal(etat.forme, R.FORMES_DE_SITUATION.cale, 'la machine prise ne change pas de forme');
  assert.equal(etat.jauge.souffle, true, 'la vapeur ne s’en va plus par la soupape');
  assert.equal(etat.vitesse.kmh, 0, 'la machine prise roule encore à l’écran');
  assert.ok(
    etat.comptes.distance - distanceEnPrise < 0.5,
    `la machine a marché pendant qu'on la tenait : ${(etat.comptes.distance - distanceEnPrise).toFixed(2)} m`
  );
});

// Scène tenue à la main, côté règles : feu monté sans soutirage.
test('feu monté sans soutirage, la soupape siffle à la jauge', () => {
  const monde = plaine();
  const engin = machineVapeur({ feu: 1 });   // feu d'enfer, personne ne tire de vapeur
  let t = 0;
  let sifflet = null;
  while (t < 200 && sifflet === null) {
    M.simuler(engin, monde, PAS_IMAGE);
    t += PAS_IMAGE;
    const jauge = R.etatDuJeu(engin, monde).jauge;
    if (jauge.souffle) sifflet = { ...jauge };
  }
  assert.ok(sifflet, 'la soupape n’a jamais soufflé, même après deux cents secondes de feu');
  assert.ok(sifflet.pression >= sifflet.soupape - 1e-9, 'la soupape siffle avant la zone marquée à la jauge');
  assert.equal(R.etatDuJeu(engin, monde).jauge.souffle, true, 'l’écran ne dit plus le sifflement');
});

// 29
test('la vitesse de temps ajoute des pas par image, jamais un pas plus grand', () => {
  const { recus, regles } = modeleAuxPasComptes();
  const monde = plaine();
  const engin = machineVapeur();

  regles.passerLImage(engin, monde, { duree: PAS_IMAGE, vitesse: 1 });
  assert.deepEqual(recus, [PAS_IMAGE], '×1 ne donne pas un pas au modèle');

  recus.length = 0;
  for (let image = 0; image < 5; image += 1) regles.passerLImage(engin, monde, { duree: PAS_IMAGE, vitesse: 4 });
  assert.deepEqual(recus, new Array(20).fill(PAS_IMAGE), '×4 ne donne pas quatre pas de la même taille');
  assert.equal(recus.some((d) => d !== PAS_IMAGE), false, '×4 allonge le pas que reçoit le modèle');

  // Un palier que le jeu n'a pas : ×1, et rien d'autre.
  recus.length = 0;
  regles.passerLImage(engin, monde, { duree: PAS_IMAGE, vitesse: 3 });
  assert.equal(recus.length, 1, `le palier 3 fait ${recus.length} pas`);
  regles.passerLImage(engin, monde, { duree: PAS_IMAGE });
  assert.equal(recus.length, 2, 'sans palier dit, l’image devrait passer à ×1');
  assert.deepEqual(R.VITESSES_DU_TEMPS, [1, 2, 4], 'les paliers du temps ne sont pas ×1, ×2, ×4');

  // Quatre images à ×4, seize images à ×1 : même heure de machine, même état.
  const lente = machineVapeur();
  const rapide = machineVapeur();
  for (let image = 0; image < 16; image += 1) regles.passerLImage(lente, monde, { duree: PAS_IMAGE, vitesse: 1 });
  for (let image = 0; image < 4; image += 1) regles.passerLImage(rapide, monde, { duree: PAS_IMAGE, vitesse: 4 });
  assert.deepEqual(
    JSON.parse(JSON.stringify(regles.etatDuJeu(rapide, monde))),
    JSON.parse(JSON.stringify(regles.etatDuJeu(lente, monde))),
    '×4 ne rend pas la même machine que ×1 sur la même durée'
  );
});

// 29
test('la vitesse de temps ne déplace pas l’heure où la soupape se met à siffler', () => {
  function heureDuSifflet(vitesse) {
    const monde = plaine();
    const engin = machineVapeur({ feu: 1 });
    let t = 0;
    while (t < 200) {
      R.passerLImage(engin, monde, { duree: PAS_IMAGE, vitesse });
      t += PAS_IMAGE;
      if (engin.chaudiere.soupapeSiffle) return engin.tempsEcoule;
    }
    return null;
  }
  const lente = heureDuSifflet(1);
  const rapide = heureDuSifflet(4);
  assert.ok(lente !== null && rapide !== null, 'la soupape n’a pas sifflé pendant la chauffe');
  // À ×4 on échantillonne une fois par 0,2 s de machine : c'est tout ce que le
  // palier a le droit de sauter.
  assert.ok(Math.abs(lente - rapide) < 0.25, `×4 déplace la montée en pression : ${lente} contre ${rapide}`);
});

// 17
test('la distance parcourue et les tours faits se comptent entre deux essais', () => {
  const monde = plaine();
  const froide = R.etatDuJeu(machineVapeur({ feu: 0 }), monde).comptes;
  assert.equal(froide.distance, 0, 'une machine froide a déjà parcouru quelque chose');
  assert.equal(froide.tours, 0, 'une machine froide a déjà fait des tours');

  const engin = demarrer(machineVapeur(), monde);
  const etat = R.etatDuJeu(engin, monde);
  assert.equal(etat.comptes.distance, engin.distance, 'la distance affichée n’est pas celle de la machine');
  assert.equal(etat.comptes.tours, engin.machine.tours, 'les tours affichés ne sont pas ceux de la machine');
  assert.ok(etat.comptes.distance > 20, `la machine n'a pas assez roulé pour compter (${etat.comptes.distance.toFixed(1)} m)`);
  assert.ok(etat.comptes.tours > 10, `pas assez de tours (${etat.comptes.tours.toFixed(1)})`);
  assert.ok(etat.comptes.secondes > 80, 'le temps de l’essai n’est pas compté');

  // Les roues comptent, la distance suit : des tours ne sont pas du chemin, mais
  // ici les deux montent ensemble.
  rouler(engin, monde, { duree: 20 });
  const apres = R.etatDuJeu(engin, monde).comptes;
  assert.ok(apres.distance > etat.comptes.distance, 'la distance ne monte plus quand la machine roule');
  assert.ok(apres.tours > etat.comptes.tours, 'les tours ne montent plus quand la machine roule');
});

// 15
test('la soute et la citerne disent ce qui reste, en chiffres et en mots', () => {
  const monde = plaine();
  const engin = machineVapeur();
  engin.soute = engin.capacite('soute');
  engin.citerne = engin.capacite('citerne');

  const pleins = R.etatDuJeu(engin, monde).reservoirs;
  engin.soute = engin.capacite('soute') * 0.5;   // une soute à demi faite, comme au départ d'une journée
  assert.equal(pleins.soute.capacite, engin.capacite('soute'), 'la jauge de charbon invente sa capacité');
  assert.equal(pleins.citerne.capacite, engin.capacite('citerne'), 'la jauge d’eau invente sa capacité');
  assert.equal(pleins.soute.plein, 1, 'une soute pleine ne se dit pas pleine');
  assert.equal(pleins.soute.mot, 'pleine');

  rouler(engin, monde, { duree: 60 });
  const brules = R.etatDuJeu(engin, monde).reservoirs;
  assert.ok(brules.soute.niveau < pleins.soute.niveau, 'le feu ne brûle rien dans la soute');
  assert.ok(brules.citerne.niveau < pleins.citerne.niveau, 'la machine ne vaporise rien de la citerne');
  for (const nom of ['soute', 'citerne']) {
    const reservoir = brules[nom];
    assert.ok(reservoir.plein >= 0 && reservoir.plein <= 1, `${nom} sort de sa jauge : ${reservoir.plein}`);
    assert.ok(reservoir.plein < 1, `${nom} ne descend pas sous les yeux`);
    assert.equal(typeof reservoir.mot, 'string', `${nom} n'a pas de mot`);
    assert.equal(/[0-9]/.test(reservoir.mot), false, `le mot de ${nom} récite des chiffres`);
    assert.ok(reservoir.mot.length <= 16, `le mot de ${nom} déborde de l'écran : ${reservoir.mot}`);
  }
  assert.notEqual(brules.soute.mot, pleins.soute.mot, 'la soute brûlée porte le mot de la soute pleine');

  // Une machine sans soute n'a pas de charbon à jauger : l'écran dit vide, et ne
  // divise pas par zéro au passage.
  const sansSoute = R.etatDuJeu(M.nouvelEngin(MACHINE.filter((id) => id !== 'soute')), monde).reservoirs.soute;
  assert.equal(sansSoute.capacite, 0);
  assert.equal(sansSoute.plein, 0);
  assert.equal(sansSoute.mot, 'vide');

  // Le mot suit la pente : pleine, à moitié, basse, vide.
  const words = [];
  for (const niveau of [300, 150, 90, 20, 0]) {
    const e = machineVapeur();
    e.soute = niveau;
    words.push(R.etatDuJeu(e, monde).reservoirs.soute.mot);
  }
  assert.deepEqual(
    words,
    ['pleine', 'à moitié', 'basse', 'presque vide', 'vide'],
    `les mots du niveau ne suivent pas la jauge : ${words.join(', ')}`
  );
});

// 18 et 19
test('le rendement attend le premier charbon brûlé avant de se montrer', () => {
  const monde = plaine();
  const froide = R.etatDuJeu(machineVapeur({ feu: 0 }), monde).rendement;
  assert.equal(froide.valeur, null, 'le rendement s’affiche avant le charbon');
  assert.equal(froide.chiffres, null, 'le rendement affiche des chiffres avant le charbon');
  assert.equal(froide.mot, R.RENDEMENT_EN_ATTENTE, 'rien ne dit à l’écran pourquoi le rendement se tait');
  assert.equal(/NaN|Infinity|infini|null/.test(R.RENDEMENT_EN_ATTENTE), false, 'le mot d’attente imite un chiffre');
});

// 18
test('le rendement se dit dès qu’il y a du charbon brûlé, et jamais faux', () => {
  const monde = plaine();

  // Chaude et immobile : elle a brûlé pour rien. Le modèle dit zéro, l'écran le
  // montre — ce n'est pas le zéro mensonger du charbon dormant.
  const immobile = machineVapeur();
  rouler(immobile, monde, { duree: 30 });
  const premier = R.etatDuJeu(immobile, monde).rendement;
  assert.ok(immobile.charbonBrule > 0.01, 'la chaudière n’a rien brûlé pendant la chauffe');
  assert.equal(premier.valeur, 0, 'brûler sans avancer ne rend pas zéro');
  assert.equal(typeof premier.chiffres, 'string', 'le rendement ne se dit pas en chiffres');
  assert.equal(/[0-9]/.test(premier.chiffres), true, 'les chiffres du rendement n’ont pas de nombre');

  // Lancée : le score du jeu, en mètres par kilogramme, rendu par le bilan du modèle.
  const lancee = demarrer(machineVapeur(), monde);
  const score = R.etatDuJeu(lancee, monde).rendement;
  assert.equal(score.valeur, lancee.bilan().rendement, 'le score n’est pas celui du modèle');
  assert.ok(score.valeur > 0, `la machine lancée ne rapporte rien (${score.valeur})`);
  assert.equal(/NaN|Infinity|infini/.test(String(score.chiffres)), false, `le rendement affiche un chiffre fou : ${score.chiffres}`);
  assert.equal(score.chiffres.includes('kg'), true, 'le rendement ne dit pas ce qu’il coûte');
  assert.equal(score.mot, R.MOT_DU_RENDEMENT);
});

// 21
test('chaque état de l’engin a sa forme, et pas une couleur', () => {
  const noms = Object.keys(FABRIQUES);
  assert.deepEqual(
    Object.keys(R.FORMES_DE_SITUATION).sort(),
    [...noms].sort(),
    'la table des formes ne couvre pas la table des états'
  );
  const formes = new Set();
  for (const nom of noms) {
    const forme = R.FORMES_DE_SITUATION[nom];
    assert.equal(typeof forme, 'string', `aucune forme pour l’état « ${nom} »`);
    assert.ok(forme.trim().length > 0, `forme vide pour « ${nom} »`);
    assert.equal(/[0-9]/.test(forme), false, `la forme de « ${nom} » est un numéro : ${forme}`);
    formes.add(forme);
    const { engin, monde } = FABRIQUES[nom]();
    assert.equal(R.etatDuJeu(engin, monde).forme, forme, `l'écran ne reçoit pas la forme de « ${nom} »`);
  }
  assert.equal(formes.size, noms.length, 'deux états de l’engin portent la même forme');
});

test('la table des situations est entière, et le plus grave donne le nom', () => {
  const attendus = ['danger', 'sec', 'cale', 'patine', 'souffle', 'roule', 'arret'];
  for (const nom of attendus) {
    assert.equal(typeof R.MOTS_DE_SITUATION[nom], 'string', `aucun mot pour « ${nom} »`);
  }
  assert.equal(Object.keys(R.MOTS_DE_SITUATION).length, attendus.length, 'la table des mots a un état de trop');

  // Deux conditions à la fois : c'est le plus grave qui parle.
  const monde = plaine();

  // Sans soupape et prise à son point mort : la tôle travaille, c'est elle qui commande.
  const sansSoupape = M.nouvelEngin(MACHINE.filter((id) => id !== 'soupape'));
  sansSoupape.soute = 4000;
  sansSoupape.citerne = 4000;
  sansSoupape.commandes.feu = 1;
  sansSoupape.commandes.regulateur = R.commandeDuCurseur(0);
  rouler(sansSoupape, monde, { duree: 90 });
  assert.equal(sansSoupape.machine.cale, true, 'cet engin ne serait pas calé : la superposition est ratée');
  assert.equal(sansSoupape.chaudiere.danger, true, 'cet engin ne mettrait pas la tôle en danger');
  assert.equal(R.situation(sansSoupape, monde), 'danger', 'la tôle qui travaille s’efface devant le point mort');

  // À sec et calée : l'eau manque avant le point mort.
  const aSec = machineVapeur();
  rouler(aSec, monde, { duree: 60 });
  aSec.chaudiere.niveauEau = 0;
  aSec.citerne = 0;
  rouler(aSec, monde, { duree: 3 });
  assert.equal(aSec.machine.cale, true, 'cet engin ne serait pas calé : la superposition est ratée');
  assert.equal(R.situation(aSec, monde), 'sec', 'une chaudière à sec parle après le point mort');

  // Patine et soupape ouverte : la roue qui glisse passe avant le sifflement.
  // Le réglage est monté de 0,5 à 0,66 : à 0,5 la rampe tenait la machine au
  // point mort par une force qui n'existait pas — l'injecteur, soustrait sans
  // égard au sens, poussait en arrière (cf. ADR 0009). À 0,66 elle grimpe, elle
  // glisse, elle siffle, et elle n'est pas calée : les deux conditions vraies.
  const rampe = M.nouveauMonde({ pente: 0.3 });
  const patineur = machineVapeur({ regulateur: 0.66 });
  rouler(patineur, rampe, { duree: CHAUFFE });
  patineur.pousser(4);
  rouler(patineur, rampe, { duree: 60 });
  assert.equal(patineur.machine.patine, true, 'cet engin ne patinerait pas : la superposition est ratée');
  assert.equal(patineur.chaudiere.soupapeSiffle, true, 'cet engin ne sifflerait pas : la superposition est ratée');
  assert.equal(R.situation(patineur, rampe), 'patine', 'le sifflement efface la roue qui patine');

  // Souffle et roues qui tournent : le sifflement passe avant le simple roulage.
  const souffleur = enginSoufflant();
  assert.equal(souffleur.engin.mouvement(), true, 'cet engin ne roulerait pas : la superposition est ratée');
  assert.equal(souffleur.engin.chaudiere.soupapeSiffle, true, 'cet engin ne sifflerait pas');
  assert.equal(R.situation(souffleur.engin, souffleur.monde), 'souffle');
});

test('deux regards sur le même engin disent la même chose', () => {
  // `situation` est sans mémoire (spec, décision 4) : ni compteur, ni moyenne, ni
  // souvenir de l'image précédente. Et `etatDuJeu` lit, il ne touche à rien.
  for (const [nom, fabrique] of Object.entries(FABRIQUES)) {
    const { engin, monde } = fabrique();
    const avant = JSON.stringify(engin);
    const premier = JSON.stringify(R.etatDuJeu(engin, monde));
    const second = JSON.stringify(R.etatDuJeu(engin, monde));
    assert.equal(second, premier, `« ${nom} » ne répond pas pareil deux fois de suite`);
    assert.equal(R.situation(engin, monde), R.situation(engin, monde), `« ${nom} » change d’avis sans raison`);
    assert.equal(JSON.stringify(engin), avant, `l’état du jeu a retouché l’engin « ${nom} »`);
  }
});

// Promesse de complétude du ticket.
test('pour chaque situation nommée, l’écran ne demande que ce l’état du jeu rend', () => {
  const source = sourceProjection();
  assert.ok(source.length > 500, 'la projection est introuvable : le harnais ne sait plus la lire');
  const chemins = new Set(
    [...source.matchAll(/\betat((?:\.[A-Za-z_$][\w$]*)+)/g)].map((m) => m[1].slice(1))
  );
  assert.ok(chemins.size > 12, `la projection ne semble rien demander à l'état du jeu : ${chemins.size} chemins`);

  for (const [nom, fabrique] of Object.entries(FABRIQUES)) {
    const { engin, monde } = fabrique();
    const etat = R.etatDuJeu(engin, monde);
    for (const chemin of chemins) {
      let valeur = etat;
      for (const cle of chemin.split('.')) {
        assert.notEqual(
          valeur === undefined || valeur === null ? undefined : valeur[cle],
          undefined,
          `« ${nom} » : la projection lit etat.${chemin}, que l'état du jeu ne rend pas`
        );
        valeur = valeur[cle];
      }
      if (typeof valeur === 'number') {
        assert.ok(Number.isFinite(valeur), `« ${nom} » : etat.${chemin} vaut ${valeur}, l'écran n'a rien à dessiner`);
      }
    }

    // Et ce que l'écran affiche pour elle : un mot, une forme, des niveaux bornés,
    // un rendement refusé ou fini.
    assert.ok(etat.mot.trim().length > 0, `« ${nom} » n'a pas de mot`);
    assert.ok(etat.forme.trim().length > 0, `« ${nom} » n'a pas de forme`);
    for (const niveau of Object.values(etat.reservoirs)) {
      assert.ok(niveau.plein >= 0 && niveau.plein <= 1, `« ${nom} » : un réservoir sort de sa jauge`);
    }
    assert.ok(
      etat.rendement.valeur === null || Number.isFinite(etat.rendement.valeur),
      `« ${nom} » : le rendement s'affiche sans être un nombre mesurable`
    );
    assert.ok(
      (etat.rendement.valeur === null) === (etat.rendement.chiffres === null),
      `« ${nom} » : le rendement se refuse à moitié`
    );
  }

  const mots = new Set(Object.keys(FABRIQUES).map((nom) => R.etatDuJeu(...Object.values(FABRIQUES[nom]()).slice(0, 2)).mot));
  assert.equal(mots.size, Object.keys(FABRIQUES).length, 'deux situations nommées portent le même mot à l’écran');
});

test('la mémoire du jeu s’ouvre vide', () => {
  const memo = R.nouvelleMemo();
  assert.deepEqual(memo, { refroidissements: {}, deblocages: [], meilleurRendement: null });
  assert.equal(Object.keys(memo.refroidissements).length, 0, 'la mémoire porte déjà des refroidissements');
  assert.equal(memo.deblocages.length, 0, 'la mémoire débloque déjà des pièces');
  assert.equal(memo.meilleurRendement, null, 'la mémoire connaît déjà un score');
  assert.notEqual(R.nouvelleMemo(), memo, 'deux parties partageraient la même mémoire');
});

// --- Ticket 6 · une ligne, des bosses, de l'élan ----------------------------

// La ligne se joue d'une graine, jamais d'un service : deux montages sur la même
// graine courent sur la même bosse, et la même graine rend la même ligne image
// après image.
test('une graine rend toujours la même ligne', () => {
  const ligne = R.ligneDeLaGraine(7);
  assert.deepEqual(R.ligneDeLaGraine(7), ligne, 'la même graine ne rend pas la même ligne deux fois de suite');
  assert.notDeepEqual(R.ligneDeLaGraine(8), ligne, 'deux graines différentes donneraient la même bosse à gravir');
  assert.equal(ligne.graine, 7);

  // Une graine qui n'est pas un nombre retombe sur celle du fichier, et le dit.
  assert.equal(R.ligneDeLaGraine('ratée').graine, R.GRAINE_DU_JEU);
  assert.equal(R.ligneDeLaGraine(Number.NaN).graine, R.GRAINE_DU_JEU);
  assert.equal(R.ligneDeLaGraine().graine, R.GRAINE_DU_JEU);
  assert.equal(R.ligneDeLaGraine(-3).graine, R.GRAINE_DU_JEU);
});

// Le monde ne sert à rien s'il faut lui adjoindre un dictionnaire : il ne porte
// que les six champs que la physique lit déjà, et rien qui ressemble à une
// constante de plus.
test('le monde de la ligne ne porte que ce que la physique lit', () => {
  const monde = R.mondeDeLaGraine(7);
  assert.deepEqual(
    Object.keys(monde).sort(),
    ['bosses', 'charbonnage', 'circuit', 'pente', 'riviere', 'vent'],
    'le trajet a glissé un champ que penteReelle n’a pas à additionner'
  );
  for (const bosse of monde.bosses) {
    assert.deepEqual(Object.keys(bosse).sort(), ['a', 'longueur', 'pente'], 'une rampe porte plus que sa place et sa pente');
    assert.ok(Number.isFinite(bosse.a) && Number.isFinite(bosse.longueur) && Number.isFinite(bosse.pente));
  }
});

// Une rivière déclarée partout remplirait la citerne à cent mètres de l'eau. Le
// monde dit où elle est ; le monde sous les roues ne la rend vraie qu'à cet
// endroit-là, et rend à la physique les types qu’elle lit : un booléen, un nombre.
test('la rivière n’est de l’eau que là où elle est', () => {
  const monde = R.mondeDeLaGraine(11);
  const aLaSource = mondeSousLesRouesA(monde, monde.riviere.a + monde.riviere.longueur / 2);
  assert.equal(aLaSource.riviere, true, 'pas d’eau à la rivière');
  assert.equal(mondeSousLesRouesA(monde, monde.riviere.a - 4).riviere, false, 'de l’eau avant la rivière');
  assert.equal(mondeSousLesRouesA(monde, monde.riviere.a + monde.riviere.longueur + 4).riviere, false, 'de l’eau après la rivière');

  // Le vent : une force dans la vallée, zéro ailleurs — et un nombre, sinon la
  // voile de la partie 8 multiplierait par un objet.
  assert.equal(typeof aLaSource.vent, 'number');
  assert.equal(aLaSource.vent, 0, 'il y a du vent hors de la vallée');
  const dansLaVallee = mondeSousLesRouesA(monde, monde.vent.a + monde.vent.longueur / 2);
  assert.equal(dansLaVallee.vent, monde.vent.force);
  assert.equal(typeof mondeSousLesRouesA(monde, 0).charbonnage, 'boolean');
  assert.equal(mondeSousLesRouesA(monde, monde.charbonnage.a + 1).charbonnage, true);

  // Et le relief passe tel quel : ce sont les mêmes rampes, additionnées pareil.
  assert.deepEqual(aLaSource.bosses, monde.bosses);
});

function mondeSousLesRouesA(monde, distance) {
  const engin = M.nouvelEngin(R.PIECES_DE_BASE);
  engin.distance = distance;
  return R.mondeSousLesRoues(engin, monde);
}

// Le scénario de la partie 2, ordre compris : « une ligne qui part à plat, se
// cabre sur des bosses, passe une rivière, s'arrête à un charbonnage et traverse
// une vallée ventée ». Une table par graine, mais le scénario est le même.
test('la ligne part à plat, se cabre, passe une rivière, s’arrête à un charbonnage, traverse une vallée ventée', () => {
  for (const graine of [1, 7, 11, 42, 1882, 99999]) {
    const ligne = R.ligneDeLaGraine(graine);
    const ou = (chose) => `${chose} (graine ${graine})`;

    assert.equal(ligne.pente, 0, ou('le fond n’est pas plat'));
    const premiereRampe = Math.min(...ligne.bosses.map((b) => b.a));
    assert.ok(premiereRampe >= 24, ou(`la première rampe arrive à ${premiereRampe} m : pas le temps de prendre de l'élan`));

    const douces = ligne.bosses.filter((b) => b.pente >= 0.1 && b.pente < 0.2);
    const raides = ligne.bosses.filter((b) => b.pente >= 0.24);
    assert.ok(douces.length >= 1, ou('pas de bosse à gravir lancée'));
    assert.ok(raides.length >= 1, ou('pas de rampe où patiner'));

    assert.ok(douces[0].a < ligne.riviere.a, ou('la rivière est avant les bosses'));
    assert.ok(ligne.charbonnage.a > ligne.riviere.a + ligne.riviere.longueur, ou('le charbonnage est dans la rivière'));
    assert.ok(ligne.vent.a > ligne.charbonnage.a + ligne.charbonnage.longueur, ou('la vallée ventée est avant le charbonnage'));
    assert.ok(ligne.vent.force > 0, ou('la vallée ventée n’a pas de vent'));
    // La rampe qui la refuse ferme la ligne : elle est dernière, et le trajet
    // s'arrête à son sommet. Une machine qui la tient ne peut pas aller plus loin.
    assert.equal(raides.length, 1, ou('plus d’une rampe à refuser la machine'));
    assert.ok(raides[0].a > ligne.vent.a + ligne.vent.longueur, ou('la rampe du bout n’est pas au bout de la ligne'));
    assert.equal(ligne.longueur, raides[0].a + raides[0].longueur, ou('la ligne ne s’arrête pas au sommet de la rampe'));

    // Le fond de la rivière est plat : c'est là que l'eau dort et que l'engin passe.
    // On lit le profil avec l'échantillonneur du jeu, pas avec une copie locale.
    const sol = R.etatDuJeu(M.nouvelEngin(R.PIECES_DE_BASE), R.mondeDeLaLigne(ligne)).sol;
    assert.equal(sol.penteEn(ligne.riviere.a + ligne.riviere.longueur / 2), 0, ou('la rivière est sur une pente'));
    assert.equal(sol.longueur, ligne.longueur, ou("l'état du jeu ne rend pas la fin de la ligne"));
  }
});

// Le joueur doit savoir d'avance ce qui l'attend : la rampe, sa pente, ce qui
// reste à parcourir avant d'y entrer. Et le relief dessiné est celui du monde,
// pente par pente — pas un décor qui sourit pendant que la machine souffre.
test('la rampe d’en face est annoncée avec sa pente, avant d’y être', () => {
  const ligne = R.ligneDeLaGraine(7);
  const monde = R.mondeDeLaLigne(ligne);
  const sol = (distance) => {
    const engin = M.nouvelEngin(R.PIECES_DE_BASE);
    engin.distance = distance;
    return R.etatDuJeu(engin, monde).sol;
  };
  const montantes = ligne.bosses.filter((b) => b.pente >= R.SEUIL_DE_RAMPE).sort((une, autre) => une.a - autre.a);
  assert.ok(montantes.length >= 2, 'deux rampes à annoncer au moins, pour cet écran');

  const premiere = montantes[0];
  const avant = sol(premiere.a - 25);
  assert.equal(avant.prochaine.a, premiere.a, "l'annonce ne parle pas de la rampe qui vient");
  assert.equal(avant.prochaine.pente, premiere.pente, "l'annonce ne dit pas la pente de la rampe");
  assert.equal(avant.prochaine.dans, 25, "l'annonce ne dit pas ce qui reste avant la rampe");
  assert.equal(avant.prochaine.sens, 'devant');
  assert.equal(avant.prochaine.longueur, premiere.longueur);

  // Dedans, l'annonce tient bon — c'est toujours cette rampe-là, et elle est
  // dedans. Sortie, c'est la suivante qui prend la place.
  assert.equal(sol(premiere.a + 1).prochaine.sens, 'dedans');
  const suivante = montantes[1];
  assert.equal(sol(premiere.a + premiere.longueur + 1).prochaine.a, suivante.a);

  // Une descente n'est pas une rampe : elle n'est pas annoncée comme telle.
  const rouge = sol(ligne.bosses.find((b) => b.pente < 0).a + 1);
  assert.ok(rouge.prochaine.pente > 0, 'une redente annoncée comme une rampe');

  // Au bout de la ligne, il n'y a plus rien à annoncer.
  assert.equal(sol(ligne.longueur + 10).prochaine, null);

  // Et le dessin suit le monde : la pente du profil au pied de la rampe est nulle,
  // celle du haut de la rampe est la pente annoncée.
  assert.equal(sol(premiere.a - 1).penteEn(premiere.a - 0.5), 0);
  assert.equal(Math.round(sol(premiere.a + 1).penteEn(premiere.a + 0.5) * 100) / 100, premiere.pente);
});

// Le plat du départ n'est pas un décor : c'est là que l'élan se prend. La même
// bosse, à la même place, passe si on l'a attaquée lancée, et retient la machine
// à califourchon sur le point mort si on l'a attaquée au pas.
test('la première bosse de la ligne se gravit lancée et retient la machine au pas', () => {
  for (const graine of [1, 7, 11, 42, 1882, 99999]) {
    const monde = R.mondeDeLaGraine(graine);
    const bosse = monde.bosses.filter((b) => b.pente >= 0.1 && b.pente < 0.2).sort((une, autre) => une.a - autre.a)[0];
    const ou = (chose) => `${chose} (graine ${graine}, bosse à ${bosse.a} m à ${bosse.pente})`;

    const lancee = machineVapeur();
    rouler(lancee, monde, { duree: CHAUFFE });
    lancee.pousser(0.4);
    roulerJusquA(lancee, monde, bosse.a + bosse.longueur + 1, 200);
    assert.ok(lancee.distance > bosse.a + bosse.longueur, ou('la bosse refuse la machine lancée'));

    const auPas = machineVapeur({ regulateur: 0.4 });
    rouler(auPas, monde, { duree: CHAUFFE });
    auPas.pousser(0.4);
    rouler(auPas, monde, { duree: 120 });
    assert.ok(auPas.distance > bosse.a, ou('la machine au pas n’a même pas touché la rampe'));
    assert.ok(auPas.distance < bosse.a + bosse.longueur, ou('la bosse laisse passer la machine au pas'));

    // Trois minutes plus tard, elle n'a pas bougé d'un mètre — et l'écran a bien
    // eu le mot à dire. On ne teste pas l'instant choisi : la machine berce entre
    // deux points morts, et le sifflement de la soupape lui passe parfois devant.
    const ancre = auPas.distance;
    let dite = 0;
    for (let t = 0; t < 30; t += PAS) {
      M.pasDeTemps(auPas, monde, PAS);
      if (R.situation(auPas, monde) === 'cale') dite += 1;
    }
    assert.ok(Math.abs(auPas.distance - ancre) < 0.5, ou('la machine au pas avance encore après deux minutes'));
    assert.ok(dite > 0, ou('le mot « Calée » n’apparaît jamais pendant l’arrêt'));
  }
});

// La scène que le billet demande : dans la rampe qui la refuse, les roues
// tournent, le sol reste en place, le charbon part pour rien — et l'écran a le
// mot à dire. C'est la rampe du bout de la ligne, celle après laquelle il n'y a
// plus de chemin.
test('dans la rampe du bout, les roues tournent et le sol n’avance pas', () => {
  for (const graine of [1, 7, 11, 42, 1882, 99999]) {
    const monde = R.mondeDeLaGraine(graine);
    const raide = monde.bosses.filter((b) => b.pente >= 0.24).sort((une, autre) => une.a - autre.a)[0];
    const ou = (chose) => `${chose} (graine ${graine}, rampe à ${raide.a} m à ${raide.pente})`;

    const engin = machineVapeur();
    rouler(engin, monde, { duree: CHAUFFE });
    engin.pousser(0.4);
    roulerJusquA(engin, monde, raide.a - 0.5, 400);

    const distanceAuPied = engin.distance;
    const toursAuPied = engin.machine.tours;
    const charbonAuPied = engin.charbonBrule;
    let patine = 0;
    for (let t = 0; t < 60; t += PAS) {
      M.pasDeTemps(engin, monde, PAS);
      if (R.situation(engin, monde) === 'patine') patine += PAS;
    }
    const metres = engin.distance - distanceAuPied;
    const tours = engin.machine.tours - toursAuPied;
    const charbon = engin.charbonBrule - charbonAuPied;

    assert.ok(patine >= 5, ou(`le mot « Patine » ne tient pas à l'écran : ${patine.toFixed(1)} s`));
    assert.ok(tours > 2, ou(`les roues ne tournent pas : ${tours.toFixed(1)} tour`));
    assert.ok(metres < 5, ou(`le sol avance avec les roues : ${metres.toFixed(1)} m en une minute`));
    assert.ok(charbon > 5, ou(`le charbon ne brûle pas pendant qu'elle patine : ${charbon.toFixed(1)} kg`));
  }
});

// La ligne se lit avec les pleins du catalogue : 300 kg de charbon, 240 unités
// d'eau. C'est l'eau qui borne, jamais le charbon — et la rampe du bout tombe
// juste là où l'eau finit, une fois la rivière et le charbonnage passés.
test('la ligne tient dans ce que la machine emporte : un plein d’eau la mène au pied de la rampe du bout', () => {
  for (const graine of [1, 7, 11, 42, 1882, 99999]) {
    const monde = R.mondeDeLaGraine(graine);
    const ligne = R.ligneDeLaGraine(graine);
    const raide = ligne.bosses.filter((b) => b.pente >= 0.24)[0];
    const ou = (chose) => `${chose} (graine ${graine})`;

    const engin = M.nouvelEngin(R.PIECES_DE_BASE);
    engin.commandes.feu = 1;
    engin.commandes.regulateur = 1;
    rouler(engin, monde, { duree: CHAUFFE });
    engin.pousser(0.4);
    let t = CHAUFFE;
    while (t < 400 && Math.abs(engin.vitesse()) > 0.02) {
      M.pasDeTemps(engin, monde, PAS);
      t += PAS;
    }

    assert.ok(engin.distance >= raide.a - 0.5, ou(`l'engin n'atteint pas le pied de la rampe du bout : ${engin.distance.toFixed(0)} m sur ${raide.a}`));
    assert.ok(ligne.riviere.a < engin.distance, ou("l'engin n'atteint pas la rivière sur un plein d'eau"));
    assert.ok(ligne.charbonnage.a < engin.distance, ou("l'engin n'atteint pas le charbonnage sur un plein d'eau"));
    assert.ok(engin.soute > 200, ou(`le charbon borne avant l'eau : ${engin.soute.toFixed(0)} kg restants`));
  }
});

// --- Ticket 8 · l'établi : brancher, démonter, compter ---------------------

// L'établi est le tiroir du garage : il liste les pièces que l'engin porte, avec
// leur nombre, et se pilote d'un clic. Rien ne s'achète — une pièce se paie en
// masse et en charbon (ADR 0004, ADR 0006).

test("l'établi liste les pièces de l'engin avec leur nombre", () => {
  const engin = M.nouvelEngin(R.PIECES_DE_BASE);
  const rangs = R.etatDuJeu(engin, plaine()).etabli.pieces;

  assert.ok(Array.isArray(rangs) && rangs.length > 0, "l'établi ne liste rien");
  const noms = new Set();
  for (const id of R.PIECES_DE_BASE) {
    const rang = rangs.find((r) => r.id === id);
    assert.ok(rang, `l'établi passe la pièce « ${id} » de l'engin d'ouverture`);
    assert.equal(rang.nombre, 1, `« ${id} » : l'engin d'ouverture porte un exemplaire, l'établi en dit ${rang.nombre}`);
    assert.ok(typeof rang.nom === 'string' && rang.nom.trim().length > 0, `« ${id} » : l'établi ne nomme pas la pièce`);
    assert.ok(!noms.has(rang.nom), `deux pièces portent le même nom à l'établi : « ${rang.nom} »`);
    noms.add(rang.nom);
  }

  // Le mot vrai du métier, pas l'identifiant : un enfant lit « Citerne ».
  const citerne = rangs.find((r) => r.id === 'citerne');
  assert.equal(citerne.nom, 'Citerne', "l'établi n'emploie pas le mot du glossaire");
});

// Le chiffre du billet, mesuré et non réparé : vingt-huit pièces au catalogue,
// treize presentees a qui ouvre le jeu. Les quinze autres sont verrouillees, donc
// absentes du tiroir — ni grisées, ni expliquées, ni nommées (ADR 0006).
test('sur une partie neuve, l’établi présente treize pièces sur vingt-huit', () => {
  const catalogue = Object.keys(M.CATALOGUE);
  assert.equal(catalogue.length, 28, 'le catalogue ne compte plus vingt-huit pièces : le compte du billet est à reprendre');

  const engin = M.nouvelEngin(R.PIECES_DE_BASE);
  const rangs = R.etatDuJeu(engin, plaine(), R.nouvelleMemo()).etabli.pieces;
  assert.equal(rangs.length, 13, `l'établi d'une partie neuve présente ${rangs.length} pièces, et non treize`);

  for (const id of catalogue.filter((id) => !R.PIECES_DE_BASE.includes(id))) {
    assert.ok(!rangs.some((r) => r.id === id), `la pièce verrouillée « ${id} » est nommée à l'établi`);
    assert.ok(!rangs.some((r) => r.nom === M.CATALOGUE[id].nom), `la pièce verrouillée « ${id} » est nommée à l'établi sous son mot du métier`);
  }
});

// Ce qui ouvre une pièce, c'est la mémoire du jeu — les seuils qui l'écrivent sont
// le billet #10. Ici l'établi sait déjà lire `deblocages` : une pièce décrochée se
// branche, une autre ne se montre pas.
test('une pièce décrochée par la mémoire entre à l’établi, avec zéro exemplaire', () => {
  const engin = M.nouvelEngin(R.PIECES_DE_BASE);
  const memo = R.nouvelleMemo();
  memo.deblocages.push('second_cylindre');

  const rangs = R.etatDuJeu(engin, plaine(), memo).etabli.pieces;
  const rang = rangs.find((r) => r.id === 'second_cylindre');
  assert.ok(rang, "une pièce décrochée ne se branche pas : elle n'est pas à l'établi");
  assert.equal(rang.nombre, 0, 'une pièce qui vient de s’ouvrir est déjà montée deux fois');
  assert.equal(rang.peutBrancher, true, 'une pièce ouverte refuse déjà de se brancher');
  assert.equal(rang.peutDemonter, false, "on ne démonte pas ce qu'on ne porte pas");
});

// La structure ne se dédouble pas : un cylindre de plus n'a pas de sens, une
// citerne de plus si (spec, décision 7). `limite` est une donnée du catalogue ;
// c'est l'établi qui la fait respecter, le modèle ne refuse rien.
const STRUCTURE = ['crosse', 'bielle', 'vilebrequin', 'cylindre', 'tiroir', 'excentrique'];

test('les pièces de structure ne se dédoublent pas, quand bien même on les clique dix fois', () => {
  for (const id of STRUCTURE) {
    assert.equal(M.CATALOGUE[id].limite, 1, `« ${id} » : le catalogue ne borne pas cette pièce de structure à un exemplaire`);

    const engin = M.nouvelEngin(R.PIECES_DE_BASE);
    const memo = R.nouvelleMemo();
    memo.deblocages.push(id);   // le vilebrequin n'est pas de l'engin d'ouverture : on le suppose décroché
    const dejaPortee = engin.pieces[id] || 0;

    // Neuf clics d'affilée : il ne montera jamais qu'un exemplaire de la pièce.
    const branches = [];
    for (let n = 0; n < 9; n += 1) branches.push(R.brancherPiece(engin, memo, id));
    assert.equal(branches.filter(Boolean).length, 1 - dejaPortee, `« ${id} » : l'établi a monté ${engin.pieces[id]} exemplaires d'une pièce de structure`);
    assert.equal(engin.pieces[id], 1, `« ${id} » : l'engin porte ${engin.pieces[id]} exemplaires d'une pièce de structure`);

    const rang = R.etatDuJeu(engin, plaine(), memo).etabli.pieces.find((r) => r.id === id);
    assert.equal(rang.nombre, 1, `« ${id} » : l'établi affiche ${rang.nombre} exemplaires`);
    assert.equal(rang.peutBrancher, false, `« ${id} » : l'établi tend encore le bouton pour une pièce de structure comblée`);
  }
});

// Promesse de porte-monnaie vide (billet #8) : la monnaie d'une pièce, c'est la
// masse embarquée (ADR 0004, ADR 0006). Ni le charbon de la soute ni l'eau de la
// citerne ne s'échangent quand on visse une pièce.
test('une pièce débloquée se branche sans consommer un grain de charbon', () => {
  const monde = plaine();
  const engin = demarrer(machineVapeur(), monde);
  const memo = R.nouvelleMemo();

  const charbonAvant = engin.charbonBrule;
  const souteAvante = engin.soute;
  const eauAvante = engin.citerne;
  const masseAvante = R.etatDuJeu(engin, monde, memo).etabli.masse;

  assert.equal(R.brancherPiece(engin, memo, 'citerne'), true, "l'établi refuse la citerne que l'engin porte déjà");

  assert.equal(engin.charbonBrule, charbonAvant, 'brancher une pièce a brûlé du charbon');
  assert.equal(engin.soute, souteAvante, 'brancher une pièce a pris du charbon à la soute');
  assert.equal(engin.citerne, eauAvante, 'brancher une pièce a pris de l’eau à la citerne');

  const apres = R.etatDuJeu(engin, monde, memo);
  assert.ok(Number.isFinite(masseAvante), "l'établi ne rend pas la masse embarquée");
  assert.ok(Math.abs(apres.etabli.masse - (masseAvante + 0.2)) < 1e-9, `brancher une citerne de 200 kg rend ${apres.etabli.masse} t au lieu de ${masseAvante + 0.2} t`);

  const rang = apres.etabli.pieces.find((r) => r.id === 'citerne');
  assert.equal(rang.nombre, 2, "l'établi ne compte pas la citerne de plus");
});

// Le démontage est la partie dangereuse du billet : une machine à vapeur n'est pas
// une liste de modules optionnels. Ici on vérifie la monnaie — la masse rendue, ni
// charbon ni eau touchés — et que rien ne compte en négatif. Les scénarios qui
// ferraillent avec la physique (soupape en pleine chauffe, chaudière retirée) ont
// leur promesse plus bas.
test('toute pièce se démonte, rend sa masse, et ne touche ni au charbon ni à l’eau', () => {
  const monde = plaine();
  const engin = demarrer(machineVapeur(), monde);
  const memo = R.nouvelleMemo();

  const charbonAvant = engin.charbonBrule;
  const souteAvante = engin.soute;
  const eauAvante = engin.citerne;
  const masseAvante = R.etatDuJeu(engin, monde, memo).etabli.masse;

  assert.equal(R.demonterPiece(engin, memo, 'citerne'), true, "l'établi refuse de démonter la citerne que l'engin porte");
  assert.equal(engin.pieces.citerne, 0, 'la citerne démontrée est encore comptée');
  assert.equal(engin.charbonBrule, charbonAvant, 'démonter une pièce a brûlé du charbon');
  assert.equal(engin.soute, souteAvante, 'démonter une pièce a rendu du charbon à la soute');
  assert.equal(engin.citerne, eauAvante, 'démonter une pièce a rendu de l’eau à la citerne');

  const apres = R.etatDuJeu(engin, monde, memo);
  assert.ok(Math.abs(masseAvante - apres.etabli.masse - 0.2) < 1e-9, `démonter une citerne de 200 kg laisse ${apres.etabli.masse} t au lieu de ${masseAvante - 0.2} t`);

  const rang = apres.etabli.pieces.find((r) => r.id === 'citerne');
  assert.equal(rang.nombre, 0, "l'établi compte encore une citerne qui n'y est plus");
  assert.equal(rang.peutDemonter, false, "l'établi tend encore à démonter ce que l'engin ne porte pas");
  assert.equal(rang.peutBrancher, true, 'une pièce ôtée ne se remonte pas : l’établi refuse de la brancher');

  // On ne démonte pas deux fois la même pièce : rien ne passe en négatif.
  for (let n = 0; n < 5; n += 1) {
    assert.equal(R.demonterPiece(engin, memo, 'citerne'), false, 'l’établi démonte ce qui n’est plus là');
  }
  assert.equal(engin.pieces.citerne, 0, `compter en négatif : ${engin.pieces.citerne} citernes`);

  // Toute pièce de l'engin d'ouverture se démonte, y compris celles dont le modèle
  // croit avoir besoin pour exister.
  const depouille = demarrer(machineVapeur(), plaine());
  for (const id of R.PIECES_DE_BASE) {
    assert.equal(R.demonterPiece(depouille, memo, id), true, `« ${id} » : l'établi refuse de démonter cette pièce`);
    assert.equal(depouille.pieces[id], 0, `« ${id} » : ${depouille.pieces[id]} exemplaires après démontage`);
  }
});

// L'excentrique est le seul à donner son avance (ADR 0005). Retiré, le tiroir se
// cale droit : ce que voit l'élève à l'image suivante, c'est ce calcul, pas une
// faveur des règles.
test("retirer l'excentrique rend l'avance nulle et cale le tiroir droit", () => {
  const monde = plaine();
  const engin = demarrer(machineVapeur(), monde);
  const memo = R.nouvelleMemo();

  const avec = R.etatDuJeu(engin, monde, memo);
  assert.equal(engin.avanceEffective(), engin.machine.avance, "l'excentrique monté ne donne pas son avance");
  assert.ok(Math.abs(avec.distribution.tiroir - Math.sin(engin.machine.angle + engin.machine.avance)) < 1e-9, 'le tiroir dessiné ne suit pas l’avance de l’excentrique');

  assert.equal(R.demonterPiece(engin, memo, 'excentrique'), true, "l'établi refuse de démonter l'excentrique");

  const sans = R.etatDuJeu(engin, monde, memo);
  assert.equal(engin.avanceEffective(), 0, 'sans excentrique, l’avance n’est pas nulle : la machine part avant le piston');
  assert.ok(Math.abs(sans.distribution.tiroir - Math.sin(engin.machine.angle)) < 1e-9, `sans excentrique le tiroir dessiné reste décalé : ${sans.distribution.tiroir} au lieu de ${Math.sin(engin.machine.angle)}`);
  assert.ok(!sans.pieces.excentrique, 'l’excentrique démonté est encore compté comme monté');
});

// Tous les nombres que l'écran pourrait vouloir dessiner. Une valeur non mesurable
// n'a pas sa place à l'image : ni NaN, ni infini, et le dessin ne s'envole pas.
function lesNombresFous(objet, chemin = '', sortie = []) {
  for (const [cle, valeur] of Object.entries(objet ?? {})) {
    const ou = chemin ? `${chemin}.${cle}` : cle;
    if (typeof valeur === 'number' && !Number.isFinite(valeur)) sortie.push(`${ou}=${valeur}`);
    else if (valeur && typeof valeur === 'object') lesNombresFous(valeur, ou, sortie);
  }
  return sortie;
}

// Promesse du billet : retirer la soupape en pleine chauffe. Le modèle tient : la
// vapeur ne soutire plus rien, la pression monte jusqu'au fond de la jauge
// (PRESSION_MAX) et s'y pose. Elle ne pète pas — c'est le billet #15 — mais elle ne
// sort jamais du domaine que l'écran sait dessiner, et le mot affiché est bien celui
// du danger.
test("retirer la soupape en pleine chauffe ne produit aucun nombre que l'écran ne saurait dessiner", () => {
  const monde = plaine();
  const engin = demarrer(machineVapeur(), monde, { suite: 10 });
  const memo = R.nouvelleMemo();

  // Plus personne ne soutire la vapeur : le cylindre part aussi.
  assert.equal(R.demonterPiece(engin, memo, 'cylindre'), true, 'le cylindre ne se démonte pas');
  assert.equal(R.demonterPiece(engin, memo, 'soupape'), true, 'la soupape ne se démonte pas');

  let pressionMax = 0;
  // Deux minutes de feu, la vapeur ne va plus nulle part.
  for (let n = 0; n < 120 / PAS; n += 1) {
    M.pasDeTemps(engin, monde, PAS);
    const etat = R.etatDuJeu(engin, monde, memo);
    pressionMax = Math.max(pressionMax, etat.jauge.pression);
    const fous = lesNombresFous(etat);
    assert.equal(fous.length, 0, `image ${n} après démontage de la soupape : ${fous.join(', ')}`);
  }

  const etat = R.etatDuJeu(engin, monde, memo);
  assert.equal(pressionMax, etat.jauge.fond, `la pression s'arrête à ${pressionMax}, et non au fond de la jauge (${etat.jauge.fond})`);
  assert.equal(etat.mot, R.MOTS_DE_SITUATION.danger, `sans soupape à 12 atmosphères, l'écran dit « ${etat.mot} »`);
  assert.ok(Number.isFinite(engin.distance), 'la distance n’est plus mesurable');
});

// Les autres scènes que le billet nomme. Chacune : on retire la pièce en cours de
// route, on marche une minute, et on cherche ce qui casserait l'image — un nombre
// non mesurable, ou un engin qui se téléporte.
test("retirer la chaudière, les roues, la crosse, la citerne à sec ou la soute vide : l'écran tient", () => {
  const SCENES = {
    chaudiere: () => demarrer(machineVapeur(), plaine(), { suite: 10 }),
    roues: () => demarrer(machineVapeur(), plaine(), { suite: 10 }),
    crosse: () => demarrer(machineVapeur(), plaine(), { suite: 10 }),
    bielle: () => demarrer(machineVapeur(), plaine(), { suite: 10 }),
    citerne: () => { const e = machineVapeur(); e.citerne = 0; return demarrer(e, plaine(), { suite: 10 }); },
    soute: () => { const e = machineVapeur(); e.soute = 0; return demarrer(e, plaine(), { suite: 10 }); },
  };

  for (const [id, fabriquer] of Object.entries(SCENES)) {
    const monde = plaine();
    const engin = fabriquer();
    const memo = R.nouvelleMemo();
    assert.equal(R.demonterPiece(engin, memo, id), true, `« ${id} » : l'établi refuse de démonter cette pièce`);

    let saut = 0;
    let avant = engin.distance;
    for (let n = 0; n < 60 / PAS; n += 1) {
      M.pasDeTemps(engin, monde, PAS);
      const etat = R.etatDuJeu(engin, monde, memo);
      const fous = lesNombresFous(etat);
      assert.equal(fous.length, 0, `« ${id} », image ${n} : ${fous.join(', ')}`);
      saut = Math.max(saut, Math.abs(engin.distance - avant));
      avant = engin.distance;
    }

    assert.ok(Number.isFinite(engin.distance), `« ${id} » : la distance n'est plus mesurable`);
    assert.ok(saut < 0.1, `« ${id} » : l'engin saute de ${saut.toFixed(3)} m entre deux images`);
  }
});

// « La machine change visiblement de comportement à l'image suivante. » Quatre
// pièces où le geste se voit, mesuré et non affirmé. Les autres pièces ne pèsent que
// leur masse : c'est dit dans le rapport, pas caché sous une promesse complaisante.
test('retirer le foyer, la boîte à fumée, le régulateur ou le cylindre change ce que la machine fait', () => {
  const apres = (id, reglages = {}) => {
    const monde = plaine();
    const engin = demarrer(machineVapeur(reglages), monde, { suite: 60 });
    const avant = engin.vitesse();
    assert.equal(R.demonterPiece(engin, R.nouvelleMemo(), id), true, `« ${id} » : l'établi refuse de démonter cette pièce`);
    rouler(engin, monde, { duree: 30 });
    return { avant, apres: engin.vitesse(), cale: engin.machine.cale, pression: engin.chaudiere.pression };
  };

  const sansFeu = apres('foyer');
  assert.ok(sansFeu.cale, `plus de foyer et la machine roule encore à ${sansFeu.apres.toFixed(2)} m/s`);

  const sansTirage = apres('boite_a_fumee');
  assert.ok(sansTirage.apres < sansTirage.avant * 0.7, `plus de boîte à fumée : ${sansTirage.avant.toFixed(2)} -> ${sansTirage.apres.toFixed(2)} m/s, l'élève ne verrait rien passer`);

  // Le régulateur bridé à 40 % : retiré, la vapeur est libre — le modèle ouvre tout.
  const sansRegulateur = apres('regulateur', { regulateur: 0.4 });
  assert.ok(sansRegulateur.apres > sansRegulateur.avant * 1.1, `régulateur retiré d'une machine bridée : ${sansRegulateur.avant.toFixed(2)} -> ${sansRegulateur.apres.toFixed(2)} m/s`);

  const sansCylindre = apres('cylindre');
  assert.ok(sansCylindre.cale, `plus de cylindre et la machine avance à ${sansCylindre.apres.toFixed(2)} m/s`);
  assert.ok(sansCylindre.pression > 8, `plus de cylindre et la pression reste à ${sansCylindre.pression.toFixed(1)} atmosphères`);
});

// La promesse de porte-monnaie vide, dans sa seconde moitié : quels que soient les
// clics, le nombre d'exemplaires rendu par les règles ne dépasse jamais sa limite.
test('à coups de clics, le nombre d’exemplaires rendu par les règles ne dépasse jamais sa limite', () => {
  const monde = plaine();
  const engin = M.nouvelEngin(R.PIECES_DE_BASE);
  const memo = R.nouvelleMemo();
  memo.deblocages.push(...Object.keys(M.CATALOGUE).filter((id) => !R.PIECES_DE_BASE.includes(id)));

  for (const rang of R.etatDuJeu(engin, monde, memo).etabli.pieces) {
    for (let n = 0; n < 30; n += 1) R.brancherPiece(engin, memo, rang.id);
  }

  const rendu = R.etatDuJeu(engin, monde, memo).etabli.pieces;
  assert.equal(rendu.length, Object.keys(M.CATALOGUE).length, 'toutes les pièces décrochées ne se montrent pas à l’établi');
  for (const rang of rendu) {
    const borne = R.limiteDePiece(rang.id);
    assert.ok(rang.nombre <= borne, `« ${rang.id} » : l'établi rend ${rang.nombre} exemplaires, sa limite est ${borne}`);
    assert.ok(engin.pieces[rang.id] <= borne, `« ${rang.id} » : l'engin porte ${engin.pieces[rang.id]} exemplaires, sa limite est ${borne}`);
    assert.equal(rang.peutBrancher, rang.nombre < borne, `« ${rang.id} » : le bouton ne dit pas la même chose que le compte`);
    if (borne === 1) assert.equal(rang.nombre, 1, `« ${rang.id} » : pièce de structure restée à ${rang.nombre}`);
  }

  // Ce qui n'a pas de limite déclarée n'en reçoit pas d'inventée par l'établi.
  assert.equal(R.limiteDePiece('citerne'), Infinity, 'l’établi a borné ce qui est réservoir');
  const reservoir = rendu.find((r) => r.id === 'citerne');
  assert.ok(reservoir.nombre > 1, 'une citerne de plus ne se monte pas : ce qui est réservoir ne se dédouble pas');
});

// Le billet #18 a une seconde face, à l'écran : une pièce que le modèle ne sent que
// par sa masse, et dont la masse n'est pas le rôle, n'est pas un choix proposé au
// joueur. Le refus est aux règles, la parole aussi — le dessin ne fait que la rendre.
// Cette promesse est la seule qui parle du mot « structurelle » : si elle tombe,
// l'établi montre une table sans rien dire de ce qu'il refuse.
test("l'établi dit structurelle, et ne le propose pas comme un choix", () => {
  const monde = plaine();
  const engin = demarrer(machineVapeur(), monde);
  const memo = R.nouvelleMemo();
  const inscrites = Object.entries(M.PIECES_A_MASSE_SEULE);
  assert.ok(inscrites.length > 0, 'aucune pièce inscrite à masse seule : cette promesse ne garde plus rien');

  // Une pièce structurelle reste à l'établi, avec son nom et son chiffre : les cacher
  // laisserait croire qu'elles n'existent pas. Ce qui change, c'est le geste.
  for (const [id, entree] of inscrites) {
    const depouille = demarrer(machineVapeur(), plaine());
    const ouverte = R.nouvelleMemo();
    ouverte.deblocages.push(id); // une piece hors de l'engin d'ouverture : le tiroir doit l'avoir vue
    assert.equal(R.brancherPiece(depouille, ouverte, id), true, `« ${id} » : l'établi refuse de brancher cette pièce`);
    const rang = R.etatDuJeu(depouille, plaine(), ouverte).etabli.pieces.find((r) => r.id === id);
    assert.ok(rang, `« ${id} » a disparu de l'établi : une pièce qu'on ne peut pas démonter doit quand même se lire`);
    assert.equal(rang.structurelle, !entree.seDemonte, `« ${id} » : la colonne dit seDemonte ${entree.seDemonte}, l'établi dit structurelle ${rang.structurelle}`);
    assert.equal(rang.peutDemonter, !entree.seDemonte ? false : rang.nombre > 0, `« ${id} » : le geste proposé ne suit pas la colonne`);
    assert.equal(
      R.demonterPiece(depouille, ouverte, id),
      entree.seDemonte,
      entree.seDemonte ? `« ${id} » : sa masse est son rôle, l'établi doit la laisser démonter` : `« ${id} » : l'établi démonte une pièce structurelle`
    );
    assert.equal(depouille.pieces[id], entree.seDemonte ? 0 : 1, `« ${id} » : ${depouille.pieces[id]} exemplaire(s) après le geste`);
  }

  // Les treize pièces de l'engin d'ouverture ne sont pas structurelles : le billet #8
  // reste tenu pour la machine que le joueur trouve au lever de rideau.
  const rendu = R.etatDuJeu(engin, monde, memo).etabli.pieces;
  for (const id of R.PIECES_DE_BASE) {
    const rang = rendu.find((r) => r.id === id);
    assert.equal(rang.structurelle, false, `« ${id} » est une pièce de l'engin d'ouverture et l'établi la dit structurelle`);
  }
  assert.equal(M.estStructurelle('cylindre'), false, 'le modèle dit quun cylindre est structurel');
  assert.equal(M.estStructurelle('une piece que le catalogue ne connait pas'), false, 'le modèle trouve structurelle une pièce inconnue');
});

// Le régulateur est la seule pièce dont l'absence était déjà honnête côté modèle
// (ADR 0009 : conductance maximale, la vapeur entre en grand). Le billet #18 demande
// que le geste ne ressemble pas à rien. Ce qui mentait, c'était le mot : « 37 % » sur
// une commande que le modèle n'écoute plus. Le curseur garde sa place — c'est le doigt
// du joueur —, le mot rend le robinet. Le billet #7 nommera la pièce manquante.
test('le régulateur ôté ne rend plus le pourcentage d\'une commande muette', () => {
  const monde = plaine();
  const engin = demarrer(machineVapeur(), monde);
  const memo = R.nouvelleMemo();
  engin.commandes.regulateur = 0.37;
  assert.equal(R.etatDuJeu(engin, monde).commandes.mot, '37 %', 'régulateur monté, le mot ne suit plus la commande');

  assert.equal(R.demonterPiece(engin, memo, 'regulateur'), true, "l'établi refuse de démonter le régulateur");
  // La commande reste où le doigt l'a laissée : démonter ne la recomande pas.
  assert.equal(engin.commandes.regulateur, 0.37, 'démonter le régulateur a touché à la commande du chauffeur');

  const mot = R.etatDuJeu(engin, monde).commandes.mot;
  assert.equal(mot, 'grand ouvert', `régulateur ôté, l'écran dit « ${mot} » d'un robinet grand ouvert`);
  assert.equal(/[0-9]/.test(mot), false, 'le mot du robinet ôté récite un pourcentage');
  assert.ok(mot.length <= 16, `le mot du robinet déborde de l'écran : ${mot}`);

  // La promesse est bien sur le mot, pas sur le hasard : remonter le régulateur rend
  // la parole au curseur, et la commande n'avait pas bougé.
  assert.equal(R.brancherPiece(engin, memo, 'regulateur'), true, 'le régulateur ôté ne se remonte pas');
  assert.equal(R.etatDuJeu(engin, monde).commandes.mot, '37 %', 'régulateur remonté, la commande ne reprend pas la parole');
});

// --- Ticket 9 · le charbon et l’eau se reprennent en route ------------------
//
// Le champ `charbonnage` de la ligne était déclaré, peint à l’écran, et jamais lu
// pour quoi que ce soit de comptable. Le soutage lui donne son emploi, et la
// promesse tenue au joueur tient en une phrase : une panne de charbon a une
// réponse. On roule jusqu’au terril, on s’arrête, on soutire — la panne se paie
// en temps et en panache éteint, pas en partie perdue.
//
// Ce qui est écrit ici avant le code :
//  · on soutire à l’arrêt, dans la zone, quelle que soit la raison de l’arrêt ;
//  · la reprise n’est pas du charbon brûlé ;
//  · une soute qui n’est pas montée ne se remplit pas (billet #18 : la quantité
//    survit à la pièce, personne n’y atteint plus) ;
//  · l’eau de la rivière attend son arbre de pompe : rien ne la livre aujourd’hui.

// Un charbonnage posé de 40 m à 48 m, à plat autour : le décor du soutage.
const charbonniere = ({ a = 40, longueur = 8 } = {}) => M.nouveauMonde({ charbonnage: { a, longueur } });

// Un engin arrêté par sa propre faim, posé à la distance voulue. Le feu est
// ouvert : c’est le charbon qui manque à la grille, pas la main sur le foyer.
function enginALaFaim({ distance = 44, soute = 0, pieces = R.PIECES_DE_BASE } = {}) {
  const monde = charbonniere();
  const engin = M.nouvelEngin(pieces);
  engin.soute = soute;
  engin.commandes.feu = 1;
  engin.commandes.regulateur = 1;
  engin.distance = distance;
  rouler(engin, monde, { duree: 20 });
  assert.equal(engin.mouvement(), false, `l’engin posé à ${distance} m n’est pas à l’arrêt`);
  return { engin, monde };
}

// Le geste du billet, amené par les seules commandes du jeu : la machine roule,
// le chauffeur coupe la vapeur en vue du terril, l’élan se rend, la machine cale
// — et l’on soutire sur place. C’est la réponse à la question que le billet ne
// peut pas éviter : sans frein, comment s’arrête-t-on devant le charbonnage ?
function arrateeDevantLeCharbonnage(graine = R.GRAINE_DU_JEU) {
  const monde = R.mondeDeLaGraine(graine);
  const zone = monde.charbonnage;
  const engin = M.nouvelEngin(R.PIECES_DE_BASE);
  engin.commandes.feu = 1;
  engin.commandes.regulateur = 1;
  let t = 0;
  const pas = () => { M.pasDeTemps(engin, monde, PAS); t += PAS; };
  while (t < 50) pas();
  engin.pousser(0.4);
  while (engin.distance < zone.a - 1.5 && t < 400) pas();
  engin.commandes.regulateur = 0;          // le seul frein que le jeu connaisse
  while (engin.mouvement() && t < 400) pas();
  return { engin, monde, zone, t };
}

test('à l’arrêt devant un charbonnage la soute se remplit, et le débit se paie en temps', () => {
  const { engin, monde } = enginALaFaim({ distance: 44 });
  const avant = engin.soute;

  const premierRepris = R.soutage(engin, monde, 1 / 20);   // une image d’écran
  assert.ok(premierRepris > 0, 'rien n’est repris à l’arrêt sur le charbonnage');
  assert.equal(engin.soute, avant + premierRepris, 'le soutage ne rend pas ce qu’il met dans la soute');
  // Le débit est une règle du jeu : une image ne remet pas trois cents kilos.
  assert.ok(premierRepris < 75, `une image reprend ${premierRepris.toFixed(0)} kg : le plein est instantané`);

  // La panne se paie en temps. Une soute vide se remplit en minutes de machine,
  // pas en clignant des yeux — et pas en quittant l’écran non plus.
  let secondes = 0;
  while (engin.soute < engin.capacite('soute') && secondes < 900) {
    R.soutage(engin, monde, 1 / 20);
    secondes += 1 / 20;
  }
  assert.equal(engin.soute, engin.capacite('soute'), `le plein s’arrête à ${engin.soute.toFixed(0)} kg`);
  assert.ok(secondes >= 30, `une soute vide reprise en ${secondes.toFixed(0)} s : la panne ne coûte rien`);
  assert.ok(secondes <= 150, `il faut ${secondes.toFixed(0)} s pour un plein : le joueur quitte l’écran`);
});

test('ailleurs, et en marche, le soutage ne remplit rien', () => {
  // Hors de la zone, même arrêté : le charbon d’à côté ne coule pas tout seul.
  for (const distance of [0, 12, 39.5, 48.5, 90, 250]) {
    const { engin, monde } = enginALaFaim({ distance });
    const repris = R.soutage(engin, monde, 20);
    assert.equal(repris, 0, `on reprend ${repris.toFixed(1)} kg à ${distance} m du départ`);
    assert.equal(engin.soute, 0, `la soute s’est remplie à ${distance} m du charbonnage`);
  }

  // Dans la zone mais en marche : les roues tournent, personne ne descend à la pelle.
  const rouleuse = machineVapeur();
  const monde = charbonniere();
  demarrer(rouleuse, monde, { suite: 10 });
  rouleuse.distance = 44;
  assert.equal(rouleuse.mouvement(), true, 'la machine censée rouler est arrêtée');
  const avant = rouleuse.soute;
  assert.equal(R.soutage(rouleuse, monde, 20), 0, 'le soutage remplit la soute en marche');
  assert.equal(rouleuse.soute, avant, 'la soute a grossi pendant que la machine roulait');
});

test('coupée de sa vapeur en vue du charbonnage, la machine cale dans la zone et s’y ravitaille', () => {
  const { engin, monde, zone } = arrateeDevantLeCharbonnage();

  // Le joueur n’a pas de frein : couper le régulateur laisse la machine rendre
  // son élan. Ce que le jeu accepte est écrit ici — un calage compte comme un
  // arrêt, quelle que soit la raison qui a mis la machine là.
  assert.equal(engin.mouvement(), false, 'la machine roule encore après la vapeur coupée');
  assert.ok(
    engin.distance >= zone.a && engin.distance <= zone.a + zone.longueur,
    `l’arrêt se fait à ${engin.distance.toFixed(1)} m, hors du charbonnage (${zone.a}–${zone.a + zone.longueur} m)`,
  );
  assert.equal(R.situation(engin, monde), 'cale', 'le seul arrêt accepté est un autre mot que « Calée »');

  // Le soutage, sur un calage : la soute remonte, et elle y met du temps.
  const avant = engin.soute;
  assert.ok(R.soutage(engin, monde, 1) > 0, 'rien n’est repris sur un calage du charbonnage');
  assert.ok(engin.soute < engin.capacite('soute'), 'la soute était déjà pleine avant l’arrêt : rien à reprendre');
  let secondes = 0;
  while (engin.soute < engin.capacite('soute') && secondes < 300) {
    R.soutage(engin, monde, 1 / 20);
    secondes += 1 / 20;
  }
  assert.ok(engin.soute > avant + 20, 'la soute n’a pas profité de l’arrêt');

  // Et la machine repart, avec le seul geste que l'écran connaisse : rouvrir le
  // régulateur et jouer de la barre. Un coup ne suffit pas — la machine est posée
  // sur son point mort, et c'est la physique du billet #2, pas un trou du soutage.
  // La panne se paie là aussi : du temps et des coups de barre, pas la partie.
  engin.commandes.regulateur = 1;
  for (let coup = 0; coup < 3; coup += 1) {
    engin.pousser();
    rouler(engin, monde, { duree: 1 });
  }
  const distanceDeLArret = engin.distance;
  rouler(engin, monde, { duree: 30 });
  assert.ok(
    engin.distance > distanceDeLArret + 5,
    `repartie du charbonnage, la machine n'a fait que ${(engin.distance - distanceDeLArret).toFixed(1)} m`,
  );
  assert.ok(engin.soute < engin.capacite('soute'), 'repartie avec son charbon, la machine n’en a rien brûlé');
});

test('la reprise au charbonnage n’est pas du charbon brûlé', () => {
  const { engin, monde } = enginALaFaim({ distance: 44 });
  engin.commandes.feu = 0;   // feu clos pendant le soutage : rien ne brûle, tout entre

  const facture = engin.charbonBrule;
  const factureDite = R.etatDuJeu(engin, monde, R.nouvelleMemo()).comptes.charbonBrule;
  const repris = R.soutage(engin, monde, 20);
  assert.ok(repris > 10, `le soutage ne reprend que ${repris.toFixed(1)} kg : rien à comparer`);

  assert.equal(engin.charbonBrule, facture, 'la reprise au charbonnage est comptée comme brûlée');
  assert.equal(engin.soute, repris, 'la reprise n’entre pas toute entière dans la soute');
  assert.equal(
    R.etatDuJeu(engin, monde, R.nouvelleMemo()).comptes.charbonBrule,
    factureDite,
    'l’écran rend une facture grossie par le charbon repris',
  );

  // Ce que la caisse a pris, la grille ne l’a pas mangé : rouvrir le feu fait
  // reprendre la facture où elle s’était arrêtée, sans rattraper la reprise.
  const avantReprise = engin.soute;
  engin.commandes.feu = 1;
  rouler(engin, monde, { duree: 5 });
  const bruleApres = engin.charbonBrule - facture;
  assert.ok(bruleApres > 0, 'le feu ouvert ne brûle plus rien');
  assert.ok(bruleApres < avantReprise, `cinq secondes de feu ont brûlé ${bruleApres.toFixed(1)} kg sur ${avantReprise.toFixed(1)} repris`);
  assert.ok(engin.soute < avantReprise, 'la grille ne mange pas la reprise, ça se voit mal');
});

test('le soutage s’arrête à la capacité des soutes montées', () => {
  const une = enginALaFaim({ distance: 44 });
  R.soutage(une.engin, une.monde, 600);
  assert.equal(une.engin.soute, 300, `une soute contient ${une.engin.soute.toFixed(0)} kg`);
  assert.equal(R.etatDuJeu(une.engin, une.monde).reservoirs.soute.plein, 1, 'pleine, la soute ne se dit pas pleine');

  // Deux soutes, deux fois la caisse : la capacité vient du catalogue, pas d’un
  // plafond inventé pour que la rampe du bout passe.
  const deux = enginALaFaim({ distance: 44, pieces: [...R.PIECES_DE_BASE, 'soute'] });
  R.soutage(deux.engin, deux.monde, 600);
  assert.equal(deux.engin.capacite('soute'), 600, 'deux soutes ne contiennent pas deux fois plus');
  assert.equal(deux.engin.soute, 600, `deux soutes contiennent ${deux.engin.soute.toFixed(0)} kg`);
});

test('une soute qui n’est pas montée ne se remplit pas, et l’écran le dit', () => {
  const pieces = R.PIECES_DE_BASE.filter((id) => id !== 'soute');
  const { engin, monde } = enginALaFaim({ distance: 44, pieces, soute: 120 });

  // Billet #18 : la quantité survit à la pièce, et personne n’y atteint plus.
  assert.equal(engin.soute, 120, 'démonter la soute a versé son charbon');
  assert.equal(engin.capacite('soute'), 0, 'une soute absente a encore une capacité');
  assert.equal(engin.charbonDisponible(), 0, 'une soute absente nourrit encore la machine');

  assert.equal(R.soutage(engin, monde, 60), 0, 'du charbon est entré dans une soute qui n’est pas là');
  assert.equal(engin.soute, 120, 'le soutage a rempli la soute démontée');

  const etat = R.etatDuJeu(engin, monde, R.nouvelleMemo());
  assert.match(etat.soutage.mot, /soute/, 'l’écran ne dit pas que c’est la soute qui manque');
  assert.doesNotMatch(etat.soutage.mot, /pleine/, 'l’écran dit « pleine » d’une soute absente');
});

test('la rivière est là, son eau attend la pompe : le soutage ne remplit rien', () => {
  const riviere = M.nouveauMonde({ riviere: { a: 40, longueur: 10 } });
  const engin = M.nouvelEngin(R.PIECES_DE_BASE);
  engin.citerne = 0;
  engin.distance = 45;
  rouler(engin, riviere, { duree: 10 });

  const avant = engin.citerne;
  assert.equal(R.soutage(engin, riviere, 120), 0, 'le soutage reprend de l’eau : la pompe est livrée par erreur');
  assert.equal(engin.citerne, avant, 'la citerne s’est remplie à la main, sans pompe');

  // La pompe montée au catalogue ne change rien non plus : ce qui manque est le
  // geste à l’écran, et le billet ne le livre pas.
  engin.brancher('pompe');
  engin.commandes.pompe = 1;
  assert.equal(R.soutage(engin, riviere, 120), 0, 'une pompe au catalogue suffit à remplir la citerne');
  assert.equal(engin.citerne, avant, 'la citerne a grossi à la rivière sans que la pompe soit livrée');

  // Mais la rive se voit, et ce qui manque se dit.
  const etat = R.etatDuJeu(engin, riviere, R.nouvelleMemo());
  assert.ok(etat.sol.riviere, 'la rivière a disparu du tracé');
  assert.match(etat.soutage.mot, /pompe/, 'rien ne dit au joueur ce qui manque pour reprendre de l’eau');
});

test('à sec, la machine perd ses tours et l’écran le nomme', () => {
  const monde = M.nouveauMonde({});
  const engin = M.nouvelEngin(R.PIECES_DE_BASE);
  engin.citerne = 6;   // l’eau d’un aller simple
  engin.commandes.feu = 1;
  engin.commandes.regulateur = 1;
  rouler(engin, monde, { duree: 50 });
  engin.pousser(0.4);

  // Le mot vient pendant que la machine a encore de la vitesse : c’est lui qui
  // dit au joueur pourquoi les tours s’en vont, pas une aiguille qui faiblit.
  let t = 50;
  while (t < 200 && R.situation(engin, monde) !== 'sec') { rouler(engin, monde, { duree: PAS }); t += PAS; }
  assert.equal(R.situation(engin, monde), 'sec', 'la chaudière ne s’est jamais trouvée à sec');
  const vitesseAuMot = Math.abs(engin.vitesse());
  assert.ok(vitesseAuMot > 0.5, `le mot « À sec » arrive machine déjà immobile (${vitesseAuMot.toFixed(2)} m/s)`);
  assert.equal(R.etatDuJeu(engin, monde).mot, R.MOTS_DE_SITUATION.sec, 'l’écran ne nomme pas « À sec »');

  // Et les tours partent : la machine ne tient pas sur sa pression seule.
  rouler(engin, monde, { duree: 60 });
  assert.ok(Math.abs(engin.vitesse()) < vitesseAuMot * 0.25, `à sec depuis une minute, la machine file à ${(engin.vitesse() * 3.6).toFixed(1)} km/h`);
  assert.equal(R.etatDuJeu(engin, monde).mot, R.MOTS_DE_SITUATION.sec, 'immobile à sec, l’écran a changé de mot');

  // Ce qui manque est nommé avec l’eau : la rivière est là-bas, sa pompe non.
  assert.match(R.etatDuJeu(engin, monde, R.nouvelleMemo()).soutage.mot, /pompe|eau/, 'à sec, l’écran ne dit rien de ce qui manque');
});

// Le monde est passé à la physique tel que l’image le reçoit. La promesse est là
// parce que la ligne rend la rivière, le vent et le charbonnage comme des
// *endroits* : donnés tels quels, `monde.riviere` est vrai à cent mètres de l’eau
// — une pompe montée remplirait la citerne en rase campagne — et `monde.vent` est
// un objet : une voile ou une éolienne multipliant par là dessus rend la distance
// perdue. `mondeSousLesRoues` existe pour ça depuis le billet #6.
test('le monde que l’image passe à la physique est celui sous les roues', () => {
  const source = sourceProjection();
  assert.match(source, /mondeSousLesRoues/, 'aucune conversion du monde sous les roues dans la projection');
  assert.equal(
    /passerLImage\(\s*engin,\s*monde\s*[,)]/.test(source),
    false,
    'l’image passe la ligne entière à la physique : la rivière serait vraie partout',
  );
});
