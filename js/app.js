/* =========================================================
   Le Frigo de fin de mois — js/app.js  (version 8 « grand final »)
   Les effets visuels et sonores sont dans js/effets.js et js/final.js
   ========================================================= */
 
// ----- 1. L'état du jeu -----
let INGREDIENTS = [];   // tous les ingrédients (lus dans le JSON)
let RECETTES = {};      // NOUVEAU : les recettes spéciales (lues dans le JSON)
let frigo = [];         // ceux qui sont encore dans le frigo
let casserole = [];     // ceux qu'on a choisis (4 max)
let platActuel = null;  // VERSION 7 : le dernier plat cuisiné (pour la voix et l'image)
 
// NOUVEAU : les suffixes ajoutés à la fin des noms générés, selon la note
const SUFFIXES_BONS    = ["façon chef étoilé", "du dimanche soir", "à la mode de Cayenne", "comme chez mamie (presque)"];
const SUFFIXES_MOYENS  = ["de fin de mois", "du survivant", "version 3h du matin", "façon cité U"];
const SUFFIXES_MAUVAIS = ["(ne pas reproduire)", "maudit", "que même le chat refuse", "interdit par la Convention de Genève"];
 
// ----- 2. Charger LES DEUX fichiers JSON, puis afficher -----
// NOUVEAU : Promise.all attend que les 2 fetch soient terminés
Promise.all([
  fetch("data/ingredients.json").then(r => r.json()),
  fetch("data/recettes.json").then(r => r.json()),
]).then(([ingredients, recettes]) => {
  INGREDIENTS = ingredients;
  RECETTES = recettes;
  frigo = [...INGREDIENTS];
  afficher();
  afficherCarnet();   // version 6 : on affiche le carnet sauvegardé
});
 
// ----- 3. Dessiner tout l'écran à partir des variables -----
function afficher() {
  // Le frigo
  const etageres = document.getElementById("etageres");
  etageres.innerHTML = "";
  frigo.forEach(ing => {
    const bouton = document.createElement("button");
    bouton.className = "ingredient";
    bouton.textContent = ing.emoji + " " + ing.nom;
    bouton.addEventListener("click", () => mettreDansCasserole(ing));

    // VERSION 7 : GLISSER-DÉPOSER. draggable rend le bouton « attrapable » à la souris.
    // Au début du glisser, on range l'id de l'ingrédient dans le « presse-papier » du glisser (dataTransfer).
    bouton.draggable = true;
    bouton.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", ing.id);
      bouton.classList.add("attrape");
    });
    bouton.addEventListener("dragend", () => bouton.classList.remove("attrape"));
    etageres.appendChild(bouton);
  });
 
  // La casserole
  const contenu = document.getElementById("contenu-casserole");
  contenu.innerHTML = "";
  casserole.forEach(ing => {
    const b = document.createElement("button");
    b.className = "dans-casserole";
    b.textContent = ing.emoji;
    b.title = "Remettre " + ing.nom + " au frigo";
    b.addEventListener("click", () => remettreDansFrigo(ing));
    contenu.appendChild(b);
  });
 
  // Le message sous la poêle
  const message = document.getElementById("message");
  if (casserole.length === 0) message.textContent = "La casserole est vide. Comme ton compte en banque.";
  else message.textContent = casserole.map(i => i.nom).join(" + ");
 
  document.getElementById("btn-cuisiner").disabled = casserole.length === 0;
}
 
// ----- 4. Les actions -----
function mettreDansCasserole(ing) {
  if (casserole.length >= 4) {
    document.getElementById("message").textContent = "La casserole déborde ! 4 ingrédients max.";
    return;
  }
  frigo = frigo.filter(i => i.id !== ing.id);
  casserole.push(ing);
  afficher();
}
 
function remettreDansFrigo(ing) {
  casserole = casserole.filter(i => i.id !== ing.id);
  frigo.push(ing);
  afficher();
}
 
