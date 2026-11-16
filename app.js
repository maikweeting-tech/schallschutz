/* Schallschutz-Assistent – Oberfläche (Lernen · Rechnen · Nachschlagen · Checkliste).
 * Fachwerte kommen ausschließlich aus data.js, Rechnungen aus calc.js. */
(function () {
  'use strict';
  var D = window.SSD, C = window.SSC;
  var VERSION = '1.0';

  /* =====================================================================
   * Hilfen
   * ===================================================================== */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var FORMEL = [[/L_AF,max/g, 'L<sub>AF,max</sub>'], [/L_In\b/g, 'L<sub>In</sub>'], [/L_ap\b/g, 'L<sub>ap</sub>'],
    [/L_ges\b/g, 'L<sub>ges</sub>'], [/L_zul\b/g, 'L<sub>zul</sub>'], [/L_r\b/g, 'L<sub>r</sub>'],
    [/L'n,w/g, 'L′<sub>n,w</sub>'], [/R'w/g, 'R′<sub>w</sub>']];
  /** Fachtext → HTML: escapen, **fett**, Formelzeichen tiefstellen. */
  function t(s) {
    var x = esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    FORMEL.forEach(function (f) { x = x.replace(f[0], f[1]); });
    return x;
  }
  function quelle(q) { return '<span class="quelle">' + esc(q) + '</span>'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function heute() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function datumDE(iso) { if (!iso) return '–'; var p = String(iso).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : iso; }
  function zeitDE(iso) { try { return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function mischen(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function zahlText(x) { return Number(x).toLocaleString('de-DE', { maximumFractionDigits: 2 }); }
  var toastT;
  function toast(msg) { var el = $('#toast'); el.textContent = msg; el.classList.add('zeigen'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('zeigen'); }, 2800); }

  /* =====================================================================
   * Speicher (localStorage, gekapselt) und Fotos (IndexedDB)
   * ===================================================================== */
  var speicherOk = true;
  try { localStorage.setItem('ssa.test', '1'); localStorage.removeItem('ssa.test'); } catch (e) { speicherOk = false; }
  var S = {
    lesen: function (k, def) { try { var v = localStorage.getItem('ssa.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    schreiben: function (k, v) {
      try { localStorage.setItem('ssa.' + k, JSON.stringify(v)); return true; }
      catch (e) { speicherOk = false; $('#speicherhinweis').hidden = false; return false; }
    }
  };
  var E = Object.assign({ theme: 'auto', bearbeiter: '', quizAnzahl: 10, letztesProjekt: '' }, S.lesen('einstellungen', {}));
  var LP = Object.assign({ karten: {}, quiz: [] }, S.lesen('lernen', {}));
  var PR = S.lesen('projekte', []);
  if (!Array.isArray(PR)) PR = [];
  function speichereE() { S.schreiben('einstellungen', E); }
  function speichereLP() { S.schreiben('lernen', LP); }
  function speichereProjekte() { S.schreiben('projekte', PR); }

  var Fotos = (function () {
    var dbP = null, mem = {}, urls = {};
    function db() {
      if (dbP) return dbP;
      dbP = new Promise(function (res, rej) {
        try {
          var r = indexedDB.open('schallschutz-assistent', 1);
          r.onupgradeneeded = function () { r.result.createObjectStore('fotos', { keyPath: 'id' }); };
          r.onsuccess = function () { res(r.result); };
          r.onerror = function () { rej(r.error); };
        } catch (e) { rej(e); }
      });
      return dbP;
    }
    function tx(modus, fn) {
      return db().then(function (d) {
        return new Promise(function (res, rej) {
          var x = d.transaction('fotos', modus), st = x.objectStore('fotos'), out = fn(st);
          x.oncomplete = function () { res(out && 'result' in out ? out.result : undefined); };
          x.onerror = function () { rej(x.error); };
        });
      });
    }
    return {
      put: function (rec) { return tx('readwrite', function (st) { st.put(rec); }).catch(function () { mem[rec.id] = rec; }); },
      get: function (id) {
        if (mem[id]) return Promise.resolve(mem[id]);
        return tx('readonly', function (st) { return st.get(id); }).catch(function () { return null; });
      },
      del: function (id) {
        delete mem[id]; if (urls[id]) { URL.revokeObjectURL(urls[id]); delete urls[id]; }
        return tx('readwrite', function (st) { st.delete(id); }).catch(function () {});
      },
      url: function (id) {
        if (urls[id]) return Promise.resolve(urls[id]);
        return this.get(id).then(function (rec) { if (!rec || !rec.blob) return null; urls[id] = URL.createObjectURL(rec.blob); return urls[id]; });
      },
      dataUrl: function (id) {
        return this.get(id).then(function (rec) {
          if (!rec || !rec.blob) return null;
          return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { res(null); }; fr.readAsDataURL(rec.blob); });
        });
      }
    };
  })();

  /** Foto verkleinern (max. 1280 px Kante) und als JPEG komprimieren. */
  function komprimiere(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1280, w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        c.toBlob(function (b) { if (b) res(b); else rej(new Error('Komprimierung fehlgeschlagen')); }, 'image/jpeg', 0.72);
      };
      img.onerror = function () { URL.revokeObjectURL(u); rej(new Error('Bild nicht lesbar')); };
      img.src = u;
    });
  }

  /* =====================================================================
   * Bausteine
   * ===================================================================== */
  var ICON = {
    lernen: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 0 2 1h13v-3"/><path d="M9 8h6M9 11h4"/></svg>',
    rechnen: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/></svg>',
    nach: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5"/></svg>'
  };
  function seg(act, optionen, aktiv, klasse) {
    return '<div class="segment ' + (klasse || '') + '" role="group">' + optionen.map(function (o) {
      return '<button type="button" data-act="' + act + '" data-v="' + esc(o.v) + '" aria-pressed="' + (String(o.v) === String(aktiv)) + '">' +
        t(o.l) + (o.s ? '<small>' + t(o.s) + '</small>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function eingabe(id, wert, einheit, ph) {
    return '<div class="eingabe-einheit"><input id="' + id + '" inputmode="decimal" autocomplete="off" enterkeyhint="done" value="' + esc(wert) +
      '" placeholder="' + esc(ph || '') + '"><span class="einheit">' + einheit + '</span></div>';
  }
  function eintrag(href, farbe, kuerzel, titel, unter) {
    return '<a class="eintrag" href="' + href + '"><span class="eintrag-icon" style="background:' + farbe + '">' + kuerzel + '</span>' +
      '<span class="eintrag-text"><b>' + t(titel) + '</b><small>' + t(unter) + '</small></span></a>';
  }
  function balken(anteil, rot) { return '<div class="balken' + (rot ? ' rot' : '') + '"><div style="width:' + Math.round(Math.max(0, Math.min(1, anteil)) * 100) + '%"></div></div>'; }
  function ampel(zustand, titel, unter) {
    var licht = zustand === 'ok' ? '✓' : zustand === 'nok' ? '✕' : '';
    return '<div class="ampel ' + zustand + '" role="status"><span class="licht" aria-hidden="true">' + licht + '</span><span>' + t(titel) + (unter ? '<small>' + t(unter) + '</small>' : '') + '</span></div>';
  }
  function tabelle(kopf, zeilen, klassen) {
    klassen = klassen || [];
    return '<div class="tabwrap"><table class="tab"><thead><tr>' + kopf.map(function (k, i) { return '<th class="' + (klassen[i] || '') + '">' + t(k) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + zeilen.map(function (z) {
        return '<tr' + (z.markiert ? ' class="markiert"' : '') + '>' + (z.zellen || z).map(function (c, i) { return '<td class="' + (klassen[i] || '') + '">' + t(c) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  var PRUEFHINWEIS = '<p class="pruefen">Werte nach ' + esc(D.NORMSTAND) + ' – vom Nutzer gegen Originalnorm bzw. Schneider Bautabellen zu prüfen.</p>';
  var KEINE_STATIK = '<div class="karte klein" style="border-left:4px solid var(--rost)"><strong>Hinweis:</strong> Nur Vorbemessung, Lernen und Dokumentation. Die App ersetzt <strong>keine bauakustische Messung</strong>, keine Prüfstatik und keine Tragwerksplanung.</div>';

  /* =====================================================================
   * Router
   * ===================================================================== */
  var aktiv = null;
  var ROUTEN = {
    'start': vStart, 'lernen': vLernen, 'lernen/karten': vKarten, 'lernen/quiz': vQuiz, 'lernen/merksaetze': vMerksaetze,
    'rechnen': vRechnen, 'rechnen/grenzwert': vGrenz, 'rechnen/pegel': vPegel, 'rechnen/nachweis': vNachweis, 'rechnen/vdi': vVdi,
    'nachschlagen': vNachschlagen, 'checkliste': vCheckliste, 'mehr': vMehr, 'mehr/einstellungen': vEinstellungen,
    'mehr/daten': vDaten, 'mehr/info': vInfo
  };
  function route() {
    diktatStopp();
    var teile = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (!teile.length) teile = ['start'];
    var v;
    if (teile[0] === 'checkliste' && teile[1]) v = vProjekt(decodeURIComponent(teile[1]));
    else if (teile[0] === 'nachschlagen') v = vNachschlagen(teile[1]);
    else v = (ROUTEN[teile.slice(0, 2).join('/')] || ROUTEN[teile[0]] || vStart)();
    aktiv = v;
    document.title = (v.titel === 'Schallschutz-Assistent' ? '' : v.titel + ' · ') + 'Schallschutz-Assistent';
    $('#titel').textContent = v.titel;
    $('#untertitel').textContent = v.unter || D.NORMSTAND;
    var z = $('#zurueck');
    if (v.zurueck) { z.hidden = false; z.setAttribute('href', v.zurueck); } else z.hidden = true;
    $$('.bottomnav a').forEach(function (a) { if (a.dataset.nav === v.nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('#main').innerHTML = v.html();
    if (v.init) v.init($('#main'));
    window.scrollTo(0, 0);
  }
  /** Aktuelle Ansicht neu zeichnen (Scrollposition bleibt). */
  function neu() {
    if (!aktiv) return;
    var y = window.scrollY;
    $('#main').innerHTML = aktiv.html();
    if (aktiv.init) aktiv.init($('#main'));
    window.scrollTo(0, y);
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || !aktiv) return;
    var fn = (aktiv.akt && aktiv.akt[el.dataset.act]) || GLOBAL[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('input', function (e) { if (aktiv && aktiv.eingabe) aktiv.eingabe(e.target, e); });
  document.addEventListener('change', function (e) { if (aktiv && aktiv.aenderung) aktiv.aenderung(e.target, e); });
  var GLOBAL = {};

  /* =====================================================================
   * Export / Druck
   * ===================================================================== */
  function kopfDialog(vorgabe, weiter) {
    var dlg = $('#dlg-kopf'), f = dlg.querySelector('form');
    f.projekt.value = vorgabe.projekt != null ? vorgabe.projekt : (E.letztesProjekt || '');
    f.bearbeiter.value = E.bearbeiter || '';
    f.datum.value = vorgabe.datum || heute();
    dlg.addEventListener('close', function zu() {
      dlg.removeEventListener('close', zu);
      if (dlg.returnValue !== 'ok') return;
      var kopf = { projekt: f.projekt.value.trim(), bearbeiter: f.bearbeiter.value.trim(), datum: f.datum.value };
      E.bearbeiter = kopf.bearbeiter; if (vorgabe.projekt == null) E.letztesProjekt = kopf.projekt; speichereE();
      weiter(kopf);
    });
    dlg.returnValue = '';
    if (dlg.showModal) dlg.showModal(); else { dlg.returnValue = 'ok'; dlg.dispatchEvent(new Event('close')); }
  }
  function druckRahmen(titel, kopf, inhalt, extraKopf) {
    var felder = [['Projekt', kopf.projekt || '–'], ['Bearbeiter', kopf.bearbeiter || '–'], ['Datum', datumDE(kopf.datum)]].concat(extraKopf || []);
    return '<div class="druck"><h1>' + esc(titel) + '</h1><div class="hinweis">Schallschutz-Assistent · ' + esc(D.NORMSTAND) + '</div>' +
      '<div class="kopf">' + felder.map(function (f) { return '<div><small>' + esc(f[0]) + '</small>' + t(f[1]) + '</div>'; }).join('') + '</div>' +
      inhalt +
      '<div class="fuss">Erstellt am ' + esc(zeitDE(new Date().toISOString())) + ' mit dem Schallschutz-Assistenten (v' + VERSION + '). ' +
      'Hinterlegter Normstand ' + esc(D.NORMSTAND) + ' – zu prüfender Ausgabestand; Werte gegen Originalnorm bzw. Schneider Bautabellen prüfen. ' +
      'Nur Vorbemessung/Dokumentation – keine bauakustische Messung, keine Prüfstatik.</div></div>';
  }
  function drucke(html) {
    var p = $('#print');
    p.innerHTML = html;
    var bilder = $$('img', p).map(function (img) {
      return img.complete ? Promise.resolve() : new Promise(function (r) { img.onload = img.onerror = r; });
    });
    Promise.all(bilder).then(function () { setTimeout(function () { window.print(); }, 60); });
  }
  window.addEventListener('afterprint', function () { $('#print').innerHTML = ''; });
  function berichtExport(titel, inhaltFn) {
    kopfDialog({}, function (kopf) { drucke(druckRahmen(titel, kopf, inhaltFn())); });
  }

  /* =====================================================================
   * START
   * ===================================================================== */
  function lernStand() {
    var gew = 0, noch = 0;
    D.karten.forEach(function (k) { var s = LP.karten[k.id]; if (s && s.s === 'gewusst') gew++; else if (s && s.s === 'nochmal') noch++; });
    return { gewusst: gew, nochmal: noch, gesamt: D.karten.length };
  }
  function projektStand(p) {
    var n = 0, erl = 0, nz = 0, mangel = 0;
    p.kategorien.forEach(function (k) {
      k.positionen.forEach(function (pos) {
        n++; var e = p.eintraege[pos.id], s = e ? e.status : 'offen';
        if (s === 'erledigt') erl++; else if (s === 'nz') nz++; else if (s === 'mangel') mangel++;
      });
    });
    return { n: n, erledigt: erl, nz: nz, mangel: mangel, offen: n - erl - nz - mangel, relevant: n - nz };
  }
  function vStart() {
    return {
      titel: 'Schallschutz-Assistent', unter: 'DIN 4109 · VDI 4100', nav: 'start',
      html: function () {
        var ls = lernStand();
        var k = function (href, kl, titel, unter, icon) { return '<a class="kachel ' + kl + '" href="' + href + '">' + icon + '<div><b>' + titel + '</b><br><span>' + unter + '</span></div></a>'; };
        var proj = PR.slice(0, 3).map(function (p) {
          var st = projektStand(p);
          return '<a class="projektkarte" href="#/checkliste/' + encodeURIComponent(p.id) + '" style="display:block;margin-top:10px"><div class="kopf"><b>' + esc(p.name) + '</b><span class="mono klein">' + st.erledigt + '/' + st.relevant + '</span></div>' + balken(st.relevant ? st.erledigt / st.relevant : 0) + '</a>';
        }).join('');
        var letzterQuiz = LP.quiz.length ? LP.quiz[LP.quiz.length - 1] : null;
        return '<div class="kacheln">' +
          k('#/lernen', 'k-lernen', 'LERNEN', 'Karten · Quiz', ICON.lernen) +
          k('#/rechnen', 'k-rechnen', 'RECHNEN', 'Pegel · Nachweis', ICON.rechnen) +
          k('#/nachschlagen', 'k-nach', 'NACHSCHLAGEN', 'Normen · Werte', ICON.nach) +
          k('#/checkliste', 'k-check', 'CHECKLISTE', 'Baustelle', ICON.check) + '</div>' +
          '<div class="abschnitt-titel">Dein Stand</div><div class="split">' +
          '<div class="karte"><h3>Lernfortschritt</h3><p class="klein"><span class="mono">' + ls.gewusst + ' / ' + ls.gesamt + '</span> Karten gewusst' +
          (ls.nochmal ? ' · <span class="mono">' + ls.nochmal + '</span> zum Wiederholen' : '') + '</p>' + balken(ls.gewusst / ls.gesamt) +
          (letzterQuiz ? '<p class="klein" style="margin-top:10px">Letztes Quiz: <strong class="mono">' + letzterQuiz.prozent + ' %</strong> (' + letzterQuiz.richtig + '/' + letzterQuiz.anzahl + ')</p>' : '') + '</div>' +
          '<div class="karte"><h3>Baustellen-Projekte</h3>' + (PR.length ? proj : '<p class="hinweis klein">Noch kein Projekt angelegt.</p><a class="btn btn-klein" href="#/checkliste">Projekt anlegen</a>') + '</div></div>' +
          '<a class="eintrag" href="#/mehr/einstellungen"><span class="eintrag-icon" style="background:#5b6570">⚙</span><span class="eintrag-text"><b>Einstellungen</b><small>Darstellung, Bearbeiter, Quiz-Länge</small></span></a>' +
          '<p class="pruefen">Hinterlegt: ' + esc(D.NORMSTAND) + ' – zu prüfender Ausgabestand. Alle Werte gegen Originalnorm bzw. Schneider Bautabellen prüfen.</p>';
      }
    };
  }

  /* =====================================================================
   * MODUL A – LERNEN
   * ===================================================================== */
  function vLernen() {
    return {
      titel: 'Lernen', unter: 'Karteikarten · Quiz · Merksätze', nav: 'lernen',
      html: function () {
        var ls = lernStand();
        var lq = LP.quiz.length ? LP.quiz[LP.quiz.length - 1] : null;
        return '<ul class="liste">' +
          '<li>' + eintrag('#/lernen/karten', '#1F4E79', 'A1', 'Karteikarten', ls.gewusst + ' von ' + ls.gesamt + ' gewusst' + (ls.nochmal ? ' · ' + ls.nochmal + ' Fehler' : '')) + '</li>' +
          '<li>' + eintrag('#/lernen/quiz', '#7B2E10', 'A2', 'Quiz (Multiple Choice)', D.quiz.length + ' Fragen im Pool' + (lq ? ' · zuletzt ' + lq.prozent + ' %' : '')) + '</li>' +
          '<li>' + eintrag('#/lernen/merksaetze', '#2F6F43', 'A3', 'Merksätze', 'Die prüfungsrelevanten Kernaussagen') + '</li></ul>' +
          '<div class="karte"><h3>Fortschritt je Kategorie</h3>' + D.kategorien.map(function (kat) {
            var ks = D.karten.filter(function (k) { return k.kat === kat; });
            var g = ks.filter(function (k) { return LP.karten[k.id] && LP.karten[k.id].s === 'gewusst'; }).length;
            return '<div style="margin:8px 0"><div class="klein" style="display:flex;justify-content:space-between"><span>' + esc(kat) + '</span><span class="mono">' + g + '/' + ks.length + '</span></div>' + balken(ks.length ? g / ks.length : 0) + '</div>';
          }).join('') + '</div>';
      }
    };
  }

  /* ---------- A1 Karteikarten ---------- */
  var K = { kat: 'alle', modus: 'alle', folge: null, pos: 0, um: false, fertig: false, runde: { g: 0, n: 0 } };
  function kartenPool() {
    return D.karten.filter(function (k) {
      if (K.kat !== 'alle' && k.kat !== K.kat) return false;
      if (K.modus === 'fehler') return LP.karten[k.id] && LP.karten[k.id].s === 'nochmal';
      return true;
    });
  }
  function baueFolge(misch) {
    var ids = kartenPool().map(function (k) { return k.id; });
    if (misch) mischen(ids);
    K.folge = ids; K.pos = 0; K.um = false; K.fertig = false; K.runde = { g: 0, n: 0 };
  }
  function karteVon(id) { return D.karten.filter(function (k) { return k.id === id; })[0]; }
  function vKarten() {
    if (!K.folge) baueFolge(false);
    return {
      titel: 'Karteikarten', unter: 'A1 · Lernen', zurueck: '#/lernen', nav: 'lernen',
      html: function () {
        var fehlerAnz = D.karten.filter(function (k) { return (K.kat === 'alle' || k.kat === K.kat) && LP.karten[k.id] && LP.karten[k.id].s === 'nochmal'; }).length;
        var poolAlle = D.karten.filter(function (k) { return K.kat === 'alle' || k.kat === K.kat; });
        var gew = poolAlle.filter(function (k) { return LP.karten[k.id] && LP.karten[k.id].s === 'gewusst'; }).length;
        var h = '<div class="karte"><label class="feld" style="margin-bottom:10px">Kategorie<select id="k-kat"><option value="alle">Alle Kategorien (' + D.karten.length + ')</option>' +
          D.kategorien.map(function (kat) { var n = D.karten.filter(function (k) { return k.kat === kat; }).length; return '<option value="' + esc(kat) + '"' + (K.kat === kat ? ' selected' : '') + '>' + esc(kat) + ' (' + n + ')</option>'; }).join('') +
          '</select></label>' + seg('k-modus', [{ v: 'alle', l: 'Alle Karten', s: poolAlle.length + (poolAlle.length === 1 ? ' Karte' : ' Karten') }, { v: 'fehler', l: 'Nur Fehler', s: fehlerAnz + (fehlerAnz === 1 ? ' Karte' : ' Karten') }], K.modus, 'zwei') +
          '<div class="knopfreihe" style="margin-top:10px"><button class="btn btn-klein" data-act="k-mischen">⤮ Mischen</button><button class="btn btn-klein" data-act="k-vorn">↺ Von vorn</button></div>' +
          '<div style="margin-top:12px"><div class="klein" style="display:flex;justify-content:space-between"><span>Gewusst in dieser Auswahl</span><span class="mono">' + gew + ' / ' + poolAlle.length + '</span></div>' + balken(poolAlle.length ? gew / poolAlle.length : 0) + '</div></div>';
        if (!K.folge.length) {
          return h + '<div class="karte" style="text-align:center"><p><strong>' + (K.modus === 'fehler' ? 'Keine Fehler-Karten in dieser Auswahl – stark!' : 'Keine Karten in dieser Auswahl.') + '</strong></p>' +
            (K.modus === 'fehler' ? '<button class="btn" data-act="k-modus" data-v="alle">Alle Karten lernen</button>' : '') + '</div>';
        }
        if (K.fertig) {
          return h + '<div class="karte" style="text-align:center"><h2>Durchgang beendet</h2><p><span class="badge ok">' + K.runde.g + ' gewusst</span> <span class="badge nok">' + K.runde.n + ' nochmal</span></p>' +
            '<div class="knopfreihe">' + (fehlerAnz ? '<button class="btn btn-rot" data-act="k-modus" data-v="fehler">Nur Fehler wiederholen (' + fehlerAnz + ')</button>' : '') +
            '<button class="btn btn-primaer" data-act="k-mischen">Neu gemischt starten</button></div></div>';
        }
        var k = karteVon(K.folge[K.pos]), st = LP.karten[k.id];
        h += '<div class="klein" style="display:flex;justify-content:space-between;margin:4px 2px 8px"><span>Karte <span class="mono">' + (K.pos + 1) + ' / ' + K.folge.length + '</span></span>' +
          (st ? '<span class="badge ' + (st.s === 'gewusst' ? 'ok' : 'nok') + '">zuletzt: ' + (st.s === 'gewusst' ? 'gewusst' : 'nochmal') + '</span>' : '<span class="badge neutral">neu</span>') + '</div>';
        h += '<button type="button" class="lernkarte' + (K.um ? ' umgedreht' : '') + '" data-act="k-um" aria-label="Karte umdrehen" style="width:100%;text-align:left;font:inherit;color:inherit">' +
          '<span class="kat">' + esc(k.kat) + '</span><span class="frage">' + t(k.f) + '</span>' +
          (K.um ? '<span class="antwort hervor">' + t(k.a) + '</span>' : '<span class="tipp">Tippen zum Umdrehen</span>') + '</button>';
        h += '<div class="knopfreihe" style="margin-top:12px"><button class="btn btn-rot" data-act="k-bew" data-v="nochmal">✕ Nochmal</button><button class="btn btn-gruen" data-act="k-bew" data-v="gewusst">✓ Gewusst</button></div>' +
          '<div class="knopfreihe" style="margin-top:10px"><button class="btn btn-sekundaer" data-act="k-nav" data-v="-1"' + (K.pos === 0 ? ' disabled' : '') + '>‹ Zurück</button><button class="btn btn-sekundaer" data-act="k-nav" data-v="1">Überspringen ›</button></div>';
        return h;
      },
      akt: {
        'k-um': function () { K.um = !K.um; neu(); },
        'k-bew': function (el) {
          var id = K.folge[K.pos]; LP.karten[id] = { s: el.dataset.v, t: Date.now() }; speichereLP();
          if (el.dataset.v === 'gewusst') K.runde.g++; else K.runde.n++;
          K.pos++; K.um = false; if (K.pos >= K.folge.length) K.fertig = true; neu();
        },
        'k-nav': function (el) { K.pos = Math.max(0, K.pos + Number(el.dataset.v)); K.um = false; if (K.pos >= K.folge.length) K.fertig = true; neu(); },
        'k-modus': function (el) { K.modus = el.dataset.v; baueFolge(true); neu(); },
        'k-mischen': function () { baueFolge(true); neu(); toast('Karten gemischt'); },
        'k-vorn': function () { baueFolge(false); neu(); }
      },
      aenderung: function (el) { if (el.id === 'k-kat') { K.kat = el.value; baueFolge(false); neu(); } }
    };
  }

  /* ---------- A2 Quiz ---------- */
  var Q = { phase: 'start', anzahl: null, kat: 'alle', fragen: [], i: 0, gewaehlt: null, richtig: 0, falsche: [] };
  function quizPool() { return D.quiz.filter(function (q) { return Q.kat === 'alle' || q.kat === Q.kat; }); }
  function quizStart() {
    var pool = mischen(quizPool().slice()).slice(0, Q.anzahl || E.quizAnzahl);
    Q.fragen = pool.map(function (q) {
      var opt = mischen([q.richtig].concat(q.falsch));
      return { q: q, optionen: opt, richtigIdx: opt.indexOf(q.richtig) };
    });
    Q.i = 0; Q.gewaehlt = null; Q.richtig = 0; Q.falsche = []; Q.phase = 'frage';
  }
  function vQuiz() {
    if (Q.anzahl == null) Q.anzahl = E.quizAnzahl;
    return {
      titel: 'Quiz', unter: 'A2 · Multiple Choice', zurueck: '#/lernen', nav: 'lernen',
      html: function () {
        if (Q.phase === 'start') {
          var kats = D.kategorien.filter(function (k) { return D.quiz.some(function (q) { return q.kat === k; }); });
          var verlauf = LP.quiz.slice(-5).reverse();
          return '<div class="karte"><h2>Neuer Durchlauf</h2><div class="feld-titel">Anzahl Fragen</div>' +
            seg('q-anz', [5, 10, 15, 20].map(function (n) { return { v: n, l: String(n) }; }), Q.anzahl, 'vier') +
            '<label class="feld" style="margin-top:14px">Thema<select id="q-kat"><option value="alle">Alle Themen (' + D.quiz.length + ' Fragen)</option>' +
            kats.map(function (k) { var n = D.quiz.filter(function (q) { return q.kat === k; }).length; return '<option value="' + esc(k) + '"' + (Q.kat === k ? ' selected' : '') + '>' + esc(k) + ' (' + n + ')</option>'; }).join('') + '</select></label>' +
            (quizPool().length < Q.anzahl ? '<p class="hinweis klein">Dieses Thema hat nur ' + quizPool().length + ' Fragen – es werden alle gestellt.</p>' : '') +
            '<button class="btn btn-primaer btn-voll" data-act="q-start">Quiz starten</button></div>' +
            (verlauf.length ? '<div class="karte"><h3>Letzte Ergebnisse</h3>' + tabelle(['Datum', 'Thema', 'Ergebnis'], verlauf.map(function (v) { return [zeitDE(v.datum), v.kat === 'alle' ? 'Alle' : v.kat, v.richtig + '/' + v.anzahl + ' · **' + v.prozent + ' %**']; }), ['', '', 'zahl']) + '</div>' : '');
        }
        if (Q.phase === 'ende') {
          var n = Q.fragen.length, pz = Math.round(Q.richtig / n * 100);
          return '<div class="karte" style="text-align:center"><div class="hinweis">Auswertung</div><div class="score" style="color:' + (pz >= 50 ? 'var(--gruen)' : 'var(--rot)') + '">' + pz + ' %</div>' +
            '<p><strong>' + Q.richtig + ' von ' + n + '</strong> richtig beantwortet</p>' + balken(Q.richtig / n, pz < 50) + '</div>' +
            (Q.falsche.length ? '<div class="karte"><h3>Das solltest du wiederholen</h3>' + Q.falsche.map(function (f) {
              return '<div style="margin-bottom:12px"><div><strong>' + t(f.q.frage) + '</strong></div><div class="klein">Richtig: <span style="color:var(--gruen);font-weight:700">' + t(f.q.richtig) + '</span> · deine Antwort: <span style="color:var(--rot)">' + t(f.gewaehlt) + '</span></div><div class="hinweis klein">' + t(f.q.erkl) + '</div></div>';
            }).join('') + '</div>' : '<div class="karte">' + ampel('ok', 'Alles richtig – sehr gut!') + '</div>') +
            '<div class="knopfreihe"><button class="btn btn-primaer" data-act="q-start">Neuer Durchlauf</button><button class="btn" data-act="q-zurueck">Einstellungen</button></div>';
        }
        var f = Q.fragen[Q.i], beantwortet = Q.gewaehlt != null;
        var h = '<div class="klein" style="display:flex;justify-content:space-between;margin:0 2px 6px"><span>Frage <span class="mono">' + (Q.i + 1) + ' / ' + Q.fragen.length + '</span></span><span class="badge neutral">' + esc(f.q.kat) + '</span></div>' +
          balken(Q.i / Q.fragen.length) + '<div class="karte" style="margin-top:12px"><h2 style="font-size:1.2rem">' + t(f.q.frage) + '</h2><div class="optionen">';
        h += f.optionen.map(function (o, i) {
          var kl = '';
          if (beantwortet) { if (i === f.richtigIdx) kl = ' richtig'; else if (i === Q.gewaehlt) kl = ' falsch'; }
          return '<button class="option' + kl + '" data-act="q-antwort" data-v="' + i + '"' + (beantwortet ? ' disabled' : '') + '><span class="bst">' + 'ABCD'[i] + '</span><span>' + t(o) + '</span></button>';
        }).join('') + '</div>';
        if (beantwortet) {
          var ok = Q.gewaehlt === f.richtigIdx;
          h += '<div class="erklaerung" style="border-left-color:' + (ok ? 'var(--gruen)' : 'var(--rot)') + '"><strong style="color:' + (ok ? 'var(--gruen)' : 'var(--rot)') + '">' + (ok ? '✓ Richtig!' : '✕ Leider falsch.') + '</strong> ' + t(f.q.erkl) + '</div>' +
            '<button class="btn btn-primaer btn-voll" style="margin-top:12px" data-act="q-weiter">' + (Q.i + 1 < Q.fragen.length ? 'Nächste Frage ›' : 'Zur Auswertung ›') + '</button>';
        }
        return h + '</div>';
      },
      akt: {
        'q-anz': function (el) { Q.anzahl = Number(el.dataset.v); neu(); },
        'q-start': function () { quizStart(); neu(); window.scrollTo(0, 0); },
        'q-zurueck': function () { Q.phase = 'start'; neu(); },
        'q-antwort': function (el) {
          if (Q.gewaehlt != null) return;
          var f = Q.fragen[Q.i]; Q.gewaehlt = Number(el.dataset.v);
          if (Q.gewaehlt === f.richtigIdx) Q.richtig++; else Q.falsche.push({ q: f.q, gewaehlt: f.optionen[Q.gewaehlt] });
          neu();
        },
        'q-weiter': function () {
          Q.gewaehlt = null; Q.i++;
          if (Q.i >= Q.fragen.length) {
            Q.phase = 'ende';
            LP.quiz.push({ datum: new Date().toISOString(), kat: Q.kat, anzahl: Q.fragen.length, richtig: Q.richtig, prozent: Math.round(Q.richtig / Q.fragen.length * 100) });
            LP.quiz = LP.quiz.slice(-20); speichereLP();
          }
          neu(); window.scrollTo(0, 0);
        }
      },
      aenderung: function (el) { if (el.id === 'q-kat') { Q.kat = el.value; neu(); } }
    };
  }

  /* ---------- A3 Merksätze ---------- */
  function vMerksaetze() {
    return {
      titel: 'Merksätze', unter: 'A3 · Kernaussagen', zurueck: '#/lernen', nav: 'lernen',
      html: function () {
        return '<div class="spalten2">' + D.merksaetze.map(function (m, i) {
          return '<div class="karte merk"><h3><span class="mono" style="color:var(--gruen)">' + (i + 1) + '</span> ' + esc(m.titel) + '</h3><ul>' +
            m.saetze.map(function (s) { return '<li>' + t(s) + '</li>'; }).join('') + '</ul></div>';
        }).join('') + '</div><a class="eintrag" href="#/nachschlagen/kennzahlen"><span class="eintrag-icon" style="background:#7B2E10">#</span><span class="eintrag-text"><b>Die Zahlen, die sitzen müssen</b><small>Kennwert-Tabelle im Nachschlagen</small></span></a>' + PRUEFHINWEIS;
      }
    };
  }

  /* =====================================================================
   * MODUL B – RECHNEN / NACHWEIS
   * ===================================================================== */
  function vRechnen() {
    return {
      titel: 'Rechnen / Nachweis', unter: 'Pegel · Grenzwerte · Nachweis', nav: 'rechnen',
      html: function () {
        return '<ul class="liste">' +
          '<li>' + eintrag('#/rechnen/grenzwert', '#7B2E10', 'B1', 'Grenzwert-Prüfer', 'Pegel gegen Tab. 4.5 prüfen – mit Ampel') + '</li>' +
          '<li>' + eintrag('#/rechnen/pegel', '#7B2E10', 'B2', 'Pegel-Addition', 'L_ges = 10 · lg (Σ 10^(Lᵢ/10)) mit Rechenweg') + '</li>' +
          '<li>' + eintrag('#/rechnen/nachweis', '#1F4E79', 'B3', 'Nachweis ohne Messung', 'Die 6 Bedingungen mit Druck- und Wand-Check') + '</li>' +
          '<li>' + eintrag('#/rechnen/vdi', '#1F4E79', 'B4', 'Schallschutzstufen VDI 4100', 'SSt I / II / III im Vergleich') + '</li></ul>' + KEINE_STATIK + PRUEFHINWEIS;
      }
    };
  }
  function exportKnopf() { return '<button class="btn btn-voll" data-act="export" style="margin-top:4px">⎙ Als PDF/Bericht exportieren</button>'; }

  /* ---------- B1 Grenzwert-Prüfer ---------- */
  var G = { quelle: 'wasser', raum: 'wohn', pegel: '', lueftung: false };
  function zeileVon(id) { return D.grenzwerte.zeilen.filter(function (z) { return z.id === id; })[0]; }
  function grenzRechnung() {
    var g = C.grenzwert(G.quelle, G.raum, G.lueftung);
    var L = C.parseZahl(G.pegel);
    return { g: g, L: L, b: isFinite(L) ? C.bewerte(L, g.wert) : null, ungueltig: G.pegel.trim() !== '' && !isFinite(L) };
  }
  function grenzRechenweg(r) {
    var g = r.g, z = g.zeile;
    var h = '<div class="schritt">1 · Zulässiger Wert (Tab. 4.5)</div><div class="zeile">' + t(z.name) + ' · ' + esc(g.raum.name) + ' → L_zul = ' + g.basis + ' dB(A)</div>';
    if (g.bonus) h += '<div class="zeile">+ ' + g.bonus + ' dB(A) lüftungstechn. Anlage (Fußnote 3) → L_zul = ' + g.wert + ' dB(A)</div>';
    if (r.b) {
      h += '<div class="schritt">2 · Vergleich</div><div class="zeile">' + t(z.kenngroesse) + ' = ' + C.fmt(r.b.pegel, 1) + ' dB(A) ' + (r.b.erfuellt ? '≤' : '>') + ' L_zul = ' + g.wert + ' dB(A)</div>' +
        '<div class="zeile erg">' + (r.b.erfuellt ? 'Reserve: ' + C.fmt(r.b.reserve, 1) + ' dB → erfüllt' : 'Überschreitung: ' + C.fmt(-r.b.reserve, 1) + ' dB → nicht erfüllt') + '</div>';
    }
    return h.replace(/L_zul/g, 'L<sub>zul</sub>');
  }
  function grenzErgebnis() {
    var r = grenzRechnung();
    var h = '<div class="karte"><div class="feld-titel">Zulässiger Wert</div><div class="ergebnis-gross">≤ ' + r.g.wert + ' <small>dB(A)</small></div>' +
      quelle(r.g.quelle + (r.g.bonus ? ', Fußnote 3' : '')) + '</div>';
    h += '<div class="karte"><div class="feld-titel">Rechenweg</div><div class="rechenweg">' + grenzRechenweg(r) + '</div>' +
      '<div class="annahme">Verglichen wird der auf 0,1 dB gerundete Pegel. Kurzzeitige Betätigungsspitzen bleiben unberücksichtigt (Fußnote 1).</div></div>';
    if (r.ungueltig) h += ampel('leer', 'Bitte eine Zahl eingeben', 'Komma als Dezimaltrenner, z. B. 28,5');
    else if (!r.b) h += ampel('leer', 'Pegel eingeben', 'Dann erscheint die Bewertung');
    else h += r.b.erfuellt ? ampel('ok', 'Erfüllt', C.fmt(r.b.pegel, 1) + ' dB(A) ≤ ' + r.g.wert + ' dB(A)') : ampel('nok', 'Nicht erfüllt', C.fmt(r.b.pegel, 1) + ' dB(A) > ' + r.g.wert + ' dB(A)');
    return h + '<div style="margin-top:14px">' + exportKnopf() + '</div>';
  }
  function vGrenz() {
    return {
      titel: 'Grenzwert-Prüfer', unter: 'B1 · ' + D.grenzwerte.quelle, zurueck: '#/rechnen', nav: 'rechnen',
      html: function () {
        var z = zeileVon(G.quelle);
        return '<div class="split"><div>' +
          '<div class="karte"><div class="feld-titel">Geräuschquelle</div>' + seg('g-quelle', D.grenzwerte.zeilen.map(function (r) { return { v: r.id, l: r.name, s: r.zusatz }; }), G.quelle) +
          (z.lueftung ? '<label class="schalter" style="margin-top:12px"><input type="checkbox" id="g-lueft"' + (G.lueftung ? ' checked' : '') + '><span>Lüftungstechnische Anlage – Dauergeräusch ohne auffällige Einzeltöne (+ 5 dB(A))</span></label>' : '') + '</div>' +
          '<div class="karte"><div class="feld-titel">Raumart</div>' + seg('g-raum', D.raeume.map(function (r) { return { v: r.id, l: r.name }; }), G.raum, 'zwei') + '</div>' +
          '<div class="karte"><label class="feld" style="margin-bottom:6px">Gemessener / geplanter Pegel ' + t(z.kenngroesse) + eingabe('g-pegel', G.pegel, 'dB(A)', 'z. B. 28') + '</label>' +
          '<p class="hinweis klein" style="margin:0">Mehrere Quellen? Erst <a href="#/rechnen/pegel">Pegel-Addition</a>, dann hier prüfen.</p></div>' +
          KEINE_STATIK + '</div><div class="sticky" id="erg">' + grenzErgebnis() + '</div></div>' + PRUEFHINWEIS;
      },
      akt: {
        'g-quelle': function (el) { G.quelle = el.dataset.v; if (!zeileVon(G.quelle).lueftung) G.lueftung = false; neu(); },
        'g-raum': function (el) { G.raum = el.dataset.v; neu(); },
        'export': function () {
          berichtExport('Grenzwert-Prüfung (B1)', function () {
            var r = grenzRechnung();
            return '<h2>Eingaben</h2><table><tr><th>Geräuschquelle</th><td>' + t(r.g.zeile.name) + (r.g.zeile.zusatz ? ' (' + esc(r.g.zeile.zusatz) + ')' : '') + '</td></tr>' +
              '<tr><th>Raumart</th><td>' + esc(r.g.raum.name) + '</td></tr>' +
              (r.g.zeile.lueftung ? '<tr><th>Lüftungstechn. Anlage (Dauergeräusch)</th><td>' + (G.lueftung ? 'ja (+ 5 dB(A))' : 'nein') + '</td></tr>' : '') +
              '<tr><th>Pegel ' + t(r.g.zeile.kenngroesse) + '</th><td>' + (r.b ? C.fmt(r.b.pegel, 1) + ' dB(A)' : '–') + '</td></tr></table>' +
              '<h2>Rechenweg</h2><div class="rw">' + grenzRechenweg(r) + '</div><p><em>Annahme: Vergleich mit dem auf 0,1 dB gerundeten Pegel; kurzzeitige Betätigungsspitzen unberücksichtigt.</em> Quelle: ' + esc(r.g.quelle) + '</p>' +
              '<h2>Ergebnis</h2><p class="' + (r.b ? (r.b.erfuellt ? 'ok' : 'nok') : '') + '">' + (r.b ? (r.b.erfuellt ? '✓ Anforderung erfüllt' : '✕ Anforderung nicht erfüllt') : 'Kein Pegel eingegeben') + '</p>';
          });
        }
      },
      eingabe: function (el) { if (el.id === 'g-pegel') { G.pegel = el.value; $('#erg').innerHTML = grenzErgebnis(); } },
      aenderung: function (el) { if (el.id === 'g-lueft') { G.lueftung = el.checked; $('#erg').innerHTML = grenzErgebnis(); } }
    };
  }

  /* ---------- B2 Pegel-Addition ---------- */
  var P = { zeilen: [{ name: '', L: '' }, { name: '', L: '' }], vergleich: '', eigen: '' };
  var VERGLEICHE = (function () {
    var v = [];
    D.grenzwerte.zeilen.forEach(function (z) {
      D.raeume.forEach(function (r) { v.push({ v: z.id + '|' + r.id, l: z.name + ' · ' + r.name + ' (≤ ' + z[r.id] + ')', q: z.id, r: r.id, l2: false }); });
      if (z.lueftung) D.raeume.forEach(function (r) { v.push({ v: z.id + '|' + r.id + '|l', l: 'Lüftungstechn. Anlage (Dauergeräusch) · ' + r.name + ' (≤ ' + (z[r.id] + D.grenzwerte.lueftungsBonus) + ')', q: z.id, r: r.id, l2: true }); });
    });
    return v;
  })();
  function pegelGrenze() {
    if (!P.vergleich) return null;
    if (P.vergleich === 'eigen') { var w = C.parseZahl(P.eigen); return isFinite(w) ? { wert: w, text: 'eigener Grenzwert', quelle: '' } : null; }
    var o = VERGLEICHE.filter(function (x) { return x.v === P.vergleich; })[0];
    if (!o) return null;
    var g = C.grenzwert(o.q, o.r, o.l2);
    return { wert: g.wert, text: o.l.replace(/ \(≤ \d+\)$/, ''), quelle: g.quelle + (g.bonus ? ', Fußnote 3' : ''), o: o };
  }
  function pegelRechnung() {
    var gueltig = P.zeilen.filter(function (z) { return isFinite(C.parseZahl(z.L)); });
    var ungueltig = P.zeilen.some(function (z) { return z.L.trim() !== '' && !isFinite(C.parseZahl(z.L)); });
    var r = C.pegelAddition(gueltig.map(function (z) { return z.L; }));
    return { r: r, zeilen: gueltig, ungueltig: ungueltig, grenze: pegelGrenze() };
  }
  function pegelRechenweg(pr) {
    var r = pr.r;
    var h = '<div class="schritt">Formel</div><div class="zeile">L_ges = 10 · lg ( Σ 10<sup>Lᵢ/10</sup> )</div>' +
      '<div class="schritt">Werte einsetzen</div><div class="zeile">L_ges = 10 · lg ( ' + r.pegel.map(function (l) { return '10<sup>' + zahlText(l) + '/10</sup>'; }).join(' + ') + ' )</div>' +
      '<div class="zeile">L_ges = 10 · lg ( ' + r.terme.map(function (x) { return C.fmt(x, 1); }).join(' + ') + ' )</div>' +
      '<div class="zeile">L_ges = 10 · lg ( ' + C.fmt(r.summe, 1) + ' )</div>' +
      '<div class="schritt">Ergebnis</div><div class="zeile erg">L_ges = ' + C.fmt(r.lges, 1) + ' dB(A)</div>';
    return h.replace(/L_ges/g, 'L<sub>ges</sub>');
  }
  function pegelErgebnis() {
    var pr = pegelRechnung(), r = pr.r;
    if (!r) return '<div class="karte"><div class="feld-titel">Gesamtpegel</div><div class="ergebnis-gross">– <small>dB(A)</small></div>' +
      (pr.ungueltig ? '<p class="hinweis">Bitte Zahlen eingeben (Komma erlaubt).</p>' : '<p class="hinweis">Mindestens einen Pegel eingeben.</p>') + '</div>';
    var h = '<div class="karte"><div class="feld-titel">Gesamtpegel</div><div class="ergebnis-gross">' + C.fmt(r.lges, 1) + ' <small>dB(A)</small></div>' +
      '<p class="klein" style="margin:6px 0 0">Zuschlag auf den lautesten Pegel (' + zahlText(r.lauteste) + ' dB(A)): <strong class="mono">+ ' + C.fmt(r.zuschlag, 1) + ' dB</strong></p>' +
      (r.pegel.length > 1 ? '<p class="klein" style="color:var(--rot)">Falsch wäre: ' + r.pegel.map(zahlText).join(' + ') + ' = ' + zahlText(r.arithmetisch) + ' dB – Pegel nie einfach addieren!</p>' : '') +
      (pr.ungueltig ? '<p class="annahme">Ungültige Einträge werden ignoriert.</p>' : '') + quelle(D.pegel.quelle) + '</div>' +
      '<div class="karte"><div class="feld-titel">Rechenweg</div><div class="rechenweg">' + pegelRechenweg(pr) + '</div></div>';
    if (pr.grenze) {
      var b = C.bewerte(r.lges, pr.grenze.wert);
      h += b.erfuellt ? ampel('ok', 'Erfüllt', C.fmt(b.pegel, 1) + ' dB(A) ≤ ' + zahlText(b.grenze) + ' dB(A) · ' + pr.grenze.text)
        : ampel('nok', 'Nicht erfüllt', C.fmt(b.pegel, 1) + ' dB(A) > ' + zahlText(b.grenze) + ' dB(A) · ' + pr.grenze.text);
      if (pr.grenze.quelle) h += '<div>' + quelle(pr.grenze.quelle) + '</div>';
    }
    return h + '<div class="knopfreihe" style="margin-top:14px"><button class="btn" data-act="p-uebergabe">→ an Grenzwert-Prüfer</button>' + exportKnopf() + '</div>';
  }
  function faustTabelle() {
    return tabelle(['Differenz ΔL', 'Zuschlag (Lernwert)', 'exakt'], D.pegel.faustwerte.map(function (f) {
      return [(f.ab ? '≥ ' : '') + f.dl + ' dB', f.zuschlag + ' dB', '+ ' + C.fmt(C.faustZuschlag(f.dl), 2) + ' dB'];
    }), ['zahl', 'zahl', 'zahl']);
  }
  function vPegel() {
    return {
      titel: 'Pegel-Addition', unter: 'B2 · energetische Addition', zurueck: '#/rechnen', nav: 'rechnen',
      html: function () {
        var zeilen = P.zeilen.map(function (z, i) {
          return '<div class="pegelzeile"><label class="klein">' + '<span class="nr">L' + (i + 1) + '</span> Quelle<input data-z="' + i + '" data-f="name" value="' + esc(z.name) + '" placeholder="optional" autocomplete="off"></label>' +
            '<label class="klein">dB(A)<input data-z="' + i + '" data-f="L" inputmode="decimal" value="' + esc(z.L) + '" placeholder="z. B. 28" autocomplete="off" style="font-family:var(--mono)"></label>' +
            '<button class="btn btn-icon btn-sekundaer" data-act="p-weg" data-v="' + i + '" aria-label="Pegel L' + (i + 1) + ' entfernen"' + (P.zeilen.length <= 1 ? ' disabled' : '') + '>✕</button></div>';
        }).join('');
        return '<div class="split"><div>' +
          '<div class="karte"><div class="feld-titel">Einzelpegel</div>' + zeilen +
          '<div class="knopfreihe" style="margin-top:6px"><button class="btn" data-act="p-neu">+ Pegel hinzufügen</button><button class="btn btn-sekundaer" data-act="p-beispiel">Beispiel laden</button></div></div>' +
          '<div class="karte"><label class="feld" style="margin-bottom:' + (P.vergleich === 'eigen' ? '12px' : '0') + '">Vergleich mit Grenzwert (optional)<select id="p-vergleich"><option value="">kein Vergleich</option>' +
          VERGLEICHE.map(function (v) { return '<option value="' + v.v + '"' + (P.vergleich === v.v ? ' selected' : '') + '>' + esc(v.l) + '</option>'; }).join('') +
          '<option value="eigen"' + (P.vergleich === 'eigen' ? ' selected' : '') + '>eigener Grenzwert …</option></select></label>' +
          (P.vergleich === 'eigen' ? '<label class="feld" style="margin:0">Eigener Grenzwert' + eingabe('p-eigen', P.eigen, 'dB(A)') + '</label>' : '') + '</div>' +
          '<details class="karte"><summary style="cursor:pointer;font-weight:700;min-height:32px">Faustwert-Tabelle (Zuschlag auf den größeren Pegel)</summary><div style="margin-top:10px">' + faustTabelle() +
          '<p class="hinweis klein" style="margin-top:8px">+ 3 dB = doppelte Energie · + 10 dB = subjektiv doppelt so laut · Zwischenraum ≈ 10 dB(A)</p></div></details>' +
          '</div><div class="sticky" id="erg">' + pegelErgebnis() + '</div></div>' + PRUEFHINWEIS;
      },
      init: function () { if (P.fokus != null) { var el = $('input[data-z="' + P.fokus + '"][data-f="L"]'); if (el) el.focus(); P.fokus = null; } },
      akt: {
        'p-neu': function () { P.zeilen.push({ name: '', L: '' }); P.fokus = P.zeilen.length - 1; neu(); },
        'p-weg': function (el) { P.zeilen.splice(Number(el.dataset.v), 1); neu(); },
        'p-beispiel': function () {
          P.zeilen = [{ name: 'Wasserinstallation', L: '28' }, { name: 'Aufzug', L: '26' }, { name: 'Lüftung', L: '24' }];
          P.vergleich = 'wasser|wohn'; neu(); toast('Testfall: 28 + 26 + 24 dB(A) im Schlafraum');
        },
        'p-uebergabe': function () {
          var pr = pegelRechnung(); if (!pr.r) { toast('Erst Pegel eingeben'); return; }
          G.pegel = C.fmt(pr.r.lges, 1);
          if (pr.grenze && pr.grenze.o) { G.quelle = pr.grenze.o.q; G.raum = pr.grenze.o.r; G.lueftung = pr.grenze.o.l2; }
          location.hash = '#/rechnen/grenzwert';
        },
        'export': function () {
          berichtExport('Pegel-Addition (B2)', function () {
            var pr = pegelRechnung(), r = pr.r;
            if (!r) return '<p>Keine Pegel eingegeben.</p>';
            var h = '<h2>Eingaben</h2><table><tr><th>Nr.</th><th>Quelle</th><th>Pegel</th></tr>' + pr.zeilen.map(function (z, i) {
              return '<tr><td>L' + (i + 1) + '</td><td>' + esc(z.name || '–') + '</td><td>' + zahlText(C.parseZahl(z.L)) + ' dB(A)</td></tr>';
            }).join('') + '</table><h2>Rechenweg</h2><div class="rw">' + pegelRechenweg(pr) + '</div>' +
              '<p>Zuschlag auf den lautesten Pegel: + ' + C.fmt(r.zuschlag, 1) + ' dB. Quelle: ' + esc(D.pegel.quelle) + '</p>';
            if (pr.grenze) {
              var b = C.bewerte(r.lges, pr.grenze.wert);
              h += '<h2>Vergleich</h2><p>' + esc(pr.grenze.text) + ': zulässig ≤ ' + zahlText(b.grenze) + ' dB(A)' + (pr.grenze.quelle ? ' (' + esc(pr.grenze.quelle) + ')' : '') + '</p>' +
                '<p class="' + (b.erfuellt ? 'ok' : 'nok') + '">' + C.fmt(b.pegel, 1) + ' dB(A) ' + (b.erfuellt ? '≤' : '>') + ' ' + zahlText(b.grenze) + ' dB(A) → ' + (b.erfuellt ? '✓ erfüllt' : '✕ nicht erfüllt') + '</p>';
            }
            return h;
          });
        }
      },
      eingabe: function (el) {
        if (el.dataset.z != null) { P.zeilen[Number(el.dataset.z)][el.dataset.f] = el.value; $('#erg').innerHTML = pegelErgebnis(); }
        else if (el.id === 'p-eigen') { P.eigen = el.value; $('#erg').innerHTML = pegelErgebnis(); }
      },
      aenderung: function (el) { if (el.id === 'p-vergleich') { P.vergleich = el.value; neu(); } }
    };
  }

  /* ---------- B3 Nachweis ohne Messung ---------- */
  var N = { haken: [false, false, false, false, false, false], druck: '', rho: '', d: '', zusatz: '' };
  function nachweisStand() {
    var dr = C.ruhedruck(N.druck), m = C.flaechenmasse(N.rho, N.d, N.zusatz), h = N.haken.slice();
    if (dr) h[1] = dr.erfuellt;
    if (m) h[4] = m.erfuellt;
    return { druck: dr, wand: m, haken: h, auto: [false, !!dr, false, false, !!m, false], n: C.nachweis(h) };
  }
  function druckText(dr) {
    if (!dr) return '<span class="hinweis">Ruhedruck eingeben → Bedingung wird automatisch geprüft.</span>';
    return '<span class="mono">p = ' + zahlText(dr.bar) + ' bar = ' + C.fmt(dr.mpa, 2) + ' MPa ' + (dr.erfuellt ? '≤' : '>') + ' 5 bar</span> ' +
      (dr.erfuellt ? '<span class="badge ok">✓ erfüllt</span>' : '<span class="badge nok">✕ Druckminderer erforderlich</span>');
  }
  function wandRechenweg(m) {
    return '<div class="zeile">m′ = ρ · d' + (m.zusatz ? ' + m′<sub>weitere</sub>' : '') + '</div>' +
      '<div class="zeile">m′ = ' + zahlText(m.rohdichte) + ' kg/m³ · ' + m.dickeM.toLocaleString('de-DE', { maximumFractionDigits: 4 }) + ' m' + (m.zusatz ? ' + ' + zahlText(m.zusatz) + ' kg/m²' : '') + '</div>' +
      '<div class="zeile erg">m′ = ' + C.fmt(m.masse, 0) + ' kg/m² ' + (m.erfuellt ? '≥' : '<') + ' 220 kg/m²</div>';
  }
  function wandText(m) {
    if (!m) return '<span class="hinweis">Rohdichte und Dicke eingeben → Bedingung wird automatisch geprüft.</span>';
    return '<div class="rechenweg" style="margin-top:6px">' + wandRechenweg(m) + '</div><div style="margin-top:6px">' + (m.erfuellt ? '<span class="badge ok">✓ erfüllt</span>' : '<span class="badge nok">✕ zu leicht</span>') + '</div>' +
      '<div class="annahme">Vereinfacht m′ = ρ · d; Umrechnung von Rohdichteklassen bzw. Putzanteile nach DIN 4109 Bbl. 1 sind selbst zu berücksichtigen (Feld „weitere Schichten").</div>';
  }
  function nachweisErgebnis() {
    var s = nachweisStand(), anz = s.haken.filter(Boolean).length;
    var h = s.n.gefuehrt ? ampel('ok', D.bedingungen.ergebnisJa, 'Alle 6 Bedingungen erfüllt') :
      ampel('nok', D.bedingungen.ergebnisNein, anz + ' von 6 Bedingungen erfüllt – offen: Nr. ' + s.n.offen.join(', '));
    return '<div class="karte"><div class="feld-titel">Ergebnis</div><div class="ergebnis-gross">' + anz + ' <small>/ 6 erfüllt</small></div>' + balken(anz / 6, !s.n.gefuehrt) + '</div>' + h +
      '<div style="margin-top:6px">' + quelle(D.bedingungen.quelle) + '</div><div style="margin-top:14px">' + exportKnopf() + '</div>';
  }
  function vNachweis() {
    return {
      titel: 'Nachweis ohne Messung', unter: 'B3 · ' + D.bedingungen.quelle, zurueck: '#/rechnen', nav: 'rechnen',
      html: function () {
        var s = nachweisStand();
        var liste = D.bedingungen.liste.map(function (b, i) {
          var h = '<div class="karte"><label class="schalter"><input type="checkbox" data-bed="' + i + '"' + (s.haken[i] ? ' checked' : '') + (s.auto[i] ? ' disabled' : '') + '>' +
            '<span><span class="mono" style="color:var(--blau)">' + b.nr + '</span> ' + esc(b.titel) + (s.auto[i] ? ' <span class="badge neutral">aus Rechnung</span>' : '') + '</span></label>' +
            '<p class="klein" style="margin:2px 0 0 38px">' + t(b.kern) + '</p>';
          if (b.rechner === 'druck') h += '<div style="margin:12px 0 0 38px"><label class="feld" style="margin-bottom:6px">Ruhedruck vor den Armaturen' + eingabe('n-druck', N.druck, 'bar', 'z. B. 4,5') + '</label><div id="n-druck-erg" class="klein">' + druckText(s.druck) + '</div></div>';
          if (b.rechner === 'wand') h += '<div style="margin:12px 0 0 38px"><div class="split" style="gap:0 12px"><label class="feld" style="margin-bottom:8px">Rohdichte ρ' + eingabe('n-rho', N.rho, 'kg/m³', 'z. B. 1800') + '</label>' +
            '<label class="feld" style="margin-bottom:8px">Wanddicke d' + eingabe('n-d', N.d, 'cm', 'z. B. 17,5') + '</label></div>' +
            '<label class="feld" style="margin-bottom:6px">weitere Schichten, z. B. Putz <span class="einheit-label">(optional)</span>' + eingabe('n-zusatz', N.zusatz, 'kg/m²', '0') + '</label><div id="n-wand-erg" class="klein">' + wandText(s.wand) + '</div></div>';
          return h + '</div>';
        }).join('');
        return '<div class="split"><div>' + liste + '</div><div class="sticky" id="erg">' + nachweisErgebnis() + '</div></div>' + KEINE_STATIK + PRUEFHINWEIS;
      },
      akt: {
        'export': function () {
          berichtExport('Nachweis ohne Messung (B3)', function () {
            var s = nachweisStand();
            var h = '<h2>Bedingungen (' + esc(D.bedingungen.quelle) + ')</h2><table><tr><th>Nr.</th><th>Bedingung</th><th>Status</th></tr>' + D.bedingungen.liste.map(function (b, i) {
              return '<tr><td>' + b.nr + '</td><td><strong>' + esc(b.titel) + '</strong><br>' + t(b.kern) + '</td><td class="' + (s.haken[i] ? 'ok' : 'nok') + '">' + (s.haken[i] ? '✓ erfüllt' : '✕ nicht erfüllt') + (s.auto[i] ? ' (berechnet)' : '') + '</td></tr>';
            }).join('') + '</table>';
            if (s.druck) h += '<h3>Ruhedruck</h3><div class="rw">p = ' + zahlText(s.druck.bar) + ' bar ' + (s.druck.erfuellt ? '≤' : '>') + ' 5 bar</div>';
            if (s.wand) h += '<h3>Flächenbezogene Masse der Installationswand</h3><div class="rw">' + wandRechenweg(s.wand) + '</div><p><em>Annahme: vereinfacht m′ = ρ · d (+ weitere Schichten).</em></p>';
            return h + '<h2>Ergebnis</h2><p class="' + (s.n.gefuehrt ? 'ok' : 'nok') + '">' + (s.n.gefuehrt ? '✓ ' + D.bedingungen.ergebnisJa : '✕ ' + D.bedingungen.ergebnisNein + ' (offen: Nr. ' + s.n.offen.join(', ') + ')') + '</p>';
          });
        }
      },
      eingabe: function (el) {
        var feld = { 'n-druck': 'druck', 'n-rho': 'rho', 'n-d': 'd', 'n-zusatz': 'zusatz' }[el.id];
        if (!feld) return;
        N[feld] = el.value;
        var s = nachweisStand();
        if (feld === 'druck') $('#n-druck-erg').innerHTML = druckText(s.druck); else $('#n-wand-erg').innerHTML = wandText(s.wand);
        [1, 4].forEach(function (i) {
          var cb = $('input[data-bed="' + i + '"]'); cb.checked = s.haken[i]; cb.disabled = s.auto[i];
          var lab = cb.parentNode.querySelector('.badge'); if (s.auto[i] && !lab) cb.nextElementSibling.insertAdjacentHTML('beforeend', ' <span class="badge neutral">aus Rechnung</span>'); if (!s.auto[i] && lab) lab.remove();
        });
        $('#erg').innerHTML = nachweisErgebnis();
      },
      aenderung: function (el) { if (el.dataset.bed != null) { N.haken[Number(el.dataset.bed)] = el.checked; $('#erg').innerHTML = nachweisErgebnis(); } }
    };
  }

  /* ---------- B4 VDI 4100 ---------- */
  var V = { stufe: 1 };
  function vdiTabelle(stufe, druck) {
    return '<table class="' + (druck ? '' : 'tab') + '"><thead><tr><th>Kriterium</th><th>Größe</th>' + D.vdi.stufen.map(function (s, i) {
      return '<th class="zahl' + (i === stufe ? ' aktiv' : '') + '">' + s + (i === 0 ? ' (= DIN)' : '') + '</th>';
    }).join('') + '</tr></thead><tbody>' + D.vdi.zeilen.map(function (z) {
      return '<tr><td>' + t(z.kriterium) + '<div class="klein hinweis">' + (z.besser === 'hoeher' ? '↑ höher = besser' : '↓ niedriger = besser') + '</div></td><td>' + t(z.groesse) + ' [' + z.einheit + ']</td>' +
        z.werte.map(function (w, i) { return '<td class="zahl mono' + (i === stufe ? ' aktiv' : '') + '">' + w + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
  }
  function vVdi() {
    return {
      titel: 'Schallschutzstufen', unter: 'B4 · ' + D.vdi.quelle, zurueck: '#/rechnen', nav: 'rechnen',
      html: function () {
        var s = V.stufe;
        var karten = D.vdi.zeilen.map(function (z) {
          var d = z.werte[s] - z.werte[0];
          return '<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--linie)"><div><div style="font-weight:600">' + t(z.kriterium) + '</div><div class="klein hinweis">' + t(z.groesse) + ' · ' + (z.besser === 'hoeher' ? '↑ höher = besser' : '↓ niedriger = besser') + '</div></div>' +
            '<div style="text-align:right;white-space:nowrap"><div class="mono" style="font-size:1.4rem;font-weight:800;color:var(--rost)">' + (z.besser === 'hoeher' ? '≥ ' : '≤ ') + z.werte[s] + '</div><div class="klein mono hinweis">' + z.einheit + (s && d ? ' · ' + (d > 0 ? '+' : '') + d + ' ggü. SSt I' : '') + '</div></div></div>';
        }).join('');
        return '<div class="karte merk"><h3>Merkhilfe</h3><ul>' + D.vdi.merkhilfe.map(function (m) { return '<li>' + t(m) + '</li>'; }).join('') + '</ul></div>' +
          '<div class="split"><div class="karte"><div class="feld-titel">Schallschutzstufe wählen</div>' + seg('v-stufe', D.vdi.stufen.map(function (x, i) { return { v: i, l: x, s: i === 0 ? '= DIN 4109' : 'erhöht' }; }), s, 'drei') +
          '<div style="margin-top:8px">' + karten + '</div>' + quelle(D.vdi.quelle) + '</div>' +
          '<div class="karte"><div class="feld-titel">Alle Stufen im Vergleich</div><div class="tabwrap">' + vdiTabelle(s) + '</div><div style="margin-top:12px">' + exportKnopf() + '</div></div></div>' + PRUEFHINWEIS;
      },
      akt: {
        'v-stufe': function (el) { V.stufe = Number(el.dataset.v); neu(); },
        'export': function () {
          berichtExport('Schallschutzstufen VDI 4100 (B4)', function () {
            return '<h2>Gewählte Stufe: ' + D.vdi.stufen[V.stufe] + '</h2>' + vdiTabelle(V.stufe, true) +
              '<p>Quelle: ' + esc(D.vdi.quelle) + '. ' + D.vdi.merkhilfe.map(t).join(' ') + '</p>';
          });
        }
      }
    };
  }

  /* =====================================================================
   * NACHSCHLAGEN
   * ===================================================================== */
  function nachAbschnitte() {
    var G5 = D.grenzwerte, A = D.anwendung;
    return [
      { id: 'anwendung', titel: 'Anwendungsbereich · DIN 4109 vs. VDI 4100', html:
        '<div class="split"><div><h3 style="color:var(--gruen)">Schützt gegen</h3><ul>' + A.schuetzt.map(function (s) { return '<li>' + t(s) + '</li>'; }).join('') + '</ul></div>' +
        '<div><h3 style="color:var(--rot)">Gilt nicht für</h3><ul>' + A.nicht.map(function (s) { return '<li>' + t(s) + '</li>'; }).join('') + '</ul></div></div>' +
        tabelle(['', 'DIN 4109', 'VDI 4100'], A.vergleich) + '<ul style="margin-top:10px">' + A.merke.map(function (s) { return '<li>' + t(s) + '</li>'; }).join('') + '</ul>' + quelle(A.quelle) },
      { id: 'kenngroessen', titel: 'Kenngrößen & schutzbedürftige Räume (Tab. 4.1)', html:
        tabelle(['Geräuschquelle', 'Kenngröße', 'Norm'], D.kenngroessen.zeilen.map(function (z) { return [z.quelle, '**' + z.groesse + '** – ' + z.name, z.norm]; })) +
        '<h3 style="margin-top:14px">Schutzbedürftige Räume</h3><ul>' + D.kenngroessen.schutzRaeume.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' + quelle(D.kenngroessen.quelle) },
      { id: 'grenzwerte', titel: 'Zulässige Schalldruckpegel (Tab. 4.5)', html:
        tabelle(['Geräuschquelle', 'Kenngröße', 'Wohn-/Schlafraum', 'Unterricht/Arbeit'], G5.zeilen.map(function (z) {
          return { zellen: [z.name + (z.zusatz ? ' (' + z.zusatz + ')' : ''), z.kenngroesse, '≤ ' + z.wohn + ' dB(A)', '≤ ' + z.arbeit + ' dB(A)'], markiert: z.id === 'nacht' };
        }), ['', '', 'zahl', 'zahl']) +
        '<ul style="margin-top:10px">' + G5.fussnoten.map(function (f) { return '<li class="klein">' + t(f) + '</li>'; }).join('') + '</ul>' +
        '<div class="karte merk" style="margin-top:10px"><h3>Systematik statt Auswendiglernen</h3><ul>' + G5.systematik.map(function (s) { return '<li>' + t(s) + '</li>'; }).join('') + '</ul></div>' +
        quelle(G5.quelle) + ' <a class="btn btn-klein" href="#/rechnen/grenzwert" style="margin-left:8px">→ Grenzwert-Prüfer</a>' },
      { id: 'vdi', titel: 'VDI 4100 – Schallschutzstufen (Tab. 4.7)', html:
        '<div class="tabwrap">' + vdiTabelle(-1) + '</div><ul style="margin-top:10px">' + D.vdi.merkhilfe.map(function (m) { return '<li>' + t(m) + '</li>'; }).join('') + '</ul>' +
        quelle(D.vdi.quelle) + ' <a class="btn btn-klein" href="#/rechnen/vdi" style="margin-left:8px">→ Stufen-Vergleich</a>' },
      { id: 'armaturen', titel: 'Armaturengruppen & Durchflussklassen (Tab. 4.8 / 4.9)', html:
        tabelle(['Gruppe', "L_ap", 'Beispiele'], D.armaturen.gruppen.map(function (g) { return ['**' + g.gruppe + '**', '≤ ' + g.lap + ' dB(A)', g.beispiele]; }), ['', 'zahl', '']) + quelle(D.armaturen.quelle) +
        '<h3 style="margin-top:16px">Durchflussklassen</h3><p class="klein hinweis">' + esc(D.durchfluss.bedingung) + '</p>' +
        tabelle(D.durchfluss.klassen.map(function (k) { return k.klasse; }), [D.durchfluss.klassen.map(function (k) { return k.q + ' l/s'; })]) + quelle(D.durchfluss.quelle) },
      { id: 'pegel', titel: 'Pegelrechnung & Faustwerte', html:
        '<div class="rechenweg"><div class="zeile">L = 10 · lg (p²/p₀²) = 20 · lg (p/p₀) &nbsp; mit p₀ = ' + esc(D.pegel.p0) + '</div><div class="zeile">L<sub>ges</sub> = 10 · lg ( Σ 10<sup>Lᵢ/10</sup> ) &nbsp; – Pegel <strong>niemals</strong> einfach addieren</div></div>' +
        '<h3 style="margin-top:14px">Faustwerte</h3>' + faustTabelle() + '<ul style="margin-top:10px">' + D.pegel.regeln.map(function (r) { return '<li>' + t(r) + '</li>'; }).join('') + '</ul>' +
        '<h3>Planerische Konsequenz</h3><ul>' + D.pegel.konsequenz.map(function (r) { return '<li>' + t(r) + '</li>'; }).join('') + '</ul>' +
        quelle(D.pegel.quelle) + ' <a class="btn btn-klein" href="#/rechnen/pegel" style="margin-left:8px">→ Pegel-Addition</a>' },
      { id: 'nachweis', titel: 'Gütenachweis ohne Messung – 6 Bedingungen', html:
        '<p>Für haustechnische Anlagen gibt es <strong>kein Bemessungsverfahren</strong> – der Pegel ist quantitativ häufig nicht vorhersagbar. Der Nachweis gilt als erbracht, wenn alle sechs Bedingungen erfüllt sind:</p>' +
        tabelle(['Nr.', 'Bedingung', 'Kennwert / Kern'], D.bedingungen.liste.map(function (b) { return ['**' + b.nr + '**', b.titel, b.kern]; })) +
        '<p style="margin-top:10px">Nur wenn eine Bedingung <strong>nicht</strong> erfüllt ist → <strong>bauakustische Messung</strong>.</p>' +
        quelle(D.bedingungen.quelle) + ' <a class="btn btn-klein" href="#/rechnen/nachweis" style="margin-left:8px">→ Nachweis-Assistent</a>' },
      { id: 'schallarten', titel: 'Luftschall vs. Körperschall', html:
        '<div class="karte merk"><p style="margin:0">' + t(D.schallarten.kernsatz) + '</p></div>' + tabelle(['', 'Luftschall', 'Körperschall'], D.schallarten.zeilen) + quelle(D.schallarten.quelle) },
      { id: 'quelle', titel: 'Maßnahmen an der Quelle (Einzelgeräusche)', html:
        tabelle(['Maßnahme', 'Kennwert', 'Wirkung'], D.quellenMassnahmen.zeilen) + quelle(D.quellenMassnahmen.quelle) },
      { id: 'grundriss', titel: 'Grundriss & Standort', html:
        '<div class="karte merk"><p style="margin:0">' + t(D.grundriss.zwischenraum) + '</p></div><ol>' + D.grundriss.regeln.map(function (r) { return '<li>' + t(r) + '</li>'; }).join('') + '</ol>' +
        '<p>' + t(D.grundriss.standort) + '</p>' + quelle(D.grundriss.quelle) },
      { id: 'kennzahlen', titel: 'Die Zahlen, die sitzen müssen', html:
        tabelle(['Kennwert', 'Wert', 'Quelle'], D.kennzahlen, ['', 'zahl mono', 'klein']) },
      { id: 'skizzen', titel: 'Detailskizzen (Konstruktionsdetails)', html:
        '<p class="klein hinweis">Rohrschelle · Pumpenfundament · Gurgelgeräusche · Rand-/Mittelzone · Strahlregler & Wasserschalldämpfer · Wandanschluss · Küchenspüle. Tippen öffnet die Skizze groß.</p>' +
        '<a href="skizzen.svg" target="_blank" rel="noopener"><img class="skizze" src="skizzen.svg" alt="Detailskizzen zum Schallschutz nach DIN 4109" loading="lazy"></a>' }
    ];
  }
  var NS = { suche: '' };
  function vNachschlagen(offenId) {
    var abs = nachAbschnitte();
    var texte = {};
    return {
      titel: 'Nachschlagen', unter: 'Normen · Tabellen · Werte', zurueck: offenId ? '#/nachschlagen' : null, nav: 'mehr',
      html: function () {
        return '<label class="feld">Suchen<input id="ns-suche" type="search" placeholder="z. B. Ruhedruck, 220, Randzone" value="' + esc(NS.suche) + '" autocomplete="off"></label>' +
          '<div id="ns-liste">' + abs.map(function (a, i) {
            return '<details class="nach" id="ns-' + a.id + '"' + (offenId === a.id ? ' open' : '') + '><summary><span class="nr">' + (i + 1) + '</span>' + esc(a.titel) + '</summary><div class="inhalt">' + a.html + '</div></details>';
          }).join('') + '</div><p id="ns-leer" class="hinweis" hidden>Nichts gefunden.</p>' + PRUEFHINWEIS +
          '<p class="pruefen">Tabellen- und Bildnummern nach Lernunterlage (Buchvorlage).</p>';
      },
      init: function () {
        $$('#ns-liste details').forEach(function (d) { texte[d.id] = d.textContent.toLowerCase(); });
        if (NS.suche) filtern();
        if (offenId) { var el = $('#ns-' + offenId); if (el) setTimeout(function () { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); }, 30); }
      },
      eingabe: function (el) { if (el.id === 'ns-suche') { NS.suche = el.value; filtern(); } }
    };
    function filtern() {
      var q = NS.suche.trim().toLowerCase(), treffer = 0;
      $$('#ns-liste details').forEach(function (d) {
        var ok = !q || texte[d.id].indexOf(q) >= 0;
        d.hidden = !ok; if (ok) treffer++;
        if (q && ok) d.open = true;
      });
      $('#ns-leer').hidden = treffer > 0;
    }
  }

  /* =====================================================================
   * MODUL C – BAUSTELLEN-CHECKLISTE
   * ===================================================================== */
  function projektVon(id) { return PR.filter(function (p) { return p.id === id; })[0]; }
  function neuesProjekt(name, bv, datum) {
    var jetzt = new Date().toISOString();
    var p = {
      id: uid(), name: name, bauvorhaben: bv, datum: datum, erstellt: jetzt, geaendert: jetzt,
      vorlage: { id: D.checklisteVorlage.id, name: D.checklisteVorlage.name },
      kategorien: JSON.parse(JSON.stringify(D.checklisteVorlage.kategorien)),
      eintraege: {}
    };
    PR.unshift(p); speichereProjekte(); return p;
  }
  function eintragVon(p, posId) {
    if (!p.eintraege[posId]) p.eintraege[posId] = { status: 'offen', notiz: '', fotos: [], geaendert: null };
    return p.eintraege[posId];
  }
  function beruehrt(p, e) { var j = new Date().toISOString(); if (e) e.geaendert = j; p.geaendert = j; }

  var CL = { neuOffen: false };
  function vCheckliste() {
    return {
      titel: 'Baustellen-Checkliste', unter: 'Projekte · Prüflisten', nav: 'checkliste',
      html: function () {
        var form = '<div class="karte"' + (CL.neuOffen || !PR.length ? '' : ' hidden') + ' id="neu-form"><h2>Neues Projekt</h2>' +
          '<label class="feld">Projektname<input id="np-name" autocomplete="off" placeholder="z. B. MFH Musterstraße 12"></label>' +
          '<label class="feld">Bauvorhaben<input id="np-bv" autocomplete="off" placeholder="z. B. Neubau 8 WE, Haus B"></label>' +
          '<label class="feld">Datum<input id="np-datum" type="date" value="' + heute() + '"></label>' +
          '<div class="knopfreihe">' + (PR.length ? '<button class="btn btn-sekundaer" data-act="np-abbr">Abbrechen</button>' : '') + '<button class="btn btn-primaer" data-act="np-anlegen">Projekt anlegen</button></div>' +
          '<p class="hinweis klein" style="margin-top:10px">Die Prüfliste wird aus dem Maßnahmenkatalog (' + D.checklisteVorlage.kategorien.length + ' Gruppen, ' +
          D.checklisteVorlage.kategorien.reduce(function (s, k) { return s + k.positionen.length; }, 0) + ' Positionen) erstellt und kann um eigene Positionen ergänzt werden.</p></div>';
        var liste = PR.map(function (p) {
          var st = projektStand(p);
          return '<a class="karte projektkarte" href="#/checkliste/' + encodeURIComponent(p.id) + '"><div class="kopf"><h3 style="margin:0">' + esc(p.name) + '</h3><span class="mono klein">' + datumDE(p.datum) + '</span></div>' +
            (p.bauvorhaben ? '<div class="hinweis klein">' + esc(p.bauvorhaben) + '</div>' : '') +
            '<div class="klein" style="margin:10px 0 4px"><strong class="mono">' + st.erledigt + ' von ' + st.relevant + '</strong> erledigt</div>' + balken(st.relevant ? st.erledigt / st.relevant : 0) +
            '<div class="zaehler">' + (st.mangel ? '<span class="badge nok">' + st.mangel + ' Mangel</span>' : '') + '<span class="badge neutral">' + st.offen + ' offen</span>' + (st.nz ? '<span class="badge neutral">' + st.nz + ' n. z.</span>' : '') + '</div></a>';
        }).join('');
        return (PR.length && !CL.neuOffen ? '<button class="btn btn-primaer btn-voll" data-act="np-zeigen" style="margin-bottom:14px">+ Neues Projekt</button>' : '') + form +
          (PR.length ? '<div class="abschnitt-titel">Projekte (' + PR.length + ')</div><div class="spalten2">' + liste + '</div>' : '') +
          '<p class="pruefen">Daten bleiben lokal auf diesem Gerät. Sicherung über Mehr → Datensicherung.</p>';
      },
      akt: {
        'np-zeigen': function () { CL.neuOffen = true; neu(); var n = $('#np-name'); if (n) n.focus(); },
        'np-abbr': function () { CL.neuOffen = false; neu(); },
        'np-anlegen': function () {
          var name = $('#np-name').value.trim();
          if (!name) { toast('Bitte einen Projektnamen eingeben'); $('#np-name').focus(); return; }
          var p = neuesProjekt(name, $('#np-bv').value.trim(), $('#np-datum').value || heute());
          CL.neuOffen = false; location.hash = '#/checkliste/' + encodeURIComponent(p.id);
        }
      }
    };
  }

  var PV = { offen: null, filter: 'alle', bearbeiten: false, zu: {} };
  function statusName(s) { return { offen: 'offen', erledigt: 'erledigt', nz: 'nicht zutreffend', mangel: 'Mangel' }[s] || s; }
  function vProjekt(id) {
    var p = projektVon(id);
    if (!p) return { titel: 'Projekt nicht gefunden', zurueck: '#/checkliste', nav: 'checkliste', html: function () { return '<div class="karte">Dieses Projekt existiert nicht (mehr). <a href="#/checkliste">Zur Projektliste</a></div>'; } };
    if (PV.pid !== id) { PV = { pid: id, offen: null, filter: 'alle', bearbeiten: false, zu: {} }; }
    var speicherT;
    function spaeterSpeichern() { clearTimeout(speicherT); speicherT = setTimeout(speichereProjekte, 400); }
    function positionHtml(kat, pos) {
      var e = p.eintraege[pos.id] || { status: 'offen', notiz: '', fotos: [] };
      var offen = PV.offen === pos.id;
      var h = '<div class="position st-' + e.status + '" id="pos-' + pos.id + '"><div class="ptext">' + t(pos.text) + (pos.eigene ? ' <span class="badge neutral">eigene</span>' : '') + '</div>' +
        (pos.hinweis ? '<div class="pmeta">' + t(pos.hinweis) + '</div>' : '') +
        '<div class="statuswahl" role="group" aria-label="Status">' + D.status.map(function (s) {
          return '<button data-act="pv-status" data-pos="' + pos.id + '" data-status="' + s.id + '" aria-pressed="' + (e.status === s.id) + '">' + (s.id === 'nz' ? 'n. z.' : esc(s.name)) + '</button>';
        }).join('') + '</div>';
      if (!offen && (e.notiz || (e.fotos && e.fotos.length))) h += '<div class="pmeta">' + (e.fotos && e.fotos.length ? e.fotos.length + ' Foto' + (e.fotos.length > 1 ? 's' : '') + ' · ' : '') + (e.notiz ? '„' + esc(e.notiz.length > 80 ? e.notiz.slice(0, 80) + '…' : e.notiz) + '"' : '') + '</div>';
      if (e.geaendert) h += '<div class="pmeta">geändert ' + esc(zeitDE(e.geaendert)) + '</div>';
      h += '<div class="details-zeile"><button class="btn btn-klein btn-sekundaer" data-act="pv-details" data-pos="' + pos.id + '" aria-expanded="' + offen + '">' + (offen ? '▲ Schließen' : '✎ Notiz & Fotos' + (e.fotos && e.fotos.length ? ' (' + e.fotos.length + ')' : '')) + '</button></div>';
      if (offen) {
        h += '<div class="detailbereich"><label class="feld" style="margin-bottom:8px">Notiz<textarea data-notiz="' + pos.id + '" placeholder="Beobachtung, Mangelbeschreibung …">' + esc(e.notiz) + '</textarea></label>' +
          '<div class="knopfreihe"><button class="btn btn-klein" data-act="pv-diktat" data-pos="' + pos.id + '">🎤 Diktieren</button>' +
          '<label class="btn btn-klein">📷 Kamera<input type="file" accept="image/*" capture="environment" data-foto="' + pos.id + '" hidden></label>' +
          '<label class="btn btn-klein">🖼 Galerie<input type="file" accept="image/*" multiple data-foto="' + pos.id + '" hidden></label></div>' +
          '<div class="fotos">' + (e.fotos || []).map(function (fid) {
            return '<div class="foto"><a data-foto-link="' + fid + '" target="_blank" rel="noopener"><img data-foto-id="' + fid + '" alt="Foto zu: ' + esc(pos.text) + '"></a><button data-act="pv-foto-weg" data-pos="' + pos.id + '" data-v="' + fid + '" aria-label="Foto löschen">✕</button></div>';
          }).join('') + '</div>' +
          (pos.eigene ? '<button class="btn btn-klein btn-sekundaer" data-act="pv-pos-weg" data-pos="' + pos.id + '" style="color:var(--rot)">Eigene Position entfernen</button>' : '') + '</div>';
      }
      return h + '</div>';
    }
    return {
      titel: p.name, unter: (p.bauvorhaben || 'Prüfliste') + ' · ' + datumDE(p.datum), zurueck: '#/checkliste', nav: 'checkliste',
      html: function () {
        var st = projektStand(p);
        var kopf = '<div class="karte">';
        if (PV.bearbeiten) {
          kopf += '<h2>Projekt bearbeiten</h2><label class="feld">Projektname<input id="pe-name" value="' + esc(p.name) + '"></label><label class="feld">Bauvorhaben<input id="pe-bv" value="' + esc(p.bauvorhaben) + '"></label>' +
            '<label class="feld">Datum<input id="pe-datum" type="date" value="' + esc(p.datum) + '"></label><div class="knopfreihe"><button class="btn btn-sekundaer" data-act="pv-bearb-abbr">Abbrechen</button><button class="btn btn-primaer" data-act="pv-bearb-ok">Speichern</button></div>' +
            '<hr style="border:0;border-top:1px solid var(--linie);margin:16px 0"><button class="btn btn-rot btn-voll" data-act="pv-loeschen">Projekt löschen</button>';
        } else {
          kopf += '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><div><strong class="mono" style="font-size:1.4rem">' + st.erledigt + ' von ' + st.relevant + '</strong> erledigt</div><span class="mono klein">' + (st.relevant ? Math.round(st.erledigt / st.relevant * 100) : 0) + ' %</span></div>' +
            balken(st.relevant ? st.erledigt / st.relevant : 0) +
            '<div class="zaehler">' + (st.mangel ? '<span class="badge nok">' + st.mangel + ' Mangel</span>' : '') + '<span class="badge neutral">' + st.offen + ' offen</span>' + (st.nz ? '<span class="badge neutral">' + st.nz + ' nicht zutreffend</span>' : '') + '</div>' +
            '<div class="knopfreihe" style="margin-top:12px"><button class="btn btn-primaer" data-act="pv-export">⎙ PDF-Protokoll</button><button class="btn" data-act="pv-bearb">Bearbeiten</button></div>';
        }
        kopf += '</div>';
        var filter = seg('pv-filter', [{ v: 'alle', l: 'Alle', s: st.n + '' }, { v: 'offen', l: 'Offen', s: st.offen + '' }, { v: 'mangel', l: 'Mängel', s: st.mangel + '' }], PV.filter, 'drei');
        var gruppen = p.kategorien.map(function (k) {
          var pos = k.positionen.filter(function (x) {
            var s = (p.eintraege[x.id] || {}).status || 'offen';
            return PV.filter === 'alle' || s === PV.filter;
          });
          var erl = k.positionen.filter(function (x) { return (p.eintraege[x.id] || {}).status === 'erledigt'; }).length;
          var rel = k.positionen.filter(function (x) { return (p.eintraege[x.id] || {}).status !== 'nz'; }).length;
          if (PV.filter !== 'alle' && !pos.length) return '';
          return '<details class="gruppe" data-gruppe="' + k.id + '"' + (PV.zu[k.id] ? '' : ' open') + '><summary>' + esc(k.name) + '<span class="anz">' + erl + '/' + rel + '</span></summary>' +
            pos.map(function (x) { return positionHtml(k, x); }).join('') +
            (PV.filter === 'alle' ? '<button class="btn btn-klein btn-sekundaer" style="margin-top:8px" data-act="pv-pos-neu" data-v="' + k.id + '">+ Eigene Position</button>' : '') + '</details>';
        }).join('');
        if (!gruppen) gruppen = '<div class="karte hinweis">Keine Positionen mit diesem Status.</div>';
        return kopf + filter + '<div style="margin-top:14px">' + gruppen + '</div>' +
          '<p class="pruefen">Vorlage: ' + esc(p.vorlage && p.vorlage.name) + ' · angelegt ' + esc(zeitDE(p.erstellt)) + '</p>';
      },
      init: function (main) {
        $$('img[data-foto-id]', main).forEach(function (img) {
          Fotos.url(img.dataset.fotoId).then(function (u) {
            if (u) { img.src = u; var a = img.parentNode; if (a && a.dataset.fotoLink) a.href = u; } else img.alt = 'Foto nicht verfügbar';
          });
        });
        $$('details.gruppe', main).forEach(function (d) { d.addEventListener('toggle', function () { PV.zu[d.dataset.gruppe] = !d.open; }); });
      },
      akt: {
        'pv-status': function (el) {
          var e = eintragVon(p, el.dataset.pos); e.status = el.dataset.status; beruehrt(p, e); speichereProjekte(); neu();
        },
        'pv-details': function (el) { diktatStopp(); PV.offen = PV.offen === el.dataset.pos ? null : el.dataset.pos; neu(); },
        'pv-filter': function (el) { PV.filter = el.dataset.v; neu(); },
        'pv-diktat': function (el) { diktat(el, el.dataset.pos, function (txt) { var e = eintragVon(p, el.dataset.pos); e.notiz = txt; beruehrt(p, e); spaeterSpeichern(); }); },
        'pv-foto-weg': function (el) {
          if (!confirm('Dieses Foto löschen?')) return;
          var e = eintragVon(p, el.dataset.pos); e.fotos = e.fotos.filter(function (f) { return f !== el.dataset.v; });
          Fotos.del(el.dataset.v); beruehrt(p, e); speichereProjekte(); neu();
        },
        'pv-pos-neu': function (el) {
          var txt = prompt('Text der neuen Prüfposition:');
          if (!txt || !txt.trim()) return;
          var k = p.kategorien.filter(function (x) { return x.id === el.dataset.v; })[0];
          var neuPos = { id: 'u' + uid(), text: txt.trim(), eigene: true };
          k.positionen.push(neuPos); beruehrt(p); speichereProjekte(); PV.offen = neuPos.id; neu();
        },
        'pv-pos-weg': function (el) {
          if (!confirm('Eigene Position samt Notiz und Fotos entfernen?')) return;
          var id2 = el.dataset.pos, e = p.eintraege[id2];
          if (e && e.fotos) e.fotos.forEach(function (f) { Fotos.del(f); });
          delete p.eintraege[id2];
          p.kategorien.forEach(function (k) { k.positionen = k.positionen.filter(function (x) { return x.id !== id2; }); });
          beruehrt(p); speichereProjekte(); PV.offen = null; neu();
        },
        'pv-bearb': function () { PV.bearbeiten = true; neu(); window.scrollTo(0, 0); },
        'pv-bearb-abbr': function () { PV.bearbeiten = false; neu(); },
        'pv-bearb-ok': function () {
          var n = $('#pe-name').value.trim(); if (!n) { toast('Projektname darf nicht leer sein'); return; }
          p.name = n; p.bauvorhaben = $('#pe-bv').value.trim(); p.datum = $('#pe-datum').value || p.datum;
          beruehrt(p); speichereProjekte(); PV.bearbeiten = false; route();
        },
        'pv-loeschen': function () {
          if (!confirm('Projekt „' + p.name + '" mit allen Notizen und Fotos endgültig löschen? Das kann nicht rückgängig gemacht werden.')) return;
          Object.keys(p.eintraege).forEach(function (k) { (p.eintraege[k].fotos || []).forEach(function (f) { Fotos.del(f); }); });
          PR = PR.filter(function (x) { return x.id !== p.id; }); speichereProjekte(); toast('Projekt gelöscht'); location.hash = '#/checkliste';
        },
        'pv-export': function () { protokollExport(p); }
      },
      eingabe: function (el) {
        if (el.dataset.notiz) { var e = eintragVon(p, el.dataset.notiz); e.notiz = el.value; beruehrt(p, e); spaeterSpeichern(); }
      },
      aenderung: function (el) {
        if (el.dataset.foto && el.files && el.files.length) {
          var posId = el.dataset.foto, dateien = Array.prototype.slice.call(el.files);
          toast('Foto wird gespeichert …');
          Promise.all(dateien.map(function (f) {
            return komprimiere(f).then(function (blob) {
              var fid = 'f' + uid(); return Fotos.put({ id: fid, blob: blob, erstellt: new Date().toISOString(), projekt: p.id }).then(function () { return fid; });
            });
          })).then(function (ids) {
            var e = eintragVon(p, posId); e.fotos = (e.fotos || []).concat(ids); beruehrt(p, e); speichereProjekte(); neu(); toast(ids.length > 1 ? ids.length + ' Fotos gespeichert' : 'Foto gespeichert');
          }).catch(function (err) { toast('Foto konnte nicht gespeichert werden: ' + err.message); });
        }
      }
    };
  }

  function protokollExport(p) {
    kopfDialog({ projekt: p.name, datum: heute() }, function (kopf) {
      var st = projektStand(p);
      var alleFotos = [];
      Object.keys(p.eintraege).forEach(function (k) { (p.eintraege[k].fotos || []).forEach(function (f) { alleFotos.push(f); }); });
      Promise.all(alleFotos.map(function (f) { return Fotos.url(f).then(function (u) { return [f, u]; }); })).then(function (paare) {
        var urlVon = {}; paare.forEach(function (x) { urlVon[x[0]] = x[1]; });
        var symbol = { offen: '○ offen', erledigt: '✓ erledigt', nz: '– nicht zutreffend', mangel: '✕ Mangel' };
        var maengel = [];
        var inhalt = p.kategorien.map(function (k) {
          return '<h2>' + esc(k.name) + '</h2>' + k.positionen.map(function (pos) {
            var e = p.eintraege[pos.id] || { status: 'offen', notiz: '', fotos: [] };
            if (e.status === 'mangel') maengel.push(k.name + ': ' + pos.text);
            return '<div class="pos"><div><strong class="' + (e.status === 'erledigt' ? 'ok' : e.status === 'mangel' ? 'nok' : '') + '">' + symbol[e.status] + '</strong> · ' + t(pos.text) + (pos.eigene ? ' <em>(eigene Position)</em>' : '') + '</div>' +
              (e.notiz ? '<div><em>Notiz:</em> ' + esc(e.notiz).replace(/\n/g, '<br>') + '</div>' : '') +
              (e.geaendert ? '<div style="font-size:8pt;color:#555">geändert ' + esc(zeitDE(e.geaendert)) + '</div>' : '') +
              ((e.fotos || []).length ? '<div>' + e.fotos.map(function (f) { return urlVon[f] ? '<img src="' + urlVon[f] + '" alt="">' : ''; }).join('') + '</div>' : '') + '</div>';
          }).join('');
        }).join('');
        var zusammen = '<h2>Zusammenfassung</h2><p><strong>' + st.erledigt + ' von ' + st.relevant + '</strong> Positionen erledigt · ' + st.mangel + ' Mängel · ' + st.offen + ' offen · ' + st.nz + ' nicht zutreffend</p>' +
          (maengel.length ? '<h3 class="nok">Mängelliste</h3><ol>' + maengel.map(function (m) { return '<li>' + t(m) + '</li>'; }).join('') + '</ol>' : '');
        drucke(druckRahmen('Prüfprotokoll Schallschutz', kopf, zusammen + inhalt, [['Bauvorhaben', p.bauvorhaben || '–'], ['Vorlage', p.vorlage ? p.vorlage.name : '–'], ['Stand', st.erledigt + ' / ' + st.relevant + ' erledigt']]));
      });
    });
  }

  /* ---------- Spracheingabe ---------- */
  var erkenner = null;
  function diktatStopp() { if (erkenner) { try { erkenner.stop(); } catch (e) {} } }
  function diktat(btn, posId, beiText) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('Spracheingabe hier nicht verfügbar – bitte die Diktierfunktion der Tastatur nutzen.'); var ta0 = $('textarea[data-notiz="' + posId + '"]'); if (ta0) ta0.focus(); return; }
    if (erkenner) { diktatStopp(); return; }
    var ta = $('textarea[data-notiz="' + posId + '"]'); if (!ta) return;
    var r = new SR(); r.lang = 'de-DE'; r.interimResults = true; r.continuous = true;
    var basis = ta.value ? ta.value.replace(/\s*$/, ' ') : '', fertig = '';
    r.onresult = function (ev) {
      var zwischen = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) { var tr = ev.results[i][0].transcript; if (ev.results[i].isFinal) fertig += tr; else zwischen += tr; }
      ta.value = basis + fertig + zwischen; beiText(ta.value);
    };
    r.onerror = function (ev) { toast('Spracheingabe: ' + (ev.error === 'not-allowed' ? 'Mikrofon nicht freigegeben' : ev.error === 'network' ? 'keine Verbindung zum Spracherkennungsdienst' : ev.error)); };
    r.onend = function () { erkenner = null; btn.classList.remove('diktat-an'); btn.textContent = '🎤 Diktieren'; beiText(ta.value); };
    try { r.start(); erkenner = r; btn.classList.add('diktat-an'); btn.textContent = '■ Stopp'; }
    catch (e) { toast('Spracheingabe konnte nicht gestartet werden'); }
  }

  /* =====================================================================
   * MEHR · Einstellungen · Datensicherung · Hinweise
   * ===================================================================== */
  function vMehr() {
    return {
      titel: 'Mehr', unter: 'Nachschlagen · Einstellungen · Hinweise', nav: 'mehr',
      html: function () {
        return '<ul class="liste">' +
          '<li>' + eintrag('#/nachschlagen', '#3d4a57', '§', 'Nachschlagen', 'Normen, Tabellen, Kennwerte, Detailskizzen') + '</li>' +
          '<li>' + eintrag('#/mehr/einstellungen', '#5b6570', '⚙', 'Einstellungen', 'Darstellung, Bearbeiter, Quiz-Länge, Zurücksetzen') + '</li>' +
          '<li>' + eintrag('#/mehr/daten', '#2F6F43', '⇅', 'Datensicherung', 'Alle Daten als Datei sichern oder einspielen') + '</li>' +
          '<li>' + eintrag('#/mehr/info', '#1F4E79', 'i', 'Hinweise & Impressum', 'Normstand, Abgrenzung, Ausbaustufen') + '</li>' +
          '<li><a class="eintrag" href="tests.html"><span class="eintrag-icon" style="background:#7B2E10">✓</span><span class="eintrag-text"><b>Selbsttest der Rechenlogik</b><small>Prüft u. a. den Testfall 28 + 26 + 24 dB(A) = 31,1 dB(A)</small></span></a></li></ul>';
      }
    };
  }
  function wendeThemeAn() {
    var r = document.documentElement;
    if (E.theme === 'hell') r.dataset.theme = 'light'; else if (E.theme === 'dunkel') r.dataset.theme = 'dark'; else delete r.dataset.theme;
  }
  function vEinstellungen() {
    return {
      titel: 'Einstellungen', zurueck: '#/mehr', nav: 'mehr',
      html: function () {
        return '<div class="karte"><div class="feld-titel">Darstellung</div>' + seg('e-theme', [{ v: 'auto', l: 'Automatisch', s: 'wie Gerät' }, { v: 'hell', l: 'Hell' }, { v: 'dunkel', l: 'Dunkel' }], E.theme, 'drei') + '</div>' +
          '<div class="karte"><label class="feld" style="margin:0">Bearbeiter (für Berichte)<input id="e-bearb" value="' + esc(E.bearbeiter) + '" autocomplete="name" placeholder="Name"></label></div>' +
          '<div class="karte"><div class="feld-titel">Quiz: Fragen je Durchlauf</div>' + seg('e-quiz', [5, 10, 15, 20].map(function (n) { return { v: n, l: String(n) }; }), E.quizAnzahl) + '</div>' +
          '<div class="karte"><h3>Zurücksetzen</h3><div class="knopfreihe"><button class="btn" data-act="e-lern-reset">Lernfortschritt zurücksetzen</button><button class="btn btn-rot" data-act="e-alles-reset">Alle Daten löschen</button></div>' +
          '<p class="hinweis klein" style="margin-top:8px">„Alle Daten löschen" entfernt Lernstand, Projekte, Notizen und Fotos auf diesem Gerät.</p></div>' +
          (speicherOk ? '' : '<div class="banner">Der Gerätespeicher ist nicht verfügbar (z. B. privater Modus). Die App funktioniert, speichert aber nichts dauerhaft.</div>');
      },
      akt: {
        'e-theme': function (el) { E.theme = el.dataset.v; speichereE(); wendeThemeAn(); neu(); },
        'e-quiz': function (el) { E.quizAnzahl = Number(el.dataset.v); Q.anzahl = E.quizAnzahl; speichereE(); neu(); },
        'e-lern-reset': function () { if (!confirm('Lernfortschritt (Karten und Quiz-Ergebnisse) zurücksetzen?')) return; LP = { karten: {}, quiz: [] }; speichereLP(); K.folge = null; toast('Lernfortschritt zurückgesetzt'); },
        'e-alles-reset': function () {
          if (!confirm('Wirklich ALLE Daten (Lernstand, Projekte, Notizen, Fotos) auf diesem Gerät löschen? Das kann nicht rückgängig gemacht werden.')) return;
          PR.forEach(function (p) { Object.keys(p.eintraege).forEach(function (k) { (p.eintraege[k].fotos || []).forEach(function (f) { Fotos.del(f); }); }); });
          PR = []; LP = { karten: {}, quiz: [] }; speichereProjekte(); speichereLP(); K.folge = null; toast('Alle Daten gelöscht');
        }
      },
      eingabe: function (el) { if (el.id === 'e-bearb') { E.bearbeiter = el.value; speichereE(); } }
    };
  }

  function vDaten() {
    return {
      titel: 'Datensicherung', zurueck: '#/mehr', nav: 'mehr',
      html: function () {
        return '<div class="karte"><h3>Sichern</h3><p class="klein">Speichert Projekte (mit Fotos und Notizen), Lernfortschritt und Einstellungen in einer JSON-Datei – z. B. für einen Gerätewechsel.</p>' +
          '<button class="btn btn-primaer btn-voll" data-act="d-export">Sicherung herunterladen</button></div>' +
          '<div class="karte"><h3>Einspielen</h3><p class="klein">Projekte mit gleicher Kennung werden überschrieben, andere bleiben erhalten. Der Lernfortschritt wird ersetzt.</p>' +
          '<label class="btn btn-voll">Sicherungsdatei wählen<input type="file" accept="application/json,.json" id="d-import" hidden></label></div>' +
          '<p class="pruefen">Alle Daten liegen nur lokal auf diesem Gerät; es gibt kein Konto und keinen Server.</p>';
      },
      akt: {
        'd-export': function () {
          var ids = [];
          PR.forEach(function (p) { Object.keys(p.eintraege).forEach(function (k) { (p.eintraege[k].fotos || []).forEach(function (f) { ids.push(f); }); }); });
          toast('Sicherung wird erstellt …');
          Promise.all(ids.map(function (f) { return Fotos.dataUrl(f).then(function (d) { return [f, d]; }); })).then(function (paare) {
            var fotos = {}; paare.forEach(function (x) { if (x[1]) fotos[x[0]] = x[1]; });
            var daten = { app: 'schallschutz-assistent', version: 1, erstellt: new Date().toISOString(), projekte: PR, lernen: LP, einstellungen: E, fotos: fotos };
            var blob = new Blob([JSON.stringify(daten)], { type: 'application/json' });
            var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'schallschutz-sicherung-' + heute() + '.json';
            document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
          });
        }
      },
      aenderung: function (el) {
        if (el.id !== 'd-import' || !el.files || !el.files[0]) return;
        var fr = new FileReader();
        fr.onload = function () {
          var d;
          try { d = JSON.parse(fr.result); } catch (e) { toast('Datei ist keine gültige Sicherung'); return; }
          if (!d || d.app !== 'schallschutz-assistent' || !Array.isArray(d.projekte)) { toast('Datei ist keine Sicherung des Schallschutz-Assistenten'); return; }
          if (!confirm('Sicherung vom ' + zeitDE(d.erstellt) + ' mit ' + d.projekte.length + ' Projekt(en) einspielen?')) return;
          var fotos = d.fotos || {};
          Promise.all(Object.keys(fotos).map(function (fid) {
            return fetch(fotos[fid]).then(function (r) { return r.blob(); }).then(function (b) { return Fotos.put({ id: fid, blob: b, erstellt: d.erstellt }); }).catch(function () {});
          })).then(function () {
            d.projekte.forEach(function (np) { PR = PR.filter(function (p) { return p.id !== np.id; }); PR.push(np); });
            PR.sort(function (a, b) { return String(b.geaendert).localeCompare(String(a.geaendert)); });
            if (d.lernen) { LP = Object.assign({ karten: {}, quiz: [] }, d.lernen); speichereLP(); K.folge = null; }
            speichereProjekte(); toast('Sicherung eingespielt'); el.value = '';
          });
        };
        fr.readAsText(el.files[0]);
      }
    };
  }

  function vInfo() {
    return {
      titel: 'Hinweise & Impressum', zurueck: '#/mehr', nav: 'mehr',
      html: function () {
        return '<div class="karte"><h3>Schallschutz-Assistent</h3><p class="klein">Version ' + VERSION + ' · Lern-, Rechen- und Dokumentationshilfe für Hochbautechniker (Fachschule Bautechnik und Baustelle).</p>' +
          '<p class="klein"><strong>Hinterlegter Normstand (zu prüfender Ausgabestand):</strong> ' + esc(D.NORMSTAND) + '. Keine automatische Normaktualisierung. Tabellen- und Bildnummern nach Lernunterlage (Buchvorlage).</p>' +
          '<p class="klein">Alle Grenzwerte, Formeln und Kennwerte sind vom Nutzer gegen die <strong>Originalnorm</strong> bzw. <strong>Schneider Bautabellen</strong> zu prüfen.</p></div>' +
          '<div class="karte" style="border-left:4px solid var(--rot)"><h3>Was die App nicht tut</h3><ul class="klein"><li>Keine bauakustische Messung, keine Prüfstatik, keine Tragwerksplanung – nur Vorbemessung, Lernen und Dokumentation.</li>' +
          '<li>Keine Rechtsberatung; Normwerte sind vom Nutzer zu verifizieren.</li><li>Keine automatische Normaktualisierung.</li></ul></div>' +
          '<div class="karte"><h3>Datenschutz</h3><p class="klein">Lernstand, Projekte, Notizen und Fotos werden ausschließlich lokal im Browser dieses Geräts gespeichert. Die Spracheingabe nutzt die Spracherkennung des Browsers bzw. Geräts.</p></div>' +
          '<div class="karte"><h3>Ausbaustufen (Backlog)</h3><ol class="klein">' + D.backlog.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ol></div>';
      }
    };
  }

  /* =====================================================================
   * Start
   * ===================================================================== */
  if (!speicherOk) $('#speicherhinweis').hidden = false;
  wendeThemeAn();
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  // Für Tests/Fehlersuche
  window.SSA = { version: VERSION, projekte: function () { return PR; } };
})();
