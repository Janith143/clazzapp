
import { User, Teacher, Sale, IndividualClass, Course, Quiz, HomeSlide, Voucher, TopUpRequest, MonthlyReferralEarning, Lecture, SocialMediaLink, TuitionInstitute, Event, PhotoPrintOption, InstituteType } from '../types.ts';

export const sriLankanDistricts: string[] = [
    "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", "Hambantota",
    "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", "Matale",
    "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura",
    "Trincomalee", "Vavuniya"
];

export const sriLankanTownsByDistrict: { [key: string]: string[] } = {
    "Ampara": ["Akkaraipattu", "Ambagahawatta", "Ampara", "Bakmitiyawa", "Deegawapiya", "Devalahinda", "Digamadulla Weeragoda", "Dorakumbura", "Gonagolla", "Hulannuge", "Kalmunai", "Kannakipuram", "Karativu", "Kekirihena", "Koknahara", "Kolamanthalawa", "Komari", "Lahugala", "lmkkamam", "Mahaoya", "Marathamune", "Namaloya", "Navithanveli", "Nintavur", "Oluvil", "Padiyatalawa", "Pahalalanda", "Panama", "Pannalagama", "Paragahakele", "Periyaneelavanai", "Polwaga Janapadaya", "Pottuvil", "Sainthamaruthu", "Samanthurai", "Serankada", "Tempitiya", "Thambiluvil", "Tirukovil", "Uhana", "Wadinagala", "Wanagamuwa"],
    "Anuradhapura": ["Angamuwa", "Anuradhapura", "Awukana", "Bogahawewa", "Dematawewa", "Dimbulagala", "Dutuwewa", "Elayapattuwa", "Ellewewa", "Eppawala", "Etawatunuwewa", "Etaweeragollewa", "Galapitagala", "Galenbindunuwewa", "Galkadawala", "Galkiriyagama", "Galkulama", "Galnewa", "Gambirigaswewa", "Ganewalpola", "Gemunupura", "Getalawa", "Gnanikulama", "Gonahaddenawa", "Habarana", "Halmillawa Dambulla", "Halmillawetiya", "Hidogama", "Horawpatana", "Horiwila", "Hurigaswewa", "Hurulunikawewa", "Ihala Puliyankulama", "Ihalagama", "Ipologama", "Kagama", "Kahatagasdigiliya", "Kahatagollewa", "Kalakarambewa", "Kalaoya", "Kalawedi Ulpotha", "Kallanchiya", "Kalpitiya", "Kalukele Badanagala", "Kapugallawa", "Karagahawewa", "Kashyapapura", "Kebithigollewa", "Kekirawa", "Kendewa", "Kiralogama", "Kirigalwewa", "Kirimundalama", "Kitulhitiyawa", "Kurundankulama", "Labunoruwa", "Madatugama", "Maha Elagamuwa", "Mahabulankulama", "Mahailluppallama", "Mahakanadarawa", "Mahapothana", "Mahasenpura", "Mahawilachchiya", "Mailagaswewa", "Malwanagama", "Maneruwa", "Maradankadawala", "Maradankalla", "Medawachchiya", "Megodawewa", "Mihintale", "Morakewa", "Mulkiriyawa", "Muriyakadawala", "Nachchaduwa", "Namalpura", "Negampaha", "Nochchiyagama", "Nuwaragala", "Padavi Maithripura", "Padavi Parakramapura", "Padavi Sripura", "Padavi Sritissapura", "Padaviya", "Padikaramaduwa", "Pahala Halmillewa", "Pahala Maragahawe", "Pahalagama", "Palugaswewa", "Pandukabayapura", "Pandulagama", "Parakumpura", "Parangiyawadiya", "Parasangahawewa", "Pelatiyawa", "Pemaduwa", "Perimiyankulama", "Pihimbiyagolewa", "Pubbogama", "Punewa", "Rajanganaya", "Rambewa", "Rampathwila", "Rathmalgahawewa", "Saliyapura", "Seeppukulama", "Senapura", "Sivalakulama", "Siyambalewa", "Sravasthipura", "Talawa", "Tambuttegama", "Tammennawa", "Tantirimale", "Telhiriyawa", "Tirappane", "Tittagonewa", "Udunuwara Colony", "Upuldeniya", "Uttimaduwa", "Vellamanal", "Viharapalugama", "Wahalkada", "Wahamalgollewa", "Walagambahuwa", "Walahaviddawewa", "Welimuwapotana", "Welioya Project"],
    "Badulla": ["Akkarasiyaya", "Aluketiyawa", "Aluttaramma", "Ambadandegama", "Ambagasdowa", "Arawa", "Arawakumbura", "Arawatta", "Atakiriya", "Badulla", "Baduluoya", "Ballaketuwa", "Bambarapana", "Bandarawela", "Beramada", "Bibilegama", "Boragas", "Boralanda", "Bowela", "Central Camp", "Damanewela", "Dambana", "Dehiattakandiya", "Demodara", "Diganatenna", "Dikkapitiya", "Dimbulana", "Divulapelessa", "Diyatalawa", "Dulgolla", "Ekiriyankumbura", "Ella", "Ettampitiya", "Galauda", "Galporuyaya", "Gawarawela", "Girandurukotte", "Godunna", "Gurutalawa", "Haldummulla", "Hali Ela", "Hangunnawa", "Haputale", "Hebarawa", "Heeloya", "Helahalpe", "Helapupula", "Hopton", "Idalgashinna", "Kahataruppa", "Kalugahakandura", "Kalupahana", "Kebillawela", "Kendagolla", "Keselpotha", "Ketawatta", "Kiriwanagama", "Koslanda", "Kuruwitenna", "Kuttiyagolla", "Landewela", "Liyangahawela", "Lunugala", "Lunuwatta", "Madulsima", "Mahiyanganaya", "Makulella", "Malgoda", "Mapakadawewa", "Maspanna", "Maussagolla", "Mawanagama", "Medawela Udukinda", "Meegahakiula", "Metigahatenna", "Mirahawatta", "Miriyabedda", "Nawamedagama", "Nelumgama", "Nikapotha", "Nugatalawa", "Ohiya", "Pahalarathkinda", "Pallekiruwa", "Passara", "Pattiyagedara", "Pelagahatenna", "Perawella", "Pitamaruwa", "Pitapola", "Puhulpola", "Rajagalatenna", "Ratkarawwa", "Ridimaliyadda", "Silmiyapura", "Sirimalgoda", "Siripura", "Sorabora Colony", "Soragune", "Soranatota", "Taldena", "Timbirigaspitiya", "Uduhawara", "Uraniya", "Uva Karandagolla", "Uva Mawelagama", "Uva Tenna", "Uva Tissapura", "Welimada", "Werunketagoda", "Wewatta", "Wineethagama", "Yalagamuwa", "Yalwela"],
    "Batticaloa": ["Addalaichenai", "Ampilanthurai", "Araipattai", "Ayithiyamalai", "Bakiella", "Batticaloa", "Cheddipalayam", "Chenkaladi", "Eravur", "Kaluwanchikudi", "Kaluwankemy", "Kannankudah", "Karadiyanaru", "Kathiraveli", "Kattankudi", "Kiran", "Kirankulam", "Koddaikallar", "Kokkaddichcholai", "Kurukkalmadam", "Mandur", "Miravodai", "Murakottanchanai", "Navagirinagar", "Navatkadu", "Oddamavadi", "Palamunai", "Pankudavely", "Periyaporativu", "Periyapullumalai", "Pillaiyaradi", "Punanai", "Thannamunai", "Thettativu", "Thikkodai", "Thirupalugamam", "Unnichchai", "Vakaneri", "Vakarai", "Valaichenai", "Vantharumoolai", "Vellavely"],
    "Colombo": ["Akarawita", "Ambalangoda", "Athurugiriya", "Avissawella", "Batawala", "Battaramulla", "Biyagama", "Bope", "Boralesgamuwa", "Colombo 1", "Colombo 10", "Colombo 11", "Colombo 12", "Colombo 13", "Colombo 14", "Colombo 15", "Colombo 2", "Colombo 3", "Colombo 4", "Colombo 5", "Colombo 6", "Colombo 7", "Colombo 8", "Colombo 9", "Dedigamuwa", "Dehiwala", "Deltara", "Habarakada", "Hanwella", "Hiripitya", "Hokandara", "Homagama", "Horagala", "Kaduwela", "Kaluaggala", "Kapugoda", "Kehelwatta", "Kiriwattuduwa", "Kolonnawa", "Kosgama", "Madapatha", "Maharagama", "Malabe", "Moratuwa", "Mount Lavinia", "Mullegama", "Napawela", "Nugegoda", "Padukka", "Pannipitiya", "Piliyandala", "Pitipana Homagama", "Polgasowita", "Pugoda", "Ranala", "Rajagiriya", "Siddamulla", "Siyambalagoda", "Sri Jayawardenepu", "Talawatugoda", "Tummodara", "Waga"],
    "Galle": ["Agaliya", "Ahangama", "Ahungalla", "Akmeemana", "Alawatugoda", "Aluthwala", "Ampegama", "Amugoda", "Anangoda", "Angulugaha", "Ankokkawala", "Aselapura", "Baddegama", "Balapitiya", "Banagala", "Batapola", "Bentota", "Boossa", "Dellawa", "Dikkumbura", "Dodanduwa", "Ella Tanabaddegama", "Elpitiya", "Galle", "Ginimellagaha", "Gintota", "Godahena", "Gonamulla Junction", "Gonapinuwala", "Habaraduwa", "Haburugala", "Hikkaduwa", "Hiniduma", "Hiyare", "Kahaduwa", "Kahawa", "Karagoda", "Karandeniya", "Kosgoda", "Kottawagama", "Kottegoda", "Kuleegoda", "Magedara", "Mahawela Sinhapura", "Mapalagama", "Mapalagama Central", "Mattaka", "Meda-Keembiya", "Meetiyagoda", "Nagoda", "Nakiyadeniya", "Nawadagala", "Neluwa", "Nindana", "Pahala Millawa", "Panangala", "Pannimulla Panagoda", "Parana ThanaYamgoda", "Patana", "Pitigala", "Poddala", "Polgampola", "Porawagama", "Rantotuwila", "Talagampola", "Talgaspe", "Talpe", "Tawalama", "Tiranagama", "Udalamatta", "Udugama", "Uluvitike", "Unawatuna", "Unenwitiya", "Uragaha", "Uragasmanhandiya", "Wakwella", "Walahanduwa", "Wanchawela", "Wanduramba", "Warukandeniya", "Watugedara", "Weihena", "Welikanda", "Wilanagama", "Yakkalamulla", "Yatalamatta"],
    "Gampaha": ["Akaragama", "Ambagaspitiya", "Ambepussa", "Andiambalama", "Attanagalla", "Badalgama", "Banduragoda", "Batuwatta", "Bemmulla", "Biyagama IPZ", "Bokalagama", "Bollete (WP)", "Bopagama", "Buthpitiya", "Dagonna", "Danowita", "Debahera", "Dekatana", "Delgoda", "Delwagura", "Demalagama", "Demanhandiya", "Dewalapola", "Divulapitiya", "Divuldeniya", "Dompe", "Dunagaha", "Ekala", "Ellakkala", "Essella", "Galedanda", "Gampaha", "Ganemulla", "Giriulla", "Gonawala", "Halpe", "Hapugastenna", "Heeloya", "Heiyanthuduwa", "Hinatiyana Madawala", "Hiswella", "Horampella", "Hunumulla", "Hunupola", "Ihala Madampella", "Imbulgoda", "Ja-Ela", "Kadawatha", "Kahatowita", "Kalagedihena", "Kaleliya", "Kandana", "Katana", "Katudeniya", "Katunayake", "Katunayake Air Force Camp", "Katunayake(FTZ)", "Katuwellegama", "Kelaniya", "Kimbulapitiya", "Kirindiwela", "Kitalawalana", "Kochchikade", "Kotadeniyawa", "Kotugoda", "Kumbaloluwa", "Loluwagoda", "Mabodale", "Madelgamuwa", "Makewita", "Makola", "Malwana", "Mandawala", "Marandagahamula", "Mellawagedara", "Minuwangoda", "Mirigama", "Miriswatta", "Mithirigala", "Muddaragama", "Mudungoda", "Mulleriyawa New Town", "Naranwala", "Nawana", "Nedungamuwa", "Negombo", "Nikadalupotha", "Nikahetikanda", "Nittambuwa", "Niwandama", "Opatha", "Pamunugama", "Pamunuwatta", "Panawala", "Pasyala", "Peliyagoda", "Pepiliyawala", "Pethiyagoda", "Polpithimukulana", "Puwakpitiya", "Radawadunna", "Radawana", "Raddolugama", "Ragama", "Ruggahawila", "Seeduwa", "Siyambalape", "Talahena", "Thambagalla", "Thimbirigaskatuwa", "Tittapattara", "Udathuthiripitiya", "Udugampola", "Uggalboda", "Urapola", "Uswetakeiyawa", "Veyangoda", "Walgammulla", "Walpita", "Walpola (WP)", "Wathurugama", "Watinapaha", "Wattala", "Weboda", "Wegowwa", "Weweldeniya", "Yakkala", "Yatiyana"],
    "Hambantota": ["Ambalantota", "Angunakolapelessa", "Angunakolawewa", "Bandagiriya Colony", "Barawakumbuka", "Beliatta", "Beragama", "Beralihela", "Bundala", "Ellagala", "Gangulandeniya", "Getamanna", "Goda Koggalla", "Gonagamuwa Uduwila", "Gonnoruwa", "Hakuruwela", "Hambantota", "Handugala", "Hungama", "Ihala Beligalla", "Ittademaliya", "Julampitiya", "Kahandamodara", "Kariyamaditta", "Katuwana", "Kawantissapura", "Kirama", "Kirinda", "Lunama", "Lunugamwehera", "Magama", "Mahagalwewa", "Mamadala", "Medamulana", "Middeniya", "Migahajandur", "Modarawana", "Mulkirigala", "Nakulugamuwa", "Netolpitiya", "Nihiluwa", "Padawkema", "Pahala Andarawewa", "RU/Ridiyagama", "Rammalawarapitiya", "Ranakeliya", "Ranmuduwewa", "Ranna", "Ratmalwala", "Sooriyawewa Town", "Tangalla", "Tissamaharama", "Uda Gomadiya", "Udamattala", "Uswewa", "Vitharandeniya", "Walasmulla", "Weeraketiya", "Weerawila", "Weerawila NewTown", "Wekandawela", "Weligatta", "Yatigala"],
    "Jaffna": ["Jaffna"],
    "Kalutara": ["Agalawatta", "Alubomulla", "Anguruwatota", "Atale", "Baduraliya", "Bandaragama", "Batugampola", "Bellana", "Beruwala", "Bolossagama", "Bombuwala", "Boralugoda", "Bulathsinhala", "Danawala Thiniyawala", "Delmella", "Dharga Town", "Diwalakada", "Dodangoda", "Dombagoda", "Ethkandura", "Galpatha", "Gamagoda", "Gonagalpura", "Gonapola Junction", "Govinna", "Gurulubadda", "Halkandawila", "Haltota", "Halvitigala Colony", "Halwala", "Halwatura", "Handapangoda", "Hedigalla Colony", "Henegama", "Hettimulla", "Horana", "Ittapana", "Kahawala", "Kalawila Kiranthidiya", "Kalutara", "Kananwila", "Kandanagama", "Kelinkanda", "Kitulgoda", "Koholana", "Kuda Uduwa", "Labbala", "Maggona", "Mahagama", "Mahakalupahana", "Maharangalla", "Malgalla Talangalla", "Matugama", "Meegahatenna", "Meegama", "Meegoda", "Millaniya", "Millewa", "Miwanapalana", "Molkawa", "Morapitiya", "Morontuduwa", "Nawattuduwa", "Neboda", "Padagoda", "Pahalahewessa", "Paiyagala", "Panadura", "Pannala", "Paragastota", "Paragoda", "Paraigama", "Pelanda", "Pelawatta", "Pimbura", "Pitagaldeniya", "Pokunuwita", "Poruwedanda", "Ratmale", "Remunagoda", "Talgaswela", "Tebuwana", "Uduwara", "Utumgama", "Veyangalla", "Wadduwa", "Walagedara", "Walallawita", "Waskaduwa", "Welipenna", "Weliveriya", "Welmilla Junction", "Weragala", "Yagirala", "Yatadolawatta", "Yatawara Junction", "lhalahewessa", "lnduruwa", "lngiriya"],
    "Kandy": ["Aludeniya", "Ambagahapelessa", "Ambagamuwa Udabulathgama", "Ambatenna", "Ampitiya", "Ankumbura", "Atabage", "Balana", "Bambaragahaela", "Batagolladeniya", "Batugoda", "Batumulla", "Bawlana", "Bopana", "Danture", "Dedunupitiya", "Dekinda", "Deltota", "Divulankadawala", "Dolapihilla", "Dolosbage", "Dunuwila", "Etulgama", "Galaboda", "Galagedara", "Galaha", "Galhinna", "Gampola", "Gelioya", "Godamunna", "Gomagoda", "Gonagantenna", "Gonawalapatana", "Gunnepana", "Gurudeniya", "Hakmana", "Handaganawa", "Handawalapitiya", "Handessa", "Hanguranketha", "Harangalagama", "Hataraliyadda", "Hindagala", "Hondiyadeniya", "Hunnasgiriya", "Inguruwatta", "Jambugahapitiya", "Kadugannawa", "Kahataliyadda", "Kalugala", "Kandy", "Kapuliyadde", "Katugastota", "Katukitula", "Kelanigama", "Kengalla", "Ketaboola", "Ketakumbura", "Kobonila", "Kolabissa", "Kolongoda", "Kulugammana", "Kumbukkandura", "Kumburegama", "Kundasale", "Leemagahakotuwa", "Lunugama", "Lunuketiya Maditta", "Madawala Bazaar", "Madawalalanda", "Madugalla", "Madulkele", "Mahadoraliyadda", "Mahamedagama", "Mahanagapura", "Mailapitiya", "Makkanigama", "Makuldeniya", "Mangalagama", "Mapakanda", "Marassana", "Marymount Colony", "Mawatura", "Medamahanuwara", "Medawala Harispattuwa", "Meetalawa", "Megoda Kalugamuwa", "Menikdiwela", "Menikhinna", "Mimure", "Minigamuwa", "Minipe", "Moragahapallama", "Murutalawa", "Muruthagahamulla", "Nanuoya", "Naranpanawa", "Narawelpita", "Nawalapitiya", "Nawathispane", "Nillambe", "Nugaliyadda", "Ovilikanda", "Pallekotuwa", "Panwilatenna", "Paradeka", "Pasbage", "Pattitalawa", "Peradeniya", "Pilimatalawa", "Poholiyadda", "Pubbiliya", "Pupuressa", "Pussellawa", "Putuhapuwa", "Rajawella", "Rambukpitiya", "Rambukwella", "Rangala", "Rantembe", "Rikillagaskada", "Sangarajapura", "Senarathwela", "Talatuoya", "Teldeniya", "Tennekumbura", "Uda Peradeniya", "Udahentenna", "Udatalawinna", "Udispattuwa", "Ududumbara", "Uduwahinna", "Uduwela", "Ulapane", "Unuwinna", "Velamboda", "Watagoda", "Watagoda Harispattuwa", "Wattappola", "Weligampola", "Wendaruwa", "Weragantota", "Werapitya", "Werellagama", "Wettawa", "Yahalatenna", "Yatihalagala", "lhala Kobbekaduwa"],
    "Kegalle": ["Alawala", "Alawatura", "Alawwa", "Algama", "Alutnuwara", "Ambalakanda", "Ambulugala", "Amitirigala", "Ampagala", "Anhandiya", "Anhettigama", "Aranayaka", "Aruggammana", "Batuwita", "Beligala(Sab)", "Belihuloya", "Berannawa", "Bopitiya", "Bopitiya (SAB)", "Boralankada", "Bossella", "Bulathkohupitiya", "Damunupola", "Debathgama", "Dedugala", "Deewala Pallegama", "Dehiowita", "Deldeniya", "Deloluwa", "Deraniyagala", "Dewalegama", "Dewanagala", "Dombemada", "Dorawaka", "Dunumala", "Galapitamada", "Galatara", "Galigamuwa Town", "Gallella", "Galpatha(Sab)", "Gantuna", "Getahetta", "Godagampola", "Gonagala", "Hakahinna", "Hakbellawaka", "Halloluwa", "Hedunuwewa", "Hemmatagama", "Hewadiwela", "Hingula", "Hinguralakanda", "Hingurana", "Hiriwadunna", "Ihala Walpola", "Ihalagama", "Imbulana", "Imbulgasdeniya", "Kabagamuwa", "Kahapathwala", "Kandaketya", "Kannattota", "Karagahinna", "Kegalle", "Kehelpannala", "Ketawala Leula", "Kitulgala", "Kondeniya", "Kotiyakumbura", "Lewangama", "Mahabage", "Makehelwala", "Malalpola", "Maldeniya", "Maliboda", "Maliyadda", "Malmaduwa", "Marapana", "Mawanella", "Meetanwala", "Migastenna Sabara", "Miyanawita", "Molagoda", "Morontota", "Narangala", "Narangoda", "Nattarampotha", "Nelundeniya", "Niyadurupola", "Noori", "Pannila", "Pattampitiya", "Pilawala", "Pothukoladeniya", "Puswelitenna", "Rambukkana", "Rilpola", "Rukmale", "Ruwanwella", "Samanalawewa", "Seaforth Colony", "Spring Valley", "Talgaspitiya", "Teligama", "Tholangamuwa", "Thotawella", "Udaha Hawupe", "Udapotha", "Uduwa", "Undugoda", "Ussapitiya", "Wahakula", "Waharaka", "Wanaluwewa", "Warakapola", "Watura", "Weeoya", "Wegalla", "Weligalla", "Welihelatenna", "Wewelwatta", "Yatagama", "Yatapana", "Yatiyantota", "Yattogoda"],
    "Kilinochchi": ["Kandavalai", "Karachchi", "Kilinochchi", "Pachchilaipalli", "Poonakary"],
    "Kurunegala": ["Akurana", "Alahengama", "Alahitiyawa", "Ambakote", "Ambanpola", "Andiyagala", "Anukkane", "Aragoda", "Ataragalla", "Awulegama", "Balalla", "Bamunukotuwa", "Bandara Koswatta", "Bingiriya", "Bogamulla", "Boraluwewa", "Boyagane", "Bujjomuwa", "Buluwala", "Dadayamtalawa", "Dambadeniya", "Daraluwa", "Deegalla", "Demataluwa", "Demuwatha", "Diddeniya", "Digannewa", "Divullegoda", "Diyasenpura", "Dodangaslanda", "Doluwa", "Doragamuwa", "Doratiyawa", "Dunumadalawa", "Dunuwilapitiya", "Ehetuwewa", "Elibichchiya", "Embogama", "Etungahakotuwa", "Galadivulwewa", "Galgamuwa", "Gallellagama", "Gallewa", "Ganegoda", "Girathalana", "Gokaralla", "Gonawila", "Halmillawewa", "Handungamuwa", "Harankahawa", "Helamada", "Hengamuwa", "Hettipola", "Hewainna", "Hilogama", "Hindagolla", "Hiriyala Lenawa", "Hiruwalpola", "Horambawa", "Hulogedara", "Hulugalla", "Ihala Gomugomuwa", "Ihala Kadigamuwa", "Ihala Katugampala", "Indulgodakanda", "Ithanawatta", "Kadigawa", "Kalankuttiya", "Kalatuwawa", "Kalugamuwa", "Kanadeniyawala", "Kanattewewa", "Kandegedara", "Karagahagedara", "Karambe", "Katiyawa", "Katupota", "Kawudulla", "Kawuduluwewa Stagell", "Kekunagolla", "Keppitiwalana", "Kimbulwanaoya", "Kirimetiyawa", "Kirindawa", "Kirindigalla", "Kithalawa", "Kitulwala", "Kobeigane", "Kohilagedara", "Konwewa", "Kosdeniya", "Kosgolla", "Kotagala", "Kotawehera", "Kudagalgamuwa", "Kudakatnoruwa", "Kuliyapitiya", "Kumaragama", "Kumbukgeta", "Kumbukwewa", "Kuratihena", "Kurunegala", "Lihiriyagama", "Lonahettiya", "Madahapola", "Madakumburumulla", "Madalagama", "Madawala Ulpotha", "Maduragoda", "Maeliya", "Magulagama", "Maha Ambagaswewa", "Mahagalkadawala", "Mahagirilla", "Mahamukalanyaya", "Mahananneriya", "Mahapallegama", "Maharachchimulla", "Mahatalakolawewa", "Mahawewa", "Maho", "Makulewa", "Makulpotha", "Makulwewa", "Malagane", "Mandapola", "Maspotha", "Mawathagama", "Medirigiriya", "Medivawa", "Meegalawa", "Meegaswewa", "Meewellawa", "Melsiripura", "Metikumbura", "Metiyagane", "Minhettiya", "Minuwangete", "Mirihanagama", "Monnekulama", "Moragane", "Moragollagama", "Morathiha", "Munamaldeniya", "Muruthenge", "Mutugala", "Nabadewa", "Nagollagama", "Nagollagoda", "Nakkawatta", "Narammala", "Nawasenapura", "Nawatalwatta", "Nelliya", "Nikaweratiya", "Nugagolla", "Nugawela", "Padeniya", "Padiwela", "Pahalagiribawa", "Pahamune", "Palagala", "Palapathwela", "Palaviya", "Pallewela", "Palukadawala", "Panadaragama", "Panagamuwa", "Panaliya", "Panapitiya", "Panliyadda", "Pansiyagama", "Parape", "Pathanewatta", "Pattiya Watta", "Perakanatta", "Periyakadneluwa", "Pihimbiya Ratmale", "Pihimbuwa", "Pilessa", "Polgahawela", "Polgolla", "Polpitigama", "Pothuhera", "Pothupitiya", "Pujapitiya", "Rakwana", "Ranorawa", "Rathukohodigala", "Ridibendiella", "Ridigama", "Saliya Asokapura", "Sandalankawa", "Sevanapitiya", "Sirambiadiya", "Sirisetagama", "Siyambalangamuwa", "Siyambalawewa", "Solepura", "Solewewa", "Sunandapura", "Talawattegedara", "Tambutta", "Tennepanguwa", "Thalahitimulla", "Thalakolawewa", "Thalwita", "Tharana Udawela", "Thimbiriyawa", "Tisogama", "Torayaya", "Tulhiriya", "Tuntota", "Tuttiripitigama", "Udagaldeniya", "Udahingulwala", "Udawatta", "Udubaddawa", "Udumulla", "Uhumiya", "Ulpotha Pallekele", "Ulpothagama", "Usgala Siyabmalangamuwa", "Vijithapura", "Wadakada", "Wadumunnegedara", "Walakumburumulla", "Wannigama", "Wannikudawewa", "Wannilhalagama", "Wannirasnayakapura", "Warawewa", "Wariyapola", "Watareka", "Wattegama", "Watuwatta", "Weerapokuna", "Welawa Juncton", "Welipennagahamulla", "Wellagala", "Wellarawa", "Wellawa", "Welpalla", "Wennoruwa", "Weuda", "Wewagama", "Wilgamuwa", "Yakwila", "Yatigaloluwa", "lbbagamuwa", "lllagolla", "llukhena"],
    "Mannar": ["Mannar", "Puthukudiyiruppu"],
    "Matale": ["Akuramboda", "Alawatuwala", "Alwatta", "Ambana", "Aralaganwila", "Ataragallewa", "Bambaragaswewa", "Barawardhana Oya", "Beligamuwa", "Damana", "Dambulla", "Damminna", "Dankanda", "Delwite", "Devagiriya", "Dewahuwa", "Divuldamana", "Dullewa", "Dunkolawatta", "Elkaduwa", "Erawula Junction", "Etanawala", "Galewela", "Galoya Junction", "Gammaduwa", "Gangala Puwakpitiya", "Hasalaka", "Hattota Amuna", "Imbulgolla", "Inamaluwa", "Iriyagolla", "Kaikawala", "Kalundawa", "Kandalama", "Kavudupelella", "Kibissa", "Kiwula", "Kongahawela", "Laggala Pallegama", "Leliambe", "Lenadora", "Madipola", "Maduruoya", "Mahawela", "Mananwatta", "Maraka", "Matale", "Melipitiya", "Metihakka", "Millawana", "Muwandeniya", "Nalanda", "Naula", "Opalgala", "Pallepola", "Pimburattewa", "Pulastigama", "Ranamuregama", "Rattota", "Selagama", "Sigiriya", "Sinhagama", "Sungavila", "Talagoda Junction", "Talakiriyagama", "Tamankaduwa", "Udasgiriya", "Udatenna", "Ukuwela", "Wahacotte", "Walawela", "Wehigala", "Welangahawatte", "Wewalawewa", "Yatawatta", "lhala Halmillewa", "lllukkumbura"],
    "Matara": ["Akuressa", "Alapaladeniya", "Aparekka", "Athuraliya", "Bengamuwa", "Bopagoda", "Dampahala", "Deegala Lenama", "Deiyandara", "Denagama", "Denipitiya", "Deniyaya", "Derangala", "Devinuwara (Dondra)", "Dikwella", "Diyagaha", "Diyalape", "Gandara", "Godapitiya", "Gomilamawarala", "Hawpe", "Horapawita", "Kalubowitiyana", "Kamburugamuwa", "Kamburupitiya", "Karagoda Uyangoda", "Karaputugala", "Karatota", "Kekanadurra", "Kiriweldola", "Kiriwelkele", "Kolawenigama", "Kotapola", "Lankagama", "Makandura", "Maliduwa", "Maramba", "Matara", "Mediripitiya", "Miella", "Mirissa", "Morawaka", "Mulatiyana Junction", "Nadugala", "Naimana", "Palatuwa", "Parapamulla", "Pasgoda", "Penetiyana", "Pitabeddara", "Puhulwella", "Radawela", "Ransegoda", "Rotumba", "Sultanagoda", "Telijjawila", "Thihagoda", "Urubokka", "Urugamuwa", "Urumutta", "Viharahena", "Walakanda", "Walasgala", "Waralla", "Weligama", "Wilpita", "Yatiyana"],
    "Monaragala": ["Ayiwela", "Badalkumbura", "Baduluwela", "Bakinigahawela", "Balaharuwa", "Bibile", "Buddama", "Buttala", "Dambagalla", "Diyakobala", "Dombagahawela", "Ethimalewewa", "Ettiliwewa", "Galabedda", "Gamewela", "Hambegamuwa", "Hingurukaduwa", "Hulandawa", "Inginiyagala", "Kandaudapanguwa", "Kandawinna", "Kataragama", "Kotagama", "Kotamuduna", "Kotawehera Mankada", "Kudawewa", "Kumbukkana", "Marawa", "Mariarawa", "Medagana", "Medawelagama", "Miyanakandura", "Monaragala", "Moretuwegama", "Nakkala", "Namunukula", "Nannapurawa", "Nelliyadda", "Nilgala", "Obbegoda", "Okkampitiya", "Pangura", "Pitakumbura", "Randeniya", "Ruwalwela", "Sella Kataragama", "Siyambalagune", "Siyambalanduwa", "Suriara", "Tanamalwila", "Uva Gangodagama", "Uva Kudaoya", "Uva Pelwatta", "Warunagama", "Wedikumbura", "Weherayaya Handapanagala", "Wellawaya", "Wilaoya", "Yudaganawa"],
    "Mullaitivu": ["Mullativu"],
    "Nuwara Eliya": ["Agarapathana", "Ambatalawa", "Ambewela", "Bogawantalawa", "Bopattalawa", "Dagampitiya", "Dayagama Bazaar", "Dikoya", "Doragala", "Dunukedeniya", "Egodawela", "Ekiriya", "Elamulla", "Ginigathena", "Gonakele", "Haggala", "Halgranoya", "Hangarapitiya", "Hapugastalawa", "Harasbedda", "Hatton", "Hewaheta", "Hitigegama", "Jangulla", "Kalaganwatta", "Kandapola", "Karandagolla", "Keerthi Bandarapura", "Kiribathkumbura", "Kotiyagala", "Kotmale", "Kottellena", "Kumbalgamuwa", "Kumbukwela", "Kurupanawela", "Labukele", "Laxapana", "Lindula", "Madulla", "Mandaram Nuwara", "Maskeliya", "Maswela", "Maturata", "Mipanawa", "Mipilimana", "Morahenagama", "Munwatta", "Nayapana Janapadaya", "Nildandahinna", "Nissanka Uyana", "Norwood", "Nuwara Eliya", "Padiyapelella", "Pallebowala", "Panvila", "Pitawala", "Pundaluoya", "Ramboda", "Rikillagaskada", "Rozella", "Rupaha", "Ruwaneliya", "Santhipura", "Talawakele", "Tawalantenna", "Teripeha", "Udamadura", "Udapussallawa", "Uva Deegalla", "Uva Uduwara", "Uvaparanagama", "Walapane", "Watawala", "Widulipura", "Wijebahukanda"],
    "Polonnaruwa": ["Attanakadawala", "Bakamuna", "Diyabeduma", "Elahera", "Giritale", "Hingurakdamana", "Hingurakgoda", "Jayanthipura", "Kalingaela", "Lakshauyana", "Mankemi", "Minneriya", "Onegama", "Orubendi Siyambalawa", "Palugasdamana", "Panichankemi", "Polonnaruwa", "Talpotha", "Tambala", "Unagalavehera", "Wijayabapura"],
    "Puttalam": ["Adippala", "Alutgama", "Alutwewa", "Ambakandawila", "Anamaduwa", "Andigama", "Angunawila", "Attawilluwa", "Bangadeniya", "Baranankattuwa", "Battuluoya", "Bujjampola", "Chilaw", "Dalukana", "Dankotuwa", "Dewagala", "Dummalasuriya", "Dunkannawa", "Eluwankulama", "Ettale", "Galamuna", "Galmuruwa", "Hansayapalama", "Ihala Kottaramulla", "Ilippadeniya", "Inginimitiya", "Ismailpuram", "Jayasiripura", "Kakkapalliya", "Kalkudah", "Kalladiya", "Kandakuliya", "Karathivu", "Karawitagara", "Karuwalagaswewa", "Katuneriya", "Koswatta", "Kottantivu", "Kottapitiya", "Kottukachchiya", "Kumarakattuwa", "Kurinjanpitiya", "Kuruketiyawa", "Lunuwila", "Madampe", "Madurankuliya", "Mahakumbukkadawala", "Mahauswewa", "Mampitiya", "Mampuri", "Mangalaeliya", "Marawila", "Mudalakkuliya", "Mugunuwatawana", "Mukkutoduwawa", "Mundel", "Muttibendiwila", "Nainamadama", "Nalladarankattuwa", "Nattandiya", "Nawagattegama", "Nelumwewa", "Norachcholai", "Pallama", "Palliwasalturai", "Panirendawa", "Parakramasamudraya", "Pothuwatawana", "Puttalam", "Puttalam Cement Factory", "Rajakadaluwa", "Saliyawewa Junction", "Serukele", "Siyambalagashene", "Tabbowa", "Talawila Church", "Toduwawa", "Udappuwa", "Uridyawa", "Vanathawilluwa", "Waikkal", "Watugahamulla", "Wennappuwa", "Wijeyakatupotha", "Wilpotha", "Yodaela", "Yogiyana"],
    "Ratnapura": ["Akarella", "Amunumulla", "Atakalanpanna", "Ayagama", "Balangoda", "Batatota", "Beralapanathara", "Bogahakumbura", "Bolthumbe", "Bomluwageaina", "Bowalagama", "Bulutota", "Dambuluwana", "Daugala", "Dela", "Delwala", "Dodampe", "Doloswalakanda", "Dumbara Manana", "Eheliyagoda", "Ekamutugama", "Elapatha", "Ellagawa", "Ellaulla", "Ellawala", "Embilipitiya", "Eratna", "Erepola", "Gabbela", "Gangeyaya", "Gawaragiriya", "Gillimale", "Godakawela", "Gurubewilagama", "Halwinna", "Handagiriya", "Hatangala", "Hatarabage", "Hewanakumbura", "Hidellana", "Hiramadagama", "Horewelagoda", "Ittakanda", "Kahangama", "Kahawatta", "Kalawana", "Kaltota", "Kalubululanda", "Kananke Bazaar", "Kandepuhulpola", "Karandana", "Karangoda", "Kella Junction", "Keppetipola", "Kiriella", "Kiriibbanwewa", "Kolambageara", "Kolombugama", "Kolonna", "Kudawa", "Kuruwita", "Lellopitiya", "Mahagama Colony", "Mahawalatenna", "Makandura Sabara", "Malwala Junction", "Malwatta", "Matuwagalagama", "Medagalatur", "Meddekanda", "Minipura Dumbara", "Mitipola", "Moragala Kirillapone", "Morahela", "Mulendiyawala", "Mulgama", "Nawalakanda", "NawinnaPinnakanda", "Niralagama", "Nivitigala", "Omalpe", "Opanayaka", "Padalangala", "Pallebedda", "Pallekanda", "Pambagolla", "Panamura", "Panapola", "Paragala", "Parakaduwa", "Pebotuwa", "Pelmadulla", "Pinnawala", "Pothdeniya", "Rajawaka", "Ranwala", "Rassagala", "Ratgama", "Ratna Hangamuwa", "Ratnapura", "Sewanagala", "Sri Palabaddala", "Sudagala", "Talakolahinna", "Tanjantenna", "Teppanawa", "Tunkama", "Udakarawita", "Udaniriella", "Udawalawe", "Ullinduwawa", "Veddagala", "Vijeriya", "Waleboda", "Watapotha", "Waturawa", "Weligepola", "Welipathayaya", "Wikiliya", "lmaduwa", "lmbulpe"],
    "Trincomalee": ["Agbopura", "Buckmigama", "China Bay", "Dehiwatte", "Echchilampattai", "Galmetiyawa", "Gomarankadawala", "Kaddaiparichchan", "Kallar", "Kanniya", "Kantalai", "Kantalai Sugar Factory", "Kiliveddy", "Kinniya", "Kuchchaveli", "Kumburupiddy", "Kurinchakemy", "Lankapatuna", "Mahadivulwewa", "Maharugiramam", "Mallikativu", "Mawadichenai", "Mullipothana", "Mutur", "Neelapola", "Nilaveli", "Pankulam", "Pulmoddai", "Rottawewa", "Sampaltivu", "Sampoor", "Serunuwara", "Seruwila", "Sirajnagar", "Somapura", "Tampalakamam", "Thuraineelavanai", "Tiriyayi", "Toppur", "Trincomalee", "Wanela"],
    "Vavuniya": ["Vavuniya"]
};

