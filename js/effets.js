/* =========================================================
   Le Frigo de fin de mois — js/effets.js
   Les effets « waouh » : porte 3D, fumée en canvas plein écran,
   voix du chef (synthèse vocale), carte du plat en image.
   Ce fichier ne touche pas aux données du jeu : il ne fait que l'affichage.
   ========================================================= */


/* ---------- 1. LA PORTE DU FRIGO (animation CSS 3D) ----------
   Le JS ajoute juste la classe "ouvert" : c'est le CSS qui fait pivoter la porte
   (transform: rotateY) grâce à une transition. */
document.getElementById("porte").addEventListener("click", () => {
  document.getElementById("frigo").classList.add("ouvert");
});


/* ---------- 2. LA FUMÉE ET LES FLAMMES (canvas plein écran + requestAnimationFrame) ----------
   Un canvas est une zone où l'on DESSINE en JavaScript, pixel par pixel.
   Ici, le canvas couvre TOUTE la fenêtre : la fumée part de la poêle et envahit l'écran.
   On crée des « particules » (petits cercles) qui montent, grossissent et s'effacent.
   requestAnimationFrame redessine environ 60 fois par seconde. */
const canvas = document.getElementById("fumee");
const ctx = canvas.getContext("2d");   // le « pinceau » 2D
let particules = [];

function creerParticule(x, y) {
  const flamme = Math.random() < 0.35;         // 35 % de flammes, 65 % de fumée
  return {
    x: x + (Math.random() - 0.5) * 120,        // position de départ : sur la poêle
    y: y,
    vx: (Math.random() - 0.5) * 3,             // vitesse horizontale (la fumée s'étale)
    vy: -(2 + Math.random() * 4),              // vitesse verticale (négatif = monte)
    taille: flamme ? 10 + Math.random() * 14 : 18 + Math.random() * 22,
    vie: 1,                                    // 1 = neuve, 0 = disparue
    flamme: flamme,
  };
}

function lancerFumee(duree) {
  // Le canvas prend la taille de la fenêtre
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Point de départ = le centre de la poêle à l'écran
  const poele = document.querySelector(".poele").getBoundingClientRect();
  const departX = poele.left + poele.width / 2;
  const departY = poele.top + poele.height * 0.35;

  const fin = Date.now() + duree;
  canvas.classList.add("visible");

  function image() {
    // On ajoute de nouvelles particules tant que la cuisson n'est pas finie
    if (Date.now() < fin) {
      for (let i = 0; i < 7; i++) particules.push(creerParticule(departX, departY));
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);   // on efface tout

    particules.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 1.01;                        // la fumée s'élargit en montant
      p.vie -= p.flamme ? 0.03 : 0.008;    // les flammes meurent vite, la fumée reste longtemps
      p.taille += p.flamme ? -0.15 : 0.9;  // la fumée grossit beaucoup

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(p.taille, 0), 0, Math.PI * 2);
      ctx.fillStyle = p.flamme
        ? "rgba(255, " + Math.floor(100 + 120 * p.vie) + ", 0, " + p.vie + ")"  // orange → jaune
        : "rgba(110, 110, 110, " + p.vie * 0.35 + ")";                          // gris transparent
      ctx.fill();
    });

    // On garde seulement les particules encore « vivantes »
    particules = particules.filter(p => p.vie > 0);

    if (Date.now() < fin || particules.length > 0) {
      requestAnimationFrame(image);       // on redessine à la prochaine image
    } else {
      canvas.classList.remove("visible");
    }
  }
  requestAnimationFrame(image);
}


/* ---------- 3. LES SONS « MEME » (fichiers mp3 + objet Audio) ----------
   On remplace la voix de synthèse (qui ne marche pas sur tous les ordis)
   par de vrais fichiers son, rangés dans le dossier sons/.
   new Audio("fichier.mp3") crée un lecteur, .play() le lance.
   On mémorise dans le localStorage si le joueur a coupé le son. */
const CLE_SON = "frigo_son";
let sonActive = true;
try { sonActive = localStorage.getItem(CLE_SON) !== "off"; } catch (e) {}

