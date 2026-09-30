/*
 * Restordre — vidensbase med alternativer pr. lægemiddelgruppe.
 *
 * Hver gruppe har:
 *   stoffer:  kolonnerne (indholdsstof + søgeord, fx handelsnavne). "samme" er tips om andre
 *             styrker/former af netop det stof.
 *   raekker:  dosisniveauer med omtrent ækvivalente doser (vejledende — titrér efter effekt).
 *   samme:    gruppe-specifikke råd om samme indholdsstof.
 *   skift:    hvordan der skiftes, og hvad der skal kontrolleres.
 *   forslag:  (grupper uden ækvivalenstabel) alternativer i prioriteret rækkefølge.
 * Handelsnavne er kun søgeord — de siger intet om, hvad der aktuelt kan skaffes.
 */
window.RESTORDRE_GRUPPER = [
  // ---------------------------------------------------------------- Hjerte-kar
  {
    id: "ace", navn: "ACE-hæmmere", kategori: "Hjerte-kar",
    stoffer: [
      { id: "ramipril", navn: "Ramipril", soeg: "ramipril|triatec", samme: "Kapsler/tabletter 1,25–10 mg — fx 2 × 5 mg i stedet for 10 mg." },
      { id: "enalapril", navn: "Enalapril", soeg: "enalapril|renitec", samme: "Tabletter 2,5–20 mg; 40 mg kan gives som 20 mg × 2." },
      { id: "lisinopril", navn: "Lisinopril", soeg: "lisinopril|zestril", samme: "Tabletter 5–20 mg (evt. 2 × 20 mg)." },
      { id: "perindopril", navn: "Perindopril", soeg: "perindopril|coversyl", samme: "To salte: tert-butylamin 2/4/8 mg svarer til arginin 2,5/5/10 mg." },
    ],
    raekker: [
      { niveau: "Lav", doser: { ramipril: "2,5 mg × 1", enalapril: "5 mg × 1", lisinopril: "5 mg × 1", perindopril: "2 mg × 1 (arginin 2,5 mg)" } },
      { niveau: "Middel", doser: { ramipril: "5 mg × 1", enalapril: "10–20 mg × 1", lisinopril: "10–20 mg × 1", perindopril: "4 mg × 1 (arginin 5 mg)" } },
      { niveau: "Høj", doser: { ramipril: "10 mg × 1", enalapril: "20 mg × 2", lisinopril: "40 mg × 1", perindopril: "8 mg × 1 (arginin 10 mg)" } },
    ],
    skift: [
      "Direkte skift til ækvivalent dosis — ingen udtrapning eller pause.",
      "Kontrollér blodtryk, kalium og kreatinin 1–2 uger efter skiftet.",
      "Kan ingen ACE-hæmmer skaffes: skift til ARB (se Angiotensin II-receptorblokkere) — samme kontrol.",
    ],
    kilder: ["He Ako Hiringa (NZ): Changing ACEs — ramipril 10 mg ≈ lisinopril 40 mg ≈ enalapril 40 mg ≈ perindopril 8 mg; perindopril 4 mg ≈ enalapril 10–20 mg ≈ ramipril 5 mg"],
  },
  {
    id: "arb", navn: "Angiotensin II-receptorblokkere (ARB)", kategori: "Hjerte-kar",
    stoffer: [
      { id: "losartan", navn: "Losartan", soeg: "losartan|cozaar", samme: "Tabletter 12,5–100 mg." },
      { id: "candesartan", navn: "Candesartan", soeg: "candesartan|atacand", samme: "Tabletter 4–32 mg." },
      { id: "valsartan", navn: "Valsartan", soeg: "valsartan|diovan", samme: "Tabletter/kapsler 40–320 mg." },
      { id: "irbesartan", navn: "Irbesartan", soeg: "irbesartan|aprovel", samme: "Tabletter 75–300 mg." },
      { id: "telmisartan", navn: "Telmisartan", soeg: "telmisartan|micardis", samme: "Tabletter 20–80 mg." },
      { id: "olmesartan", navn: "Olmesartan", soeg: "olmesartan|olmetec", samme: "Tabletter 10–40 mg." },
    ],
    raekker: [
      { niveau: "Lav (start)", doser: { losartan: "25 mg", candesartan: "4 mg", valsartan: "40 mg", irbesartan: "75 mg", telmisartan: "20 mg", olmesartan: "10 mg" } },
      { niveau: "Middel", doser: { losartan: "50 mg", candesartan: "8–16 mg", valsartan: "80 mg", irbesartan: "150 mg", telmisartan: "40 mg", olmesartan: "20 mg" } },
      { niveau: "Høj", doser: { losartan: "100 mg", candesartan: "32 mg", valsartan: "160–320 mg", irbesartan: "300 mg", telmisartan: "80 mg", olmesartan: "40 mg" } },
    ],
    tabelNote: "Alle doseres én gang dagligt ved hypertension. Ved hjertesvigt er candesartan, valsartan (× 2 dagligt) og losartan dokumenteret.",
    skift: [
      "Direkte skift til ækvivalent dosis.",
      "Kontrollér blodtryk, kalium og kreatinin 1–2 uger efter skiftet.",
    ],
    kilder: ["medSask (Saskatchewan): Angiotensin II Receptor Blocker Comparison 2023 — candesartan 16 mg ≈ irbesartan 150 mg ≈ losartan 50 mg ≈ olmesartan 20 mg ≈ telmisartan 40 mg ≈ valsartan 80 mg"],
  },
  {
    id: "ccb", navn: "Calciumantagonister (dihydropyridiner)", kategori: "Hjerte-kar",
    stoffer: [
      { id: "amlodipin", navn: "Amlodipin", soeg: "amlodipin|norvasc", samme: "Tabletter 5 og 10 mg (½ tablet 5 mg = 2,5 mg)." },
      { id: "felodipin", navn: "Felodipin depot", soeg: "felodipin|plendil", samme: "Depottabletter 2,5–10 mg — må ikke deles." },
      { id: "lercanidipin", navn: "Lercanidipin", soeg: "lercanidipin|zanidip", samme: "Tabletter 10 og 20 mg." },
      { id: "nifedipin", navn: "Nifedipin depot", soeg: "nifedipin|adalat", samme: "Kun depotformer til hypertension (30 og 60 mg)." },
    ],
    raekker: [
      { niveau: "Middel", doser: { amlodipin: "5 mg", felodipin: "5 mg", lercanidipin: "10 mg", nifedipin: "30 mg depot" } },
      { niveau: "Høj", doser: { amlodipin: "10 mg", felodipin: "10 mg", lercanidipin: "20 mg", nifedipin: "60 mg depot" } },
    ],
    tabelNote: "Vejledende — præparaterne er ligeværdige på blodtrykket, men titrering efter blodtrykket afgør dosis. Lercanidipin giver færre ankelødemer. Verapamil og diltiazem er ikke alternativer (virker på hjertet).",
    skift: [
      "Direkte skift. Kontrollér blodtrykket efter 2–4 uger.",
      "Tjek interaktioner (fx simvastatin maks. 20 mg sammen med amlodipin).",
    ],
    kilder: ["Lercanidipine in Adults (LEAD) og DARE-review: lercanidipin 10–20 mg ≈ amlodipin 10 mg, felodipin 10–20 mg og nifedipin GITS 30–60 mg", "medSask: Oral Calcium Channel Blocker Comparison 2023"],
  },
  {
    id: "bb", navn: "Betablokkere", kategori: "Hjerte-kar",
    stoffer: [
      { id: "metoprolol", navn: "Metoprololsuccinat depot", soeg: "metoprolol|selo-?zok", samme: "Depottabletter 25–200 mg (kan deles efter delekærv)." },
      { id: "bisoprolol", navn: "Bisoprolol", soeg: "bisoprolol|emconcor", samme: "Tabletter 1,25–10 mg." },
      { id: "carvedilol", navn: "Carvedilol", soeg: "carvedilol", samme: "Tabletter 3,125–25 mg, gives × 2 dagligt." },
      { id: "nebivolol", navn: "Nebivolol", soeg: "nebivolol|nebilet", samme: "Tabletter 5 mg (kan deles)." },
      { id: "atenolol", navn: "Atenolol", soeg: "atenolol|tenormin", samme: "Tabletter 25–100 mg. Udskilles gennem nyrerne." },
    ],
    raekker: [
      { niveau: "Lav", doser: { metoprolol: "25 mg × 1", bisoprolol: "1,25 mg × 1", carvedilol: "3,125 mg × 2", nebivolol: "1,25 mg × 1", atenolol: "12,5 mg × 1" } },
      { niveau: "Middel", doser: { metoprolol: "50 mg × 1", bisoprolol: "2,5 mg × 1", carvedilol: "6,25 mg × 2", nebivolol: "2,5 mg × 1", atenolol: "25 mg × 1" } },
      { niveau: "Høj", doser: { metoprolol: "100 mg × 1", bisoprolol: "5 mg × 1", carvedilol: "12,5 mg × 2", nebivolol: "5 mg × 1", atenolol: "50 mg × 1" } },
      { niveau: "Maks./måldosis ved hjertesvigt", doser: { metoprolol: "200 mg × 1", bisoprolol: "10 mg × 1", carvedilol: "25 mg × 2", nebivolol: "10 mg × 1", atenolol: "100 mg × 1 (ikke ved hjertesvigt)" } },
    ],
    tabelNote: "Ved hjertesvigt: brug kun bisoprolol, metoprololsuccinat, carvedilol eller nebivolol (≥ 70 år) — ikke atenolol.",
    skift: [
      "Direkte skift til ækvivalent dosis — undgå pause (rebound-takykardi/angina).",
      "Carvedilol er også alfablokerende og kan sænke blodtrykket mere — start evt. et trin lavere.",
      "Kontrollér puls og blodtryk efter 1–2 uger.",
    ],
    kilder: ["BC Guidelines (Canada), Heart failure Appendix B: måldoser — bisoprolol 10 mg, metoprololsuccinat 200 mg, carvedilol 25 mg × 2", "Omregning (sekundære kilder): metoprololsuccinat 100 mg ≈ bisoprolol 5 mg ≈ carvedilol 12,5 mg × 2 ≈ atenolol 50 mg"],
  },
  {
    id: "thiazid", navn: "Thiazider og thiazidlignende diuretika", kategori: "Hjerte-kar",
    stoffer: [
      { id: "bendro", navn: "Bendroflumethiazid (+ kaliumklorid)", soeg: "bendroflumethiazid|centyl", samme: "Findes med og uden kaliumklorid." },
      { id: "hct", navn: "Hydrochlorthiazid", soeg: "hydrochlorthiazid|hct", samme: "Findes også i faste kombinationer med ACE-hæmmer/ARB." },
      { id: "indapamid", navn: "Indapamid", soeg: "indapamid|natrilix", samme: "Depottablet 1,5 mg eller tablet 2,5 mg." },
    ],
    raekker: [
      { niveau: "Sædvanlig dosis ved hypertension", doser: { bendro: "2,5 mg × 1", hct: "12,5–25 mg × 1", indapamid: "1,5 mg depot × 1 (eller 2,5 mg)" } },
    ],
    tabelNote: "Kilderne er uenige om den præcise ækvivalens — brug sædvanlig dosis og titrér efter blodtrykket. Indapamid sænker blodtrykket lidt mere end hydrochlorthiazid.",
    skift: ["Direkte skift. Kontrollér natrium, kalium og kreatinin efter 1–2 uger — især hos ældre (hyponatriæmi)."],
    kilder: ["Hypertension (AHA) 2015: head-to-head-sammenligninger af hydrochlorthiazid, indapamid og chlorthalidon"],
  },
  {
    id: "loop", navn: "Loop-diuretika", kategori: "Hjerte-kar",
    stoffer: [
      { id: "furosemid", navn: "Furosemid", soeg: "furosemid|furix|lasix", samme: "Tabletter 20–500 mg og depotkapsler." },
      { id: "bumetanid", navn: "Bumetanid", soeg: "bumetanid|burinex", samme: "Tabletter 1 og 5 mg." },
    ],
    raekker: [
      { niveau: "Lav", doser: { furosemid: "20 mg", bumetanid: "0,5 mg" } },
      { niveau: "Middel", doser: { furosemid: "40 mg", bumetanid: "1 mg" } },
      { niveau: "Høj", doser: { furosemid: "80 mg", bumetanid: "2 mg" } },
    ],
    tabelNote: "Oral furosemid 40 mg ≈ oral bumetanid 1 mg (40:1).",
    skift: ["Direkte skift. Følg vægt, kalium og kreatinin inden for 1–2 uger — især ved hjertesvigt."],
    kilder: ["Drugs.com / Med Ed 101: loop-diuretika — oral furosemid 40 mg ≈ bumetanid 1 mg"],
  },
  {
    id: "statin", navn: "Statiner", kategori: "Hjerte-kar",
    stoffer: [
      { id: "atorva", navn: "Atorvastatin", soeg: "atorvastatin|lipitor|zarator", samme: "Tabletter 10–80 mg." },
      { id: "rosuva", navn: "Rosuvastatin", soeg: "rosuvastatin|crestor", samme: "Tabletter 5–40 mg." },
      { id: "simva", navn: "Simvastatin", soeg: "simvastatin|zocor", samme: "Tabletter 10–80 mg (80 mg frarådes)." },
      { id: "prava", navn: "Pravastatin", soeg: "pravastatin|pravachol", samme: "Tabletter 10–40 mg." },
    ],
    raekker: [
      { niveau: "Ca. 30 % LDL-reduktion", doser: { atorva: "—", rosuva: "—", simva: "20 mg (32 %)", prava: "40 mg (29 %)" } },
      { niveau: "Ca. 37 %", doser: { atorva: "10 mg (37 %)", rosuva: "5 mg (38 %)", simva: "40 mg (37 %)", prava: "—" } },
      { niveau: "Ca. 43 %", doser: { atorva: "20 mg (43 %)", rosuva: "10 mg (43 %)", simva: "80 mg (42 %) — frarådes", prava: "—" } },
      { niveau: "Ca. 49 %", doser: { atorva: "40 mg (49 %)", rosuva: "20 mg (48 %)", simva: "—", prava: "—" } },
      { niveau: "Ca. 55 %", doser: { atorva: "80 mg (55 %)", rosuva: "40 mg (53 %)", simva: "—", prava: "—" } },
    ],
    tabelNote: "Procenterne er forventet LDL-reduktion (NICE). Højintensiv statin (≥ 50 %, ESC): atorvastatin 40–80 mg eller rosuvastatin 20–40 mg.",
    skift: [
      "Direkte skift til samme LDL-reduktion.",
      "Kontrollér lipider efter 4–12 uger.",
      "Tjek interaktioner: simvastatin og atorvastatin nedbrydes via CYP3A4 (fx clarithromycin, amlodipin); rosuvastatin og pravastatin gør ikke.",
    ],
    kilder: ["NICE CG181: forventet LDL-reduktion pr. statin og dosis (atorvastatin 20 mg 43 %, rosuvastatin 10 mg 43 %, simvastatin 40 mg 37 % m.fl.)"],
  },
  {
    id: "doak", navn: "DOAK (antikoagulation ved atrieflimren)", kategori: "Hjerte-kar",
    stoffer: [
      { id: "apixaban", navn: "Apixaban", soeg: "apixaban|eliquis", samme: "Tabletter 2,5 og 5 mg." },
      { id: "rivaroxaban", navn: "Rivaroxaban", soeg: "rivaroxaban|xarelto", samme: "Tabletter 15 og 20 mg (tages med mad)." },
      { id: "edoxaban", navn: "Edoxaban", soeg: "edoxaban|lixiana", samme: "Tabletter 30 og 60 mg." },
      { id: "dabigatran", navn: "Dabigatran", soeg: "dabigatran|pradaxa", samme: "Kapsler 110 og 150 mg (må ikke åbnes)." },
    ],
    raekker: [
      { niveau: "Standarddosis", doser: { apixaban: "5 mg × 2", rivaroxaban: "20 mg × 1", edoxaban: "60 mg × 1", dabigatran: "150 mg × 2" } },
      { niveau: "Reduceret dosis (kriterierne er forskellige!)", doser: { apixaban: "2,5 mg × 2 — ≥ 2 af: alder ≥ 80, vægt ≤ 60 kg, kreatinin ≥ 133; eller CrCl 15–29", rivaroxaban: "15 mg × 1 — CrCl 15–49", edoxaban: "30 mg × 1 — CrCl 15–50, vægt ≤ 60 kg eller visse P-gp-hæmmere", dabigatran: "110 mg × 2 — alder ≥ 80 eller verapamil (kontraindiceret ved CrCl < 30)" } },
    ],
    tabelNote: "Dosis afgøres af hvert præparats egne kriterier — ikke af den gamle dosis. Brug Atrieflimren-værktøjet til at beregne dosis ud fra alder, vægt, kreatininclearance og interaktioner.",
    link: { href: "../hjerte/af.html", tekst: "Beregn dosis i Atrieflimren-værktøjet" },
    skift: [
      "Stop det gamle præparat, og start det nye på tidspunktet for næste planlagte dosis (EHRA).",
      "Beregn kreatininclearance (Cockcroft-Gault) og tjek interaktioner før skiftet.",
      "Kan ingen DOAK skaffes: warfarin med INR-styring (kræver opstart og tæt kontrol).",
    ],
    kilder: ["EHRA Practical Guide 2021: skift mellem DOAK ved næste doseringstidspunkt", "Produktresuméer (via Atrieflimren-værktøjet, se dets kildeliste)"],
  },

  // ---------------------------------------------------------------- Diabetes
  {
    id: "glp1", navn: "GLP-1-receptoragonister", kategori: "Diabetes",
    stoffer: [
      { id: "sema", navn: "Semaglutid s.c. (ugentlig)", soeg: "semaglutid|ozempic|wegovy", samme: "Ozempic-penne: 0,25/0,5, 1 og 2 mg. Wegovy er vægttabs-præparatet (andre doser og tilskudsregler)." },
      { id: "dula", navn: "Dulaglutid (ugentlig)", soeg: "dulaglutid|trulicity", samme: "Penne 0,75–4,5 mg." },
      { id: "lira", navn: "Liraglutid (daglig)", soeg: "liraglutid|victoza|saxenda", samme: "Victoza 0,6–1,8 mg dagligt (Saxenda er vægttabs-præparatet)." },
      { id: "oral", navn: "Semaglutid oral (daglig)", soeg: "rybelsus", samme: "Ny formulering 1,5/4/9 mg svarer til den gamle 3/7/14 mg — ikke mg for mg, og brug kun én formulering ad gangen." },
    ],
    raekker: [
      { niveau: "Startdosis", doser: { sema: "0,25 mg", dula: "0,75 mg", lira: "0,6 mg", oral: "3 mg (ny: 1,5 mg)" } },
      { niveau: "Lav vedligeholdelse", doser: { sema: "0,5 mg", dula: "1,5 mg", lira: "1,2 mg", oral: "7 mg (ny: 4 mg)" } },
      { niveau: "Middel", doser: { sema: "1 mg", dula: "3 mg", lira: "1,8 mg", oral: "14 mg (ny: 9 mg)" } },
      { niveau: "Høj", doser: { sema: "2 mg", dula: "4,5 mg", lira: "—", oral: "—" } },
    ],
    tabelNote: "Der findes ingen præcis ækvivalens — rækkerne er omtrentlige. Semaglutid sænker HbA1c og vægt mere end dulaglutid og liraglutid.",
    skift: [
      "Ugentlig → ugentlig: tag den nye på den dag, den næste dosis af den gamle skulle være taget (ikke før — ellers dobbelt dosis samme uge).",
      "Daglig liraglutid → ugentlig: start dagen efter sidste liraglutid.",
      "Start på et lavt vedligeholdelsestrin, og optrap efter tolerance. Er der gået mere end ca. 2 uger uden GLP-1, så start forfra på startdosis (kvalme).",
      "Tjek tilskudsklausulen for det nye præparat (Lægemiddelstyrelsen).",
    ],
    link: { href: "../diabetes/behandling.html", tekst: "Se Type 2-diabetes — behandling" },
    kilder: ["WAFP: GLP-1 RA Dose Comparisons Chart; BILH: GLP-1 RA conversions and therapy gap management guide (sekundære kilder)", "EMA DHPC 2025: Rybelsus ny formulering (1,5/4/9 mg ≈ 3/7/14 mg)"],
  },
  {
    id: "sglt2", navn: "SGLT-2-hæmmere", kategori: "Diabetes",
    stoffer: [
      { id: "empa", navn: "Empagliflozin", soeg: "empagliflozin|jardiance", samme: "Tabletter 10 og 25 mg." },
      { id: "dapa", navn: "Dapagliflozin", soeg: "dapagliflozin|forxiga", samme: "Tabletter 5 og 10 mg." },
      { id: "cana", navn: "Canagliflozin", soeg: "canagliflozin|invokana", samme: "Tabletter 100 og 300 mg." },
      { id: "ertu", navn: "Ertugliflozin", soeg: "ertugliflozin|steglatro", samme: "Tabletter 5 og 15 mg." },
    ],
    raekker: [
      { niveau: "Standard (også hjertesvigt/nyre)", doser: { empa: "10 mg × 1", dapa: "10 mg × 1", cana: "100 mg × 1", ertu: "5 mg × 1" } },
      { niveau: "Højere (kun mere HbA1c-effekt)", doser: { empa: "25 mg × 1", dapa: "—", cana: "300 mg × 1", ertu: "15 mg × 1" } },
    ],
    tabelNote: "Ved hjertesvigt og kronisk nyresygdom er empagliflozin 10 mg og dapagliflozin 10 mg bedst dokumenteret (canagliflozin 100 mg ved diabetisk nyresygdom).",
    skift: ["Direkte skift. Samme forholdsregler (ketoacidose, genital svamp, pause ved akut sygdom)."],
    kilder: ["Produktresuméer (EMA) for empagliflozin, dapagliflozin, canagliflozin og ertugliflozin"],
  },
  {
    id: "dpp4", navn: "DPP-4-hæmmere", kategori: "Diabetes",
    stoffer: [
      { id: "sita", navn: "Sitagliptin", soeg: "sitagliptin|januvia", samme: "Tabletter 25, 50 og 100 mg." },
      { id: "lina", navn: "Linagliptin", soeg: "linagliptin|trajenta", samme: "Tablet 5 mg." },
      { id: "saxa", navn: "Saxagliptin", soeg: "saxagliptin|onglyza", samme: "Tabletter 2,5 og 5 mg." },
      { id: "vilda", navn: "Vildagliptin", soeg: "vildagliptin|galvus", samme: "Tablet 50 mg." },
    ],
    raekker: [
      { niveau: "Normal nyrefunktion", doser: { sita: "100 mg × 1", lina: "5 mg × 1", saxa: "5 mg × 1", vilda: "50 mg × 2" } },
      { niveau: "Nedsat nyrefunktion", doser: { sita: "eGFR 30–44: 50 mg; < 30: 25 mg", lina: "5 mg × 1 (ingen justering)", saxa: "eGFR < 45: 2,5 mg", vilda: "50 mg × 1 (se produktresumé)" } },
    ],
    skift: ["Direkte skift. Linagliptin er nemmest ved nedsat nyrefunktion."],
    link: { href: "../nyre/dosis.html", tekst: "Se Dosis efter nyrefunktion" },
    kilder: ["Diabetes on the Net: Prescribing pearls — DPP-4 inhibitors; produktresuméer (via Dosis efter nyrefunktion)"],
  },
  {
    id: "metformin", navn: "Metformin", kategori: "Diabetes",
    stoffer: [{ id: "metformin", navn: "Metformin", soeg: "metformin|glucophage", samme: "Tabletter 500, 850 og 1.000 mg samt depottabletter — fx 2 × 500 mg i stedet for 1.000 mg." }],
    forslag: [
      "Anden styrke eller depotform af metformin (ny recept).",
      "Kan metformin slet ikke skaffes: kort pause er sjældent farlig. Ved behov for alternativ: se Type 2-diabetes — behandling (fx DPP-4- eller SGLT-2-hæmmer ud fra komorbiditet og nyrefunktion).",
    ],
    link: { href: "../diabetes/behandling.html", tekst: "Se Type 2-diabetes — behandling" },
    kilder: ["Produktresumé for metformin; Type 2-diabetes-værktøjet"],
  },

  // ---------------------------------------------------------------- Mave-tarm
  {
    id: "ppi", navn: "Protonpumpehæmmere (PPI)", kategori: "Mave-tarm",
    stoffer: [
      { id: "omeprazol", navn: "Omeprazol", soeg: "omeprazol|losec", samme: "Kapsler/tabletter 10, 20 og 40 mg." },
      { id: "esomeprazol", navn: "Esomeprazol", soeg: "esomeprazol|nexium", samme: "Tabletter 20 og 40 mg." },
      { id: "pantoprazol", navn: "Pantoprazol", soeg: "pantoprazol|pantoloc", samme: "Tabletter 20 og 40 mg." },
      { id: "lansoprazol", navn: "Lansoprazol", soeg: "lansoprazol|lanzo", samme: "Kapsler/smeltetabletter 15 og 30 mg." },
      { id: "rabeprazol", navn: "Rabeprazol", soeg: "rabeprazol|pariet", samme: "Tabletter 10 og 20 mg." },
    ],
    raekker: [
      { niveau: "Lav dosis", doser: { omeprazol: "10 mg × 1", esomeprazol: "—", pantoprazol: "20 mg × 1", lansoprazol: "15 mg × 1", rabeprazol: "10 mg × 1" } },
      { niveau: "Fuld dosis", doser: { omeprazol: "20 mg × 1", esomeprazol: "20 mg × 1", pantoprazol: "40 mg × 1", lansoprazol: "30 mg × 1", rabeprazol: "20 mg × 1" } },
      { niveau: "Dobbelt dosis", doser: { omeprazol: "40 mg × 1", esomeprazol: "40 mg × 1", pantoprazol: "40 mg × 2", lansoprazol: "30 mg × 2", rabeprazol: "20 mg × 2" } },
    ],
    tabelNote: "Sammen med clopidogrel foretrækkes pantoprazol (omeprazol og esomeprazol hæmmer omdannelsen af clopidogrel).",
    skift: ["Direkte skift til tilsvarende dosistrin. Overvej samtidig, om behandlingen stadig er nødvendig (seponering/udtrapning)."],
    kilder: ["NICE CG184, Appendix A: dosering af protonpumpehæmmere (lav, fuld og dobbelt dosis)"],
  },

  // ---------------------------------------------------------------- Lunger
  {
    id: "saba", navn: "Korttidsvirkende beta-2-agonister (anfaldsmedicin)", kategori: "Lunger",
    stoffer: [
      { id: "salbutamol", navn: "Salbutamol", soeg: "salbutamol|ventoline|airomir|buventol", samme: "Spray (med spacer) og pulverinhalatorer — skift af inhalatortype kræver instruktion." },
      { id: "terbutalin", navn: "Terbutalin", soeg: "terbutalin|bricanyl", samme: "Pulverinhalator (Turbuhaler) 0,5 mg." },
    ],
    raekker: [
      { niveau: "Ved behov", doser: { salbutamol: "100–200 mikrog. (1–2 pust)", terbutalin: "0,5 mg (1 inhalation), maks. 6 dgl." } },
    ],
    tabelNote: "Ved astma kan budesonid/formoterol ved behov (antiinflammatorisk anfaldsmedicin, GINA) være et alternativ — se Astma-værktøjet.",
    link: { href: "../lunge/astma.html", tekst: "Se Astma" },
    skift: ["Instruér i inhalationsteknikken for den nye inhalator (spray kræver koordination eller spacer; pulver kræver kraftig indånding)."],
    kilder: ["Canadian Thoracic Society 2020: salbutamol shortage — terbutalin Turbuhaler 0,5 mg ved behov, maks. 6 inhalationer dgl.", "GINA 2024"],
  },
  {
    id: "ics", navn: "Inhalationssteroider", kategori: "Lunger",
    stoffer: [
      { id: "budesonid", navn: "Budesonid (pulver)", soeg: "budesonid|pulmicort", samme: "Findes i flere pulverinhalatorer og kombinationer." },
      { id: "bdpstd", navn: "Beclometason (spray, standardpartikler)", soeg: "beclometason|beclomet", samme: "" },
      { id: "bdpfin", navn: "Beclometason (ekstrafine partikler)", soeg: "qvar", samme: "" },
      { id: "flutp", navn: "Fluticasonpropionat", soeg: "fluticasonpropionat|flutide", samme: "" },
      { id: "flutf", navn: "Fluticasonfuroat", soeg: "fluticasonfuroat", samme: "Findes især i kombinationer (fx med vilanterol)." },
      { id: "cicle", navn: "Ciclesonid", soeg: "ciclesonid|alvesco", samme: "" },
    ],
    raekker: [
      { niveau: "Lav døgndosis", doser: { budesonid: "200–400 mikrog.", bdpstd: "200–500 mikrog.", bdpfin: "100–200 mikrog.", flutp: "100–250 mikrog.", flutf: "100 mikrog.", cicle: "80–160 mikrog." } },
      { niveau: "Middel døgndosis", doser: { budesonid: "> 400–800 mikrog.", bdpstd: "> 500–1.000 mikrog.", bdpfin: "> 200–400 mikrog.", flutp: "> 250–500 mikrog.", flutf: "—", cicle: "> 160–320 mikrog." } },
      { niveau: "Høj døgndosis", doser: { budesonid: "> 800 mikrog.", bdpstd: "> 1.000 mikrog.", bdpfin: "> 400 mikrog.", flutp: "> 500 mikrog.", flutf: "200 mikrog.", cicle: "> 320 mikrog." } },
    ],
    tabelNote: "GINA-tabellen viser, hvad der klinisk regnes som lav, middel og høj dosis — ikke præcis styrkeækvivalens. Kombinationsinhalatorer: vælg samme trin.",
    link: { href: "../lunge/astma.html", tekst: "Se Astma" },
    skift: ["Skift til samme dosistrin, instruér i den nye inhalator, og vurder kontrol (fx ACT) efter 4–6 uger."],
    kilder: ["GINA 2024: lav, middel og høj døgndosis af inhalationssteroider (voksne og unge ≥ 12 år)"],
  },
  {
    id: "lama", navn: "Langtidsvirkende antikolinergika (LAMA)", kategori: "Lunger",
    stoffer: [
      { id: "tio", navn: "Tiotropium", soeg: "tiotropium|spiriva", samme: "HandiHaler (pulver) og Respimat (spray) — forskellig teknik." },
      { id: "glyco", navn: "Glycopyrronium", soeg: "glycopyrronium|seebri", samme: "" },
      { id: "umec", navn: "Umeclidinium", soeg: "umeclidinium|incruse", samme: "" },
      { id: "acli", navn: "Aclidinium", soeg: "aclidinium|eklira", samme: "" },
    ],
    raekker: [
      { niveau: "Sædvanlig dosis", doser: { tio: "HandiHaler 18 mikrog. × 1 eller Respimat 2,5 mikrog. × 2 pust × 1", glyco: "44 mikrog. × 1", umec: "55 mikrog. × 1", acli: "322 mikrog. × 2" } },
    ],
    tabelNote: "Præparaterne har omtrent samme effekt ved KOL. Kombinationer med LABA findes for alle.",
    link: { href: "../lunge/kol.html", tekst: "Se KOL" },
    skift: ["Direkte skift. Vælg en inhalatortype, patienten kan bruge, og instruér i teknikken."],
    kilder: ["Netværksmetaanalyse af LAMA-monoterapi ved KOL (PubMed 26604738); produktresuméer (afgivet dosis)"],
  },

  // ---------------------------------------------------------------- Psykiatri og neurologi
  {
    id: "ssri", navn: "SSRI (antidepressiva)", kategori: "Psykiatri og neurologi",
    stoffer: [
      { id: "sertralin", navn: "Sertralin", soeg: "sertralin|zoloft", samme: "Tabletter 25–100 mg." },
      { id: "citalopram", navn: "Citalopram", soeg: "citalopram|cipramil", samme: "Tabletter 10–40 mg. Maks. 40 mg (20 mg ≥ 65 år) pga. QT." },
      { id: "escitalopram", navn: "Escitalopram", soeg: "escitalopram|cipralex", samme: "Tabletter 5–20 mg. Maks. 20 mg (10 mg ≥ 65 år)." },
      { id: "fluoxetin", navn: "Fluoxetin", soeg: "fluoxetin|fontex", samme: "Kapsler/tabletter 20 mg." },
      { id: "paroxetin", navn: "Paroxetin", soeg: "paroxetin|seroxat", samme: "Tabletter 20 mg." },
    ],
    raekker: [
      { niveau: "Sædvanlig dosis (omtrent ækvivalent)", doser: { sertralin: "50 mg", citalopram: "20 mg", escitalopram: "10 mg", fluoxetin: "20 mg", paroxetin: "20 mg" } },
    ],
    tabelNote: "Ækvivalensen er omtrentlig — der findes ingen præcise omregninger.",
    skift: [
      "Mellem SSRI (undtagen fluoxetin) kan der som regel skiftes direkte til ækvivalent dosis.",
      "Fra fluoxetin: lang halveringstid — start den nye lavt og optrap langsomt (risiko for serotonergt syndrom).",
      "Fra paroxetin: størst risiko for seponeringssymptomer — skift uden pause.",
      "Opfølgning efter 2–4 uger (effekt, bivirkninger, selvmordstanker hos unge).",
    ],
    kilder: ["BC Guidelines (Canada), Depression Appendix D: Switching antidepressants", "SPS (UK): SSRIs to other antidepressants — switching in adults (via sekundære kilder)"],
  },
  {
    id: "triptan", navn: "Triptaner (migræne)", kategori: "Psykiatri og neurologi",
    stoffer: [
      { id: "suma", navn: "Sumatriptan", soeg: "sumatriptan|imigran", samme: "Tabletter 50/100 mg, næsespray og injektion." },
      { id: "riza", navn: "Rizatriptan", soeg: "rizatriptan|maxalt", samme: "Tabletter og smeltetabletter 10 mg." },
      { id: "zolmi", navn: "Zolmitriptan", soeg: "zolmitriptan|zomig", samme: "Tabletter/smeltetabletter 2,5 og 5 mg, næsespray." },
      { id: "ele", navn: "Eletriptan", soeg: "eletriptan|relpax", samme: "Tabletter 20 og 40 mg." },
      { id: "almo", navn: "Almotriptan", soeg: "almotriptan|almogran", samme: "Tablet 12,5 mg." },
      { id: "nara", navn: "Naratriptan", soeg: "naratriptan|naramig", samme: "Tablet 2,5 mg." },
    ],
    raekker: [
      { niveau: "Sædvanlig dosis ved anfald", doser: { suma: "50–100 mg", riza: "10 mg (5 mg med propranolol)", zolmi: "2,5–5 mg", ele: "40 mg (evt. 80 mg)", almo: "12,5 mg", nara: "2,5 mg" } },
    ],
    tabelNote: "Effekten er individuel. Eletriptan, rizatriptan og almotriptan har størst effekt i metaanalyser; naratriptan virker langsommere, men mildere.",
    skift: ["Skift frit mellem triptaner. Samme kontraindikationer (hjerte-kar-sygdom) og højst 2 doser pr. anfald."],
    kilder: ["Thorlund et al., Cephalalgia 2014: sammenlignende effekt af triptaner (netværksmetaanalyse)", "AAFP 2002: Comparing oral triptans"],
  },
  {
    id: "opioid", navn: "Opioider (omregning til oral morfin)", kategori: "Smerter",
    stoffer: [
      { id: "morfin", navn: "Morfin oral", soeg: "morfin|contalgin|oramorph", samme: "Tabletter, depottabletter og mikstur." },
      { id: "oxy", navn: "Oxycodon oral", soeg: "oxycodon|oxynorm|oxycontin", samme: "Kapsler, depottabletter og mikstur." },
      { id: "hydro", navn: "Hydromorfon oral", soeg: "hydromorfon|palladon", samme: "" },
      { id: "tram", navn: "Tramadol", soeg: "tramadol|tradolan", samme: "Maks. 400 mg/døgn." },
      { id: "kodein", navn: "Kodein", soeg: "kodein|codein|kodimagnyl", samme: "Maks. 240 mg/døgn." },
    ],
    raekker: [
      { niveau: "Døgndosis svarende til oral morfin 30 mg", doser: { morfin: "30 mg", oxy: "15–20 mg", hydro: "6 mg", tram: "150–300 mg", kodein: "200 mg" } },
      { niveau: "Svarende til oral morfin 60 mg", doser: { morfin: "60 mg", oxy: "30–40 mg", hydro: "12 mg", tram: "— (over maks.)", kodein: "— (over maks.)" } },
      { niveau: "Svarende til oral morfin 120 mg", doser: { morfin: "120 mg", oxy: "60–80 mg", hydro: "24 mg", tram: "—", kodein: "—" } },
    ],
    tabelNote: "Omregningsfaktorer til oral morfin: oxycodon 1,5–2, hydromorfon 5, tramadol 0,1–0,2, kodein 0,15. Tallene er beregnede ækvivalenser — start IKKE på fuld ækvivalent dosis (se nedenfor). Transdermale opioider er ikke medtaget.",
    skift: [
      "Start med 50–75 % af den beregnede ækvivalente døgndosis (ufuldstændig krydstolerance), og giv p.n.-dosis.",
      "Tramadol og kodein virker via CYP2D6 — effekten varierer meget mellem personer.",
      "Tæt opfølgning (sedation, respiration, obstipation). Ved høje doser eller palliation: konferér med smerte-/palliativt team.",
    ],
    kilder: ["CDC 2022 / UCSF: omregningsfaktorer til oral morfin (MME)", "Palliative Care Network of Wisconsin, Fast Fact: Calculating opioid dose conversions — reducér 25–50 % ved skift"],
  },

  {
    id: "gabapentinoid", navn: "Gabapentinoider (neuropatiske smerter, angst)", kategori: "Smerter",
    stoffer: [
      { id: "gaba", navn: "Gabapentin", soeg: "gabapentin|neurontin", samme: "Kapsler/tabletter 100–800 mg, fordelt på 3 doser." },
      { id: "prega", navn: "Pregabalin", soeg: "pregabalin|lyrica", samme: "Kapsler 25–300 mg, fordelt på 2 doser." },
    ],
    raekker: [
      { niveau: "Lav", doser: { gaba: "900 mg/døgn (300 mg × 3)", prega: "150 mg/døgn (75 mg × 2)" } },
      { niveau: "Middel", doser: { gaba: "1.800 mg/døgn (600 mg × 3)", prega: "300 mg/døgn (150 mg × 2)" } },
      { niveau: "Høj", doser: { gaba: "3.600 mg/døgn (1.200 mg × 3)", prega: "600 mg/døgn (300 mg × 2)" } },
    ],
    tabelNote: "Omtrentligt forhold gabapentin : pregabalin = 6 : 1 (døgndosis). Begge dosisreduceres ved nedsat nyrefunktion. Ved epilepsi: konferér med neurolog.",
    link: { href: "../nyre/dosis.html", tekst: "Se Dosis efter nyrefunktion" },
    skift: [
      "Direkte skift: stop det ene, og start det andet ved næste planlagte dosis — eller 50/50 i 4 dage.",
      "Følg op efter 1–2 uger (effekt, svimmelhed, sedation). Begge har misbrugspotentiale.",
    ],
    kilder: ["SPS (UK): Switching between gabapentin and pregabalin for neuropathic pain; Bockbrader et al. 2013 (farmakokinetisk simulation, PubMed 23018586) — via sekundære kilder"],
  },
  {
    id: "steroid", navn: "Glukokortikoider (systemisk)", kategori: "Hormoner",
    stoffer: [
      { id: "pred", navn: "Prednisolon", soeg: "prednisolon", samme: "Tabletter 1, 2,5, 5 og 25 mg." },
      { id: "prednison", navn: "Prednison", soeg: "prednison", samme: "" },
      { id: "methyl", navn: "Methylprednisolon", soeg: "methylprednisolon|medrol", samme: "" },
      { id: "hydro", navn: "Hydrocortison", soeg: "hydrocortison tablet|hydrocortone", samme: "Bruges især som substitution ved binyrebarkinsufficiens." },
      { id: "dexa", navn: "Dexamethason", soeg: "dexamethason", samme: "" },
    ],
    raekker: [
      { niveau: "Svarende til prednisolon 5 mg", doser: { pred: "5 mg", prednison: "5 mg", methyl: "4 mg", hydro: "20 mg", dexa: "0,75 mg" } },
      { niveau: "Svarende til prednisolon 25 mg", doser: { pred: "25 mg", prednison: "25 mg", methyl: "20 mg", hydro: "100 mg (frarådes — mineralokortikoid effekt)", dexa: "3,75 mg" } },
    ],
    tabelNote: "Ækvivalens for antiinflammatorisk effekt. Hydrocortison har mineralokortikoid effekt (væske, blodtryk); dexamethason har ingen og virker længere.",
    skift: [
      "Direkte skift til ækvivalent dosis. Må ikke pauseres ved længere behandling (binyrebarkinsufficiens).",
      "Ved binyrebarkinsufficiens (substitution): konferér med endokrinolog før skift fra hydrocortison.",
    ],
    kilder: ["BNF / MDCalc: glukokortikoid-ækvivalens — prednisolon 5 mg ≈ methylprednisolon 4 mg ≈ hydrocortison 20 mg ≈ dexamethason 0,75 mg"],
  },

  // ---------------------------------------------------------------- Allergi
  {
    id: "antihist", navn: "Antihistaminer (2. generation)", kategori: "Allergi",
    stoffer: [
      { id: "cet", navn: "Cetirizin", soeg: "cetirizin|zyrtec", samme: "Tablet 10 mg og mikstur (håndkøb)." },
      { id: "levocet", navn: "Levocetirizin", soeg: "levocetirizin|xyzal", samme: "" },
      { id: "lora", navn: "Loratadin", soeg: "loratadin|clarityn", samme: "Tablet 10 mg (håndkøb)." },
      { id: "deslora", navn: "Desloratadin", soeg: "desloratadin|aerius", samme: "" },
      { id: "fexo", navn: "Fexofenadin", soeg: "fexofenadin|telfast", samme: "" },
      { id: "bila", navn: "Bilastin", soeg: "bilastin|bilaxten", samme: "" },
    ],
    raekker: [
      { niveau: "Sædvanlig voksendosis", doser: { cet: "10 mg × 1", levocet: "5 mg × 1", lora: "10 mg × 1", deslora: "5 mg × 1", fexo: "120–180 mg × 1", bila: "20 mg × 1" } },
    ],
    tabelNote: "Ved kronisk urticaria må dosis øges op til 4 gange (specialistvejledning).",
    skift: ["Skift frit. Mange findes i håndkøb."],
    kilder: ["ebm.one: Newer-generation oral antihistamines used in allergic rhinitis; netværksmetaanalyse ved kronisk urticaria (PMC)"],
  },
  {
    id: "adrenalin", navn: "Adrenalin-autoinjektorer", kategori: "Allergi",
    stoffer: [{ id: "adr", navn: "Adrenalin autoinjektor", soeg: "adrenalin|epipen|jext|emerade|autoinjektor", samme: "0,15 mg (børn 15–30 kg) og 0,3 mg." }],
    forslag: [
      "Anden autoinjektor i samme styrke (fx EpiPen eller Jext).",
      "Teknikken er forskellig mellem mærkerne: instruér patienten (og forældre/institution) og udlever en ny trænings-pen.",
      "Patienten skal altid have 2 autoinjektorer.",
    ],
    kilder: ["GPnotebook: Adrenaline auto-injectors; MHRA-råd om forskellig teknik mellem mærker (via sekundære kilder)"],
  },

  // ---------------------------------------------------------------- Kvindesundhed
  {
    id: "oestrogen", navn: "Østrogen til MHT (systemisk)", kategori: "Kvindesundhed",
    stoffer: [
      { id: "plaster", navn: "Estradiol plaster", soeg: "vivelle|estradiol ?plaster|evorel", samme: "25–100 mikrog./24 t, skiftes 2 × ugentligt." },
      { id: "divigel", navn: "Divigel (gel, breve)", soeg: "divigel", samme: "Breve 0,5 og 1 mg." },
      { id: "estrogel", navn: "Estrogel (gel, pumpe)", soeg: "estrogel|oestrogel", samme: "1 pumpetryk = 0,75 mg estradiol." },
      { id: "lenzetto", navn: "Lenzetto (spray)", soeg: "lenzetto", samme: "" },
      { id: "tablet", navn: "Estradiol tablet", soeg: "estrofem|estradiol tablet|progynova", samme: "Tabletter 1 og 2 mg." },
    ],
    raekker: [
      { niveau: "Lav", doser: { plaster: "25 mikrog.", divigel: "0,5 mg", estrogel: "1 tryk", lenzetto: "1 pust", tablet: "1 mg" } },
      { niveau: "Standard", doser: { plaster: "50 mikrog.", divigel: "1 mg", estrogel: "2 tryk", lenzetto: "2–3 pust", tablet: "1–2 mg" } },
      { niveau: "Høj", doser: { plaster: "75–100 mikrog.", divigel: "1,5 mg", estrogel: "3–4 tryk", lenzetto: "3 pust (maks.)", tablet: "2–4 mg" } },
    ],
    tabelNote: "Samme ækvivalenstabel som Klimakterieguiden (BMS). Optagelsen varierer meget — titrér efter effekt. Transdermal behandling foretrækkes ved øget risiko for blodprop.",
    link: { href: "../index.html", tekst: "Se Klimakterieguiden" },
    skift: [
      "Skift direkte til samme dosistrin — også mellem tablet og transdermal.",
      "Gestagenbehandlingen (Utrogestan/Mirena) fortsætter uændret.",
      "Vurder effekt og blødningsmønster efter ca. 3 måneder.",
    ],
    kilder: ["BMS: HRT preparations and equivalent alternatives (via Klimakterieguidens kildeliste)"],
  },
  {
    id: "gestagen", navn: "Gestagen til endometriebeskyttelse (MHT)", kategori: "Kvindesundhed",
    stoffer: [
      { id: "utro", navn: "Mikroniseret progesteron", soeg: "utrogestan|progesteron", samme: "Kun 100 mg kapsler i Danmark." },
      { id: "mirena", navn: "Levonorgestrel-spiral 52 mg", soeg: "mirena", samme: "Godkendt til endometriebeskyttelse i op til 5 år (ikke Kyleena/Jaydess)." },
    ],
    raekker: [
      { niveau: "Kontinuerlig (blødningsfri)", doser: { utro: "100 mg dgl. (200 mg ved høj østrogendosis)", mirena: "Mirena" } },
      { niveau: "Sekventiel", doser: { utro: "200 mg dgl. i 12–14 dage/cyklus (300 mg ved høj østrogendosis)", mirena: "—" } },
    ],
    tabelNote: "Andre gestagener (fx medroxyprogesteron, norethisteron, dydrogesteron eller et kombinationspræparat) kan bruges i BMS-anbefalede doser — tjek dansk udbud og produktresumé.",
    link: { href: "../index.html", tekst: "Se Klimakterieguiden" },
    skift: [
      "Endometriet skal fortsat beskyttes — østrogen alene til en kvinde med livmoder kun i kort tid (højst få uger).",
      "Blødning efter skift: vurder efter 3–6 måneder; vedvarende eller ny blødning skal udredes.",
    ],
    kilder: ["BMS Tools for Clinicians: Progestogens and endometrial protection (2026)", "Klimakterieguidens kildeliste"],
  },
  {
    id: "lokalOestrogen", navn: "Lokal vaginal østrogen", kategori: "Kvindesundhed",
    stoffer: [
      { id: "vagi", navn: "Estradiol 10 mikrog. vaginaltablet", soeg: "vagifem|vagirux|vagidonna", samme: "" },
      { id: "ovestin", navn: "Østriol (creme/vagitorier)", soeg: "ovestin|østriol|estriol", samme: "" },
      { id: "estring", navn: "Estradiol vaginalring", soeg: "estring", samme: "7,5 mikrog./24 t, skiftes hver 3. måned." },
    ],
    raekker: [
      { niveau: "Vedligeholdelse", doser: { vagi: "1 tablet 2 × ugentligt", ovestin: "2 × ugentligt", estring: "1 ring hver 3. måned" } },
    ],
    skift: ["Skift frit. Start evt. med daglig brug i 2 uger af det nye præparat."],
    link: { href: "../index.html", tekst: "Se Klimakterieguiden" },
    kilder: ["Klimakterieguiden (DSOG, NRL)"],
  },
  {
    id: "ppiller", navn: "P-piller og minipiller", kategori: "Kvindesundhed",
    stoffer: [
      { id: "lng", navn: "Levonorgestrel + ethinylestradiol", soeg: "mirabella|microgyn|rigevidon|femicept|levonorgestrel", samme: "Mirabella 100/20 mikrog.; Microgyn/Rigevidon/Femicept 150/30 mikrog." },
      { id: "desoc", navn: "Desogestrel/gestoden + ethinylestradiol", soeg: "desogestrel.*ethinyl|gestoden|marvelon|mercilon|gestinyl|harmonet", samme: "" },
      { id: "dros", navn: "Drospirenon + ethinylestradiol", soeg: "yasmin|yaz|drospirenon.*ethinyl", samme: "" },
      { id: "mini", navn: "Minipille desogestrel 75 mikrog.", soeg: "cerazette|desogestrel", samme: "Findes fra flere firmaer (samme indhold)." },
      { id: "slinda", navn: "Minipille drospirenon 4 mg", soeg: "slinda", samme: "" },
    ],
    forslag: [
      "Samme indhold fra et andet firma: skift direkte uden pause og uden ekstra beskyttelse.",
      "Ellers et præparat med samme gestagentype (VTE-risikoen afhænger af gestagenet — levonorgestrel og norgestimat har lavest risiko).",
      "Skift mellem p-piller: start ny pakke dagen efter sidste aktive tablet (spring pausen over) — så er beskyttelsen uafbrudt.",
      "Minipille → minipille: skift direkte. P-pille → minipille: start dagen efter sidste aktive p-pille.",
      "Kvinder, der ikke må få østrogen (fx migræne med aura, ammende), skal forblive på et gestagenpræparat.",
    ],
    link: { href: "../praevention.html", tekst: "Se Præventionsguiden" },
    kilder: ["FSRH: Combined hormonal contraception (2023) og Progestogen-only pills (2022, rev. 2026)", "Præventionsguidens kildeliste (NRL, EMA)"],
  },
  {
    id: "levothyroxin", navn: "Levothyroxin", kategori: "Hormoner",
    stoffer: [{ id: "levo", navn: "Levothyroxin", soeg: "levothyroxin|eltroxin|euthyrox", samme: "Tabletter 25–125 mikrog. — samme døgndosis kan sammensættes af andre styrker." }],
    forslag: [
      "Anden styrke eller andet mærke af levothyroxin i samme døgndosis.",
      "Kontrollér TSH 6–8 uger efter skift af præparat — optagelsen kan variere (snævert terapeutisk interval).",
      "Liothyronin (T3) er ikke et alternativ.",
    ],
    link: { href: "../thyreoidea/hypothyreose.html", tekst: "Se Hypothyreose" },
    kilder: ["MHRA / ATA: kontrol af TSH efter skift af levothyroxinpræparat", "Hypothyreose-værktøjets kildeliste"],
  },
  {
    id: "osteoporose", navn: "Osteoporosemidler", kategori: "Knogler",
    stoffer: [
      { id: "alen", navn: "Alendronat", soeg: "alendronat|fosamax", samme: "Tablet 70 mg ugentligt." },
      { id: "rise", navn: "Risedronat", soeg: "risedronat|optinate", samme: "Tablet 35 mg ugentligt." },
      { id: "zol", navn: "Zoledronsyre", soeg: "zoledronsyre|aclasta", samme: "Infusion 5 mg årligt." },
      { id: "deno", navn: "Denosumab", soeg: "denosumab|prolia|jubbonti|obodence|stoboclo|ospomyv|ponlimsi", samme: "Flere biosimilære præparater er godkendt i EU siden 2024 (fx Jubbonti, Obodence) — samme dosis." },
    ],
    raekker: [
      { niveau: "Sædvanlig dosis", doser: { alen: "70 mg × 1 ugentligt", rise: "35 mg × 1 ugentligt", zol: "5 mg i.v. årligt", deno: "60 mg s.c. hver 6. måned" } },
    ],
    tabelNote: "Denosumab må aldrig forsinkes over 7 måneder (rebound-frakturer) — skift til biosimilær denosumab i stedet for at vente.",
    link: { href: "../osteoporose.html", tekst: "Se Osteoporose" },
    skift: [
      "Alendronat ↔ risedronat: direkte skift (risedronat kan bruges ned til eGFR 30).",
      "Denosumab: skift til biosimilær denosumab i samme dosis og interval. Er ingen denosumab tilgængelig: zoledronsyre efter aftale med endokrinolog.",
    ],
    kilder: ["DSAM 2024 og DES' NBV (via Osteoporose-værktøjets kildeliste)", "EMA/EU-godkendelser af denosumab-biosimilærer 2024–2025"],
  },

  // ---------------------------------------------------------------- Infektioner
  {
    id: "penicillin", navn: "Penicillin V", kategori: "Infektioner",
    stoffer: [{ id: "penv", navn: "Phenoxymethylpenicillin (penicillin V)", soeg: "penicillin v|phenoxymethylpenicillin|primcillin|vepicombin|penicillin", samme: "Tabletter i flere styrker og mikstur — i restordreperioder bruges den styrke, der kan skaffes (ny recept)." }],
    forslag: [
      "Anden styrke eller form af penicillin V (tablet ↔ mikstur).",
      "Otitis, sinuitis og pneumoni: amoxicillin er et alternativ (dosis i Luftveje-værktøjet).",
      "Børn med compliance-problemer: amoxicillin mikstur eller dispergible tabletter (Region Hovedstaden).",
      "Tonsillitis: penicillin V er førstevalg — brug så vidt muligt en anden styrke/form; følg regionens antibiotikavejledning ved reel mangel.",
    ],
    link: { href: "../infektion/luftveje.html", tekst: "Se Luftveje" },
    kilder: ["Region Hovedstaden: Antibiotikavejledning for primærsektoren 2025 — penicillin til børn, praktiske håndgreb (via sekundære kilder)", "DSAM 2024: Akutte luftvejsinfektioner"],
  },
  {
    id: "uvi", navn: "Antibiotika mod blærebetændelse", kategori: "Infektioner",
    stoffer: [
      { id: "pivm", navn: "Pivmecillinam", soeg: "pivmecillinam|selexid", samme: "Tabletter 200 og 400 mg." },
      { id: "nitro", navn: "Nitrofurantoin", soeg: "nitrofurantoin|furadantin", samme: "" },
      { id: "trim", navn: "Trimethoprim", soeg: "trimethoprim", samme: "" },
      { id: "sulfa", navn: "Sulfamethizol", soeg: "sulfamethizol|lucosil", samme: "" },
    ],
    raekker: [
      { niveau: "Ukompliceret cystitis (voksne kvinder)", doser: { pivm: "400 mg × 3 i 3 dage", nitro: "100 mg × 4 i 3 dage (ikke eGFR < 45)", trim: "200 mg × 2 i 3 dage (efter resistens)", sulfa: "1 g × 2 i 3 dage (efter resistens)" } },
    ],
    tabelNote: "Samme doser som Urinveje-værktøjet. Ved feber, graviditet, mænd og børn: brug Urinveje-værktøjet.",
    link: { href: "../infektion/urinveje.html", tekst: "Se Urinveje" },
    skift: ["Nitrofurantoin er førstevalg, hvis pivmecillinam mangler (og eGFR ≥ 45). Trimethoprim og sulfamethizol helst efter resistensbestemmelse."],
    kilder: ["Region Hovedstaden: Antibiotikavejledning 2025 — akut ukompliceret cystitis (via Urinveje-værktøjets kildeliste)"],
  },
];
