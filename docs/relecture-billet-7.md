# Relecture du billet 7 — ce que Braise dit, et ce qui a été mesuré

Un fichier pour un humain. Il se lit dans cet ordre : d'abord jouer deux minutes, ensuite lire les phrases, enfin vérifier les chiffres. Rien ici ne se prouve tout seul : les promesses sont dans `tests/regles.test.js` (103 vertes), les mensonges d'avant sont rejouables avec `preuve-rouge.mjs` (rouge sur `cf52726`, vert sur la branche).

## 1. Jouer avant de juger (deux minutes)

Ouvrir `index.html` double-clic. Aucune aide, aucun texte au lancement : la ligne sous la machine est vide.

| # | Ce qu'on fait | Ce qui doit arriver |
|---|---|---|
| 1 | Lancer (touche `L` ou le bouton), attendre dix secondes | Un mot apparaît à droite (la pastille). La ligne de Braise reste vide : rien n'est *arrivé*. |
| 2 | Rouler jusqu'à la rampe du bout, couper la vapeur | Elle descend. Le rendement devient négatif : le nombre signé apparaît avec « du charbon pour reculer », jamais « attend le charbon ». |
| 3 | Donner un coup de barre (`Bar`) alors qu'elle roule vite | À plus de deux radians par seconde (environ 16 km/h), rien ne bouge et Braise dit : « La barre échappe : la manivelle va trop vite pour les mains. » |
| 4 | La laisser se faire secouer dans le creux (graine 1882, ou n'importe quel creux après un calage) | Au bout d'une seconde de bercement, une seule phrase : « Elle tâtonne : la vapeur la pousse d'un côté, le point mort la retient de l'autre. » Puis elle se tait, même si le bercement continue. |
| 5 | Couper sa parole (bouton « Braise », ou `T`) | Le titre est barré. Elle ne dit plus rien, et ne rattrape rien quand on rouvre. |
| 6 | Au garage, démonter la chaudière en marche | « Plus de chaudière : la vapeur ne se fabrique plus. » Une fois. Pas à chaque image. |
| 7 | Démonter la soupape, laisser le feu monter | La pastille dit la tôle qui travaille, la jauge ne dit plus « la soupape souffle » d'une machine sans soupape. |

Ce qu'on regarde à l'œil : **le mot de la pastille ne doit pas clignoter**. Il peut être faux de dix images sur vingt (pendant un bercement il garde un des deux noms que le modèle occupe) ; il ne doit pas danser.

## 2. Ses vingt-deux phrases

Elle ne dit **que** ces vingt-deux-là : le code n'en prononce pas d'autre, et rien de tout cela
n'est recopié du côté de la projection — une promesse le vérifie ligne à ligne.

Trois questions par ligne, à cocher à la main : le mot est-il juste ? un enfant de dix ans le comprend-il sans dictionnaire ? est-ce encore une constatation, pas une leçon ni un ordre ?

**Les sept situations**

|Clefréelle|Phrase|juste|dix ans|pas une leçon|
|---|---|---|---|---|
|danger|La tôle travaille : la vapeur n’a plus rien pour la rendre.| | | |
|sec|La chaudière est à sec : l’eau ne revient pas jusqu’à elle.| | | |
|arret|Rien ne tourne plus : le feu ne pousse pas la machine.| | | |
|cale|Elle est prise à son point mort : la vapeur comprimée la retient.| | | |
|patine|L’acier glisse sur l’acier : la vapeur part en tours à vide.| | | |
|souffle|La soupape souffle : le foyer a brûlé du charbon pour rien.| | | |
|roule|Elle roule : la vapeur pousse et les roues la prennent.| | | |

**Les deux faits neufs**

|Clefréelle|Phrase|juste|dix ans|pas une leçon|
|---|---|---|---|---|
|tatonne|Elle tâtonne : la vapeur la pousse d’un côté, le point mort la retient de l’autre.| | | |
|barre_echappee|La barre échappe : la manivelle tourne plus vite que les bras.| | | |

**Les treize pièces** qu'on peut emporter

|Pièce|Phrase|juste|dix ans|pas une leçon|
|---|---|---|---|---|
|chaudiere|Plus de chaudière : la vapeur n’a plus où naître.| | | |
|foyer|Plus de foyer : plus rien ne chauffe l’eau.| | | |
|soute|Plus de soute : le feu ne trouve plus de charbon à manger.| | | |
|citerne|Plus de citerne : l’eau n’a plus où attendre la chaudière.| | | |
|cylindre|Plus de cylindre : la vapeur n’a rien à pousser.| | | |
|tiroir|Plus de tiroir : la vapeur ne sait plus par où entrer.| | | |
|excentrique|Plus d’excentrique : le tiroir ne reçoit plus son avance.| | | |
|crosse|Plus de crosse : l’aller-retour du piston ne se transmet plus.| | | |
|bielle|Plus de bielle : le piston pousse pour personne.| | | |
|regulateur|Le régulateur est à terre : la vapeur passe sans être dosée.| | | |
|soupape|Plus de soupape : rien ne rend la vapeur de trop.| | | |
|roues|Plus de roues : l’arbre tourne et rien ne le prend.| | | |
|boite_a_fumee|Plus de boîte à fumée : la vapeur usée sort où elle peut.| | | |

Cinq lignes restent à juger **à voix haute**, et ce n'est pas moi qui tranche :
- `danger` — « la vapeur n’a plus rien pour la rendre » : le verbe *rendre* est celui du métier (la soupape rend la vapeur qu'on ne soutire pas), pas celui d'une cour de récréation. « la pression monte faute de soupape » dit la cause avec deux mots du glossaire.
- `patine` — « L’acier glisse sur l’acier » est repris mot pour mot du glossaire et le modèle est bien en acier sur acier (adhérence 0,3) ; « tours à vide » reste du jargon.
- `arret` — « le feu ne pousse pas la machine » attribue au feu ce qui est souvent le robinet fermé : la machine arrêtée régulateur ouvert et feu plein ne ment pas par ce mot-là.
- `roule` — « les roues la prennent » : le verbe vient du glossaire (organe qui « prend » la transmission), mais c'est la ligne la plus abstraite des sept.
- `foyer` — corrigée ici même : la première version disait « rien ne chauffe plus la vapeur », ce qui met la chaudière à l'envers (le feu chauffe l'eau, la vapeur est le résultat). Elle dit maintenant « plus rien ne chauffe l’eau ».

Aucune de ces lignes n'est reprise telle quelle dans une promesse : le texte se change dans `PAROLES`, et la promesse de forme (une ligne, du français, pas d'impératif, aucune clef qui partage sa phrase) continue de tenir.

