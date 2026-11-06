// Les dix-sept promesses du jeu (question Q44 du cadrage, plus les cinq du ticket 17
// : le régulateur ferme vraiment la vapeur, le coup de barre s'ajoute).
//
// Chaque test est une phrase qu'on promet au joueur : si l'une d'elles tombe,
// le jeu ment sur la machine à vapeur. Le rendu SVG vient après, jamais avant.
// Le modèle est lu dans index.html par tests/harnais.js — pas de copie.
//
// Deux mots de vocabulaire pour lire ce fichier :
//  - « cale » : la machine ne fait plus de tours, elle est prise à un point mort ;
//  - « élan » : ce que la machine emporte avec elle. Il n'y a pas de pièce à
//    acheter pour ça — la masse roulante de l'engin EST son volant. On le
//    reprend à la promesse 4.
//
// Un mot sur la « poussée » : engin.pousser(elan) est le coup de barre du
// chauffeur. À l'arrêt, une machine bien réglée ne part pas toute seule si le
// vilebrequin est au point mort ; deux hommes sur un levier, et elle part.
// La secousse s'ajoute au mouvement déjà là : donnée à une machine lancée, elle
// la rend plus vite, jamais plus lente (promesse 16).

import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerModele, sourceModele } from './harnais.js';

const M = chargerModele();
const PAS = 1 / 120;
const CHAUFFE = 50; // secondes de feu avant de démarrer : la vapeur monte, lentement et pour de vrai

// Une machine telle que le joueur en construit une en partant : chaudière, foyer,
// soute, citerne, cylindre à double effet, tiroir, excentrique, régulateur,
// soupape, boîte à fumée. Rien de plus.
const MACHINE = [
  'chaudiere', 'foyer', 'soute', 'citerne', 'cylindre', 'tiroir', 'excentrique',
  'regulateur', 'crosse', 'bielle', 'roues', 'boite_a_fumee', 'soupape',
];

function machineVapeur({ pieces = [], feu = 1, regulateur = 1, recouvrement = null } = {}) {
  const engin = M.nouvelEngin([...MACHINE, ...pieces]);
  engin.soute = 4000;   // on teste la physique, pas la faim du foyer
  engin.citerne = 4000;
  engin.commandes.feu = feu;
  engin.commandes.regulateur = regulateur;
  if (recouvrement !== null) engin.machine.recouvrement = recouvrement;
  return engin;
}

function rouler(engin, monde, { duree, distanceCible = null } = {}) {
  let t = 0;
  while (t < duree) {
    M.pasDeTemps(engin, monde, PAS);
    t += PAS;
    if (distanceCible !== null && Math.abs(engin.distance) >= distanceCible) break;
  }
  return engin.bilan();
}

// La chauffe, puis le coup de barre, la machine restant dans le meme monde.
// L'ordre compte : aucune machine ne demarre sans élan, c'est deja une lecon.
function demarrer(engin, monde, { chauffe = CHAUFFE, elan = 0.4, suite = 40 } = {}) {
  rouler(engin, monde, { duree: chauffe });
  assert.ok(engin.chaudiere.pression > 4, `la chaudière n'a pas monté en pression pendant la chauffe (${engin.chaudiere.pression.toFixed(1)})`);
  engin.pousser(elan);
  rouler(engin, monde, { duree: suite });
  return engin;
}

const plaine = (regles = {}) => M.nouveauMonde(regles);
const course = (opts, regles) => demarrer(machineVapeur(opts), plaine(regles));

// Une machine au régime établi : chauffée, lancée, puis laissée à elle-même
// assez longtemps pour que la jauge ne bouge plus. C'est là que le chauffeur
// regarde avant de toucher au régulateur, et c'est de là qu'on serre.
function etablie({ monde = plaine(), regulateur = 1, chauffe = CHAUFFE, lance = 240 } = {}) {
  const engin = machineVapeur();
  rouler(engin, monde, { duree: chauffe });
  engin.pousser();
  rouler(engin, monde, { duree: lance });
  engin.commandes.regulateur = regulateur;
  return { engin, monde };
}

// Première partie à plat, pour emporter de la vitesse ; puis le monde demande,
// avec sa côte. C'est ainsi qu'on aborde une bosse : on la prend de l'élan.
function lancee(opts, regles = {}, { avant = 70, apres = 120 } = {}) {
  const engin = machineVapeur(opts);
  rouler(engin, plaine(), { duree: CHAUFFE });
  engin.pousser();
  rouler(engin, plaine(), { duree: avant });   // on fait la vitesse sur le plat
  rouler(engin, plaine(regles), { duree: apres });
  return engin;
}

// 1
test('un foyer qui chauffe monte la pression de la chaudière', () => {
  const engin = machineVapeur({ regulateur: 0 }); // on ne soutire rien
  const avant = engin.chaudiere.pression;
  rouler(engin, plaine(), { duree: 20 });
  assert.ok(engin.chaudiere.pression > avant + 0.5, `pression attendue au-dessus de ${avant + 0.5}, obtenue ${engin.chaudiere.pression.toFixed(1)}`);
  assert.ok(engin.chaudiere.pression <= M.PRESSION_MAX, 'la pression dépasse la limite de la chaudière');
});

// 2
test('une chaudière sans eau ne fait plus de vapeur', () => {
  const engin = machineVapeur();
  rouler(engin, plaine(), { duree: CHAUFFE });
  assert.ok(engin.chaudiere.pression > 4, 'la chauffe prépare le contraste');
  engin.chaudiere.niveauEau = 0;
  engin.citerne = 0;
  const pleine = engin.chaudiere.pression;
  engin.pousser();
  // Le réservoir de vapeur se vide, il ne se remplit plus : la pression ne fait
  // que descendre, et la machine rend les tours avec.
  let plusHautQuePleine = false;
  for (let t = 0; t < 120; t += PAS) {
    M.pasDeTemps(engin, plaine(), PAS);
    if (engin.chaudiere.pression > pleine + 1e-9) plusHautQuePleine = true;
  }
  assert.equal(plusHautQuePleine, false, 'la pression est remontée alors que la chaudière était à sec');
  assert.ok(engin.chaudiere.pression < 2, `la pression tient à ${engin.chaudiere.pression.toFixed(1)} alors qu'il ny a plus d'eau à vaporiser`);
  assert.equal(engin.machine.cale, true, 'la machine tourne encore sans vapeur');
});