export const targetAudienceOptions = [
    { value: 'Preschool children (Early learners)', label: 'Preschool children (Early learners)' },
    { value: 'Primary school students (Grade 1–5)', label: 'Primary school students (Grade 1–5)' },
    { value: 'Secondary school students (Grade 6–11 / O/L candidates)', label: 'Secondary school students (O/L)' },
    { value: 'Advanced Level students (A/L candidates – Arts, Commerce, Science, Technology)', label: 'Advanced Level students (A/L)' },
    { value: 'University students (State and private universities)', label: 'University students' },
    { value: 'Vocational training students (Technical, NVQ, and skill-based learners)', label: 'Vocational training students' },
    { value: 'Professional qualification candidates (CIMA, ACCA, CA, CMA, Banking, ICT, etc.)', label: 'Professional qualification candidates' },
    { value: 'Postgraduate students (Masters, PhD)', label: 'Postgraduate students (Masters, PhD)' },
    { value: 'Lifelong learners (Adults pursuing personal or professional development)', label: 'Lifelong learners (Adults)' },
    { value: 'Other', label: 'Other (Please specify)' },
];

export const instituteTypes: InstituteType[] = [
    'School',
    'Tuition Institute',
    'University',
    'Vocational Training',
    'Technical College',
    'Teacher Training',
    'Other'
];

