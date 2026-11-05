// Les promesses de l'écran.
//
// Ici on n'ouvre pas le capot : on amène l'engin à un état par la couture
// physique (pasDeTemps), puis on interroge les règles — `situation`,
// `etatDuJeu` — telles que la projection les lit. La projection SVG et la
// boucle d'images ne se testent pas (spec, Testing Decisions) : c'est
// l'étroitesse d'`etatDuJeu`, plus une promesse qui lit les deux sections comme
// du texte, qui tiennent lieu de garde.
//
// Les règles sont extraites d'index.html par tests/harnais.js, comme le modèle,
// et reçoivent le modèle comme unique point de départ : elles ne voient ni un
// pixel ni une touche de clavier.

import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerModele, chargerRegles, sourceModele, sourceRegles } from './harnais.js';

const M = chargerModele();
const R = chargerRegles();

const PAS = 1 / 120;
const CHAUFFE = 50; // secondes de feu avant de démarrer : la vapeur monte, lentement et pour de vrai

// La machine des douze promesses, telle que le joueur la monte en partant.
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