## 3. Les chiffres, tels que mesurés

**Le clignotement.** Ligne du jeu : graine 1882, lancée 40 s à quatre fois la vitesse, puis 200 s de marche, une image sur 1/20 s. La parole brute du modèle changeait le mot **763 fois** — minimum 0,05 s entre deux mots, médiane 0,05 s, maximum 5,35 s. Balayage du temps de tenue (combien de temps un état doit durer pour être nommé) :

|tenue|0,05 s|0,1|0,2|0,3|0,4|**0,5**|0,75|1|2|
|---|---|---|---|---|---|---|---|---|---|
|changements à l'écran|487|73|13|7|3|**1**|1|1|1|

Une demi-seconde (dix images) est le plus petit palier qui nettoie la ligne. Après le billet : **3** changements de pastille sur les mêmes 200 secondes, et 8 phrases de Braise.

**Son rythme selon la vitesse.** Huit phrases en 200 s de marche à ×1, 12 à ×2, 9 à ×4 — ses temps sont du temps de machine, donc à ×4 une ligne toutes les quatre secondes d'écran.

**Le rendement qui descend.** Lancée à 35 km/h, vapeur coupée dans la rampe du bout (pente 0,3) : **-545,5 m pour 80,5 kg de charbon, soit -6,8**. L'écran écrivait « attend le charbon ». Il écrit maintenant « -6,8 m par kg » et « du charbon pour reculer ».

**Les litres.** 202 L dans une citerne (capacité 240 L) se disait « pleine » ; les mêmes 202 L avec une seconde citerne branchée (capacité 480 L) se disaient « basse ». Le mot change — c'est le niveau —, le nombre ne doit pas changer : c'est `chiffres`, et il est affiché.

**La barre.** À ω 1,99 rad/s la secousse porte la manivelle de 1,99 à 2,39 ; à ω 2,0001 elle ne la bouge pas d'un poil, et c'est là que sa phrase existe.

**La soupape.** Machine sans soupape montée à 12 bars : le modèle dit `soupapeSiffle` vrai (il n'a pas de pièce à regarder), la jauge ne doit plus dire « la soupape souffle ». Le danger, lui, passe : la tôle travaille bien.

**Le régulateur à terre.** Machine arrêtée dans la bande morte, levier fermé : démonter le régulateur ouvre le robinet en grand (mesuré : toujours immobile sans secousse, 43,6 m en vingt secondes après un coup de barre) et Braise nomme la pièce.

## 4. Ce qui n'a pas bougé, et où changer sa voix

- La section MODELE est **octet pour octet** celle de `cf52726` ; `git diff cf52726 -- tests/modele.test.js` est vide. Les six corrections sont des mots, pas des physiques.
- 87 promesses vertes avant, **103** après, aucune affaiblie. Les seize nouvelles sont groupées sous `Ticket 7 · Braise nomme ce qui vient de se passer` dans `tests/regles.test.js`.
- « La mémoire du jeu s'ouvre vide » a été réécrite, pas adoucie : elle comparait la mémoire à un objet littéral de trois cases et interdisait d'y rien ajouter. Elle tient la même intention et vérifie de plus qu'au lancement rien n'est dit, rien n'est refroidi, aucun mot n'est retenu.
- Pour lui changer la voix : `PAROLES`, dans la section REGLES de `index.html`. Pour changer ses temps : `TENUE_DU_MOT` (la pastille), `ENTRE_DEUX` (deux phrases), `REFROIDISSEMENT` (un même fait), `FENETRE_DE_TATONNEMENT` et `BASCULES_POUR_TATONNER` (le bercement), `CALM_D_UN_TATONNEMENT` (la fin d'une rafale). Rien de tout cela n'est dans le modèle, ni dans la projection.

## 5. Ce qu'elle ne dit pas encore

Le chemin (rampes, bosses, charbonnage), les récompenses du billet 10, et les pièces qu'on *branche* — elle ne nomme que ce qui part. Elle ne propose jamais de réparer : un montage qui cale a une cause, pas une marche à suivre. Elle ne parle pas deux fois du même fait dans les quinze secondes, et ne se rattrape pas de ce qu'elle a tu.
