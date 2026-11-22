/* =========================================================
   Le Frigo de fin de mois — js/effets.js
   Les effets « waouh » : porte 3D, fumée en canvas,
   voix du chef (synthèse vocale), carte du plat en image.
   Ce fichier ne touche pas aux données du jeu : il ne fait que l'affichage.
   ========================================================= */


/* ---------- 1. LA PORTE DU FRIGO (animation CSS 3D) ----------
   Le JS ajoute juste la classe "ouvert" : c'est le CSS qui fait pivoter la porte
   (transform: rotateY) grâce à une transition. */
document.getElementById("porte").addEventListener("click", () => {
  document.getElementById("frigo").classList.add("ouvert");
});


/* ---------- 2. LA FUMÉE ET LES FLAMMES (canvas + requestAnimationFrame) ----------
   Un canvas est une zone où l'on DESSINE en JavaScript, pixel par pixel.
   On crée des « particules » (petits cercles) qui montent, grossissent et s'effacent.
   requestAnimationFrame redessine environ 60 fois par seconde. */
const canvas = document.getElementById("fumee");
const ctx = canvas.getContext("2d");   // le « pinceau » 2D
let particules = [];

function creerParticule() {
  const flamme = Math.random() < 0.4;          // 40 % de flammes, 60 % de fumée
  return {
    x: 150 + (Math.random() - 0.5) * 120,      // position de départ : au-dessus de la poêle
    y: 200,
    vx: (Math.random() - 0.5) * 1.2,           // vitesse horizontale (petit tremblement)
    vy: -(1.5 + Math.random() * 2.5),          // vitesse verticale (négatif = monte)
    taille: flamme ? 6 + Math.random() * 8 : 10 + Math.random() * 14,
    vie: 1,                                    // 1 = neuve, 0 = disparue
    flamme: flamme,
  };
}

function lancerFumee(duree) {
  const fin = Date.now() + duree;
  canvas.classList.add("visible");

  function image() {
    // On ajoute de nouvelles particules tant que la cuisson n'est pas finie
    if (Date.now() < fin) {
      for (let i = 0; i < 3; i++) particules.push(creerParticule());
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);   // on efface tout

    particules.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vie -= p.flamme ? 0.035 : 0.022;   // les flammes meurent plus vite que la fumée
      p.taille += p.flamme ? -0.1 : 0.25; // la fumée grossit en montant

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(p.taille, 0), 0, Math.PI * 2);
      ctx.fillStyle = p.flamme
        ? "rgba(255, " + Math.floor(120 + 100 * p.vie) + ", 0, " + p.vie + ")"  // orange → jaune
        : "rgba(160, 160, 160, " + p.vie * 0.5 + ")";                           // gris transparent
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


