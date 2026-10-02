# Klinikværktøjer til almen praksis — arbejdsgang

Danske beslutningsstøtteværktøjer til en praktiserende læge i syv selvstændige apps:
**kvindesundhed** (klimakterie/MHT, prævention, MRS-scoring, osteoporose — repoets rod),
**hjerte-kar** (`hjerte/`), **lunger** (`lunge/`: KOL og astma), **hypothyreose** (`thyreoidea/`),
**type 2-diabetes** (`diabetes/`), **infektioner** (`infektion/`: antibiotika) og **nyrer**
(`nyre/`: kronisk nyresygdom og dosis efter nyrefunktion) — plus **Notat-indgangen** (`notat/`),
der modtager et journalnotat og sender det til det rette værktøj. Brugeren er læge; al tekst i værktøjerne og svar til brugeren er på
dansk. Klinisk indhold skal være korrekt, kildebelagt og ærligt om usikkerhed — hellere et interval
eller "usikker" end et falsk præcist tal.

## Struktur

- Sider: `oversigt.html` (startside), `index.html` (Klimakterieguide), `risiko.html`,
  `huskeskema.html`, `praevention.html`, `mrs.html`, `osteoporose.html`, `fraktur.html`,
  `osteoplan.html`, `osteohuskeskema.html`. `bloedningskalender.html` findes, men er fjernet fra
  navigation og oversigt efter ønske.
- Hjerte-appen i `hjerte/`: `index.html` (startside), `cvrisiko.html` (SCORE2/SCORE2-OP/
  SCORE2-Diabetes), `af.html` (antikoagulation ved atrieflimren), `ekg.html` (tolkning af
  EKG-måleværdier og maskinens tekst; udfyldes fra indsat EKG-udskrift via `udfyld.js`, ordlisten
  `UDSAGN` i `ekg.js`; sammenligning med tidligere EKG i `sammenlign()`; test `tests/ekg.test.js`), `huskeskema.html`; egen
  `manifest.webmanifest`, `sw.js` og `icons/`, men fælles `../style.css` (rød farve via
  `body.theme-hjerte`) og `../pwa.js`. SCORE2-koefficienterne er kontrolleret mod R-pakken
  RiskScorescvd og de publicerede regneeksempler (se `tests/cvrisiko.test.js`) — ret dem kun med
  en primærkilde.
- `lunge/` (`kol.html`, `astma.html`, `huskeskema.html`), `thyreoidea/` (`hypothyreose.html`,
  `huskeskema.html`) og `diabetes/` (`behandling.html`, `aarskontrol.html`, `huskeskema.html`) er
  bygget som hjerte-appen: egen `index.html`, `manifest.webmanifest`, `sw.js` og `icons/`
  (lav PNG-ikoner med `node tools/mkicons.js MAPPE`), fælles `../style.css` (`body.theme-lunge`,
  `.theme-thyreoidea`, `.theme-diabetes`), `../valg.js` og `../pwa.js`. Startsiderne har en
  installér-knap (`data-install`, styres af `pwa.js`) og "Andre apps"-links — hold dem i sync.
- `infektion/` (`luftveje.html`, `urinveje.html`, `hud.html`, `huskeskema.html`; fælles `ab.js`
  med børnedosis efter vægt og `MIKSTURER`: mikstur, ml og pakning) og `nyre/` (`ckd.html` med KDIGO-farvekort og KFRE, `dosis.html`,
  `huskeskema.html`) er bygget på samme måde (`body.theme-infektion`, `.theme-nyre`).
  KFRE-koefficienterne er kontrolleret mod Python-pakken kfre (se `tests/nyre.test.js`) — ret dem
  kun med en primærkilde.
- `valg.js`: fælles "Vælg til journal"-knap i behandlingstabeller (klimakterie, prævention,
  osteoporose); journalnotatet bruger det valgte i stedet for førstevalget.
- `udfyld.js`: fælles "Udfyld fra journaltekst" (indsæt diktat-/journaltekst → felter udfyldes
  lokalt med faste regler og negationsdetektion; intet sendes). Bruges i infektion, nyre,
  restordre og hjerte/ekg; hver side har sin konfiguration nederst i sin `.js` (`Udfyld.init`). Script-tagget skal stå
  før sidens egen `.js`, og filen skal i den brugende apps `sw.js`. Test: `tests/udfyld.test.js`.
- `notat/` (Notat-indgang): `index.html` + `notat.js`, egen manifest (`scope: "../"`), `sw.js` og
  `icons/`. Klassifikatoren (`VAERKTOEJER` og `klassificer` i `udfyld.js`) giver point pr. værktøj;
  sikkert valg → værktøjet åbnes og udfyldes via `sessionStorage` (`udfyld.overdrag`, engangs), ellers
  vælger lægen. Nyt værktøj med udfyldning: tilføj det i `VAERKTOEJER` (med `udfyld: true`), i
  listen i `notat/index.html` og i `tests/notat.test.js`. Test: `tests/notat.test.js`.
