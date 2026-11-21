/* =========================================================
   Le Frigo de fin de mois — js/app.js  (version étape 5)
   Nouveau par rapport à l'étape 4 : marqué « NOUVEAU »
   ========================================================= */

// ----- 1. L'état du jeu -----
let INGREDIENTS = [];   // tous les ingrédients (lus dans le JSON)
let RECETTES = {};      // NOUVEAU : les recettes spéciales (lues dans le JSON)
let frigo = [];         // ceux qui sont encore dans le frigo
let casserole = [];     // ceux qu'on a choisis (4 max)

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

  setTimeout(() => {
    zone.classList.remove("cuisson");
    cuisiner();
  }, 1500);
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
  afficherResultat(plat);
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
function afficherResultat(plat) {
  document.getElementById("resultat-emojis").textContent = casserole.map(i => i.emoji).join(" ");
  document.getElementById("resultat-nom").textContent = plat.nom;
  document.getElementById("resultat-note").textContent = "⭐".repeat(Math.round(plat.note / 2)) + "  " + plat.note + "/10";
  document.getElementById("resultat-commentaire").textContent = plat.commentaire;

  document.getElementById("resultat").classList.remove("cache");  // on montre la carte
  document.getElementById("resultat").scrollIntoView({ behavior: "smooth" });
}

// Bouton « Rouvrir le frigo » : on remet tout à zéro
document.getElementById("btn-rejouer").addEventListener("click", () => {
  frigo = [...INGREDIENTS];
  casserole = [];
  document.getElementById("resultat").classList.add("cache");
  afficher();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
