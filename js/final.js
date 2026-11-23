/* =========================================================
   Le Frigo de fin de mois — js/final.js
   Le GRAND FINAL plein écran, qui dépend de la note du plat :
     - note < 4  : 🚨 alarme incendie (flash rouge, écran qui tremble, sirène)
     - note 4-6  : 😐 « mouais » (trombone triste)
     - note >= 7 : 🎉 confettis + fanfare
   Outils : un canvas plein écran, des animations CSS, et la Web Audio API
   (le navigateur fabrique les sons lui-même, sans fichier mp3).
   ========================================================= */

const ecran = document.getElementById("ecran-effets");   // canvas plein écran
const pinceau = ecran.getContext("2d");
const bandeau = document.getElementById("bandeau");      // le grand texte au milieu

// Le canvas doit toujours faire la taille de la fenêtre
function ajusterEcran() {
  ecran.width = window.innerWidth;
  ecran.height = window.innerHeight;
}
ajusterEcran();
window.addEventListener("resize", ajusterEcran);


/* ---------- 1. LES SONS (Web Audio API) ----------
   Un « oscillateur » produit une note (fréquence en Hz).
   On le branche sur un « gain » (volume), lui-même branché aux haut-parleurs. */
let audio = null;

function jouerNote(frequence, debut, duree, type) {
  if (!sonActive) return;                              // sonActive vient de effets.js
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  const t = audio.currentTime + debut;
  const osc = audio.createOscillator();
  const volume = audio.createGain();
  osc.type = type || "triangle";
  osc.frequency.setValueAtTime(frequence, t);
  volume.gain.setValueAtTime(0.0001, t);
  volume.gain.exponentialRampToValueAtTime(0.25, t + 0.02);        // attaque rapide
  volume.gain.exponentialRampToValueAtTime(0.0001, t + duree);     // puis extinction
  osc.connect(volume).connect(audio.destination);
  osc.start(t);
  osc.stop(t + duree + 0.05);
  return osc;
}

function sirene() {
  // La fréquence monte et descend 4 fois : « pin-pon » d'alarme
  for (let i = 0; i < 4; i++) {
    const osc = jouerNote(700, i * 0.5, 0.5, "square");
    if (osc) osc.frequency.linearRampToValueAtTime(1300, audio.currentTime + i * 0.5 + 0.25);
  }
}

function fanfare() {
  // Do - Mi - Sol - Do aigu (ta-ta-ta-taaa !)
  [[523, 0, 0.15], [659, 0.15, 0.15], [784, 0.3, 0.15], [1047, 0.45, 0.6]]
    .forEach(([f, d, duree]) => jouerNote(f, d, duree, "triangle"));
}

function tromboneTriste() {
  // 4 notes qui descendent : « wouah wouah wouah wouaaah »
  [[392, 0, 0.35], [370, 0.35, 0.35], [349, 0.7, 0.35], [330, 1.05, 0.9]]
    .forEach(([f, d, duree]) => jouerNote(f, d, duree, "sawtooth"));
}


/* ---------- 2. LE BANDEAU (grand texte au milieu de l'écran) ---------- */
function afficherBandeau(texte, style) {
  bandeau.textContent = texte;
  bandeau.className = "bandeau " + style;   // la classe CSS choisit couleur et animation
  setTimeout(() => { bandeau.className = "bandeau"; }, 2600);
}


/* ---------- 3. LES CONFETTIS (canvas plein écran) ---------- */
function lancerConfettis() {
  const couleurs = ["#e8572a", "#ffc107", "#2f9e5b", "#3d8bfd", "#e83e8c"];
  let confettis = [];
  for (let i = 0; i < 220; i++) {
    confettis.push({
      x: ecran.width / 2,
      y: ecran.height / 2,
      vx: (Math.random() - 0.5) * 22,          // explosion dans toutes les directions
      vy: -Math.random() * 20 - 4,
      angle: Math.random() * Math.PI,
      rotation: (Math.random() - 0.5) * 0.4,
      couleur: couleurs[Math.floor(Math.random() * couleurs.length)],
      taille: 6 + Math.random() * 8,
    });
  }

  function image() {
    pinceau.clearRect(0, 0, ecran.width, ecran.height);
    confettis.forEach(c => {
      c.vy += 0.5;              // la gravité les fait retomber
      c.vx *= 0.99;             // le frottement de l'air les ralentit
      c.x += c.vx;
      c.y += c.vy;
      c.angle += c.rotation;
      pinceau.save();
      pinceau.translate(c.x, c.y);
      pinceau.rotate(c.angle);
      pinceau.fillStyle = c.couleur;
      pinceau.fillRect(-c.taille / 2, -c.taille / 4, c.taille, c.taille / 2);
      pinceau.restore();
    });
    confettis = confettis.filter(c => c.y < ecran.height + 50);   // on oublie ceux sortis de l'écran
    if (confettis.length > 0) requestAnimationFrame(image);
    else pinceau.clearRect(0, 0, ecran.width, ecran.height);
  }
  requestAnimationFrame(image);
}


