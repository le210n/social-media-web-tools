# Social Media Web Tools

**→ Live: https://le210n.github.io/social-media-web-tools/**

Eine kleine **Static-Web-App** für einfache Bildbearbeitung direkt im Browser.
Kein Backend, kein Build-Schritt, kein Upload – alle Bilder bleiben auf deinem Rechner.
Gehostet als statische Seite über **GitHub Pages**.

## Funktionen (v1)

| Werkzeug | Was es macht |
|---|---|
| **Öffnen** | Bild per Button, Drag & Drop oder Einfügen (⌘/Strg + V) laden |
| **Drehen & Spiegeln** | 90°-Schritte, horizontal / vertikal spiegeln |
| **Zuschneiden** | Freie Auswahl oder Seitenverhältnis-Vorlagen für Social Media (1:1, 4:5, 9:16, 16:9, 1.91:1, 3:1) |
| **Anpassungen** | Helligkeit, Kontrast, Sättigung, Graustufen |
| **Größe** | Auf Zielbreite/-höhe skalieren, Seitenverhältnis optional sperren |
| **Export** | PNG / JPEG / WebP mit Qualitätsregler, direkter Download |

Der genaue Funktionsumfang wird noch weiter definiert – der Code ist bewusst
modular gehalten (`js/state.js`, `js/pipeline.js`, `js/crop.js`, `js/main.js`),
damit sich weitere Werkzeuge einfach ergänzen lassen.

## Projektstruktur

```
index.html          Markup + Panel-Layout
css/style.css        Styles (dunkles Theme, responsiv)
js/state.js          zentraler Bearbeitungs-Zustand
js/pipeline.js       Render-Pipeline: Transform → Crop → Resize → Anpassungen → Export
js/crop.js           Crop-Overlay (Maus + Touch)
js/main.js           UI-Verdrahtung
.nojekyll            verhindert Jekyll-Verarbeitung auf GitHub Pages
```

## Lokal ausprobieren

Die Scripte sind klassische `<script>`-Dateien (keine ES-Module), daher genügt
ein Doppelklick auf `index.html` – oder ein beliebiger statischer Server:

```bash
# nur falls python3 installiert ist
python3 -m http.server 8080
# -> http://localhost:8080
```

## Deployen

GitHub Pages ist bereits eingerichtet: Quelle ist Branch `main`, Ordner `/` (root).
„Deployen" heißt hier also schlicht **committen und pushen** – GitHub Pages liefert
die Dateien unverändert aus, ein Build läuft nicht.

```bash
git add -A
git commit -m "…"
git push
```

Nach ein bis zwei Minuten ist die Änderung unter
https://le210n.github.io/social-media-web-tools/ live.

Den Build-Status siehst du unter **Actions** bzw. **Settings → Pages** im Repo.

## Lizenz

MIT – siehe [LICENSE](LICENSE) (Copyright-Namen dort noch eintragen).
