# Relecture du billet 10 — ce qui s'ouvre, et ce que la ligne du jeu ne rencontre pas

Un fichier pour un humain. Il est écrit par `tests/outillage/ecrire-relecture-10.mjs` : ne
pas corriger à la main, corriger le jeu ou le générateur, puis rejouer
`node tests/outillage/ecrire-relecture-10.mjs` (une vingtaine de secondes).
Une promesse relit ce fichier ligne à ligne (`tests/regles.test.js`, « le feuillet de
relecture du billet dit ce que le code dit »). Le billet 7 avait eu le droit de pourrir en
une passe : quatorze phrases sur vingt-deux que le jeu ne prononçait plus.

## 1. Ce que le billet décide

Une pièce nouvelle vient de l'ennui rencontré, jamais d'un niveau franchi ni d'une monnaie
comptée (ADR 0006). Le garage tient une seule table de seuils. Les trois gags — l'éolipyle,
la fusée, la remorque — sont sur l'établi à la première image : leur punition est
automatique, ils pèsent, ils ne se gagnent pas.

|fait|nom|seuil|ce que ça ouvre|l'ennui, énoncé|
|---|---|---|---|---|
|calage|calage au point mort|3|Second cylindre|l’engin roulait à plus de 0,4 m/s puis se tient sous 0,1 m/s pendant deux secondes, la vapeur demandée, de l’eau dans la chaudière et moins de 20 % de pente sous les roues ; il faut avoir repris 0,4 m/s pour qu’un second calage compte|
|rampe|rampe refusée|1|Cheval|la machine tient la vapeur ouverte dans une montée de 20 % ou plus sans avancer de plus de 0,1 m/s, pendant deux secondes|
|citerne|citerne sèche|1|Citerne|la citerne tombe à zéro litre et s’y tient deux secondes ; il faut qu’elle ait de l’eau avant qu’une autre soif compte|
|soute|soute vide|1|Soute à charbon|la soute tombe à zéro kilo et s’y tient deux secondes ; il faut qu’elle ait du charbon avant qu’un autre vide compte|
|riviere|rivière atteinte|1|Pompe|la rivière passe sous les roues et s’y tient deux secondes|
|vent|vallée ventée|1|Éolienne + Voile|le vent monte à 0,6 sous les roues et tient deux secondes|
|gags|les trois gags|0|Éolipyle + Fusée + Remorque|aucun ennui à rencontrer : ouverts à la première image|

Sept lignes, sept énoncés, relus dans `TABLE_DU_GARAGE`. Une autre promesse compte les
`seuil:` écrits dans le fichier et vérifie qu'il n'y en a pas un hors de cette table, ni un second
endroit où écrire `deblocages.push`.

## 2. Ses phrases

Elle ne dit **28 phrases** : les 28 ci-dessous, mot pour mot, et aucune autre. Cocher
celles qu'on a entendues à l'écran en jouant la section 3. Aucune n'est une leçon, aucune ne
propose une réparation, aucune ne dit « appuie sur ».

