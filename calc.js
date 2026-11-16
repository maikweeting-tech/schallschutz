/* Rechenkern des Schallschutz-Assistenten – reine Funktionen ohne Oberfläche (auch in Node testbar). */
(function (root) {
  'use strict';
  var D = root.SSD || (typeof require !== 'undefined' ? require('./data.js') : null);

  /** Zahl aus deutscher Eingabe lesen ("28,5" → 28.5). Leer/ungültig → NaN. */
  function parseZahl(s) {
    if (typeof s === 'number') return isFinite(s) ? s : NaN;
    if (s == null) return NaN;
    s = String(s).trim().replace(/\s+/g, '').replace(',', '.');
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return parseFloat(s);
  }

  /** Auf n Nachkommastellen runden (kaufmännisch, ohne Gleitkomma-Ausreißer). */
  function runde(x, n) {
    var f = Math.pow(10, n == null ? 1 : n);
    return Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * f) / f;
  }

  /** Zahl mit Komma als Dezimaltrenner ausgeben. */
  function fmt(x, n) {
    if (x == null || !isFinite(x)) return '–';
    n = n == null ? 1 : n;
    var r = runde(x, n);
    if (r === 0) r = 0; // −0 vermeiden
    return r.toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n });
  }

  /** Energetische Pegeladdition: L_ges = 10 · lg (Σ 10^(Lᵢ/10)). */
  function pegelAddition(pegel) {
    var L = (pegel || []).map(parseZahl).filter(function (x) { return isFinite(x); });
    if (!L.length) return null;
    var terme = L.map(function (l) { return Math.pow(10, l / 10); });
    var summe = terme.reduce(function (a, b) { return a + b; }, 0);
    var lges = 10 * Math.log10(summe);
    var max = Math.max.apply(null, L);
    return {
      pegel: L, terme: terme, summe: summe, lges: lges,
      arithmetisch: L.reduce(function (a, b) { return a + b; }, 0),
      lauteste: max, zuschlag: lges - max
    };
  }

  /** Exakter Zuschlag auf den größeren Pegel bei Pegeldifferenz ΔL. */
  function faustZuschlag(dl) {
    return 10 * Math.log10(1 + Math.pow(10, -dl / 10));
  }

  /** Zulässiger Wert nach Tab. 4.5 (inkl. Lüftungsbonus nach Fußnote). */
  function grenzwert(quelleId, raumId, lueftung) {
    var z = D.grenzwerte.zeilen.filter(function (r) { return r.id === quelleId; })[0];
    var raum = D.raeume.filter(function (r) { return r.id === raumId; })[0];
    if (!z || !raum) return null;
    var basis = z[raumId];
    var bonus = (z.lueftung && lueftung) ? D.grenzwerte.lueftungsBonus : 0;
    return { wert: basis + bonus, basis: basis, bonus: bonus, zeile: z, raum: raum, quelle: D.grenzwerte.quelle };
  }

  /** Pegel gegen Grenzwert prüfen. Verglichen wird der auf 0,1 dB gerundete (= angezeigte) Wert. */
  function bewerte(pegel, grenze) {
    var L = parseZahl(pegel), G = parseZahl(grenze);
    if (!isFinite(L) || !isFinite(G)) return null;
    var Lr = runde(L, 1);
    return { pegel: Lr, grenze: G, erfuellt: Lr <= G, reserve: runde(G - Lr, 1) };
  }

  /** Flächenbezogene Masse m' = ρ · d (+ weitere Schichten). ρ in kg/m³, d in cm, zusatz in kg/m². */
  function flaechenmasse(rohdichte, dickeCm, zusatz) {
    var r = parseZahl(rohdichte), d = parseZahl(dickeCm), z = parseZahl(zusatz);
    if (!isFinite(r) || !isFinite(d) || r <= 0 || d <= 0) return null;
    if (!isFinite(z) || z < 0) z = 0;
    var kern = r * d / 100;
    return { rohdichte: r, dickeM: d / 100, kern: kern, zusatz: z, masse: kern + z, erfuellt: kern + z >= D.bedingungen.grenzMasse };
  }

  /** Ruhedruck-Check (bar). */
  function ruhedruck(bar) {
    var p = parseZahl(bar);
    if (!isFinite(p) || p < 0) return null;
    return { bar: p, mpa: p / 10, erfuellt: p <= D.bedingungen.grenzDruck };
  }

  /** Nachweis ohne Messung: alle 6 Bedingungen erfüllt? */
  function nachweis(erfuellt) {
    var offen = [];
    D.bedingungen.liste.forEach(function (b, i) { if (!erfuellt[i]) offen.push(b.nr); });
    return { gefuehrt: offen.length === 0, offen: offen };
  }

  var SSC = {
    parseZahl: parseZahl, runde: runde, fmt: fmt, pegelAddition: pegelAddition, faustZuschlag: faustZuschlag,
    grenzwert: grenzwert, bewerte: bewerte, flaechenmasse: flaechenmasse, ruhedruck: ruhedruck, nachweis: nachweis
  };
  root.SSC = SSC;
  if (typeof module !== 'undefined' && module.exports) module.exports = SSC;
})(typeof window !== 'undefined' ? window : globalThis);
