# Hormoner — beslutningsstøtte for praktiserende læge

> **Syv selvstændige apps:** kvindesundhed (repoets rod, startside `oversigt.html`),
> **hjerte-kar** (`hjerte/`), **lunger** (`lunge/` — KOL og astma), **hypothyreose** (`thyreoidea/`),
> **type 2-diabetes** (`diabetes/`), **infektioner** (`infektion/` — antibiotika ved luftvejs-,
> urinvejs- og hudinfektioner) og **nyrer** (`nyre/` — kronisk nyresygdom og dosis efter
> nyrefunktion). Hver app har egen startside `index.html`, manifest, ikon og service worker og kan
> installeres som app på computer og telefon.

Lette, statiske webapps der giver den praktiserende læge en hurtig, struktureret anbefaling
til brug ved konsultationen — med konkrete eksempler på præparater der er tilgængelige i Danmark.
De kan installeres som app på telefonen (se "Installér som app" nedenfor):

- **`oversigt.html`** — startside med alle værktøjer; appens forside.
- **Osteoporose (knoglesundhed):**
  - **`osteoporose.html`** — DXA-indikation, behandlingsindikation (brud og T-score), præparatvalg
    ud fra nyrefunktion og tolerans, udredning før opstart, varighed og journalnotat.
  - **`fraktur.html`** — frakturrisiko og NNT: patientens FRAX-resultat omregnet til brud pr.
    1.000 over 5 år med og uden behandling, 1.000-personers figur og bivirkninger.
  - **`osteoplan.html`** — opfølgningsplan med datoer for kontrol, DXA, revurdering, pause og
    denosumab-injektioner (advarsel ved forsinkelse).
  - **`osteohuskeskema.html`** — tolv principper, effekt i tal og henvisningskriterier.
- **`huskeskema.html`** — MHT-huskeskema: tolv principper for lavest mulig risiko, afvejningen
  mellem kontinuerlig og sekventiel behandling, de skift der flytter risikoen mest, og hvornår
  man skal konferere.

- **`index.html`** — hormonbehandling (MHT) ved klimakterielle symptomer.
- **`risiko.html`** — individuel risikovurdering ved MHT: absolutte risikotal pr. 1.000 kvinder
  for patientens alder, regime, administrationsvej og varighed, med hendes egne risikofaktorer
  markeret og en 1.000-personers figur til samtalen.
- **`praevention.html`** — prævention/kontraception, inkl. en separat, hurtig gren for akut
  nødprævention.
- **`mrs.html`** — Menopause Rating Scale (MRS): et internationalt valideret, 11-punkts
  symptomscoringsskema til at kvantificere sværhedsgraden af klimakterielle symptomer, og til at
  følge effekten af behandling ved gentagen udfyldelse.
- **`bloedningskalender.html`** — årsoverblik til registrering af blødning ved mistanke om
  blødningsforstyrrelser, i stil med en klassisk papirvægkalender: hele året i ét skærmbillede i
  stedet for én måned ad gangen, så uregelmæssige mønstre bliver synlige med det samme.

Værktøjerne krydshenviser til hinanden i en lille navigationslinje øverst (Oversigt,
Hormonbehandling, Risikovurdering, Huskeskema, Prævention, MRS-scoring). Blødningskalenderen er
fjernet fra navigationen efter ønske, men filen findes fortsat og kan åbnes direkte.

Hormon-, risiko-, præventions- og MRS-værktøjet kører udelukkende i browseren og gemmer intet (ingen server, ingen data sendes
nogen steder). Udfyld patientens data i venstre panel, og anbefalingen/scoren opdateres
øjeblikkeligt i højre panel. Brug "Kopiér resumé til journal" for at indsætte resultatet i
journalnotatet (hormonværktøjet har desuden et kort "journalnotat"), eller "Udskriv" for en
printvenlig version med tidsstempel.

Blødningskalenderen er anderledes: den er lavet til at bruges over uger/måneder, og gemmer derfor
data lokalt i browserens `localStorage` mellem besøg (se afsnittet "Blødningskalender" nedenfor
for hvad det betyder i praksis).

## Osteoporose — logik og datagrundlag

**Behandlingsguiden** (`osteoporose.js`) følger DSAM (2024) og DES' NBV (2025):
- Lavenergibrud i hofte eller ryg → behandling uanset T-score. T-score ≤ −4,0 → behandling.
  T-score ≤ −2,5 med mindst én risikofaktor (eller andet lavenergibrud) → behandling; uden
  risikofaktorer → individuel vurdering med FRAX. Ved glukokortikoid → behandling allerede ved
  T-score ≤ −1,0 (DES; tjek dosisgrænsen). Osteopeni med andet lavenergibrud → individuel vurdering.
- Uden DXA: DXA ved prednisolon ≥ 5 mg i ≥ 3 mdr., aromatasehæmmer, lavenergibrud efter 50 år
  eller mindst 2 øvrige risikofaktorer — og kun hvis patienten vil overveje behandling.
- Præparat: alendronat 1. valg; zoledronsyre 2. og denosumab 3. valg ved problemer med tabletter.
  eGFR < 35: ikke alendronat/zoledronsyre (risedronat ned til 30); eGFR < 30: specialist.
  Meget høj risiko (≥ 2 sammenfald i ryggen, eller nyt sammenfald og T ≤ −3,0): henvis mhp.
  anabol behandling. Kvinder under 60 med klimakterielle gener: MHT som mulighed.
- Varighed: revurdering efter 5 år (tabletter) / 3 år (zoledronsyre); pause ved hofte-T-score
  > −2,5 og ingen nye brud; denosumab stoppes aldrig uden efterbehandling (zoledronsyre efter 6 mdr.).

**Frakturrisiko og NNT** (`fraktur.js`): 5-års risiko = 1 − √(1 − FRAX 10-års risiko).
Relativ risiko med behandling: større osteoporotiske brud 0,7 (0,6–0,8), hoftebrud 0,6 (0,5–0,7)
(Cochrane 2025; FIT, HORIZON, FREEDOM). Ved osteopeni uden brud bruges Cochranes
primærforebyggelse: større brud 0,89 (0,76–1,0), ingen sikker effekt på hoftebrud. NNT = 1.000 ÷
forebyggede brud pr. 1.000, afrundet som NNH i MHT-værktøjet. Bivirkninger: kæbenekrose ca. 1 pr.
10.000–100.000 behandlingsår ved tabletter (ASBMR); ca. 149 forebyggede hoftebrud pr. 2 atypiske
lårbensbrud efter 3 år (Black 2020).

**Forbehold:** DSAM-, DES- og Medicinrådets dokumenter kunne ikke tilgås direkte; kriterierne er
kontrolleret via sekundære kilder og skal verificeres. FRAX er beskyttet og kan ikke indbygges —
brugeren indtaster resultatet fra den officielle beregner.

## Hjerte-kar (`hjerte/`) — logik og datagrundlag

Selvstændig app med eget manifest, ikon og service worker (installeres fra
`https://normanvisby-arch.github.io/Hormoner/hjerte/`).

- **`cvrisiko.html`**: 10-års risiko for hjerte-kar-død, ikke-dødeligt AMI og apopleksi med
  SCORE2 (40–69 år), SCORE2-OP (70–89 år, inkl. diabetes) og SCORE2-Diabetes (type 2-diabetes,
  40–69 år; HbA1c, eGFR, alder ved diagnose), alle kalibreret til ESC's lavrisikoregion.
  Koefficienter fra de publicerede algoritmer (*Eur Heart J* 2021/2023), kontrolleret mod
  R-pakken RiskScorescvd og Python-pakken cvd-risk (300 tilfældige tilfælde, afvigelse < 10⁻¹³) og
  de publicerede regneeksempler (6,3 / 4,3 / 18,6 / 15,2 / 8,4 %). Danske tærskler (DCS):
  medicin ofte indiceret ved > 5 % (40–59 år), > 7,5 % (60–69), > 10 % (70–75), individuelt
  over 75; ESC-kategorien vises til orientering. Bruges ikke ved kendt hjerte-kar-sygdom,
  familiær hyperkolesterolæmi, kronisk nyresygdom eller diabetes med organskade. Effekt: CTT
  (RR 0,78 pr. mmol/l LDL; moderat statin −35 %, høj −50 %; uden målt LDL skønnes LDL som
  totalkolesterol − HDL − 0,7) × BPLTTC (RR 0,90 pr. 5 mmHg) → NNT over 10 år og
  1.000-personers figur. Type 2-diabetes: statin til praktisk talt alle over 40 år (DES/DSAM,
  DCS), LDL-mål efter ESC 2023-kategori. Hypertension (hjemme ≥ 135/85) behandles uanset risiko.
  Plausibilitetsgrænser stopper beregningen ved sandsynlige tastefejl.
- **`af.html`**: CHA₂DS₂-VA (ESC 2024/DCS; ≥ 2 anbefales, 1 overvejes), CHA₂DS₂-VASc til
  sammenligning, HAS-BLED som støtte (ikke grund til at undlade AK), kreatininclearance
  (Cockcroft-Gault), dosis og status for apixaban, rivaroxaban, edoxaban og dabigatran efter
  produktresuméerne, interaktioner og kontrolinterval (EHRA: clearance/10 måneder, 6 måneder fra
  75 år, ellers årligt). VKA ved mekanisk klap/mitralstenose. Lægen kan vælge den aftalte
  behandling, så journalnotatet kun nævner den.
- **`ekg.html`** (EKG — tolkning af måleværdier): lægen indsætter teksten fra EKG-apparatet. Alt
  sker i browseren, så det virker uden internet.
  - **Indlæsning (`udtraek` i `ekg.js`):** faste regler læser GE CardioSoft/MUSE (dansk og
    engelsk), Philips (`Rate/PR/QRSD/QT/QTc/--AXIS--`) og lignende formater.
    - Værdier: frekvens, PR/PQ, QRS, QT, QTc og formel (B/F), RR/PP, P-varighed, P/QRS/T-akser,
      Sokolow-Lyon, Cornell, køn og alder.
    - Sekunder, mm og typografisk minus omregnes.
    - Maskinens tolkning tages fra "Systemevaluering:"/"Tolkning:" frem til apparatlinjerne.
      "Ubekræftet" noteres.
  - **Måleværdier (voksne, AHA/ACCF/HRS 2009):**
    - Frekvens 50–100/min. Over 150 = handling nu. Ved atrieflimren er målet en hvilepuls under
      110.
    - PR 120–200 ms. Kort PR med bred QRS giver mistanke om præeksitation. Over 200 ms = AV-blok
      grad I, og PR ≥ 300 ms omtales som udtalt (ESC 2021).
    - QRS under 110 ms. 110–119 ms = inkomplet grenblok eller uspecifik ledningsforsinkelse.
      ≥ 120 ms = bred.
    - P-varighed ≥ 120 ms = interatrielt blok (Bayés de Luna 2012).
    - P-akse 0 til +75°. QRS-akse −30° til +90°; venstre anterior fascikelblok ved −45° til −90°.
      Ekstrem akse = afvigende.
    - Frontal QRS-T-vinkel: ≥ 100° markeres (Aro 2012).
    - Sokolow-Lyon over 3,5 mV, Cornell over 2,8/2,0 mV og Cornell-produkt over 244 mV·ms (ESH 2023).
    - Atleter (≥ 4 timer intensiv træning om ugen) vurderes efter de internationale kriterier fra
      2017: bradykardi ≥ 30, AV-blok I under 400 ms og isoleret voltage er normalt.
    - Tjek af tallene: frekvens mod RR, og PP mod RR (AV-blok II–III eller AV-dissociation?).
  - **QT:**
    - QTc beregnes med Fridericia (primær), Bazett, Framingham og Hodges. Apparatets værdi vises
      til sammenligning.
    - Grænser: forlænget ≥ 450 ms hos mænd og ≥ 460 ms hos kvinder (AHA 2009). ≥ 480 ms = lang-QT-
      syndrom ved gentagne målinger (ESC 2022). ≥ 500 ms = handling nu (Drew 2010). ≤ 320 ms, eller
      ≤ 360 ms med synkope = kort-QT-syndrom (ESC 2022).
    - Noter: når Bazett krydser grænsen ved puls over 80 eller under 60, når apparatet afviger fra
      beregningen, og ved uregelmæssig rytme og pacing.
    - Ved QRS ≥ 120 ms bruges et skøn efter Bogossian (QT − 50 % af QRS, derefter Fridericia).
      Formlen er udviklet ved venstresidigt grenblok og pacing. Når QTc uden korrektion er ≥ 500 ms,
      vises "kan ikke afvises".
    - QT uden RR eller frekvens giver "kan ikke vurderes". Forlænget QTc med synkope = handling nu.
  - **Maskinens udsagn:** en ordliste med ca. 50 udsagn på dansk og engelsk giver hvert udsagn
    forklaring, niveau og handling.
    - Hastegraden afhænger af klinikken (brystsmerter, synkope, hjertebanken, QT-medicin,
      veltrænet).
    - Fx bliver venstresidigt grenblok med brystsmerter og 2:1-blok "handling nu". Højresidigt
      grenblok + fascikelblok = bifascikulært blok.
    - Atrieflimren linker til Atrieflimren-værktøjet med en advarsel om, at computeren
      overdiagnosticerer i ca. 10 %.
  - **Sammenligning med tidligere EKG:** lægen indsætter et tidligere EKG fra samme patient efter
    det aktuelle. Det læses med samme regler, og ændringerne vises i en tabel med vurdering.
    - Ny bred QRS (≥ 120 ms) og QRS forlænget > 25 % (fx flecainid, ESC).
    - Nyt AV-blok grad I og PR ≥ 300 ms.
    - QTc-stigning > 30 og > 60 ms (ICH E14; Drew 2010). QTc sammenlignes med Fridericia for begge
      EKG, ellers kun med apparatets værdi ved samme formel. Ved ændret QRS nævnes JT.
    - Ny højre, venstre (≤ −45°) eller ekstrem akse, og nyt interatrielt blok.
    - Nye og forsvundne udsagn fra maskinen, fx ny atrieflimren, nyt grenblok, nyt infarktmønster og
      nye ST-T-forandringer.
    - Hastegraden afhænger af klinikken, fx er nyt venstresidigt grenblok med brystsmerter "handling
      nu".
    - Sikkerhed:
      - CPR-numrene i de to udskrifter sammenlignes, uden at de vises. Er de forskellige, vises ingen
        sammenligning.
      - En ny indsættelse øverst rydder det tidligere EKG (ny patient).
      - Datoen læses fra udskriften eller datofeltet, og der advares, hvis det "tidligere" EKG er
        nyere.
    - Journalnotatet får en linje: "Sammenlignet med EKG fra …: …".
  - **Resultat:** sammenfatning (handling nu / afvigende / bemærk / normal), tabel, QTc-tabel,
    forslag til handling, hvad værktøjet ikke kan (selve kurven), og et journalnotat med en linje
    til lægens egen gennemsyn af kurven.
