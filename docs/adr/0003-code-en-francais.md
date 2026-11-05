# Le code du jeu est écrit en français

Noms de variables, de fonctions et commentaires sont en français — `machine.pression`, `tiroir.ouvre()`, `calculeAdmission()` — comme l'interface. Le fichier unique est un support pédagogique autant qu'un programme : un élève de CM2 qui l'ouvre doit y retrouver les mots du jeu, et les notions à comprendre sont justement des mots (pression, admission, détente, volant).

## Considered Options

- **Code en anglais, interface en français** : la convention habituelle, meilleure pour les contributions extérieures, mais elle coupe le lien entre le mot affiché à l'écran et le mot qui le produit dans le code.
- **Noms en anglais, commentaires en français** : le pire des deux liens, selon nous — l'élève lit un commentaire qui explique un nom qu'il ne peut pas lire.

## Consequences

Les termes techniques anglais (cut-off, lead, valve gear) n'entrent pas dans le code ; le glossaire fait autorité pour le vocabulaire français. Les tests, écrits en français aussi, doivent rester lisibles par la même personne.