export const secondarySchoolSubjects = [
    "Sinhala Language & Literature", "Tamil Language & Literature", "English Language",
    "Second Language (Sinhala / Tamil)", "Appreciation of English / Sinhala / Tamil / Arabic Literary Texts",
    "Buddhism", "Saivanery (Hinduism)", "Catholicism", "Christianity", "Islam",
    "Mathematics", "Science", "History", "Business & Accounting Studies", "Geography",
    "Civic Education", "Entrepreneurship Studies", "Art", "Music (Oriental / Western / Carnatic)",
    "Dancing (Indigenous / Bharatha)", "Drama & Theatre (Sinhala / Tamil / English)", "Arts & Crafts",
    "Information & Communication Technology", "Agriculture & Food Technology", "Aquatic Bioresources Technology",
    "Health & Physical Education", "Home Economics", "Design & Construction Technology", "Design & Mechanical Technology",
    "Design, Electrical & Electronic Technology", "Communication & Media Studies", "Electronic Writing & Shorthand (Sinhala / Tamil / English)",
    "Pali", "Sanskrit", "French", "German", "Hindi", "Japanese", "Arabic", "Korean", "Chinese", "Russian"
].map(s => ({ value: s, label: s }));

export const advancedLevelSubjects = [
    "Combined Mathematics", "Physics", "Chemistry", "Biology", "Information & Communication Technology",
    "Agriculture Science", "Bio Systems Technology", "Science for Technology", "Business Studies",
    "Accounting", "Economics", "Business Statistics", "Political Science", "Sinhala", "Tamil", "English",
    "French", "German", "Japanese", "Russian", "Chinese", "Arabic", "Hindi", "Pali", "Sanskrit",
    "Greek & Roman Civilization", "History of Sri Lanka", "History of India", "History of Europe",
    "History of the Modern World", "Logic & Scientific Method", "Geography", "Art", "Drama & Theatre (Sinhala / Tamil / English)",
    "Communication & Media Studies", "Buddhist Civilization", "Hindu Civilization", "Islamic Civilization",
    "Christian Civilization", "Buddhism", "Hinduism", "Christianity", "Islam", "Engineering Technology",
    "Mechanical Technology", "Civil Technology", "Electrical, Electronic & Information Technology",
    "Food Technology", "Agro Technology", "Bio Resource Technology", "Dancing (Indigenous / Bharatha)",
    "Oriental Music", "Carnatic Music", "Western Music", "General English", "Common General Test"
].map(s => ({ value: s, label: s }));

