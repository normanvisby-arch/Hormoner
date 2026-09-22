# Hormoner — beslutningsstøtte ved klimakteriet

En let, statisk webapp der giver den praktiserende læge en hurtig, struktureret anbefaling om
hormonbehandling (MHT) ved klimakterielle symptomer — med konkrete eksempler på præparater der
er tilgængelige i Danmark.

Appen kører udelukkende i browseren (ingen server, ingen data sendes nogen steder). Udfyld
patientens data i venstre panel, og anbefalingen opdateres øjeblikkeligt i højre panel. Brug
"Kopiér resumé til journal" for at indsætte anbefalingen i journalnotatet, eller "Udskriv" for en
printvenlig version med tidsstempel.

## Sådan køres appen

Ingen build-trin eller afhængigheder er nødvendige.

- **Lokalt:** åbn `index.html` direkte i en browser, eller kør en simpel lokal server, fx:
  ```
  python3 -m http.server 8000
  ```
  og gå til `http://localhost:8000`. Bemærk: åbnes filen direkte via `file://` (uden lokal
  server), vil "Kopiér resumé til journal" sandsynligvis fejle stille, da browserens
  clipboard-API kræver en sikker kontekst (https eller en lokal server) — kør en lokal server som
  ovenfor, eller markér og kopiér teksten manuelt.
- **Hosting:** filerne (`index.html`, `style.css`, `app.js`) kan deployes som statisk site til
  fx GitHub Pages, Netlify eller en intern klinikserver.

## Klinisk logik (kort opsummeret)

1. **Absolutte kontraindikationer** (brystkræft/østrogenfølsom cancer, uafklaret
   vaginalblødning, aktiv VTE, aktiv arteriel tromboembolisk sygdom, aktiv leversygdom,
   graviditet) → systemisk hormonbehandling frarådes, ikke-hormonelle alternativer foreslås
   (SSRI/SNRI, gabapentin, clonidin), og lokal vaginal østrogen nævnes som mulighed ved isolerede
   urogenitale symptomer efter aftale med specialist. Denne gren har altid højeste prioritet.
2. **Prænatur ovarieinsufficiens (POI)** → systemisk hormonbehandling anbefales til ca.
   51-årsalderen, **uafhængigt af hvilke symptomer patienten aktuelt har markeret** — inklusive
   hvis kun urogenitale symptomer eller ingen symptomer er markeret, da indikationen er
   tilstands-betinget (knogle-/kardiovaskulær beskyttelse), ikke symptombetinget. Tjekkes derfor
   umiddelbart efter kontraindikationer, før de øvrige symptomgrene.
3. **Isolerede urogenitale symptomer (GSM)** hos ikke-POI-patienter, uden vasomotoriske/andre
   symptomer → lokal vaginal østrogen alene, uafhængigt af uterusstatus.
4. **Systemisk kombinationsbehandling** vælges ud fra to *uafhængige* felter:
   - Uterus til stede (ja/nej) — østrogen-alene hvis nej, ellers østrogen + progestogen.
   - Reproduktiv/ovariel status (perimenopausal/postmenopausal) — cyklisk/sekventiel behandling
     ved perimenopause, kontinuerlig kombination ved > 12 måneders amenoré.
   - Disse to felter påvirker ikke automatisk hinanden, så fx en hysterektomeret patient med
     bevarede ovarier kan fortsat markeres som perimenopausal.
   - Administrationsvej: **transdermal (plaster/gel/spray) er det generelle førstevalg** for
     systemisk østrogen, uafhængigt af yderligere risikofaktorer, i tråd med Sundhedsstyrelsens
     Nationale Rekommandationsliste (NRL). Oral behandling vises som alternativ ved
     patientpræference. Ved yderligere risikofaktorer (rygning, BMI ≥ 30, migræne med aura,
     trombofili, hypertension, høj triglycerid, galdeblæresygdom, opstart ≥ 60 år eller > 10 år
     postmenopausal) skærpes anbefalingen yderligere.
   - Progestogenvalg: mikroniseret progesteron (Utrogestan) eller dydrogesteron (Femoston)
     fremhæves som muligt gunstigere alternativ til syntetiske progestiner ved øget bekymring
     for bryst-/VTE-risiko.
   - Ved nedsat libido nævnes testosterontilskud (off-label) som mulighed hvis symptomet
     fortsætter efter optimeret østrogen-/progestogenbehandling.
   - Ved perimenopausal eller POI-status vises en påmindelse om, at hormonbehandling ikke er
     prævention.
