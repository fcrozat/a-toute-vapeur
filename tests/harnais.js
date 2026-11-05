// Harnais de test : le modèle physique vit dans le fichier unique `index.html`
// (ADR 0002 : aucun build, double-clic obligatoire). Il est délimité par deux
// marques, et on va le chercher là sans le dupliquer ni le découper à la main.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MARQUE_DEBUT = '// ===== MODELE : DEBUT =====';
const MARQUE_FIN = '// ===== MODELE : FIN =====';

export function sourceModele() {
  const fichier = fileURLToPath(new URL('../index.html', import.meta.url));
  const source = readFileSync(fichier, 'utf8');
  const debut = source.indexOf(MARQUE_DEBUT);
  const fin = source.indexOf(MARQUE_FIN);
  if (debut < 0 || fin < 0 || fin < debut) {
    throw new Error(
      `Section modèle introuvable dans index.html : les marques « ${MARQUE_DEBUT} » et « ${MARQUE_FIN} » doivent l'encadrer.`
    );
  }
  return source.slice(debut + MARQUE_DEBUT.length, fin);
}

// Le modèle est un script simple, sans import : on l'évalue tel quel et on
// récupère l'objet qu'il déclare. Ce que voient les tests est donc exactement
// ce que le navigateur exécute.
export function chargerModele() {
  const fabrique = new Function(`${sourceModele()}\nreturn modeleVapeur;`);
  return fabrique();
}