// 3
test('dans une côte raide, la machine reste prise à son point mort', () => {
  // Trois tonnes et demie sur une rampe de 15 % : a l'arret le couple ne suffit
  // plus, et la vapeur renfermée retient le piston. La machine ne repart pas du
  // premier coup de feu — elle est prise, comme sur route.
  const engin = course({}, { pente: 0.15 });
  assert.ok(Math.abs(engin.distance) < 1, `la machine a bouge de ${engin.distance.toFixed(1)} m dans cette cote ou elle devait rester`);
  assert.equal(engin.machine.cale, true, 'la machine aurait du rester prise au point mort dans cette cote');
});

// 4
test("une côte se prend de l'élan", () => {
  // La meme rampe, la meme machine : mais abordée avec de la vitesse. Ce qui
  // passe les points morts et monte la cote, ce n'est pas une piece qu'on achete
  // a l'atelier, c'est la masse de l'engin tout entier emportee a 5 km/h.
  assert.equal('volant' in M.CATALOGUE, false, 'le catalogue vend encore un volant : la machine ne doit pas son élan a une piece');

  const grimpeuse = lancee({}, { pente: 0.15 });
  assert.ok(grimpeuse.distance > 100, `abordée lancée, la machine n'a fait que ${grimpeuse.distance.toFixed(0)} m de la meme cote`);
  assert.equal(grimpeuse.machine.cale, false, 'lancée, la machine aurait du passer les points morts de cette cote');

  // La cote ne se paie pas en volants, elle se paie en temps : a lancement
  // egal, la rampe rend moins de route que le plat.
  const roulee = lancee({}, {}).distance;
  assert.ok(
    grimpeuse.distance < roulee,
    `la cote ne coute rien : ${grimpeuse.distance.toFixed(0)} m contre ${roulee.toFixed(0)} m a plat`
  );
});

// 5
test("sans avance à l'admission, la machine retombe à son point mort", () => {
  // L'excentrique est la pièce qui donne l'avance : calé droit, ou absent, il ne
  // rouvre la vapeur qu'une fois le piston lancé. Un élan ne suffit plus, et la
  // vapeur scellée retient la machine. C'est une piece du garage, pas un reglage.
  const sansExcentrique = M.nouvelEngin(MACHINE.filter((id) => id !== 'excentrique'));
  sansExcentrique.soute = 4000;
  sansExcentrique.citerne = 4000;
  sansExcentrique.commandes.feu = 1;
  sansExcentrique.commandes.regulateur = 1;
  demarrer(sansExcentrique, plaine());
  assert.equal(sansExcentrique.machine.cale, true, "sans excentrique, la machine aurait dû rester prise au point mort malgré l'élan");

  const avecAvance = course({}, {});
  assert.equal(avecAvance.machine.cale, false, 'la même machine, avec son avance, aurait dû partir du premier élan');
});

// 6
test('une machine à double effet produit un travail utile sur les deux courses', () => {
  const { aller, retour } = M.travailParCourse({ pressionAdmission: 6, avance: M.AVANCE_NOMINALE });
  assert.ok(aller > 0, `course d'avant sans travail utile : ${aller.toFixed(2)}`);
  assert.ok(retour > 0, `course d'arrière sans travail utile : ${retour.toFixed(2)}`);
  const ecart = Math.abs(aller - retour) / Math.max(aller, retour);
  // La tige du piston mange une partie de la surface : les deux courses ne sont
  // jamais identiques au pourcentage près, mais elles travaillent l'une et l'autre.
  assert.ok(ecart < 0.35, `les deux courses sont trop déséquilibrées pour une machine à double effet : ${ecart.toFixed(2)}`);
});

// 7
test("un circuit fermé vapeur-pompe-roue à eau rend toujours moins qu'il ne prend", () => {
  const net = M.boucleCircuitFerme({ masse: 10, hauteur: 4, rendementRoue: 0.7, rendementPompe: 0.7 });
  assert.ok(net < 0, `le circuit fermé rend du travail pour rien : ${net.toFixed(1)}`);

  // Et sur l'engin : le bassin une fois rempli, le montage est livré à lui-même.
  const engin = M.nouvelEngin(['roues', 'pompe', 'roue_a_eau']);
  engin.circuit.haut = 30;
  engin.commandes.circuit = 1;
  engin.commandes.pompe = 1;
  rouler(engin, plaine({ riviere: false, circuit: { hauteur: 4 } }), { duree: 60 });
  assert.ok(engin.circuit.haut < 0.5, `il reste ${engin.circuit.haut.toFixed(1)} d'eau au bassin : le montage se serait entretenu`);
  assert.ok(Math.abs(engin.distance) < 8, `le montage auto-alimenté a parcouru ${engin.distance.toFixed(1)} m avec sa propre eau`);
});

// 8
test('une roue à eau posée sur la rivière donne du mouvement sans rien brûler', () => {
  const engin = M.nouvelEngin(['roue_a_eau', 'roues']);
  const bilan = rouler(engin, plaine({ riviere: true }), { duree: 30 });
  assert.ok(engin.distance > 5, `la roue à eau n'a rien entraîné (${engin.distance.toFixed(1)} m)`);
  assert.equal(bilan.charbonBrule, 0, 'la rivière a brûlé du charbon');
});

