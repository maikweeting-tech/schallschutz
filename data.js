/* Fachdaten des Schallschutz-Assistenten – die EINZIGE Stelle für Grenzwerte, Karten, Quiz und Checklisten.
 * Stand: DIN 4109 (11.89) + Beiblatt 1 & 2 · VDI 4100 (08.07).
 * Tabellen- und Bildnummern nach der Lernunterlage (Buchvorlage).
 * Alle Werte sind vom Nutzer gegen die Originalnorm bzw. Schneider Bautabellen zu prüfen.
 * Textauszeichnung: **fett**; Formelzeichen wie L_In, L_AF,max, R'w, L'n,w werden in der App tiefgestellt. */
(function (root) {
  'use strict';

  var NORMSTAND = 'DIN 4109 (11.89) + Bbl. 1 & 2 · VDI 4100 (08.07)';

  var kategorien = ['Grundlagen', 'Kenngrößen', 'Grenzwerte', 'VDI 4100', 'Rechnen', 'Schallarten', 'Maßnahmen',
    'Armaturen', 'Nachweis', 'Einzelgeräusche', 'Anlagen', 'Normen'];

  /* ---------- 6.1 Anwendungsbereich ---------- */
  var anwendung = {
    quelle: 'DIN 4109 · Abschn. 4 (Anwendungsbereich)',
    schuetzt: ['Geräusche aus **fremden Räumen**', 'Geräusche aus **haustechnischen Anlagen**',
      'Geräusche aus **Betrieben** im selben oder baulich verbundenen Gebäude'],
    nicht: ['Geräusche aus dem **eigenen Wohnbereich**',
      'Veränderliche Geräte im eigenen Wohnbereich (Staubsauger, Waschmaschine, Küchengeräte) bleiben außer Betracht'],
    vergleich: [
      ['Charakter', '**Mindest**anforderung', '**Erhöhter** Schallschutz (SSt I / II / III)'],
      ['Rechtliche Wirkung', 'Über das Bauordnungsrecht eingeführt → gilt **automatisch**', 'Muss **vertraglich vereinbart** werden → gilt nicht automatisch'],
      ['Bezug', 'Schutz gegenüber fremden Räumen', 'Individuell vereinbarte Qualität über der Mindestanforderung']
    ],
    merke: ['SSt I der VDI 4100 = Niveau der DIN 4109. Erst SSt II und III gehen darüber hinaus.',
      'Ohne vertragliche Vereinbarung schuldet der Unternehmer nur die DIN 4109.']
  };

  /* ---------- 6.2 Kenngrößen (Tab. 4.1) ---------- */
  var kenngroessen = {
    quelle: 'DIN 4109 · Tab. 4.1',
    zeilen: [
      { quelle: 'Wasserinstallation (Versorgung + Abwasser gemeinsam)', groesse: 'L_In', name: 'Installations-Schallpegel', norm: 'DIN 52219' },
      { quelle: 'Sonstige haustechnische Anlagen', groesse: 'L_AF,max', name: 'maximaler Schalldruckpegel', norm: 'in Anlehnung an DIN 52219' },
      { quelle: 'Betriebe', groesse: 'L_r', name: 'Beurteilungspegel', norm: 'TA Lärm' }
    ],
    schutzRaeume: ['Wohnräume (inkl. Wohndielen)', 'Schlafräume (inkl. Übernachtungsräume)',
      'Bettenräume in Krankenhäusern und Sanatorien', 'Unterrichtsräume', 'Büro-, Praxis- und Sitzungsräume']
  };

  /* ---------- 6.3 Tab. 4.5 – zulässige Schalldruckpegel [dB(A)] ---------- */
  var raeume = [
    { id: 'wohn', name: 'Wohn-/Schlafraum' },
    { id: 'arbeit', name: 'Unterrichts-/Arbeitsraum' }
  ];
  var grenzwerte = {
    quelle: 'DIN 4109 (11.89) · Tab. 4.5',
    einheit: 'dB(A)',
    lueftungsBonus: 5,
    zeilen: [
      { id: 'wasser', name: 'Wasserinstallation', zusatz: 'Versorgung + Abwasser gemeinsam', kenngroesse: 'L_In', wohn: 30, arbeit: 35 },
      { id: 'anlage', name: 'Sonstige haustechnische Anlagen', zusatz: 'z. B. Aufzug, Lüftung, Heizung', kenngroesse: 'L_AF,max', wohn: 30, arbeit: 35, lueftung: true },
      { id: 'tag', name: 'Betriebe tags', zusatz: '6 – 22 Uhr', kenngroesse: 'L_r', wohn: 35, arbeit: 35 },
      { id: 'nacht', name: 'Betriebe nachts', zusatz: '22 – 6 Uhr', kenngroesse: 'L_r', wohn: 25, arbeit: 35 }
    ],
    fussnoten: [
      'Einzelne, kurzzeitige Spitzen beim Betätigen der Armaturen und Geräte zählen nicht mit (Fußnote 1).',
      'Lüftungstechnische Anlagen: um **5 dB(A) höhere Werte** zulässig, sofern es sich um Dauergeräusche **ohne auffällige Einzeltöne** handelt (Fußnote 3).'
    ],
    systematik: ['Grundlinie: Wohnen/Schlafen = **30 dB(A)** · Unterricht/Arbeit = **35 dB(A)**',
      'Betriebe nachts sind die einzige Verschärfung: **25 dB(A)**',
      'Lüftung ist die einzige Erleichterung: **+ 5 dB(A)**']
  };

  /* ---------- Tab. 4.7 – VDI 4100 Schallschutzstufen ---------- */
  var vdi = {
    quelle: 'VDI 4100 (08.07) · Tab. 4.7',
    stufen: ['SSt I', 'SSt II', 'SSt III'],
    zeilen: [
      { kriterium: 'Luftschall zu fremden Aufenthaltsräumen – horizontal', groesse: "R'w", einheit: 'dB', werte: [53, 56, 59], besser: 'hoeher' },
      { kriterium: 'Luftschall zu fremden Aufenthaltsräumen – vertikal', groesse: "R'w", einheit: 'dB', werte: [54, 57, 60], besser: 'hoeher' },
      { kriterium: 'Luftschall zu Treppenhäusern/Fluren', groesse: "R'w", einheit: 'dB', werte: [52, 56, 59], besser: 'hoeher' },
      { kriterium: 'Trittschall zu fremden Räumen', groesse: "L'n,w", einheit: 'dB', werte: [53, 46, 39], besser: 'niedriger' },
      { kriterium: 'Trittschall zu Treppenhäusern/Fluren', groesse: "L'n,w", einheit: 'dB', werte: [58, 53, 46], besser: 'niedriger' },
      { kriterium: 'Wasserinstallationen', groesse: 'L_In', einheit: 'dB(A)', werte: [30, 30, 25], besser: 'niedriger' },
      { kriterium: 'Sonstige haustechnische Anlagen', groesse: 'L_AF,max', einheit: 'dB(A)', werte: [30, 30, 25], besser: 'niedriger' }
    ],
    merkhilfe: ["Luftschall R'w **steigt** von SSt I → III (höher = besser), Sprung je Stufe 3 dB; vertikal stets 1 dB strenger.",
      "Trittschall L'n,w **sinkt** von SSt I → III (niedriger = besser), zu fremden Räumen 7 dB je Stufe.",
      'SSt I = Niveau der DIN 4109 – nur bei **vertraglicher Vereinbarung** gilt eine höhere Stufe.']
  };

  /* ---------- Tab. 4.8 / 4.9 – Armaturen ---------- */
  var armaturen = {
    quelle: 'DIN 4109 · Tab. 4.8',
    gruppen: [
      { gruppe: 'I', lap: 20, beispiele: 'Auslaufarmaturen, Geräteanschluss-Armaturen, Druckspüler, Spülkästen, Durchflusswassererwärmer' },
      { gruppe: 'II', lap: 30, beispiele: 'Durchgangs-/Drosselarmaturen (Absperr-/Eckventile, Rückflussverhinderer), Druckminderer, Brausen' }
    ]
  };
  var durchfluss = {
    quelle: 'DIN 4109 · Tab. 4.9',
    bedingung: 'max. Durchfluss Q in l/s bei 0,3 MPa (3 bar) Fließdruck',
    klassen: [
      { klasse: 'Z', q: '0,15' }, { klasse: 'A', q: '0,25' }, { klasse: 'B', q: '0,42' },
      { klasse: 'C', q: '0,80' }, { klasse: 'D', q: '> 0,80' }
    ]
  };

  /* ---------- 6.4 Pegelrechnung ---------- */
  var pegel = {
    quelle: 'Pegelarithmetik (DIN 4109, Kap. 4)',
    p0: '2 · 10⁻⁵ Pa',
    faustwerte: [ // Differenz ΔL → Zuschlag auf den größeren Pegel (gerundete Lernwerte)
      { dl: 0, zuschlag: '+ 3,0' }, { dl: 2, zuschlag: '+ 2,1' }, { dl: 4, zuschlag: '+ 1,5' },
      { dl: 6, zuschlag: '+ 1,0' }, { dl: 8, zuschlag: '+ 0,6' }, { dl: 10, zuschlag: '≈ 0', ab: true }
    ],
    regeln: ['**+ 3 dB** = doppelte Schallenergie (zwei gleich laute Quellen: 30 + 30 dB = 33 dB, nicht 60!)',
      '**+ 10 dB** = subjektiv doppelt so laut (10-fache Schallenergie)',
      'Pegeldifferenz **≥ 10 dB**: die leisere Quelle ist praktisch irrelevant',
      'Zwischenraum im Grundriss: **≈ 10 dB(A)** Pegelabnahme'],
    konsequenz: ['Es bringt nichts, eine leise Quelle weiter zu dämmen, solange eine deutlich lautere Quelle unverändert bleibt.',
      'Zu große Schalleinwirkung von außen kann alle Aufwendungen für den Schallschutz der haustechnischen Anlagen wirkungslos machen.']
  };

  /* ---------- 6.5 Gütenachweis ohne Messung ---------- */
  var bedingungen = {
    quelle: 'DIN 4109 · Abschn. 4.2.4 (Gütenachweis)',
    liste: [
      { nr: 1, titel: 'Nur geprüfte Armaturen', kern: 'Gekennzeichnet mit Armaturengruppe I oder II + Durchflussklasse; Prüfbericht max. 5 Jahre alt.' },
      { nr: 2, titel: 'Ruhedruck begrenzen', kern: '≤ 5 bar (0,5 MPa) vor den Armaturen – sonst Druckminderer.', rechner: 'druck' },
      { nr: 3, titel: 'Durchgangsarmaturen nicht drosseln', kern: 'Im Betrieb immer voll geöffnet.' },
      { nr: 4, titel: 'Durchfluss einhalten', kern: 'Der Durchfluss der Durchflussklasse der Armatur darf nicht überschritten werden.' },
      { nr: 5, titel: 'Installationswand ausreichend schwer', kern: 'Einschalige Wand mit flächenbezogener Masse ≥ 220 kg/m².', rechner: 'wand' },
      { nr: 6, titel: 'Anordnung nach Armaturengruppe', kern: 'Gruppe II nicht an Wänden zu schutzbedürftigen Räumen (selbes Geschoss, darüber/darunter); Abwasserleitungen dort nicht freiliegend.' }
    ],
    grenzDruck: 5,       // bar
    grenzMasse: 220,     // kg/m²
    ergebnisJa: 'Nachweis ohne Messung geführt',
    ergebnisNein: 'Bauakustische Messung erforderlich'
  };

  /* ---------- Luft- vs. Körperschall ---------- */
  var schallarten = {
    quelle: 'DIN 4109 · Abschn. 4.1 (Bild 4.2)',
    zeilen: [
      ['Entstehung', 'Im Aufstellraum erzeugter Luftschall regt das Bauteil an (Bild 4.2 a)', 'Wechselkräfte leiten Schwingungen **direkt** in das Bauteil ein (Bild 4.2 b)'],
      ['Maßnahmen', 'Schwere Bauteile · Vorsatzschalen · Trennfugen · schwimmende Estriche · Kapselung', 'Federnde Zwischenschicht an der Befestigung · Ummantelung der Rohre · Gummikompensatoren · schwimmendes Fundament'],
      ['Erreichbare Minderung', 'Absorbierende Bekleidung **< 5 dB(A)** · Kapselung **15 – 30 dB(A)**', 'Nur konstruktiv wirksam – Absorption und Kapselung helfen hier nicht'],
      ['Bei Haustechnik', 'selten vorherrschend', '**vorherrschend**']
    ],
    kernsatz: 'Erfolgt die Übertragung durch **Körperschall**, hilft eine verbesserte **Luftschalldämmung** der Wände im Regelfall **nicht**.'
  };

  /* ---------- Maßnahmen an der Quelle ---------- */
  var quellenMassnahmen = {
    quelle: 'DIN 4109 · Abschn. 2.5 / 4.2 (Bilder 4.10 – 4.12)',
    zeilen: [
      ['Fließgeschwindigkeit begrenzen', 'v ≤ 2 m/s', 'Strömungsgeräusche lassen sich damit im Allgemeinen vermeiden (DVGW)'],
      ['Ruhedruck begrenzen (Druckminderer)', '≤ 5 bar', 'An der ungünstigsten Zapfstelle'],
      ['Geräuscharme Armaturen (Gruppe I)', 'L_ap ≤ 20 dB(A)', 'Gruppe II: ≤ 30 dB(A) – Einbau nur eingeschränkt zulässig'],
      ['Wasserschalldämpfer', '12 – 18 dB(A)', 'Bei Auslaufarmaturen mit Auslaufgewinde DN 15 (Bild 4.12)'],
      ['Strahlregler mit Luftbeimischung', 'Auftreffwinkel ≈ 15°', 'Gegen Fallgeräusche in leeren Wannen und Becken (DIN EN 246, Bild 4.11)'],
      ['Gurgelgeräusche vermeiden', 'Sekundärlüftung', 'Sicherste Lösung ohne Nennweitenvergrößerung; sonst + 1 NW (waagerecht) bzw. + 2 NW (mit Fallstrecke), Bild 4.10'],
      ['Schlanke Bögen statt T-Stücke', '—', 'Gegen Aufprall- und Strömungsgeräusche bei Richtungsänderungen']
    ]
  };

  /* ---------- Grundriss & Standort ---------- */
  var grundriss = {
    quelle: 'DIN 4109 · Abschn. 4.1.3',
    regeln: ['Bäder, Aborte, Küchen und Hausarbeitsräume möglichst **übereinander oder nebeneinander** anordnen.',
      'Räume mit haustechnischen Einrichtungen **zusammenfassen** → gemeinsame Installationswand (Küche + Bad, Dusche + WC).',
      'Nassräume **nicht neben Schlafräume benachbarter Wohnungen** planen.',
      'Den Wohnungsgrundriss möglichst **nicht von Geschoss zu Geschoss wechseln**.',
      'Räume so zuordnen, dass sich für den Schall möglichst **lange Übertragungswege** ergeben.'],
    zwischenraum: 'Zwischenraum (nicht schutzbedürftig) → ΔL ≈ **10 dB(A)**, bei Luft- und Körperschall; im Einzelfall auch größer.',
    standort: 'Noch vor dem Grundriss steht die **Standortwahl**: ausreichende Entfernung oder Abschirmung zu lärmerzeugender Umgebung.'
  };

  /* ---------- Zahlen, die sitzen müssen ---------- */
  var kennzahlen = [
    ['Wasserinstallation / haustechn. Anlagen – Wohn-/Schlafraum', '30 dB(A)', 'Tab. 4.5'],
    ['dieselben – Unterrichts-/Arbeitsraum', '35 dB(A)', 'Tab. 4.5'],
    ['Betriebe tags / nachts – Wohn-/Schlafraum', '35 / 25 dB(A)', 'Tab. 4.5'],
    ['Bonus für lüftungstechnische Anlagen', '+ 5 dB(A)', 'Tab. 4.5, Fußnote 3'],
    ['Armaturengruppe I / II (L_ap)', '20 / 30 dB(A)', 'Tab. 4.8'],
    ['Max. Ruhedruck vor den Armaturen', '5 bar', 'Abschn. 4.2.4'],
    ['Flächenbezogene Masse der Installationswand', '220 kg/m²', 'Abschn. 4.2.4'],
    ['Max. Fließgeschwindigkeit Trinkwasser', '2 m/s', 'DVGW / Abschn. 2.5.2'],
    ["Luftschall R'w – SSt I horizontal / vertikal", '53 / 54 dB', 'Tab. 4.7 (= DIN 4109)'],
    ["Trittschall L'n,w – SSt I zu fremden Räumen", '53 dB', 'Tab. 4.7 (= DIN 4109)'],
    ['Schalldämm-Maß der Müllraum-Bauteile', "R'w ≥ 55 dB", 'Abschn. 4.3'],
    ['Dämpfung durch einen Wasserschalldämpfer', '12 – 18 dB(A)', 'Bild 4.12'],
    ['Minderung durch Kapselung', '15 – 30 dB(A)', 'Abschn. 4.1.3 / VDI 2711'],
    ['Minderung durch absorbierende Bekleidung', '< 5 dB(A)', 'Abschn. 4.1.3'],
    ['Pegelabnahme durch einen Zwischenraum', '≈ 10 dB(A)', 'Abschn. 4.1.3'],
    ['Auftreffwinkel Wasserstrahl auf Wanne', '≈ 15°', 'Bild 4.11']
  ];

  /* ---------- 6.6 Merksätze ---------- */
  var merksaetze = [
    { titel: 'Was die Norm leistet', saetze: [
      'DIN 4109 schützt gegen Geräusche aus **fremden** Räumen, haustechnischen Anlagen und Betrieben – **nicht** aus dem eigenen Wohnbereich.',
      'DIN 4109 = **Mindestanforderung**, gilt automatisch. VDI 4100 = **erhöhter** Schallschutz, nur bei vertraglicher Vereinbarung. SSt I = DIN-Niveau.'] },
    { titel: 'Grenzwerte', saetze: [
      'Wohnen/Schlafen **30 dB(A)**, Unterricht/Arbeit **35 dB(A)**. Einzige Verschärfung: Betriebe nachts **25 dB(A)**. Einzige Erleichterung: Lüftung **+ 5 dB(A)**.'] },
    { titel: 'Kein Bemessungsverfahren', saetze: [
      'Der Pegel im schutzbedürftigen Raum ist quantitativ häufig **nicht vorhersagbar** – Körperschallanregung ist rechnerisch schwer erfassbar.',
      'Der Nachweis läuft im Regelfall **ohne Messung** über **6 konstruktive Bedingungen**. Nur wenn eine fehlt: bauakustische Messung.'] },
    { titel: 'Pegelrechnung', saetze: [
      'Pegel **niemals einfach addieren**: L_ges = 10 · lg (Σ 10^(Lᵢ/10)).',
      '**+ 3 dB** = doppelte Energie · **+ 10 dB** = subjektiv doppelt so laut · Differenz **≥ 10 dB** → leisere Quelle irrelevant.'] },
    { titel: 'Entstehung vor Ausbreitung', saetze: [
      'Erst die **Entstehung** verhindern, dann die **Ausbreitung** mindern.',
      'Fließgeschwindigkeit Trinkwasser **≤ 2 m/s** · Ruhedruck **≤ 5 bar** · Auftreffwinkel Wasserstrahl Wanne **≈ 15°**.'] },
    { titel: 'Körperschall entscheidet', saetze: [
      'Bei haustechnischen Anlagen überwiegt der **Körperschall** → eine verbesserte Luftschalldämmung der Wände hilft dann **nicht**.',
      'Absorbierende Bekleidung **< 5 dB(A)** · Kapselung **15 – 30 dB(A)** · Wasserschalldämpfer **12 – 18 dB(A)**.',
      'Rohre in der **Randzone** befestigen, nicht in der Mittelzone. Verankerung darf die Dämmplatte **nicht durchstoßen**.'] },
    { titel: 'Grundriss', saetze: [
      'Der **Grundriss** ist die wirksamste Einzelmaßnahme (**≈ 10 dB**). Davor steht die **Standortwahl**.',
      'Müllraum-Bauteile: **R\'w ≥ 55 dB**.'] },
    { titel: 'Der rote Faden', saetze: [
      'Standort wählen → Grundriss ordnen (≈ 10 dB) → Geräusche gar nicht erst entstehen lassen (Armaturen, 2 m/s, 5 bar) → Ausbreitung passend zur Schallart dämmen (fast immer Körperschall) → Nachweis über die 6 Bedingungen.'] }
  ];

  /* ---------- 6.7 Karteikarten ---------- */
  var karten = [
    // Grundlagen
    { id: 'k01', kat: 'Grundlagen', f: 'Wogegen schützt die DIN 4109 – und wogegen nicht?', a: 'Schützt gegen Geräusche aus **fremden Räumen**, **haustechnischen Anlagen** und **Betrieben**; **nicht** gegen Geräusche aus dem eigenen Wohnbereich.' },
    { id: 'k02', kat: 'Grundlagen', f: 'DIN 4109 vs. VDI 4100?', a: 'DIN 4109 = **Mindestanforderung** (gilt automatisch); VDI 4100 = **erhöhter Schallschutz** (SSt I/II/III), nur vertraglich. SSt I = DIN-Niveau.' },
    { id: 'k03', kat: 'Grundlagen', f: 'Welche Geräte im eigenen Wohnbereich bleiben außer Betracht?', a: 'Veränderliche Geräte wie **Staubsauger, Waschmaschine, Küchengeräte**.' },
    { id: 'k04', kat: 'Grundlagen', f: 'Gibt es für haustechnische Anlagen eine geschlossene Bemessungsformel?', a: '**Nein.** Der Pegel ist quantitativ häufig nicht vorhersagbar (Körperschallanregung schwer erfassbar) → Nachweis über **6 konstruktive Bedingungen**.' },
    // Kenngrößen
    { id: 'k05', kat: 'Kenngrößen', f: 'Kenngröße Wasserinstallation?', a: '**L_In** (Installations-Schallpegel) nach DIN 52219.' },
    { id: 'k06', kat: 'Kenngrößen', f: 'Kenngröße sonstige haustechnische Anlagen?', a: '**L_AF,max** (maximaler Schalldruckpegel).' },
    { id: 'k07', kat: 'Kenngrößen', f: 'Kenngröße Betriebe?', a: '**L_r** (Beurteilungspegel) nach TA Lärm.' },
    { id: 'k08', kat: 'Kenngrößen', f: 'Welche Räume sind schutzbedürftig?', a: 'Wohnräume (inkl. Wohndielen), Schlafräume (inkl. Übernachtungsräume), Bettenräume in Krankenhäusern/Sanatorien, Unterrichtsräume, Büro-/Praxis-/Sitzungsräume.' },
    // Grenzwerte
    { id: 'k09', kat: 'Grenzwerte', f: 'Zul. Pegel Wasserinstallation im Wohn-/Schlafraum?', a: '**≤ 30 dB(A)** (Unterricht/Arbeit ≤ 35).' },
    { id: 'k10', kat: 'Grenzwerte', f: 'Zul. Pegel Betriebe nachts im Wohn-/Schlafraum?', a: '**≤ 25 dB(A)** – schärfster Wert.' },
    { id: 'k11', kat: 'Grenzwerte', f: 'Bonus für lüftungstechnische Anlagen?', a: '**+ 5 dB(A)**, nur bei Dauergeräusch ohne auffällige Einzeltöne.' },
    { id: 'k12', kat: 'Grenzwerte', f: 'Zul. Pegel Betriebe tags (6–22 Uhr) im Wohn-/Schlafraum?', a: '**≤ 35 dB(A)** (Unterricht/Arbeit ebenfalls ≤ 35).' },
    { id: 'k13', kat: 'Grenzwerte', f: 'Zählen kurzzeitige Spitzen beim Betätigen der Armaturen mit?', a: '**Nein** – einzelne kurzzeitige Betätigungsspitzen bleiben unberücksichtigt (Fußnote 1).' },
    // VDI 4100
    { id: 'k14', kat: 'VDI 4100', f: "R'w Luftschall horizontal SSt I / II / III?", a: '**53 / 56 / 59 dB** (vertikal je 1 dB strenger: 54 / 57 / 60).' },
    { id: 'k15', kat: 'VDI 4100', f: "L'n,w Trittschall zu fremden Räumen SSt I / II / III?", a: '**53 / 46 / 39 dB** (niedriger = besser).' },
    { id: 'k16', kat: 'VDI 4100', f: 'Sprung je Stufe bei Luft- und Trittschall?', a: "Luftschall R'w: **3 dB** je Stufe (steigt). Trittschall L'n,w zu fremden Räumen: **7 dB** je Stufe (sinkt)." },
    { id: 'k17', kat: 'VDI 4100', f: 'L_In für Wasserinstallationen in SSt I / II / III?', a: '**30 / 30 / 25 dB(A)** – erst SSt III ist strenger.' },
    // Rechnen
    { id: 'k18', kat: 'Rechnen', f: 'Formel Pegeladdition?', a: '**L_ges = 10 · lg (Σ 10^(Lᵢ/10))**. Pegel nie einfach addieren.' },
    { id: 'k19', kat: 'Rechnen', f: '30 dB + 30 dB = ?', a: '**33 dB** (nicht 60). Verdopplung der Energie = + 3 dB.' },
    { id: 'k20', kat: 'Rechnen', f: 'Abnahme durch einen Zwischenraum im Grundriss?', a: '**≈ 10 dB(A)**, bei Luft- und Körperschall.' },
    { id: 'k21', kat: 'Rechnen', f: 'Wie viel dB bedeuten „subjektiv doppelt so laut"?', a: '**+ 10 dB** (= 10-fache Schallenergie).' },
    { id: 'k22', kat: 'Rechnen', f: 'Zwei Pegel unterscheiden sich um ≥ 10 dB – was folgt?', a: 'Zuschlag **≈ 0 dB**: die leisere Quelle ist praktisch irrelevant → zuerst die lauteste Quelle mindern.' },
    { id: 'k23', kat: 'Rechnen', f: 'Definition Schalldruckpegel?', a: '**L = 10 · lg (p²/p₀²) = 20 · lg (p/p₀)** mit p₀ = 2 · 10⁻⁵ Pa.' },
    // Schallarten
    { id: 'k24', kat: 'Schallarten', f: 'Welche Schallart überwiegt bei haustechnischen Anlagen?', a: '**Körperschall** → Luftschalldämmung der Wände hilft dann nicht.' },
    { id: 'k25', kat: 'Schallarten', f: 'Minderung durch Kapselung?', a: '**15 – 30 dB(A)**. Absorbierende Bekleidung nur **< 5 dB(A)**.' },
    { id: 'k26', kat: 'Schallarten', f: 'Maßnahmen gegen Körperschall?', a: 'Federnde Zwischenschicht an Befestigungen, Ummantelung der Rohre, Gummikompensatoren, schwimmendes Fundament.' },
    // Maßnahmen
    { id: 'k27', kat: 'Maßnahmen', f: 'Wirksamste Einzelmaßnahme?', a: 'Der **Grundriss** (≈ 10 dB). Nassräume zusammenfassen, lange Übertragungswege.' },
    { id: 'k28', kat: 'Maßnahmen', f: 'Rohrbefestigung in Rand- oder Mittelzone?', a: '**Randzone** (schwingt schwerer); Mittelzone meiden.' },
    { id: 'k29', kat: 'Maßnahmen', f: 'Rohrschellen-Einlage?', a: 'Alterungsbeständig: **Gummi, Filz oder Mineralfaser**; Dämmstreifen **t ≥ 3 mm**.' },
    { id: 'k30', kat: 'Maßnahmen', f: 'Was steht noch vor dem Grundriss?', a: 'Die **Standortwahl** – Entfernung oder Abschirmung zu lärmerzeugender Umgebung.' },
    { id: 'k31', kat: 'Maßnahmen', f: 'Pumpenfundament – worauf kommt es an?', a: 'Presskorkplatte zwischen festem und freiem Sockel; die **Verankerung darf die Dämmplatte nicht durchstoßen**.' },
    { id: 'k32', kat: 'Maßnahmen', f: 'Die fünf Grundrissregeln?', a: 'Nassräume übereinander/nebeneinander · gemeinsame Installationswand · nicht neben fremde Schlafräume · Grundriss nicht je Geschoss wechseln · lange Übertragungswege.' },
    // Armaturen
    { id: 'k33', kat: 'Armaturen', f: 'L_ap Armaturengruppe I / II?', a: '**≤ 20 / ≤ 30 dB(A)**.' },
    { id: 'k34', kat: 'Armaturen', f: 'Durchflussklassen Z / A / B / C / D (l/s bei 3 bar)?', a: '**0,15 / 0,25 / 0,42 / 0,80 / > 0,80**.' },
    { id: 'k35', kat: 'Armaturen', f: 'Beispiele Armaturengruppe I?', a: 'Auslaufarmaturen, Geräteanschluss-Armaturen, Druckspüler, Spülkästen, Durchflusswassererwärmer.' },
    { id: 'k36', kat: 'Armaturen', f: 'Beispiele Armaturengruppe II?', a: 'Durchgangs-/Drosselarmaturen (Absperr-/Eckventile, Rückflussverhinderer), Druckminderer, Brausen.' },
    { id: 'k37', kat: 'Armaturen', f: 'Wasserschalldämpfer – Dämpfung und Einsatz?', a: '**12 – 18 dB(A)**, bei Auslaufarmaturen mit Auslaufgewinde DN 15.' },
    // Nachweis
    { id: 'k38', kat: 'Nachweis', f: 'Max. Ruhedruck vor Armaturen?', a: '**≤ 5 bar**, sonst Druckminderer.' },
    { id: 'k39', kat: 'Nachweis', f: 'Mindestmasse Installationswand?', a: '**≥ 220 kg/m²** flächenbezogen (einschalig).' },
    { id: 'k40', kat: 'Nachweis', f: 'Die 6 Bedingungen des Nachweises ohne Messung?', a: '1 geprüfte Armaturen · 2 Ruhedruck ≤ 5 bar · 3 Durchgangsarmaturen nicht drosseln · 4 Durchfluss einhalten · 5 Wand ≥ 220 kg/m² · 6 Anordnung nach Armaturengruppe.' },
    { id: 'k41', kat: 'Nachweis', f: 'Wann ist eine bauakustische Messung erforderlich?', a: 'Nur wenn die Ausführung **mindestens eine** der 6 Bedingungen **nicht** erfüllt.' },
    // Einzelgeräusche
    { id: 'k42', kat: 'Einzelgeräusche', f: 'Max. Fließgeschwindigkeit Trinkwasser?', a: '**≤ 2 m/s** (DVGW).' },
    { id: 'k43', kat: 'Einzelgeräusche', f: 'Gurgelgeräusche: sicherste Lösung?', a: '**Sekundärlüftung** (± 0 Nennweiten); sonst + 1 (waagerecht) bzw. + 2 (Fallstrecke).' },
    { id: 'k44', kat: 'Einzelgeräusche', f: 'Auftreffwinkel des Wasserstrahls in der Wanne?', a: '**≈ 15°** – Strahl flach gegen die Wandung lenken; Strahlregler mit Luftbeimischung.' },
    { id: 'k45', kat: 'Einzelgeräusche', f: 'Wie entstehen Gurgelgeräusche?', a: 'Abfließendes Wasser reißt am Ende **Luftblasen** mit → **Unterdruck** in der Leitung.' },
    { id: 'k46', kat: 'Einzelgeräusche', f: 'Maßnahme gegen Geräusche bei Richtungsänderungen?', a: '**Schlanke Bögen** statt T-Stücke.' },
    // Anlagen
    { id: 'k47', kat: 'Anlagen', f: 'Müllraum-Bauteile: Mindest-Schalldämmung?', a: "**R'w ≥ 55 dB**." },
    { id: 'k48', kat: 'Anlagen', f: 'Installationsschächte – Maßnahmen?', a: 'Innere Wandflächen mit **Faserdämmstoff ≥ 30 mm**, Abdeckungen sorgfältig ausfugen, Abdeckplatten verschieden dick/schwer.' },
    // Normen
    { id: 'k49', kat: 'Normen', f: 'VDI 4100 – Titel?', a: '„Schallschutz von Wohnungen; Kriterien für Planung und Beurteilung" (08.07).' },
    { id: 'k50', kat: 'Normen', f: 'Hinterlegte Ausgabestände?', a: 'DIN 4109 (11.89) mit Beiblatt 1 & 2 · VDI 4100 (08.07) – gegen aktuelle Ausgaben prüfen.' },
    { id: 'k51', kat: 'Normen', f: 'Norm für Strahlregler?', a: '**DIN EN 246**.' }
  ];

  /* ---------- Quiz (1 richtige + 3 falsche Antworten) ---------- */
  var quiz = [
    { id: 'q01', kat: 'Grenzwerte', frage: 'Welcher Pegel ist für Wasserinstallationen im Schlafraum höchstens zulässig?', richtig: '30 dB(A)', falsch: ['25 dB(A)', '35 dB(A)', '40 dB(A)'], erkl: 'Tab. 4.5: Wohn-/Schlafraum ≤ 30 dB(A), Unterrichts-/Arbeitsraum ≤ 35 dB(A).' },
    { id: 'q02', kat: 'Grenzwerte', frage: 'Zulässiger Pegel aus Betrieben nachts (22–6 Uhr) im Wohn-/Schlafraum?', richtig: '25 dB(A)', falsch: ['30 dB(A)', '35 dB(A)', '20 dB(A)'], erkl: 'Betriebe nachts sind die einzige Verschärfung: 25 dB(A) – der schärfste Wert der Tab. 4.5.' },
    { id: 'q03', kat: 'Grenzwerte', frage: 'Zulässiger Pegel aus Betrieben tags (6–22 Uhr) im Wohnraum?', richtig: '35 dB(A)', falsch: ['30 dB(A)', '25 dB(A)', '40 dB(A)'], erkl: 'Tab. 4.5: Betriebe tags 35 dB(A) – in beiden Raumarten.' },
    { id: 'q04', kat: 'Grenzwerte', frage: 'Sonstige haustechnische Anlagen – zulässiger Pegel im Unterrichtsraum?', richtig: '35 dB(A)', falsch: ['30 dB(A)', '25 dB(A)', '40 dB(A)'], erkl: 'Unterrichts-/Arbeitsräume: Grundlinie 35 dB(A).' },
    { id: 'q05', kat: 'Grenzwerte', frage: 'Was gilt für lüftungstechnische Anlagen?', richtig: '+ 5 dB(A), wenn Dauergeräusch ohne auffällige Einzeltöne', falsch: ['+ 3 dB(A) generell', '+ 10 dB(A), aber nur nachts', 'Kein Bonus – wie Wasserinstallation'], erkl: 'Tab. 4.5, Fußnote 3: + 5 dB(A) nur bei Dauergeräuschen ohne auffällige Einzeltöne.' },
    { id: 'q06', kat: 'Rechnen', frage: '30 dB + 30 dB ergeben …', richtig: '33 dB', falsch: ['60 dB', '30 dB', '36 dB'], erkl: 'Zwei gleich laute Quellen = doppelte Energie = + 3 dB. Pegel nie einfach addieren.' },
    { id: 'q07', kat: 'Rechnen', frage: 'Zwei Pegel unterscheiden sich um 10 dB oder mehr. Was folgt?', richtig: 'Die leisere Quelle ist praktisch irrelevant (≈ 0 dB Zuschlag)', falsch: ['Es gibt + 3 dB Zuschlag', 'Es gibt + 10 dB Zuschlag', 'Die Pegel werden gemittelt'], erkl: 'Faustwert: ΔL ≥ 10 dB → Zuschlag ≈ 0 dB (genau 0,4 dB bei 10 dB).' },
    { id: 'q08', kat: 'Rechnen', frage: 'Wasserinstallation 28 + Aufzug 26 + Lüftung 24 dB(A) ergeben …', richtig: '31,1 dB(A)', falsch: ['78,0 dB(A)', '26,0 dB(A)', '34,0 dB(A)'], erkl: 'L_ges = 10 · lg (10^2,8 + 10^2,6 + 10^2,4) = 10 · lg (1280,3) = 31,1 dB(A) → im Schlafraum über 30 dB(A).' },
    { id: 'q09', kat: 'Rechnen', frage: 'Wie viel dB entsprechen „subjektiv doppelt so laut"?', richtig: '+ 10 dB', falsch: ['+ 3 dB', '+ 6 dB', '+ 20 dB'], erkl: '+ 10 dB = 10-fache Energie = subjektiv doppelt so laut; + 3 dB = doppelte Energie.' },
    { id: 'q10', kat: 'Rechnen', frage: 'Welche Formel gilt für die Pegeladdition?', richtig: 'L_ges = 10 · lg (Σ 10^(Lᵢ/10))', falsch: ['L_ges = Σ Lᵢ', 'L_ges = 20 · lg (Σ Lᵢ)', 'L_ges = L_max + 10 dB'], erkl: 'Pegel werden energetisch addiert – nie arithmetisch.' },
    { id: 'q11', kat: 'Rechnen', frage: 'Bezugsschalldruck p₀ des Schalldruckpegels?', richtig: '2 · 10⁻⁵ Pa', falsch: ['10⁻¹² Pa', '2 · 10⁻³ Pa', '1 Pa'], erkl: 'L = 20 · lg (p/p₀) mit p₀ = 2 · 10⁻⁵ Pa (Hörschwelle).' },
    { id: 'q12', kat: 'Kenngrößen', frage: 'Kenngröße für Geräusche aus Wasserinstallationen?', richtig: 'L_In (Installations-Schallpegel)', falsch: ['L_AF,max', 'L_r', "R'w"], erkl: 'Tab. 4.1: L_In nach DIN 52219.' },
    { id: 'q13', kat: 'Kenngrößen', frage: 'Kenngröße für Geräusche aus Betrieben?', richtig: 'L_r (Beurteilungspegel) nach TA Lärm', falsch: ['L_In nach DIN 52219', "L'n,w", 'L_ap'], erkl: 'Tab. 4.1: Betriebe → Beurteilungspegel L_r nach TA Lärm.' },
    { id: 'q14', kat: 'Grundlagen', frage: 'Wogegen schützt die DIN 4109 NICHT?', richtig: 'Geräusche aus dem eigenen Wohnbereich', falsch: ['Geräusche aus fremden Wohnungen', 'Geräusche aus haustechnischen Anlagen', 'Geräusche aus Betrieben im selben Gebäude'], erkl: 'Der eigene Wohnbereich ist ausgenommen; veränderliche Geräte bleiben außer Betracht.' },
    { id: 'q15', kat: 'Grundlagen', frage: 'Wann gilt die VDI 4100?', richtig: 'Nur bei vertraglicher Vereinbarung', falsch: ['Automatisch über das Bauordnungsrecht', 'Nur bei öffentlichen Gebäuden', 'Immer, wenn die DIN 4109 nicht erfüllt ist'], erkl: 'VDI 4100 = erhöhter Schallschutz und muss zusätzlich vereinbart werden.' },
    { id: 'q16', kat: 'VDI 4100', frage: 'Schallschutzstufe I der VDI 4100 entspricht …', richtig: 'dem Niveau der DIN 4109', falsch: ['dem höchsten Schallschutz', 'einem Wert unterhalb der DIN 4109', 'dem Niveau der TA Lärm'], erkl: 'SSt I = DIN 4109; erst SSt II und III gehen darüber hinaus.' },
    { id: 'q17', kat: 'VDI 4100', frage: "R'w Luftschall horizontal in SSt III?", richtig: '59 dB', falsch: ['53 dB', '56 dB', '60 dB'], erkl: 'Horizontal 53 / 56 / 59 dB; vertikal 54 / 57 / 60 dB.' },
    { id: 'q18', kat: 'VDI 4100', frage: "L'n,w Trittschall zu fremden Räumen in SSt II?", richtig: '46 dB', falsch: ['53 dB', '39 dB', '56 dB'], erkl: 'SSt I / II / III: 53 / 46 / 39 dB – niedriger = besser.' },
    { id: 'q19', kat: 'VDI 4100', frage: 'Welche Aussage zum Trittschall L\'n,w ist richtig?', richtig: 'Niedriger Wert = besserer Schallschutz', falsch: ['Hoher Wert = besserer Schallschutz', 'Der Wert ist in allen Stufen gleich', 'Er gilt nur für SSt III'], erkl: "Luftschall R'w steigt (höher = besser), Trittschall L'n,w sinkt (niedriger = besser)." },
    { id: 'q20', kat: 'VDI 4100', frage: "R'w Luftschall vertikal in SSt I?", richtig: '54 dB', falsch: ['53 dB', '52 dB', '57 dB'], erkl: 'Vertikal stets 1 dB strenger als horizontal: 54 / 57 / 60 dB.' },
    { id: 'q21', kat: 'Schallarten', frage: 'Welche Schallart überwiegt bei haustechnischen Anlagen – und was folgt daraus?', richtig: 'Körperschall – bessere Luftschalldämmung der Wände hilft dann nicht', falsch: ['Luftschall – schwerere Wände reichen aus', 'Trittschall – schwimmender Estrich genügt', 'Außenlärm – Schallschutzfenster genügen'], erkl: 'Zentraler Merksatz: bei Körperschallanregung hilft verbesserte Luftschalldämmung im Regelfall nicht.' },
    { id: 'q22', kat: 'Schallarten', frage: 'Minderung durch Kapselung?', richtig: '15 – 30 dB(A)', falsch: ['< 5 dB(A)', '12 – 18 dB(A)', '≈ 3 dB(A)'], erkl: 'Kapselung 15 – 30 dB(A); absorbierende Bekleidung < 5 dB(A); Wasserschalldämpfer 12 – 18 dB(A).' },
    { id: 'q23', kat: 'Schallarten', frage: 'Minderung durch absorbierende Bekleidung?', richtig: '< 5 dB(A)', falsch: ['15 – 30 dB(A)', '12 – 18 dB(A)', '≈ 10 dB(A)'], erkl: 'Absorbierende Bekleidung bringt nur < 5 dB(A).' },
    { id: 'q24', kat: 'Armaturen', frage: 'Dämpfung durch einen Wasserschalldämpfer?', richtig: '12 – 18 dB(A)', falsch: ['< 5 dB(A)', '15 – 30 dB(A)', '≈ 3 dB(A)'], erkl: 'Bild 4.12: Wasserschalldämpfer bei Auslaufarmaturen DN 15 → 12 – 18 dB(A).' },
    { id: 'q25', kat: 'Maßnahmen', frage: 'Welche ist die wirksamste Einzelmaßnahme?', richtig: 'Der Grundriss (≈ 10 dB)', falsch: ['Eine Vorsatzschale', 'Absorbierende Bekleidung', 'Ein Wasserschalldämpfer'], erkl: 'Ein Zwischenraum bringt ≈ 10 dB(A) – der Schallschutz wird im Entwurf gewonnen oder verloren.' },
    { id: 'q26', kat: 'Maßnahmen', frage: 'Wo sollen Rohrleitungen an der Wand befestigt werden?', richtig: 'In der Randzone', falsch: ['In der Mittelzone', 'Egal, Hauptsache mit Schelle', 'Nur an leichten Trennwänden'], erkl: 'Randzonen schwingen schwerer; Mittelzonen lassen sich leichter in Schwingungen versetzen (Bild 4.17).' },
    { id: 'q27', kat: 'Maßnahmen', frage: 'Welche Einlage gehört in Rohrschellen?', richtig: 'Alterungsbeständig: Gummi, Filz oder Mineralfaser', falsch: ['Keine – starre Verschraubung ist günstiger', 'Eine Metallunterlegscheibe', 'Ein Holzkeil'], erkl: 'Die federnde Einlage (Dämmstreifen t ≥ 3 mm) unterbricht den Körperschallweg (Bild 4.14).' },
    { id: 'q28', kat: 'Maßnahmen', frage: 'Was gilt für die Verankerung eines Pumpenfundaments?', richtig: 'Sie darf die Dämmplatte nicht durchstoßen', falsch: ['Sie muss durch die Korkplatte bis in den festen Sockel reichen', 'Sie ist schalltechnisch ohne Bedeutung', 'Sie wird mit dem Fundament starr vergossen'], erkl: 'Sonst ist die federnde Trennung überbrückt und die Maßnahme wirkungslos (Bild 4.13).' },
    { id: 'q29', kat: 'Armaturen', frage: 'Armaturengeräuschpegel L_ap der Gruppe I?', richtig: '≤ 20 dB(A)', falsch: ['≤ 30 dB(A)', '≤ 25 dB(A)', '≤ 15 dB(A)'], erkl: 'Tab. 4.8: Gruppe I ≤ 20 dB(A), Gruppe II ≤ 30 dB(A).' },
    { id: 'q30', kat: 'Armaturen', frage: 'Maximaler Durchfluss der Durchflussklasse A (bei 0,3 MPa)?', richtig: '0,25 l/s', falsch: ['0,15 l/s', '0,42 l/s', '0,80 l/s'], erkl: 'Tab. 4.9: Z 0,15 · A 0,25 · B 0,42 · C 0,80 · D > 0,80 l/s.' },
    { id: 'q31', kat: 'Nachweis', frage: 'Wo dürfen Armaturen der Gruppe II beim Nachweis ohne Messung NICHT angeordnet werden?', richtig: 'An Wänden zu schutzbedürftigen Räumen (auch darüber/darunter)', falsch: ['In Küchen', 'An Außenwänden', 'In Kellerräumen'], erkl: 'Bedingung 6: Anordnung nach Armaturengruppe.' },
    { id: 'q32', kat: 'Nachweis', frage: 'Maximaler Ruhedruck vor den Armaturen?', richtig: '5 bar – sonst Druckminderer', falsch: ['3 bar', '10 bar', '2 bar'], erkl: 'Bedingung 2: ≤ 5 bar (0,5 MPa).' },
    { id: 'q33', kat: 'Nachweis', frage: 'Flächenbezogene Mindestmasse einer einschaligen Installationswand?', richtig: '220 kg/m²', falsch: ['120 kg/m²', '300 kg/m²', '450 kg/m²'], erkl: 'Bedingung 5: ≥ 220 kg/m².' },
    { id: 'q34', kat: 'Nachweis', frage: 'Wie werden Durchgangsarmaturen im Betrieb betrieben?', richtig: 'Immer voll geöffnet – nicht drosseln', falsch: ['Halb geöffnet zur Geräuschminderung', 'Auf 50 % gedrosselt', 'Beliebig'], erkl: 'Bedingung 3: Drosseln erzeugt Strömungsgeräusche.' },
    { id: 'q35', kat: 'Nachweis', frage: 'Wann ist eine bauakustische Messung erforderlich?', richtig: 'Wenn mindestens eine der 6 Bedingungen nicht erfüllt ist', falsch: ['Bei jedem Wohngebäude', 'Nie – der Nachweis ist immer rechnerisch', 'Nur bei VDI 4100 SSt III'], erkl: 'Sind alle 6 Bedingungen erfüllt, gilt der Nachweis ohne Messung als geführt.' },
    { id: 'q36', kat: 'Einzelgeräusche', frage: 'Maximale Fließgeschwindigkeit in Trinkwasserleitungen?', richtig: '2 m/s', falsch: ['1 m/s', '3 m/s', '5 m/s'], erkl: 'Mit v ≤ 2 m/s lassen sich Strömungsgeräusche im Allgemeinen vermeiden (DVGW).' },
    { id: 'q37', kat: 'Einzelgeräusche', frage: 'Sicherste Lösung gegen Gurgelgeräusche?', richtig: 'Sekundärlüftung (± 0 Nennweiten)', falsch: ['Anschlussleitung um eine Nennweite vergrößern', 'Fallstrecke einbauen und zwei Nennweiten vergrößern', 'Geruchverschluss weglassen'], erkl: 'Bild 4.10 c: Sekundärlüftung führt Luft zu – keine Vergrößerung der Nennweiten nötig.' },
    { id: 'q38', kat: 'Einzelgeräusche', frage: 'Günstiger Auftreffwinkel des Wasserstrahls auf die Wanne?', richtig: '≈ 15°', falsch: ['≈ 30°', '≈ 45°', '≈ 90°'], erkl: 'Strahl flach gegen die Wandung lenken; Strahlregler mit Luftbeimischung (Bild 4.11).' },
    { id: 'q39', kat: 'Anlagen', frage: 'Mindest-Schalldämm-Maß der Müllraum-Bauteile?', richtig: "R'w ≥ 55 dB", falsch: ["R'w ≥ 53 dB", "R'w ≥ 47 dB", "R'w ≥ 60 dB"], erkl: 'Abschn. 4.3: Müllraum-Bauteile R\'w ≥ 55 dB.' },
    { id: 'q40', kat: 'Rechnen', frage: 'Pegelabnahme durch einen nicht schutzbedürftigen Zwischenraum?', richtig: '≈ 10 dB(A)', falsch: ['≈ 3 dB(A)', '≈ 6 dB(A)', '≈ 25 dB(A)'], erkl: 'Gilt bei Luft- und Körperschall gleichermaßen; im Einzelfall auch größer.' }
  ];

  /* ---------- 6.8 Checklisten-Vorlage (generisch: Kategorie → Position) ---------- */
  var checklisteVorlage = {
    id: 'schallschutz-v1',
    name: 'Schallschutz haustechnische Anlagen (DIN 4109)',
    kategorien: [
      { id: 'grundriss', name: 'Grundriss/Planung', positionen: [
        { id: 'g1', text: 'Nassräume übereinander bzw. nebeneinander angeordnet' },
        { id: 'g2', text: 'Gemeinsame Installationswand (z. B. Küche + Bad, Dusche + WC)' },
        { id: 'g3', text: 'Nassräume nicht neben Schlafräumen fremder Wohnungen' },
        { id: 'g4', text: 'Grundriss nicht von Geschoss zu Geschoss gewechselt' },
        { id: 'g5', text: 'Lange Übertragungswege für den Schall' }] },
      { id: 'rohr', name: 'Rohrleitungen', positionen: [
        { id: 'r1', text: 'Befestigung in der Randzone (nicht Mittelzone)', hinweis: 'Bild 4.17' },
        { id: 'r2', text: 'Rohrschellen mit Dämmeinlage (t ≥ 3 mm)', hinweis: 'Bild 4.14 – Gummi, Filz oder Mineralfaser' },
        { id: 'r3', text: 'Fugenlose Ummantelung in Nassräumen' },
        { id: 'r4', text: 'Schwere Abflussrohre (Grauguss) statt dünnem PVC' },
        { id: 'r5', text: 'Befestigung an Bauteilen mit hohem Flächengewicht' },
        { id: 'r6', text: 'Fließgeschwindigkeit Trinkwasser ≤ 2 m/s' }] },
      { id: 'armaturen', name: 'Armaturen', positionen: [
        { id: 'a1', text: 'Geprüfte Armaturen, Gruppe I bevorzugt', hinweis: 'Tab. 4.8: L_ap ≤ 20 dB(A)' },
        { id: 'a2', text: 'Ruhedruck ≤ 5 bar bzw. Druckminderer eingebaut' },
        { id: 'a3', text: 'Durchgangsarmaturen voll geöffnet (nicht gedrosselt)' },
        { id: 'a4', text: 'Strahlregler mit Luftbeimischung', hinweis: 'Bild 4.11 – DIN EN 246' }] },
      { id: 'sanitaer', name: 'Sanitärgegenstände', positionen: [
        { id: 's1', text: 'Wandhängende Klosettkörper mit Gummimanschetten' },
        { id: 's2', text: 'Küchenspüle mit schalldämmender Randabdichtung', hinweis: 'Bild 4.21' },
        { id: 's3', text: 'Einbauwanne mit weichem Wandanschlussprofil' },
        { id: 's4', text: 'Auftreffwinkel Wasserstrahl Wanne ≈ 15°' }] },
      { id: 'koerper', name: 'Körperschalldämmung', positionen: [
        { id: 'k1', text: 'Federnde Zwischenschicht an Befestigungen' },
        { id: 'k2', text: 'Pumpen/Kessel auf schwimmendem Fundament – Verankerung durchstößt Dämmplatte nicht', hinweis: 'Bild 4.13' },
        { id: 'k3', text: 'Gummikompensatoren eingebaut' }] },
      { id: 'schaechte', name: 'Schächte', positionen: [
        { id: 'c1', text: 'Innere Wandflächen mit Faserdämmstoff ≥ 30 mm' },
        { id: 'c2', text: 'Schachtabdeckungen sorgfältig ausgefugt' },
        { id: 'c3', text: 'Abdeckplatten verschieden dick/schwer' }] }
    ]
  };

  var status = [
    { id: 'offen', name: 'offen' },
    { id: 'erledigt', name: 'erledigt' },
    { id: 'nz', name: 'nicht zutreffend' },
    { id: 'mangel', name: 'Mangel' }
  ];

  var backlog = [
    'Erweiterung der Checkliste auf allgemeine Bau-Anforderungskataloge (nicht nur Schallschutz).',
    'Import/Export von Checklisten-Vorlagen (JSON).',
    'Weitere Lerninhalte (Wärmeschutz, Brandschutz) als zusätzliche Themenpools.',
    'Mehrbenutzer-Gruppenarbeit mit Rollen (Bauleitung sieht alle Projekte) – benötigt ein Backend.'
  ];

  var SSD = {
    NORMSTAND: NORMSTAND, kategorien: kategorien, anwendung: anwendung, kenngroessen: kenngroessen,
    raeume: raeume, grenzwerte: grenzwerte, vdi: vdi, armaturen: armaturen, durchfluss: durchfluss,
    pegel: pegel, bedingungen: bedingungen, schallarten: schallarten, quellenMassnahmen: quellenMassnahmen,
    grundriss: grundriss, kennzahlen: kennzahlen, merksaetze: merksaetze, karten: karten, quiz: quiz,
    checklisteVorlage: checklisteVorlage, status: status, backlog: backlog
  };
  root.SSD = SSD;
  if (typeof module !== 'undefined' && module.exports) module.exports = SSD;
})(typeof window !== 'undefined' ? window : globalThis);