- **`huskeskema.html`**: tolv principper, effekt i tal (CTT, BPLTTC, Hart 2007, Ruff 2014) og
  henvisningskriterier.

**Forbehold:** DCS' NBV og EHRA-guiden kunne ikke tilgås direkte; tærskler og doseringsregler er
kontrolleret via sekundære kilder og produktresuméer.

## Lunger (`lunge/`) — logik og datagrundlag

- **`kol.html`**: diagnose ved FEV1/FVC < 0,70 efter bronkodilatator (procent omregnes), GOLD-grad
  1–4, ABE-gruppe (E ved ≥ 2 moderate eksacerbationer eller ≥ 1 indlæggelse; B ved mMRC ≥ 2 eller
  CAT ≥ 10). Behandling efter GOLD 2025: opstart (A: LAMA eller LABA; B: LAMA + LABA; E: LAMA +
  LABA, triple ved eosinofile ≥ 0,3) og opfølgning efter dominerende problem (eksacerbationer:
  triple ved eosinofile ≥ 0,1, ellers roflumilast/azithromycin; åndenød: LAMA + LABA, skift fra
  ICS + LABA uden ICS-indikation). DSAM's eosinofil-tærskler (≥ 0,3 indiceret, 0,10–0,29 tvivlsom,
  < 0,10 ikke indiceret). Rehabilitering, vaccination, iltvurdering (SAT ≤ 92 %), eksacerbation
  (prednisolon 37,5 mg i 5 dage; amoxicillin 750 mg × 3 i 5 dage ved øget purulens sammen med øget
  åndenød eller ekspektoratmængde, eller CRP > 50). Samtidig astma: altid ICS (ICS + LABA eller
  triple). FEV1/FVC over 1 afvises, medmindre det er angivet i procent (20–100).
- **`astma.html`** (≥ 12 år): GINA 2025 spor 1 — ICS-formoterol efter behov (trin 1–2), MART lav
  (trin 3) og medium (trin 4) med budesonid/formoterol 160/4,5 (Bufomix Easyhaler 1. valg på
  basislisten); trin 5 med LAMA og henvisning. Kontrol efter GINA's 4 spørgsmål og evt. ACT;
  optrapning ved manglende kontrol eller ≥ 2 forværringer (fast ICS-LABA på trin 4 skifter først til
  MART medium), nedtrapning efter ≥ 3 måneders kontrol uden forværringer — ikke under graviditet.
  Overskriften bruger det dårligste af GINA og ACT. Innovair kun som MART (maks. 8 pust/døgn).
  Under 12 år vises ingen anbefaling. ICS-dosistabel og akut forværring (prednisolon 37,5–50 mg i
  5–7 dage).
- **`huskeskema.html`**: tolv principper, effekt i tal (IMPACT, SYGMA 1, Sobieraj 2018, Cochrane
  2016) og henvisningskriterier.

## Hypothyreose (`thyreoidea/`) — logik og datagrundlag

- **`hypothyreose.html`**: tolkning af TSH (laboratoriets øvre grænse, standard 4,0) og T4:
  manifest, subklinisk, mistanke om central hypothyreose, analyseinterferens. Subklinisk: bekræft
  efter 1–3 måneder; behandling ved TSH ≥ 10 under 70 år, forsøgsbehandling ved symptomer og TSH
  < 10, ingen behandling fra 70 år ved TSH < 10; altid ved graviditet (øvre grænse højst 3,5 i
  graviditeten). Startdosis: ca. 1,6 mikrog./kg
  hos yngre raske (alternativt 50 mikrog. og optitrering), 25 mikrog. ved alder ≥ 60 eller iskæmisk
  hjertesygdom, 25–50 mikrog. ved subklinisk. I behandling: TSH-mål (op til 6 over 70 år; < 2,5 ved
  graviditet), justering med 12,5–25 mikrog. (25–50 ved TSH > 10), reduktion ved TSH < 0,3,
  graviditet +20–30 % — kun når dosis ikke allerede er øget og TSH ≥ 0,1; ellers justering mod
  TSH < 2,5 med kontrol hver 4. uge. Pause ved lavt TSH på 12,5 mikrog. Indtagelse, interaktioner
  og henvisning.
- **`huskeskema.html`**: tolv principper, tal til samtalen (TRUST 2017 m.fl.) og henvisning.

## Type 2-diabetes (`diabetes/`) — logik og datagrundlag

- **`behandling.html`**: individuelt HbA1c-mål (DSAM: < 48 / < 53 / < 58 / < 64–69 mmol/mol),
  organbeskyttende indikation (hjerte-kar-sygdom, hjertesvigt, eGFR < 60, UACR ≥ 30, høj risiko)
  uafhængigt af HbA1c, og næste skridt: metformin → SGLT-2-hæmmer (organbeskyttelse fra eGFR 20;
  glykæmisk effekt fra 45) → GLP-1-receptoragonist → basalinsulin; DPP-4-hæmmer ved skrøbelighed/
  hypoglykæmirisiko (hos skrøbelige før GLP-1); sulfonylurinstof nedprioriteret (Medicinrådet
  2026); optitrering/prandial insulin eller henvisning, hvis patienten allerede får insulin.
  Hjertesvigt eller nyresygdom giver SGLT-2-hæmmer, også hos patienter på GLP-1. Rybelsus i ny
  formulering (1,5/4/9 mg fra september 2025). eGFR-dosistabel, advarsel ved manglende eGFR,
  GLP-1-tilskudsklausul (2024) og sygedagsregler.
- **`aarskontrol.html`**: status mod mål for HbA1c, BT (< 130/80; < 140/85 fra 75 år), LDL (< 2,6;
  < 1,8 ved albuminuri, nedsat nyrefunktion og høj risiko; < 1,4 ved hjerte-kar-sygdom som i
  hjerte-kar-appen), eGFR (henvis ved < 30 eller fald > 5 pr. år — initialt fald op til 30 % efter
  opstart af SGLT-2-hæmmer/ACE-hæmmer/ARB er forventet), UACR (A1–A3; RAAS-blokade + SGLT-2-hæmmer
  ved albuminuri; henvisning ved A3), fødder
  (risikogruppe 1–4), øjne, rygning og BMI — med handlingsliste og journalnotat.
- **`huskeskema.html`**: tolv principper, effekt i tal (SGLT-2-metaanalyser, FLOW, DiRECT) og
  henvisning.

**Forbehold (alle tre):** DSAM's, DES' og Medicinrådets primærsider kunne ikke tilgås direkte;
tærskler og doser er kontrolleret via sekundære kilder og produktresuméer.

## Infektioner (`infektion/`) — logik og datagrundlag

Fælles modul `ab.js` (knapper, børnedosis efter vægt, behandlingstabeller med "Vælg til journal").
Børn under 12 år eller under 40 kg doseres efter vægt; enkeltdosis rundes til 5 mg (under 100 mg)
eller 25 mg og overstiger aldrig voksendosis.

**Mikstur til børn** (`MIKSTURER` i `ab.js`): ved penicillin V, clarithromycin, flucloxacillin og
azithromycin vises under børnedosis et konkret forslag: præparat og styrke (den laveste styrke, der
giver højst 5 ml pr. dosis, ellers den stærkeste), dosis i ml (0,1 ml-trin under 5 ml, ellers 0,5 ml;
aldrig over voksendosis), mængde til hele kuren + ca. 10 % spild (værktøjets eget skøn) og den
mindste pakningskombination (fx "1 × 125 ml (Primve) eller 1 × 200 ml (Primcillin)"). Advarsel, når
kuren er længere end holdbarheden efter opblanding, og ved over 15 ml pr. dosis (tabletter er ofte
lettere). Amoxicillin med clavulansyre beregnes ikke (ingen sikker dansk præparat-/dosisdata).
Pakninger og holdbarhed fra indlægssedler/produktresuméer, kontrolleret via sekundære kilder.

- **`luftveje.html`** (DSAM 2024, Region Hovedstaden 2025): faryngo-tonsillitis efter Centor
  (0–1: ingen test; ≥ 2: strep A-test, antibiotika kun ved positiv test), otitis media (almen
  påvirket → penicillin; ellers observation; flåd > 3 dage → øredråber; svigt → amoxicillin med
  clavulansyre; flåd gennem dræn > 3 dage → øredråber), rhinosinuitis (≥ 5 dage eller forværring
  efter bedring og ≥ 3 af 5 tegn inkl. CRP ≥ 50), pneumoni (CRB-65, SAT &lt; 92 %, CRP &lt; 20 / &lt; 50 / ≥ 50) og bronkitis. Penicillin V
  1 mio. IE (660 mg) eller 800 mg × 4 i 5 dage til voksne, 50 mg/kg/døgn fordelt på 3 doser i 5
  dage til børn; ved penicillinallergi roxithromycin til voksne og clarithromycin til børn (gravide:
  konferér). Centor 4 uden test kan behandles ved udtalt påvirkning. Alarmtegn (også petekkier og
  nakkestivhed) giver akut henvisning.
- **`urinveje.html`** (Region Hovedstaden 2025, Medicinrådet, Region Midtjylland 2025,
  Lægehåndbogen): ukompliceret cystitis pivmecillinam 400 mg × 3 i 3 dage (stix ++ → ingen
  dyrkning); kompliceret (mænd, gravide, kateter, recidiv, komplicerende forhold) 5 dage med
  dyrkning; børn pivmecillinam 20 mg/kg/døgn (over 2 år); feber hos gravide og børn → akut;
  pyelonefritis pivmecillinam 400 mg × 3 i 7 dage (Medicinrådet: × 4 i 7–10 dage) eller
  ciprofloxacin; feber-UVI hos mænd ciprofloxacin i 14 dage (prostatitis 2–4 uger; PROSTASHORT);
  gentagne infektioner alene behandles som ukompliceret (3 dage) med dyrkning; under 40 kg uden
  alder behandles som barn; asymptomatisk bakteriuri
  behandles kun hos gravide. Nitrofurantoin kontraindiceret ved eGFR &lt; 45; trimethoprim og
  ciprofloxacin justeres ved nedsat nyrefunktion.
- **`hud.html`** (Region Hovedstaden og Midtjylland 2025, Sundhedsstyrelsen): erysipelas
  (penicillin V), cellulitis/sårinfektion og byld (dicloxacillin; byld drænes), impetigo
  (antiseptisk; udbredt: dicloxacillin/flucloxacillin 50 mg/kg/døgn; kapsler afrundet til 250 mg),
  erythema migrans (penicillin V 1,5 mio. IE × 3 i 10 dage, børn 100 mg/kg/døgn fordelt på 4 doser;
  doxycyclin 100 mg × 2 i 10 dage; azithromycin under 8 år) og bid (Region Hovedstaden: penicillin V
  i 3 dage ved højrisikobid, + dicloxacillin ved menneskebid, 10 dage ved infektion; alternativ
  amoxicillin med clavulansyre). Alarmtegn: nekrotiserende infektion, sepsis, periorbital infektion.
- **`huskeskema.html`**: tolv principper for rationel antibiotikabrug, tal til samtalen og akut
  henvisning.

**Forbehold:** DSAM's, regionernes, Medicinrådets og pro.medicin.dk's sider kunne ikke tilgås
direkte; doser og varigheder er kontrolleret via sekundære kilder. Regionerne afviger i detaljer
(fx pyelonefritis og erysipelas) — værktøjet viser forskellene.

## Nyrer (`nyre/`) — logik og datagrundlag