// Rejouer le son correspondant à une note (bouton « Rejouer le son »)
function sonDuPlat(note) {
  if (note < 4) jouerSon("nul", sirene);
  else if (note < 7) jouerSon("bof", tromboneTriste);
  else jouerSon("top", fanfare);
}


/* ---------- 4. LE GRAND FINAL : choisit la réaction selon la note ---------- */
function grandFinal(note) {
  if (note < 4) {
    document.body.classList.add("alarme");          // flash rouge + écran qui tremble (CSS)
    afficherBandeau("🚨 DÉTECTEUR DE FUMÉE DÉCLENCHÉ 🚨", "rouge");
    jouerSon("nul", sirene);       // son meme, ou sirène si le fichier manque
    setTimeout(() => document.body.classList.remove("alarme"), 2200);
    setTimeout(effondrement, 1000);                 // puis la page s'écroule (section 5)
  } else if (note < 7) {
    afficherBandeau("😐 Mouais…", "gris");
    jouerSon("bof", tromboneTriste);
  } else {
    afficherBandeau("👨‍🍳 CHEF ÉTOILÉ ! ⭐", "or");
    lancerConfettis();
    jouerSon("top", fanfare);
  }
}


/* ---------- 5. L'EFFONDREMENT : la page tombe en morceaux, puis se reconstruit ----------
   Pour un plat raté, chaque élément visible de la page (titres, boutons,
   carte du plat…) tombe comme un objet réel : gravité, rotation, rebond sur le
   bas de l'écran. Puis, comme si on rembobinait, tout revient à sa place.
   Le principe : on ne déplace pas vraiment les éléments, on leur applique
   un « transform: translate(...) rotate(...) » recalculé à chaque image. */
function effondrement() {
  const selecteur = "h1, body > p, .ingredient, #contenu-casserole span, .poele, #message, " +
                    "#casserole button, #resultat > *, .actions-resultat button, footer > button";
  const morceaux = [];

  document.querySelectorAll(selecteur).forEach(el => {
    if (el.offsetParent === null) return;                 // élément caché : on l'ignore
    const rect = el.getBoundingClientRect();
    morceaux.push({
      el: el,
      x: 0, y: 0,                                         // décalage par rapport à sa place
      vx: (Math.random() - 0.5) * 12,                     // petite poussée sur le côté
      vy: -Math.random() * 10,                            // petit saut vers le haut
      angle: 0,
      vAngle: (Math.random() - 0.5) * 12,                 // vitesse de rotation (degrés)
      sol: window.innerHeight - rect.bottom,              // distance jusqu'au bas de l'écran
    });
  });

  let enCours = true;
  function image() {
    if (!enCours) return;              // la reconstruction a commencé : on ne bouge plus rien
    morceaux.forEach(m => {
      m.vy += 0.9;                     // gravité
      m.x += m.vx;
      m.y += m.vy;
      m.angle += m.vAngle;
      if (m.y > m.sol) {               // il touche le sol : il rebondit en perdant de l'énergie
        m.y = m.sol;
        m.vy *= -0.45;
        m.vx *= 0.8;
        m.vAngle *= 0.6;
      }
      m.el.style.transform = `translate(${m.x}px, ${m.y}px) rotate(${m.angle}deg)`;
    });
    requestAnimationFrame(image);
  }
  requestAnimationFrame(image);

  // Après 2,8 s : on arrête la chute et chaque morceau revole à sa place
  setTimeout(() => {
    enCours = false;
    morceaux.forEach((m, i) => {
      m.el.style.transition = `transform 0.9s cubic-bezier(.2,1.4,.4,1) ${i * 0.02}s`;  // petit décalage = effet vague
      m.el.style.transform = "";
    });
    setTimeout(() => morceaux.forEach(m => m.el.style.transition = ""), 2000);
  }, 2800);
}