// VERSION 7 : la casserole accepte qu'on y lâche un ingrédient
const zoneCasserole = document.getElementById("casserole");
zoneCasserole.addEventListener("dragover", (e) => {
  e.preventDefault();                       // obligatoire : sinon le navigateur refuse le « drop »
  zoneCasserole.classList.add("survol");    // la poêle s'illumine
});
zoneCasserole.addEventListener("dragleave", () => zoneCasserole.classList.remove("survol"));
zoneCasserole.addEventListener("drop", (e) => {
  e.preventDefault();
  zoneCasserole.classList.remove("survol");
  const id = e.dataTransfer.getData("text/plain");      // on relit l'id rangé au dragstart
  const ing = frigo.find(i => i.id === id);             // on retrouve l'ingrédient dans le frigo
  if (ing) mettreDansCasserole(ing);
});

document.getElementById("btn-vider").addEventListener("click", () => {
  frigo = frigo.concat(casserole);
  casserole = [];
  afficher();
});
 
// ----- 5. NOUVEAU : CUISINER -----
 
// Bouton « Cuisiner » : la poêle bout 1,5 seconde, puis le plat apparaît
document.getElementById("btn-cuisiner").addEventListener("click", () => {
  const zone = document.getElementById("casserole");
  zone.classList.add("cuisson");                 // animation CSS « ça bout »
  document.getElementById("btn-cuisiner").disabled = true;
  document.getElementById("message").textContent = "Ça mijote… (ou ça brûle)";
  lancerFumee(1800);                              // VERSION 7 : fumée et flammes (effets.js)

  setTimeout(() => {
    zone.classList.remove("cuisson");
    cuisiner();
    grandFinal(platActuel.note);                  // GRAND FINAL selon la note (final.js)
    document.getElementById("message").textContent = "Bon appétit… ou pas.";
  }, 1800);
});
 
function cuisiner() {
  // La CLÉ : les id triés par ordre alphabétique, collés avec « + »
  // → "pates + ketchup" et "ketchup + pates" donnent la même clé "ketchup+pates"
  const cle = casserole.map(i => i.id).sort().join("+");
 
  let plat;
  if (RECETTES[cle]) {
    plat = RECETTES[cle];             // recette spéciale écrite à la main
  } else {
    plat = genererPlat(casserole);    // nom fabriqué automatiquement
  }
  const nouveau = enregistrerDansCarnet(cle, plat);   // ÉTAPE 6
  afficherResultat(plat, nouveau);
}
 
// Le générateur : fabrique un nom pour n'importe quelle combinaison
function genererPlat(ingredients) {
  // 1. L'ingrédient principal = celui qui a la plus grande priorité
  const tries = [...ingredients].sort((a, b) => b.priorite - a.priorite);
  const principal = tries[0];
  const autres = tries.slice(1).map(i => i.garniture);
 
  // 2. Le nom : « Omelette » + « sauce ketchup, gratiné et qui arrache »
  let nom = principal.plat;
  if (autres.length === 1) nom += " " + autres[0];
  if (autres.length > 1) nom += " " + autres.slice(0, -1).join(", ") + " et " + autres[autres.length - 1];
 
  // 3. La note : somme des goûts + un peu de hasard, entre 0 et 10
  let note = ingredients.reduce((total, i) => total + i.gout, 0) + Math.floor(Math.random() * 3);
  note = Math.max(0, Math.min(10, note));
 
  // 4. Le suffixe dépend de la note
  let liste;
  if (note >= 7) liste = SUFFIXES_BONS;
  else if (note >= 4) liste = SUFFIXES_MOYENS;
  else liste = SUFFIXES_MAUVAIS;
  nom += " " + liste[Math.floor(Math.random() * liste.length)];
 
  let commentaire;
  if (note >= 7) commentaire = "Contre toute attente, c'est mangeable !";
  else if (note >= 4) commentaire = "Ça nourrit. C'est déjà ça.";
  else commentaire = "Tu as faim à ce point-là ?";
 
  return { nom: nom, note: note, commentaire: commentaire };
}
 
