/*
 * Register over indholdsstoffer til Restordre-værktøjets søgning i "alle" lægemidler.
 * Hvert stof er placeret i sin ATC-gruppe på niveau 4 (kemisk/terapeutisk undergruppe); stoffer i
 * samme gruppe vises som mulige alternativer. Handelsnavne er kun søgeord — de siger intet om, hvad
 * der er markedsført eller kan skaffes i Danmark (tjek pro.medicin.dk).
 *
 * Format: "ATC4|indholdsstof|handelsnavn;handelsnavn". Kombinationer skrives "stof + stof".
 */
window.RESTORDRE_ATC = {
  A02BA: "H2-receptorantagonister", A03BB: "Belladonnaalkaloider, kvaternære (spasmolytika)", A10BD: "Kombinationer af blodsukkersænkende tabletter", A02BC: "Protonpumpehæmmere", A02BX: "Andre midler mod ulcus og refluks",
  A03FA: "Motilitetsfremmende midler", A04AA: "Serotonin (5-HT3)-antagonister mod kvalme",
  A06AB: "Kontaktvirkende afføringsmidler", A06AC: "Volumenøgende afføringsmidler", A06AD: "Osmotisk virkende afføringsmidler", A06AH: "Perifere opioidantagonister mod forstoppelse",
  A07AA: "Antibiotika mod tarminfektion", A07DA: "Stoppende midler", A07EA: "Lokalt virkende kortikosteroider (tarm)", A07EC: "Aminosalicylsyre og lignende",
  A10AB: "Hurtigtvirkende insuliner", A10AC: "Intermediært virkende insuliner", A10AD: "Blandingsinsuliner", A10AE: "Langtidsvirkende insuliner",
  A10BA: "Biguanider", A10BB: "Sulfonylurinstoffer", A10BG: "Thiazolidindioner", A10BH: "DPP-4-hæmmere", A10BJ: "GLP-1-receptoragonister", A10BK: "SGLT-2-hæmmere", A10BX: "Andre blodsukkersænkende midler",
  A11CC: "D-vitamin og analoger", A12AA: "Calcium", A12AX: "Calcium i kombination med D-vitamin", A12BA: "Kalium",
  B01AA: "Vitamin K-antagonister", B01AB: "Hepariner", B01AC: "Trombocytfunktionshæmmere", B01AE: "Direkte trombinhæmmere", B01AF: "Direkte faktor Xa-hæmmere",
  B02AA: "Aminosyrer (antifibrinolytika)", B03AA: "Jern til peroral brug", B03BA: "B12-vitamin", B03BB: "Folsyre",
  C01AA: "Digitalisglykosider", C01BC: "Antiarytmika klasse IC", C01BD: "Antiarytmika klasse III", C01CA: "Adrenerge og dopaminerge midler", C01DA: "Organiske nitrater", C01EB: "Andre hjertemidler",
  C02AC: "Imidazolinreceptoragonister", C02CA: "Alfa-blokkere",
  C03AA: "Thiazider", C03BA: "Thiazidlignende diuretika", C03CA: "Loop-diuretika", C03DA: "Aldosteronantagonister", C03DB: "Andre kaliumbesparende midler",
  C07AA: "Uselektive betablokkere", C07AB: "Selektive betablokkere", C07AG: "Alfa- og betablokkere",
  C08CA: "Dihydropyridin-calciumantagonister", C08DA: "Phenylalkylaminer (verapamil)", C08DB: "Benzothiazepiner (diltiazem)",
  C09AA: "ACE-hæmmere", C09BA: "ACE-hæmmer og diuretikum", C09CA: "Angiotensin II-receptorblokkere", C09DA: "ARB og diuretikum", C09DB: "ARB og calciumantagonist", C09DX: "ARB i andre kombinationer", C09XA: "Reninhæmmere",
  C10AA: "Statiner", C10BA: "Statin og ezetimib", C10AB: "Fibrater", C10AX: "Andre lipidsænkende midler",
  D01AC: "Imidazol- og triazolderivater (hud)", D01AE: "Andre svampemidler (hud)", D05AX: "Andre midler mod psoriasis (hud)", D06AX: "Andre antibiotika (hud)", D06BB: "Antivirale midler (hud)",
  D07AA: "Svagt virkende kortikosteroider (hud)", D07AB: "Middelstærkt virkende kortikosteroider (hud)", D07AC: "Stærkt virkende kortikosteroider (hud)", D07AD: "Meget stærkt virkende kortikosteroider (hud)",
  D10AD: "Retinoider mod akne (hud)", D10AE: "Peroxider mod akne", D10BA: "Retinoider mod akne (systemisk)", D11AH: "Midler mod atopisk eksem (ekskl. kortikosteroider)",
  G01AF: "Imidazolderivater (vaginalt)", G02BA: "Intrauterine præventionsmidler", G02BB: "Vaginale præventionsringe", G02CB: "Prolaktinhæmmere",
  G03AA: "P-piller (gestagen og østrogen)", G03AC: "Gestagener til prævention", G03AD: "Nødprævention", G03CA: "Naturlige og halvsyntetiske østrogener", G03CX: "Andre østrogener (tibolon)",
  G03DA: "Pregnen-derivater", G03DB: "Pregnadien-derivater", G03DC: "Estren-derivater", G03FA: "Gestagen og østrogen, kontinuerlig kombination (MHT)", G03FB: "Gestagen og østrogen, sekventiel kombination (MHT)", G03XC: "Selektive østrogenreceptormodulatorer",
  G04BD: "Midler mod overaktiv blære", G04BE: "Midler mod erektil dysfunktion", G04CA: "Alfa-blokkere (prostata)", G04CB: "5-alfa-reduktasehæmmere",
  H01BA: "Vasopressin og analoger", H02AB: "Glukokortikoider", H04AA: "Glykogenolytiske hormoner", H03AA: "Thyreoideahormoner", H03BA: "Thiouraciler", H03BB: "Svovlholdige imidazolderivater", H05AA: "Parathyreoideahormoner og analoger",
  J01AA: "Tetracykliner", J01CA: "Bredspektrede penicilliner", J01CE: "Betalaktamasefølsomme penicilliner", J01CF: "Betalaktamaseresistente penicilliner", J01CR: "Penicillin med betalaktamasehæmmer",
  J01DB: "1. generations cefalosporiner", J01DC: "2. generations cefalosporiner", J01DD: "3. generations cefalosporiner",
  J01EA: "Trimethoprim", J01EB: "Kortvirkende sulfonamider", J01EE: "Sulfonamid og trimethoprim",
  J01FA: "Makrolider", J01FF: "Lincosamider", J01MA: "Fluorquinoloner", J01XE: "Nitrofuranderivater", J01XX: "Andre antibiotika",
  J02AC: "Triazolderivater (svamp)", J05AB: "Nukleosider mod herpesvirus", J05AH: "Neuraminidasehæmmere",
  L02BA: "Antiøstrogener", L02BG: "Aromatasehæmmere", L04AX: "Andre immunsuppressiva",
  M01AB: "Eddikesyrederivater (NSAID)", M01AC: "Oxicamer (NSAID)", M01AE: "Propionsyrederivater (NSAID)", M01AH: "Coxiber (NSAID)", M02AA: "NSAID til udvortes brug",
  M03BX: "Andre centralt virkende muskelafslappende midler", M04AA: "Urinsyresænkende midler", M04AC: "Midler uden effekt på urinsyre (colchicin)", M05BA: "Bisfosfonater", M05BX: "Andre midler mod osteoporose",
  N02AA: "Naturlige opiumsalkaloider", N02AB: "Phenylpiperidinderivater", N02AE: "Oripavinderivater", N02AJ: "Opioider i kombination med ikke-opioide analgetika", N02AX: "Andre opioider",
  N02BA: "Salicylsyre og derivater", N02BE: "Anilider (paracetamol)", N02CC: "Triptaner", N02CD: "CGRP-antagonister",
  N03AF: "Carboxamidderivater (epilepsi)", N03AG: "Fedtsyrederivater (valproat)", N03AX: "Andre antiepileptika",
  N04BA: "Dopa og dopa-derivater", N04BC: "Dopaminagonister", N04BD: "MAO-B-hæmmere",
  N05AH: "Diazepiner, oxazepiner og thiazepiner (antipsykotika)", N05AN: "Lithium", N05AX: "Andre antipsykotika",
  N05BA: "Benzodiazepiner (angst)", N05BB: "Diphenylmethanderivater (hydroxyzin)", N05CD: "Benzodiazepiner (søvn)", N05CF: "Benzodiazepinlignende sovemidler", N05CH: "Melatoninreceptoragonister",
  N06AA: "Tricykliske antidepressiva", N06AB: "SSRI", N06AX: "Andre antidepressiva", N06BA: "Centralstimulerende midler (ADHD)",
  N06DA: "Kolinesterasehæmmere", N06DX: "Andre midler mod demens",
  N07BA: "Midler mod nikotinafhængighed", N07BB: "Midler mod alkoholafhængighed", N07BC: "Midler mod opioidafhængighed", N07CA: "Midler mod svimmelhed",
  N05CM: "Andre sovemidler", P01AB: "Nitroimidazolderivater", P01BA: "Aminoquinoliner", V03AB: "Antidoter", P02CA: "Benzimidazolderivater (orm)", P03AC: "Pyrethriner (lus og fnat)",
  R01AD: "Kortikosteroider til næsen", R03AC: "Selektive beta-2-agonister", R03AK: "Beta-2-agonist og inhalationssteroid", R03AL: "Beta-2-agonist og antikolinergikum (± steroid)",
  R03BA: "Inhalationssteroider", R03BB: "Antikolinergika til inhalation", R03DC: "Leukotrienreceptorantagonister",
  R05DA: "Opiumsalkaloider (hostestillende)", R06AD: "Phenothiazinderivater (antihistaminer)", R06AE: "Piperazinderivater (antihistaminer)", R06AX: "Andre antihistaminer",
  S01AA: "Antibiotika (øje)", S01EC: "Kulsyreanhydrasehæmmere (glaukom)", S01ED: "Betablokkere (glaukom)", S01EE: "Prostaglandinanaloger (glaukom)", S01GX: "Andre antiallergika (øje)",
};