export const defaultSubjectsByAudience: Record<string, { value: string, label: string }[]> = {
    [targetAudienceOptions[2].value]: secondarySchoolSubjects,
    [targetAudienceOptions[3].value]: advancedLevelSubjects,
};


export const homeSlides: HomeSlide[] = [
    {
        image: "https://images.unsplash.com/photo-1588075592446-265fd1e6e76f?q=80&w=1472&auto=format&fit=crop",
        title: "Unlock Your Potential",
        subtitle: "Find expert tutors in any subject, right here in Sri Lanka. Your path to success starts now.",
        ctaText: "Find a Teacher"
    },
    {
        image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1470&auto=format&fit=crop",
        title: "Flexible Learning, Your Way",
        subtitle: "Join live online classes, enroll in comprehensive courses, and test your knowledge with quizzes.",
        ctaText: "Explore Classes"
    },
    {
        image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1470&auto=format&fit=crop",
        title: "Share Your Expertise",
        subtitle: "Are you a passionate educator? Join our platform and connect with thousands of students across the island.",
        ctaText: "Start Teaching"
    }
];

export const mockSocialMediaLinks: SocialMediaLink[] = [
    { id: 'facebook', name: 'Facebook', url: 'https://facebook.com', icon: 'FacebookIcon' },
    { id: 'twitter', name: 'Twitter', url: 'https://twitter.com', icon: 'TwitterIcon' },
    { id: 'linkedin', name: 'LinkedIn', url: 'https://linkedin.com', icon: 'LinkedInIcon' },
];

