// Les douze promesses du jeu (question Q44 du cadrage).
//
// Chaque test est une phrase qu'on promet au joueur : si l'une d'elles tombe,
// le jeu ment sur la machine à vapeur. Le rendu SVG vient après, jamais avant.
// Le modèle est lu dans index.html par tests/harnais.js — pas de copie.
//
// Deux mots de vocabulaire pour lire ce fichier :
//  - « cale » : la machine ne fait plus de tours, elle est prise à un point mort ;
//  - « recouvrement » : la largeur du tiroir sur ses lumières. Plus elle est
//    grande, plus la vapeur est comprimée avant de rouvrir — plus le point mort
//    est dur à franchir, et plus l'inertie du volant vaut son pesant.

import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerModele } from './harnais.js';

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

function machineVapeur({ volant = 0, pieces = [], feu = 1, regulateur = 1, recouvrement = null } = {}) {
  const engin = M.nouvelEngin([...MACHINE, ...pieces]);
  for (let i = 0; i < volant; i++) engin.brancher('volant');
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

// On monte en pression la machine à l'arrêt, puis on lui donne le coup de barre.
// L'ordre compte : aucune machine ne démarre sans élan, c'est déjà une leçon.
function demarrer(engin, monde, { chauffe = CHAUFFE, suite = 40 } = {}) {
  rouler(engin, monde, { duree: chauffe });
  assert.ok(engin.chaudiere.pression > 4, `la chaudière n'a pas monté en pression pendant la chauffe (${engin.chaudiere.pression.toFixed(1)})`);
  engin.pousser();
  rouler(engin, monde, { duree: suite });
  return engin;
}

const plaine = (regles = {}) => M.nouveauMonde(regles);
const course = (opts, regles) => demarrer(machineVapeur(opts), plaine(regles));

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
test('sous une charge forte, une machine sans volant cale à son point mort', () => {
  const engin = course({}, { pente: 0.2 });
  assert.equal(engin.machine.cale, true, 'sans volant, la machine aurait dû rester prise au point mort dans cette côte');
  assert.ok(Math.abs(engin.machine.vitesseAngulaire) < 0.15, 'une machine calée ne fait plus de tours');
});

// 4
test('un volant fait franchir les points morts à la même machine', () => {
  const engin = course({ volant: 1 }, { pente: 0.2 });
  assert.equal(engin.machine.cale, false, 'le volant aurait dû suffire à passer les points morts');
  assert.ok(engin.machine.tours > 20, `la machine n'a fait que ${engin.machine.tours.toFixed(1)} tours`);
});

// 5
test("sans avance à l'admission, la machine retombe à son point mort", () => {
  // L'excentrique est là : mais calé droit, il ne rouvre la vapeur qu'une fois le
  // piston lancé. Un élan ne suffit plus, et la vapeur scellée retient la machine.
  const sansAvance = machineVapeur({ volant: 1 });
  sansAvance.machine.avance = 0;
  demarrer(sansAvance, plaine());
  assert.equal(sansAvance.machine.cale, true, "sans avance, la machine aurait dû rester prise au point mort malgré l'élan");

  const avecAvance = course({ volant: 1 }, {});
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
  const engin = M.nouvelEngin(['roues', 'pompe', 'roue_a_eau', 'volant']);
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
  const avant = course({ volant: 1 }, {});
  assert.ok(avant.distance > 40, `marche avant : ${avant.distance.toFixed(1)} m`);

  const recul = machineVapeur({ volant: 1 });
  recul.machine.marche = 'arriere';
  demarrer(recul, plaine()); // le chauffeur donne le coup de barre du côté demandé
  assert.ok(recul.distance < -40, `marche arrière : ${recul.distance.toFixed(1)} m`);
});

// 10
test('plus le tiroir recouvre, plus il faut de volants pour passer les points morts', () => {
  // Le ladder complet, et c'est le troc du jeu entier : chaque cran de compression
  // demande un volant de plus, et chaque volant réclame son poids. Un tiroir à
  // long recouvrement détend la vapeur plus loin — donc il comprime plus fort
  // avant de rouvrir, et le point mort devient un piège.
  const sansVolant = course({ volant: 0, recouvrement: 0.6 }, {});
  const unVolant = course({ volant: 1, recouvrement: 0.6 }, {});
  assert.equal(sansVolant.machine.cale, true, 'à ce recouvrement, la machine sans volant aurait dû rester prise');
  assert.equal(unVolant.machine.cale, false, 'un volant aurait dû suffire à ce recouvrement');

  const unSeul = course({ volant: 1, recouvrement: 0.75 }, {});
  assert.equal(unSeul.machine.cale, true, 'un seul volant aurait dû rester pris avec ce tiroir à très long recouvrement');

  const trois = course({ volant: 3, recouvrement: 0.75 }, {});
  assert.equal(trois.machine.cale, false, 'trois volants auraient dû passer là où un seul reste pris');
});

test('mais chaque volant pèse plus lourd et grimpe moins bien', () => {
  const route = (volant) => course({ volant }, { pente: 0.1 }).distance;
  const [un, trois] = [route(1), route(3)];
  assert.ok(
    trois < un,
    `plus d'inertie ne doit pas vouloir dire plus de route en côte : le poids se paie (${trois.toFixed(1)} m contre ${un.toFixed(1)} m)`
  );
});

// 11
test('la vapeur qui siffle par la soupape a brûlé du charbon pour rien', () => {
  // Machine bloquée, feu à fond : la pression est plafonnée par la soupape, le
  // charbon part, et rien ne tourne. C'est ça que le Rendement du jeu sanctionne.
  const engin = machineVapeur({ volant: 1 });
  rouler(engin, plaine(), { duree: 90 });
  const bilan = engin.bilan();
  assert.equal(engin.distance, 0, 'une machine quon ne pousse pas devrait rester à sa place');
  assert.ok(engin.chaudiere.soupapeSiffle, 'à fonds perdus et sans soutirage, la soupape devrait siffler');
  assert.ok(engin.chaudiere.pression <= M.PRESSION_MAX, 'la soupape ne protège plus rien');
  assert.ok(bilan.charbonBrule > 5, `le foyer a brûlé ${bilan.charbonBrule.toFixed(1)} kg sans rien faire tourner`);

  // À distance égale, une machine qui patine dans une forte pente brûle plus.
  const route = (pente) => {
    const e = machineVapeur({ volant: 1 });
    rouler(e, plaine({ pente }), { duree: CHAUFFE });
    e.pousser();
    const b = rouler(e, plaine({ pente }), { duree: 900, distanceCible: 120 });
    return { ...b, patine: e.machine.patine };
  };
  const plainePlate = route(0);
  const glissante = route(0.45);
  assert.equal(glissante.patine, true, 'dans cette pente, les roues devraient patiner sur lacier');
  assert.ok(
    glissante.charbonBrule / glissante.distance > 1.5 * (plainePlate.charbonBrule / plainePlate.distance),
    `patiner ne devrait pas payer : ${(glissante.charbonBrule / glissante.distance).toFixed(2)} contre ${(plainePlate.charbonBrule / plainePlate.distance).toFixed(2)} kg par mètre`
  );
});

// 12
test('la vapeur usée chassée par la tuyère active le feu', () => {
  assert.ok(M.appelDair({ vapeurEchappee: 1 }) > M.appelDair({ vapeurEchappee: 0 }), "l'échappement ne change rien au tirage");

  const avecBoite = machineVapeur({ volant: 1 });
  const sansBoite = M.nouvelEngin(MACHINE.filter((id) => id !== 'boite_a_fumee'));
  sansBoite.soute = 4000;
  sansBoite.citerne = 4000;
  sansBoite.commandes.feu = 1;
  sansBoite.commandes.regulateur = 1;
  sansBoite.brancher('volant');
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