// 9
test('le changement de marche inverse le mouvement', () => {
  const avant = course({}, {});
  assert.ok(avant.distance > 40, `marche avant : ${avant.distance.toFixed(1)} m`);

  const recul = machineVapeur();
  recul.machine.marche = 'arriere';
  demarrer(recul, plaine()); // le chauffeur donne le coup de barre du côté demandé
  assert.ok(recul.distance < -40, `marche arrière : ${recul.distance.toFixed(1)} m`);
});

// 10
test('un tiroir qui recouvre trop garde la machine au point mort', () => {
  // Le recouvrement, c'est la largeur du tiroir sur ses lumières. Plus il est
  // grand, plus la vapeur renfermée est comprimée avant de rouvrir : le ressort
  // du point mort se durcit. A ce reglage la machine ne part plus d'un simple
  // coup de barre — il lui faut de l'elance, et elle ne le sait qu'au depart.
  const auDepart = course({ recouvrement: 0.6 }, {});
  assert.equal(auDepart.machine.cale, true, 'a ce recouvrement, la machine aurait du rester prise au depart');

  const lancee = (() => {
    const engin = machineVapeur({ recouvrement: 0.6 });
    rouler(engin, plaine(), { duree: CHAUFFE });
    engin.pousser(4); // deux hommes sur le levier, pas un
    rouler(engin, plaine(), { duree: 60 });
    return engin;
  })();
  assert.equal(lancee.machine.cale, false, 'un grand elan aurait du sortir cette machine de son point mort');
  assert.ok(lancee.distance > 60, `la machine n'a parcouru que ${lancee.distance.toFixed(0)} m une fois lancee`);

  // Et ce réglage ne rend pas plus de travail pour autant : le tiroir avare
  // raccourcit l'admission.
  const large = M.travailParCourse({ pressionAdmission: 6, avance: M.AVANCE_NOMINALE, recouvrement: 0.7 });
  const nominal = M.travailParCourse({ pressionAdmission: 6, avance: M.AVANCE_NOMINALE });
  assert.ok(large.aller < nominal.aller, 'un tiroir a long recouvrement ne volerait rien a la vapeur');
});

// 11
test('la vapeur qui siffle par la soupape a brûlé du charbon pour rien', () => {
  // Machine bloquée, feu à fond : la pression est plafonnée par la soupape, le
  // charbon part, et rien ne tourne. C'est ça que le Rendement du jeu sanctionne.
  const engin = machineVapeur();
  rouler(engin, plaine(), { duree: 90 });
  const bilan = engin.bilan();
  assert.equal(engin.distance, 0, 'une machine quon ne pousse pas devrait rester à sa place');
  assert.ok(engin.chaudiere.soupapeSiffle, 'à fonds perdus et sans soutirage, la soupape devrait siffler');
  assert.ok(engin.chaudiere.pression <= M.PRESSION_MAX, 'la soupape ne protège plus rien');
  assert.ok(bilan.charbonBrule > 5, `le foyer a brûlé ${bilan.charbonBrule.toFixed(1)} kg sans rien faire tourner`);

  // A distance egale, une machine qui patine dans une forte rampe brule plus :
  // les roues tournent, la machine ne monte pas, et la vapeur part.
  const route = (pente) => {
    const e = machineVapeur();
    rouler(e, plaine({ pente }), { duree: CHAUFFE });
    e.pousser(4);
    const b = rouler(e, plaine({ pente }), { duree: 1200, distanceCible: 120 });
    return { ...b, distance: Math.abs(e.distance), patine: e.machine.patine };
  };
  const seche = route(0);
  const glissante = route(0.35);
  assert.equal(glissante.patine, true, 'dans cette rampe, les roues devraient patiner sur lacier');
  assert.equal(seche.patine, false, "a plat, les roues n'ont aucune raison de patiner");
  assert.ok(
    glissante.charbonBrule / glissante.distance > 1.5 * (seche.charbonBrule / seche.distance),
    `patiner ne devrait pas payer : ${(glissante.charbonBrule / glissante.distance).toFixed(2)} contre ${(seche.charbonBrule / seche.distance).toFixed(2)} kg par mètre`
  );
});

// 12
test('la vapeur usée chassée par la tuyère active le feu', () => {
  assert.ok(M.appelDair({ vapeurEchappee: 1 }) > M.appelDair({ vapeurEchappee: 0 }), "l'échappement ne change rien au tirage");

  const avecBoite = machineVapeur();
  const sansBoite = M.nouvelEngin(MACHINE.filter((id) => id !== 'boite_a_fumee'));
  sansBoite.soute = 4000;
  sansBoite.citerne = 4000;
  sansBoite.commandes.feu = 1;
  sansBoite.commandes.regulateur = 1;
  for (const engin of [avecBoite, sansBoite]) {
    rouler(engin, plaine(), { duree: CHAUFFE });
    assert.ok(engin.chaudiere.pression > 3, 'la chauffe devrait donner de la pression');
    engin.pousser();
    rouler(engin, plaine(), { duree: 40 });
  }
  assert.ok(
    avecBoite.machine.tours > sansBoite.machine.tours * 1.2,
    `la tuyère ne donne pas plus de mouvement à charbon égal : ${avecBoite.machine.tours.toFixed(1)} tours contre ${sansBoite.machine.tours.toFixed(1)}`
  );
});

