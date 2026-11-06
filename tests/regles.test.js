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