const studentUser: User = {
    id: "std_user_1",
    firstName: "Pasan",
    lastName: "Gunawardena",
    email: "student@example.com",
    role: 'student',
    avatar: 'https://picsum.photos/seed/student@example.com/150/150',
    status: 'active',
    enrolledCourseIds: ['c_teacher1_1'],
    enrolledClassIds: [1, 3],
    enrolledQuizIds: ['q_teacher1_1'],
    accountBalance: 12500,
    referralCode: "PASAN123",
    watchHistory: {
        'c_teacher1_1': {
            'l_1_1': true,
        }
    },
    createdAt: '2024-05-01T10:00:00Z',
};

const teacherUser: User = {
    id: "tchr_user_1",
    firstName: "Anura",
    lastName: "Perera",
    email: "teacher@example.com",
    role: 'teacher',
    avatar: 'https://picsum.photos/seed/teacher@example.com/150/150',
    status: 'active',
    accountBalance: 0,
    referralCode: "ANURA456",
    createdAt: '2024-04-15T12:00:00Z',
};

const adminUser: User = {
    id: "adm_user_1",
    firstName: "Admin",
    lastName: "User",
    email: "admin@example.com",
    role: 'admin',
    avatar: 'https://picsum.photos/seed/admin@example.com/150/150',
    status: 'active',
    accountBalance: 0,
    referralCode: "ADMIN789",
    createdAt: '2024-04-10T09:00:00Z',
};