// 13
test('serrer le régulateur ne rend jamais la machine plus rapide', () => {
  // Le curseur dose la vapeur : du grand ouvert au fermé d'aplomb, la vitesse ne
  // peut pas remonter. On part du même régime établi à chaque crantée, comme un
  // élève qui refait l'essai sans toucher à rien d'autre.
  // On mesure la vitesse moyenne de la fenêtre : une machine à un seul cylindre
  // pulse d'un quart de tour à l'autre, et ce n'est pas ce battement qui répond à
  // la question. Reste la distance couverte en deux minutes.
  const ROULE = 0.5;    // km/h : au-dessous, la machine est prise et tangue d'un bord sur l'autre
  const TANGAGE = 0.1;  // km/h : ce que vaut ce tangage, et qu'on ne compte pas pour de la vitesse
  const CRANTEES = [100, 90, 80, 70, 60, 50, 45, 40, 36, 34, 32, 30, 25, 20, 15, 10, 6, 4, 3, 2, 1, 0];
  const FENETRE = 120;
  const vitesses = CRANTEES.map((pourCent) => {
    const { engin, monde } = etablie({ regulateur: pourCent / 100, lance: 150 });
    const depart = engin.distance;
    rouler(engin, monde, { duree: FENETRE });
    return { pourCent, kmh: Math.abs(engin.distance - depart) / FENETRE * 3.6, cale: engin.machine.cale };
  });
  for (let i = 1; i < vitesses.length; i += 1) {
    const avant = vitesses[i - 1];
    const courant = vitesses[i];
    const message = `le régulateur rendu plus serré rend la machine plus vite : ${avant.pourCent} % donne ${avant.kmh.toFixed(2)} km/h, ${courant.pourCent} % donne ${courant.kmh.toFixed(2)} km/h`;
    if (avant.kmh >= ROULE) assert.ok(courant.kmh < avant.kmh, message);
    assert.ok(courant.kmh <= avant.kmh + TANGAGE, message);
  }
  assert.ok(vitesses[0].kmh > 4, `ouverte à fond, la machine ne fait que ${vitesses[0].kmh.toFixed(2)} km/h`);
  const fermee = vitesses[vitesses.length - 1];
  assert.ok(fermee.kmh < 0.2, `fermée d'aplomb, la machine avance encore à ${fermee.kmh.toFixed(2)} km/h`);
  assert.equal(fermee.cale, true, "fermée d'aplomb, la machine n'est pas tenue pour prise");
});

// 14
test("fermée à chaud, la machine rend son élan et la chaudière garde sa pression", () => {
  // Le régulateur est un robinet, pas un compteur : fermé, il affame le cylindre.
  // La machine perd ce qu'elle avait, comme à qui l'on coupe la vapeur, et la
  // chaudière, elle, monte faute de soutirage.
  const { engin, monde } = etablie();
  assert.ok(engin.vitesse() > 0.5, 'la machine ne roulait pas avant le geste');
  const pressionAvant = engin.chaudiere.pression;
  engin.commandes.regulateur = 0;
  rouler(engin, monde, { duree: 60 });

  assert.equal(engin.machine.cale, true, 'la machine fermée tourne encore');
  assert.ok(Math.abs(engin.vitesse()) < 0.01, `la machine fermée roule à ${(Math.abs(engin.vitesse()) * 3.6).toFixed(2)} km/h`);

  const distancePrise = engin.distance;
  rouler(engin, monde, { duree: 60 });
  assert.ok(
    Math.abs(engin.distance - distancePrise) < 0.5,
    `la machine a marché de ${(engin.distance - distancePrise).toFixed(1)} m la vapeur coupée`
  );

  assert.ok(
    engin.chaudiere.pression > pressionAvant + 0.5,
    `la chaudière ne remonte pas faute de soutirage : ${pressionAvant.toFixed(2)} puis ${engin.chaudiere.pression.toFixed(2)}`
  );
  assert.ok(engin.chaudiere.soupapeSiffle, 'la vapeur de trop ne s\'en va pas par la soupape');
  assert.ok(engin.chaudiere.pression <= M.PRESSION_MAX, 'la soupape ne protège plus rien');
});

// 15
test("rien n'avance sans vapeur : la machine fermée roule sur son élan, pas sur du vide", () => {
  // Trois kilomètres en deux minutes sans brûler un kilo : c'est le travail qui
  // sort de nulle part, et c'est le mensonge que cette promesse enterre. Fermée,
  // la machine ne doit plus rien avoir à payer, donc plus rien à parcourir — et
  // le charbon du foyer, lui, continue de partir pour rien.
  const FENETRE = 120;
  const mesure = (regulateur) => {
    const { engin, monde } = etablie();
    engin.commandes.regulateur = regulateur;
    const avant = { distance: engin.distance, charbon: engin.charbonBrule };
    rouler(engin, monde, { duree: FENETRE });
    return {
      distance: Math.abs(engin.distance - avant.distance),
      charbon: engin.charbonBrule - avant.charbon,
    };
  };
  const ouverte = mesure(1);
  const fermee = mesure(0);

  assert.ok(ouverte.distance > 50, `à découvert, la machine ne fait que ${ouverte.distance.toFixed(0)} m`);
  assert.ok(
    fermee.distance < ouverte.distance / 4,
    `la vapeur coupée, la machine a parcouru ${fermee.distance.toFixed(0)} m contre ${ouverte.distance.toFixed(0)} m à découvert`
  );
  assert.ok(fermee.distance < 100, `la machine fermée a parcouru ${fermee.distance.toFixed(0)} m en ${FENETRE} s`);
  assert.ok(fermee.charbon > 40, `le foyer a brûlé ${fermee.charbon.toFixed(1)} kg pendant la fermeture`);
});

