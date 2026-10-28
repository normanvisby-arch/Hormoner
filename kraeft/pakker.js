/*
 * Vidensbase: Sundhedsstyrelsens pakkeforløb for kræft — indgangskriterier set
 * fra almen praksis. Hver pakke har:
 *   begrundet  begrundet mistanke → henvisning i pakkeforløbet
 *   mistanke   mistanke → filterfunktion eller udredning først
 *   gp         hvad der gøres i almen praksis (må ikke forsinke henvisningen)
 *   henvis     hvortil
 *   obs        afgrænsning og faldgruber
 * Bruges af kraeft.js; huskeskema.html har de samme kriterier (tjekkes i
 * tests/kraeft.test.js).
 */
var KRAEFT_PAKKER = [
  // ---------------------------------------------------------------- Lunger og brysthule
  {
    id: "lunge", navn: "Lungekræft", gruppe: "Lunger og brysthule",
    ord: "lunge lungecancer hoste hæmoptyse blodigt opspyt åndenød infiltrat røntgen ct thorax ryger rygning kol bronkitis lungemetastase",
    begrundet: [
      "Malignitetssuspekt infiltrat, rumopfyldende proces eller mediastinal tumor på røntgen eller CT af thorax",
      "Meget stærk klinisk mistanke, også ved normalt røntgen (ca. 15 % af lungekræft ses ikke på røntgen)",
      "Metastaser i lungerne uden kendt primærtumor",
    ],
    mistanke: [
      "Hæmoptyse — CT af thorax og øvre abdomen uanset alder og rygning",
      "Over 40 år med nuværende eller tidligere rygning og: hoste i mere end 4–6 uger, ændret hostemønster ved kronisk bronkitis/KOL, nytilkommen åndenød med abnorm spirometri eller andre symptomer, der kan skyldes lungekræft",
    ],
    gp: [
      "CT af thorax og øvre abdomen med kontrast (direkte adgang fra almen praksis) — et normalt røntgen af thorax udelukker ikke lungekræft",
      "Kreatinin/eGFR før kontrast",
    ],
    henvis: "Lungemedicinsk afdeling — pakkeforløb for lungekræft",
    obs: [
      "Hæshed i mere end 3–4 uger alene → øre-næse-halslæge (larynx).",
      "Ved vena cava superior-syndrom, stridor eller massiv hæmoptyse: akut indlæggelse.",
    ],
  },
  {
    id: "mesotheliom", navn: "Lungehindekræft (mesotheliom)", gruppe: "Lunger og brysthule",
    ord: "lungehinde mesotheliom pleura pleuraekssudat pleuraansamling asbest brystsmerter åndenød",
    begrundet: [
      "Klinisk mistanke og røntgen-/CT-fund: pleurafortykkelse eller tumor, ensidig pleuraansamling (eksudat), skrumpning af hemithorax eller pleurale forkalkninger",
    ],
    mistanke: [
      "Længerevarende brystsmerter, åndenød eller mere end én uforklaret ensidig pleuraansamling — især ved tidligere asbesteksponering",
    ],
    gp: [
      "Røntgen eller CT af thorax",
      "Erhvervsanamnese (asbest) — og anmeld mulig arbejdsbetinget sygdom",
    ],
    henvis: "Lungemedicinsk afdeling — pakkeforløb for lungehindekræft",
    obs: ["Asbesteksponering alene uden symptomer eller fund er ikke indgangskriterium."],
  },

  // ---------------------------------------------------------------- Mave-tarm
  {
    id: "tyktarm", navn: "Kræft i tyk- og endetarm", gruppe: "Mave og tarm",
    ord: "tyktarm endetarm colon rectum kolorektal blødning rektal blod i afføringen ændret afføring diarré forstoppelse mavesmerter jernmangel anæmi koloskopi",
    begrundet: [
      "Blødning fra tarmen uden oplagt årsag",
      "Ændret afføringsmønster i mere end 4 uger",
      "Nytilkomne mavesmerter i mere end 4 uger",
      "Uforklaret jernmangel- eller blødningsanæmi",
      "Tumor ved rektaleksploration eller på billeddiagnostik",
    ],
    mistanke: [],
    gp: [
      "Abdominalpalpation og rektaleksploration",
      "Hæmoglobin, MCV og ferritin (jernmangel); evt. gynækologisk undersøgelse",
      "Henvis, når anden årsag ikke er bekræftet — kriterierne gælder især fra 40 år, men også yngre uden anden forklaring",
    ],
    henvis: "Kirurgisk eller medicinsk gastroenterologisk afdeling (koloskopi/CT-kolografi) — pakkeforløb for tyk- og endetarmskræft",
    obs: [
      "Kendte hæmorider forklarer kun blødningen, hvis de sikkert er kilden.",
      "Arvelig disposition (fx Lynch-syndrom): lav tærskel.",
      "Positiv screeningstest (iFOBT) håndteres af screeningsprogrammet.",
    ],
  },
  {
    id: "anal", navn: "Analkræft", gruppe: "Mave og tarm",
    ord: "anal analkanal anus endetarmsåbning blødning smerter knude kløe sekretion hpv",
    begrundet: ["Tumor i analkanalen eller ved anus påvist (synlig/palpabel) eller biopsi med kræft"],
    mistanke: [
      "Blødning, smerter, knude/udfyldning, fækal inkontinens, kløe eller sekretion fra anus uden oplagt forklaring",
    ],
    gp: ["Inspektion og rektaleksploration"],
    henvis: "Mistanke: kirurgisk speciallæge eller afdeling (anoskopi og biopsi). Begrundet mistanke: pakkeforløb for analkræft",
    obs: ["Øget risiko ved HPV, hiv og immunsuppression."],
  },
  {
    id: "spiseroer", navn: "Kræft i spiserør, mavemund og mavesæk", gruppe: "Mave og tarm",
    ord: "spiserør øsofagus mavesæk ventrikel cardia mavemund dysfagi synkebesvær opkastning dyspepsi refluks halsbrand hæmatemese melæna gastroskopi",
    begrundet: [
      "Mistanke ud fra symptomer: synkebesvær (dysfagi), vedvarende opkastning, blødning fra øvre mave-tarmkanal, uforklaret vægttab med øvre mave-tarmsymptomer, nyopstået dyspepsi/refluks hos ældre (fx over 45 år i Region Sjælland)",
      "Malignitetssuspekte fund ved billeddiagnostik eller gastroskopi",
    ],
    mistanke: [],
    gp: [
      "Henvis direkte til gastroskopi i pakkeforløbet — ventetid på blodprøver må ikke forsinke henvisningen",
      "Hæmoglobin og ferritin",
    ],
    henvis: "Gastroskopi i pakkeforløb (medicinsk/kirurgisk gastroenterologisk afdeling)",
    obs: [
      "Høj dysfagi eller fornemmelse i halsen → øre-næse-halslæge (evt. neurolog).",
      "Dyspepsi hos yngre uden alarmsymptomer: test og behandl for H. pylori — ikke pakkeforløb.",
      "Hæmatemese med kredsløbspåvirkning: akut indlæggelse.",
    ],
  },
  {
    id: "pancreas", navn: "Kræft i bugspytkirtel, galdegange og lever", gruppe: "Mave og tarm",
    ord: "bugspytkirtel pancreas galdegange galdeveje lever hepatocellulær ikterus gulsot levertumor levermetastase",
    begrundet: [
      "Ikterus uden åbenlys forklaring",
      "Tumor i pancreas, duodenum, galdeveje eller lever på billeddiagnostik",
      "Uafklaret proces i pancreas (fx cyster, men ikke pseudocyster)",
    ],
    mistanke: [],
    gp: [
      "Bilirubin, basisk fosfatase og ALAT",
      "Ultralyd eller CT ved ikterus, hvis det kan ske uden forsinkelse",
    ],
    henvis: "Kirurgisk gastroenterologisk afdeling (lever, galdeveje og pancreas) — pakkeforløb",
    obs: [
      "Uspecifikke symptomer (vægttab, mave- eller rygsmerter, kvalme, træthed) → diagnostisk pakkeforløb.",
      "CA 19-9 tages ikke i almen praksis.",
    ],
  },

  // ---------------------------------------------------------------- Urinveje og mandlige kønsorganer
  {
    id: "prostata", navn: "Prostatakræft", gruppe: "Urinveje og mandlige kønsorganer",
    ord: "prostata psa rektaleksploration vandladning luts",
    begrundet: [
      "Suspekt prostata ved rektaleksploration (hård, uregelmæssig)",
      "PSA over aldersgrænsen ved to målinger (urinvejsinfektion udelukket): under 60 år over 3,0 — 60–70 år over 4,0 — over 70 år over 5,0 ng/ml",
    ],
    mistanke: [],
    gp: [
      "Rektaleksploration; urinstix/dyrkning (udeluk UVI); gentag PSA",
      "Send med henvisningen: PSA, kreatinin, hæmoglobin og basisk fosfatase",
    ],
    henvis: "Urologisk afdeling — pakkeforløb for prostatakræft",
    obs: [
      "Vandladningsgener (LUTS) alene: PSA kun ved mistanke om prostatakræft, familiær disposition eller tegn på spredning (knoglesmerter).",
      "Rygsmerter med neurologiske udfald (mulig medullær kompression): akut indlæggelse.",
    ],
  },
  {
    id: "urinveje", navn: "Kræft i blære og nyre (urinvejene)", gruppe: "Urinveje og mandlige kønsorganer",
    ord: "blære nyre nyrebækken urinleder hæmaturi blod i urinen makroskopisk mikroskopisk flankesmerter",
    begrundet: [
      "Makroskopisk hæmaturi uden anden åbenbar årsag (dysreguleret antikoagulation og førstegangs-UVI er andre årsager — kontrollér, at hæmaturien forsvinder)",
      "Mikroskopisk hæmaturi hos personer over 60 år med mindst ét af: smerter i blæreregionen, irritative vandladningsgener, flankesmerter eller palpabel udfyldning",
      "Palpabel udfyldning ved nyren eller tumor i nyre/urinveje på billeddiagnostik",
    ],
    mistanke: [],
    gp: ["Urinstix og dyrkning", "Kreatinin/eGFR"],
    henvis: "Urologisk afdeling — pakkeforløb for kræft i urinvejene",
    obs: [
      "Asymptomatisk mikroskopisk hæmaturi: ingen kræftudredning — overvej nyremedicinsk vurdering ved proteinuri eller nedsat eGFR.",
    ],
  },
  {
    id: "testikel", navn: "Testikelkræft", gruppe: "Urinveje og mandlige kønsorganer",
    ord: "testikel testis scrotum knude hævelse gynækomasti afp hcg",
    begrundet: [
      "Knudret tumor i testis",
      "Diffus forstørrelse af testis uden forklaring",
      "Nyopstået gynækomasti hos yngre mand",
      "Forhøjet AFP, der ikke kan forklares af leversygdom",
    ],
    mistanke: ["Forstørrelse, der persisterer efter 3 ugers antibiotika for epididymitis → urolog/ultralyd"],
    gp: ["Palpation af testikler; HCG, AFP og LDH kan tages, men må ikke forsinke henvisningen"],
    henvis: "Urologisk afdeling — pakkeforløb for testikelkræft",
    obs: [],
  },
  {
    id: "penis", navn: "Peniskræft", gruppe: "Urinveje og mandlige kønsorganer",
    ord: "penis glans forhud sår misfarvning knude",
    begrundet: ["Synlig eller palpabel tumor på penis, eller biopsi med kræft"],
    mistanke: ["Misfarvning, sår eller forandring på glans eller forhud, der ikke heler"],
    gp: ["Inspektion; palpation af lyskelymfeknuder"],
    henvis: "Mistanke: urolog eller dermatolog (biopsi). Begrundet mistanke: urologisk afdeling — pakkeforløb",
    obs: [],
  },

  // ---------------------------------------------------------------- Bryst og kvindelige kønsorganer
  {
    id: "bryst", navn: "Brystkræft", gruppe: "Bryst og kvindelige kønsorganer",
    ord: "bryst mamma brystkræft knude armhule aksil lymfeknude brystvorte indtrækning eksem sekretion mand",
    begrundet: [
      "Knude i brystet",
      "Hud- eller brystvorteforandringer: indtrækning, sår, eksem på brystvorten, appelsinhud eller blodig sekretion",
      "Forstørret lymfeknude i armhulen hos kvinde uden anden forklaring",
    ],
    mistanke: [],
    gp: ["Palpation af begge bryster og armhuler; beskriv fund (side, kvadrant, størrelse) og hudforandringer i henvisningen"],
    henvis: "Mammaradiologisk/brystkirurgisk afdeling (klinisk mammografi, ultralyd og biopsi) — pakkeforløb for brystkræft",
    obs: ["Mænd henvises på samme måde.", "Fund ved screening håndteres af screeningsprogrammet."],
  },
  {
    id: "livmoderhals", navn: "Livmoderhalskræft", gruppe: "Bryst og kvindelige kønsorganer",
    ord: "livmoderhals cervix celleprøve postkoital blødning mellemblødning udflåd hpv",
    begrundet: [
      "Synlig malignitetssuspekt tumor på livmoderhalsen",
      "Celleprøve eller biopsi med kræft eller mistanke om kræft",
    ],
    mistanke: [
      "Postkoital blødning, mellemblødning eller ildelugtende/blodigt udflåd → gynækologisk undersøgelse med spekulum (en celleprøve alene er ikke nok)",
    ],
    gp: ["Gynækologisk undersøgelse med spekulum og bimanuel palpation; evt. celleprøve"],
    henvis: "Mistanke: praktiserende gynækolog. Begrundet mistanke: gynækologisk afdeling — pakkeforløb",
    obs: [
      "Præmenopausal kvinde med postkoital blødning, normal livmoderhals og normal celleprøve: ikke pakkeforløb.",
      "Blødning efter menopausen: se livmoderkræft.",
    ],
  },
  {
    id: "livmoder", navn: "Livmoderkræft (endometriecancer)", gruppe: "Bryst og kvindelige kønsorganer",
    ord: "livmoder endometrie corpus postmenopausal blødning efter overgangsalderen tamoxifen",
    begrundet: ["Malignitetssuspekte fund ved gynækologens undersøgelse (transvaginal ultralyd, endometriebiopsi)"],
    mistanke: [
      "Blødning efter menopausen",
      "Abnorm blødning hos præmenopausal kvinde, hvor anden kilde ikke kan bekræftes — særligt ved risikofaktorer (Lynch-syndrom, fedme, hypertension, tamoxifen)",
    ],
    gp: ["Gynækologisk undersøgelse med spekulum (udeluk blødning fra livmoderhals eller skede)"],
    henvis: "Praktiserende gynækolog (transvaginal ultralyd og biopsi) eller gynækologisk afdeling efter regionens vej — pakkeforløb ved begrundet mistanke",
    obs: ["Blødning efter menopausen skal altid udredes — også under hormonbehandling, hvis blødningen er uventet."],
  },
  {
    id: "aeggestok", navn: "Æggestokkræft", gruppe: "Bryst og kvindelige kønsorganer",
    ord: "æggestok ovarie ovariecancer ca-125 ca125 rmi oppustethed udfyldning ascites bækken",
    begrundet: [
      "RMI (risk of malignancy index) på 200 eller mere",
      "Malignitetssuspekt udfyldning i det lille bækken på billeddiagnostik",
    ],
    mistanke: [
      "Uforklaret abdominal hævelse, oppustethed eller udfyldning, palpabel udfyldning i det lille bækken eller ascites",
    ],
    gp: [
      "CA-125 og gynækologisk ultralyd (praktiserende gynækolog) → RMI = ultralydscore × menopausestatus × CA-125",
    ],
    henvis: "Gynækologisk afdeling — pakkeforløb for kræft i æggestokkene",
    obs: ["Ultralydscore: 0 fund = 0, 1 fund = 1, 2 eller flere = 3 (multilokulær cyste, solide områder, bilaterale læsioner, ascites, metastaser). Menopausestatus: præ = 1, post = 3."],
  },
  {
    id: "vulva", navn: "Kræft i de ydre kvindelige kønsorganer (vulva)", gruppe: "Bryst og kvindelige kønsorganer",
    ord: "vulva skamlæber kløe svie sår knude lichen sclerosus",
    begrundet: ["Malignitetssuspekt tumor på vulva eller histologi med kræft"],
    mistanke: ["Vedvarende kløe, svie, sår, hævelse, knude eller farveforandring på vulva — særligt uden effekt af behandling"],
    gp: ["Inspektion og palpation, også af lyskelymfeknuder"],
    henvis: "Mistanke: praktiserende gynækolog (biopsi). Begrundet mistanke: gynækologisk afdeling — pakkeforløb",
    obs: ["Lichen sclerosus øger risikoen — fast kontrol."],
  },

  // ---------------------------------------------------------------- Hoved, hals og nervesystem
  {
    id: "hovedhals", navn: "Hoved-halskræft (inkl. skjoldbruskkirtel)", gruppe: "Hoved, hals og nervesystem",
    ord: "hoved hals øre næse hals larynx strube svælg mundhule tunge læbe spytkirtel skjoldbruskkirtel thyreoidea knude hæshed lymfeknude halsen næseblødning synkesmerter globus",
    begrundet: [
      "Malignitetssuspekte fund ved øre-næse-halslægens undersøgelse eller biopsi med kræft",
      "Knude i skjoldbruskkirtlen med fokal optagelse på FDG-PET (direkte i pakkeforløb)",
    ],
    mistanke: [
      "Hæshed i mere end 2 uger uden bedring (især over 40 år); synkebesvær eller globus med smerteudstråling til øret",
      "Næse/bihuler: ensidig nasalstenose, blodig sekretion, gentagne næseblødninger eller sår, der ikke heler",
      "Mundhule/svælg: sår, der ikke heler, eller synlig/palpabel tumor",
      "Hals: forstørrede lymfeknuder uden infektiøs eller anden godartet forklaring; lateral halscyste hos voksne over 40 år",
      "Skjoldbruskkirtel: knude med hæshed (recurrensparese), hurtig vækst eller hård, fikseret knude",
    ],
    gp: ["Inspektion af mundhule og svælg; palpation af hals, spytkirtler og skjoldbruskkirtel; TSH ved knude i skjoldbruskkirtlen"],
    henvis: "Praktiserende øre-næse-halslæge (filterfunktion — samme eller næste hverdag), som henviser i pakkeforløbet",
    obs: ["Lymfeknuder på halsen går til øre-næse-halslæge — ikke direkte til lymfompakken."],
  },
  {
    id: "hjerne", navn: "Hjernekræft", gruppe: "Hoved, hals og nervesystem",
    ord: "hjerne hjernetumor neurologisk udfald lammelse epilepsi kramper personlighedsændring kognitiv hovedpine",
    begrundet: [
      "Rumopfyldende proces på CT eller MR af hjernen",
      "Nye fokale neurologiske udfald, der progredierer over dage til uger",
      "Nyt epileptisk anfald hos voksen uden oplagt årsag",
      "Adfærds- eller personlighedsændring eller kognitiv deficit, der progredierer over uger til få måneder",
      "Ny markant hovedpine eller ændret hovedpinemønster, der progredierer over 3–4 uger, når neurolog ikke har fundet anden årsag",
    ],
    mistanke: [],
    gp: ["Neurologisk undersøgelse; ring til neurologisk bagvagt"],
    henvis: "Akut henvisning til neurologisk afdeling efter telefonisk kontakt med bagvagt",
    obs: ["Kronisk hovedpine er ikke indikation.", "Solitær proces i hjernen uden kendt primærtumor følger hjernekræftpakken."],
    akut: true,
  },
  {
    id: "oeje", navn: "Kræft i øje og øjenhule", gruppe: "Hoved, hals og nervesystem",
    ord: "øje øjenhule orbita exophthalmus fremstående øje dobbeltsyn nedsat syn uvea melanom retinoblastom",
    begrundet: [
      "Symptomer fra øjenhulen og normal TSH, eller tumor på CT/MR",
      "Tumor i øjet (fx uveamelanom) fundet af øjenlæge",
    ],
    mistanke: ["Fremstående øje, tryk bag øjet, smerter, nyopstået dobbeltsyn eller nedsat syn"],
    gp: ["TSH (thyreoidea-associeret øjensygdom) — må ikke forsinke henvisningen"],
    henvis: "Praktiserende øjenlæge (filterfunktion); børn akut til øjenafdeling",
    obs: ["Hvid pupil (leukokori) hos barn: akut til øjenafdeling (retinoblastom)."],
  },

  // ---------------------------------------------------------------- Hud, knogler og bløddele
  {
    id: "melanom", navn: "Modermærkekræft (melanom)", gruppe: "Hud, knogler og bløddele",
    ord: "modermærke melanom føflek nævus pigment abcde dermatoskopi dermoskopi hudkræft",
    begrundet: [
      "Begrundet mistanke efter klinisk vurdering og dermatoskopi (ABCDE: asymmetri, uregelmæssig kant, farvevariation, diameter, udvikling)",
      "Excisionsbiopsi med melanom",
    ],
    mistanke: ["Nyt eller forandret modermærke, hvor lægen er i tvivl"],
    gp: ["Dermatoskopi; ved mistanke henvis — eller excisionsbiopsi med lille margin efter lokal praksis"],
    henvis: "Mistanke: dermatolog (filterfunktion). Begrundet mistanke: plastikkirurgisk afdeling — pakkeforløb",
    obs: ["Basalcellekarcinom og planocellulært karcinom er ikke omfattet — henvis til dermatolog efter vanlig praksis."],
  },
  {
    id: "sarkom", navn: "Sarkom i knogle og bløddele", gruppe: "Hud, knogler og bløddele",
    ord: "sarkom bløddelstumor knogletumor knude lipom knoglesmerter",
    begrundet: [
      "Malignitetssuspekt fund på MR (bløddele) eller røntgen og MR (knogle)",
    ],
    mistanke: [
      "Bløddelstumor over 5 cm, beliggende på eller under fascien, eller i hurtig vækst",
      "Palpabel knogletumor",
      "Dybe, vedvarende knoglesmerter uden anden forklaring",
      "Recidiv efter fjernelse af en knude",
    ],
    gp: ["Ultralyd ved usikker bløddelsknude; røntgen ved knoglesmerter eller knogletumor"],
    henvis: "Sarkomcenter (Aarhus Universitetshospital eller Rigshospitalet) — henvis efter regionens vej",
    obs: ["Fjern eller biopsér ikke dybe eller store knuder i almen praksis."],
  },

  // ---------------------------------------------------------------- Blod og lymfe
  {
    id: "lymfom", navn: "Lymfeknudekræft og kronisk lymfatisk leukæmi (CLL)", gruppe: "Blod og lymfe",
    ord: "lymfom lymfeknudekræft hodgkin cll lymfeknuder kirtler milt splenomegali nattesved feber lymfocytose",
    begrundet: [
      "Forstørrede lymfeknuder (over ca. 1,5–2 cm) uden oplagt årsag",
      "Forstørret milt uden anden forklaring",
      "B-symptomer (feber, nattesved, vægttab) sammen med fund",
      "Persisterende lymfocytose sammen med lymfeknuder, forstørret milt eller B-symptomer",
    ],
    mistanke: ["Isoleret persisterende lymfocytose (5 × 10⁹/l eller mere i over 3 måneder) uden andre fund"],
    gp: ["Hæmoglobin, leukocytter med differentialtælling, trombocytter, LDH, CRP, kreatinin og levertal efter regionens pakke"],
    henvis: "Hæmatologisk afdeling — pakkeforløb for lymfeknudekræft og CLL",
    obs: [
      "Lymfeknuder på halsen → øre-næse-halslæge.",
      "Isoleret lymfocytose: drøft med eller henvis til hæmatolog — ikke pakkeforløb.",
    ],
  },
  {
    id: "myelom", navn: "Myelomatose", gruppe: "Blod og lymfe",
    ord: "myelomatose myelom knoglemarvskræft m-komponent paraprotein hypercalcæmi knoglesmerter rygsmerter kompressionsfraktur",
    begrundet: [
      "M-komponent eller hypogammaglobulinæmi sammen med mindst ét af: anæmi, forhøjet kreatinin, hypercalcæmi, knogledestruktion eller sammenfald af ryghvirvel uden anden årsag",
    ],
    mistanke: ["Knoglesmerter, anæmi, gentagne infektioner, nedsat nyrefunktion eller symptomer på hypercalcæmi"],
    gp: ["Hæmoglobin, leukocytter, trombocytter, calcium, kreatinin, LDH, IgA, IgG, IgM og M-komponent i serum og urin"],
    henvis: "Hæmatologisk afdeling — pakkeforløb for myelomatose",
    obs: [
      "M-komponent uden organpåvirkning (MGUS): kontrol eller hæmatologisk vurdering efter regionens retningslinjer.",
      "Svær hypercalcæmi eller akut nyresvigt: akut indlæggelse.",
    ],
  },
  {
    id: "leukaemi", navn: "Akut leukæmi og fremskreden MDS", gruppe: "Blod og lymfe",
    ord: "leukæmi akut leukæmi mds myelodysplastisk blaster cytopeni pancytopeni anæmi infektioner blødning",
    begrundet: [
      "Blaster i blodet eller uforklaret leukocytose med blaster",
      "Bi- eller pancytopeni uden mangeltilstand (B12, folat, jern)",
      "Uforklaret isoleret anæmi uden mangeltilstand (mistanke om MDS)",
    ],
    mistanke: ["Infektioner, feber, blødning, blå mærker, vægttab/nattesved, anæmi eller knoglesmerter"],
    gp: ["Akut hæmoglobin, leukocytter med differentialtælling og trombocytter; B12, folat og ferritin"],
    henvis: "Telefonisk kontakt med hæmatologisk bagvagt — akut indlæggelse ved blaster, svær cytopeni, infektion eller blødning",
    obs: [],
    akut: true,
  },
  {
    id: "myeloid", navn: "Kroniske myeloide sygdomme (CML og myeloproliferative)", gruppe: "Blod og lymfe",
    ord: "kronisk myeloid cml polycytæmi trombocytose leukocytose monocytose hæmatokrit myelofibrose",
    begrundet: [
      "Uforklaret, persisterende isoleret leukocytose over 25 × 10⁹/l",
      "Persisterende monocytose over 1 × 10⁹/l",
      "Uforklaret, vedvarende trombocytose",
      "Hæmatokrit over 0,55 hos ikke-ryger uden KOL",
      "Påvirket almentilstand eller trombose sammen med ovenstående",
    ],
    mistanke: [],
    gp: ["Jern, transferrin, ferritin, B12 og folat først (udeluk mangeltilstand og reaktive årsager)"],
    henvis: "Hæmatologisk afdeling — pakkeforløb for kroniske myeloide sygdomme",
    obs: [],
  },

  // ---------------------------------------------------------------- Uspecifikke symptomer og børn
  {
    id: "dpf", navn: "Diagnostisk pakkeforløb (uspecifikke symptomer og metastaser uden kendt primærtumor)", gruppe: "Uspecifikke symptomer og børn",
    ord: "diagnostisk pakkeforløb dpf uspecifik træthed vægttab almen utilpashed feber anæmi smerter metastase ukendt primærtumor alvorlig sygdom",
    begrundet: [
      "Mistanke om alvorlig sygdom, der kan være kræft, uden organspecifikke symptomer — fx almen utilpashed, markant træthed, uforklaret vægttab, feber, anæmi, diffuse eller lokaliserede smerter, øget lægekontakt eller medicinforbrug",
      "Metastasesuspekte forandringer uden kendt primærtumor",
    ],
    mistanke: [],
    gp: [
      "Basisudredning i almen praksis: grundig anamnese og objektiv undersøgelse (inkl. lymfeknuder, bryster, rektal- og evt. gynækologisk undersøgelse), regionens blodprøvepakke, urinstix og evt. røntgen af thorax",
      "Normale prøver udelukker ikke kræft — henvis ved fortsat mistanke",
    ],
    henvis: "Diagnostisk enhed (typisk medicinsk afdeling) — diagnostisk pakkeforløb",
    obs: [
      "Metastaser i lungerne → lungekræftpakken; lymfeknude i armhulen hos kvinde → brystkræftpakken; solitær proces i hjernen → hjernekræftpakken.",
      "Peger symptomerne på et organ, bruges organpakken.",
    ],
  },
  {
    id: "boern", navn: "Kræft hos børn", gruppe: "Uspecifikke symptomer og børn",
    ord: "børn barn pædiatri leukæmi hjernetumor neuroblastom wilms retinoblastom knoglesarkom",
    begrundet: [
      "Leukæmi: infektioner, bleghed/anæmi, blødning eller blå mærker, forstørret lever eller milt, knoglesmerter",
      "Hjerne og rygmarv: ny eller ændret hovedpine, opkastning (især om morgenen), stasepapiller, hurtigt voksende hovedomfang, ændret gang eller balance, rygsmerter, blære- eller tarmforstyrrelser",
      "Lymfeknuder på halsen uden infektiøs forklaring",
      "Brysthule, bughule, knogle og bløddele: hoste i over 2 uger, udfyldning i maven, hæmaturi, knoglesmerter i over 1–2 uger, feber i over 1 uge, nattesved, dårlig trivsel, kløe",
      "Øje: hvid pupil (retinoblastom)",
    ],
    mistanke: [],
    gp: ["Objektiv undersøgelse inkl. abdomen, lymfeknuder og neurologi; blodtal, hvis det ikke forsinker"],
    henvis: "Telefonisk kontakt og akut henvisning til børneafdeling (pakkeforløbet starter dag 1)",
    obs: ["Hvid pupil: akut til øjenafdeling."],
    akut: true,
  },
];