const instituteUser: User = {
    id: "ti_user_1",
    firstName: "Apex",
    lastName: "Institute",
    email: "institute@example.com",
    role: 'tuition_institute',
    avatar: 'https://picsum.photos/seed/institute@example.com/150/150',
    status: 'active',
    accountBalance: 0,
    referralCode: "APEX2024",
    createdAt: '2024-03-01T10:00:00Z'
};


export const mockUsers: User[] = [studentUser, teacherUser, adminUser, instituteUser];

const lectures: Lecture[] = [
    { id: 'l_1_1', title: 'Introduction to Mechanics', description: 'Understanding the basics of Newtonian mechanics.', videoUrl: 'https://vimeo.com/901037626', durationMinutes: 25, isFreePreview: true },
    { id: 'l_1_2', title: 'Kinematics', description: 'Exploring motion in one and two dimensions.', videoUrl: 'https://vimeo.com/901037626', durationMinutes: 45, isFreePreview: false },
    { id: 'l_1_3', title: 'Dynamics and Newton\'s Laws', description: 'A deep dive into the laws of motion.', videoUrl: 'https://vimeo.com/901037626', durationMinutes: 60, isFreePreview: false },
];

const course: Course = {
    id: 'c_teacher1_1',
    teacherId: 'tchr_user_1',
    title: 'A/L Physics - Full Mechanics Course',
    description: 'A comprehensive course covering the entire mechanics syllabus for the Advanced Level examination.',
    subject: 'Physics',
    coverImage: 'https://picsum.photos/seed/course_physics/800/450',
    fee: 10000,
    currency: 'LKR',
    type: 'recorded',
    lectures,
    isPublished: true,
    ratings: [{ studentId: 'std_user_1', rating: 4, ratedAt: new Date().toISOString() }],
    adminApproval: 'approved',
};

