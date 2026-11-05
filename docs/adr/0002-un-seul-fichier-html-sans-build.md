# Le jeu tient dans un seul `index.html`, sans build

Le jeu doit se jouer en double-cliquant sur le dépôt, hors ligne, sans installer quoi que ce soit : toute la logique, le dessin SVG et le style vivent dans un unique `index.html`, découpé en sections commentées. Un `npm install` et une ligne de commande entre la clone et le jeu seraient un obstacle entre un enfant et la machine à vapeur.

## Considered Options

- **Modules ES sans bundler** : éditables pièce par pièce, mais les `<script type="module">` sont bloqués en `file://` par la politique d'origine, donc il faudrait servir le dossier avec un serveur local — la promesse du double-clic tombe.
- **Sources multiples + script de collage** : réintroduit un build, donc un fichier publié qui peut être désynchronisé de ses sources. Refusé pour ne pas avoir deux vérités dans le dépôt.

## Consequences

Le fichier fera plusieurs milliers de lignes : la lisibilité vient des sections et de leurs commentaires, pas du découpage de fichiers. Les tests tournent sur le modèle physique isolé (`node --test`), pas sur le DOM ; le Playwright éventuel est un outil de développement du dépôt, jamais une dépendance du jeu.