// 16
test("le coup de barre s'ajoute : il ne freine jamais la machine lancée", () => {
  // La barre espace est une secousse donnée au mouvement déjà là, dans le sens de
  // la marche. Sur une machine à son régime, elle la rend plus vite — et sur une
  // machine froide elle ne fait rien, faute de vapeur : la physique avant la
  // gentillesse.
  // Une machine à son régime tient ses tours du charbon, pas du bras du chauffeur :
  // la barre échappe aux mains sur une manivelle qui court plus vite que lui. Ce
  // qu'on lui demande, c'est de ne jamais reprendre le mouvement — c'est là que le
  // vieux modèle se trompait de signe, en assignant une vitesse au lieu d'en ajouter.
  const auRegime = etablie({ lance: 200 });
  const lancee = auRegime.engin.machine.vitesseAngulaire;
  assert.ok(lancee > 2, `la machine n'était pas lancée (${lancee.toFixed(2)} rad/s)`);
  auRegime.engin.pousser();
  assert.ok(
    Math.abs(auRegime.engin.machine.vitesseAngulaire) >= lancee,
    `la barre a freiné la machine lancée : ${lancee.toFixed(2)} puis ${auRegime.engin.machine.vitesseAngulaire.toFixed(2)} rad/s`
  );

  // là où deux bras suivent encore la manivelle, la secousse s'ajoute à l'élan.
  const trainante = etablie({ lance: 200 });
  trainante.engin.machine.vitesseAngulaire = 1;
  trainante.engin.pousser();
  assert.ok(
    trainante.engin.machine.vitesseAngulaire > 1.39,
    `la barre n'a rien ajouté à la machine qui traîne : 1,00 puis ${trainante.engin.machine.vitesseAngulaire.toFixed(2)} rad/s`
  );

  // En marche arrière, la secousse pousse du même côté que la machine.
  const recul = etablie({ lance: 200 });
  recul.engin.machine.marche = 'arriere';
  rouler(recul.engin, recul.monde, { duree: 120 });
  const vitesseDeRecul = recul.engin.machine.vitesseAngulaire;
  assert.ok(vitesseDeRecul < -2, `la machine ne reculait pas (${vitesseDeRecul.toFixed(2)} rad/s)`);
  recul.engin.pousser();
  assert.ok(
    Math.abs(recul.engin.machine.vitesseAngulaire) >= Math.abs(vitesseDeRecul),
    `la barre a freiné la marche arrière : ${vitesseDeRecul.toFixed(2)} puis ${recul.engin.machine.vitesseAngulaire.toFixed(2)} rad/s`
  );
  recul.engin.machine.vitesseAngulaire = -1;
  recul.engin.pousser();
  assert.ok(
    recul.engin.machine.vitesseAngulaire < -1.39,
    `la barre n'a rien ajouté au recul : -1,00 puis ${recul.engin.machine.vitesseAngulaire.toFixed(2)} rad/s`
  );

  // Prise à son point mort, la barre la décroche : c'est son emploi premier.
  const auPointMort = machineVapeur();
  rouler(auPointMort, plaine(), { duree: CHAUFFE });
  assert.equal(auPointMort.machine.cale, true, 'cette machine n\'était pas prise à son point mort');
  auPointMort.pousser();
  assert.equal(auPointMort.machine.cale, false, 'la barre n\'a pas décroché la machine de son point mort');
  rouler(auPointMort, plaine(), { duree: 40 });
  assert.equal(auPointMort.machine.cale, false, 'décrochée, la machine s\'est reprisée à son point mort');

  // Froide, la secousse ne fait pas tourner : rien à pousser dans le cylindre.
  const froide = machineVapeur({ feu: 0 });
  rouler(froide, plaine(), { duree: 20 });
  froide.pousser();
  rouler(froide, plaine(), { duree: 10 });
  assert.ok(Math.abs(froide.distance) < 1, `la machine froide a parcouru ${froide.distance.toFixed(1)} m sur une secousse`);
  assert.equal(froide.machine.cale, true, 'la machine froide tourne sur une secousse sans vapeur');
});

// 17
test('ce qui retient la machine ne la pousse pas', () => {
  // L'injecteur mange une part du travail de la machine : c'est une bride sur
  // l'arbre, donc une force contre le mouvement, jamais un moteur. Comptée tout nu
  // dans la soustraction, il retenait la machine en marche avant et la poussait en
  // arrière : régulation fermée, à plat, l'engin partait en recul et labourait
  // près de 50 m en cinq minutes sans un grain de vapeur au cylindre.
  const chemin = (regulateur) => {
    const engin = machineVapeur({ regulateur });
    const monde = plaine();
    rouler(engin, monde, { duree: CHAUFFE });
    engin.pousser();
    const depart = engin.distance;
    rouler(engin, monde, { duree: 300 });
    return engin.distance - depart;
  };
  for (const regulateur of [1, 0.5, 0.2, 0.01, 0]) {
    const par = chemin(regulateur);
    assert.ok(par > -1, `régulateur à ${regulateur}, la machine a reculé de ${(-par).toFixed(1)} m dans le vide`);
  }
});

// --- Le billet #18 : la machine sent les pièces que l'établi peut démonter ------
//
// Les dix promesses qui suivent sont écrites à la manière du billet : une phrase au
// présent, une pièce qui part, et ce que la machine fait ensuite. Elles sont mesurées
// dans les conditions que le billet a utilisées pour se plaindre — machine du lever de
// rideau (feu 0,8, régulateur ouvert), lancée à 1,50 m/s, la pièce retirée EN MARCHE,
// et vingt secondes de marche après le geste — afin qu'aucune d'elles ne tienne grâce
// à un banc mieux loti que le joueur. Le détail des chiffres est à
// ~/.cache/moteur-vapeur-verifs/ticket18/.
//
// Ce que mesurait le billet, mesuré ici avant de toucher au modèle : sur les treize
// pièces de l'engin d'ouverture, dix ne changeaient rien de visible (et `excentrique`
// pour trois centièmes de mètre par seconde) — seule la vitesse comptait. Le modèle ne
// consultait que le foyer, le cylindre, la boîte à fumée, l'excentrique, le régulateur,
// la tuyère et la soupape. Les promesses qui suivent tiennent la réparation pièce par
// pièce, et la dernière tient la règle qui empêche le trou de se rouvrir.
const FEU_DU_LEVER = 0.8;
const VITESSE_DU_LEVER = 1.5;
const FENETRE = 20;

