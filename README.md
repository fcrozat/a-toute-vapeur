# Le Moteur Farfelu 🚗🔧

Un petit jeu pour tablette : on assemble un moteur de voiture en glissant
des énergies — sérieuses (essence, électricité, hydrogène, nucléaire…) ou
totalement farfelues (larmes d'unicorne, vapeur de riz, Wi-Fi du voisin,
amour de grand-maman…) — puis on en course !

## Jouer

Aucune installation, aucun build : tout tient dans `index.html`.

- **Sur la tablette directement** : ouvrir `index.html` dans le navigateur
  (Chrome) suffit. Le jeu marche hors ligne.
- **Depuis l'ordinateur, sur le même réseau** :
  ```
  python3 -m http.server 8080
  ```
  puis ouvrir `http://<adresse-ip-de-l-ordinateur>:8080` dans le navigateur
  de la tablette.

## Jouer (tactile)

- **Glisser** une carte d'énergie de l'établi vers une des 3 fiches du moteur
  (glisser vers le haut ; la rangée se fait défiler vers la gauche/droite).
- **Taper une carte** : Braise, la mécanicienne, la présente.
- **Taper une fiche pleine** : l'énergie retourne à l'établi.
- **🏁 LANCE !** : la voiture court contre un adversaire du quartier.
- **🧹 Vider** : tout remettre à plat.

Les jauges (vitesse, bizarre, fumée, bruit) changent la voiture : fumée
noire, flammes, etincelles, et voiture qui vire de couleur quand c'est
trop bizarre. Le score farfelu et le record du garage sont conservés entre
les parties.

La boîte mystère ❓ révèle une énergie au hasard, à chaque dépôt.
