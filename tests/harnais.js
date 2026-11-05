// Harnais de test : tout le jeu vit dans le fichier unique `index.html`
// (ADR 0002 : aucun build, double-clic obligatoire). Chaque section sans affichage
// est délimitée par sa propre paire de marques, et on va la chercher là sans la
// dupliquer ni la découper à la main.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Trois sections se passent le ballon : le modèle physique, puis les règles du
// jeu, qui lisent le modèle et rendent ce que l'écran affiche, puis la projection,
// seule à savoir qu'un navigateur existe. Les deux premières ne voient ni un pixel
// ni une touche — c'est une promesse, pas une convention.
const SECTIONS = {
  modele: { debut: '// ===== MODELE : DEBUT =====', fin: '// ===== MODELE : FIN =====' },
  regles: { debut: '// ===== REGLES : DEBUT =====', fin: '// ===== REGLES : FIN =====' },
  projection: { debut: '// ===== PROJECTION : DEBUT =====', fin: '// ===== PROJECTION : FIN =====' },
};

function sourceSection(nom) {
  const marques = SECTIONS[nom];
  const fichier = fileURLToPath(new URL('../index.html', import.meta.url));
  const source = readFileSync(fichier, 'utf8');
  const debut = source.indexOf(marques.debut);
  const fin = source.indexOf(marques.fin);
  if (debut < 0 || fin < 0 || fin < debut) {
    throw new Error(
      `Section ${nom} introuvable dans index.html : les marques « ${marques.debut} » et « ${marques.fin} » doivent l'encadrer.`
    );
  }
  return source.slice(debut + marques.debut.length, fin);
}

export function sourceModele() {
  return sourceSection('modele');
}

export function sourceRegles() {
  return sourceSection('regles');
}

// La projection ne se teste pas à l'image (spec, Testing Decisions) : on la lit
// comme du texte, pour vérifier qu'elle ne demande à l'état du jeu que ce qu'il
// rend vraiment.
export function sourceProjection() {
  return sourceSection('projection');
}

// Le modèle est un script simple, sans import : on l'évalue tel quel et on
// récupère l'objet qu'il déclare. Ce que voient les tests est donc exactement
// ce que le navigateur exécute.
export function chargerModele() {
  const fabrique = new Function(`${sourceModele()}\nreturn modeleVapeur;`);
  return fabrique();
}

// Les règles sont écrites à côté du modèle et s'appuient sur lui : on le leur
// donne comme il le reçoit à l'écran, sous le même nom. Ce que voient les tests
// est donc exactement ce que le navigateur exécute.
export function chargerRegles(modele = chargerModele()) {
  const fabrique = new Function('modeleVapeur', `${sourceRegles()}\nreturn reglesDuJeu;`);
  return fabrique(modele);
}