window.RESTORDRE_REGISTER = `
A02BA|famotidin|
A02BA|cimetidin|
A02BC|omeprazol|Losec
A02BC|esomeprazol|Nexium
A02BC|pantoprazol|Pantoloc
A02BC|lansoprazol|Lanzo
A02BC|rabeprazol|Pariet
A02BX|sucralfat|Antepsin
A02BX|alginat|Gaviscon
A03BB|butylscopolamin|Buscopan
A03FA|metoclopramid|Primperan
A03FA|domperidon|Motilium
A04AA|ondansetron|Zofran
A04AA|granisetron|
A06AB|bisacodyl|Dulcolax;Toilax
A06AB|natriumpicosulfat|Laxoberal;Picolon
A06AB|sennaglykosider|Pursennid
A06AC|psyllium (loppefrø)|Vi-Siblin;Husk
A06AC|sterculia|Inolaxol
A06AD|macrogol|Movicol
A06AD|laktulose|Duphalac;Lactulose
A06AD|magnesiumoxid|Magnesia
A06AH|naloxegol|Moventig
A06AH|methylnaltrexon|Relistor
A07AA|vancomycin (oral)|
A07AA|fidaxomicin|Dificlir
A07DA|loperamid|Imodium;Imodium Akut
A07EA|budesonid (tarm)|Entocort;Budenofalk;Cortiment
A07EC|mesalazin|Pentasa;Asacol;Mezavant;Salofalk
A07EC|sulfasalazin|Salazopyrin
A10AB|insulin aspart|NovoRapid;Fiasp
A10AB|insulin lispro|Humalog;Lyumjev
A10AB|insulin glulisin|Apidra
A10AB|insulin human (hurtigtvirkende)|Actrapid
A10AC|isophaninsulin (NPH)|Insulatard
A10AD|insulin aspart (blanding)|NovoMix
A10AD|insulin lispro (blanding)|Humalog Mix
A10AE|insulin glargin|Lantus;Toujeo;Abasaglar
A10AE|insulin detemir|Levemir
A10AE|insulin degludec|Tresiba
A10BA|metformin|Glucophage
A10BB|glimepirid|Amaryl
A10BB|gliclazid|Diamicron
A10BB|glipizid|Mindiab
A10BG|pioglitazon|Actos
A10BH|sitagliptin|Januvia
A10BH|linagliptin|Trajenta
A10BH|saxagliptin|Onglyza
A10BH|vildagliptin|Galvus
A10BH|alogliptin|Vipidia
A10BJ|semaglutid|Ozempic;Rybelsus;Wegovy
A10BJ|dulaglutid|Trulicity
A10BJ|liraglutid|Victoza;Saxenda
A10BK|empagliflozin|Jardiance
A10BK|dapagliflozin|Forxiga
A10BK|canagliflozin|
A10BK|ertugliflozin|
A10BX|tirzepatid|Mounjaro
A10BD|sitagliptin + metformin|Janumet
A10BD|vildagliptin + metformin|Eucreas
A10BD|empagliflozin + metformin|Synjardy
A10BD|dapagliflozin + metformin|Xigduo
A11CC|colecalciferol (D3-vitamin)|D-vitamin
A11CC|alfacalcidol|Etalpha
A12AA|calciumcarbonat|
A12AX|calciumcarbonat + colecalciferol|Unikalk;Calcichew D3;Calcium-D-vitamin
A12BA|kaliumchlorid|Kaleorid;kaliumklorid
B01AA|warfarin|Marevan;Warfarin
B01AA|phenprocoumon|Marcoumar
B01AB|enoxaparin|Klexane;Inhixa
B01AB|dalteparin|Fragmin
B01AB|tinzaparin|Innohep
B01AC|acetylsalicylsyre (lavdosis)|Hjertemagnyl
B01AC|clopidogrel|Plavix
B01AC|ticagrelor|Brilique
B01AC|prasugrel|Efient
B01AC|dipyridamol|Persantin
B01AE|dabigatran|Pradaxa
B01AF|apixaban|Eliquis
B01AF|rivaroxaban|Xarelto
B01AF|edoxaban|Lixiana
B02AA|tranexamsyre|Cyklokapron
B03AA|jernsulfat|Ferro Duretter;Duroferon
B03AA|jernfumarat|Ferrofumarat
B03BA|cyanocobalamin (B12-vitamin)|Betolvex
B03BA|hydroxocobalamin|Betolvidon
B03BB|folsyre|Folimet
C01AA|digoxin|Lanacrist
C01BC|flecainid|Tambocor
C01BC|propafenon|Rytmonorm
C01BD|amiodaron|Cordarone
C01BD|dronedaron|Multaq
C01CA|adrenalin|EpiPen;Jext;Emerade
C01DA|glyceryltrinitrat (nitroglycerin)|Nitroglycerin;Nitrolingual
C01DA|isosorbidmononitrat|Imdur;Monoket
C01DA|isosorbiddinitrat|Cedocard
C01EB|ivabradin|Procoralan
C01EB|ranolazin|Ranexa
C02AC|moxonidin|Physiotens
C02AC|clonidin|Catapresan
C02CA|doxazosin|Cardura
C03AA|bendroflumethiazid|Centyl;Centyl med kaliumklorid
C03AA|hydrochlorthiazid|
C03BA|indapamid|Natrilix
C03BA|chlortalidon|Hygroton;klortalidon
C03BA|metolazon|
C03CA|furosemid|Furix;Lasix
C03CA|bumetanid|Burinex
C03CA|torasemid|
C03DA|spironolacton|Spirix;Aldactone;spironolakton
C03DA|eplerenon|Inspra
C03DB|amilorid|
C07AA|propranolol|Propal
C07AA|sotalol|Sotacor
C07AB|metoprolol|Selo-Zok;Metoprolol succinat
C07AB|bisoprolol|Emconcor
C07AB|atenolol|Tenormin
C07AB|nebivolol|Nebilet
C07AG|carvedilol|
C07AG|labetalol|Trandate
C08CA|amlodipin|Norvasc
C08CA|felodipin|Plendil
C08CA|lercanidipin|Zanidip
C08CA|nifedipin|Adalat
C08CA|lacidipin|
C08DA|verapamil|Isoptin;Veraloc
C08DB|diltiazem|Cardil
C09AA|ramipril|Triatec
C09AA|enalapril|Renitec
C09AA|lisinopril|Zestril
C09AA|perindopril|Coversyl
C09AA|captopril|
C09AA|trandolapril|
C09CA|losartan|Cozaar
C09CA|candesartan|Atacand
C09CA|valsartan|Diovan
C09CA|irbesartan|Aprovel
C09CA|telmisartan|Micardis
C09CA|olmesartan|Olmetec
C09CA|eprosartan|
C09BA|enalapril + hydrochlorthiazid|
C09DA|losartan + hydrochlorthiazid|Cozaar Comp
C09DB|amlodipin + valsartan|Exforge
C09DX|sacubitril + valsartan|Entresto
C09XA|aliskiren|Rasilez
C10AA|simvastatin|Zocor
C10AA|atorvastatin|Lipitor;Zarator
C10AA|rosuvastatin|Crestor
C10AA|pravastatin|Pravachol
C10AA|fluvastatin|Lescol
C10BA|simvastatin + ezetimib|Inegy
C10BA|atorvastatin + ezetimib|Atozet
C10AB|fenofibrat|Lipanthyl
C10AB|gemfibrozil|Lopid
C10AX|ezetimib|Ezetrol
C10AX|bempedoinsyre|Nilemdo
C10AX|evolocumab|Repatha
C10AX|alirocumab|Praluent
C10AX|inclisiran|Leqvio
D01AC|miconazol (hud)|Daktar
D01AC|clotrimazol (hud)|Canesten
D01AC|ketoconazol (hud)|Fungoral
D01AC|econazol|Pevaryl
D01AE|terbinafin (hud)|Lamisil
D05AX|calcipotriol|Daivonex
D06AX|fusidinsyre (hud)|Fucidin
D06AX|mupirocin|Bactroban
D06AX|retapamulin|Altargo
D06BB|aciclovir (hud)|Zovir creme
D07AA|hydrocortison (hud)|Mildison;Hydrocortison
D07AB|hydrocortisonbutyrat|Locoid
D07AB|clobetasonbutyrat|Emovat
D07AB|triamcinolon (hud)|
D07AC|betamethason (hud)|Betnovat
D07AC|mometason (hud)|Elocon
D07AC|fluticason (hud)|Cutivate
D07AD|clobetasolpropionat|Dermovat;Clobex
D05AX|calcipotriol + betamethason|Daivobet;Enstilar
D10AD|adapalen|Differin
D10AD|tretinoin (hud)|
D10AE|benzoylperoxid|Basiron
D10BA|isotretinoin|
D11AH|tacrolimus (hud)|Protopic
D11AH|pimecrolimus|Elidel
G01AF|clotrimazol (vaginalt)|Canesten vagitorier
G01AF|miconazol (vaginalt)|Daktar vagitorier
G01AF|econazol (vaginalt)|Pevaryl vagitorier
G01AF|metronidazol (vaginalt)|Zidoval
G02BA|levonorgestrel-spiral|Mirena;Kyleena;Jaydess;Levosert
G02BA|kobberspiral|
G02CB|cabergolin|Dostinex
G03AA|levonorgestrel + ethinylestradiol|Mirabella;Microgyn;Rigevidon;Femicept
G03AA|desogestrel + ethinylestradiol|Marvelon;Mercilon
G03AA|gestoden + ethinylestradiol|Gestinyl;Harmonet
G03AA|norgestimat + ethinylestradiol|
G03AA|drospirenon + ethinylestradiol|Yasmin;Yaz
G02BB|etonogestrel + ethinylestradiol (ring)|NuvaRing
G03AA|norelgestromin + ethinylestradiol (plaster)|Evra
G03AC|desogestrel (minipille)|Cerazette
G03AC|drospirenon (minipille)|Slinda
G03AC|etonogestrel (p-stav)|Nexplanon
G03AC|medroxyprogesteron (p-sprøjte)|Depo-Provera
G03AD|levonorgestrel (nødprævention)|NorLevo;Levodonna;Frivelle
G03AD|ulipristal (nødprævention)|ellaOne
G03CA|estradiol|Estrofem;Vivelle Dot;Divigel;Estrogel;Lenzetto;Evorel;Vagifem;Vagirux;Estring
G03CA|estriol|Ovestin
G03CX|tibolon|Livial
G03DA|medroxyprogesteron|Provera
G03DA|progesteron|Utrogestan
G03DB|dydrogesteron|
G03DC|norethisteron|Primolut-Nor
G03FA|estradiol + norethisteron (kontinuerlig)|Activelle;Kliogest
G03FB|estradiol + norethisteron (sekventiel)|Trisekvens;Novofem
G03XC|raloxifen|Evista
G04BD|solifenacin|Vesicare
G04BD|tolterodin|Detrusitol
G04BD|fesoterodin|Toviaz
G04BD|oxybutynin|Kentera
G04BD|trospium|
G04BD|mirabegron|Betmiga
G04BE|sildenafil|Viagra
G04BE|tadalafil|Cialis
G04BE|vardenafil|Levitra
G04CA|tamsulosin|Omnic
G04CA|alfuzosin|Xatral
G04CA|terazosin|
G04CB|finasterid|Proscar
G04CB|dutasterid|Avodart
H02AB|prednisolon|Prednisolon
H02AB|prednison|
H02AB|methylprednisolon|Medrol;Solu-Medrol;Depo-Medrol
H02AB|dexamethason|dexametason
H02AB|hydrocortison (tabletter)|
H01BA|desmopressin|Minirin
H04AA|glucagon|GlucaGen
H02AB|betamethason (systemisk)|Diprospan
H03AA|levothyroxin|Eltroxin;Euthyrox
H03AA|liothyronin|
H03BA|propylthiouracil|
H03BB|thiamazol|Thacapzol
H03BB|carbimazol|Neo-Mercazole
H05AA|teriparatid|Forsteo;Movymia;Terrosa
J01AA|doxycyclin|Vibradox;Doxycyclin
J01AA|tetracyclin|
J01AA|lymecyclin|Tetralysal
J01CA|amoxicillin|Imadrax;Amoxicillin
J01CA|pivmecillinam|Selexid
J01CE|phenoxymethylpenicillin (penicillin V)|Penicillin V;Primcillin;Vepicombin
J01CE|benzylpenicillin|
J01CF|dicloxacillin|Diclocil
J01CF|flucloxacillin|
J01CR|amoxicillin + clavulansyre|Spektramox;Bioclavid
J01DB|cefalexin|
J01DB|cefadroxil|
J01DC|cefuroxim|Zinacef
J01DD|cefpodoxim|
J01EA|trimethoprim|trimetoprim
J01EB|sulfamethizol|Lucosil
J01EE|sulfamethoxazol + trimethoprim|Sulfotrim
J01FA|erythromycin|Abboticin;Ery-Max
J01FA|clarithromycin|Klacid
J01FA|roxithromycin|Surlid
J01FA|azithromycin|Zitromax
J01FF|clindamycin|Dalacin
J01MA|ciprofloxacin|Ciproxin
J01MA|ofloxacin|
J01MA|levofloxacin|Tavanic
J01MA|moxifloxacin|Avelox
J01XE|nitrofurantoin|Furadantin
J01XX|fosfomycin|Monurol
J01XX|methenamin|Hiprex
J02AC|fluconazol|Diflucan
J02AC|itraconazol|Sporanox
J05AB|aciclovir|Zovir;Aciclovir
J05AB|valaciclovir|Valtrex
J05AB|famciclovir|Famvir
J05AH|oseltamivir|Tamiflu
L02BA|tamoxifen|
L02BG|anastrozol|Arimidex
L02BG|letrozol|Femar
L02BG|exemestan|Aromasin
L04AX|methotrexat|Metex;Metoject;Methotrexat
L04AX|azathioprin|Imurel
M01AB|diclofenac|Voltaren;Diclon
M01AB|indometacin|
M01AC|piroxicam|
M01AC|meloxicam|
M01AE|ibuprofen|Ipren;Ibumetin;Brufen;Ibuprofen
M01AE|naproxen|Bonyl;Naproxen
M01AE|ketoprofen|
M01AH|celecoxib|Celebra
M01AH|etoricoxib|Arcoxia
M02AA|diclofenac (gel)|Voltaren gel
M02AA|ibuprofen (gel)|Ipren gel
M03BX|baclofen|Lioresal
M03BX|tizanidin|Sirdalud
M04AA|allopurinol|Zyloric;Allopurinol
M04AA|febuxostat|Adenuric
M04AC|colchicin|
M05BA|alendronat|Fosamax;Alendronat
M05BA|risedronat|Optinate
M05BA|ibandronat|Bonviva
M05BA|zoledronsyre|Aclasta
M05BX|denosumab|Prolia;Jubbonti;Obodence;Stoboclo
M05BX|romosozumab|Evenity
N02AA|morfin|Contalgin;Oramorph;Morfin
N02AA|oxycodon|OxyNorm;OxyContin;Oxycodon
N02AA|hydromorfon|Palladon
N02AA|oxycodon + naloxon|Targin
R05DA|kodein|
N02AB|fentanyl|Durogesic;Instanyl;Abstral
N02AB|pethidin|
N02AE|buprenorfin (smerte)|Norspan;Temgesic
N02AJ|kodein + paracetamol|Pinex Forte
N02AJ|kodein + acetylsalicylsyre|Kodimagnyl
N02AX|tramadol|Tradolan;Mandolgin;Tramadol
N02AX|tapentadol|Palexia
N02BA|acetylsalicylsyre (smertestillende)|Treo;Magnyl
N02BE|paracetamol|Pinex;Panodil;Pamol;Pinex Retard;Panodil Retard
N02CC|sumatriptan|Imigran
N02CC|rizatriptan|Maxalt
N02CC|zolmitriptan|Zomig
N02CC|eletriptan|Relpax
N02CC|almotriptan|Almogran
N02CC|naratriptan|Naramig
N02CC|frovatriptan|Migard
N02CD|erenumab|Aimovig
N02CD|fremanezumab|Ajovy
N02CD|galcanezumab|Emgality
N03AF|carbamazepin|Tegretol;Trimonil
N03AF|oxcarbazepin|Trileptal;Apydan
N03AG|valproat|Orfiril;Deprakine
N03AX|lamotrigin|Lamictal
N03AX|levetiracetam|Keppra
N03AX|topiramat|Topimax
N03AX|gabapentin|Neurontin
N03AX|pregabalin|Lyrica
N03AX|lacosamid|Vimpat
N04BA|levodopa + carbidopa|Sinemet;Stalevo
N04BA|levodopa + benserazid|Madopar
N04BC|pramipexol|Sifrol
N04BC|ropinirol|Requip
N04BC|rotigotin|Neupro
N04BD|rasagilin|Azilect
N04BD|selegilin|Eldepryl
N05AH|quetiapin|Seroquel
N05AH|olanzapin|Zyprexa
N05AH|clozapin|Leponex
N05AN|lithium|Lithium
N05AX|risperidon|Risperdal
N05AX|aripiprazol|Abilify
N05AX|paliperidon|Invega;Xeplion
N05BA|diazepam|Stesolid;Diazepam
N05BA|oxazepam|Alopam;Oxapax
N05BA|alprazolam|Xanor
N05BA|chlordiazepoxid|Risolid
N05BA|lorazepam|Temesta
N05CD|nitrazepam|Mogadon
N05CF|zopiclon|Imovane;Zopiclon
N05CF|zolpidem|Stilnoct
N05CH|melatonin|Circadin;Melatonin
N05CM|propiomazin|Propavan
N06AA|amitriptylin|
N06AA|nortriptylin|Noritren
N06AA|clomipramin|Anafranil
N06AA|imipramin|
N06AB|sertralin|Zoloft
N06AB|citalopram|Cipramil
N06AB|escitalopram|Cipralex
N06AB|fluoxetin|Fontex
N06AB|paroxetin|Seroxat
N06AB|fluvoxamin|Fevarin
N06AX|mirtazapin|Remeron
N06AX|venlafaxin|Efexor
N06AX|duloxetin|Cymbalta
N06AX|vortioxetin|Brintellix
N06AX|bupropion|Wellbutrin
N06AX|agomelatin|Valdoxan
N06AX|mianserin|
N06BA|methylphenidat|Concerta;Ritalin;Medikinet;Equasym
N06BA|lisdexamfetamin|Elvanse
N06BA|dexamfetamin|Attentin
N06BA|atomoxetin|Strattera
N06BA|modafinil|
N06DA|donepezil|Aricept
N06DA|rivastigmin|Exelon
N06DA|galantamin|Reminyl
N06DX|memantin|Ebixa
N07BA|nikotin|Nicorette;Nicotinell
N07BA|vareniclin|Champix
N07BB|disulfiram|Antabus
N07BB|naltrexon|
N07BB|acamprosat|Campral
N07BC|methadon|
N07BC|buprenorfin (afhængighed)|Subutex;Suboxone
N07CA|betahistin|Betaserc
P01AB|metronidazol|Flagyl
P01BA|hydroxychloroquin|Plaquenil
P02CA|mebendazol|Vermox
P03AC|permethrin|Nix
R01AD|mometason (næsespray)|Nasonex
R01AD|fluticason (næsespray)|Avamys;Flixonase
R01AD|budesonid (næsespray)|Rhinocort
R03AC|salbutamol|Ventoline;Airomir;Buventol
R03AC|terbutalin|Bricanyl
R03AC|formoterol|Oxis;Formoterol
R03AC|salmeterol|Serevent
R03AC|indacaterol|Onbrez
R03AK|budesonid + formoterol|Symbicort;Bufomix;DuoResp
R03AK|fluticason + salmeterol|Seretide
R03AK|beclometason + formoterol|Innovair
R03AK|fluticasonfuroat + vilanterol|Relvar
R03AK|fluticason + formoterol|Flutiform
R03AL|tiotropium + olodaterol|Spiolto
R03AL|glycopyrronium + indacaterol|Ultibro
R03AL|umeclidinium + vilanterol|Anoro
R03AL|aclidinium + formoterol|Duaklir
R03AL|beclometason + formoterol + glycopyrronium|Trimbow
R03AL|fluticasonfuroat + umeclidinium + vilanterol|Trelegy
R03BA|budesonid|Pulmicort
R03BA|beclometason|Qvar;Beclomet
R03BA|fluticason|Flutide
R03BA|ciclesonid|Alvesco
R03BA|mometason|Asmanex
R03BB|tiotropium|Spiriva
R03BB|glycopyrronium|Seebri
R03BB|umeclidinium|Incruse
R03BB|aclidinium|Eklira
R03BB|ipratropium|Atrovent
R03DC|montelukast|Singulair
R06AD|promethazin|Phenergan
R06AE|cetirizin|Zyrtec;Cetirizin
R06AE|levocetirizin|Xyzal
N05BB|hydroxyzin|Atarax
R06AX|loratadin|Clarityn;Loratadin
R06AX|desloratadin|Aerius
R06AX|fexofenadin|Telfast
R06AX|bilastin|Bilaxten
R06AX|rupatadin|Rupafin
S01AA|chloramphenicol (øje)|Kloramfenikol
S01AA|fusidinsyre (øje)|Fucithalmic
S01EC|dorzolamid|Trusopt
S01EC|brinzolamid|Azopt
S01ED|timolol (øje)|Timosan
S01EE|latanoprost|Xalatan
S01EE|bimatoprost|Lumigan
S01EE|travoprost|Travatan
S01GX|ketotifen (øje)|Zaditen
S01GX|olopatadin|Opatanol
V03AB|naloxon|Nyxoid
`;