// 3 sons par cas : on en tire un au hasard à chaque fois
const SONS = {
  nul: ["sons/nul1.mp3", "sons/nul2.mp3", "sons/nul3.mp3"],   // plat raté (note < 4)
  bof: ["sons/bof1.mp3", "sons/bof2.mp3", "sons/bof3.mp3"],   // plat moyen (note 4 à 6)
  top: ["sons/top1.mp3", "sons/top2.mp3", "sons/top3.mp3"],   // bon plat (note >= 7)
};

let sonEnCours = null;

// Joue un son meme. Si le fichier n'existe pas (ou ne peut pas être lu),
// on appelle "secours" : un son fabriqué par le navigateur (voir final.js).
function jouerSon(cle, secours) {
  if (!sonActive) return;
  if (sonEnCours) sonEnCours.pause();          // on coupe le son précédent
  const liste = SONS[cle];
  const fichier = liste[Math.floor(Math.random() * liste.length)];   // tirage au sort
  sonEnCours = new Audio(fichier);
  sonEnCours.volume = 0.8;
  sonEnCours.play().catch(() => { if (secours) secours(); });
}

function afficherBoutonSon() {
  document.getElementById("btn-son").textContent = sonActive ? "🔊 Son : on" : "🔇 Son : off";
}

document.getElementById("btn-son").addEventListener("click", () => {
  sonActive = !sonActive;
  try { localStorage.setItem(CLE_SON, sonActive ? "on" : "off"); } catch (e) {}
  if (!sonActive && sonEnCours) sonEnCours.pause();
  afficherBoutonSon();
});
afficherBoutonSon();


/* ---------- 4. TÉLÉCHARGER LA CARTE DU PLAT EN IMAGE (canvas → PNG) ----------
   On dessine une « carte » dans un canvas invisible, puis toDataURL()
   la transforme en image PNG, qu'on télécharge avec un lien <a download>. */

// Coupe un long texte en plusieurs lignes qui tiennent dans la largeur max
function decouperEnLignes(ctx, texte, largeurMax) {
  const mots = texte.split(" ");
  const lignes = [];
  let ligne = "";
  mots.forEach(mot => {
    const essai = ligne ? ligne + " " + mot : mot;
    if (ctx.measureText(essai).width > largeurMax && ligne) {
      lignes.push(ligne);
      ligne = mot;
    } else {
      ligne = essai;
    }
  });
  lignes.push(ligne);
  return lignes;
}

function telechargerCarte(plat, emojis) {
  const c = document.createElement("canvas");
  c.width = 800;
  c.height = 1000;
  const g = c.getContext("2d");

  // Fond beige + carte blanche
  g.fillStyle = "#f4efe6";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "white";
  g.beginPath();
  if (g.roundRect) g.roundRect(60, 60, 680, 880, 40);   // coins arrondis (navigateurs récents)
  else g.rect(60, 60, 680, 880);                        // sinon, rectangle simple
  g.fill();

  g.textAlign = "center";
  g.fillStyle = "#e8572a";
  g.font = "bold 36px system-ui, sans-serif";
  g.fillText("Le frigo de fin de mois", 400, 150);

  g.font = "110px system-ui, sans-serif";
  g.fillText(emojis, 400, 310);

  g.fillStyle = "#2b2b2b";
  g.font = "bold 46px system-ui, sans-serif";
  let y = 430;
  decouperEnLignes(g, plat.nom, 580).forEach(l => { g.fillText(l, 400, y); y += 58; });

  y += 30;
  g.font = "52px system-ui, sans-serif";
  g.fillText("⭐".repeat(Math.round(plat.note / 2)) + "  " + plat.note + "/10", 400, y);

  y += 80;
  g.fillStyle = "#7a7a7a";
  g.font = "italic 32px system-ui, sans-serif";
  decouperEnLignes(g, plat.commentaire, 580).forEach(l => { g.fillText(l, 400, y); y += 44; });

  g.font = "26px system-ui, sans-serif";
  g.fillText("asadigital-victor.github.io", 400, 900);

  // Transformation en image + téléchargement
  const lien = document.createElement("a");
  lien.href = c.toDataURL("image/png");
  lien.download = "mon-plat-de-fin-de-mois.png";
  lien.click();
}
