# Hormoner — beslutningsstøtte ved klimakteriet

En let, statisk webapp der giver den praktiserende læge en hurtig, struktureret anbefaling om
hormonbehandling (MHT) ved klimakterielle symptomer — med konkrete eksempler på præparater der
er tilgængelige i Danmark.

Appen kører udelukkende i browseren (ingen server, ingen data sendes nogen steder). Udfyld
patientens data i venstre panel, og anbefalingen opdateres øjeblikkeligt i højre panel. Brug
"Kopiér resumé til journal" for at indsætte anbefalingen i journalnotatet, eller "Udskriv" for en
printvenlig version.

## Sådan køres appen

Ingen build-trin eller afhængigheder er nødvendige.

- **Lokalt:** åbn `index.html` direkte i en browser, eller kør en simpel lokal server, fx:
  ```
  python3 -m http.server 8000
  ```
  og gå til `http://localhost:8000`.
- **Hosting:** filerne (`index.html`, `style.css`, `app.js`) kan deployes som statisk site til
  fx GitHub Pages, Netlify eller en intern klinikserver.

## Klinisk logik (kort opsummeret)

1. **Absolutte kontraindikationer** (brystkræft/østrogenfølsom cancer, uafklaret
   vaginalblødning, aktiv VTE, aktiv arteriel tromboembolisk sygdom, aktiv leversygdom,
   graviditet) → systemisk hormonbehandling frarådes, ikke-hormonelle alternativer foreslås
   (SSRI/SNRI, gabapentin, clonidin), og lokal vaginal østrogen nævnes som mulighed ved isolerede
   urogenitale symptomer efter aftale med specialist.
2. **Isolerede urogenitale symptomer (GSM)** uden vasomotoriske/andre symptomer → lokal vaginal
   østrogen alene, uafhængigt af uterusstatus.
3. **Prænatur ovarieinsufficiens (POI, < 40 år)** → systemisk hormonbehandling anbefales
   uafhængigt af symptomintensitet, typisk i lidt højere dosis, indtil ca. 51-årsalderen.
4. **Systemisk kombinationsbehandling** vælges ud fra:
   - Uterusstatus: østrogen-alene ved hysterektomi, ellers østrogen + progestogen.
   - Cyklusstatus: cyklisk/sekventiel behandling ved perimenopause (fortsat/uregelmæssig
     menstruation), kontinuerlig kombination ved > 12 måneders amenoré.
   - Administrationsvej: transdermal (plaster/gel) foretrækkes ved VTE-/apopleksi-risikofaktorer
     (rygning, BMI > 30, migræne med aura, trombofili, hypertension, høj triglycerid,
     galdeblæresygdom, opstart ≥ 60 år eller > 10 år postmenopausal).
   - Progestogenvalg: mikroniseret progesteron (Utrogestan) eller dydrogesteron (Femoston)
     fremhæves som muligt gunstigere alternativ til syntetiske progestiner ved øget bekymring
     for bryst-/VTE-risiko.
5. **Opfølgning:** kontrol efter 2–3 måneder, årlig revurdering, ingen fast øvre grænse for
   behandlingsvarighed, uændret mammografiscreening.

## Kilder og grundlag

- DSAM (Dansk Selskab for Almen Medicin) — klinisk vejledning *Overgangsalderen*
- Dansk Menopause Selskab (DMS) — retningslinjer for menopausal hormonbehandling
- Sundhedsstyrelsen — anbefalinger om hormonbehandling i overgangsalderen
- [pro.medicin.dk](https://pro.medicin.dk) — opslag før enhver ordination (aktuelle
  præparatnavne, styrker, pakninger, tilskud og interaktioner)
- Supplerende internationalt evidensgrundlag: NICE NG23, IMS/EMAS og The Endocrine Society's
  kliniske retningslinjer for menopausal hormonbehandling

## Vigtige forbehold

- Dette er et **uafhængigt hjælpeværktøj**, ikke en officiel publikation fra DSAM, Dansk
  Menopause Selskab eller Sundhedsstyrelsen.
- Præparatnavne, styrker, pakninger og tilskudsstatus ændres løbende i Danmark — **verificér
  altid på pro.medicin.dk før ordination**.
- Værktøjet erstatter ikke den individuelle kliniske vurdering, grundig anamnese,
  kontraindikationsscreening eller den fulde tekst i de originale vejledninger.
- Ingen patientdata gemmes eller sendes — al beregning sker lokalt i browseren.