- **`ckd.html`** (KDIGO 2024, DNS 2024): stadie G1–G5 × A1–A3 med farvekort og kontrolhyppighed
  (KDIGO 2024: fx 3 gange årligt ved G1–G2 A3, 4 ved G4 A3 og G5); KFRE, 4 variable, kalibreret uden for Nordamerika (Tangri, JAMA 2016: koefficienter
  −0,2201 alder/10, 0,2467 mand, −0,5567 eGFR/5, 0,451 ln UACR; baseline 0,9832 (2 år) og 0,9365
  (5 år); kontrolleret mod Python-pakken kfre, se `tests/nyre.test.js`). Henvisning: eGFR &lt; 30,
  fald &gt; 5 pr. år ved eGFR under 60 eller ≥ 25 % med kategoriskift (undtagen forventet fald ≤ 30 % efter opstart af
  ACE-hæmmer/ARB eller SGLT-2-hæmmer), UACR &gt; 700 mg/g (DNS; overvej ≥ 300 efter KDIGO), 5-års KFRE
  ≥ 5 % (overvej 3–5 %), hæmaturi med albuminuri, resistent hypertension, kalium ≥ 6 (akut).
  Behandling: BT &lt; 130/80 (KDIGO: systolisk &lt; 120), ACE-hæmmer/ARB ved albuminuri,
  SGLT-2-hæmmer (anbefales ved T2D, hjertesvigt eller UACR ≥ 200; overvej ved eGFR 20–45; ikke ved
  polycystisk nyresygdom/immunsuppression; start ikke under eGFR 20), finerenon ved T2D med
  albuminuri trods ACE-hæmmer/ARB og SGLT-2-hæmmer (tilskudsklausul; eGFR ≥ 25, kalium ≤ 4,8–5,0), statin fra 50 år ved eGFR &lt; 60.
- **`dosis.html`**: 36 almindelige lægemidler med grænser efter produktresuméerne, hver efter det
  mål, produktresuméet bruger (eGFR eller kreatininclearance efter Cockcroft-Gault, beregnet af
  alder, vægt, kreatinin og køn; eGFR bruges, hvis CrCl mangler). Søgning, "kun handling" og notat.
- **`huskeskema.html`**: tolv principper, effekt i tal (DAPA-CKD, EMPA-KIDNEY, FIDELITY, SHARP) og
  henvisningskriterier.

**Forbehold:** DNS' og regionernes sider kunne ikke tilgås direkte. DSAM har ikke tilsluttet sig
DNS' 2024-vejledning, og regionernes forløbsbeskrivelser har forskellige henvisningsgrænser.

## Udfyld fra journaltekst (`udfyld.js`)

Trin 1 af en tale-til-tekst-overbygning (inspireret af AI-scribes som Noteless): lægen indsætter en
fri journaltekst — fx fra diktat eller en scribe — og felterne udfyldes af faste regler.

- **Hvor:** infektion (luftveje, urinveje, hud og bløddele) og nyre (kronisk nyresygdom, dosis
  efter nyrefunktion). Panelet "Udfyld fra journaltekst" øverst i formularen.
- **Privatliv:** alt sker lokalt i browseren med regulære udtryk. Teksten sendes ingen steder, gemmes
  ikke og er væk, når siden lukkes. Der bruges ingen sprogmodel.
- **Hvad læses:** alder (også måneder/uger hos børn), køn, vægt, temperatur/feber, graviditet,
  penicillinallergi, CRP, saturation, respirationsfrekvens, BT, eGFR (også "fra X til Y" og
  tidligere værdi), kreatinin, kalium, UACR (mg/mmol omregnes til mg/g ×8,84), diagnose/billede,
  kliniske fund (fx Centor, stix, dyrebid) samt sygdomme og lægemidler (ckd og dosis).
- **Nægtelse:** et fund er afkræftet ved ingen/ikke/uden/benægter/negativ/aldrig/intet/seponeret
  højst ca. otte ord før (inden for leddet, og ikke forbi "men", "dog", "fortsat", "stadig", "nu"),
  eller nej/neg/negativ/÷/(-)/benægtes/afkræftet/udelukket/seponeret efter ("Pneumoni udelukket",
  "Strep A ÷", "Feber? Nej."). "Ingen feber, hoste eller ondt i halsen" nægter hele opremsningen;
  uden "eller" regnes de efterfølgende led som uklare og udfyldes ikke.
