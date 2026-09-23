# Hormoner — beslutningsstøtte for praktiserende læge

Fire lette, statiske webapps der giver den praktiserende læge en hurtig, struktureret anbefaling
til brug ved konsultationen — med konkrete eksempler på præparater der er tilgængelige i Danmark:

- **`index.html`** — hormonbehandling (MHT) ved klimakterielle symptomer.
- **`praevention.html`** — prævention/kontraception, inkl. en separat, hurtig gren for akut
  nødprævention.
- **`mrs.html`** — Menopause Rating Scale (MRS): et internationalt valideret, 11-punkts
  symptomscoringsskema til at kvantificere sværhedsgraden af klimakterielle symptomer, og til at
  følge effekten af behandling ved gentagen udfyldelse.
- **`bloedningskalender.html`** — årsoverblik til registrering af blødning ved mistanke om
  blødningsforstyrrelser, i stil med en klassisk papirvægkalender: hele året i ét skærmbillede i
  stedet for én måned ad gangen, så uregelmæssige mønstre bliver synlige med det samme.

Alle fire værktøjer krydshenviser til hinanden i en lille navigationslinje øverst.

De tre første apps kører udelukkende i browseren og gemmer intet (ingen server, ingen data sendes
nogen steder). Udfyld patientens data i venstre panel, og anbefalingen/scoren opdateres
øjeblikkeligt i højre panel. Brug "Kopiér resumé til journal" for at indsætte resultatet i
journalnotatet (hormonværktøjet har desuden et kort "journalnotat"), eller "Udskriv" for en
printvenlig version med tidsstempel.

Blødningskalenderen er anderledes: den er lavet til at bruges over uger/måneder, og gemmer derfor
data lokalt i browserens `localStorage` mellem besøg (se afsnittet "Blødningskalender" nedenfor
for hvad det betyder i praksis).

## Sådan køres appen

Ingen build-trin eller afhængigheder er nødvendige.

- **Lokalt:** åbn `index.html`, `praevention.html`, `mrs.html` eller `bloedningskalender.html`
  direkte i en browser, eller kør en simpel lokal server, fx:
  ```
  python3 -m http.server 8000
  ```
  og gå til `http://localhost:8000`. Bemærk: åbnes filen direkte via `file://` (uden lokal
  server), vil "Kopiér resumé til journal" sandsynligvis fejle stille, da browserens
  clipboard-API kræver en sikker kontekst (https eller en lokal server) — kør en lokal server som
  ovenfor, eller markér og kopiér teksten manuelt.
- **Hosting:** filerne (`index.html`, `praevention.html`, `mrs.html`, `bloedningskalender.html`,
  `style.css`, `app.js`, `praevention.js`, `mrs.js`, `bloedningskalender.js`) kan deployes som
  statisk site til fx GitHub Pages, Netlify eller en intern klinikserver. Bemærk at
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
   - Uterus (ja/nej) — østrogen alene hvis nej (evt. + gestagen ved tidligere endometriose),
     ellers østrogen + progestogen.
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
