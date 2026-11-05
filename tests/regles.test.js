// Les promesses de l'écran.
//
// Ici on n'ouvre pas le capot : on amène l'engin à un état par la couture
// physique (pasDeTemps), puis on interroge les règles — `situation`,
// `etatDuJeu` — telles que la projection les lit. La projection SVG et la
// boucle d'images ne se testent pas (spec, Testing Decisions) : c'est
// l'étroitesse d'`etatDuJeu` qui tient lieu de garde.
//
// Les règles sont extraites d'index.html par tests/harnais.js, comme le modèle,
// et reçoivent le modèle comme unique point de départ : elles ne voient ni un
// pixel ni une touche de clavier.

import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerModele, chargerRegles } from './harnais.js';

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