|clef|la phrase|entendue ?|
|---|---|---|
|danger|La tôle travaille : la vapeur n’a plus rien pour la rendre.|☐|
|sec|La chaudière est à sec : l’eau ne revient pas jusqu’à elle.|☐|
|arret|Rien ne tourne plus : le feu ne pousse pas la machine.|☐|
|cale|Elle est prise à son point mort : la vapeur comprimée la retient.|☐|
|patine|L’acier glisse sur l’acier : la vapeur part en tours à vide.|☐|
|souffle|La soupape souffle : le foyer a brûlé du charbon pour rien.|☐|
|roule|Elle roule : la vapeur pousse et les roues la prennent.|☐|
|tatonne|Elle tâtonne : la vapeur la pousse d’un côté, le point mort la retient de l’autre.|☐|
|barre_echappee|La barre échappe : la manivelle tourne plus vite que les bras.|☐|
|chaudiere|Plus de chaudière : la vapeur n’a plus où naître.|☐|
|foyer|Plus de foyer : plus rien ne chauffe l’eau.|☐|
|soute|Plus de soute : le feu ne trouve plus de charbon à manger.|☐|
|citerne|Plus de citerne : l’eau n’a plus où attendre la chaudière.|☐|
|cylindre|Plus de cylindre : la vapeur n’a rien à pousser.|☐|
|tiroir|Plus de tiroir : la vapeur ne sait plus par où entrer.|☐|
|excentrique|Plus d’excentrique : le tiroir ne reçoit plus son avance.|☐|
|crosse|Plus de crosse : l’aller-retour du piston ne se transmet plus.|☐|
|bielle|Plus de bielle : le piston pousse pour personne.|☐|
|regulateur|Le régulateur est à terre : la vapeur passe sans être dosée.|☐|
|soupape|Plus de soupape : rien ne rend la vapeur de trop.|☐|
|roues|Plus de roues : l’arbre tourne et rien ne le prend.|☐|
|boite_a_fumee|Plus de boîte à fumée : la vapeur usée sort où elle peut.|☐|
|ouvre_calage|Trois fois prise à son point mort : le garage a ouvert un second cylindre, lancé à quatre-vingt-dix degrés du premier.|☐|
|ouvre_rampe|La rampe a refusé la machine et l’acier a glissé : le garage a ouvert le cheval, qui tire autrement que les roues.|☐|
|ouvre_citerne|La citerne s’est vidée sous la machine : le garage en a ouvert une seconde.|☐|
|ouvre_soute|Le foyer a mangé toute la soute : le garage en a ouvert une seconde.|☐|
|ouvre_riviere|La rivière est passée sous les roues : le garage a ouvert la pompe, qui puise où elle trempe.|☐|
|ouvre_vent|Le vent de la vallée a poussé plus fort que la machine : le garage a ouvert l’éolienne et la voile.|☐|

## 3. Ce que la ligne du jeu rend, mesuré

Deux cents secondes de machine à ×1, à la graine du jeu (`1882`), par le conducteur
de `mesurer-garage.mjs`. Six mains d'enfant, chacune une politesse rendue à la machine, image
par image. « parole brute », c'est le nombre de fois où le mot du modèle change pendant la
partie : c'est le bercement — précisément ce que le compteur du garage ne lit pas.

- pentes : 24-37 m à 15 % ; 37-50 m à -15 % ; 52-57 m à -5 % ; 68-73 m à 5 % ; 100-124 m à 34 %
- rivière : 57-68 m · charbonnage : 75-83 m · vallée ventée : 85-98 m, force 0.88

|main d'enfant|épisodes|distance|parole brute|ce qui s'ouvre (en secondes de machine)|
|---|---|---|---|---|
|laissée à elle-même|calage 0/3 · rampe 1/1 · citerne 1/1 · soute 0/1 · riviere 0/1 · vent 0/1|24,9 m|763 bascules|les trois gags → eolipyle + fusee + remorque @40,1 · rampe refusée → cheval @65,6 · citerne sèche → citerne @229,8|
|qui tape la barre toutes les 2 s|calage 0/3 · rampe 1/1 · citerne 1/1 · soute 0/1 · riviere 0/1 · vent 0/1|24,9 m|933 bascules|les trois gags → eolipyle + fusee + remorque @40,1 · rampe refusée → cheval @65,8 · citerne sèche → citerne @229,1|
|qui ferme et rouvre le robinet|calage 1/3 · rampe 0/1 · citerne 1/1 · soute 0/1 · riviere 0/1 · vent 0/1|16,1 m|131 bascules|les trois gags → eolipyle + fusee + remorque @40,1 · citerne sèche → citerne @263,1|
|qui coupe le feu et le reprend|calage 0/3 · rampe 1/1 · citerne 0/1 · soute 0/1 · riviere 0/1 · vent 0/1|24,9 m|710 bascules|les trois gags → eolipyle + fusee + remorque @40,1 · rampe refusée → cheval @65,6|
|feu à fond|calage 0/3 · rampe 1/1 · citerne 1/1 · soute 0/1 · riviere 1/1 · vent 1/1|100,8 m|658 bascules|les trois gags → eolipyle + fusee + remorque @40,1 · rivière atteinte → pompe @75,5 · vallée ventée → eolienne + voile @94,3 · rampe refusée → cheval @111,0 · citerne sèche → citerne @156,5|
|feu à fond et barre|calage 0/3 · rampe 1/1 · citerne 1/1 · soute 0/1 · riviere 1/1 · vent 1/1|100,8 m|708 bascules|les trois gags → eolipyle + fusee + remorque @40,1 · rivière atteinte → pompe @75,4 · vallée ventée → eolienne + voile @94,2 · rampe refusée → cheval @111,4 · citerne sèche → citerne @156,0|

