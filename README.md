# 🏎️ Moteur Fou — l'atelier des moteurs impossibles

Un jeu tactile pour construire le moteur d'une voiture avec **n'importe quoi** :
de l'essence, du nucléaire, un hamster, de la colère, une licorne… puis le tester
sur une piste et essayer d'aller **le plus loin possible**.

Pensé pour un enfant de 11 ans sur **tablette Android**, mais marche aussi sur
ordinateur (souris + barre d'espace).

- Un seul fichier : `index.html` (76 Ko), **100 % hors-ligne**, sans compte, sans pub, sans réseau.
- 24 sources d'énergie · 9 moteurs · 12 équipements · 26 recettes secrètes.
- Chaque carte donne une **vraie information** de physique ou d'énergie (le solaire est
  propre mais faible, l'anti-matière est surpuissante et dangereuse…).
- Le record et les recettes trouvées sont sauvegardés dans la tablette.

---

## 1. Installer sur une tablette Android

### Méthode A — le fichier, comme une application (recommandée)

1. Copie `index.html` sur la tablette (clé USB, Files, Drive, Send Anywhere… ce qui te va).
2. Ouvre le fichier avec **Chrome** (appuyer dessus → *Chrome*).
   - Selon le gestionnaire de fichiers : *Ouvrir avec → Chrome*, ou dans Chrome
     `⋮ → Télécharger → index.html`.
3. Dans Chrome, menu `⋮` → **Ajouter à l'écran d'accueil** → *Ajouter*.

L'icône apparaît avec les applications, le jeu se lance en plein écran et **fonctionne
sans internet** (il n'appelle jamais rien d'extérieur).

> ⚠️ Ouvre bien le fichier **avec Chrome**, pas avec l'aperçu HTML d'un gestionnaire de
> fichiers : certains aperçus bloquent le glisser-déposer ou le son.

### Méthode B — petit serveur sur le réseau local (pratique si la tablette et le PC sont sur le même Wi-Fi)

```bash
cd moteur-v2
python3 -m http.server 8080        # puis, sur la tablette : http://IP_DU_PC:8080
```

Trouver l'IP du PC : `ip route get 1 | awk '{print $7; exit}'` (Linux) ou `ipconfig` (Windows).
Pense à autoriser le port 8080 dans le pare-feu.

### Méthode C — en ligne (pour jouer chez des amis)

**Le jeu est déjà en ligne : <https://fcrozat.github.io/a-toute-vapeur/>**

GitHub Pages sert la **racine de la branche `v2-q38Fn`**. Un `git push` sur cette branche
publie la nouvelle version en ~1 minute, sans autre formalité.

```bash
git push origin v2-q38Fn                                  # publier
github_status() { gh api repos/fcrozat/a-toute-vapeur/pages -q .status; }   # building | built
github_status; gh api -X POST repos/fcrozat/a-toute-vapeur/pages/builds     # recontruire sans nouveau commit
```

> ⚠️ **La branche publiée est un réglage du site, pas quelque chose que porte le code.**
> Le jour où `v2-q38Fn` part en merge sur `main`, `main` ne publiera **rien** tant que
> Pages pointera sur l'ancienne branche. Le re-pointer :
>
> ```bash
> gh api -X PATCH repos/fcrozat/a-toute-vapeur/pages \
>   -f 'source[branch]=main' -f 'source[path]=/'
> ```
> 
> Inversement, publier une branche expérimentale écrase l'URL pour tout le monde : il n'y
> a qu'un seul site par repo, pas d'URL de préversion par branche.

Deux détails qui comptent :

- `.nojekyll` (fichier vide, à la racine) désactive la compilation Jekyll. Pages sert
  l'arbre tel quel : sans lui, GitHub passe chaque push par Jekyll, qui ignore certains
  fichiers et ralentit la mise en ligne.
- Le repo s'appelait `moteur-vapeur` et a été renommé en `a-toute-vapeur`. **Pages ne
  redirige pas les URL après un renommage** : `https://fcrozat.github.io/moteur-vapeur/`
  est en 404, préviens qui a l'ancien lien dans ses favoris.

Comme le fichier est autonome, Netlify Drop ou Cloudflare Pages marchent aussi : glisse
`index.html`, une seule page suffit.

---

## 2. Comment on joue

1. **Glisse une source d'énergie ⚡** dans le capot de la voiture (ou tape simplement la carte : elle se pose toute seule).
2. **Ajoute un moteur ⚙️** au milieu, puis **un équipement 🎁** sur le toit.
3. Appuie sur **🚀 ESSAYER** : compte à rebours, la voiture démarre, la piste défile.
4. Trois fins possibles :
   - 🏁 **bout du temps** — l'essai dure 9,5 s ;
   - 🪫 **panne sèche** — le réservoir est vide (les petites énergies comme 🥤 ou 🍿 ne tiennent pas la distance) ;
   - 💥 **casse** — trop de risque, le moteur lâche.
5. Le résultat explique **quoi changer** pour faire mieux. `🔁` recommencer, `🛠️` modifier le moteur.

Autres boutons : `🎲` moteur au hasard · `🧹` vider le garage · `🔊` son · `❓` aide et recettes secrètes.
Tape une pièce déjà posée pour l'enlever.

**Le piège du jeu** : puissance ≠ distance. Un moteur-fusée 🚀 sur une canette de soda 🥤
fait un superb feu d'artifice de 200 mètres. Les ⭐ sur les cartes signalent les pièces
qui s'entendent bien, et les **recettes secrètes** (dans `❓`) donnent des bonus.

Clavier (ordinateur) : `Espace` = essayer / stop · `C` = vider · `R` = hasard.

---

## 3. Le modèle de calcul (pour régler le jeu)

Tout est dans `scoreBuild()` (vers la ligne 500) :

| Stat | Formule | Rôle |
|---|---|---|
| Puissance `pu` | `E × 14 × rendement × mods × bonus × compat` | accélère plus vite |
| Vitesse `kmh` | `22 + pu^0.72 × 4,2 × (0,8 + couple×0,25) + bonus` | vitesse de pointe |
| Autonomie `portee` | `A × 95 × auto × mods` | **le réservoir, en mètres** |
| Risque `risk` | `R × 6,2 × (1,5 − stabilité) × mods` | proba de casser pendant l'essai |
| Écologie `eco` | `source×0,55 + rendement×2,2 + mods` | bilan 🌱 affiché, sans effet sur la distance |

La distance réellement parcourue en 9,5 s vient de l'intégration de l'accélération
(`tickRun`). Mesuré sur les 2808 combinaisons possibles :

- puissance 8 → 479 ch, vitesse 44 → 520 km/h, autonomie 60 → 1710 m, risque 1 → 96 % ;
- **30 % des combinaisons tombent en panne sèche avant la fin** : c'est le moteur du jeu ;
- distances typiques : 110 m (hamster + pistons + frein à main) à ~700 m (meilleurs montages).

Leve `RUN_MAX` (ligne 487) pour des essais plus longs — plus il est grand, plus
l'autonomie compte et moins le record vient de la vitesse seule.

---

## 4. Ajouter ou modifier du matériel

Ouvre `index.html` avec un éditeur de texte (Bloc-notes, VS Code, Acode…). Le plus simple :
copie une ligne existante, change l'`id` et les valeurs. **Sauvegarde, recharge la page.**

### Une source d'énergie

```js
{id:'piment',nom:'Piment',emoji:'🌶️',E:6,A:2,R:6,eco:6,color:'#ff3b1f',fx:'storm',best:['fusee'],
 fact:'La capsaïcine trompe le cerveau : il croit voir un incendie et fournit 30 % de watts en plus.'}
```

`E` puissance (0-12) · `A` endurance (0-10) · `R` risque (0-10) · `eco` bilan 0-10 ·
`best` = moteurs bien compatibles (+15 %) · `fx` = effet visuel (vois `var FXS`) ·
`fact` = l'info affichée sous la voiture.

### Un moteur

```js
{id:'elytre',nom:'Ailes d’insecte',emoji:'🪽',rend:0.8,couple:1.2,stab:0.7,auto:1.3,vol:true,
 fact:'Une mouche bat des ailes 200 fois par seconde : portance énorme, mais pour 1 gramme.'}
```

`rend` rendement (multiplie la puissance) · `couple` (départ et vitesse) ·
`stab` stabilité (`risque ×(1,5 − stab)` : 1,3 = très solide) · `auto` conso ·
`vol:true` = la voiture décolle et gagne 20 % de vitesse.

### Un équipement

```js
{id:'ressorts',nom:'Ressorts géants',emoji:'🪀',mods:{auto:1.15,risque:0.8,vitesse:8},
 fact:'Une voiture à ressorts : 3 bonds et hop, plus de moteur.'}
```

Dans `mods` : `pu`, `auto`, `risque` (multiplicateurs), `stab`, `eco`, `vitesse` (ajouts),
`vol:true` pour voler. Les valeurs < 1 sont des malus (`pu:0.45` = −55 %).

### Une recette secrète

```js
{id:'piquant',nom:'Le plus piquant du monde',src:['piment'],mot:['fusee'],gad:['glace'],
 mods:{pu:1.8,risque:0.7},fx:'storm',
 tex:'Un piment dans une fusée, refroidi à la glace : ça pique, mais ça tient.'}
```

Mets `null` pour un emplacement libre (`gad:null` = n'importe quel équipement).
`mods` : `pu`, `auto`, `risque`, `stab`, `eco`, `vol`. `fx` change la piste et le ciel
(`rainbow`, `void`, `night`, `glitch`, `music`…). Une recette trouvée est cochée dans `❓`.

### Les comparaisons finales

`var REFS` (ligne 469) sert à traduire le record en images (« ça fait 140 voitures
garées »). Change les noms et les tailles pour blaguer avec l'enfant.

---

## 5. Sauvegarde, sons, pannes

- **Record et recettes** : dans le `localStorage` du navigateur (clé `moteurFou.v1`).
  Effacer les données de navigation = tout remettre à zéro. Chrome différent = record différent.
- **Le son ne démarre qu'après le premier appui** : c'est une règle des navigateurs
  (interdiction du son automatique). Le bouton `🔇` coupe tout.
- **Pas de son du tout** : vérifie que le profil « silencieux » de la tablette est désactivé.
- **Vibrations** : sur Android seulement, et seulement si le navigateur les autorise.
- Le jeu est en `100 % viewport`, gère le mode paysage/portrait et les encoches d'écran.

## 6. Ideas d'évolutions

- Un mode « mission » : « atteins 400 m avec moins de 20 % de risque ».
- Un classement par source d'énergie (le meilleur montage pour chaque carburant).
- Deux joueurs en simultané sur deux moitiés d'écran.
- Imprimer une fiche par source d'énergie pour jouer avec les cartes en vrai.