const individualClasses: IndividualClass[] = [
    {
        id: 1, teacherId: 'tchr_user_1', title: 'Weekly A/L Physics Theory', subject: 'Physics',
        description: 'Covering the full A/L syllabus chapter by chapter.', date: '2024-05-20',
        startTime: '16:00', endTime: '18:00', fee: 2000, currency: 'LKR', targetAudience: 'Advanced Level students (A/L)',
        mode: 'Both', joiningLink: 'https://zoom.us/j/1234567890', recurrence: 'weekly',
        institute: 'Apex Education Center', district: 'Colombo', town: 'Nugegoda',
        status: 'scheduled', isPublished: true, instituteId: 'ti_user_1'
    },
    {
        id: 2, teacherId: 'tchr_user_1', title: 'Past Paper Discussion - 2022', subject: 'Physics',
        description: 'In-depth discussion of the 2022 A/L Physics past paper.', date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
        startTime: '10:00', endTime: '13:00', fee: 1500, currency: 'LKR', targetAudience: 'Advanced Level students (A/L)',
        mode: 'Online', joiningLink: 'https://zoom.us/j/1234567890', recurrence: 'none',
        status: 'scheduled', isPublished: true,
    },
    {
        id: 3, teacherId: 'tchr_user_1', title: 'Finished Class Example', subject: 'Physics',
        description: 'This class was held in the past.', date: '2024-05-01',
        startTime: '10:00', endTime: '12:00', fee: 1000, currency: 'LKR', targetAudience: 'Advanced Level students (A/L)',
        mode: 'Online', recurrence: 'none', status: 'finished', isPublished: true,
    }
];