// Le geste du billet, écrit une fois : une pièce ôtée (ou aucune, pour le témoin) sur
// une machine lancée, et ce qu'elle devient pendant `duree` secondes.
//
// Vingt secondes, et la vitesse *moyenne* de la fenêtre : avec un cylindre unique,
// l'instantanée bat d'un quart de tour à l'autre et peut lire zéro sur un point mort
// sans que la machine s'arrête. Le billet mesurait l'instantanée ; s'en servir pour
// promettre un arrêt en serait un autre.
function demontage(id, { monde = plaine(), duree = FENETRE } = {}) {
  const engin = machineVapeur({ feu: FEU_DU_LEVER, regulateur: 1 });
  rouler(engin, plaine(), { duree: 40 });
  engin.pousser();
  let t = 0;
  while (t < 200 && Math.abs(engin.vitesse()) < VITESSE_DU_LEVER) {
    rouler(engin, plaine(), { duree: 0.25 });
    t += 0.25;
  }
  assert.ok(
    Math.abs(engin.vitesse()) >= VITESSE_DU_LEVER,
    `la machine du lever de rideau n'atteint jamais ${VITESSE_DU_LEVER} m/s : la mesure du billet n'a plus de point de départ`
  );
  const avant = {
    distance: engin.distance, charbon: engin.charbonBrule, eau: engin.eauPompee,
    soute: engin.soute, citerne: engin.citerne,
  };
  if (id) engin.debrancher(id);
  rouler(engin, monde, { duree });
  return {
    engin,
    moyenne: (engin.distance - avant.distance) / duree,
    trajet: engin.distance - avant.distance,
    charbon: engin.charbonBrule - avant.charbon,
    eau: engin.eauPompee - avant.eau,
    charbonEfface: avant.soute - engin.soute,
    eauEffacee: avant.citerne - engin.citerne,
    vitesse: engin.vitesse(),
    omega: engin.machine.vitesseAngulaire,
    pression: engin.chaudiere.pression,
    niveau: engin.chaudiere.niveauEau,
    aSec: engin.chaudiere.aSec,
    cale: engin.machine.cale,
    patine: engin.machine.patine,
  };
}

// 18
test('une chaudière ôtée ne tient plus la vapeur', () => {
  // Ce que la chaudière tient, c'est la vapeur. Le modèle ne le demandait pas : la
  // jauge montait, le cylindre poussait et le feu brûlait pour une enveloppe que le
  // joueur avait emportée ailleurs. Sans elle, plus rien de tenu et plus rien de
  // poussé — et la facture continue, parce que le charbon sur la grille ne sait pas
  // que l'enveloppe est partie.
  const temoin = demontage(null, { duree: 60 });
  const sans = demontage('chaudiere', { duree: 60 });
  assert.ok(sans.pression < 1.05, `la pression est encore de ${sans.pression.toFixed(2)} bar sans chaudière : la vapeur reste tenue quelque part`);
  assert.ok(temoin.pression - sans.pression > 3, `la jauge ne descend pas quand on ôte l'enveloppe (${sans.pression.toFixed(2)} contre ${temoin.pression.toFixed(2)} bar au témoin)`);
  assert.ok(sans.trajet < 10, `la machine a parcouru ${sans.trajet.toFixed(1)} m sans chaudière (témoin ${temoin.trajet.toFixed(0)} m)`);
  assert.equal(sans.cale, true, 'une machine sans chaudière continue de tourner');
  assert.ok(sans.charbon > 0, "le feu s'est éteint avec la chaudière : le démontage ne coûte plus rien, il ne reste que le gain");
  assert.ok(sans.charbon > temoin.charbon * 0.5, `le feu n'a brûlé que ${sans.charbon.toFixed(1)} kg contre ${temoin.charbon.toFixed(1)} au témoin : il ne tourne plus rond, il est coupé`);
  assert.equal(sans.niveau, 1, "l'eau de la chaudière a bougé : ce qui manque à la machine, ce n'est pas l'eau");
});

// 18
test('une chaudière remontée reprend son métier', () => {
  // Démonter doit être réversible : la jauge doit remonter quand la pièce revient,
  // sinon le geste du billet est un piège et non une leçon. Le redémarrage à chaud,
  // lui, obéit à la promesse 3 : une machine calée sur son point mort a besoin d'un
  // élan que la seule pression ne lui donne pas.
  const { engin } = demontage('chaudiere', { duree: 60 });
  assert.ok(engin.chaudiere.pression < 1.05, 'la chaudière nétait pas tombée à la pression ambiante avant le remontage');
  engin.brancher('chaudiere');
  rouler(engin, plaine(), { duree: 150 });
  assert.ok(engin.chaudiere.pression > 4, `remontée, la chaudière n'a fait que ${engin.chaudiere.pression.toFixed(2)} bar en 150 s de feu`);
});

// 18
test('sans roues, la machine navance pas', () => {
  // La vitesse dite du voyage est celle des roues rapportée au sol (`vitesse`). Le
  // billet demandait de trancher : « ω × rayon est un choix de modélisation qui
  // devient faux quand on démonte la roue ». Le voici écrit : pas de roues, pas de
  // vitesse — pas une vitesse de manivelle déguisée en vitesse de voyage. L'arbre,
  // lui, tourne plus vite qu'avant : il n'y a plus rien à traîner.
  const temoin = demontage(null);
  const sans = demontage('roues');
  assert.equal(sans.vitesse, 0, `la machine annonce ${sans.vitesse.toFixed(2)} m/s sans roues`);
  assert.equal(Math.abs(sans.trajet) < 1e-9, true, `l'engin a parcouru ${sans.trajet.toFixed(3)} m sans roues`);
  assert.ok(Number.isFinite(sans.engin.distance) && Number.isFinite(sans.omega), "l'absence de roues rend un nombre que l'écran ne saurait pas dessiner");
  assert.ok(sans.omega > temoin.omega, `l'arbre ne tourne même pas plus vite sans rien à tirer (${sans.omega.toFixed(2)} contre ${temoin.omega.toFixed(2)})`);
  assert.equal(sans.patine, true, "l'entraînement qui file dans le vide ne s'appelle pas patiner : le mot rendu à l'écran est « Patine »");
  assert.ok(sans.charbon > 0, 'le charbon, lui, ne demande pas les roues');
});