- `restordre/` (Restordre — alternativer): `index.html`, `restordre.js`, vidensbasen `data.js`
  (grupper med stoffer, ækvivalensrækker, råd om samme stof, skift og kilder) og `register.js`
  (ca. 450 indholdsstoffer med ATC-gruppe og handelsnavne, gruppenavne og `RESTORDRE_ATC_NOTE` for
  brede/specialiststyrede grupper). Handelsnavne kun, når de sikkert findes i Danmark. Egen manifest,
  `sw.js` og `icons/`. Doser skal stemme med de øvrige værktøjer (DOAK = `hjerte/af.js`, østrogen =
  `app.js`, cystitis = `infektion/urinveje.js`, DPP-4 = `nyre/dosis.js`). Test:
  `tests/restordre.test.js`.
- `apps.html` (downloadside "Hent klinikværktøjerne"): alle apps med "Åbn og installér" (→ `…#installer`),
  delbart link og QR-koder i `qr/` (lav dem med `python3 tools/mkqr.py`; listen `KODER` skal svare til
  kortene). Nyt app-modul: tilføj kort, QR-kode og filerne i rodens `sw.js`. Notat-indgang og Restordre er skjult efter ønske (som blødningskalenderen): ikke på downloadsiden, oversigten eller i "Andre apps" — filerne findes fortsat. Test: `tests/apps.test.js`.
- Logik i den tilhørende `.js`-fil; fælles stil i `style.css` (huskeskemaer og oversigt har egen `<style>`).
- App (PWA) på GitHub Pages: `manifest.webmanifest`, `sw.js`, `pwa.js`, `icons/`.
  **Hæv `VERSION` i `sw.js`** og i den berørte apps `*/sw.js` (hjerte, lunge, thyreoidea,
  diabetes, infektion, nyre, notat, restordre), når filer tilføjes, fjernes eller ændres — også fælles filer (`style.css`, `pwa.js`,
  `valg.js`, `udfyld.js`) caches af alle apps.
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
- **Hjerte-kar (`hjerte/`):** Dansk Cardiologisk Selskabs NBV (forebyggelse, dyslipidæmi,
  hypertension, atrieflimren, antitrombotisk behandling), DSAM, ESC-guidelines og fokuserede
  opdateringer (forebyggelse, dyslipidæmi, hypertension, diabetes, atrieflimren), EHRA's
  NOAC-guide, produktresuméer for DOAK (dosis, nyregrænser, interaktioner), Medicinrådet/
  basislister (valg af statin og DOAK), nye SCORE2-kalibreringer.

- **Lunger (`lunge/`):** GOLD- og GINA-rapporter (årlige), DSAM's vejledning "Astma og KOL i almen
  praksis" (i høring 2026 — tjek endelig version), Dansk Lungemedicinsk Selskab, Medicinrådets
  basisliste for astma/KOL, vaccinationsanbefalinger (RSV, pneumokok) og inhalatorudbud.
- **Hypothyreose (`thyreoidea/`):** DES' NBV Hypothyroidisme, DSAM, NICE NG145, graviditet
  (DSOG/ATA), levothyroxin-præparater og styrker.
- **Type 2-diabetes (`diabetes/`):** DSAM/DES' vejledninger, Medicinrådets behandlingsvejledning,
  Lægemiddelstyrelsens tilskudsklausuler (GLP-1), ADA/EASD-konsensus, KDIGO, produktresuméer
  (eGFR-grænser), øjen- og fodscreening.
- **Infektioner (`infektion/`):** DSAM's vejledning om akutte luftvejsinfektioner, regionernes
  antibiotikavejledninger (Region Hovedstaden, Region Midtjylland m.fl.), Medicinrådets
  vejledning om urinvejsinfektioner, Sundhedsstyrelsen (NKR/IRF), SSI og DANMAP (resistens),
  EMA/Lægemiddelstyrelsen (sikkerhed, fx fluorokinoloner) og restordrer/udbud af antibiotika.
- **Nyrer (`nyre/`):** KDIGO (CKD og diabetes-CKD), Dansk Nefrologisk Selskab, regionernes
  forløbsbeskrivelser for kronisk nyresygdom, DSAM (evt. egen vejledning), Medicinrådet
  (SGLT-2-hæmmer, finerenon), KFRE-opdateringer og produktresuméer (dosis efter nyrefunktion).

Ret kun ved reel ny evidens eller fejl, og beskriv hver ændring med kilde i PR og ændringslog.
Findes intet nyt, så sig det — lav ikke ændringer for ændringernes skyld.