const quizzes: Quiz[] = [
    {
        id: 'q_teacher1_1', teacherId: 'tchr_user_1', title: 'Mechanics Unit Test 1', subject: 'Physics',
        description: 'A short quiz to test your knowledge on the first unit of mechanics.',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
        startTime: '19:00', durationMinutes: 30, fee: 500, currency: 'LKR',
        questions: [
            { id: 'q1_1', text: 'What is the SI unit of force?', answers: [{ id: 'a1', text: 'Joule', isCorrect: false }, { id: 'a2', text: 'Watt', isCorrect: false }, { id: 'a3', text: 'Newton', isCorrect: true }, { id: 'a4', text: 'Pascal', isCorrect: false }] },
            { id: 'q1_2', text: 'Which of Newton\'s laws is also known as the law of inertia?', answers: [{ id: 'a5', text: 'First Law', isCorrect: true }, { id: 'a6', text: 'Second Law', isCorrect: false }, { id: 'a7', text: 'Third Law', isCorrect: false }] }
        ],
        status: 'scheduled', isPublished: true
    }
];

export const mockTeachers: Teacher[] = [
    {
        id: 'tchr_user_1', userId: 'tchr_user_1', name: 'Anura Perera', username: 'anuraperera',
        email: 'teacher@example.com', profileImage: 'https://picsum.photos/seed/teacherprofile@example.com/300/300',
        avatar: 'https://picsum.photos/seed/teacher@example.com/150/150',
        coverImages: ['https://picsum.photos/seed/pteacher@example.com/1200/400'],
        tagline: 'Experienced Physics Teacher for A/L Students',
        bio: 'With over 15 years of experience, I specialize in making complex physics concepts simple and understandable for Advanced Level students. My goal is to help you achieve your best results.',
        subjects: ['Physics', 'Combined Mathematics'], exams: ['G.C.E. Advanced Level'],
        qualifications: ['B.Sc. in Physics (University of Colombo)', 'M.Sc. in Education'],
        languages: ['Sinhala', 'English'], experienceYears: 15, commissionRate: 15,
        contact: { phone: '+94 77 123 4567', email: 'teacher@example.com', location: 'Nugegoda, Colombo', onlineAvailable: true },
        timetable: [], individualClasses, courses: [course], quizzes, achievements: ['Produced island-rank holders', 'Author of "Physics Made Easy" textbook'],
        registrationStatus: 'approved',
        earnings: { total: 150000, withdrawn: 80000, available: 70000 },
        withdrawalHistory: [
            { id: 'w1', userId: 'tchr_user_1', amount: 50000, requestedAt: '2024-04-10T10:00:00Z', processedAt: '2024-04-12T10:00:00Z', status: 'completed' },
            { id: 'w2', userId: 'tchr_user_1', amount: 30000, requestedAt: '2024-05-15T10:00:00Z', status: 'pending' },
        ],
        payoutDetails: { bankName: 'Sampath Bank', branchName: 'Nugegoda', accountHolderName: 'A. B. Perera', accountNumber: '123456789012' },
        verification: { id: { status: 'verified' }, bank: { status: 'verified' } },
        ratings: [{ studentId: 'std_user_1', classId: 3, rating: 5, ratedAt: new Date().toISOString() }]
    }
];

const mockEvent: Event = {
    id: "evt_1",
    organizerId: "ti_user_1",
    organizerType: 'tuition_institute',
    title: "Annual School Photography Exhibition",
    description: "View and purchase memories from the year's best school events.",
    flyerImage: "https://picsum.photos/seed/event_flyer/800/450",
    category: "Exhibition",
    mode: 'Physical',
    venue: "Main School Auditorium",
    startDate: new Date().toISOString().split('T')[0],
    startTime: "09:00",
    endDate: new Date().toISOString().split('T')[0],
    endTime: "17:00",
    registrationDeadline: new Date().toISOString().split('T')[0],
    duration: "Full Day",
    tickets: { price: 0, maxParticipants: null },
    participatingTeacherIds: ['tchr_user_1'],
    status: 'scheduled',
    adminApproval: 'approved',
    isPublished: true,
    gallery: {
        isEnabled: true,
        googleDriveLink: "https://drive.google.com/drive/folders/your_folder_id",
        downloadPrice: 150,
        downloadPriceHighRes: 500,
        bulkDiscounts: [
            { id: 'd1', quantity: 5, discountPercent: 10 },
            { id: 'd2', quantity: 10, discountPercent: 20 },
        ],
        photos: Array.from({ length: 20 }, (_, i) => ({
            id: `photo_${i + 1}`,
            url_thumb: `https://picsum.photos/seed/event_photo_${i + 1}/400/400`,
            url_highres: `https://picsum.photos/seed/event_photo_${i + 1}/1920/1080`,
        }))
    }
};

export const mockTuitionInstitutes: TuitionInstitute[] = [
    {
        id: "ti_user_1",
        userId: "ti_user_1",
        name: "Apex Institute",
        address: { line1: '123, High Level Road', city: 'Nugegoda', state: 'Western', postalCode: '10250', country: 'Sri Lanka' },
        contact: { phone: '0112828282', email: 'info@apexinstitute.lk', location: 'Nugegoda', onlineAvailable: true },
        commissionRate: 30,
        platformMarkupRate: 15,
        photoCommissionRate: 60,
        registrationStatus: 'approved',
        earnings: { total: 250000, withdrawn: 100000, available: 150000 },
        withdrawalHistory: [],
        events: [mockEvent],
    }
];


export const mockSales: Sale[] = [
    {
        id: 'sale_1', studentId: 'std_user_1', teacherId: 'tchr_user_1',
        itemId: 'c_teacher1_1', itemType: 'course', itemName: 'A/L Physics - Full Mechanics Course',
        totalAmount: 10000, amountPaidFromBalance: 0, saleDate: '2024-05-10T14:00:00Z', currency: 'LKR',
        status: 'completed', itemSnapshot: course
    },
    {
        id: 'sale_2', studentId: 'std_user_1', teacherId: 'tchr_user_1',
        itemId: 1, itemType: 'class', itemName: 'Weekly A/L Physics Theory',
        totalAmount: 2000, amountPaidFromBalance: 0, saleDate: '2024-05-18T10:00:00Z', currency: 'LKR',
        status: 'completed', itemSnapshot: individualClasses[0]
    },
    {
        id: 'sale_3', studentId: 'std_user_1', teacherId: 'tchr_user_1',
        itemId: 3, itemType: 'class', itemName: 'Finished Class Example',
        totalAmount: 1000, amountPaidFromBalance: 0, saleDate: '2024-04-30T10:00:00Z', currency: 'LKR',
        status: 'completed', itemSnapshot: individualClasses[2]
    },
    {
        id: 'sale_4', studentId: 'std_user_1', teacherId: 'tchr_user_1',
        itemId: 'q_teacher1_1', itemType: 'quiz', itemName: 'Mechanics Unit Test 1',
        totalAmount: 0, amountPaidFromBalance: 500, saleDate: '2024-05-19T10:00:00Z', currency: 'LKR',
        status: 'completed', itemSnapshot: quizzes[0]
    }
];

export const mockVouchers: Voucher[] = [];
export const mockTopUpRequests: TopUpRequest[] = [];
export const defaultCoverImages: string[] = ['https://picsum.photos/seed/default1/1200/400', 'https://picsum.photos/seed/default2/1200/400'];
export const mockSubmissions: any[] = [];
export const mockPhotoPrintOptions: PhotoPrintOption[] = [
    { id: 'print_4x6', size: '4x6', price: 50 },
    { id: 'print_5x7', size: '5x7', price: 80 },
    { id: 'print_a4', size: 'A4', price: 150 },
];
