# À toute vapeur

Un jeu de construction pour comprendre ce qu'une machine à vapeur fait de la chaleur.

Le joueur monte un engin pièce par pièce dans un garage, lâche le feu, règle le régulateur, regarde
la manivelle tourner, et rend compte de ce que la machine a brûlé pour avancer. Il n'y a pas d'argent :
une pièce se paie en masse et en charbon, et c'est le modèle qui présente la facture.

Le jeu tient dans **un seul fichier**, `index.html`. Pas d'installation, pas de construction, pas de
dépendance, pas d'appel réseau : on télécharge le fichier, on double-clique, il marche hors ligne, sur
une tablette de classe comme sur un poste fixe.

## Y jouer

Ouvrir [`index.html`](index.html). C'est tout.

En ligne : <https://fcrozat.github.io/a-toute-vapeur/> — cette adresse ne répondra qu'une fois GitHub
Pages activé sur la branche par défaut.

Pensé pour le cycle 3 (CM2) : interface en français, cibles tactiles d'au moins 48 px, aucune
information portée par la seule couleur, aucune consigne qui exige de survoler quoi que ce soit.

## Ce que l'enfant apprend, et ce que le jeu ne raconte pas

- **La pression n'est pas la chaleur** : la chaudière monte, la soupape siffle, et pousser le feu ne
  fait pas avancer plus vite si la vapeur ne sort pas du tiroir.
- **La distribution fait le travail** : le tiroir, l'excentrique, l'avance et le recouvrement décident
  du moment où la vapeur entre et où elle s'échappe.
- **Les points morts se franchissent sur l'élan** : une machine arrêtée en pleine bande morte y reste,
  reprise par la vapeur qu'elle a renfermée. Il n'y a pas de volant-magie au catalogue — la masse en
  marche de l'engin entier fait office de volant ([ADR 0008](docs/adr/0008-pas-de-volant-la-machine-roule-sur-son-elance.md)),
  et c'est pour ça qu'on prend de la vitesse avant la bosse, jamais dedans.
- **Rien n'est gratuit** : le charbon part au rythme du feu, l'eau se transforme en vapeur et se boit,
  et une machine qui patine consomme sans produire de distance.

Le jeu refuse de mentir sur ce qu'il ne sait pas faire : avant le premier gramme de charbon, le
rendement n'est pas « 0 % », il n'a rien à dire.

## Les promesses

`npm test` — Node 18 ou plus, aucune dépendance à installer.

Les tests ne vérifient pas le code, ils tiennent parole au joueur. Douze promesses portent sur le
modèle physique — la machine cale où elle doit caler, roule quand elle est lancée, ne démarre pas
sans un grain de charbon — et les autres portent sur ce que l'écran affiche : si une promesse passe
alors que le dessin raconte autre chose, le jeu ment et la promesse est là pour le dire.

Le modèle n'est pas copié dans les tests : [`tests/harnais.js`](tests/harnais.js) va le lire dans
`index.html`, entre les bornes `MODELE`, `REGLES` et `PROJECTION`. Ce qui est testé est donc exactement
ce qui joue dans le navigateur, et rien de ce qui est testé ne prononce le mot `document`.

## Le dépôt

| Chemin | Ce qu'il contient |
| --- | --- |
| `index.html` | Le jeu entier : modèle physique, règles du jeu, dessin, interface, paroles de Braise. |
| `tests/` | Les promesses au joueur, et le harnais qui extrait le modèle du fichier. |
| `GLOSSARY.md` | Le vocabulaire fait autorité : ce qu'on appelle « machine à vapeur », « moteur », « élan », « patinage ». |
| `docs/adr/` | Neuf décisions conservées, avec ce qu'elles écartent et pourquoi. |
| `docs/agents/` | Comment travaillent les agents sur ce dépôt (suivi des tickets, étiquettes, domaine). |

## Règles du projet

Elles sont là parce que quelqu'un a payé pour les apprendre. Une décision qui les contredit s'écrit
dans un ADR, avant le code.

- **Un seul fichier, pour toujours** : pas de bundler, pas de CDN, pas de `import`, pas de réseau à
  l'exécution ([ADR 0002](docs/adr/0002-un-seul-fichier-html-sans-build.md)). Le jour où cette règle tombe, le jeu
  cesse de marcher sur la tablette sans fil du fond de la classe.
- **« Machine à vapeur » pour la machine, « moteur » pour l'installation**, et pas de synonyme
  ([ADR 0001](docs/adr/0001-machine-a-vapeur-contre-moteur.md)). Code, commentaires, tests et textes
  joueur en français ([ADR 0003](docs/adr/0003-code-en-francais.md)).
- **Le dessin ne fait pas de physique** : la projection lit l'état du jeu et en déduit de la géométrie.
  Elle ne somme aucune force, n'intègre rien, et n'affiche aucun nombre que le modèle n'ait produit.
- **Le modèle physique est gelé pendant qu'on construit l'interface** : ni une constante, ni une
  promesse reformulée pour arranger un écran. Quand le modèle est faux, on ouvre un billet pour le
  modèle — c'est comme ça que quatre mensonges sont sortis, dont deux que personne ne cherchait.
- **Le garage s'agrandit par le problème**, pas par la liste de courses
  ([ADR 0006](docs/adr/0006-le-garage-s-agrandit-par-le-probleme.md)) : une pièce verrouillée est
  invisible, et elle se débloque parce que la machine s'est comportée d'une façon que le joueur peut
  nommer.

## Licence

AGPLv3 pour le code ([LICENSE](LICENSE)), CC BY-SA 4.0 pour les dessins, les textes et les sons
([ADR 0007](docs/adr/0007-licence-agplv3.md)). Un enseignant qui
modifie le jeu doit repartager la modification ; un collègue qui s'en inspire n'a rien à démonter.

## État

Le jeu se construit ticket par ticket, découpés de la
[spécification](https://github.com/fcrozat/a-toute-vapeur/issues/2) : l'engin roule à l'écran, le feu
et le régulateur obéissent, la ligne et ses bosses existent, le garage s'ouvre. Ce qui reste — la
parole de Braise, le charbon et l'eau en route, la rivière, le vent, les rivales, le danger, puis la
relecture en classe — est dans les
[tickets ouverts](https://github.com/fcrozat/a-toute-vapeur/issues).
