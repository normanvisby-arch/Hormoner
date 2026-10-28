/*
 * Lokale henvisningsveje, telefonnumre og lokationsnumre for kræftpakker i
 * Region Midtjylland — gengivet fra regionens forløbsbeskrivelser på sundhed.dk
 * (information til praksis, Midtjylland) og hospitalernes fagpersonsider,
 * kontrolleret direkte mod siderne 28.10.2026. Hver pakke har kilde med sidens
 * opdateringsdato; flere sider er ældre, så lægen kan rette/supplere i "Egne
 * numre" (gemmes kun i browseren). Bruges af kraeft.js og tools/mkkraefthusk.js.
 *   kontakter: { sted, tlf, lok (EDIFACT/lokationsnr.), tid, note }
 */
var KRAEFT_REGION = {
  midt: {
    navn: "Region Midtjylland",
    kontrolleret: "kontrolleret mod regionens sider 28.10.2026",
    generelt: [
      "Ved begrundet mistanke og efter samtale med patienten: elektronisk henvisning (EDIFACT) med diagnosen obs. cancer til afdelingens vanlige lokationsnummer; afdelingen indkalder patienten. Man kan ringe til afdelingens kræftnummer for tid til første fremmøde eller rådgivning, før henvisningen sendes.",
      "Henvisningen indeholder altid \"sagt til patienten\", patientens telefon- og mobilnummer og behov for tolk.",
    ],
    hospitaler: [
      { sted: "Aarhus Universitetshospital", tlf: "78 45 00 00" },
      { sted: "Regionshospitalet Gødstrup", tlf: "78 43 00 00" },
      { sted: "Regionshospitalet Randers", tlf: "78 42 00 00" },
      { sted: "Regionshospitalet Horsens", tlf: "78 42 50 00" },
      { sted: "Hospitalsenhed Midt — Viborg", tlf: "78 44 00 00" },
      { sted: "Hospitalsenhed Midt — Silkeborg", tlf: "78 41 50 00" },
    ],
    pakker: {
      dpf: {
        vej: "Diagnostisk klinik på Gødstrup, Silkeborg, Randers, Horsens eller Aarhus Universitetshospital. Udredningen starter i almen praksis; telefonisk rådgivning med speciallæge/forløbskoordinator i alle faser.",
        kontakter: [
          { sted: "AUH, Diagnostisk klinik", tlf: "51 44 90 83", lok: "5790002002489" },
          { sted: "Horsens, Diagnostisk klinik", tlf: "78 42 52 30", lok: "5744008367868" },
          { sted: "Randers, Lungeklinikken", tlf: "78 42 17 39", lok: "5790000180127" },
          { sted: "Silkeborg, Klinik for Medicinsk Diagnostik", tlf: "78 41 73 00", lok: "5790002635519" },
          { sted: "Gødstrup, Klinik for Lungesygdomme og Medicinsk Diagnostik — speciallæge", tlf: "78 43 14 11", lok: "5790002521065" },
          { sted: "Gødstrup, samme klinik — forløbskoordinator", tlf: "78 43 16 60" },
        ],
        kilde: "sundhed.dk, Diagnostisk pakkeforløb, Region Midtjylland (opdateret 18.06.2025)",
      },
      lunge: {
        vej: "Henvisning til den lokale billeddiagnostiske afdelings (Røntgen og Skanning) vanlige lokationsnummer — CT af thorax og øvre abdomen; afdelingen indkalder. Patienter fra Horsens, Hedensted, Odder og Skanderborg henvises til AUH. Henvisningen: \"Lungekræft OBS PRO\", symptomer, rygeanamnese, tidligere kræft, billeddiagnostik og blodprøver, allergi, \"sagt til patienten\", komorbiditet og telefonnummer — altid fra egen læge. Husk eGFR ved metformin.",
        kontakter: [
          { sted: "AUH, Røntgen og Skanning", lok: "5790002396762" },
          { sted: "Gødstrup, Røntgen og Skanning", lok: "5790002520426" },
          { sted: "Hospitalsenhed Midt, Røntgen og Skanning", lok: "5790002004988" },
          { sted: "Randers, Røntgen og Skanning", lok: "5790000180271" },
        ],
        kilde: "sundhed.dk, Lungekræft, Region Midtjylland (opdateret 05.12.2023); lokationsnumre fra Diagnostisk pakkeforløb og Gruppe 3 — billeddiagnostik (2025)",
      },
      mesotheliom: {
        vej: "Henvisning som \"Obs. lungehindekræft\": sygehistorie og komorbiditet, objektive fund, laboratorieværdier, blodfortyndende medicin, opdateret FMK og information til patienten. AUH: anmodning om CT til Røntgen.",
        kontakter: [
          { sted: "AUH, Lungesygdomme — Klinik for Lungekræftudredning", tlf: "23 88 69 68", note: "faglig rådgivning før henvisning: 24 60 46 96; CT-henvisning til Røntgen lok.nr. 5790001987121" },
          { sted: "Randers", tlf: "78 42 17 39", lok: "5790000180127" },
          { sted: "Silkeborg og Viborg", tlf: "78 41 74 88", tid: "tast 3; man.–tors. 8–15, fre. 8–14.30", lok: "5790002635519" },
          { sted: "Holstebro/Gødstrup", tlf: "78 43 66 39", lok: "5790001389390" },
        ],
        kilde: "sundhed.dk, Lungehindekræft, Region Midtjylland (opdateret 21.11.2019)",
      },
      hjerne: {
        vej: "Elektronisk henvisning til neurologisk afdelings vanlige lokationsnummer (eller ring for tid/rådgivning). Henvisningen: anamnese, hvilket kriterium der er opfyldt, kontraindikationer for MR (pacemaker, metal, klaustrofobi, graviditet m.m.), højde og vægt, komorbiditet, medicin, allergi, \"sagt til patienten\" og telefonnummer.",
        kontakter: [
          { sted: "Aarhus Universitetshospital, Neurologi", tlf: "78 45 42 88", lok: "5790001986728" },
          { sted: "Regionshospitalet Gødstrup, neurologisk bagvagt", tlf: "78 43 09 20", lok: "5790002521249" },
          { sted: "Regionshospitalet Viborg, Neurologi", tlf: "78 44 60 22", lok: "5790002005329" },
        ],
        kilde: "sundhed.dk, Hjernekræft, Region Midtjylland (opdateret 20.05.2022)",
      },
      hovedhals: {
        vej: "Ring til praktiserende øre-næse-halslæge (hemmelige numre er sendt til alle praksis — kan rekvireres hos praksiskoordinator) og få tid samme eller næste dag. Øre-næse-halslægen henviser videre. Kun ved fravær af lokale øre-næse-halslæger kontaktes hospitalet.",
        kontakter: [
          { sted: "AUH, Øre-Næse-Halskirurgi — forløbskoordinator", tlf: "78 45 40 20", lok: "5790001986810" },
          { sted: "Gødstrup, Øre-Næse-Hals", tlf: "78 43 09 62", lok: "5790002521737" },
        ],
        kilde: "sundhed.dk, Hoved-halskræft, Region Midtjylland (opdateret 10.01.2019); fagperson.auh.dk, Pakkeforløb — henvisning",
      },
      tyktarm: {
        vej: "Elektronisk henvisning til afdelingens vanlige lokationsnummer; afdelingen giver tid, kostråd og udtømning. Aftal pausering af AK-behandling/Magnyl. Patienter fra Aarhus og Samsø kommuner henvises til endoskopi i Horsens. Henvisningen: anamnese, disposition, objektiv undersøgelse inkl. rektaleksploration og abdomen, evt. GU, konkurrerende sygdomme, medicin, allergi og hæmoglobin.",
        kontakter: [
          { sted: "Randers", tlf: "78 42 12 30", lok: "5790000180165" },
          { sted: "Horsens, endoskopivisitationen (også Aarhus og Samsø)", tlf: "78 42 54 12", lok: "5790001377885" },
          { sted: "Silkeborg", tlf: "78 41 72 41", lok: "5790002635502" },
          { sted: "Viborg", tlf: "78 44 63 07", lok: "5790002005213" },
          { sted: "Hospitalsenhed Midt, mave-tarmkirurgisk forløbskoordinator", tlf: "78 44 63 72", tid: "hverdage 9–14" },
          { sted: "Gødstrup", tlf: "78 43 53 60", lok: "5790002520921" },
        ],
        kilde: "sundhed.dk, Tarmkræft, Region Midtjylland (opdateret 17.03.2016); fagperson.hospitalsenhedmidt.dk, Kirurgi — henvisning",
      },
      anal: {
        vej: "Mistanke: elektronisk henvisning til praktiserende speciallæge i kirurgi eller hospitalsafdeling (filterfunktion: inspektion, rektaleksploration, anoskopi, biopsi). Henvisningen: anamnese, inspektion, rektaleksploration, palpation af abdomen og lyske, evt. anoskopi, medicin.",
        kontakter: [
          { sted: "AUH, Mave- og Tarmkirurgi", tlf: "78 45 32 24", lok: "5790002764844" },
          { sted: "Randers", tlf: "78 42 12 30", lok: "5790000180165" },
          { sted: "Horsens, endoskopivisitationen", tlf: "78 42 54 12", lok: "5790001377885" },
          { sted: "Hospitalsenhed Midt", tlf: "78 44 63 07", lok: "5790002005213" },
          { sted: "Gødstrup", tlf: "78 43 53 60", lok: "5790002520921" },
        ],
        kilde: "sundhed.dk, Analkræft, Region Midtjylland (opdateret 17.03.2016)",
      },
      spiseroer: {
        vej: "Elektronisk henvisning med diagnosen obs. spiserørs- og mavekræft til afdelingens vanlige lokationsnummer (anamnese, komorbiditet, objektiv undersøgelse, blodprøver, evt. billeddiagnostik). Patienter fra Aarhus og Samsø kommuner gastroskoperes først i Horsens.",
        kontakter: [
          { sted: "Randers", tlf: "78 42 12 30", lok: "5790000180165" },
          { sted: "Horsens, endoskopivisitationen (også Aarhus og Samsø)", tlf: "78 42 54 12", lok: "5790001377885" },
          { sted: "Silkeborg", tlf: "78 41 72 41", lok: "5790002635502" },
          { sted: "Viborg", tlf: "78 44 63 07", lok: "5790002005213" },
          { sted: "Gødstrup, visiterende speciallæge (Klinik for Kikkertundersøgelser)", tlf: "78 43 14 11", lok: "5790002520921" },
        ],
        kilde: "sundhed.dk, Spiserørs- og mavekræft, Region Midtjylland (opdateret 17.03.2016)",
      },
      pancreas: {
        vej: "Elektronisk henvisning med diagnosen obs. pancreaskræft/galdegangskræft/primær leverkræft til afdelingens vanlige lokationsnummer: anamnese, objektiv undersøgelse, komplicerende lidelser, medicin og AK-behandling, blodprøver (hæmoglobin, væsketal, levertal) og evt. billeddiagnostik.",
        kontakter: [
          { sted: "AUH, Mave- og Tarmkirurgi", tlf: "78 46 28 05", lok: "5790002764844" },
          { sted: "Randers", tlf: "78 42 12 30", lok: "5790000180165" },
          { sted: "Horsens", tlf: "78 42 52 30", lok: "5790000180868" },
          { sted: "Hospitalsenhed Midt", tlf: "78 44 63 07", lok: "5790002005213" },
          { sted: "Gødstrup, visiterende speciallæge (Klinik for Mave-, Tarm- og Leversygdomme)", tlf: "78 43 14 11", lok: "5790002521072" },
          { sted: "Primær leverkræft: Hospitalsenhed Midt (Silkeborg)", tlf: "78 41 74 88", lok: "5790002635519" },
          { sted: "Primær leverkræft: Gødstrup", tlf: "78 43 13 60", lok: "5790002521072" },
        ],
        kilde: "sundhed.dk, Pancreaskræft (17.02.2016), Galdegangskræft (17.03.2016) og Leverkræft, primær (17.03.2016), Region Midtjylland",
      },
      bryst: {
        vej: "Elektronisk henvisning med diagnosen obs. cancer til afdelingens vanlige lokationsnummer: anamnese, dispositioner, tidligere mammografi, palpationsfund (størrelse i cm, side og \"urskive\"), hud- og aksilforhold, medicin og hormonbehandling, allergi, \"sagt til patienten\". Aftal AK-behandling/Magnyl. Regionens beskrivelse gælder kvinder.",
        kontakter: [
          { sted: "AUH, Røntgen og Skanning", tlf: "78 45 65 62", lok: "5790002396762" },
          { sted: "Viborg, Brystklinik — Røntgen og Skanning", tlf: "78 44 31 00", lok: "5790002005008" },
          { sted: "Hospitalsenhed Midt, brystkirurgisk forløbskoordinator", tlf: "78 44 25 32", tid: "hverdage 9–14" },
        ],
        kilde: "sundhed.dk, Brystkræft, Region Midtjylland (opdateret 07.03.2019); fagperson.hospitalsenhedmidt.dk, Kirurgi — henvisning",
      },
      prostata: {
        vej: "Henvisning via EDIFACT: anamnese, rektaleksploration, PSA (som regel to målinger), UVI udelukket, metalskema til MR (vægt, højde, klaustrofobi, metal, pacemaker/ICD), mistanke om metastaser, komorbiditet og AK-behandling, transport, ajourført FMK og at patienten er orienteret. De fleste får MR før forundersøgelsen.",
        kontakter: [
          { sted: "AUH, Urinvejskirurgi", tlf: "78 45 26 42", lok: "5790001991609" },
          { sted: "Gødstrup, Urinvejskirurgi", tlf: "78 43 05 90", lok: "5790002521607" },
        ],
        kilde: "sundhed.dk, Prostatakræft, Region Midtjylland (opdateret 18.11.2022)",
      },
      urinveje: {
        vej: "Elektronisk henvisning med diagnosen obs. cancer: anamnese og vandladningsgener, komorbiditet, blodfortyndende medicin, allergi, objektiv undersøgelse inkl. rektaleksploration, abdomen og GU hos kvinder, urinundersøgelse (blod og infektion), hæmoglobin, SR/CRP og kreatinin.",
        kontakter: [
          { sted: "AUH, Urinvejskirurgi", tlf: "78 45 26 46", lok: "5790001991609" },
          { sted: "Gødstrup, Urinvejskirurgi", tlf: "78 43 05 90", lok: "5790002521607" },
          { sted: "Viborg", tlf: "78 43 95 01", lok: "5790002635489" },
        ],
        kilde: "sundhed.dk, Nyre-blærekræft, Region Midtjylland (opdateret 11.01.2019)",
      },
      testikel: {
        vej: "Elektronisk henvisning til Røntgen og Skanning (ultralyd); er mistanken fortsat, henviser Røntgen og Skanning direkte til urinvejskirurgi. Optageområdet for AUH (også Horsens og Randers) henviser til Røntgen og Skanning, AUH; Gødstrups område til Gødstrup eller Viborg.",
        kontakter: [
          { sted: "AUH, Røntgen og Skanning (hurtig tid, evt. samme dag)", tlf: "21 34 17 74", lok: "5790002396762" },
          { sted: "Gødstrup, Røntgen og Skanning", lok: "5790002520426" },
          { sted: "Silkeborg, Røntgen og Skanning", lok: "5790000187577" },
          { sted: "Viborg, Røntgen og Skanning", lok: "5790002004988" },
        ],
        kilde: "sundhed.dk, Testikelkræft, Region Midtjylland (opdateret 14.06.2022)",
      },
      penis: {
        vej: "Elektronisk henvisning med diagnosen obs. cancer til urinvejskirurgisk afdelings vanlige lokationsnummer: anamnese, komorbiditet, objektiv undersøgelse, medicin og allergi.",
        kontakter: [
          { sted: "AUH, Urinvejskirurgi", tlf: "78 45 26 42", lok: "5790001991609" },
          { sted: "Gødstrup, Urinvejskirurgi", tlf: "78 43 05 90", lok: "5790002521607" },
          { sted: "Viborg", tlf: "78 43 95 01", lok: "5790001389949" },
        ],
        kilde: "sundhed.dk, Peniskræft, Region Midtjylland (opdateret 11.01.2019)",
      },
      livmoderhals: { gyn: true },
      livmoder: { gyn: true },
      aeggestok: { gyn: true },
      vulva: { gyn: true },
      lymfom: { blod: true },
      myelom: { blod: true },
      leukaemi: { blod: true },
      myeloid: { blod: true },
      oeje: {
        vej: "Henvis akut til praktiserende øjenlæge (direkte numre er rundsendt til praksis); øjenlægen henviser ved begrundet mistanke. Kun ved helt klassisk symptombillede kontaktes øjenafdelingen på AUH direkte.",
        kontakter: [{ sted: "AUH, Øjensygdomme (eller vagthavende via omstilling)", tlf: "78 46 32 49", lok: "5790001986766" }],
        kilde: "sundhed.dk, Øjen- og orbitakræft, Region Midtjylland (opdateret 10.01.2019)",
      },
      melanom: {
        vej: "Mistanke eller tvivl: privatpraktiserende dermatolog eller plastikkirurg, eller Hud- og Kønssygdomme, AUH. Begrundet mistanke: elektronisk henvisning til Hud- og Kønssygdomme, som visiterer til plastikkirurg — eller direkte til plastikkirurgisk afdeling.",
        kontakter: [
          { sted: "AUH, Hud- og Kønssygdomme (mistanke/tvivl)", tlf: "40 38 89 10", lok: "5790001393731" },
          { sted: "AUH, Plastikkirurgi (begrundet mistanke)", tlf: "78 45 68 68", lok: "5790001987305" },
          { sted: "Gødstrup, Plastikkirurgi (begrundet mistanke)", tlf: "78 43 53 63", lok: "5790002521348" },
        ],
        kilde: "sundhed.dk, Modermærkekræft, Region Midtjylland (opdateret 21.04.2020)",
      },
      sarkom: {
        vej: "Elektronisk henvisning med diagnosen obs. sarkom til lokal ortopædkirurgisk afdeling (klinisk undersøgelse, røntgen, MR); ved begrundet mistanke efter MR videre til Sarkomcenteret, AUH. Henvisningen: tumors størrelse, konsistens, væksthastighed og beliggenhed.",
        kontakter: [
          { sted: "AUH, Sarkomcenter", tlf: "78 45 41 20", lok: "5790001992194" },
          { sted: "Randers", tlf: "78 42 32 72", lok: "5790000180196" },
          { sted: "Horsens", tlf: "78 42 52 30", lok: "5790001995010" },
          { sted: "Silkeborg", tlf: "78 41 64 03", lok: "5790001999728" },
          { sted: "Viborg (via omstilling)", tlf: "78 44 00 00", lok: "5790002005480" },
          { sted: "Gødstrup", tlf: "78 43 75 80", lok: "5790002521386" },
        ],
        kilde: "sundhed.dk, Sarkomer, Region Midtjylland (opdateret 09.12.2014)",
      },
      boern: {
        vej: "Ring til vagthavende på børneafdelingen via omstillingen og aftal tid — ofte i akutmodtagelsen samme dag; send derefter elektronisk henvisning (anamnese, fund, blodprøver, \"sagt til patienten\").",
        kontakter: [
          { sted: "AUH, Børn og Unge (vagthavende)", tlf: "78 45 17 01", lok: "5790002516528" },
          { sted: "Randers, Børneafdelingen (vagthavende via omstilling)", tlf: "78 42 00 00", lok: "5790000180240" },
          { sted: "Viborg (vagthavende via omstilling)", tlf: "78 44 00 00", lok: "5790002005381" },
          { sted: "Gødstrup (vagthavende via omstilling)", tlf: "78 43 00 00", lok: "5790002520693" },
        ],
        kilde: "sundhed.dk, Børn med kræft, Region Midtjylland (opdateret 09.12.2014)",
      },
    },
    gyn: {
      vej: "Gynækologisk kræft (livmoderhals, livmoder, æggestokke, vulva): elektronisk henvisning til Fælles gynækologisk visitation (alle hospitaler). Livmoderhals: uden påvist carcinom → speciallæge i gynækologi (kolposkopi, biopsi); påvist carcinom eller synlig suspekt tumor → gynækologisk afdeling. Vulva: synlig oplagt malign tumor → direkte til AUH. Æggestokke: send CA-125 med. Henvisningen: anamnese, GU-fund, abdominalpalpation, evt. cytologi/histologi, sygdomme, medicin, allergi.",
      kontakter: [
        { sted: "Fælles gynækologisk visitation", tlf: "78 42 64 13", lok: "5790002011504" },
        { sted: "AUH, gynækologisk speciallæge (faglig rådgivning)", tlf: "30 71 45 40", tid: "hverdage 8–15" },
        { sted: "AUH, forløbskoordinator", tlf: "78 45 37 23", tid: "man. 10–14, tirs.–fre. 9–14" },
        { sted: "AUH, forløbskoordinerende lægesekretær (praktisk)", tlf: "78 45 33 80", tid: "hverdage 8–15" },
        { sted: "Randers, Gynækologi (rådgivning)", tlf: "78 42 32 37" },
        { sted: "Horsens, Kvindesygdomme (rådgivning)", tlf: "78 42 65 28" },
      ],
      kilde: "sundhed.dk, Livmoderhals-, Livmoder-, Æggestok- og Vulvakræft, Region Midtjylland (opdateret 10.08.2017)",
    },
    blod: {
      vej: "Hæmatologisk kræft: elektronisk henvisning med diagnosen obs. cancer til afdelingens vanlige lokationsnummer (anamnese, varighed, objektive fund, medicin, laboratorieprøver). Blaster eller svær cytopeni: ring til hæmatologisk bagvagt via omstillingen.",
      kontakter: [
        { sted: "AUH, Blodsygdomme", tlf: "78 46 78 74", lok: "5790001987497" },
        { sted: "AUH, Blodsygdomme — forløbskoordinator (kræftpakkeforløb)", tlf: "78 45 58 43" },
        { sted: "Gødstrup, Hæmatologi", tlf: "78 43 64 70", lok: "5790002520990" },
      ],
      kilde: "sundhed.dk, Hæmatologiske kræftsygdomme, Region Midtjylland (opdateret 27.03.2017); fagperson.auh.dk, Blodsygdomme — kontakt",
    },
  },
};
