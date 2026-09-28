# Klinikværktøjer til kvindesundhed — arbejdsgang

Danske beslutningsstøtteværktøjer til en praktiserende læge: klimakterie/MHT, prævention,
MRS-scoring og osteoporose. Brugeren er læge; al tekst i værktøjerne og svar til brugeren er på
dansk. Klinisk indhold skal være korrekt, kildebelagt og ærligt om usikkerhed — hellere et interval
eller "usikker" end et falsk præcist tal.

## Struktur

- Sider: `oversigt.html` (startside), `index.html` (Klimakterieguide), `risiko.html`,
  `huskeskema.html`, `praevention.html`, `mrs.html`, `osteoporose.html`, `fraktur.html`,
  `osteoplan.html`, `osteohuskeskema.html`. `bloedningskalender.html` findes, men er fjernet fra
  navigation og oversigt efter ønske.
- Logik i den tilhørende `.js`-fil; fælles stil i `style.css` (huskeskemaer og oversigt har egen `<style>`).
- App (PWA) på GitHub Pages: `manifest.webmanifest`, `sw.js`, `pwa.js`, `icons/`.
  **Hæv `VERSION` i `sw.js`**, når filer tilføjes, fjernes eller ændres, så appen henter dem.
- `README.md`: klinisk logik, datagrundlag og ændringslog (opdateres ved hver ændring).
- `tests/`: Playwright-suiter. `tests/run_all.sh` kører dem alle mod en lokal server.
- `tools/artifacts.json` + `tools/build_artifact.py`: byg de publicerede claude.ai-versioner.

## Ændringer

1. Research: primærsider (sundhed.dk, dsam.dk, endocrinology.dk, medicinraadet.dk, NICE, MHRA,
   EMA, pro.medicin.dk m.fl.) er ofte blokeret af netværket — brug WebSearch, og skriv tydeligt i
   kildelisten, når tal er kontrolleret via sekundære kilder.
2. Ret siden/logikken, opdatér kildelisten i sidens footer, README (logik + ændringslog) og evt.
   `sw.js`-version.
3. Tilføj/ret tests i `tests/`, og kør `tests/run_all.sh` — alt skal være grønt.
4. Lav en kritisk egen-audit af tal og algoritme før commit.
5. Commit på den tildelte gren, opret PR mod `main` (squash-merge).

## Publicerede versioner (claude.ai-artifacts)

Adresserne står i `tools/artifacts.json`. For hver side, der er ændret:

1. Hent den aktuelle version med Artifact-værktøjet (`action: "read"`, `url` fra artifacts.json)
   og gem den som fil (kun nødvendigt for `mode: "tool"`).
2. `python3 tools/build_artifact.py SIDE.html LIVE.html OUT.html`
3. Test den byggede fil: læg en kopi med `<meta charset="utf-8">` først i en mappe, server den, og
   kør den relevante suite med `BASE=http://localhost:PORT/fil.html BASE_URL=http://localhost:PORT/`.
4. Publicér `OUT.html` med Artifact-værktøjet og samme `url`. Artifacts har ingen udskriv-knap og
   ingen service worker; ny CSS i `style.css` skal også tilføjes i artifactets `<style>` med
   tema-tokens (`--surface`, `--text`, …) for lys og mørk visning.

## Kvartalsvis faglig gennemgang

Tjek for nye eller reviderede anbefalinger og studier siden sidste gennemgang (se ændringsloggen):

- **Klimakterie/MHT:** Sundhedsstyrelsens NRL, DSOG's MHT-guideline, NICE NG23, BMS, MHRA/EMA
  (sikkerhedsmeddelelser, fx fezolinetant), nye store studier om brystkræft, VTE, apopleksi,
  endometriecancer og demens (især danske registerstudier).
- **Prævention:** NRL, Lægemiddelstyrelsen, EMA (VTE pr. gestagen), FSRH (nødprævention, glemte
  piller), danske studier (brystkræft, depression, hjerte-kar).
- **Osteoporose:** DSAM-vejledningen, DES' NBV (inkl. glukokortikoid og ophør med denosumab),
  Medicinrådets basisliste, tilskudsregler, nye præparater/biosimilærer.
- **Præparater:** navne, styrker, udbud og tilskud i Danmark (pro.medicin.dk / Medicinpriser) —
  udgåede eller nye præparater skal rettes.
- **MRS:** normalt ingen ændringer.

Ret kun ved reel ny evidens eller fejl, og beskriv hver ændring med kilde i PR og ændringslog.
Findes intet nyt, så sig det — lav ikke ændringer for ændringernes skyld.
