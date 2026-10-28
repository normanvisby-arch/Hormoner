/*
 * Lokale henvisningsveje og telefonnumre for kræftpakker i Region Midtjylland.
 * Kun numre, der er fundet i regionens eller hospitalernes egne sider (via
 * søgeresultater — sundhed.dk og hospitalernes fagpersonsider kunne ikke åbnes
 * direkte). Hver kontakt har kilde; numre ændres, så lægen kan rette dem i
 * "Egne numre" (gemmes kun i browseren). Bruges af kraeft.js og
 * tools/mkkraefthusk.js.
 *   tlf: "78 45 00 00" (vises som tel:-link), tid: telefontid, kilde: hvor fundet
 */
var KRAEFT_REGION = {
  midt: {
    navn: "Region Midtjylland",
    kontrolleret: "oktober 2026 (via søgeresultater — kontrollér på sundhed.dk)",
    generelt: [
      "Ved begrundet mistanke: elektronisk henvisning til afdelingens vanlige lokationsnummer med diagnosen obs. pro kræft; afdelingen indkalder patienten. Skriv patientens telefonnummer i henvisningen, og informér patienten om mistanken.",
      "Telefonisk rådgivning: ring til afdelingen via hospitalets hovednummer (eller regionens liste over specialistrådgivning på sundhed.dk), før henvisningen sendes, hvis du er i tvivl.",
    ],
    hospitaler: [
      { sted: "Aarhus Universitetshospital", tlf: "78 45 00 00", kilde: "auh.dk" },
      { sted: "Regionshospitalet Gødstrup", tlf: "78 43 00 00", kilde: "regionshospitalet-goedstrup.dk" },
      { sted: "Regionshospitalet Randers", tlf: "78 42 00 00", kilde: "regionshospitalet-randers.dk" },
      { sted: "Regionshospitalet Horsens", tlf: "78 42 50 00", kilde: "krak.dk (kontrollér)" },
      { sted: "Hospitalsenhed Midt (Viborg, Silkeborg, Skive)", tlf: "78 44 00 00", kilde: "fagperson.hospitalsenhedmidt.dk" },
    ],
    pakker: {
      dpf: {
        vej: "Diagnostisk klinik på Gødstrup, Silkeborg, Randers, Horsens eller Aarhus Universitetshospital; telefonisk rådgivning med speciallæge/forløbskoordinator i alle faser.",
        kontakter: [
          { sted: "AUH, Diagnostisk klinik", tlf: "51 44 90 83" },
          { sted: "Gødstrup, Klinik for Medicinsk Udredning — speciallæge", tlf: "78 43 14 11" },
          { sted: "Gødstrup, Klinik for Medicinsk Udredning — forløbskoordinator", tlf: "78 43 16 60" },
          { sted: "Silkeborg, Klinik for Medicinsk Diagnostik", tlf: "78 41 73 00" },
          { sted: "Randers, Lungeklinikken (diagnostisk pakkeforløb)", tlf: "78 42 17 39" },
          { sted: "Horsens, Diagnostisk klinik", tlf: "78 42 52 30" },
        ],
        kilde: "sundhed.dk, Diagnostisk pakkeforløb, Region Midtjylland",
      },
      lunge: {
        vej: "Henvis til den lokale billeddiagnostiske afdelings vanlige lokationsnummer (CT af thorax og øvre abdomen) med diagnosen \"Lungekræft OBS PRO\"; afdelingen indkalder. Bopæl i Horsens, Hedensted, Odder og Skanderborg → Aarhus Universitetshospital. Henvisningen: symptomer, rygeanamnese, tidligere kræft, billeddiagnostik og blodprøver, komorbiditet og patientens telefonnummer; henvisningen skal komme fra egen læge.",
        kontakter: [],
        kilde: "sundhed.dk, Lungekræft, Region Midtjylland",
      },
      hjerne: {
        vej: "Pakkeforløb: Neurologisk Klinik, Aarhus Universitetshospital — ring via hovednummeret og bed om neurologisk bagvagt. Henvisningen: sygehistorie, indikation for pakkeforløb, objektive fund, metalstatus/kontraindikationer for MR, højde, vægt og telefonnummer.",
        kontakter: [{ sted: "Aarhus Universitetshospital (omstilling — neurologisk bagvagt)", tlf: "78 45 00 00" }],
        kilde: "sundhed.dk, Hjernekræft, Region Midtjylland; PKOrientering Horsens 2022",
      },
      hovedhals: {
        vej: "Først praktiserende øre-næse-halslæge (ring, så patienten ses samme eller næste hverdag). Øre-næse-halslægen henviser til pakkeforløbet ved Øre-, Næse- og Halskirurgi, AUH.",
        kontakter: [{ sted: "AUH, Øre-, Næse- og Halskirurgi — forløbskoordinator (pakkeforløb)", tlf: "78 45 40 20" }],
        kilde: "fagperson.auh.dk, Pakkeforløb — henvisning",
      },
      tyktarm: {
        vej: "Elektronisk henvisning til den kirurgiske/gastroenterologiske afdelings vanlige lokationsnummer; afdelingen indkalder til koloskopi.",
        kontakter: [
          { sted: "Hospitalsenhed Midt, mave-tarmkirurgi — forløbskoordinator", tlf: "78 44 63 72", tid: "hverdage 9–14" },
          { sted: "Randers, Mave- og Tarmkirurgisk Klinik — forløbskoordinator (kræft)", tlf: "78 42 12 30", tid: "hverdage 8–13" },
        ],
        kilde: "fagperson.hospitalsenhedmidt.dk; regionshospitalet-randers.dk",
      },
      spiseroer: {
        vej: "Elektronisk henvisning til afdelingens vanlige lokationsnummer med diagnosen obs. spiserørs- og mavekræft (anamnese, komorbiditet, objektiv undersøgelse, blodprøver og evt. billeddiagnostik); afdelingen indkalder til gastroskopi.",
        kontakter: [],
        kilde: "sundhed.dk, Spiserørs- og mavekræft, Region Midtjylland",
      },
      pancreas: {
        vej: "Elektronisk henvisning til afdelingens vanlige lokationsnummer; ved tvivl ring til kirurgisk afdeling via hovednummeret.",
        kontakter: [],
        kilde: "Regionens generelle henvisningsvej",
      },
      bryst: {
        vej: "Elektronisk henvisning med diagnosen obs. cancer mammae til afdelingens vanlige lokationsnummer. Regionens forløbsbeskrivelse gælder kvinder — mænd med gynækomasti udredes via anden procedure.",
        kontakter: [{ sted: "Hospitalsenhed Midt, brystkirurgi — forløbskoordinator", tlf: "78 44 25 32", tid: "hverdage 9–14" }],
        kilde: "sundhed.dk, Brystkræft, Region Midtjylland; fagperson.hospitalsenhedmidt.dk",
      },
      prostata: {
        vej: "Elektronisk henvisning (EDIFACT) til urologisk afdelings vanlige lokationsnummer efter samtale med patienten.",
        kontakter: [],
        kilde: "sundhed.dk, Prostatakræft, Region Midtjylland",
      },
      urinveje: {
        vej: "Elektronisk henvisning til urologisk afdelings vanlige lokationsnummer; afdelingen kontakter patienten.",
        kontakter: [],
        kilde: "sundhed.dk, Nyre-blærekræft, Region Midtjylland",
      },
      livmoderhals: { gyn: true },
      livmoder: { gyn: true },
      aeggestok: { gyn: true },
      vulva: { gyn: true },
      lymfom: { blod: true },
      myelom: { blod: true },
      leukaemi: { blod: true },
      myeloid: { blod: true },
      sarkom: {
        vej: "Sarkomcenteret ved Aarhus Universitetshospital — ring via hovednummeret ved tvivl.",
        kontakter: [{ sted: "Aarhus Universitetshospital (omstilling)", tlf: "78 45 00 00" }],
        kilde: "Sundhedsstyrelsen: sarkomcentre i Aarhus og København",
      },
    },
    gyn: {
      vej: "Gynækologisk kræft (livmoderhals, livmoder, æggestokke, vulva): elektronisk henvisning til gynækologisk afdelings vanlige lokationsnummer.",
      kontakter: [{ sted: "AUH, Kvindesygdomme — forløbskoordinator (kræft i underlivet)", tlf: "78 45 37 23", tid: "man. 10–14, ons.–tors. 9–14" }],
      kilde: "auh.dk, Kontakt Klinik for Kvindesygdomme",
    },
    blod: {
      vej: "Hæmatologiske kræftsygdomme: elektronisk henvisning til hæmatologisk afdeling; akutte tilfælde (blaster, svær cytopeni) telefonisk til hæmatologisk bagvagt via hovednummeret.",
      kontakter: [{ sted: "AUH, Blodsygdomme — forløbskoordinator", tlf: "78 45 58 43" }],
      kilde: "fagperson.auh.dk, Blodsygdomme — kontakt",
    },
  },
};
