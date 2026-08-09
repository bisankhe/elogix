-- ============================================================
-- FILE: database/seeds/03_nepal_provinces_districts.sql
-- Nepal's 7 Provinces + 77 Districts + Major Municipalities
-- Used by: Company Setup, Branch Setup, Work Location
-- ============================================================

CREATE TABLE IF NOT EXISTS nepal_provinces (
    id          SERIAL       PRIMARY KEY,
    code        VARCHAR(5)   NOT NULL UNIQUE,
    name_en     VARCHAR(100) NOT NULL,
    name_np     VARCHAR(100),
    hq_district VARCHAR(100),
    total_districts INT
);

CREATE TABLE IF NOT EXISTS nepal_districts (
    id           SERIAL       PRIMARY KEY,
    province_id  INT          REFERENCES nepal_provinces(id),
    code         VARCHAR(10)  NOT NULL UNIQUE,
    name_en      VARCHAR(100) NOT NULL,
    name_np      VARCHAR(100),
    headquarters VARCHAR(100),
    labour_office VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS nepal_municipalities (
    id            SERIAL       PRIMARY KEY,
    district_id   INT          REFERENCES nepal_districts(id),
    name_en       VARCHAR(150) NOT NULL,
    name_np       VARCHAR(150),
    type          VARCHAR(30)  CHECK (type IN ('metropolitan','sub_metropolitan','municipality','rural_municipality')),
    ward_count    INT
);

-- ── Provinces ─────────────────────────────────────────────────
INSERT INTO nepal_provinces (code, name_en, name_np, hq_district, total_districts) VALUES
('P1', 'Koshi Province',       'कोशी प्रदेश',        'Biratnagar', 14),
('P2', 'Madhesh Province',     'मधेश प्रदेश',        'Janakpur',   8),
('P3', 'Bagmati Province',     'बागमती प्रदेश',      'Hetauda',    13),
('P4', 'Gandaki Province',     'गण्डकी प्रदेश',      'Pokhara',    11),
('P5', 'Lumbini Province',     'लुम्बिनी प्रदेश',    'Butwal',     12),
('P6', 'Karnali Province',     'कर्णाली प्रदेश',     'Birendranagar', 10),
('P7', 'Sudurpashchim Province','सुदूरपश्चिम प्रदेश', 'Dhangadhi',  9)
ON CONFLICT (code) DO NOTHING;

-- ── Districts (all 77) ────────────────────────────────────────
INSERT INTO nepal_districts (province_id, code, name_en, name_np, headquarters, labour_office)
SELECT p.id, d.code, d.name_en, d.name_np, d.hq, d.lo
FROM nepal_provinces p
JOIN (VALUES
  -- Province 1 — Koshi (14 districts)
  ('P1','D001','Taplejung',   'ताप्लेजुङ',    'Taplejung',   'Taplejung Labour Office'),
  ('P1','D002','Panchthar',   'पाँचथर',       'Phidim',      'Ilam Labour Office'),
  ('P1','D003','Ilam',        'इलाम',         'Ilam',        'Ilam Labour Office'),
  ('P1','D004','Jhapa',       'झापा',         'Chandragadhi', 'Jhapa Labour Office'),
  ('P1','D005','Morang',      'मोरङ',         'Biratnagar',  'Biratnagar Labour Office'),
  ('P1','D006','Sunsari',     'सुनसरी',       'Inaruwa',     'Itahari Labour Office'),
  ('P1','D007','Dhankuta',    'धनकुटा',       'Dhankuta',    'Dhankuta Labour Office'),
  ('P1','D008','Terhathum',   'तेह्रथुम',     'Myanglung',   'Dhankuta Labour Office'),
  ('P1','D009','Sankhuwasabha','सङ्खुवासभा',  'Khandbari',   'Khandbari Labour Office'),
  ('P1','D010','Bhojpur',     'भोजपुर',       'Bhojpur',     'Bhojpur Labour Office'),
  ('P1','D011','Solukhumbu',  'सोलुखुम्बु',   'Salleri',     'Salleri Labour Office'),
  ('P1','D012','Okhaldhunga', 'ओखलढुङ्गा',    'Okhaldhunga', 'Okhaldhunga Labour Office'),
  ('P1','D013','Khotang',     'खोटाङ',        'Diktel',      'Diktel Labour Office'),
  ('P1','D014','Udayapur',    'उदयपुर',       'Gaighat',     'Gaighat Labour Office'),
  -- Province 2 — Madhesh (8 districts)
  ('P2','D015','Saptari',     'सप्तरी',       'Rajbiraj',    'Rajbiraj Labour Office'),
  ('P2','D016','Siraha',      'सिरहा',        'Siraha',      'Siraha Labour Office'),
  ('P2','D017','Dhanusha',    'धनुषा',        'Janakpur',    'Janakpur Labour Office'),
  ('P2','D018','Mahottari',   'महोत्तरी',     'Jaleshwar',   'Jaleshwar Labour Office'),
  ('P2','D019','Sarlahi',     'सर्लाही',      'Malangwa',    'Malangwa Labour Office'),
  ('P2','D020','Rautahat',    'रौतहट',        'Gaur',        'Gaur Labour Office'),
  ('P2','D021','Bara',        'बारा',         'Kalaiya',     'Kalaiya Labour Office'),
  ('P2','D022','Parsa',       'पर्सा',        'Birgunj',     'Birgunj Labour Office'),
  -- Province 3 — Bagmati (13 districts)
  ('P3','D023','Sindhupalchok','सिन्धुपाल्चोक','Chautara',   'Chautara Labour Office'),
  ('P3','D024','Kavrepalanchok','काभ्रेपलाञ्चोक','Dhulikhel', 'Banepa Labour Office'),
  ('P3','D025','Kathmandu',   'काठमाडौँ',     'Kathmandu',   'Kathmandu Labour Office, Ekantakuna'),
  ('P3','D026','Bhaktapur',   'भक्तपुर',      'Bhaktapur',   'Bhaktapur Labour Office'),
  ('P3','D027','Lalitpur',    'ललितपुर',      'Lalitpur',    'Lalitpur Labour Office'),
  ('P3','D028','Ramechhap',   'रामेछाप',      'Manthali',    'Ramechhap Labour Office'),
  ('P3','D029','Dolakha',     'दोलखा',        'Charikot',    'Charikot Labour Office'),
  ('P3','D030','Sindhuli',    'सिन्धुली',     'Sindhulimadhi','Sindhuli Labour Office'),
  ('P3','D031','Makwanpur',   'मकवानपुर',     'Hetauda',     'Hetauda Labour Office'),
  ('P3','D032','Rasuwa',      'रसुवा',        'Dhunche',     'Rasuwa Labour Office'),
  ('P3','D033','Nuwakot',     'नुवाकोट',      'Bidur',       'Bidur Labour Office'),
  ('P3','D034','Dhading',     'धादिङ',        'Nilkantha',   'Dhading Labour Office'),
  ('P3','D035','Chitwan',     'चितवन',        'Bharatpur',   'Bharatpur Labour Office'),
  -- Province 4 — Gandaki (11 districts)
  ('P4','D036','Gorkha',      'गोर्खा',       'Gorkha',      'Gorkha Labour Office'),
  ('P4','D037','Manang',      'मनाङ',         'Chame',       'Manang Labour Office'),
  ('P4','D038','Mustang',     'मुस्ताङ',      'Jomsom',      'Mustang Labour Office'),
  ('P4','D039','Myagdi',      'म्याग्दी',     'Beni',        'Beni Labour Office'),
  ('P4','D040','Kaski',       'कास्की',       'Pokhara',     'Pokhara Labour Office'),
  ('P4','D041','Lamjung',     'लमजुङ',        'Besisahar',   'Lamjung Labour Office'),
  ('P4','D042','Tanahun',     'तनहुँ',        'Damauli',     'Damauli Labour Office'),
  ('P4','D043','Nawalpur',    'नवलपुर',       'Kawasoti',    'Nawalpur Labour Office'),
  ('P4','D044','Parbat',      'पर्वत',        'Kusma',       'Parbat Labour Office'),
  ('P4','D045','Baglung',     'बागलुङ',       'Baglung',     'Baglung Labour Office'),
  ('P4','D046','Syangja',     'स्याङ्जा',     'Waling',      'Syangja Labour Office'),
  -- Province 5 — Lumbini (12 districts)
  ('P5','D047','Kapilvastu',  'कपिलवस्तु',   'Taulihawa',   'Kapilvastu Labour Office'),
  ('P5','D048','Rupandehi',   'रुपन्देही',    'Butwal',      'Butwal Labour Office'),
  ('P5','D049','Nawalparasi East','पूर्वी नवलपरासी','Parasi','Nawalparasi Labour Office'),
  ('P5','D050','Arghakhanchi','अर्घाखाँची',   'Sandhikharka','Arghakhanchi Labour Office'),
  ('P5','D051','Gulmi',       'गुल्मी',       'Tamghas',     'Gulmi Labour Office'),
  ('P5','D052','Palpa',       'पाल्पा',       'Tansen',      'Palpa Labour Office'),
  ('P5','D053','Dang',        'दाङ',          'Ghorahi',     'Ghorahi Labour Office'),
  ('P5','D054','Pyuthan',     'प्युठान',      'Pyuthan',     'Pyuthan Labour Office'),
  ('P5','D055','Rolpa',       'रोल्पा',       'Rolpa',       'Rolpa Labour Office'),
  ('P5','D056','East Rukum',  'पूर्वी रुकुम', 'Rukumkot',    'Rukum Labour Office'),
  ('P5','D057','Banke',       'बाँके',        'Nepalgunj',   'Nepalgunj Labour Office'),
  ('P5','D058','Bardiya',     'बर्दिया',      'Gulariya',    'Bardiya Labour Office'),
  -- Province 6 — Karnali (10 districts)
  ('P6','D059','Dolpa',       'डोल्पा',       'Dunai',       'Dolpa Labour Office'),
  ('P6','D060','Mugu',        'मुगु',         'Gamgadhi',    'Mugu Labour Office'),
  ('P6','D061','Humla',       'हुम्ला',       'Simikot',     'Humla Labour Office'),
  ('P6','D062','Jumla',       'जुम्ला',       'Khalanga',    'Jumla Labour Office'),
  ('P6','D063','Kalikot',     'कालिकोट',      'Manma',       'Kalikot Labour Office'),
  ('P6','D064','Dailekh',     'दैलेख',        'Narayan',     'Dailekh Labour Office'),
  ('P6','D065','Jajarkot',    'जाजरकोट',      'Khalanga',    'Jajarkot Labour Office'),
  ('P6','D066','West Rukum',  'पश्चिम रुकुम', 'Musikot',     'Rukum Labour Office'),
  ('P6','D067','Salyan',      'सल्यान',       'Salyan Khalanga','Salyan Labour Office'),
  ('P6','D068','Surkhet',     'सुर्खेत',      'Birendranagar','Surkhet Labour Office'),
  -- Province 7 — Sudurpashchim (9 districts)
  ('P7','D069','Bajura',      'बाजुरा',       'Martadi',     'Bajura Labour Office'),
  ('P7','D070','Bajhang',     'बझाङ',         'Chainpur',    'Bajhang Labour Office'),
  ('P7','D071','Achham',      'अछाम',         'Mangalsen',   'Achham Labour Office'),
  ('P7','D072','Doti',        'डोटी',         'Silgadhi',    'Doti Labour Office'),
  ('P7','D073','Kailali',     'कैलाली',       'Dhangadhi',   'Dhangadhi Labour Office'),
  ('P7','D074','Kanchanpur',  'कञ्चनपुर',     'Mahendranagar','Mahendranagar Labour Office'),
  ('P7','D075','Dadeldhura',  'डडेलधुरा',     'Dadeldhura',  'Dadeldhura Labour Office'),
  ('P7','D076','Baitadi',     'बैतडी',        'Dasharathchand','Baitadi Labour Office'),
  ('P7','D077','Darchula',    'दार्चुला',     'Khalanga',    'Darchula Labour Office')
) AS d(pcode, code, name_en, name_np, hq, lo) ON p.code = d.pcode
ON CONFLICT (code) DO NOTHING;

-- ── Key municipalities (Kathmandu Valley + major cities) ───────
INSERT INTO nepal_municipalities (district_id, name_en, name_np, type, ward_count)
SELECT d.id, m.name_en, m.name_np, m.type::VARCHAR, m.wards
FROM nepal_districts d
JOIN (VALUES
  ('D025','Kathmandu Metropolitan City', 'काठमाडौँ महानगरपालिका', 'metropolitan', 32),
  ('D025','Kirtipur Municipality',       'कीर्तिपुर नगरपालिका', 'municipality', 10),
  ('D025','Shankharapur Municipality',   'शंखरापुर नगरपालिका',  'municipality', 9),
  ('D027','Lalitpur Metropolitan City',  'ललितपुर महानगरपालिका','metropolitan', 29),
  ('D026','Bhaktapur Municipality',      'भक्तपुर नगरपालिका',   'municipality', 10),
  ('D026','Madhyapur Thimi Municipality','मध्यपुर थिमि नगरपालिका','municipality',6),
  ('D040','Pokhara Metropolitan City',   'पोखरा महानगरपालिका',  'metropolitan', 33),
  ('D005','Biratnagar Metropolitan City','बिराटनगर महानगरपालिका','metropolitan',19),
  ('D022','Birgunj Metropolitan City',   'वीरगञ्ज महानगरपालिका','metropolitan', 32),
  ('D035','Bharatpur Metropolitan City', 'भरतपुर महानगरपालिका', 'metropolitan', 29),
  ('D048','Butwal Sub-Metropolitan City','बुटवल उपमहानगरपालिका','sub_metropolitan',19),
  ('D057','Nepalgunj Sub-Metropolitan City','नेपालगञ्ज उपमहानगरपालिका','sub_metropolitan',22),
  ('D073','Dhangadhi Sub-Metropolitan City','धनगढी उपमहानगरपालिका','sub_metropolitan',18)
) AS m(dcode, name_en, name_np, type, wards) ON d.code = m.dcode
ON CONFLICT DO NOTHING;
