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