// 18
test('sans roues, la rampe ne retient plus rien non plus', () => {
  // Le revers de la même décision, écrit parce qu'il se paie : une machine sans roues
  // ne prend plus au sol, donc le relief ne peut plus rien lui reprendre. Elle ne
  // monte pas la rampe pour autant — elle n'avance pas du tout. Garder le soulèvement
  // pour la seule roue absente serait le vrai mensonge, celui quaucune image ne
  // couvre (ADR 0010).
  for (const pente of [0.06, 0.15]) {
    const grimpe = demontage(null, { monde: plaine({ pente }) });
    const sans = demontage('roues', { monde: plaine({ pente }) });
    assert.ok(grimpe.trajet > 5, `témoin à ${pente * 100} % : la machine na fait que ${grimpe.trajet.toFixed(1)} m, la mesure ne montre rien`);
    assert.equal(Math.abs(sans.trajet) < 1e-9, true, `roues ôtées, la machine a parcouru ${sans.trajet.toFixed(3)} m sur une rampe à ${pente * 100} %`);
  }
});

// 18
test('sans tiroir, la vapeur passe et ne pousse rien', () => {
  // Le tiroir est la distribution elle-même. Ôté, les deux glaces appellent la vapeur
  // vive en même temps : aucun couple, et un chemin grand ouvert par où la chaudière
  // se vide. Le modèle ne dit plus « distribution par défaut » — il dit qu'il n'y a
  // plus de distribution du tout, et il en laisse la trace à la jauge.
  const temoin = demontage(null);
  const sans = demontage('tiroir');
  assert.ok(sans.trajet < 5, `la machine a parcouru ${sans.trajet.toFixed(1)} m sans tiroir (témoin ${temoin.trajet.toFixed(0)} m)`);
  assert.equal(sans.cale, true, 'une machine sans distribution continue de tourner');
  assert.ok(temoin.pression - sans.pression > 0.8, `la chaudière ne se vide pas plus vite par le chemin libre (${sans.pression.toFixed(2)} contre ${temoin.pression.toFixed(2)} bar)`);
  assert.ok(sans.eau > 0, "linjecteur n'a plus rien à renvoyer : la chaudière n'est plus en train de bouillir, elle est morte");
});

// 18
test('sans crosse, le piston travaille pour personne', () => {
  // La crosse porte la tige, la bielle la transmet : ôtées, le cylindre respire tant
  // que l'arbre tourne et ne rend plus rien. Ce que la vapeur devient est écrit à
  // l'ADR 0010 : dépensée, pas perdue. Elle est passée, le charbon est brûlé, l'engin
  // ne bouge plus — et c'est la leçon, pas un bug à cacher.
  const temoin = demontage(null);
  const sans = demontage('crosse');
  assert.ok(sans.trajet < 5, `la machine a parcouru ${sans.trajet.toFixed(1)} m sans crosse (témoin ${temoin.trajet.toFixed(0)} m)`);
  assert.equal(sans.cale, true, 'une machine sans crosse transmet encore son travail');
  assert.ok(sans.eau > 0, "l'injecteur n'a rien poussé : la vapeur est coupée en amont, ce n'est pas le lien qui manque");
  assert.ok(sans.charbon > 0, 'le charbon brûlé sur la fenêtre est à zéro : démonter la crosse aurait éteint le feu');
});

// 18
test('sans bielle, le piston travaille pour personne', () => {
  // La seconde moitié du lien, promise pour elle-même : la bielle a son nom au
  // catalogue et sa ligne à l'établi, donc son retrait doit se voir au cylindre.
  const temoin = demontage(null);
  const sans = demontage('bielle');
  assert.ok(sans.trajet < 5, `la machine a parcouru ${sans.trajet.toFixed(1)} m sans bielle (témoin ${temoin.trajet.toFixed(0)} m)`);
  assert.equal(sans.cale, true, 'une machine sans bielle transmet encore son travail');
  assert.ok(sans.eau > 0, "l'injecteur n'a rien poussé sans bielle : le cylindre ne respire plus du tout");
  assert.ok(sans.charbon > 0, 'le feu sauté avec la bielle : la chaudière ne serait plus en feu');
});

// 18
test('sans soute, le charbon reste dans la soute', () => {
  // Le modèle brûlait `engin.soute` sans jamais demander si la soute était montée.
  // Tranché (ADR 0010) : le charbon est dans la pièce, pas dans la machine. Retirer
  // la soute ne l'efface pas — le billet #8 a une promesse écrite pour que démonter ne
  // mange rien d'autre que la masse — mais la machine n'y atteint plus. La jauge dit
  // « vide » parce qu'il n'y a plus de soute, et la pièce remontée rend ce qu'elle
  // contenait, ce qui évite le cul-de-sac tant que le charbonnage du billet #9
  // n'existe pas.
  const temoin = demontage(null, { duree: 60 });
  const sans = demontage('soute', { duree: 60 });
  assert.equal(sans.engin.charbonDisponible(), 0, 'la machine atteint encore son charbon sans soute');
  assert.equal(sans.charbonEfface, 0, `démonter la soute a effacé ${sans.charbonEfface.toFixed(1)} kg : le démontage mangerait la réserve`);
  assert.equal(sans.charbon, 0, `le feu a brûlé ${sans.charbon.toFixed(2)} kg sans soute`);
  assert.ok(temoin.pression - sans.pression > 2, `la jauge ne baisse pas sans charbon à la grille (${sans.pression.toFixed(2)} contre ${temoin.pression.toFixed(2)} bar)`);
  // Ce qu'elle parcourt encore est son élan (ADR 0008), pas le feu : la vitesse finit
  // par terre pendant que le témoin tient la sienne.
  assert.ok(sans.trajet < temoin.trajet * 0.4, `la machine a fait ${sans.trajet.toFixed(0)} m contre ${temoin.trajet.toFixed(0)} au témoin`);
  assert.ok(Math.abs(sans.vitesse) < 0.1, `la machine roule encore à ${sans.vitesse.toFixed(2)} m/s après une minute sans soute (témoin ${temoin.vitesse.toFixed(2)})`);
  sans.engin.brancher('soute');
  rouler(sans.engin, plaine(), { duree: 150 });
  assert.ok(sans.engin.chaudiere.pression > 4, 'la soute remontée ne rallume pas le foyer : le démontage est un piège');
});