- **Ignoreres (hverken ja eller nej):** hypotetisk omtale og sikkerhedsråd ("hvis feber", "ved feber
  eller flankesmerter genkontakt", "informeret om at søge læge ved nakkestivhed"), ubesvarede
  spørgsmål ("Gravid?"), ønsker ("forsøger at blive gravid"), vaccination og — for sygdomme i
  nyre-appen og hud (diabetes) — familieanamnese ("mor har diabetes", "disp.").
- **Tid:** feber afgøres af den sidste oplysning i teksten (note ved modstrid). Ved flere målinger
  vinder den, der er markeret "nu/i dag/aktuel"; eGFR "fra 52 til 44"/"52 → 44", årstal og
  "tidligere" bruges til før/nu. Er rækkefølgen uklar, bruges den laveste eGFR (forsigtigst) og den
  sidst nævnte CRP, altid med en bemærkning. En aktuel problemstilling ("nu ondt i halsen") vinder
  over en gammel ("sinuitis for 3 uger siden", "hundebid 2019").
- **Tal og enheder:** datoer før værdien springes over ("eGFR 12.03.26: 44"); vægtændringer og
  fødselsvægt er ikke vægt; U-kreatinin, mg/dl, LDL-K, vitamin K og reumafaktor læses ikke som
  P-kreatinin, kalium eller respirationsfrekvens; ledsagerens køn ("sin mand") bruges ikke.
- **Penicillinallergi:** også "Allergi: penicillin", "CAVE: penicillin", "tåler ikke penicillin",
  "allergisk over for amoxicillin" og "ingen allergier udover penicillin". "Ingen kendte allergier"
  giver kun nej, når intet andet peger på allergi.
- **Dosis-siden:** alle nævnte lægemidler kommer med i filtret "kun nævnte" (også "ingen
  bivirkninger af Eliquis"), og filtret ryddes ved ny udfyldning og Nulstil. Køn, vægt og
  kreatinin meldes som "ikke fundet", hvis de mangler (Cockcroft-Gault).
- **Visning:** udfyldte felter markeres gult, og rapporten viser hvert felt med værdi og
  tekstuddraget, det kom fra, samt bemærkninger (fx enhedsomregning, flere mulige diagnoser, plain
  "diabetes" uden type) og vigtige felter, der ikke blev fundet. En manuel ændring fjerner
  markeringen. Ny udfyldning nulstiller formularen først.
- **Begrænsninger:** reglerne forstår ikke sammenhæng som en sprogmodel — tjek altid de markerede
  felter. Ukendte formuleringer udfyldes ikke (hellere tomt end forkert). Felter uden for teksten
  bevarer standardværdien.

## Notat-indgang (`notat/`)

Én indgang for journalnotater: lægen kopierer notatet fra Noteless (eller en diktering), åbner
Notat-appen og sætter ind — eller trykker "Indsæt fra udklipsholder".

- **Valg af værktøj:** `Udfyld.klassificer` (i `udfyld.js`) giver point til 15 værktøjer:
  - Diagnoser og entydige udtryk giver 3 point, typiske fund 2 og svage tegn 1.
  - Hvert begreb tæller én gang.
  - Lægemidler, der doseres efter nyrefunktion, giver dosis-værktøjet højst 2 point, og højst 1,
    hvis de står i en fast medicinliste.
- **Baggrund tæller næsten ikke:** kendte sygdomme, fast medicin og tidligere forløb giver højst
  1 point og vises som "(baggrund)" i begrundelsen. Det gælder fx "Kendt med hypothyreose",
  "Medicin: Eltroxin", "tidl. otitis som barn" og alt under overskrifter som "Kendt med:",
  "Diagnoser:" og "Fast medicin:". Så overdøver en komorbiditet ikke det aktuelle problem.
- **Tæller ikke:**
  - nægtede fund ("strep A ÷", "ingen svie")
  - råd og sikkerhedsnet ("Genkontakt ved feber, flankesmerter …", "Kontakt lægen ved …",
    "Panodil ved feber") — også resten af opremsningen
  - vaccination og familieanamnese ("mor har KOL")
  - "af" som forholdsord, "bid i tungen", "svie i halsen", peritonsillær absces som hudbyld,
    type 1-diabetes som type 2 og "T4" uden tal
- **Tæller:** ønsker ("ønsker p-piller") og ubesvarede spørgsmål ("SCORE2?", "Kan pt. få
  nitrofurantoin?").
- **Sikkert valg:**
  - mindst 3 point og et tydeligt tegn (en diagnose eller to typiske fund)
  - mindst 1,5 gang så mange point som nummer to og mindst 2 point foran
  - aldrig ved flere nummererede problemer ("1) … 2) …")
- **Når valget er sikkert:** Kan værktøjet udfyldes, åbnes det med det samme og udfyldes. Ellers
  vises kandidaterne med de ord, der pegede på dem, og lægen vælger. "Bedste bud" vises kun ved et
  sikkert valg. Listen over alle værktøjer kan altid foldes ud.
- **Automatisk start:** en søgning starter af sig selv, når der sættes ind i et tomt felt, eller
  når det indsatte er det meste af teksten. Et lille stykke, der sættes ind i en tekst, man selv
  skriver, starter ikke en søgning.
- **Kontrol mod eksempler:** 93 realistiske notater fra auditten (Noteless-stil med overskrifter,
  medicinlister, komorbiditet, telefonkonsultationer og flere problemer). Ingen giver nu et sikkert,
  men forkert valg; før rettelserne var der 9.
- **Udfyldes automatisk:** EKG (en EKG-udskrift med PR, QRS, QT/QTc, akser eller
  "Systemevaluering"), restordre, luftveje, urinveje, hud, kronisk nyresygdom og dosis efter
  nyrefunktion. Atrieflimren, CV-risiko, KOL, astma, hypothyreose, type 2-diabetes (behandling og
  årskontrol), klimakteriet, prævention og osteoporose genkendes og åbnes, men udfyldes ikke endnu.
- **I værktøjet:**
  - Rapporten viser, hvad der er udfyldt og hvorfra.
  - Der er et link tilbage ("Forkert værktøj? Vælg et andet"), hvor teksten og valgene vises igen.
  - "Teksten passer også til …" sender teksten videre til et andet værktøj med udfyldning, fx fra
    urinveje til kronisk nyresygdom.
- **Privatliv:** teksten gives videre i fanens `sessionStorage`.
  - Overdragelsen (`udfyld.overdrag`) gælder kun den side, den er sendt til, og kun i 30 sekunder.
    Den slettes, så snart en side med udfyldning åbnes.
  - Notatet til "tilbage" (`udfyld.notat`) udløber efter 15 minutter og slettes ved Ryd.
  - Åbnes Notat igen, er feltet tomt. Teksten vises kun, når man kommer tilbage via "Forkert
    værktøj?".
  - Sættes en ny tekst ind i en vist, gammel tekst (også efter browserens tilbage-knap), erstatter
    den den gamle, så to patienters tekst aldrig blandes.
  - Kan teksten ikke gives videre (blokeret lager), bliver Notat på siden, kopierer teksten og
    forklarer.
  - Intet sendes over netværket, og der bruges ingen sprogmodel. Kun indstillingen "Gå direkte"
    gemmes i `localStorage`.
- **App:** egen manifest, service worker og ikon. `scope` er `../`, så værktøjerne åbner i samme
  app-vindue. Offline virker Notat-siden; værktøjerne virker offline, når deres egen app har været
  åbnet.
- **claude.ai-versionen:** artifacts er selvstændige sider, så teksten kan ikke gives videre. Notat
  viser valget, kopierer teksten og åbner værktøjet i en ny fane, hvor den indsættes i "Udfyld fra
  journaltekst".

## Restordre — alternativer (`restordre/`)

Når et præparat ikke kan skaffes. Lægen skriver præparatet (handelsnavn eller indholdsstof) — eller
det udfyldes fra en journaltekst eller fra Notat-indgangen, når der står "restordre", "kan ikke
skaffes" o.l. Værktøjet viser tre trin:

1. **Tjek restordre.dk først.** Siden drives af Region Syddanmark på vegne af Danske Regioner. Den
   viser dagligt, ud fra grossisternes og apotekernes lagre, hvad der kan skaffes, og apotekets
   vurderede alternativer.
   - restordre.dk har ingen kendt søgeadresse eller åben datakilde, så værktøjet åbner siden og
     kopierer søgeordet.
   - Der er også links til pro.medicin.dk (præparater med samme indholdsstof), Lægemiddelstyrelsens
     meddelelser om forsyning og regionernes restordre-sider.
2. **Samme indholdsstof:**
   - Et synonympræparat kan udleveres af apoteket uden ny recept (substitution).
   - Anden styrke, form eller pakningsstørrelse kræver som udgangspunkt ny recept.
   - Findes intet markedsført alternativ, kan Lægemiddelstyrelsen give udleveringstilladelse (§ 29,
     stk. 2, eller efter lægens ansøgning).
   - Hertil stof-specifikke tips om styrker og former.
3. **Andet præparat i samme gruppe:** en tabel med vejledende ækvivalente doser (dosisniveauer i
   rækker, præparater i kolonner).
   - Den nuværende dosis kan markeres.
   - Et alternativ kan vælges til journalnotatet (præparat i restordre, restordre.dk tjekket, skift
     til ækvivalent dosis, plan for kontrol).
   - Undtagelser i notatet: DOAK får ingen dosis (hvert præparat har egne dosiskriterier), opioider
     får den beregnede ækvivalente døgndosis med startdosis 50–75 % + p.n., og GLP-1 startes lavt og
     optrappes.
   - Under tabellen: hvordan der skiftes, hvad der kontrolleres, link til det relevante værktøj og
     kilder.

**Søgning i alle almindelige lægemidler.** Søgningen dækker to lag:

- **Detaljerede grupper (31)** med ækvivalente doser (listen nedenfor, nu også gabapentinoider og
  systemiske glukokortikoider).
- **Et register (`register.js`)** med ca. 450 indholdsstoffer og deres almindelige danske
  handelsnavne, grupperet efter WHO's ATC-klassifikation (niveau 4, 180 grupper).
  - For et stof i registeret vises de øvrige stoffer i samme ATC-gruppe som mulige alternativer:
    handelsnavne, pro.medicin.dk-link, valg til journalnotat og link til den detaljerede tabel,
    hvor den findes. Der vises ingen dosisækvivalens.
  - Brede eller specialiststyrede grupper har en bemærkning (`RESTORDRE_ATC_NOTE`), fx:
    antiepileptika og ADHD-midler (specialist), LABA/SABA (ikke erstattelige), trombocythæmmere
    efter AKS, sacubitril/valsartan (ACE-hæmmer tidligst efter 36 timer), tirzepatid (→ GLP-1),
    insuliner (enhed for enhed), hudsteroider (samme danske styrkegruppe I–IV) og lithium.
  - Grupper, hvor stofferne ikke kan erstatte hinanden, viser ingen liste, fx J01CA (amoxicillin
    til luftveje og pivmecillinam kun til urinveje), og henviser til den rette tabel. Andre
    bemærkninger: sotalol (klasse III, ikke propranolol), triple-inhalatorer (behold
    inhalationssteroid), kombinationspræparater (stofferne hver for sig) og Toujeo → Lantus (−20 %).
- Søges der på et kombinationspræparat ("comp", "plus", "+"), men findes kun enkeltstoffet, advarer
  værktøjet om, at det andet indholdsstof fortsat skal gives.
- Et navn, der passer til flere stoffer (fx budesonid til inhalation, tarm og næse, eller Magnyl),
  giver et valg.
- Findes præparatet ikke, siger værktøjet det og beder om indholdsstoffet (det står på pakningen)
  med link til pro.medicin.dk.

Registeret er skrevet ud fra ATC-klassifikationen og kontrolleret for format, dubletter og
gruppenavne. Handelsnavne er kun søgeord og siger intet om aktuelt udbud.

**Lægemiddelgrupper (31).**

| Område | Grupper |
|---|---|
| Hjerte-kar | ACE-hæmmere, ARB, calciumantagonister, betablokkere, thiazider, loop-diuretika, statiner, DOAK |
| Diabetes | GLP-1-receptoragonister (inkl. ny Rybelsus-formulering), SGLT-2-hæmmere, DPP-4-hæmmere, metformin |
| Mave-tarm | PPI |
| Lunger | anfaldsmedicin, inhalationssteroider (GINA), LAMA |
| Psykiatri og neurologi | SSRI, triptaner |
| Smerter | opioider (omregning til oral morfin; start med 50–75 %), gabapentinoider (gabapentin : pregabalin ≈ 6 : 1) |
| Allergi | antihistaminer, adrenalin-autoinjektorer |
| Kvindesundhed | østrogen til MHT, gestagen til endometriebeskyttelse, lokal østrogen, p-piller og minipiller |
| Hormoner og knogler | levothyroxin, glukokortikoider (prednisolon 5 mg ≈ methylprednisolon 4 mg ≈ hydrocortison 20 mg ≈ dexamethason 0,75 mg), osteoporosemidler (inkl. denosumab-biosimilærer) |
| Infektioner | penicillin V, antibiotika mod blærebetændelse |

**Overensstemmelse og kilder.**
- Doserne stemmer overens med de eksisterende værktøjer, der indeholder de samme lægemidler (DOAK,
  østrogen, cystitis, DPP-4).
- Ækvivalenserne er vejledende og kontrolleret via sekundære kilder, bl.a. NICE CG181 og CG184,
  GINA 2024, BMS, EHRA 2021, FSRH, CDC-omregningsfaktorer, medSask og regionernes
  antibiotikavejledninger.
- Restordre.dk, sundhed.dk og Lægemiddelstyrelsen kunne ikke tilgås direkte. Skal verificeres i
  produktresuméet før ordination.

## Installér som app

**Downloadside til kolleger:** `https://normanvisby-arch.github.io/Hormoner/apps.html`
(`apps.html`).
- Siden samler alle ni apps med beskrivelse, "Åbn og installér" (appens startside åbnes i en ny fane med
  `#installer`, og `pwa.js` fremhæver installér-knappen), "Kopiér link" og en QR-kode til mobilen.
- Øverst står et delbart link, en QR-kode til selve siden og knapper til at dele og udskrive. Udskriften
  er et A4-opslag med en QR-kode pr. app.
- QR-koderne ligger i `qr/` og laves med `python3 tools/mkqr.py` (kræver segno). Hver kode afkodes med
  OpenCV og sammenlignes med adressen, før den gemmes.
- Siden er ikke en claude.ai-artifact, for installation kræver GitHub Pages. Linket på startsiderne står
  derfor i den del, der kun vises i appen.

Værktøjerne er en installerbar webapp (PWA) med eget ikon, som også virker uden internet:

- **Adresse:** `https://normanvisby-arch.github.io/Hormoner/oversigt.html` (kræver at GitHub Pages
  er slået til: Settings → Pages → "Deploy from a branch" → `main` / `(root)`).
- **Computer (Windows/Mac):** åbn adressen i Chrome eller Edge, og klik på "Installér som app" på
  startsiden eller installér-ikonet i adresselinjen. Hver app får eget vindue og ikon. Adresser:
  `…/Hormoner/oversigt.html`, `…/Hormoner/hjerte/`, `…/Hormoner/lunge/`, `…/Hormoner/thyreoidea/`,
  `…/Hormoner/diabetes/`, `…/Hormoner/infektion/`, `…/Hormoner/nyre/` og `…/Hormoner/notat/`
  (Notat-indgangen).
- **iPhone:** åbn adressen i Safari → Del-ikonet → "Føj til hjemmeskærm".
- **Android:** åbn adressen i Chrome → ⋮ → "Installer app" / "Føj til startskærm".
- `manifest.webmanifest` beskriver appen (navn, ikon, startside `oversigt.html`); `sw.js` gemmer
  alle filer, så appen virker offline. Netværket prøves først, så opdateringer slår igennem ved
  næste åbning med forbindelse. Hæv `VERSION` i `sw.js`, når filer tilføjes eller fjernes.
- Ikonerne i `icons/` er genereret fra `icons/icon.svg` (maskable-varianten har symbolet inden for
  sikkerhedszonen).

## Tests og publicering

- `tests/run_all.sh` kører alle Playwright-suiter (klimakterie, endometrie, risiko, prævention,
  osteoporose, frakturrisiko, opfølgningsplan, app/offline og en røgtest af alle sider) mod en
  lokal server. `tests/run_all.sh osteo` kører kun suiter med "osteo" i navnet.
- `tools/build_artifact.py` bygger den publicerede claude.ai-version af en side; adresserne står i
  `tools/artifacts.json`. Fremgangsmåden er beskrevet i `CLAUDE.md`.
- En kvartalsvis rutine gennemgår kilderne og foreslår opdateringer som PR (se `CLAUDE.md`).

## Sådan køres appen

Ingen build-trin eller afhængigheder er nødvendige.

- **Lokalt:** åbn `index.html`, `risiko.html`, `praevention.html`, `mrs.html` eller `bloedningskalender.html`
  direkte i en browser, eller kør en simpel lokal server, fx:
  ```
  python3 -m http.server 8000
  ```
  og gå til `http://localhost:8000`. Bemærk: åbnes filen direkte via `file://` (uden lokal
  server), vil "Kopiér resumé til journal" sandsynligvis fejle stille, da browserens
  clipboard-API kræver en sikker kontekst (https eller en lokal server) — kør en lokal server som
  ovenfor, eller markér og kopiér teksten manuelt.
- **Hosting:** hele mappen kan deployes som statisk site til fx GitHub Pages (se ovenfor),
  Netlify eller en intern klinikserver. Service workeren kræver https (eller localhost). Bemærk at
  Blødningskalenderens `localStorage`-data er knyttet til den konkrete URL/domæne den køres på —
  flyttes appen til en anden adresse, følger tidligere registreringer ikke med.

## Hormonbehandling — klinisk logik (kort opsummeret)

Grenene tjekkes i denne rækkefølge; den første der passer, bestemmer anbefalingen.

1. **Absolutte kontraindikationer** (brystkræft/østrogenfølsom cancer, uafklaret
   vaginalblødning, aktiv VTE, aktiv arteriel tromboembolisk sygdom, aktiv leversygdom,
   graviditet) → systemisk MHT frarådes, med en konkret handling pr. kontraindikation (fx
   henvisning ved postmenopausal blødning, u-hCG ved mulig graviditet, undgå paroxetin/fluoxetin
   ved tamoxifen). Ikke-hormonelle alternativer vises ved hedeture — fezolinetant (Veoza, ikke ved
   leversygdom), venlafaxin, escitalopram, gabapentin, clonidin og kognitiv adfærdsterapi.
2. **Patienten ønsker ikke hormonbehandling** → ikke-hormonel behandling, lokal vaginal østrogen
   ved urogenitale gener, og en tydelig advarsel ved POI/tidlig menopause.
3. **Præmatur ovarieinsufficiens (POI)** → MHT til ca. 51 år uanset symptomer, i **høj dosis**
   (Vivelle Dot 75–100 mikrog.) med tilsvarende **øget progesterondosis** (Utrogestan 300 mg
   cyklisk eller 200 mg kontinuerligt, jf. BMS). Diagnosekriterier og udredning efter ESHRE 2024.
4. **Isolerede urogenitale symptomer (GSM)** → lokal vaginal østrogen (Vagifem/Vagirux, Ovestin,
   Estring), uanset uterusstatus. Gælder ikke ved tidlig menopause.
5. **Ingen symptomer** → ingen indikation, undtagen ved POI eller **tidlig menopause (40–44 år)**,
   hvor MHT anbefales til ca. 51 år uanset symptomer.
6. **Systemisk MHT** vælges ud fra to *uafhængige* felter:
   - Uterus (bevaret / endometrieablation / subtotal hysterektomi / total hysterektomi) — østrogen
     alene kun ved total hysterektomi (evt. + gestagen ved tidligere endometriose). Ablation og
     subtotal hysterektomi kan efterlade endometrium og behandles som bevaret uterus (subtotal:
     3 måneders sekventiel gestagen som test, jf. BMS).
   - **Endometriecancer:** kontinuerlig kombineret behandling foretrækkes på sigt (ingen øget
     risiko i dansk kohorte mod ca. fordoblet ved sekventiel); vejledning om skift fra sekventiel
     til kontinuerlig; gestagen mindst 12 dage pr. cyklus; Utrogestans endometriebeskyttelse er kun
     dokumenteret i ca. 5 år; tibolon markeret med øget risiko; ekstra opmærksomhed ved BMI ≥ 30,
     PCOS, diabetes og Lynch syndrom. Ubehandlet endometriehyperplasi er en kontraindikation.
   - Status — sekventiel behandling ved perimenopause, kontinuerlig ved > 12 måneders amenoré.
   - **Dosisniveau**: standard (Vivelle Dot 50 / Divigel 1 mg), lav ved opstart ≥ 60 år eller
     > 10 år efter menopausen (Vivelle Dot 25 / Divigel 0,5 mg), høj ved POI. En sammenklappelig
     tabel viser omtrentlige dosisækvivalenser mellem plaster, gel, spray og tablet (BMS).
   - **Transdermal er førstevalg** (NRL). Risikofaktorer (rygning, BMI ≥ 30, migræne med aura,
     trombofili, tidligere VTE, hypertension, triglycerider, galdeblæresygdom, alder ≥ 60 / sen
     opstart) listes hver med et konkret råd; ved tidligere VTE/trombofili frarådes oral MHT.
   - **Endometriebeskyttelse**: Utrogestan (kun 100 mg kapsler i DK, tages til natten) eller
     Mirena — den eneste hormonspiral godkendt hertil (op til 5 år).
   - Hvis hedeture ikke er markeret, vises en note om svagere evidens og differentialdiagnoser.
   - Prævention: vises kun hvis uterus er bevaret og patienten er perimenopausal, har POI eller
     er postmenopausal under 50 år.
   - Supplerende noter ved nedsat libido, urogenitale gener, brystkræft i familien/BRCA og
     osteoporose.
7. **Før opstart og opfølgning:** diagnose stilles klinisk over 45 år (FSH under 45 år); BT og
   BMI før opstart; kontrol efter ca. 3 måneder og derefter årligt; konkrete regler for, hvornår
   blødning på MHT skal udredes. En sammenklappelig boks giver **absolutte risikotal** til
   samtalen (MHRA 2019), med det aktuelle regime fremhævet.

**Journal:** "Kopiér journalnotat" giver et kort, redigerbart notat (patientdata, vurdering,
førstevalg, plan). "Kopiér fuld anbefaling" kopierer hele teksten, inkl. sammenklappede afsnit.

## Hormonbehandling — kilder og grundlag

- Sundhedsstyrelsen — National Rekommandationsliste (NRL): *Hormonbehandling i klimakterie og
  menopause* (2022)
- Dansk Selskab for Obstetrik og Gynækologi (DSOG) — revideret guideline for menopausal
  hormonterapi (februar 2026)
- [pro.medicin.dk](https://pro.medicin.dk) — opslag før enhver ordination (aktuelle
  præparatnavne, styrker, pakninger, tilskud og interaktioner)
- Supplerende internationalt evidensgrundlag: NICE NG23 (opdateret 2024), IMS/EMAS og The
  Endocrine Society's kliniske retningslinjer for menopausal hormonbehandling
- British Menopause Society (BMS) Tools for Clinicians — dosisækvivalenser og progestogendoser
  til endometriebeskyttelse
- MHRA (2019) — absolutte tal for brystkræftrisiko ved MHT
- ESHRE (2024) — guideline for præmatur ovarieinsufficiens
- EMA (2024) — sikkerhedsmeddelelse om levermonitorering ved fezolinetant (Veoza)

Tidligere versioner af dette værktøj citerede en selvstændig DSAM-vejledning ved navn
"Overgangsalderen" som primær kilde. Det kunne ikke bekræftes at en sådan selvstændig,
navngiven DSAM-vejledning om hormonbehandling findes — kildelisten er derfor rettet til NRL og
DSOG's guideline, som synes at være de aktuelle primære danske referencer på området. DSAM har
bredere vejledninger, der berører kvinder i og efter overgangsalderen, men ingen der er
identificeret som en selvstændig, dedikeret vejledning om hormonbehandling ved klimakteriet.

## Risikovurdering ved MHT — logik og datagrundlag

Værktøjet viser **befolkningstal** pr. 1.000 kvinder for det valgte scenarie (alder, uterus/regime,
transdermal/oral, 5 eller 10 år) og markerer patientens egne risikofaktorer som "højere/lavere
end tallene" — det **omregner ikke** tallene, da der ikke findes en valideret samlet model.

| Udfald | Tal i værktøjet | Kilde |
|---|---|---|
| Brystkræft | baggrund 63/1.000 (50–69 år); +5 / +14 / +20 ved 5 års østrogen alene / sekventiel / kontinuerlig; ca. dobbelt ved 10 år | MHRA 2019 (CGHFBC) |
| VTE (5 år) | baggrund ca. 4–7/1.000; oral kombineret +5–10, oral østrogen alene +1–4, transdermal ingen påvist øgning; dansk NNH ca. 1.050 pr. behandlingsår ved oral behandling | WHI, NICE, dansk registerstudie BMJ 2026 |
| Iskæmisk apopleksi (5 år) | baggrund ca. 8 (50'erne) / 14 (60'erne); oral +3/+4; transdermal ≤ 50 mikrog. ingen påvist øgning; i dansk data kun øget ved oral estradiol > 1 mg/døgn i > 1 år | WHI / EU-produktresuméer, BMJ 2026 |
| Iskæmisk hjertesygdom | ingen øgning ved opstart < 60 år / < 10 år efter menopausen; lille øgning ved sen opstart | WHI, NICE |
| Endometriecancer | baggrund ca. 5/1.000 (50–65 år); kontinuerlig RR 1,0 (MWS 0,71); sekventiel RR 1,05 (MWS) til ca. 2 (dansk) → højst ca. +5/1.000 ved langvarig brug | EU-produktresuméer, Mørch 2016, Million Women Study 2005 |
| Æggestokkræft | ca. +0,5–1/1.000 ved 5 års brug fra ca. 50 år | EU-produktresuméer, Lancet 2015 |
| Demens (kun ≥ 65 år) | kombineret: ca. +2/1.000 pr. år (45 vs. 22 pr. 10.000 kvindeår); østrogen alene: ikke-signifikant | WHIMS (Shumaker 2003) |
| Familiær disposition (brystkræft) | én førstegradsslægtning: baggrund × 1,8 og samme relative MHT-øgning → ekstra tilfælde × 1,8 | CGHFBC 2001, Huntley BJGP 2024 |
| Samlet dødelighed | ikke øget | WHI 18 år (Manson 2017), dansk registerstudie BMJ 2026 |

**Number needed to harm (NNH)** vises tydeligt tre steder: en samlet NNH-tabel øverst, et
fremhævet NNH-tal i hvert kort og i journalnotatet. NNH = 1.000 ÷ ekstra tilfælde pr. 1.000 i den
angivne periode, afrundet (til nærmeste 5 under 100, nærmeste 10 under 1.000). Intervaller i
kilderne giver NNH-intervaller (fx VTE ved oral kombineret behandling: 100–200). Hvor der ikke er
påvist øget risiko (fx transdermal behandling og VTE), vises "–" med forklaring. Eksempler:
brystkræft ved 5 års kontinuerlig kombineret behandling NNH ≈ 50, ved 10 år ≈ 25; østrogen alene
5 år ≈ 200; oral apopleksi ≈ 330 (50'erne); sekventiel behandling og endometriecancer ≥ 200 (værste
fald); æggestokkræft 1.000–2.000; demens ved kombineret opstart efter 65 år ≈ 85 over 5 år.
Ved BRCA/stærk familiær disposition vises ingen NNH for brystkræft, da befolkningstallene ikke gælder.

Niveauer pr. udfald (lav / moderat / høj / gevinst) vises som tekst, ikke kun farve. "Høj" udløses
bl.a. af tidligere VTE, BRCA/flere slægtninge med brystkræft, kendt hjerte-kar-sygdom og oral
behandling kombineret med risikofaktorer for VTE eller apopleksi. Niveauet afspejler også, om
risikoen bør ændre behandlingen — ikke kun størrelsen af NNH. En personlig liste viser, hvordan
risikoen kan mindskes (transdermal, kontinuerlig kombineret, mikroniseret progesteron, vægt,
alkohol, rygning).

**Forbehold:** primærdokumenterne (MHRA, NICE, EMA) kunne ikke tilgås direkte i
udviklingssessionen — tallene er kontrolleret via sekundære kilder og afrundet, og ved usikkerhed
angivet som intervaller. WHI brugte konjugeret østrogen og syntetisk gestagen, så risikoen ved
moderne transdermal behandling er formentlig lavere for VTE og apopleksi.

## Prævention — klinisk logik (kort opsummeret)

1. **Akut nødprævention** er en separat gren. Anbefalingen afhænger af tid siden ubeskyttet
   samleje (under 24 t / 24–72 t / 72–120 t / over 120 t), BMI, amning og enzyminducerende
   medicin: kobberspiral er mest effektiv; ellaOne foretrækkes frem for levonorgestrel ved
   BMI > 26; levonorgestrel gives i dobbeltdosis (3 mg) ved BMI > 26 eller enzyminducerende
   medicin (FSRH, off-label); ellaOne frarådes ved enzyminducerende medicin. Forbehold om
   ventetid før hormonel prævention efter ellaOne, amning og graviditetstest efter 3 uger.
2. **Graviditet** → u-hCG; prævention ikke relevant nu.
3. **Alder:** under 15 år vises en note om samtykke (sundhedsloven § 17); fra 40 år en note om,
   hvor længe prævention er nødvendig (til 55 år), og skift fra kombineret prævention ved 50 år.
4. **Kontraindikationer mod al hormonel prævention** (brystkræft, uafklaret blødning) →
   kobberspiral eller barrieremetode.
5. **Kombineret (østrogenholdig) prævention** frarådes ved: rygning ≥ 35 år, alder ≥ 50,
   migræne med aura, VTE/trombofili (inkl. antifosfolipid-antistoffer), VTE hos forælder/søskende
   før 45 år, planlagt større operation med immobilisering, hypertension (også velreguleret) eller
   BT ≥ 140/90, iskæmisk hjertesygdom/apopleksi, kompliceret diabetes, leversygdom, < 6 uger
   postpartum, amning, BMI ≥ 35, enzyminducerende medicin og lamotrigin.
   Ellers anbefales **Mirabella** (levonorgestrel 100 + ethinylestradiol 20 mikrog.) som
   førstevalg (NRL 2022), med 30 mikrog.-piller, Cilest og NuvaRing/Evra som alternativer — de to
   sidstnævnte med deres højere VTE-risiko angivet. Forlænget/kontinuerligt regime nævnes.
6. **Østrogenfri prævention** (når kombineret frarådes): Cerazette (desogestrel), Slinda
   (drospirenon), Depo-Provera og langtidsvirkende metoder. Ved enzyminducerende medicin fjernes
   minipiller, og implantatet markeres "frarådes"; Depo-Provera og spiraler anbefales.
7. **Præference** (LARC, pille, hormonfri, sterilisation) styrer hvad der vises først. Under 20
   år uden præference fremhæves LARC.
8. **Supplerende noter:** kraftige/smertefulde menstruationer (Mirena foretrækkes, kobberspiral
   kan forværre; link til Blødningskalenderen), amning, spiral-specifikke kontraindikationer,
   migræne uden aura, kondom og klamydiatest.
9. **Sammenklappelige opslag:** opstart ("quick start") med dage med ekstra beskyttelse pr.
   metode, glemte piller (FSRH), og effektivitet/risiko til samtalen (typisk-brug-effektivitet,
   VTE-tal pr. gestagentype fra EMA 2013, brystkræftrisiko fra dansk kohorte).
10. **Journal:** "Kopiér journalnotat" (kort, redigerbart) og "Kopiér fuld anbefaling".

## Prævention — kilder og grundlag

- Sundhedsstyrelsen — National Rekommandationsliste (NRL): *Hormonal kontraception* (2022)
- Lægemiddelstyrelsen — tjekliste for læger der ordinerer kombinerede hormonelle kontraceptiva
- DSAM — vejledning om blødningsforstyrrelser hos kvinder i almen praksis (afsnit om
  blødningsmønstre under kontraception og hormonbehandling — dette er en bekræftet, eksisterende
  DSAM-vejledning, i modsætning til den tidligere fejlciterede DSAM-kilde i
  hormonbehandlings-værktøjet)
- EMA (2013) — VTE-risiko for kombinerede hormonelle kontraceptiva efter gestagentype
- FSRH (UK) — UKMEC, nødprævention (vægt, enzyminduktion, amning), glemte piller, "quick start"
  og lægemiddelinteraktioner (fx lamotrigin)
- Sundhedsloven § 17 — samtykke fra 15 år
- [pro.medicin.dk](https://pro.medicin.dk) — opslag før enhver ordination

**Kendte usikkerheder i denne version**, markeret her i stedet for fremstillet som fastslåede
fakta:
- BMI-tærsklen på 35 for at udelukke kombineret hormonel prævention er en operationalisering af
  kildernes formulering "svær overvægt" — den præcise tærskel bør bekræftes i NRL-dokumentet.
- Tilskuds-/gratis-ordninger for langtidsvirkende prævention til unge er bevidst beskrevet uden
  konkrete aldersgrænser, da dette ikke kunne bekræftes present og varierer mellem regioner.
- Kilderne blev tilgået via websøgning i en sandboxed session uden direkte adgang til
  sst.dk/dsam.dk's primærdokumenter (netværksrestriktion) — verificér mod PDF'erne direkte.
- Aldersgrænsen på 20 år, hvorunder LARC fremhæves som førstevalg ved "ingen særlig præference",
  er et eget skøn (baseret på almindelig klinisk praksis og lavere fejlrate end pille) og ikke
  hentet fra en specifik dansk kilde med den præcise grænse — bør verificeres/justeres efter
  lokal praksis.

## MRS — klinisk logik og grundlag

`mrs.html` implementerer Menopause Rating Scale (MRS), udviklet af Schneider/Heinemann et al.
(Berlin, tidligt 1990'erne) og administreret af rettighedshaveren ZEG Berlin GmbH. Skalaen består
af 11 spørgsmål i tre delskalaer:

- **Somato-vegetativ** (4 spørgsmål: hedeture, hjertegener, søvnproblemer, led-/muskelgener) — 0–16
- **Psykologisk** (4 spørgsmål: nedtrykthed, irritabilitet, angst, udmattelse) — 0–16
- **Urogenital** (3 spørgsmål: seksuelle problemer, vandladningsgener, vaginal tørhed) — 0–12

Hvert spørgsmål besvares 0 (ingen) til 4 (meget svære), og totalscoren (0–44) fortolkes efter en
almindeligt citeret forenklet inddeling: 0–4 ingen/få, 5–8 lette, 9–15 moderate, 16+ svære gener.
Alle 11 spørgsmål skal besvares, før værktøjet viser en score — et ubesvaret spørgsmål tælles
bevidst ikke som 0, for ikke at give en kunstigt lav score.

**Vigtigt forbehold om oversættelsen:** item-teksterne er min egen, omhyggelige oversættelse af
det internationalt standardiserede engelske MRS-indhold — krydstjekket mod flere uafhængige
kilder for indhold, struktur og scoring, men **ikke** en verificeret gengivelse af ZEG Berlins
officielle danske oversættelse. Den officielle danske PDF
([MRS_Danish.pdf](https://zeg-berlin.de/wp-content/uploads/2024/03/MRS_Danish.pdf)) kunne ikke
tilgås direkte i denne udviklingssession (netværksrestriktion, samme type begrænsning som ramte
kildeverifikation for de øvrige værktøjer). Brug den officielle PDF til formel eller dokumenteret
brug, fx forskning eller hvor ordret overensstemmelse med den validerede oversættelse er
nødvendig. Til hurtig klinisk symptomvurdering i konsultationen vurderes indholdsmæssig
overensstemmelse tilstrækkelig, men dette er ikke det samme som en valideret oversættelse.

Totalscore-fortolkningen (0–4/5–8/9–15/16+) er ligeledes en forenkling — det oprindelige
valideringsarbejde bruger aldersjusterede normtabeller pr. delskala, som ikke er gengivet her.

## Blødningskalender — funktion og datahåndtering

`bloedningskalender.html` er bygget efter ønske fra en underviser (speciallæge i gynækologi):
mange periode-/cyklus-apps viser kun én måned ad gangen og er svære at overskue. Et helt
kalenderår i ét skærmbillede — som en klassisk papirvægkalender — gør uregelmæssige mønstre
(kort/langt mellemrum mellem blødninger, forlænget blødning, spotting mellem menstruationer)
synlige med det samme.

**Funktion:**
- Klik på en dag for at registrere blødningsstyrke (ingen/pletblødning/let/moderat/kraftig),
  smerter, og en kort note. Fem-trins-styrken vises som farveintensitet direkte i kalenderen.
- Årsnavigation (‹ / ›) og en "I dag"-genvej.
- "Ryd denne dag" fjerner én registrering; "Ryd alle data" kræver to bevidste klik inden for få
  sekunder (siden Artifact-visningen ikke kan vise browserens native bekræftelsesdialoger).
- "Eksportér" gemmer alle registreringer som en tekstfil — brug den jævnligt som sikkerhedskopi,
  og især før en konsultation.
- "Udskriv" giver en printvenlig version af årsoverblikket med tidsstempel.

**Datahåndtering — en bevidst beslutning:** i modsætning til de tre andre værktøjer (som er
enkeltstående vurderinger uden behov for hukommelse mellem besøg) skal blødningskalenderen bruges
over uger og måneder. Data gemmes derfor lokalt i browserens `localStorage` mellem besøg — men
**udelukkende** lokalt. Der findes bevidst ingen konto, ingen server, og ingen central database:
menstruations-/blødningsdata er følsomme helbredsoplysninger, og dette projekt har ingen
databehandleraftale eller anden infrastruktur der gør det forsvarligt at sende den slags data til
en server. Konsekvenser af det valg:
- Data følger browseren/enheden, ikke personen — samme kalender kan ikke ses fra en anden enhed.
- Data kan gå tabt hvis browserdata ryddes, i privat/inkognito-vinduer, eller hvis appen flyttes
  til en anden URL. Brug "Eksportér" som løbende sikkerhedskopi.
- Ingen af de øvrige tre værktøjer i dette repo gemmer noget som helst — det er specifikt for
  blødningskalenderen, fordi den er den eneste, der reelt skal huske noget over tid.

## Vigtige forbehold

- Dette er **uafhængige hjælpeværktøjer**, ikke officielle publikationer fra Sundhedsstyrelsen,
  DSOG, Lægemiddelstyrelsen, DSAM, ZEG Berlin, FIGO eller andre af de nævnte kilder.
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

**1. oktober 2026 — Infektioner: mikstur, ml og pakning til børn:**
- Børnedosis af penicillin V (Primcillin/Primve), clarithromycin (Klacid), flucloxacillin
  (Nerbutix) og azithromycin (Zitromax) viser nu mikstur, dosis i ml og den pakning, der skal købes
  for at gennemføre kuren (+ ca. 10 % spild). Advarsel ved holdbarhed kortere end kuren og ved stort
  volumen. Kommer med i journalnotatet.
- Kilder: indlægssedler/produktresuméer for præparaterne og Region Hovedstaden "Penicillin til børn
  – praktiske håndgreb" (kontrolleret via sekundære kilder).

**1. oktober 2026 — EKG: sammenligning med tidligere EKG:**
- Indsæt et tidligere EKG under det aktuelle. Ændringer i måleværdier og maskinens udsagn vises med
  vurdering og kommer med i journalnotatet.
- Kilder: ICH E14 (QTc-stigning > 30/60 ms), Drew 2010 og ESC/produktresumé for flecainid
  (QRS > 25 %).
- Uafhængig audit, rettet før merge:
  - "Ingen væsentlige ændringer" er erstattet af "ingen ændringer over værktøjets grænser i de
    sammenlignede værdier". Nye udsagn, som værktøjet ikke kender, vises.
  - Kontrollen af samme patient virker også med CPR-nummer uden bindestreg, med mellemrum og med
    erstatningsnumre. Status vises altid ("samme CPR ✓" eller "kunne ikke kontrolleres").
  - Der kræves en minimumsændring (QRS og PR ≥ 20 ms, akse ≥ 30°), så måleusikkerhed omkring en
    grænse ikke giver alarm. PR ≥ 300 ms prioriteres.
  - Pacing i det ene EKG udelukker sammenligning af PR, QRS, akse og QTc.
  - Ved ændret QRS vurderes JTc i stedet for QTc.
  - Nye alvorlige udsagn (AV-blok II/III, akut infarkt, VT m.fl.) får mindst deres eget niveau. Nye
    ST-T-forandringer eller nyt højresidigt grenblok med brystsmerter = handling nu (ESC 2023).
  - Datoer: fødselsdatoer springes over, ISO-format læses, datoer i fremtiden bruges ikke.
  - Nye fund: ny bradykardi, ny kort PR og QTc-fald efter forlænget QTc.
  - Notat om paroksystisk atrieflimren og antikoagulation (ESC 2024).
  - Det tidligere EKG ryddes også med "Ryd", og der vises besked, når en ny indsættelse rydder det.
  - "Akut anteriort infarkt" genkendes nu (fejl i det eksisterende værktøj).
- **Persondata:**
  - CPR-numre maskeres som "[CPR]" i kildeuddragene i `udfyld.js` (gælder alle værktøjer).
  - Linjer med CPR-nummer, navn eller patient-ID kommer aldrig med i maskinens tolkning eller i
    journalnotatet.
- Tests H1–H19 og Y1–Y22 i `ekg.test.js`.
- Service worker v11 (hjerte), v7 (infektion, nyre), v5 (notat) og v4 (restordre).

**1. oktober 2026 — Downloadside med QR-kode:**
- Ny side `apps.html` ("Hent klinikværktøjerne") med alle ni apps:
  - "Åbn og installér", "Kopiér link" og QR-kode til mobilen for hver app.
  - Et delbart link med QR-kode, knapper til at dele og udskrive, og et A4-opslag til udskrift.
  - Vejledning til installation på computer (Chrome/Edge og Safari), iPhone/iPad og Android.
- `tools/mkqr.py` laver QR-koderne i `qr/` og kontrollerer dem ved afkodning.
- `pwa.js`: `#installer` fremhæver installér-knappen på appens startside.
- Restordre har fået en installér-knap.
- Startsiderne linker til downloadsiden (kun i appen).
- Hjerte-manifestet nævner nu også EKG.
- Ny testsuite `apps`.
- Service worker: v13 (rod, med `apps.html` og QR-koderne), v10 (hjerte), v7 (lunge, thyreoidea,
  diabetes), v6 (infektion, nyre), v4 (notat) og v3 (restordre), fordi `pwa.js` er ændret.

**1. oktober 2026 — EKG — tolkning af måleværdier:**
- Ny side `hjerte/ekg.html` i hjerte-appen: indsæt teksten fra EKG-apparatet, så vurderes
  måleværdierne mod referenceværdier for voksne. QTc beregnes med fire formler (og Bogossian ved
  bred QRS), maskinens udsagn forklares med hastegrad og forslag til handling, og der laves et
  journalnotat. Virker offline og tolker ikke selve kurven.
- Uafhængig audit, rettet før merge:
  - Røde flag:
    - Akut infarkt genkendes også som "infarkt, muligvis akut"/"injury".
    - Bred-kompleks-takykardi (frekvens > 100 og QRS ≥ 120 ms) = handling nu.
    - AV-blok II–III genkendes også på engelsk ("2nd/3rd degree").
    - Forlænget QTc med synkope = handling nu.
  - Fejlfund:
    - Supraventrikulær takykardi og supraventrikulære ekstrasystoler læses ikke længere som VT, VES
      eller asystoli.
    - Flagren med 2:1 er ikke AV-blok, og "grad II type 1" = Wenckebach.
    - "Abnormal ECG" er ikke "normalt".
    - "Minimal voltage" giver kun "Bemærk".
    - ST-elevation-differentialet giver ét fund.
  - Nægtelser ("ingen atrieflimren", "VT ikke påvist", "has replaced …") og historiske udsagn
    ("tidligere STEMI") tæller ikke.
  - Sammenligning med tidligere EKG udelades.
  - Udsagn, som værktøjet ikke kender, vises som "Ikke genkendt — læs selv", og sammenfatningen
    bliver så aldrig grøn.
  - QT:
    - Et usikkert Bogossian-skøn kan ikke berolige ved QTc ≥ 500 ms.
    - QT uden RR/frekvens giver "kan ikke vurderes".
  - Atletkriterierne gælder kun 12–35 år.
  - Voltage vurderes ikke ved grenblok.
  - Cornell-produktet får + 0,6 mV hos kvinder.
  - Journalnotatets plan starter med det vigtigste.
  - Udtræk:
    - QT/QTc i flere formater (aldrig QT som QTc).
    - Ventrikelfrekvens før atriefrekvens og puls.
    - Alder fra "67-årig" (ikke "i 30 år").
    - Kommaseparerede akser, Mortara-akser, SV1+RV5 og RaVL+SV3.
  - Klassifikatoren: "QTc" vejer nu 2 point.
- `udfyld.js`:
  - Indsæt-panelet kan få egen titel og hjælpetekst og stå åbent.
  - Notat-indgangen genkender EKG-udskrifter. Ordet "EKG" alene vejer kun 1 point, så
    atrieflimren-notater stadig går til Atrieflimren.
- `style.css`: grøn status-etiket og felter til EKG-siden.
- Tests: ny suite `ekg`, og `notat`, `pwa-hjerte` og `smoke` er udvidet.
- Service worker: v9 (hjerte), v12 (rod), v6 (lunge, thyreoidea, diabetes), v5 (infektion, nyre),
  v3 (notat) og v2 (restordre), fordi `style.css` og `udfyld.js` er ændret.

**30. september 2026 — Restordre — alternativer:**
- Ny app `restordre/`:
  - 1) restordre.dk og de officielle kilder, 2) samme indholdsstof, 3) alternativer med vejledende
    ækvivalente doser i 31 lægemiddelgrupper.
  - Søgning i et register med ca. 450 indholdsstoffer og handelsnavne (ATC-grupper) med
    bemærkninger for brede og specialiststyrede grupper — til brug, når en patient ringer.
  - Journalnotat og udfyldning fra journaltekst.
  - Uafhængig audit, rettet før merge:
    - DOAK-niveauer er ikke indbyrdes ækvivalente, og notatet har ingen dosis.
    - Warfarin-skift følger EHRA.
    - Tramadol er begrænset til 300 mg ved ≥ 75 år.
    - Oral semaglutid har ny formulering (1,5/4/9 mg).
    - Opioidnotat med startdosis 50–75 %.
    - Amoxicillin og pivmecillinam er ikke alternativer for hinanden.
    - Kodein ligger under hostemidler.
    - Nye bemærkninger om sotalol, triple-inhalatorer, kombinationspræparater, Entresto
      (valsartan-doser) og Toujeo.
    - Usikre handelsnavne er fjernet.
    - Advarsel ved kombinationspræparat.
    - Fri tekst læser ikke "Husk" o.l. som præparat.
  - Link fra oversigten, alle startsider og Notat-indgangen.
- Notat-indgangen sender notater med "restordre", "kan ikke skaffes" o.l. til Restordre-værktøjet med
  præparatnavnet udfyldt. `udfyld.js` har fået felttypen `tekst`.
- Ny testsuite `restordre`. Service worker v1 (restordre), v11 (rod), v8 (hjerte), v5 (lunge,
  thyreoidea, diabetes), v4 (infektion, nyre) og v2 (notat) pga. ændret `udfyld.js`, `style.css` og
  startsider.

**30. september 2026 — Notat-indgang: én indgang for journalnotater:**
- Ny app `notat/`:
  - Indsæt et notat fra Noteless. Er det rette værktøj klart, åbnes det og udfyldes; ved tvivl
    vises kandidaterne med begrundelse, og lægen vælger.
  - Link tilbage fra værktøjet og "Teksten passer også til …".
  - Link fra oversigten og alle startsider.
- `udfyld.js`:
  - Klassifikator (`Udfyld.klassificer`) og overdragelse mellem sider via fanens `sessionStorage`
    (engangs, kun til den valgte side, 30 sekunder; notatet til "tilbage" 15 minutter).
  - Råd som "Genkontakt ved feber, flankesmerter …" og "Kontakt lægen ved …" tæller ikke som fund,
    heller ikke ved udfyldning. Tidligere kunne en cystitis med sikkerhedsnet i planen blive
    udfyldt som øvre UVI.
- Uafhængig audit (93 notater og brugerfladen):
  - Rettet: sammenblanding af to patienters tekst, råd læst som fund, fast medicin og komorbiditet
    der overdøvede det aktuelle problem, dosisspørgsmål, type 1-diabetes, diabetisk fodsår,
    ordforvekslinger, gamle overdragelser, blokeret lager, "Bedste bud" ved tvivl og automatisk
    start ved et lille indsat stykke.
  - Sikre, men forkerte valg: fra 9 til 0.
  - "-" efter et ord nægter det kun, når det står alene ("feber -"), ikke i sammensatte ord
    ("KOL-kontrol"). Tidligere kunne fx "Strep A-test" og "KOL-kontrol" læses som nægtet.
- Ny testsuite `notat`. Service worker v1 (notat), v10 (rod), v7 (hjerte), v4 (lunge, thyreoidea,
  diabetes) og v3 (infektion, nyre) pga. ændret `udfyld.js`, `style.css` og startsider.

**29. september 2026 — "Udfyld fra journaltekst" (trin 1 af tale-til-tekst):**
- Fælles `udfyld.js`: indsæt en journaltekst, og felterne udfyldes lokalt med faste regler, med
  negationsdetektion, markering af udfyldte felter og kildeuddrag. Tilføjet til infektion
  (luftveje, urinveje, hud) og nyre (ckd, dosis). På dosis-siden kan listen begrænses til de
  lægemidler, der nævnes i teksten.
- Uafhængig audit af udtrækket (84 motor- og 30 sidetilfælde): rettet "÷" og "Feber? Nej",
  hypotetiske formuleringer og sikkerhedsråd, penicillinallergi i almindelige skriveformer,
  vægtændringer/fødselsvægt, datoer før værdier, flere eGFR/CRP-målinger, seponeret medicin,
  familieanamnese, PCOS/gastric bypass/amitriptylin som falske sygdomme, LDL-K som kalium,
  ledsagerens køn, rester af lægemiddelfiltret efter Nulstil og langsom behandling af lange tekster
  uden tegnsætning (nu under 0,3 s for 110.000 tegn).
- Ny testsuite `udfyld` (125 kontroller). Service worker v2 (infektion og nyre) pga. ny fil og ændret `style.css`.

**29. september 2026 — to nye selvstændige apps: infektioner og nyrer:**
- `infektion/` (luftveje, urinveje, hud og bløddele, huskeskema; fælles `ab.js`) og `nyre/`
  (kronisk nyresygdom med KDIGO-farvekort og KFRE, dosis efter nyrefunktion, huskeskema), hver med
  startside, manifest, ikon, offline-cache og installér-knap. Testsuiter `infektion` og `nyre`;
  `pwa-apps` og røgtesten dækker de nye apps.
- "Andre apps"-noten på alle syv startsider er opdateret; `style.css` har temaerne
  `theme-infektion` og `theme-nyre`, KDIGO-farvekort og `tag-danger`.
- Diabetes-årskontrollen: UACR over 700 mg/g → henvis (DNS); 300–700 → overvej (KDIGO), med link
  til nyre-appen — så de to apps er enige.
- Service worker v8 (rod), v5 (hjerte) og v2 (lunge, thyreoidea, diabetes) pga. ændret
  `style.css` og startsider.
- Rettelser efter uafhængig ekstern audit:
  - Urinveje: barn bestemmes også af vægt, når alder mangler (før fik et barn på 15 kg
    voksendosis); feber-UVI hos mænd 14 dage (PROSTASHORT, Region Hovedstaden); gentagne
    infektioner alene er ikke kompliceret; børn fra 40 kg får voksendosis.
  - Luftveje: rhinosinuitis kan behandles fra 5 dage (DSAM 2024: 5–10 dage); roxithromycin som
    makrolid til voksne (Region Hovedstaden); gravide med penicillinallergi får ingen anbefalet
    makrolid (abortrisiko ved clarithromycin); Centor 4 kan behandles uden test ved udtalt påvirkning;
    journalen skriver "CRP måles", når CRP mangler; øredråber kun ved flåd gennem trommehindedræn;
    alarmtegn for meningitis.
  - Hud: erythema migrans med doxycyclin 100 mg × 2 i 10 dage, azithromycin til børn under 8 år og
    penicillin fordelt på 4 doser til børn (Region Hovedstaden); bidsår efter Region Hovedstaden
    (10 dage ved infektion, moxifloxacin ved allergi); dicloxacillin til børn afrundet til kapsler.
  - Nyrer: henvisning ved fald &gt; 5 kun ved nedsat eGFR (også i diabetes-årskontrollen); KDIGO
    2024-kontroltabellen; finerenon først efter SGLT-2-hæmmer (tilskudsklausul); DOAK-rækken gælder
    atrieflimren (edoxaban ≤ 50); metformin maks. 2.000 mg ved eGFR 45–59; tramadol frarådes under
    CrCl 10; ens trimethoprim-grænse; NSAID ved normal nyrefunktion tæller ikke som "kræver handling".

**29. september 2026 — tre nye selvstændige apps: lunger, hypothyreose og type 2-diabetes:**
- `lunge/` (KOL, astma, huskeskema), `thyreoidea/` (hypothyreose, huskeskema) og `diabetes/`
  (glukosesænkende behandling, årskontrol, huskeskema), hver med egen startside, manifest, ikon og
  offline-cache; "Vælg til journal" i behandlingstabellerne; testsuiter `kol`, `astma`,
  `hypothyreose`, `diabetes` og `pwa-apps`.
- Installér-knap på alle startsider (Chrome/Edge på computer og Android) og fælles "Andre apps"-
  links mellem de fem apps. `tools/mkicons.js` laver app-ikoner ud fra `icons/icon.svg`.
- Service worker v7 (rod) og v4 (hjerte) pga. ændret `pwa.js`, `style.css` og startsider.
- Rettelser efter uafhængig ekstern audit:
  - KOL: samtidig astma giver altid ICS; FEV1/FVC valideres (procent 20–100 omregnes, ellers
    afvist); rygning og mMRC har ingen forudfyldt værdi; antibiotika efter purulens/CRP.
  - Astma: ingen nedtrapning under graviditet; Innovair kun ved MART (maks. 8 pust/døgn);
    fast høj dosis ICS-LABA → MART medium før trin 5; journalen nævner LAMA og henvisning på
    trin 5 og prednisolonkur ved akut start; ACT indgår i overskriften; ingen anbefaling under 12 år.
  - Hypothyreose: gravide, der allerede har øget dosis, eller med TSH < 0,1, får ikke +25 %;
    graviditetsgrænse for TSH (3,5); kontrol hver 4. uge og henvisning i journalen; pause ved lavt
    TSH på laveste dosis; journalplan ved central hypothyreose; huskeskemaet angiver Alexander 2004
    korrekt (gennemsnitlig øgning ca. 47 %; +29 % som startøgning).
  - Type 2-diabetes: SGLT-2 ved hjertesvigt/nyresygdom også på GLP-1; optitrering ved insulin;
    Rybelsus ny formulering (Lægemiddelstyrelsen 2025); advarsel ved manglende eGFR; samme mål-
    grænse i målboks og næste skridt; DPP-4 før GLP-1 hos skrøbelige; fuld tilskudsklausul; LDL
    < 1,4 ved hjerte-kar-sygdom i årskontrollen; diastolisk BT alene; forventet eGFR-fald efter
    opstart; henvisning ved A3.

**29. september 2026 — valg af behandling i klimakterie-, præventions- og osteoporoseguiden:**
- Hver behandling i tabellerne har en "Vælg til journal"-knap (fælles `valg.js`). Journalnotatet
  skriver så "Valgt behandling: …" i stedet for værktøjets førstevalg; uden valg er notatet som
  før. Frarådede metoder kan ikke vælges. Osteoporoseguiden kan også notere, at medicinsk
  behandling er fravalgt efter drøftelse.
- Valget huskes ved ny indtastning, så længe behandlingen stadig vises, og nulstilles ellers.
- "Kopiér fuld anbefaling" holder nu tag (fx "Anbefalet") adskilt fra præparatnavnet.
- Service worker v6 (ny fil `valg.js`), hjerte-appens v3 (ændret `style.css`).

**29. september 2026 — valg af behandling til journalnotatet (hjerte-kar):**
- Atrieflimren: under DOAK-tabellen vælges den aftalte behandling (mulige DOAK-doser, ved
  dabigatran i "overvej"-gruppen både 150 og 110 mg, samt warfarin eller fravalg af AK).
  Journalnotatet nævner så kun det valgte; uden valg listes alle mulige præparater som før.
  Frarådede og kontraindicerede præparater kan ikke vælges, og valget nulstilles, hvis det ikke
  længere er muligt.
- CV-risiko: når statin eller blodtrykssænkning vælges aktivt, skrives valget som "Plan" i
  journalnotatet (standardvalget bruges kun til at vise effekten).

**28. september 2026 — ny selvstændig app: hjerte-kar (`hjerte/`):**
- CV-risiko (SCORE2/SCORE2-OP/SCORE2-Diabetes med danske tærskler og NNT), antikoagulation ved
  atrieflimren (CHA₂DS₂-VA, DOAK-dosis, interaktioner, kontrol) og huskeskema; egen startside,
  manifest, ikon og offline-cache; testsuiter `cvrisiko`, `af` og `pwa-hjerte`.
- Byggeværktøjet håndterer nu sider i undermapper og faste artifact-titler.
- Uafhængig ekstern audit før udgivelse; rettet:
  - AF: journalnotatet skelner nu mulige DOAK fra frarådede/kontraindicerede (før stod fx
    "Dabigatran kontraindiceret" blandt doserne); interaktioner er opdelt pr. stof efter
    produktresuméerne (klaritromycin reducerer ikke edoxaban; voriconazol/posaconazol er ikke
    kontraindiceret for dabigatran; tacrolimus og glecaprevir tilføjet); en alvorligere status kan
    ikke længere overskrives af en mildere; kreatinin > 200 tæller i HAS-BLED; kontrolinterval
    ved clearance ≤ 60; ingen anbefaling uden alder ved score < 2; note om Cockcroft-Gault ved
    vægt > 120 kg og om labilt INR ved VKA.
  - CV-risiko: plausibilitetsgrænser for blodtryk, lipider, HbA1c og eGFR (fanger fx mg/dl);
    type 2-diabetes: statin til praktisk talt alle over 40 år (DES/DSAM, DCS) og LDL-mål efter
    ESC 2023-kategori; hypertension (≥ 135/85 hjemme) behandles uanset SCORE2; LDL-mål "og mindst
    50 % reduktion" også ved høj risiko; enkeltfaktor-lipider giver mål < 1,8; tærsklen
    sammenlignes med den viste, afrundede risiko; note ved diabetes ≥ 70 år, kronisk nyresygdom
    og værdier uden for SCORE2-skemaernes område; manglende LDL skønnes ud fra non-HDL, så
    statinintensiteten får betydning; ensartede statindoser.
  - Huskeskema: GI-blødning +25 % ved DOAK (Ruff 2014), definition af kronisk nyresygdom,
    hypertension som selvstændig indikation, præciseret kontrolinterval.

**28. september 2026 — kvartalsvis opdatering og testinfrastruktur:**
- Testsuiterne ligger nu i `tests/` med `run_all.sh`; byggeværktøj til de publicerede versioner i
  `tools/`; arbejdsgang og tjekliste til den faglige gennemgang i `CLAUDE.md`.
- Oversigtens installationsvejledning er markeret som app-specifik (vises ikke på claude.ai).

**28. september 2026 — nyt område: osteoporose (knoglesundhed):**
- Fire nye værktøjer: behandlingsguide, frakturrisiko og NNT, opfølgningsplan og huskeskema.
- Oversigten har en ny sektion "Knoglesundhed"; service workeren cacher de nye sider (v2).
- Klimakterieguidens knogleboks linker til osteoporose-guiden.
- Egen audit: glukokortikoid-tærsklen markeret som dosisafhængig, zoledronsyre gives oftest i
  hospitalsregi, denosumab har klausuleret tilskud, og osteopeni uden brud får et forsigtigt
  effektskøn ("usikker gevinst") i stedet for de effekter, der ses ved osteoporose.

**28. september 2026 — installerbar app (PWA) og GitHub Pages:**
- Ny startside `oversigt.html` og nyt `huskeskema.html` (samme indhold som de publicerede versioner).
- `manifest.webmanifest`, app-ikon (`icons/`), service worker (`sw.js`) til offline-brug og
  `pwa.js`, der registrerer den; alle sider har app-metadata til iPhone og Android.
- Fælles navigation med Oversigt og Huskeskema på alle sider; Blødningskalenderen er fjernet fra
  navigationen og som link i præventionsguiden (teksten anbefaler fortsat en blødningskalender).

**26. september 2026 — ekstern audit af beregninger og kilder i risikovurderingen:**
- Kontrolleret: brystkræfttal (MHRA 2019: 63 + 5/14/20 ved 5 år, dobbelt ved 10 år), apopleksi
  (EU-produktresumé: 8/14 + 3/4) og NNH-beregningen (1.000 ÷ ekstra, afrundet) er korrekte.
- **Rettet:**
  - **Endometriecancer:** baggrunden var angivet som "4/1.000 (NICE)" uden tidsramme; nu 5/1.000
    mellem 50 og 65 år fra EU-produktresuméet. Sekventiel behandling blev fremstillet som sikkert
    fordoblet med NNH ≈ 250; studierne er uenige (Million Women Study RR 1,05 mod dansk RR ca. 2),
    så nu vises intervallet og NNH ≥ 200 som værste fald. "Østrogen alene øger 2–4 gange" var for
    lavt, nu 5–55 ekstra pr. 1.000 (produktresumé). Utrogestan-noten gælder nu kun ved Utrogestan.
  - **Æggestokkræft:** EU-produktresuméet angiver ca. 0,5 ekstra pr. 1.000 og Lancet 2015 ca. 1,
    så NNH er nu 1.000–2.000 i stedet for ≥ 1.000.
  - **BRCA:** der blev vist en brystkræft-NNH, selvom kortet sagde, at tallene ikke gælder, og den
    kunne blive fremhævet som "største risiko". Nu ingen NNH og henvisning til CanRisk.
  - **Apopleksi:** oral behandling efter 60 år uden karrisikofaktorer stod som "høj" (4 ekstra pr.
    1.000), mens brystkræft med 40 ekstra stod som "moderat". Nu "moderat", men "høj" ved
    karrisikofaktorer.
- **Nyt:** dansk registerstudie om trombotisk sygdom (BMJ 2026) med NNH pr. behandlingsår for
  oral behandling og en dosisgrænse på 1 mg estradiol for apopleksi; demenstal fra WHIMS; NNH ved
  familiær disposition; dødelighed af brystkræft (Huntley 2024); samlet dødelighed ikke øget
  (WHI, BMJ 2026); tidsramme for NNH og forklaring af farveniveauerne i NNH-boksen.

**26. september 2026 — number needed to harm (NNH) i risikovurderingen:**
- Samlet NNH-tabel øverst med forklaring ("antal kvinder, der skal behandles, for at én ekstra
  får sygdommen — jo højere tal, jo sjældnere skade"), fremhævet NNH i hvert kort, den laveste
  (værste) NNH i den samlede vurdering, og NNH i journalnotatet.

**26. september 2026 — nyt værktøj: individuel risikovurdering ved MHT (`risiko.html`):**
- Absolutte risikotal pr. 1.000 kvinder for brystkræft, VTE, apopleksi, hjertesygdom,
  endometrie- og æggestokkræft (og demens ved opstart ≥ 65 år) samt gevinster, tilpasset alder,
  regime, administrationsvej og varighed.
- Patientens risikofaktorer markeres pr. udfald uden at omregne tallene; 1.000-personers figur til
  samtalen om brystkræft; personlig liste over, hvordan risikoen kan mindskes; kort journalnotat.
- Klimakterieguidens risikoboks linker til værktøjet, og alle værktøjer har det i navigationen.

**26. september 2026 — audit af risikoen for endometriecancer (klimakterie- og præventionsguiden):**
- **Rettet:**
  - Ingen mulighed for at angive **endometrieablation** eller **subtotal hysterektomi** — begge kan
    efterlade endometrium, men ville hidtil blive registreret som "uterus bevaret" eller
    "hysterektomeret" (sidstnævnte giver østrogen alene). Tilføjet som selvstændige valg med
    kombineret behandling og BMS' 3-måneders gestagentest ved subtotal hysterektomi.
  - **Tibolon** stod uden advarsel om endometriecancer (dansk kohorte: ca. 3,6 gange øget risiko);
    nu markeret som sidste valg med krav om udredning af blødning.
  - **Lokal vaginal østrogen** stod som "ingen kendt øget risiko" for livmoderkræft — en dansk
    registerundersøgelse fandt en let øget forekomst (formentlig udredningsbias; metaanalyser
    viser ingen øgning). Formuleringen er nuanceret.
  - Ingen vejledning om **skift fra sekventiel til kontinuerlig kombineret behandling**, selvom
    langvarig sekventiel behandling ca. fordobler risikoen (Mørch 2016). Tilføjet i regimet og
    opfølgningen (efter ≥ 1 år, når patienten er postmenopausal, og helst inden 5 år).
  - Ingen note om, at **Utrogestans** endometriebeskyttelse kun er dokumenteret i ca. 5 år (E3N:
    øget risiko ved længere brug) — tilføjet med råd om Mirena og lav tærskel for udredning.
- **Nyt:** ubehandlet endometriehyperplasi som kontraindikation; felt for øget risiko for
  endometriecancer (PCOS, diabetes, Lynch syndrom) og automatisk note ved BMI ≥ 30; note om
  tamoxifen og tidligere endometriecancer; relative risikotal for endometriecancer pr. regime i
  risikoboksen; blødning efter ophør af MHT udredes som postmenopausal blødning.
- **Præventionsguiden:** risikoboksen nævner nu den beskyttende effekt af kombinerede p-piller
  mod endometrie- og ovariecancer (dansk kohorte: RR ca. 0,6, varer > 10 år efter ophør).

**23. september 2026 — klinisk gennemgang og udvidelse af præventionsværktøjet (`praevention.html`/`praevention.js`):**
- **Rettede fejl:**
  - Præparater der ikke kunne bekræftes på det danske marked (Triquilar, Solia, Zelleta) er
    fjernet; Cilest (norgestimat) er ikke "2. generation" og indeholder 35 mikrog. østrogen —
    rettet og markeret "bekræft udbud". Microgyn suppleret med Rigevidon/Femicept.
  - Kobberspiralens effektivitet stod som "~98 %" — den er > 99 %.
  - Plaster/ring stod med "samme kontraindikationsprofil" uden at nævne den højere VTE-risiko
    (6–12 mod 5–7 pr. 10.000 pr. år, EMA).
  - Ved ønske om langtidsvirkende prævention henviste teksten til kombineret prævention "nedenfor",
    men boksen blev aldrig vist. Og ved LARC-ønske + kontraindikation mod østrogen blev
    LARC-tabellen vist to gange.
  - Hypertension: kun "ukontrolleret eller ≥ 160/100" udelukkede kombineret prævention; også
    velreguleret hypertension og BT ≥ 140/90 frarådes (UKMEC 3).
  - Nødprævention: BMI-grænsen var ≥ 26 (FSRH: > 26), og der manglede dobbeltdosis
    levonorgestrel samt håndtering af enzyminducerende medicin.
- **Nyt:** alder ≥ 50, VTE hos nær familie, planlagt operation, enzyminducerende medicin,
  lamotrigin og kraftige menstruationer som felter; Slinda og Depo-Provera; forlænget p-pille-regime;
  samtykke under 15 år; prævention fra 40 år; opstart ("quick start"); glemte piller;
  effektivitet og risikotal; link til Blødningskalenderen; kort journalnotat.
- Præparatnavne er tjekket via websøgning mod pro.medicin.dk-opslag (siden kunne ikke tilgås
  direkte).

**23. september 2026 — klinisk gennemgang og udvidelse af hormonværktøjet (`index.html`/`app.js`):**
- **Rettede fejl:**
  - Depotplastret hed "Estradot", som ikke markedsføres i Danmark — rettet til **Vivelle Dot**.
    "Ovesterin" rettet til **Ovestin**, "Oestring" til **Estring**, og Utrogestan-doser er nu
    angivet i 100 mg kapsler (den eneste styrke i Danmark).
  - **For lav endometriebeskyttelse ved POI:** et 100 mikrog.-plaster blev foreslået sammen med
    kun 100 mg kontinuerlig Utrogestan. BMS anbefaler 200 mg kontinuerligt eller 300 mg cyklisk
    ved høj østrogendosis — rettet.
  - "Mirena/Levosert" som endometriebeskyttelse: kun Mirena er godkendt hertil (op til 5 år).
  - Præventionspåmindelsen blev vist til hysterektomerede kvinder, men ikke til
    postmenopausale kvinder under 50 år — rettet.
  - Ved alder ≥ 60 uden afkrydsede risikofaktorer blev risikolisten vist tom ("…risikofaktor(er): .").
  - Aldersadvarslen blev vist ved tomt aldersfelt efter "Nulstil" — og i præventionsværktøjet
    allerede ved sideindlæsning (følgevirkning af fjernelsen af den forudindtastede alder).
  - På mobil var siden bredere end skærmen (hormon-, præventions- og MRS-værktøjet), og
    doseringskolonnen var skjult; tabellerne vises nu stablet på smalle skærme.
- **Nyt:** konkrete doser (lav/standard/høj) med dosisækvivalenstabel; ikke-hormonel behandling
  inkl. fezolinetant og KAT; præference "ønsker ikke hormonbehandling"; tidlig menopause (40–44 år);
  tidligere VTE som risikofaktor; noter om brystkræft i familien/BRCA, osteoporose og tidligere
  endometriose; POI-diagnostik (ESHRE 2024); "Før opstart"-tjekliste; regler for udredning af
  blødning på MHT; absolutte risikotal (MHRA 2019); kort journalnotat.
- Præparatnavne er tjekket mod danske kilder via websøgning (pro.medicin.dk kunne ikke tilgås
  direkte). Femostons danske markedsføringsstatus kunne ikke bekræftes og er markeret
  "bekræft udbud i DK".

**23. september 2026 — ekstern audit af blødningskalenderen (klinisk indhold, UI, UX):**
- **Kontrastfejl på "Smerter"-markøren:** den blå prik, der markerer smerter på en given dag,
  havde utilstrækkelig kontrast (kontrastforhold ≈ 1,5:1, langt under WCAG AA's krav på 4,5:1) mod
  den mørkerøde "Kraftig"-baggrund — netop den kombination (kraftig blødning + smerter) en læge
  oftest vil ville få øje på med det samme. Rettet ved at give markøren en dobbelt ring (hvid,
  derefter mørk), så den er synlig uanset baggrundsfarve, fremfor kun at stole på én farves
  kontrast mod en baggrund der varierer fra lyserosa til mørkerød.
- **Kontrastfejl på dagstal:** hvid tekst på "Moderat"-intensitetens baggrundsfarve gav kun ≈
  3,9:1 kontrast (under WCAG AA's 4,5:1 for normal tekststørrelse). Baggrundsfarven er gjort en
  anelse mørkere (til ≈ 4,9:1), fortsat tydeligt adskilt fra nabofarverne "Let" og "Kraftig".
- **Uverificeret detalje i klinisk tekst:** "Normalområder"-afsnittet angav menorrhagi som
  knyttet til et specifikt cyklusinterval ("21–35 dage") — denne detalje kunne ikke genfindes i
  DSAM's egen definition (som blot beskriver menorrhagi som kraftig, forlænget menstruation, uden
  cyklusinterval) og var formentlig en selvopfundet præcisering. Fjernet og omformuleret til at
  følge DSAM's ordlyd tættere.
- Begge kontrastrettelser er verificeret ved beregning af WCAG-kontrastforhold og ved
  Playwright-skærmbilleder af de berørte kalenderceller, i både lys og mørk visning.

**23. september 2026 — tilføjet blødningskalender (`bloedningskalender.html`):**
- Nyt værktøj efter ønske fra en underviser (speciallæge i gynækologi): et helt kalenderårs
  overblik (12 måneders mini-kalendere i ét skærmbillede) til registrering af blødningsstyrke,
  smerter og noter ved mistanke om blødningsforstyrrelser — i modsætning til typiske
  cyklus-apps, der kun viser én måned ad gangen.
- Første værktøj i repoet der gemmer data mellem besøg (lokalt i browserens `localStorage`,
  bevidst uden server eller konto af hensyn til datafølsomhed — se afsnittet "Blødningskalender —
  funktion og datahåndtering" ovenfor).
- Fundet og rettet under egen gennemgang før udgivelse: flere knapper (årsnavigation, "Ryd denne
  dag", "Ryd alle data") brugte `.btn-ghost`-stilen, som er designet til den mørke topbar — på de
  lyse paneler nedenunder blev knapperne næsten usynlige (hvid tekst på næsten-hvid baggrund).
  Tilføjet en ny `.btn-outline`-stil til brug uden for topbaren, og rettet alle berørte knapper.
- Terminologi og normalområder fra DSAM's vejledning om blødningsforstyrrelser og FIGO's moderne
  definition af normal cyklus/blødningsvarighed — se kildehenvisning i selve appen.

**23. september 2026 — tilføjet MRS-scoringsværktøj (`mrs.html`):**
- Nyt værktøj der implementerer Menopause Rating Scale (MRS), et internationalt valideret
  11-punkts symptomscoringsskema, til hurtig kvantificering af symptombyrde og til at følge
  behandlingseffekt over tid.
- Struktur, pointskala og score-intervaller er krydstjekket mod flere uafhængige kilder. Den
  officielle danske PDF fra rettighedshaveren ZEG Berlin kunne ikke tilgås direkte i denne
  udviklingssession (netværksrestriktion) — item-teksterne er derfor min egen oversættelse, ikke
  en verificeret gengivelse af den officielle oversættelse. Se afsnittet "MRS — klinisk logik og
  grundlag" ovenfor for detaljer og link til den officielle kilde.
- Værktøjet kræver alle 11 spørgsmål besvaret før det viser en score (et ubesvaret spørgsmål
  tælles bevidst ikke som 0), og foreslår `index.html` som næste skridt ved forhøjet score.
- Alle tre værktøjer krydshenviser nu til hinanden i navigationslinjen.

**23. september 2026 — rettelser efter ekstern audit af præventionsværktøjet:**
- Rettet: en patient der markerede "Ammer i øjeblikket" uden samtidig "Har født inden for de
  seneste 6 uger" kunne få anbefalet en kombineret p-pille, samtidig med at værktøjets egen
  amning-note advarede mod netop den slags pille. Amning indgår nu som en udelukkelsesgrund for
  kombineret prævention, ikke kun som en efterfølgende informationsboks.
- Rettet: "Migræne uden aura" havde ingen effekt på anbefalingen overhovedet. Valget udløser nu en
  forsigtighedsnote (monitorér for forværring/udvikling af aura), uden at udelukke kombineret
  prævention, som "migræne med aura" gør.
- Rettet: BMI-advarslen ved akut nødprævention blev vist for tidsvinduerne under 24 og 24–72
  timer, men ikke for 72–120 timer, selvom ellaOne (som er vægtafhængig) også anbefales i det
  vindue. Advarslen vises nu i alle tre tidsvinduer hvor en pille anbefales.
- Tilføjet: en note om at Nexplanon-implantatets sikkerhed og virkning kun er fastslået for
  kvinder mellem 18 og 40 år, vist når indtastet alder ligger uden for dette interval.
- Tilføjet: aldersgrænsen på 20 år for LARC-first-anbefalingen er nu eksplicit markeret som et
  eget, ikke-kildesourcet skøn i afsnittet om kendte usikkerheder.
- Mindre ændring: boksen om at kombineret prævention frarådes vises ikke længere når patienten
  allerede har valgt "hormonfri" eller "sterilisation" som præference, hvor den er irrelevant støj.

**22. september 2026 — tilføjet præventionsværktøj (`praevention.html`):**
- Nyt værktøj til valg af præventionsmetode, inkl. en separat, tidligt afsluttet gren for akut
  nødprævention (svarende i struktur til absolutte kontraindikationer i hormonbehandlings-værktøjet).
- Bygger fra start på lektionerne fra den eksterne audit af hormonbehandlings-værktøjet: rigtigt
  `<form>`-element, uafhængige (ikke sammenkoblede) formfelter, `text-size-adjust`-fix, og en
  DOM-baseret ren-tekst journal-eksport. Se afsnittet "Kendte usikkerheder i denne version"
  ovenfor for åbne punkter.

**22. september 2026 — rettelser efter ekstern audit af algoritme og UX:**
- Rettet: en præmatur ovarieinsufficiens (POI)-patient med kun urogenitale symptomer eller ingen
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