// Affiche la carte du plat
function afficherResultat(plat, nouveau) {
  // ÉTAPE 6 : badge « nouvelle recette » seulement si on ne l'avait jamais trouvée
  document.getElementById("badge-nouveau").classList.toggle("cache", !nouveau);
 
  document.getElementById("resultat-emojis").textContent = casserole.map(i => i.emoji).join(" ");
  document.getElementById("resultat-nom").textContent = plat.nom;
  document.getElementById("resultat-note").textContent = "⭐".repeat(Math.round(plat.note / 2)) + "  " + plat.note + "/10";
  document.getElementById("resultat-commentaire").textContent = plat.commentaire;
 
  document.getElementById("resultat").classList.remove("cache");  // on montre la carte
  document.getElementById("resultat").scrollIntoView({ behavior: "smooth" });

  // VERSION 7 : on garde le plat en mémoire, et le chef l'annonce à voix haute (effets.js)
  platActuel = plat;
  setTimeout(() => annoncerPlat(plat), 2200);   // le chef parle APRÈS le grand final
}

// VERSION 7 : boutons de la carte du plat
document.getElementById("btn-ecouter").addEventListener("click", () => {
  if (platActuel) annoncerPlat(platActuel);
});
document.getElementById("btn-photo").addEventListener("click", () => {
  if (platActuel) telechargerCarte(platActuel, casserole.map(i => i.emoji).join(" "));
});
 
// Bouton « Rouvrir le frigo » : on remet tout à zéro
document.getElementById("btn-rejouer").addEventListener("click", () => {
  frigo = [...INGREDIENTS];
  casserole = [];
  document.getElementById("resultat").classList.add("cache");
  afficher();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
 
// ----- 6. ÉTAPE 6 : LE CARNET DE RECETTES (localStorage) -----
// localStorage = une petite mémoire du navigateur qui reste même quand on ferme la page.
// On y range un objet { "ketchup+pates": { nom, note, emojis }, ... } transformé en texte (JSON).
const CLE_CARNET = "frigo_carnet";
 
// Nombre total de combinaisons possibles : 1, 2, 3 ou 4 ingrédients parmi 12 = 793
function nombreDeCombinaisons(n) {
  const c = (n, k) => k === 0 ? 1 : (n * c(n - 1, k - 1)) / k;   // combinaisons « k parmi n »
  return c(n, 1) + c(n, 2) + c(n, 3) + c(n, 4);
}
 
function lireCarnet() {
  try {
    return JSON.parse(localStorage.getItem(CLE_CARNET)) || {};
  } catch (e) {
    return {};   // localStorage bloqué (navigation privée...) : carnet vide
  }
}
 
// Enregistre le plat. Renvoie true si c'est une NOUVELLE recette.
function enregistrerDansCarnet(cle, plat) {
  const carnet = lireCarnet();
  const nouveau = !carnet[cle];
  if (nouveau) {
    carnet[cle] = { nom: plat.nom, note: plat.note, emojis: casserole.map(i => i.emoji).join(" ") };
    try {
      localStorage.setItem(CLE_CARNET, JSON.stringify(carnet));
    } catch (e) { /* tant pis, pas de sauvegarde */ }
  }
  afficherCarnet();
  return nouveau;
}
 
function afficherCarnet() {
  const carnet = lireCarnet();
  const cles = Object.keys(carnet);
  document.getElementById("compteur").textContent = cles.length;
  document.getElementById("total").textContent = nombreDeCombinaisons(INGREDIENTS.length);
 
  const liste = document.getElementById("carnet");
  liste.innerHTML = "";
  cles.forEach(cle => {
    const r = carnet[cle];
    const li = document.createElement("li");
    li.textContent = r.emojis + "  " + r.nom + " — " + r.note + "/10";
    liste.appendChild(li);
  });
}
 
// Bouton « Carnet » : affiche / cache la liste
document.getElementById("btn-carnet").addEventListener("click", () => {
  document.getElementById("carnet").classList.toggle("cache");
});
 