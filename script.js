/* ═══════════════════════════════════════════════
   PIANO STUDIO — Interactions
   · Sons des touches et des accords (Web Audio API)
   · Modes d'affichage des notes
   · Quiz des notes
   · Impression des fiches mémo
   ═══════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── Année du pied de page ── */
  var annee = document.getElementById("annee");
  if (annee) annee.textContent = String(new Date().getFullYear());

  /* ── Audio : synthèse simple d'un son de piano ── */
  var contexteAudio = null;

  function obtenirContexte() {
    if (!window.AudioContext && !window.webkitAudioContext) return null;
    if (!contexteAudio) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      contexteAudio = new Ctx();
    }
    if (contexteAudio.state === "suspended") contexteAudio.resume();
    return contexteAudio;
  }

  function jouerNote(frequence, delai) {
    var ctx = obtenirContexte();
    if (!ctx) return;

    var t = ctx.currentTime + (delai || 0);

    // Son principal (onde douce)
    var osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequence, t);

    // Harmonique légère pour le timbre
    var harmonique = ctx.createOscillator();
    harmonique.type = "sine";
    harmonique.frequency.setValueAtTime(frequence * 2, t);

    var gain = ctx.createGain();
    var gainH = ctx.createGain();

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.28, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);

    gainH.gain.setValueAtTime(0.0001, t);
    gainH.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
    gainH.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

    osc.connect(gain).connect(ctx.destination);
    harmonique.connect(gainH).connect(ctx.destination);

    osc.start(t);
    harmonique.start(t);
    osc.stop(t + 1.2);
    harmonique.stop(t + 0.6);
  }

  /* ── Touches des claviers (principal + hira) ── */
  document.querySelectorAll(".piano").forEach(function (piano) {
    piano.addEventListener("click", function (e) {
      var touche = e.target.closest(".touche");
      if (!touche) return;

      var freq = parseFloat(touche.getAttribute("data-freq"));
      if (!isNaN(freq)) jouerNote(freq);

      touche.classList.add("est-jouee");
      setTimeout(function () {
        touche.classList.remove("est-jouee");
      }, 320);
    });
  });
  var piano = document.getElementById("piano");

  /* ── Modes d'affichage des étiquettes ── */
  var chips = document.querySelectorAll(".chip[data-affichage]");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) { c.classList.remove("chip--actif"); });
      chip.classList.add("chip--actif");
      if (piano) {
        piano.setAttribute("data-affichage", chip.getAttribute("data-affichage"));
      }
    });
  });

  /* ── Accords jouables : clic = accord complet ── */
  document.querySelectorAll("[data-freqs]").forEach(function (el) {
    function jouerAccord() {
      var freqs = el.getAttribute("data-freqs").split(",").map(Number);
      freqs.forEach(function (f, i) {
        jouerNote(f, i * 0.045); // léger arpège
      });
    }
    el.addEventListener("click", jouerAccord);
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        jouerAccord();
      }
    });
  });

  /* ── Quiz : reconnaître les notes ── */
  var quizClavier = document.getElementById("quiz-clavier");
  var quizReponses = document.getElementById("quiz-reponses");
  var quizFeedback = document.getElementById("quiz-feedback");
  var quizScore = document.getElementById("quiz-score");
  var quizTotal = document.getElementById("quiz-total");
  var quizSuivant = document.getElementById("quiz-suivant");
  var quizNoires = document.getElementById("quiz-noires");

  if (quizClavier && quizReponses) {
    var NOTES = [
      { nom: "Do", blanche: 0 },
      { nom: "Do♯ / Ré♭", noire: 0.62 },
      { nom: "Ré", blanche: 1 },
      { nom: "Ré♯ / Mi♭", noire: 1.74 },
      { nom: "Mi", blanche: 2 },
      { nom: "Fa", blanche: 3 },
      { nom: "Fa♯ / Sol♭", noire: 3.62 },
      { nom: "Sol", blanche: 4 },
      { nom: "Sol♯ / La♭", noire: 4.74 },
      { nom: "La", blanche: 5 },
      { nom: "La♯ / Si♭", noire: 5.86 },
      { nom: "Si", blanche: 6 }
    ];
    var NOIRES_POS = [0.62, 1.74, 3.62, 4.74, 5.86];
    var score = 0;
    var total = 0;
    var questionEnCours = false;

    function melanger(tab) {
      var t = tab.slice();
      for (var i = t.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = t[i]; t[i] = t[j]; t[j] = tmp;
      }
      return t;
    }

    function construireClavier(note) {
      var html = "";
      for (var i = 0; i < 7; i++) {
        html += '<div class="mini-touche blanche' +
          (note.blanche === i ? " on" : "") + '"></div>';
      }
      for (var k = 0; k < NOIRES_POS.length; k++) {
        html += '<div class="mini-touche noire' +
          (note.noire === NOIRES_POS[k] ? " on" : "") +
          '" style="--pos:' + NOIRES_POS[k] + '"></div>';
      }
      quizClavier.innerHTML = html;
    }

    function nouvelleQuestion() {
      questionEnCours = false;
      quizFeedback.textContent = "";
      quizFeedback.className = "quiz__feedback";

      var avecNoires = quizNoires && quizNoires.checked;
      var pool = NOTES.filter(function (n) {
        return avecNoires || n.blanche !== undefined;
      });
      var correcte = pool[Math.floor(Math.random() * pool.length)];
      construireClavier(correcte);

      var distracteurs = melanger(
        pool.filter(function (n) { return n !== correcte; })
      ).slice(0, 3);
      var options = melanger([correcte].concat(distracteurs));

      quizReponses.innerHTML = "";
      options.forEach(function (opt) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "quiz-reponse";
        b.textContent = opt.nom;
        b.addEventListener("click", function () {
          repondre(b, opt, correcte);
        });
        quizReponses.appendChild(b);
      });
    }

    function repondre(bouton, opt, correcte) {
      if (questionEnCours) return;
      questionEnCours = true;
      total++;

      var boutons = quizReponses.querySelectorAll(".quiz-reponse");
      for (var i = 0; i < boutons.length; i++) boutons[i].disabled = true;

      if (opt === correcte) {
        score++;
        bouton.classList.add("quiz-reponse--correcte");
        quizFeedback.textContent = "Bravo ! C’est bien « " + correcte.nom + " ».";
        quizFeedback.className = "quiz__feedback quiz__feedback--bon";
      } else {
        bouton.classList.add("quiz-reponse--fausse");
        quizFeedback.textContent = "Raté… la bonne réponse était « " + correcte.nom + " ».";
        quizFeedback.className = "quiz__feedback quiz__feedback--rate";
      }
      quizScore.textContent = score;
      quizTotal.textContent = total;
    }

    quizSuivant.addEventListener("click", nouvelleQuestion);
    if (quizNoires) quizNoires.addEventListener("change", nouvelleQuestion);
    nouvelleQuestion();
  }

  /* ── Lecteur de mélodie (section Hira) ── */
  var pianoHira = document.getElementById("piano-hira");
  var generationLecture = 0;

  document.querySelectorAll("[data-melodie]").forEach(function (bouton) {
    bouton.addEventListener("click", function () {
      var suite = bouton.getAttribute("data-melodie").split(",");
      var sansLumiere = bouton.hasAttribute("data-sans-lumiere");
      var tempo = 0.52; // durée d'un temps (seconde)
      var t = 0;
      generationLecture++;
      var maGeneration = generationLecture;

      suite.forEach(function (item) {
        var parties = item.split(":");
        var chaine = parties[0];              // ex. "440.00"
        var freq = parseFloat(chaine);
        var duree = parseFloat(parties[1]);
        if (isNaN(freq) || isNaN(duree)) return;

        jouerNote(freq, t);

        if (pianoHira && !sansLumiere) {
          var delaiMs = t * 1000;
          setTimeout(function () {
            if (maGeneration !== generationLecture) return;
            var touche = pianoHira.querySelector('[data-freq="' + chaine + '"]');
            if (!touche) return;
            touche.classList.add("est-jouee");
            setTimeout(function () {
              touche.classList.remove("est-jouee");
            }, Math.min(duree * 1000 * tempo, 650));
          }, delaiMs);
        }
        t += duree * tempo;
      });
    });
  });

  /* ── Impression des fiches ── */
  var btnImprimer = document.getElementById("btn-imprimer");
  if (btnImprimer) {
    btnImprimer.addEventListener("click", function () {
      window.print();
    });
  }
})();