## 4. Le bercement : le risque n°1 du billet

Sur le plat, lancée, le robinet avare à `0,1` et plus personne dessus, deux cents
secondes : la parole brute du modèle bascule **83 fois**, le garage compte
**1 calage** et n'ouvre rien. Les trois mots les plus tenus pendant ce temps-là :
« cale » 194 s · « roule » 6 s · « souffle » 0 s.

Sur la ligne du jeu à feu d'enfer, le bercement est bien plus fort : **658 bascules**
en deux cents secondes, 0 chute tenue — il en faut 3 pour ouvrir une pièce.
C'est là qu'est le piège : un compteur qui lirait la parole du modèle ouvrirait le second cylindre en
trente secondes de point mort.
C'est la mesure qui prouve que le compteur compte des chutes tenues et non des bascules.
Deux promesses la gardent, l'une à la règle nue, l'autre sur la ligne du jeu par le même
conducteur que ce feuillet. Le seuil est à 3 : 1 en deux cents secondes, ça ne
passe pas — et c'est exactement ce qu'on veut.

## 5. Trois chutes, trois lancers, la même mémoire

Le geste, écrit avec les seules commandes de l'écran : elle reprend la barre jusque
par-dessus `0,4` m/s — sans ça, rien n'arme la chute suivante —, puis le robinet
avare sans le fermer (`estPrise` veut la vapeur demandée), et on la laisse se tenir deux
secondes. Un feu mesuré (0,5), pas le feu d'enfer, pour la raison écrite à la section 7.

|chute|relancée|calages comptés|ce que ça ouvre|à|
|---|---|---|---|---|
|1|oui|1|Éolipyle, Fusée, Remorque|47 s|
|2|oui|2|rien|56 s|
|3|oui|3|Second cylindre|62 s|
|4|oui|4|rien|47 s|

Les trois gags ouvrent à la première image consultée, ici pendant la première reprise : ils
n'ont rencontré aucun ennui, ils sont là. La troisième ouverture est bien celle de la
table ; la quatrième chute, jouée sur une machine relancée avec la même mémoire, ne rouvre
rien et ne redit pas la phrase. `eolipyle`, `fusee`, `remorque`, `second_cylindre` : la mémoire de la partie à la fin.
Deux promesses, pas une observation.

## 6. Ce qui ne s'ouvre pas sur la ligne du jeu

Écrit ici parce que c'est un constat, pas un réglage. Aucun seuil n'a été descendu pour
faire joli : les nombres du billet sont ceux de la table, et la ligne du jeu ne les
rencontre pas tous.

|fait|seuil|meilleur score des six mains|ce que ça ouvre|
|---|---|---|---|
|soute|1|0/1|Soute à charbon|
|calage|3|1/3|Second cylindre|
|rampe|1|1/1|Cheval|
|citerne|1|1/1|Citerne|
|riviere|1|1/1|Pompe|
|vent|1|1/1|Éolienne + Voile|

- **le second cylindre n'ouvre pas sous une main qui laisse le robinet ouvert** : aucune des
  six mains mesurées ici ne l'a ouvert, et le meilleur score de chutes tenues reste
  1/3 — en deux cents secondes comme en une heure (mesure longue consignée
  avec le billet). Ce n'est pas une porte fermée : la section 8 joue les trois chutes à
  l'écran, avec le seul doigt d'un enfant, et la pièce s'y ouvre. Ce que ces six mains ne
  font pas, c'est refermer le robinet pour la laisser s'asseoir. Un enfant qui ne cherche
  pas le point mort ne verra pas la pièce : c'est le risque assumé du « par le problème ».
- la soute vide (0/1) attend le charbonnage : les pleins du catalogue tiennent
  au-delà de deux cents secondes sur la ligne. La pièce est branchable, sa condition est rare.

## 7. Ce qui borne le nombre de chutes : la vapeur comprimée la retient

