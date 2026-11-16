/* Prüfungen der Rechenlogik und Fachdaten – läuft im Browser (tests.html) und in Node (node tests.js). */
(function (root) {
  'use strict';
  var D = root.SSD || require('./data.js');
  var C = root.SSC || require('./calc.js');

  function tests() {
    var erg = [];
    function pruefe(name, ist, soll) { erg.push({ name: name, ok: ist === soll, ist: ist }); }

    // --- Testfall aus dem Lastenheft (Abschnitt 8) ---
    var r = C.pegelAddition(['28', '26', '24']);
    pruefe('Testfall: 28 + 26 + 24 dB(A) → L_ges = 31,1 dB(A)', C.fmt(r.lges, 1), '31,1');
    var g = C.grenzwert('wasser', 'wohn', false);
    pruefe('Testfall: Grenzwert Wasserinstallation Schlafraum = 30 dB(A)', g.wert, 30);
    pruefe('Testfall: 31,1 dB(A) im Schlafraum → nicht erfüllt', C.bewerte(r.lges, g.wert).erfuellt, false);
    pruefe('Testfall: Grenzwert-Prüfer mit Eingabe "31,1" → nicht erfüllt', C.bewerte('31,1', 30).erfuellt, false);
    pruefe('Testfall: Überschreitung = −1,1 dB Reserve', C.fmt(C.bewerte(r.lges, 30).reserve, 1), '−1,1'.replace('−', '-'));

    // --- Pegeladdition ---
    pruefe('30 + 30 dB = 33,0 dB', C.fmt(C.pegelAddition([30, 30]).lges, 1), '33,0');
    pruefe('Einzelpegel bleibt unverändert (45 dB)', C.fmt(C.pegelAddition([45]).lges, 1), '45,0');
    pruefe('Komma-Eingabe "28,5" wird gelesen', C.parseZahl('28,5'), 28.5);
    pruefe('Ungültige Eingabe → NaN', isNaN(C.parseZahl('abc')), true);
    pruefe('Leere Liste → kein Ergebnis', C.pegelAddition([]), null);
    pruefe('Ungültige Werte werden übergangen', C.fmt(C.pegelAddition(['30', '', 'x', '30']).lges, 1), '33,0');
    pruefe('Arithmetische Summe (falsch) 28+26+24 = 78', C.pegelAddition([28, 26, 24]).arithmetisch, 78);

    // --- Faustwerte gegen exakte Formel (auf 0,1 dB) ---
    [[0, '3,0'], [2, '2,1'], [4, '1,5'], [6, '1,0'], [8, '0,6']].forEach(function (f) {
      pruefe('Faustwert ΔL = ' + f[0] + ' dB → + ' + f[1] + ' dB', C.fmt(C.faustZuschlag(f[0]), 1), f[1]);
    });
    pruefe('Faustwert ΔL = 10 dB → ≈ 0 (genau 0,4 dB)', C.fmt(C.faustZuschlag(10), 1), '0,4');

    // --- Tab. 4.5 ---
    var soll45 = { wasser: [30, 35], anlage: [30, 35], tag: [35, 35], nacht: [25, 35] };
    Object.keys(soll45).forEach(function (q) {
      pruefe('Tab. 4.5 ' + q + ' Wohn-/Schlafraum = ' + soll45[q][0], C.grenzwert(q, 'wohn').wert, soll45[q][0]);
      pruefe('Tab. 4.5 ' + q + ' Unterricht/Arbeit = ' + soll45[q][1], C.grenzwert(q, 'arbeit').wert, soll45[q][1]);
    });
    pruefe('Lüftungsbonus: sonstige Anlage Wohnraum → 35', C.grenzwert('anlage', 'wohn', true).wert, 35);
    pruefe('Lüftungsbonus gilt nicht für Wasserinstallation', C.grenzwert('wasser', 'wohn', true).wert, 30);
    pruefe('Grenzfall 30,0 ≤ 30 → erfüllt', C.bewerte(30, 30).erfuellt, true);
    pruefe('Grenzfall 30,04 (angezeigt 30,0) → erfüllt', C.bewerte(30.04, 30).erfuellt, true);
    pruefe('Grenzfall 30,05 (angezeigt 30,1) → nicht erfüllt', C.bewerte(30.05, 30).erfuellt, false);

    // --- Tab. 4.7 VDI 4100 ---
    var v = D.vdi.zeilen.map(function (z) { return z.werte.join('/'); }).join(' | ');
    pruefe('Tab. 4.7 Werte', v, '53/56/59 | 54/57/60 | 52/56/59 | 53/46/39 | 58/53/46 | 30/30/25 | 30/30/25');

    // --- Nachweis-Helfer ---
    pruefe('Wand 1800 kg/m³ · 17,5 cm = 315 kg/m²', C.fmt(C.flaechenmasse('1800', '17,5').masse, 0), '315');
    pruefe('Wand 315 kg/m² ≥ 220 → erfüllt', C.flaechenmasse(1800, 17.5).erfuellt, true);
    pruefe('Wand 1200 kg/m³ · 11,5 cm = 138 kg/m² → nicht erfüllt', C.flaechenmasse(1200, 11.5).erfuellt, false);
    pruefe('Wand genau 220 kg/m² → erfüllt', C.flaechenmasse(2000, 11).erfuellt, true);
    pruefe('Ruhedruck 5 bar → erfüllt', C.ruhedruck('5').erfuellt, true);
    pruefe('Ruhedruck 5,5 bar → nicht erfüllt', C.ruhedruck('5,5').erfuellt, false);
    pruefe('Alle 6 Bedingungen → Nachweis geführt', C.nachweis([true, true, true, true, true, true]).gefuehrt, true);
    pruefe('Bedingung 5 fehlt → Messung erforderlich (offen: 5)', C.nachweis([true, true, true, true, false, true]).offen.join(','), '5');

    // --- Datenbestand ---
    pruefe('Mindestens 25 Karteikarten', D.karten.length >= 25, true);
    pruefe('Karten-IDs eindeutig', new Set(D.karten.map(function (k) { return k.id; })).size, D.karten.length);
    pruefe('Alle Karten-Kategorien gültig', D.karten.every(function (k) { return D.kategorien.indexOf(k.kat) >= 0; }), true);
    pruefe('Jede Kategorie hat Karten', D.kategorien.every(function (kat) { return D.karten.some(function (k) { return k.kat === kat; }); }), true);
    pruefe('Quiz: je 1 richtige + 3 verschiedene falsche Antworten', D.quiz.every(function (q) {
      return q.falsch.length === 3 && new Set([q.richtig].concat(q.falsch)).size === 4 && !!q.erkl;
    }), true);
    pruefe('Quiz-Kategorien gültig', D.quiz.every(function (q) { return D.kategorien.indexOf(q.kat) >= 0; }), true);
    pruefe('Quiz-IDs eindeutig', new Set(D.quiz.map(function (q) { return q.id; })).size, D.quiz.length);
    pruefe('6 Nachweis-Bedingungen', D.bedingungen.liste.length, 6);
    pruefe('Checkliste: 6 Gruppen', D.checklisteVorlage.kategorien.length, 6);
    var posIds = [];
    D.checklisteVorlage.kategorien.forEach(function (k) { k.positionen.forEach(function (p) { posIds.push(p.id); }); });
    pruefe('Checklisten-Positions-IDs eindeutig', new Set(posIds).size, posIds.length);
    return erg;
  }

  root.SSA_TESTS = tests;
  if (typeof module !== 'undefined' && require.main === module) {
    var e = tests(), f = e.filter(function (x) { return !x.ok; });
    e.forEach(function (x) { console.log((x.ok ? 'OK   ' : 'FEHL ') + x.name + (x.ok ? '' : ' — erhalten: ' + x.ist)); });
    console.log('\n' + (e.length - f.length) + ' von ' + e.length + ' bestanden');
    process.exit(f.length ? 1 : 0);
  }
})(typeof window !== 'undefined' ? window : globalThis);