// 18
test('sans citerne, l injecteur na plus où puiser', () => {
  // L'eau est dans la citerne comme le charbon dans la soute. Ôtée, la chaudière bout
  // ce qu'elle a — et puis s'assèche. C'est long, volontairement : une machine qui
  // s'arrête net quand on enlève un réservoir raconterait un réservoir qui n'existe
  // pas, et l'élève ne verrait jamais le lien entre leau partie et la vapeur qui
  // manque.
  const temoin = demontage(null, { duree: 240 });
  const sans = demontage('citerne', { duree: 240 });
  assert.equal(sans.engin.eauDisponible(), 0, "l'injecteur puise encore sans citerne");
  assert.equal(sans.eauEffacee, 0, `démonter la citerne a effacé ${sans.eauEffacee.toFixed(1)} L : le démontage mangerait la réserve`);
  assert.equal(sans.eau, 0, `l'injecteur a encore poussé ${sans.eau.toFixed(1)} L sans citerne`);
  assert.ok(sans.niveau < 0.06, `le niveau d'eau est encore à ${sans.niveau.toFixed(2)} : la chaudière ne s'assèche pas`);
  assert.equal(sans.aSec, true, 'la chaudière ne dit pas « à sec » après avoir tout bouilli sans réserve');
  assert.ok(Math.abs(sans.vitesse) < 0.05, `la machine roule encore à ${sans.vitesse.toFixed(2)} m/s après avoir tout bouilli`);
  assert.ok(temoin.vitesse > 1, `le témoin lui-même ne roule plus (${temoin.vitesse.toFixed(2)} m/s au bout de quatre minutes) : la mesure n'a plus de sens`);
});

// 18
test('le régulateur ôté laisse la vapeur grande ouverte', () => {
  // Ce que le modèle fait depuis le billet #17, et que personne navait écrit :
  // `pieces.regulateur` vaut faux et la conductance reste au maximum. Démonter une
  // commande ne coupe pas la machine, ça rend la commande muette — le sens honnête, et
  // le seul qui n'invente pas un état que le modèle ne sait pas tenir.
  const chemin = (retirer, regulateur) => {
    const engin = M.nouvelEngin(retirer ? MACHINE.filter((id) => id !== retirer) : MACHINE);
    engin.soute = 4000;
    engin.citerne = 4000;
    engin.commandes.feu = 1;
    engin.commandes.regulateur = regulateur;
    rouler(engin, plaine(), { duree: CHAUFFE });
    engin.pousser();
    return rouler(engin, plaine(), { duree: 120 });
  };
  const serre = chemin(null, 0);
  const muet = chemin('regulateur', 0);
  const ouvert = chemin(null, 1);
  assert.ok(muet.distance > serre.distance + 100, `régulateur ôté et levier fermé, la machine ne fait que ${muet.distance.toFixed(0)} m : démonter la commande a coupé la vapeur`);
  assert.ok(Math.abs(muet.distance - ouvert.distance) < ouvert.distance * 0.02, `régulateur ôté, la machine ne court pas comme le robinet grand ouvert (${muet.distance.toFixed(0)} m contre ${ouvert.distance.toFixed(0)} m)`);
});

// 18
test('une pièce que le modèle ne sent pas ne se démonte pas', () => {
  // Le critère qui empêche ce billet d'avoir servi à rien dans six mois. Une pièce du
  // catalogue na que deux façons dexister dans le modèle : soit le code la nomme
  // (`pieces.<id>`), soit elle n'apporte que sa masse et elle est inscrite à
  // `PIECES_A_MASSE_SEULE` avec sa raison. Une pièce nouvelle qui ne serait dans
  // aucune des deux colonnes rougit cette promesse — exactement le trou dans lequel
  // sont tombées les dix pièces du billet.
  const source = sourceModele();
  const masseSeule = M.PIECES_A_MASSE_SEULE;
  assert.ok(masseSeule, 'le modèle ne expose pas PIECES_A_MASSE_SEULE : la seconde colonne est introuvable');
  for (const [id, piece] of Object.entries(M.CATALOGUE)) {
    assert.match(id, /^[a-z_]+$/, `« ${id} » : cette promesse ne sait lire que des identifiants de lettres et de tirets bas`);
    const nommee = new RegExp(`pieces\\s*\\.\\s*${id}\\b`).test(source);
    const inscrite = Object.prototype.hasOwnProperty.call(masseSeule, id);
    assert.ok(
      nommee !== inscrite,
      nommee
        ? `« ${piece.nom} » (${id}) est nommée par le modèle ET inscrite à masse seule : choisis une colonne`
        : `« ${piece.nom} » (${id}) n'est dans aucune des deux colonnes : le modèle ne la sent pas et personne ne dit pourquoi. Traite-la (#18) ou inscris-la à PIECES_A_MASSE_SEULE avec sa raison.`
    );
    if (!inscrite) continue;
    const entree = masseSeule[id];
    assert.ok(typeof entree.raison === 'string' && entree.raison.length > 40, `« ${piece.nom} » est à masse seule sans dire pourquoi : la raison est la décision`);
    assert.equal(typeof entree.seDemonte, 'boolean', `« ${piece.nom} » doit dire à l'établi si elle se démonte (seDemonte)`);
  }
  for (const id of Object.keys(masseSeule)) {
    assert.ok(M.CATALOGUE[id], `la colonne des pièces à masse seule déclare « ${id} », que le catalogue ne connaît pas`);
  }
});