Trouvé en écrivant les promesses, consigné sans toucher au modèle — il n'est pas de ce
billet. Après une chute tenue, la barre doit lui rendre `0,4` m/s pour armer la
suivante. À feu d'enfer la pression monte à 11 bars et la vapeur comprimée la tient :
elle ne repart plus, et la quatrième chute n'a plus rien à rencontrer.

|feu|chutes enchaînées sans relancer|pression à la fin|
|---|---|---|
|1|1 sur 6|11 bars|
|0.5|3 sur 6|10 bars|
|0.3|2 sur 6|6 bars|

Personne n'enchaîne six chutes sans relancer la machine : au mieux 3 sur six, et dès
1 sur six à feu d'enfer. Un enfant qui laisse le feu à fond perd donc la
partie de calage tout de suite : il faut couper le feu, ou ne pas l'ouvrir à fond, ou
relancer. À juger au regard — c'est une punition automatique qui ressemble à un mur, pas à
une leçon. La promesse du bercement est jouée à feu d'enfer exprès : c'est là que la parole
bascule le plus.

## 8. À l'écran, avec le seul doigt d'un enfant

Tout ce feuillet est écrit à la couture des règles. Le billet demandait aussi l'image : elle
a été jouée dans la page, Playwright en tête-à-tête, Playwright et son chromium restés au
cache de travail — le dépôt ne reçoit que des PNG. La page pilotée est la copie de travail
du cache, c'est-à-dire `index.html` plus UNE fonction de lecture seule qui rend ce que le
garage compte, l'écran seul ne l'affichant pas. Le geste n'a rien de plus que les trois
commandes de l'enfant :

1. chauffer robinet fermé, à feu 0,2 ;
2. reprendre robinet grand ouvert, la barre secouée toutes les 0,4 s de machine ;
3. fermer le robinet à fond pour qu'elle s'assoie ;
4. la rouvrir d'un cheveu — `estPrise` veut la vapeur demandée — et plus rien toucher
   pendant trois secondes de machine ;
5. recommencer. Et si elle ne repart pas, laisser le robinet fermé six secondes : c'est la
   vapeur neuve que le robinet admet qui la plaque contre son point mort, fermée elle se
   vide par l'échappement et la barre reprend prise.

|moment|secondes de machine|à l'écran|
|---|---|---|
|deux chutes tenues|56 s|« Calée », 0,0 km/h, 6,1 bars — capture-10-avant.png|
|la troisième s'achève|61 s|Braise dit la phrase d'ouverture — capture-10-ouverture.png|
|le garage ouvert|61 s|le « Second cylindre » est sur l'établi — capture-10-etabli.png|
|la pièce branchée|62 s|masse 3,2 t → 3,6 t — capture-10-montee.png|

La phrase, telle que la page l'a rendue : « Trois fois prise à son point mort : le garage a
ouvert un second cylindre, lancé à quatre-vingt-dix degrés du premier. » La pièce arrive
montée d'office sur la machine — c'est une structurelle : le bouton qui reste sur l'établi
est « Brancher », et la masse passe de 3,2 t à 3,6 t.
Ce que la section 7 mesurait reste vrai, et l'écran le dit mieux que la couture : à ne pas
refermer le robinet, une seule chute tenue suffit à la verrouiller et plus rien ne la fait
repartir. Ce n'est pas le seuil qui est dur, c'est la vapeur comprimée.

## 9. Ce que les promesses gardent

10 promesses écrites à la fin de `tests/regles.test.js`, dans le bloc « Le garage
s'agrandit par le problème ». `tests/modele.test.js` n'a pas bougé d'un caractère.

- les trois gags sont sur l’établi à la première image, et Braise ne dit rien
- trois calages au point mort ouvrent le second cylindre, et rien avant le troisième
- un calage de plus après le déblocage n’ouvre rien et ne relance pas la même phrase
- le bercement du point mort ne compte pas des centaines de chutes : deux cents secondes d’agitation pour une seule
- le bercement de deux cents secondes sur la ligne du jeu n’ouvre rien
- le déblocage ne dépend que de la mémoire du jeu, pas du temps que la page reste ouverte
- les seuils du garage tiennent dans une seule table, et elle est seule à écrire la mémoire
- aucune pièce du garage ne demande autre chose que sa masse
- la pièce neuve est dessinée dans la seconde qui suit son ouverture
- le feuillet de relecture du billet dit ce que le code dit