// Bemærkninger til ATC-grupper, hvor "samme gruppe" ikke er nok til at vælge et alternativ.
// gruppe: id på en detaljeret tabel i data.js, der er relevant.
window.RESTORDRE_ATC_NOTE = {
  J01CA: { tekst: "Amoxicillin (luftveje) og pivmecillinam (kun urinveje) er IKKE indbyrdes alternativer — mecillinam dækker ikke pneumokokker/streptokokker, og amoxicillin er uegnet til cystitis (resistens). Ved mangel på amoxicillin: anden styrke/form eller penicillin V (se Luftveje); ved mangel på pivmecillinam: se Urinveje.", skjulListe: true, gruppe: "penicillin" },
  C07AA: { tekst: "Sotalol har klasse III-antiarytmisk effekt (QT) og erstattes ikke af propranolol — konferér med kardiolog. For propranolol afhænger alternativet af indikationen (migræne, tremor, portal hypertension)." },
  C07AG: { tekst: "Labetalol bruges især ved graviditetshypertension — alternativet er nifedipin depot eller methyldopa efter aftale med obstetriker, ikke carvedilol." },
  N02AB: { tekst: "Fentanylplaster erstattes af et andet fentanylplaster med samme mikrog./t. Pethidin er ikke et alternativ. Omregning til andre opioider er usikker (fentanyl 12 mikrog./t svarer skønsmæssigt til oral morfin ca. 30–45 mg/døgn) — konferér ved palliation." },
  N02AE: { tekst: "Buprenorfinplaster erstattes af et andet buprenorfinplaster med samme mikrog./t. Omregning til andre opioider er usikker — konferér med smerte-/palliativt team." },
  R03AL: { tekst: "Triple-inhalatorer (Trimbow, Trelegy) indeholder inhalationssteroid — skift kun til en anden triple eller LABA/LAMA + inhalationssteroid. LABA uden inhalationssteroid ved astma er farligt." },
  R03AK: { tekst: "Budesonid/formoterol og beclometason/formoterol kan bruges som vedligehold og anfaldsmedicin (MART). Salmeterol- og vilanterol-kombinationer kan ikke — ved MART skiftes kun til en anden formoterol-kombination." },
  R03BB: { tekst: "Ipratropium (Atrovent) er korttidsvirkende og ikke et alternativ til de langtidsvirkende (LAMA) — og omvendt." },
  C01BD: { tekst: "Antiarytmika skiftes kun efter aftale med kardiolog. Dronedaron er kontraindiceret ved hjertesvigt og permanent atrieflimren og er ikke et alternativ til amiodaron." },
  C01BC: { tekst: "Antiarytmika skiftes kun efter aftale med kardiolog (flecainid/propafenon kun uden strukturel hjertesygdom)." },
  C01DA: { tekst: "Nitroglycerin (akut, sublingualt) og isosorbidmononitrat/-dinitrat (forebyggende) er ikke indbyrdes erstattelige." },
  C10AB: { tekst: "Gemfibrozil må ikke kombineres med statin (rhabdomyolyse); fenofibrat er at foretrække sammen med statin." },
  N05BA: { tekst: "Benzodiazepiner: omregn omtrentligt (diazepam 10 mg ≈ oxazepam 15–30 mg ≈ lorazepam 1 mg ≈ alprazolam 0,5 mg ≈ chlordiazepoxid 25 mg), og undgå pludselig pause (abstinenser, kramper)." },
  N07BC: { tekst: "Substitutionsbehandling (metadon/buprenorfin) skiftes kun af den behandlingsansvarlige — buprenorfin kan udløse abstinenser hos en patient i metadonbehandling." },
  J01MA: { tekst: "Fluorokinoloner kun efter resistensbestemmelse eller speciallægeaftale (EMA-begrænsninger). Moxifloxacin udskilles ikke i urinen og bruges ikke ved urinvejsinfektion." },
  J01XX: { tekst: "Methenamin er kun forebyggende (profylakse) og ikke behandling af akut urinvejsinfektion." },
  G03AD: { tekst: "Ulipristal er mere effektivt end levonorgestrel 72–120 timer efter samleje og ved højt BMI. Efter ulipristal startes hormonel prævention først efter 5 dage." },
  H03AA: { tekst: "Liothyronin (T3) og levothyroxin (T4) er ikke direkte udskiftelige — skift kun efter aftale med endokrinolog.", gruppe: "levothyroxin" },
  C09DA: { tekst: "Kombinationspræparat: kan det ikke skaffes, kan de to indholdsstoffer ordineres hver for sig i samme dosis.", gruppe: "arb" },
  C09BA: { tekst: "Kombinationspræparat: kan det ikke skaffes, kan de to indholdsstoffer ordineres hver for sig i samme dosis.", gruppe: "ace" },
  C09DB: { tekst: "Kombinationspræparat: kan det ikke skaffes, kan de to indholdsstoffer ordineres hver for sig i samme dosis.", gruppe: "ccb" },
  C10BA: { tekst: "Kombinationspræparat: kan det ikke skaffes, kan statin og ezetimib ordineres hver for sig i samme dosis.", gruppe: "statin" },
  A10BD: { tekst: "Kombinationspræparat: kan det ikke skaffes, kan de to indholdsstoffer ordineres hver for sig i samme dosis (metformin fordelt på 2 doser)." },
  A02BX: { tekst: "Sucralfat og alginat (Gaviscon) virker forskelligt og er ikke indbyrdes alternativer — ved refluks er en protonpumpehæmmer førstevalg.", gruppe: "ppi" },
  G02BB: { tekst: "Ved mangel på p-ring: kombineret p-pille (samme type østrogen/gestagen) — se P-piller og minipiller.", gruppe: "ppiller" },
  N03AX: { tekst: "Gruppen er bred — stofferne har forskellige indikationer (epilepsi, neuropatiske smerter, angst, migræneprofylakse). Ved epilepsi: skift kun efter aftale med neurolog. Ved neuropatiske smerter og angst er gabapentin ↔ pregabalin det nærmeste alternativ." },
  N03AF: { tekst: "Antiepileptika skiftes kun efter aftale med neurolog (risiko for gennembrudsanfald)." },
  N03AG: { tekst: "Valproat skiftes kun efter aftale med neurolog/psykiater. Kvinder i den fødedygtige alder: særlige regler for valproat." },
  N06BA: { tekst: "Skift mellem ADHD-midler (fx methylphenidat-præparater med forskellig frigivelse) kræver omregning og følges af den behandlingsansvarlige psykiater. Modafinil er ikke et ADHD-alternativ." },
  R03AC: { tekst: "Korttidsvirkende (salbutamol, terbutalin — anfald) og langtidsvirkende (formoterol, salmeterol, indacaterol — vedligehold) er ikke indbyrdes erstattelige. LABA uden inhalationssteroid må ikke bruges ved astma." },
  B01AC: { tekst: "Trombocythæmmerne er ikke frit udskiftelige — især efter AKS/stent (dobbelt behandling): konferér med kardiolog, før ticagrelor/prasugrel/clopidogrel skiftes." },
  N05AH: { tekst: "Antipsykotika skiftes efter psykiatrisk vurdering (dosisomregning, metaboliske bivirkninger, QT)." },
  N05AX: { tekst: "Antipsykotika skiftes efter psykiatrisk vurdering (dosisomregning, metaboliske bivirkninger, QT)." },
  N05AN: { tekst: "Lithium har intet reelt alternativ i samme gruppe: skift ikke præparat uden plasmakoncentration-kontrol; konferér med psykiater." },
  N06AX: { tekst: "Skift mellem antidepressiva kræver en skifteplan (direkte skift, krydsudtrapning eller pause) — se fx SPS' vejledning om skift af antidepressiva.", gruppe: "ssri" },
  N06AA: { tekst: "Tricykliske antidepressiva bruges også mod smerter i lav dosis — alternativet afhænger af indikationen.", gruppe: "gabapentinoid" },
  N04BA: { tekst: "Parkinson-medicin: skift efter aftale med neurolog — pludselig pause kan give alvorlige symptomer." },
  N04BC: { tekst: "Parkinson-medicin: skift efter aftale med neurolog — pludselig pause kan give alvorlige symptomer." },
  N04BD: { tekst: "Parkinson-medicin: skift efter aftale med neurolog." },
  A10AB: { tekst: "Hurtigtvirkende insulinanaloger kan skiftes enhed for enhed; tjek pen/kanyle og instruér. Human insulin (Actrapid) gives ca. 30 minutter før måltid, analogerne lige før." },
  A10AE: { tekst: "Basalinsuliner skiftes som udgangspunkt enhed for enhed (reducér 10–20 % ved skift fra 2 daglige doser eller ved hypoglykæmirisiko; Toujeo → Lantus: reducér ca. 20 %); følg blodsukkeret tæt den første uge." },
  A10AD: { tekst: "Blandingsinsuliner: skift enhed for enhed til et præparat med samme blandingsforhold, eller konferér med diabetesambulatoriet." },
  A10BX: { tekst: "Tirzepatid (GIP/GLP-1): alternativet er en GLP-1-receptoragonist — start på lav vedligeholdelsesdosis og optrap.", gruppe: "glp1" },
  C09DX: { tekst: "Kan sacubitril/valsartan ikke skaffes: skift til ARB (Entresto 24/26 mg × 2 ≈ valsartan 40 mg × 2; 49/51 ≈ 80 mg × 2; 97/103 ≈ 160 mg × 2) — eller ACE-hæmmer tidligst 36 timer efter sidste dosis (angioødem). Konferér ved hjertesvigt.", gruppe: "arb" },
  N05BB: { tekst: "Alternativet afhænger af indikationen: ved kløe et 2. generations antihistamin; ved angst en SSRI eller kortvarigt en anden angstdæmpende behandling.", gruppe: "antihist" },
  L04AX: { tekst: "Immunsupprimerende behandling skiftes efter aftale med den behandlingsansvarlige speciallæge." },
  L02BG: { tekst: "Antihormonbehandling mod brystkræft skiftes efter aftale med onkolog (aromatasehæmmerne regnes for ligeværdige)." },
  L02BA: { tekst: "Antihormonbehandling mod brystkræft skiftes efter aftale med onkolog." },
  H03BB: { tekst: "Thiamazol og carbimazol: carbimazol omdannes til thiamazol (ca. 10 mg carbimazol ≈ 6 mg thiamazol) — kontrollér thyreoideatal." },
  D07AA: { tekst: "Hudsteroider: vælg et præparat i samme danske styrkegruppe (I–IV) og samme grundlag. ATC-grupperne svarer ikke helt til den danske inddeling (fx regnes hydrocortisonbutyrat/Locoid som stærkt virkende) — tjek styrkegruppen på pro.medicin.dk." },
  D07AB: { tekst: "Hudsteroider: vælg et præparat i samme danske styrkegruppe (I–IV) og samme grundlag. ATC-grupperne svarer ikke helt til den danske inddeling (fx regnes hydrocortisonbutyrat/Locoid som stærkt virkende) — tjek styrkegruppen på pro.medicin.dk." },
  D07AC: { tekst: "Hudsteroider: vælg et præparat i samme danske styrkegruppe (I–IV) og samme grundlag. ATC-grupperne svarer ikke helt til den danske inddeling (fx regnes hydrocortisonbutyrat/Locoid som stærkt virkende) — tjek styrkegruppen på pro.medicin.dk." },
  D07AD: { tekst: "Hudsteroider: vælg et præparat i samme danske styrkegruppe (I–IV) og samme grundlag. ATC-grupperne svarer ikke helt til den danske inddeling (fx regnes hydrocortisonbutyrat/Locoid som stærkt virkende) — tjek styrkegruppen på pro.medicin.dk." },
  C01CA: { tekst: "Adrenalin-autoinjektorer: anden autoinjektor i samme styrke — teknikken er forskellig, så instruér og udlever ny trænings-pen.", gruppe: "adrenalin" },
  S01EE: { tekst: "Prostaglandinanalogerne kan som regel skiftes direkte; kontrollér øjentrykket hos øjenlæge efter skift." },
};