5. **Opfølgning:** kontrol efter 2–3 måneder, årlig revurdering, ingen fast øvre grænse for
   behandlingsvarighed, uændret mammografiscreening.

## Kilder og grundlag

- Sundhedsstyrelsen — National Rekommandationsliste (NRL): *Hormonbehandling i klimakterie og
  menopause* (2022)
- Dansk Selskab for Obstetrik og Gynækologi (DSOG) — revideret guideline for menopausal
  hormonterapi (februar 2026)
- [pro.medicin.dk](https://pro.medicin.dk) — opslag før enhver ordination (aktuelle
  præparatnavne, styrker, pakninger, tilskud og interaktioner)
- Supplerende internationalt evidensgrundlag: NICE NG23, IMS/EMAS og The Endocrine Society's
  kliniske retningslinjer for menopausal hormonbehandling

Tidligere versioner af dette værktøj citerede en selvstændig DSAM-vejledning ved navn
"Overgangsalderen" som primær kilde. Det kunne ikke bekræftes at en sådan selvstændig,
navngiven DSAM-vejledning om hormonbehandling findes — kildelisten er derfor rettet til NRL og
DSOG's guideline, som synes at være de aktuelle primære danske referencer på området. DSAM har
bredere vejledninger, der berører kvinder i og efter overgangsalderen, men ingen der er
identificeret som en selvstændig, dedikeret vejledning om hormonbehandling ved klimakteriet.

## Vigtige forbehold

- Dette er et **uafhængigt hjælpeværktøj**, ikke en officiel publikation fra Sundhedsstyrelsen,
  DSOG eller andre af de nævnte kilder.
- Præparatnavne, styrker, pakninger og tilskudsstatus ændres løbende i Danmark — **verificér
  altid på pro.medicin.dk før ordination**, herunder at det enkelte præparat fortsat er
  markedsført (fx er status for Kliogest og periodevis leveringssikkerhed for Oestring/Estring
  ikke fuldt bekræftet på tidspunktet for seneste opdatering).
- Værktøjet erstatter ikke den individuelle kliniske vurdering, grundig anamnese,
  kontraindikationsscreening eller den fulde tekst i de originale vejledninger.
- Værktøjet giver kun kvalitative risikoudsagn, ikke konkrete absolutte risikotal — brug et
  dedikeret risikoberegningsværktøj eller de originale vejledninger til den fælles
  beslutningssamtale med patienten.
- Ingen patientdata gemmes eller sendes — al beregning sker lokalt i browseren.

## Ændringslog

**22. september 2026 — rettelser efter ekstern audit af algoritme og UX:**
- Rettet: en prænatur ovarieinsufficiens (POI)-patient med kun urogenitale symptomer eller ingen
  markerede symptomer fik tidligere fejlagtigt *ikke* den systemiske POI-anbefaling, fordi
  symptomgrenene blev tjekket før POI-status i koden.
- Rettet: uterus-status og reproduktiv status var tidligere ét kombineret radioknap-sæt, hvor et
  skift af reproduktiv status tavst nulstillede et manuelt korrekt uterus-valg. De er nu to
  uafhængige felter.
- Rettet: "Nulstil"-knappen kaldte `form.reset()` på et element der ikke var en `<form>`, og
  fejlede derfor stille uden at nulstille noget. Formularen er nu et rigtigt `<form>`-element.
- Rettet: kildehenvisning til en ubekræftet DSAM-vejledning erstattet med Sundhedsstyrelsens NRL
  og DSOG's 2026-guideline.
- Ændret: administrationsvejs-anbefalingen gør nu transdermal behandling til generelt førstevalg
  (ikke kun ved markerede risikofaktorer), i tråd med NRL.
- Tilføjet: præventionspåmindelse, note om testosteron ved vedvarende nedsat libido,
  BMI som talfelt i stedet for tærskel-afkrydsning, aldersvarsel ved usædvanlige værdier,
  POI/alder-krydstjek, "spring til anbefaling"-genvej på mobil, tidsstemplet udskrift, og en
  robust ren-tekst-eksport til "Kopiér resumé til journal" (byggede tidligere på `innerText` af
  en tabelstruktur, som kunne blive rodet i nogle journalsystemer).
