# Schallschutz-Assistent – Kurzanleitung

Mobile Web-App (PWA) zum Lernen, Rechnen und Dokumentieren nach DIN 4109 (11.89) + Bbl. 1 & 2 und VDI 4100 (08.07).
Läuft komplett ohne Server-Backend; alle Daten bleiben im Browser des Geräts (localStorage, Fotos in IndexedDB).

## Module

| Modul | Inhalt |
|---|---|
| **Lernen** | 51 Karteikarten (12 Kategorien, Modus „Nur Fehler", Mischen, Fortschritt), Quiz mit 40 Fragen (5–20 je Durchlauf, Erklärung, Prozent-Score), Merksätze |
| **Rechnen** | B1 Grenzwert-Prüfer (Tab. 4.5, Lüftungsbonus), B2 Pegel-Addition mit Rechenweg und Faustwerten, B3 Nachweis ohne Messung (6 Bedingungen, Druck- und Wand-Check), B4 VDI-4100-Stufen – jeweils mit PDF-Bericht |
| **Nachschlagen** | 12 Abschnitte mit Normbezug, Suche, Detailskizzen |
| **Checkliste** | Projekte mit Prüfliste aus dem Maßnahmenkatalog (6 Gruppen, 24 Positionen + eigene), Status, Notiz mit Spracheingabe, Fotos, PDF-Protokoll |

## Dateien

- `data.js` – **alle Fachwerte** (Grenzwerte, Karten, Quiz, Checkliste). Werte nur hier ändern.
- `calc.js` – Rechenfunktionen ohne Oberfläche.
- `app.js` / `app.css` / `index.html` – Oberfläche.
- `tests.js` / `tests.html` – Selbsttest (50 Prüfungen, u. a. Testfall 28 + 26 + 24 dB(A) = 31,1 dB(A) → nicht erfüllt).
- `sw.js`, `manifest.json`, `icon*` – Offline-Fähigkeit und Installation als App.
- `skizzen.svg` – Detailskizzen (im Nachschlagen).

## Starten

Lokal: im Ordner `GModG` den Vorschau-Server „schallschutz" starten oder

```bash
python -m http.server 8766 --directory schallschutz
```

dann http://localhost:8766 öffnen. Selbsttest ohne Browser:

```bash
node schallschutz/tests.js
```

## Änderungen ausliefern

Bei jeder Änderung `?v=` an den Skript-/CSS-Tags in `index.html` und `tests.html` sowie `CACHE` in `sw.js` erhöhen, sonst zeigen installierte Geräte den alten Stand.
Fürs Handy muss die App über **https** erreichbar sein (z. B. GitHub Pages wie bei der Nivellement-App); Kamera, Spracheingabe und Offline-Modus funktionieren nur dort bzw. auf localhost.

## Hinweise

- Alle Werte sind vom Nutzer gegen die Originalnorm bzw. Schneider Bautabellen zu prüfen; Tabellen-/Bildnummern nach Lernunterlage.
- Keine bauakustische Messung, keine Prüfstatik, keine Rechtsberatung.
- Spracheingabe nutzt die Web Speech API (Chrome/Edge/Safari); sonst die Diktierfunktion der Handy-Tastatur.
- Datensicherung (Mehr → Datensicherung) speichert Projekte inkl. Fotos als JSON-Datei, z. B. für einen Gerätewechsel.
