import type { Localized } from "@/labs/i18n";
import { modPow, desBlock, hex, rc4, textToBytes, xorBytes, aesSbox, rsaKeys, rsaEncrypt, diffieHellman } from "@/labs/sim/modern";
import type { Cipher } from "./ciphers";

// The machine and computer era of the cryptography lab: from Vernam’s
// one-time pad to AES and SHA-256. Answers are computed, never typed.

const L = (uz: string, kaa: string, ru: string, en: string): Localized => ({ uz, kaa, ru, en });
const yes = L("Ha", "Awa", "Да", "Yes");
const no = L("Yo‘q", "Yaq", "Нет", "No");

const rsa = rsaKeys(5, 11)!;
const dhTask = diffieHellman(23, 5, 4, 3);

export const modernCiphers: Omit<Cipher, "steps" | "weakness">[] = [
  {
    id: "otp",
    era: "machine",
    title: L("One-time pad va XOR", "One-time pad hám XOR", "Одноразовый блокнот и XOR", "The one-time pad and XOR"),
    when: L("1917-yil", "1917-jıl", "1917 г.", "1917"),
    level: 2,
    tagline: L(
      "Yagona matematik jihatdan buzib bo‘lmaydigan shifr.",
      "Jalǵız matematikalıq tárepten buzıp bolmaytuǵın shifr.",
      "Единственный шифр, который невозможно взломать математически.",
      "The only cipher that is mathematically unbreakable.",
    ),
    story: L(
      "AT&T muhandisi Gilbert Vernam 1917-yilda teletayp signallarini tasodifiy lenta bilan XOR qilib shifrlashni ixtiro qildi. 1949-yilda Klod Shennon isbotladi: kalit tasodifiy, matn uzunligida va bir martalik bo‘lsa, shifrni hech qanday kuch bilan ochib bo‘lmaydi. Moskva–Vashington «qizil telefoni» aynan shunday ishlagan.",
      "AT&T injeneri Gilbert Vernam 1917-jılı teletayp signalların tosınnan lenta menen XOR qılıp shifrlawdı oylap taptı. 1949-jılı Klod Shennon dálilledi: gilt tosınnan, tekst uzınlıǵında hám bir mártelik bolsa, shifrdi hesh qanday kúsh penen ashıp bolmaydı. Moskva–Vashington «qızıl telefonı» dál usılay islegen.",
      "Инженер AT&T Гилберт Вернам в 1917 году придумал шифровать телетайпные сигналы, XOR-я их со случайной лентой. В 1949 году Клод Шеннон доказал: если ключ случаен, длиной с текст и одноразов, шифр не вскрыть никакой силой. Так работала «красная линия» Москва–Вашингтон.",
      "In 1917 AT&T engineer Gilbert Vernam encrypted teletype signals by XORing them with a random tape. In 1949 Claude Shannon proved that with a random, full-length, single-use key the cipher cannot be broken by any amount of computing. The Moscow–Washington hotline worked this way.",
    ),
    how: L(
      "Kompyuterda har bir harf — 8 bit. **XOR** (⊕) qoidasi oddiy: bir xil bitlar → 0, har xil → 1. Matn bitlarini kalit bitlari bilan XOR qilsangiz, shifr chiqadi; shifrni yana o‘sha kalit bilan XOR qilsangiz — matn qaytadi. XOR — deyarli barcha zamonaviy shifrlarning «g‘ishti».",
      "Kompyuterde hár bir hárip — 8 bit. **XOR** (⊕) qaǵıydası ápiwayı: birdey bitler → 0, hár qıylı → 1. Tekst bitlerin gilt bitleri menen XOR qılsańız, shifr shıǵadı; shifrdi jáne sol gilt penen XOR qılsańız — tekst qaytadı. XOR — derlik barlıq zamanagóy shifrlerdiń «kirpishi».",
      "В компьютере каждая буква — 8 бит. Правило **XOR** (⊕) простое: одинаковые биты → 0, разные → 1. XOR битов текста с битами ключа даёт шифр; XOR шифра с тем же ключом возвращает текст. XOR — «кирпичик» почти всех современных шифров.",
      "In a computer every letter is 8 bits. The **XOR** (⊕) rule is simple: equal bits → 0, different → 1. XOR the text with the key to get ciphertext; XOR again with the same key to get the text back. XOR is the building block of nearly every modern cipher.",
    ),
    fact: L(
      "Sovet razvedkasi bir martalik daftarlarni qayta ishlatgani uchun AQSh «Venona» loyihasida minglab xabarlarni ochgan.",
      "Sovet razvedkası bir mártelik dápterlerdi qayta qollanǵanı ushın AQSh «Venona» joybarında mıńlaǵan xabarlardı ashqan.",
      "Из-за того что советская разведка повторно использовала одноразовые блокноты, США в проекте «Венона» прочли тысячи сообщений.",
      "Because Soviet intelligence reused one-time pads, the US “Venona” project decrypted thousands of messages.",
    ),
    exercises: [
      {
        task: L("Bitlarni XOR qiling: 1011 ⊕ 0110 = ?", "Bitlerdi XOR qılıń: 1011 ⊕ 0110 = ?", "Выполните XOR: 1011 ⊕ 0110 = ?", "XOR the bits: 1011 ⊕ 0110 = ?"),
        answer: (0b1011 ^ 0b0110).toString(2).padStart(4, "0"),
        format: "code",
      },
      {
        task: L("«A» harfi hex’da 41. 41 ⊕ 20 = ? (hex)", "«A» háribi hex’te 41. 41 ⊕ 20 = ? (hex)", "Буква «A» в hex — 41. 41 ⊕ 20 = ? (hex)", "“A” is 41 in hex. 41 ⊕ 20 = ? (hex)"),
        answer: (0x41 ^ 0x20).toString(16),
        format: "code",
        hint: L("Javob — kichik «a» harfining kodi. Asbobda tekshiring.", "Juwap — kishi «a» háribiniń kodı. Quralda tekseriń.", "Ответ — код строчной «a». Проверьте в инструменте.", "The answer is the code for lowercase “a”. Check it in the tool."),
      },
      {
        task: L("Kalit: KEY. Hex shifrni oching", "Gilt: KEY. Hex shifrdi ashıń", "Ключ: KEY. Расшифруйте hex", "Key: KEY. Decrypt the hex"),
        given: hex(xorBytes(textToBytes("SIR"), textToBytes("KEY"))),
        key: "KEY",
        answer: "SIR",
        format: "letters",
      },
      {
        task: L("Bir martalik kalitni ikki xabarda ishlatish xavfsizmi?", "Bir mártelik giltti eki xabarda qollanıw qáwipsiz be?", "Безопасно ли использовать одноразовый ключ для двух сообщений?", "Is it safe to use a one-time key for two messages?"),
        answer: "1",
        format: "choice",
        options: [yes, L("Yo‘q — ikki shifrni XOR qilsangiz kalit yo‘qoladi va matnlar ochila boshlaydi", "Yaq — eki shifrdi XOR qılsańız gilt joǵaladı hám tekstler ashıla baslaydı", "Нет — XOR двух шифров убирает ключ, и тексты начинают раскрываться", "No — XOR the two ciphertexts and the key cancels out, exposing the texts")],
      },
    ],
  },
  {
    id: "dh",
    era: "machine",
    title: L("Diffie–Hellman kalit almashinuvi", "Diffie–Hellman gilt almasıwı", "Обмен ключами Диффи — Хеллмана", "Diffie–Hellman key exchange"),
    when: L("1976-yil", "1976-jıl", "1976 г.", "1976"),
    level: 2,
    tagline: L(
      "Hech qachon uchrashmagan ikki odam ochiq kanal orqali umumiy sirga ega bo‘ladi.",
      "Hesh qashan ushraspaǵan eki adam ashıq kanal arqalı ulıwma sırǵa iye boladı.",
      "Двое, никогда не встречавшихся, получают общий секрет по открытому каналу.",
      "Two people who never met agree on a shared secret over an open channel.",
    ),
    story: L(
      "Avvalgi barcha shifrlarda bitta muammo bor edi: kalitni oldindan maxfiy yetkazish kerak. 1976-yilda Uitfild Diffi va Martin Xellman (Ralf Merkl g‘oyasi asosida) buni hal qildi. Bu — ochiq kalit kriptografiyasining tug‘ilishi; bugun har bir HTTPS ulanish shu bilan boshlanadi. 2015-yilda mualliflar Tyuring mukofotini olgan.",
      "Aldıńǵı barlıq shifrlerde bir mashqala bar edi: giltti aldınnan jasırın jetkeriw kerek. 1976-jılı Uitfild Diffi hám Martin Xellman (Ralf Merkl pikiri tiykarında) bunı sheshti. Bul — ashıq gilt kriptografiyasınıń tuwılıwı; búgin hár bir HTTPS baylanısı usınnan baslanadı. 2015-jılı avtorlar Tyuring sıylıǵın alǵan.",
      "У всех прежних шифров была одна беда: ключ нужно заранее тайно передать. В 1976 году Уитфилд Диффи и Мартин Хеллман (по идее Ральфа Меркла) решили её. Так родилась криптография с открытым ключом — с неё сегодня начинается каждое HTTPS-соединение. В 2015 году авторы получили премию Тьюринга.",
      "Every earlier cipher had one problem: the key had to be delivered secretly in advance. In 1976 Whitfield Diffie and Martin Hellman (building on Ralph Merkle’s idea) solved it. Public-key cryptography was born — every HTTPS connection starts with it today. The authors won the Turing Award in 2015.",
    ),
    how: L(
      "Bo‘yoq misoli: umumiy rangga har kim o‘z maxfiy rangini qo‘shib, aralashmani ochiq almashadi, keyin olganiga yana o‘z sirini qo‘shadi — ikkalasida bir xil rang. Matematikada «aralashtirish» — **modulli daraja**: gᵃ mod p ni hisoblash oson, lekin natijadan a ni topish (diskret logarifm) juda qiyin.",
      "Boyaw mısalı: ulıwma reńge hár kim óz jasırın reńin qosıp, aralaspanı ashıq almasadı, keyin alǵanına jáne óz sırın qosadı — ekewinde de birdey reń. Matematikada «aralastırıw» — **modullı dáreje**: gᵃ mod p dı esaplaw ańsat, biraq nátiyjeden a nı tabıw (diskret logarifm) júdá qıyın.",
      "Пример с красками: каждый добавляет к общему цвету свой тайный, открыто обменивается смесью и подмешивает к полученной свой секрет — у обоих выходит одинаковый цвет. В математике «смешивание» — это **возведение в степень по модулю**: вычислить gᵃ mod p легко, а найти a по результату (дискретный логарифм) очень трудно.",
      "Paint version: each adds a secret colour to a common one, swaps the mix openly, then adds their secret to what they received — both get the same colour. In maths, “mixing” is **modular exponentiation**: computing gᵃ mod p is easy, but recovering a from the result (the discrete logarithm) is very hard.",
    ),
    fact: L(
      "Britaniya razvedkasi (GCHQ) xodimlari bu g‘oyani bir necha yil oldin topgan, lekin bu 1997-yilgacha sir saqlangan.",
      "Britaniya razvedkası (GCHQ) xızmetkerleri bul pikirdi bir neshe jıl aldın tapqan, biraq bul 1997-jılǵa shekem sır saqlanǵan.",
      "Сотрудники британской разведки (GCHQ) придумали эту идею на несколько лет раньше, но это держали в секрете до 1997 года.",
      "Staff at Britain’s GCHQ found the idea a few years earlier, but it stayed secret until 1997.",
    ),
    exercises: [
      {
        task: L("p = 23, g = 5, a = 4. A = gᵃ mod p = ?", "p = 23, g = 5, a = 4. A = gᵃ mod p = ?", "p = 23, g = 5, a = 4. A = gᵃ mod p = ?", "p = 23, g = 5, a = 4. A = gᵃ mod p = ?"),
        answer: String(dhTask.A),
        format: "digits",
        hint: L("5⁴ = 625. 625 ni 23 ga bo‘lgandagi qoldiqni toping.", "5⁴ = 625. 625 ti 23 ke bólgendegi qaldıqtı tabıń.", "5⁴ = 625. Найдите остаток от деления 625 на 23.", "5⁴ = 625. Find the remainder of 625 divided by 23."),
      },
      {
        task: L(`Bobur B = ${dhTask.B} yubordi. Aziza (a = 4) umumiy sirni hisoblaydi: s = Bᵃ mod 23 = ?`, `Bobur B = ${dhTask.B} jiberdi. Aziza (a = 4) ulıwma sırdı esaplaydı: s = Bᵃ mod 23 = ?`, `Бобур прислал B = ${dhTask.B}. Азиза (a = 4) считает общий секрет: s = Bᵃ mod 23 = ?`, `Bobur sent B = ${dhTask.B}. Aziza (a = 4) computes the shared secret: s = Bᵃ mod 23 = ?`),
        answer: String(modPow(dhTask.B, 4n, 23n)),
        format: "digits",
      },
      {
        task: L("Eva nimani ko‘ra oladi?", "Eva neni kóre aladı?", "Что может увидеть Ева?", "What can Eve see?"),
        answer: "1",
        format: "choice",
        options: [
          L("Maxfiy a va b sonlarini", "Jasırın a hám b sanların", "Тайные числа a и b", "The secret numbers a and b"),
          L("p, g, A va B ni", "p, g, A hám B nı", "p, g, A и B", "p, g, A and B"),
          L("Umumiy sir s ni", "Ulıwma sır s tı", "Общий секрет s", "The shared secret s"),
        ],
      },
      {
        task: L("Diffie–Hellman o‘zi nimaga qarshi himoyalanmagan?", "Diffie–Hellman ózi nege qarsı qorǵalmaǵan?", "От чего Диффи — Хеллман сам по себе не защищает?", "What does Diffie–Hellman alone not protect against?"),
        answer: "0",
        format: "choice",
        options: [
          L("O‘rtadagi odam (MITM) hujumi — shuning uchun sertifikat kerak", "Ortadaǵı adam (MITM) hújimi — sonlıqtan sertifikat kerek", "Атака «человек посередине» (MITM) — поэтому нужен сертификат", "A man-in-the-middle attack — that is why certificates are needed"),
          L("Eshitib turishga", "Tıńlap turıwǵa", "Подслушиванию", "Eavesdropping"),
        ],
      },
    ],
  },
  {
    id: "des",
    era: "machine",
    title: L("DES — ma’lumotlarni shifrlash standarti", "DES — maǵlıwmatlardı shifrlaw standartı", "DES — стандарт шифрования данных", "DES — the Data Encryption Standard"),
    when: L("1977-yil", "1977-jıl", "1977 г.", "1977"),
    level: 3,
    tagline: L("Kompyuter davrining birinchi ommaviy blokli shifri.", "Kompyuter dáwiriniń birinshi ommalıq bloklı shifri.", "Первый массовый блочный шифр компьютерной эпохи.", "The first public block cipher of the computer age."),
    story: L(
      "IBM’ning «Lucifer» shifri asosida AQSh standartlar byurosi 1977-yilda DES’ni banklar va hukumat uchun standart qildi. Kalit 56 bitgacha qisqartirilgani ko‘p bahs-munozaraga sabab bo‘lgan. 1998-yilda EFF’ning «Deep Crack» mashinasi DES kalitini 56 soatda topib, uning davri tugaganini ko‘rsatdi.",
      "IBM’niń «Lucifer» shifri tiykarında AQSh standartlar byurosı 1977-jılı DES’ti banklar hám húkimet ushın standart etti. Gilt 56 bitke shekem qısqartılǵanı kóp dawlarǵa sebep bolǵan. 1998-jılı EFF’tiń «Deep Crack» mashinası DES giltin 56 saatta tawıp, onıń dáwiri tamamlanǵanın kórsetti.",
      "На основе шифра IBM «Lucifer» Бюро стандартов США в 1977 году сделало DES стандартом для банков и правительства. Сокращение ключа до 56 бит вызвало много споров. В 1998 году машина EFF «Deep Crack» нашла ключ DES за 56 часов — эпоха DES закончилась.",
      "Based on IBM’s “Lucifer”, the US standards bureau made DES the standard for banks and government in 1977. Cutting the key to 56 bits caused lots of debate. In 1998 the EFF’s “Deep Crack” machine found a DES key in 56 hours, ending its era.",
    ),
    how: L(
      "DES matnni 64 bitli **bloklarga** bo‘ladi. Har blok ikki yarmga (L va R) bo‘linib, 16 marta **Feystel raundidan** o‘tadi: R kalit bilan aralashtirilib (F funksiyasi: kengaytirish, XOR, S-box’lar, almashtirish) L ga XOR qilinadi, keyin yarmlar joy almashadi. Ajoyib xususiyati: ochish aynan shu jarayon, faqat raund kalitlari teskari tartibda.",
      "DES tekstti 64 bitli **bloklarǵa** bóledi. Hár blok eki yarımǵa (L hám R) bólinip, 16 ret **Feystel raundınan** ótedi: R gilt penen aralastırılıp (F funkciyası: keńeytiw, XOR, S-box’lar, almastırıw) L ge XOR qılınadı, keyin yarımlar orın almasadı. Ájayıp ózgesheligi: ashıw dál usı process, tek raund giltleri keri tártipte.",
      "DES режет текст на **блоки** по 64 бита. Каждый блок делится на половины L и R и проходит 16 **раундов Фейстеля**: R смешивается с ключом (функция F: расширение, XOR, S-блоки, перестановка), результат XOR-ится с L, затем половины меняются местами. Красота в том, что расшифровка — тот же процесс, только ключи раундов в обратном порядке.",
      "DES cuts text into 64-bit **blocks**. Each block splits into halves L and R and goes through 16 **Feistel rounds**: R is mixed with the key (function F: expand, XOR, S-boxes, permute), XORed into L, and the halves swap. The neat part: decryption is the same process with the round keys reversed.",
    ),
    fact: L(
      "DES’ning S-box jadvallari NSA tomonidan o‘zgartirilgan va bu shubha uyg‘otgan. 1990-yillarda ma’lum bo‘ldi: o‘zgarishlar aslida uni hali ochiq e’lon qilinmagan «differensial kriptoanaliz» hujumidan himoya qilgan.",
      "DES’tiń S-box kesteleri NSA tárepinen ózgertilgen hám bul gúman oyatqan. 1990-jıllarda málim boldı: ózgerisler haqıyqatında onı ele járiyalanbaǵan «differencial kriptoanaliz» hújiminen qorǵaǵan.",
      "S-блоки DES изменило АНБ, и это вызвало подозрения. В 1990-х выяснилось: изменения на самом деле защищали от ещё не опубликованного «дифференциального криптоанализа».",
      "The NSA altered DES’s S-boxes, which raised suspicion. In the 1990s it emerged the changes actually protected against “differential cryptanalysis”, an attack not yet public.",
    ),
    exercises: [
      { task: L("DES nechta raunddan iborat?", "DES neshe raundtan ibarat?", "Сколько раундов в DES?", "How many rounds does DES have?"), answer: "16", format: "digits" },
      { task: L("DES kalitining samarali uzunligi necha bit?", "DES giltiniń nátiyjeli uzınlıǵı neshe bit?", "Сколько бит в эффективной длине ключа DES?", "How many bits long is a DES key, effectively?"), answer: "56", format: "digits" },
      {
        task: L("Matn: ROOTY!!!, kalit: SIRKALIT. Shifrni hex ko‘rinishida yozing", "Tekst: ROOTY!!!, gilt: SIRKALIT. Shifrdi hex kórinisinde jazıń", "Текст: ROOTY!!!, ключ: SIRKALIT. Запишите шифр в hex", "Text: ROOTY!!!, key: SIRKALIT. Write the ciphertext in hex"),
        given: "ROOTY!!!",
        key: "SIRKALIT",
        answer: hex(desBlock(textToBytes("ROOTY!!!"), textToBytes("SIRKALIT")).output, ""),
        format: "code",
        hint: L("Yuqoridagi asbobga matn va kalitni kiriting.", "Joqarıdaǵı quralǵa tekst hám giltti kirgiziń.", "Введите текст и ключ в инструмент выше.", "Enter the text and key in the tool above."),
      },
      {
        task: L("DES’da ochish uchun nima o‘zgaradi?", "DES’te ashıw ushın ne ózgeredi?", "Что меняется в DES при расшифровке?", "What changes in DES for decryption?"),
        answer: "1",
        format: "choice",
        options: [
          L("Butunlay boshqa algoritm ishlatiladi", "Pútkilley basqa algoritm qollanıladı", "Используется совсем другой алгоритм", "A completely different algorithm is used"),
          L("Faqat raund kalitlari teskari tartibda beriladi", "Tek raund giltleri keri tártipte beriledi", "Только ключи раундов идут в обратном порядке", "Only the round keys go in reverse order"),
        ],
      },
    ],
  },
  {
    id: "rsa",
    era: "machine",
    title: L("RSA — ochiq kalitli shifrlash", "RSA — ashıq giltli shifrlaw", "RSA — шифрование с открытым ключом", "RSA — public-key encryption"),
    when: L("1977-yil", "1977-jıl", "1977 г.", "1977"),
    level: 3,
    tagline: L("Qulfni hammaga bering, kalitini o‘zingizda saqlang.", "Qulıptı hámmege beriń, giltin ózińizde saqlań.", "Раздайте замки всем, а ключ оставьте себе.", "Hand out padlocks to everyone, keep the only key."),
    story: L(
      "MIT olimlari Ron Rivest, Adi Shamir va Leonard Adleman 1977-yilda ochiq kalit bilan shifrlash va **raqamli imzo** qo‘yishga imkon beruvchi algoritmni yaratdi. Rivest g‘oyani Pasxa kechasi, bir oz sharob ichgandan keyin uxlay olmay yozib qo‘ygan, deyishadi. RSA bugun ham sertifikatlar va imzolarda keng ishlatiladi.",
      "MIT alımları Ron Rivest, Adi Shamir hám Leonard Adleman 1977-jılı ashıq gilt penen shifrlaw hám **sanlı qol** qoyıwǵa múmkinshilik beretuǵın algoritmdi jarattı. Rivest pikirdi Pasxa keshesi uyıqlay almay jazıp qoyǵan dep aytıladı. RSA búgin de sertifikatlar hám qollarda keń qollanıladı.",
      "Учёные MIT Рон Ривест, Ади Шамир и Леонард Адлеман в 1977 году создали алгоритм для шифрования открытым ключом и **цифровой подписи**. Говорят, Ривест записал идею бессонной пасхальной ночью. RSA до сих пор широко используется в сертификатах и подписях.",
      "MIT’s Ron Rivest, Adi Shamir and Leonard Adleman created an algorithm for public-key encryption and **digital signatures** in 1977. Rivest reportedly wrote the idea down on a sleepless Passover night. RSA is still widely used in certificates and signatures.",
    ),
    how: L(
      "Ikki katta tub sonni ko‘paytirish oson, lekin ko‘paytmani qayta tub sonlarga ajratish juda qiyin. RSA shu farqqa tayanadi: **ochiq kalit** (n, e) bilan har kim qulflaydi: c = mᵉ mod n. Faqat p va q ni biladigan egasi **yopiq kalit** d ni hisoblay oladi va ochadi: m = cᵈ mod n.",
      "Eki úlken jay sandı kóbeytiw ańsat, biraq kóbeymeni qayta jay sanlarǵa ajıratıw júdá qıyın. RSA usı ayırmaǵa súyenedi: **ashıq gilt** (n, e) penen hár kim qulıplaydı: c = mᵉ mod n. Tek p hám q dı biletuǵın iyesi **jabıq gilt** d nı esaplay aladı hám ashadı: m = cᵈ mod n.",
      "Перемножить два больших простых числа легко, а разложить произведение обратно — очень трудно. RSA опирается на эту разницу: **открытым ключом** (n, e) запирает любой: c = mᵉ mod n. Только владелец, знающий p и q, может вычислить **закрытый ключ** d и открыть: m = cᵈ mod n.",
      "Multiplying two big primes is easy; splitting the product back into them is very hard. RSA rests on that gap: anyone locks with the **public key** (n, e): c = mᵉ mod n. Only the owner, who knows p and q, can compute the **private key** d and unlock: m = cᵈ mod n.",
    ),
    fact: L(
      "1991-yilda e’lon qilingan RSA-2048 sonini (617 xonali) hali hech kim tub ko‘paytuvchilarga ajrata olmagan.",
      "1991-jılı járiyalanǵan RSA-2048 sanın (617 xanalı) ele hesh kim jay kóbeytiwshilerge ajırata almaǵan.",
      "Опубликованное в 1991 году число RSA-2048 (617 цифр) до сих пор никто не разложил на множители.",
      "The RSA-2048 challenge number (617 digits), published in 1991, has never been factored.",
    ),
    exercises: [
      { task: L("p = 5, q = 11. n = p·q = ?", "p = 5, q = 11. n = p·q = ?", "p = 5, q = 11. n = p·q = ?", "p = 5, q = 11. n = p·q = ?"), answer: String(rsa.n), format: "digits" },
      { task: L("φ = (p−1)(q−1) = ?", "φ = (p−1)(q−1) = ?", "φ = (p−1)(q−1) = ?", "φ = (p−1)(q−1) = ?"), answer: String(rsa.phi), format: "digits" },
      {
        task: L(`e = ${rsa.e}. Shunday d topingki, e·d mod φ = 1`, `e = ${rsa.e}. Sonday d tabıń, e·d mod φ = 1`, `e = ${rsa.e}. Найдите d, чтобы e·d mod φ = 1`, `e = ${rsa.e}. Find d so that e·d mod φ = 1`),
        answer: String(rsa.d),
        format: "digits",
        hint: L("3·d ni 40 ga bo‘lganda qoldiq 1 bo‘lishi kerak: 81, 121 … ni sinang.", "3·d nı 40 qa bólgende qaldıq 1 bolıwı kerek: 81, 121 … di sınań.", "Остаток от деления 3·d на 40 должен быть 1: проверьте 81, 121 …", "3·d divided by 40 must leave 1: try 81, 121 …"),
      },
      {
        task: L(`m = 2 ni ochiq kalit (n = ${rsa.n}, e = ${rsa.e}) bilan shifrlang: c = ?`, `m = 2 ni ashıq gilt (n = ${rsa.n}, e = ${rsa.e}) penen shifrlań: c = ?`, `Зашифруйте m = 2 открытым ключом (n = ${rsa.n}, e = ${rsa.e}): c = ?`, `Encrypt m = 2 with the public key (n = ${rsa.n}, e = ${rsa.e}): c = ?`),
        answer: String(rsaEncrypt(2n, rsa)),
        format: "digits",
      },
    ],
  },
  {
    id: "rc4",
    era: "machine",
    title: L("RC4 — oqimli shifr", "RC4 — aǵımlı shifr", "RC4 — потоковый шифр", "RC4 — a stream cipher"),
    when: L("1987-yil", "1987-jıl", "1987 г.", "1987"),
    level: 2,
    tagline: L("Kalitdan cheksiz tasodifiy ko‘rinadigan baytlar oqimi.", "Giltten sheksiz tosınnan kórinetuǵın baytlar aǵımı.", "Из ключа — бесконечный поток случайных на вид байтов.", "From a key, an endless stream of random-looking bytes."),
    story: L(
      "Ron Rivest RC4’ni 1987-yilda RSA Security kompaniyasi uchun yaratgan va uni sir tutgan. 1994-yilda kod anonim tarzda internetga chiqib ketdi. Soddaligi va tezligi tufayli u Wi-Fi (WEP, WPA), SSL/TLS va boshqa ko‘p joyda ishlatildi — keyin zaifliklari birin-ketin topildi.",
      "Ron Rivest RC4’ti 1987-jılı RSA Security kompaniyası ushın jaratqan hám onı sır tutqan. 1994-jılı kod anonim túrde internetke shıǵıp ketti. Ápiwayılıǵı hám tezligi sebepli ol Wi-Fi (WEP, WPA), SSL/TLS hám basqa kóp jerde qollanıldı — keyin álsizlikleri birinen soń biri tabıldı.",
      "Рон Ривест создал RC4 в 1987 году для RSA Security и держал его в секрете. В 1994 году код анонимно утёк в интернет. Благодаря простоте и скорости он попал в Wi-Fi (WEP, WPA), SSL/TLS и многое другое — а потом одна за другой нашлись уязвимости.",
      "Ron Rivest created RC4 in 1987 for RSA Security and kept it secret. In 1994 the code leaked anonymously online. Simple and fast, it ended up in Wi-Fi (WEP, WPA), SSL/TLS and more — and then its weaknesses were found one after another.",
    ),
    how: L(
      "RC4 256 baytli holat jadvalini kalit bilan aralashtiradi (KSA). So‘ng har qadamda ikki elementni almashtirib, bitta **kalit oqimi** baytini chiqaradi (PRGA). Matn shu oqim bilan XOR qilinadi — xuddi One-time pad kabi, faqat kalit oqimi haqiqiy tasodifiy emas, qisqa kalitdan yasalgan.",
      "RC4 256 baytlıq jaǵday kestesin gilt penen aralastıradı (KSA). Sońınan hár qádemde eki elementti almastırıp, bir **gilt aǵımı** baytın shıǵaradı (PRGA). Tekst usı aǵım menen XOR qılınadı — One-time pad sıyaqlı, tek gilt aǵımı haqıyqıy tosınnan emes, qısqa giltten jasalǵan.",
      "RC4 перемешивает ключом таблицу состояния из 256 байт (KSA). Затем на каждом шаге меняет местами два элемента и выдаёт один байт **ключевого потока** (PRGA). Текст XOR-ится с этим потоком — как в одноразовом блокноте, только поток не по-настоящему случаен, а выращен из короткого ключа.",
      "RC4 shuffles a 256-byte state table with the key (KSA). Then each step swaps two entries and outputs one **keystream** byte (PRGA). The text is XORed with that stream — like a one-time pad, except the stream is grown from a short key rather than truly random.",
    ),
    fact: L(
      "2001-yilda WEP’dagi RC4 zaifligi tufayli Wi-Fi parolini bir necha daqiqada topish mumkin bo‘lib qoldi. 2015-yilda RFC 7465 RC4’ni TLS’da butunlay taqiqladi.",
      "2001-jılı WEP’tegi RC4 álsizligi sebepli Wi-Fi parolın bir neshe minutta tabıw múmkin bolıp qaldı. 2015-jılı RFC 7465 RC4’ti TLS’te pútkilley qadaǵan etti.",
      "В 2001 году из-за слабости RC4 в WEP пароль Wi-Fi стало можно найти за минуты. В 2015 году RFC 7465 полностью запретил RC4 в TLS.",
      "In 2001 an RC4 weakness in WEP let anyone recover a Wi-Fi key in minutes. In 2015 RFC 7465 banned RC4 from TLS entirely.",
    ),
    exercises: [
      {
        task: L("Kalit «Key», matn «Plaintext». RC4 shifrini hex’da yozing", "Gilt «Key», tekst «Plaintext». RC4 shifrin hex’te jazıń", "Ключ «Key», текст «Plaintext». Запишите шифр RC4 в hex", "Key “Key”, text “Plaintext”. Write the RC4 ciphertext in hex"),
        given: "Plaintext",
        key: "Key",
        answer: hex(rc4(textToBytes("Plaintext"), textToBytes("Key")), ""),
        format: "code",
        hint: L("Asbobga kiriting — bu RC4’ning mashhur test misoli.", "Quralǵa kirgiziń — bul RC4’tiń belgili test mısalı.", "Введите в инструмент — это известный тестовый пример RC4.", "Use the tool — this is RC4’s well-known test vector."),
      },
      {
        task: L("RC4 qanday turdagi shifr?", "RC4 qanday túrdegi shifr?", "К какому типу относится RC4?", "What kind of cipher is RC4?"),
        answer: "0",
        format: "choice",
        options: [
          L("Oqimli: har bir bayt kalit oqimi bilan XOR qilinadi", "Aǵımlı: hár bir bayt gilt aǵımı menen XOR qılınadı", "Потоковый: каждый байт XOR-ится с ключевым потоком", "Stream: each byte is XORed with a keystream"),
          L("Blokli: 16 baytlik bloklar bilan ishlaydi", "Bloklı: 16 baytlıq bloklar menen isleydi", "Блочный: работает блоками по 16 байт", "Block: works on 16-byte blocks"),
        ],
      },
      {
        task: L("Nega RC4 bugun taqiqlangan?", "Nege RC4 búgin qadaǵan etilgen?", "Почему RC4 сегодня запрещён?", "Why is RC4 banned today?"),
        answer: "1",
        format: "choice",
        options: [
          L("U juda sekin", "Ol júdá áste", "Он слишком медленный", "It is too slow"),
          L("Kalit oqimida qonuniyatlar bor — matn qismlari sizib chiqadi", "Gilt aǵımında nızamlılıqlar bar — tekst bólimleri sızıp shıǵadı", "В ключевом потоке есть закономерности — части текста утекают", "Its keystream has biases — parts of the text leak"),
        ],
      },
    ],
  },
  {
    id: "aes",
    era: "machine",
    title: L("AES — zamonaviy standart", "AES — zamanagóy standart", "AES — современный стандарт", "AES — the modern standard"),
    when: L("2001-yil", "2001-jıl", "2001 г.", "2001"),
    level: 3,
    tagline: L("Telefoningiz, Wi-Fi va HTTPS har soniyada ishlatadigan shifr.", "Telefonıńız, Wi-Fi hám HTTPS hár sekundta qollanatuǵın shifr.", "Шифр, которым каждую секунду пользуются ваш телефон, Wi-Fi и HTTPS.", "The cipher your phone, Wi-Fi and HTTPS use every second."),
    story: L(
      "DES eskirgach, AQSh NIST 1997-yilda ochiq tanlov e’lon qildi. Butun dunyodan 15 ta algoritm qatnashdi; 2000-yilda belgiyalik Joan Demen va Vinsent Raymenning «Rijndael» algoritmi g‘olib bo‘ldi va 2001-yilda AES nomi bilan standartga aylandi. Bugun AES maxfiy davlat ma’lumotlarini ham himoya qiladi.",
      "DES eskirgennen keyin, AQSh NIST 1997-jılı ashıq tańlaw járiyaladı. Pútkil dúnyadan 15 algoritm qatnastı; 2000-jılı belgiyalı Joan Demen hám Vinsent Raymenniń «Rijndael» algoritmi jeńimpaz boldı hám 2001-jılı AES atı menen standartqa aylandı. Búgin AES jasırın mámleketlik maǵlıwmatlardı da qorǵaydı.",
      "Когда DES устарел, NIST США в 1997 году объявил открытый конкурс. Участвовали 15 алгоритмов со всего мира; в 2000 году победил «Rijndael» бельгийцев Йоана Дамена и Винсента Рэймена, ставший в 2001 году стандартом AES. Сегодня AES защищает даже секретные государственные данные.",
      "When DES aged, the US NIST launched an open contest in 1997. Fifteen algorithms from around the world entered; in 2000 “Rijndael” by Belgians Joan Daemen and Vincent Rijmen won, becoming the AES standard in 2001. Today AES protects even classified government data.",
    ),
    how: L(
      "AES 16 baytli blokni 4×4 jadval (**holat**) sifatida ko‘radi va uni bir necha raund aylantiradi. Har raundda to‘rt bosqich: **SubBytes** (har bayt S-box orqali almashadi), **ShiftRows** (qatorlar suriladi), **MixColumns** (ustunlar aralashtiriladi), **AddRoundKey** (raund kaliti XOR qilinadi). AES-128 da 10 raund; bir necha raunddan keyin har bir chiqish bayti har bir kirish bayti va kalitga bog‘liq bo‘lib qoladi.",
      "AES 16 baytlıq bloktı 4×4 keste (**jaǵday**) retinde kóredi hám onı bir neshe raund aylandıradı. Hár raundta tórt basqısh: **SubBytes** (hár bayt S-box arqalı almasadı), **ShiftRows** (qatarlar jılısadı), **MixColumns** (baǵanalar aralastırıladı), **AddRoundKey** (raund gilti XOR qılınadı). AES-128 de 10 raund; bir neshe raundtan keyin hár bir shıǵıw baytı hár bir kiriw baytı hám giltke baylanıslı bolıp qaladı.",
      "AES видит 16-байтовый блок как таблицу 4×4 (**состояние**) и прогоняет её через несколько раундов. В каждом раунде четыре шага: **SubBytes** (замена каждого байта по S-блоку), **ShiftRows** (сдвиг строк), **MixColumns** (перемешивание столбцов), **AddRoundKey** (XOR с ключом раунда). В AES-128 — 10 раундов; уже через несколько раундов каждый выходной байт зависит от каждого входного байта и ключа.",
      "AES treats a 16-byte block as a 4×4 table (the **state**) and runs it through several rounds. Each round has four steps: **SubBytes** (each byte swapped via the S-box), **ShiftRows** (rows shift), **MixColumns** (columns are mixed), **AddRoundKey** (XOR with the round key). AES-128 has 10 rounds; after a few, every output byte depends on every input byte and the key.",
    ),
    fact: L(
      "Zamonaviy protsessorlarda AES uchun maxsus buyruqlar (AES-NI) bor — ular soniyasiga gigabaytlab ma’lumotni shifrlaydi.",
      "Zamanagóy processorlarda AES ushın arnawlı buyrıqlar (AES-NI) bar — olar sekundına gigabaytlap maǵlıwmattı shifrlaydı.",
      "В современных процессорах есть специальные инструкции для AES (AES-NI) — они шифруют гигабайты данных в секунду.",
      "Modern processors have dedicated AES instructions (AES-NI) that encrypt gigabytes per second.",
    ),
    exercises: [
      { task: L("AES-128 da nechta raund bor?", "AES-128 de neshe raund bar?", "Сколько раундов в AES-128?", "How many rounds does AES-128 have?"), answer: "10", format: "digits" },
      {
        task: L("S-box: 53 (hex) qaysi baytga almashadi? (hex)", "S-box: 53 (hex) qaysı baytqa almasadı? (hex)", "S-блок: во что превращается байт 53 (hex)? (hex)", "S-box: what does byte 53 (hex) become? (hex)"),
        answer: aesSbox[0x53].toString(16),
        format: "code",
        hint: L("Bu FIPS-197 standartidagi mashhur misol. Asbobning S-box qidiruvidan foydalaning.", "Bul FIPS-197 standartındaǵı belgili mısal. Quraldıń S-box izlewinen paydalanıń.", "Это известный пример из стандарта FIPS-197. Воспользуйтесь поиском по S-блоку в инструменте.", "It’s the famous example from FIPS-197. Use the tool’s S-box lookup."),
      },
      {
        task: L("Qaysi bosqich ustunlarni aralashtiradi?", "Qaysı basqısh baǵanalardı aralastıradı?", "Какой шаг перемешивает столбцы?", "Which step mixes the columns?"),
        answer: "2",
        format: "choice",
        options: [L("SubBytes", "SubBytes", "SubBytes", "SubBytes"), L("ShiftRows", "ShiftRows", "ShiftRows", "ShiftRows"), L("MixColumns", "MixColumns", "MixColumns", "MixColumns")],
      },
      {
        task: L("AES algoritmining o‘zi bugungacha buzilganmi?", "AES algoritminiń ózi búginge shekem buzılǵan ba?", "Взломан ли сам алгоритм AES на сегодня?", "Has the AES algorithm itself been broken?"),
        answer: "1",
        format: "choice",
        options: [yes, L("Yo‘q — xavf faqat noto‘g‘ri ishlatishda", "Yaq — qáwip tek nadurıs qollanıwda", "Нет — опасность только в неправильном использовании", "No — the danger is only in misuse")],
      },
    ],
  },
  {
    id: "sha256",
    era: "machine",
    title: L("SHA-256 — kriptografik xesh", "SHA-256 — kriptografiyalıq xesh", "SHA-256 — криптографический хеш", "SHA-256 — a cryptographic hash"),
    when: L("2001-yil", "2001-jıl", "2001 г.", "2001"),
    level: 2,
    tagline: L("Har qanday ma’lumotning qaytarib bo‘lmaydigan «barmoq izi».", "Hár qanday maǵlıwmattıń qaytarıp bolmaytuǵın «barmaq izi».", "Необратимый «отпечаток пальца» любых данных.", "A one-way “fingerprint” of any data."),
    story: L(
      "SHA-2 oilasini AQSh NSA ishlab chiqdi va NIST 2001-yilda e’lon qildi. Bugun SHA-256 Bitcoin bloklarida, dasturlar imzosida, Git’da va parol tizimlarida ishlatiladi. U shifr emas: kalit yo‘q va natijadan matnni qaytarib bo‘lmaydi — faqat «bu ma’lumot o‘zgarmaganmi?» degan savolga javob beradi.",
      "SHA-2 shańaraǵın AQSh NSA islep shıqtı hám NIST 2001-jılı járiyaladı. Búgin SHA-256 Bitcoin bloklarında, baǵdarlamalar qolında, Git’te hám parol sistemalarında qollanıladı. Ol shifr emes: gilt joq hám nátiyjeden tekstti qaytarıp bolmaydı — tek «bul maǵlıwmat ózgermegen be?» degen sorawǵa juwap beredi.",
      "Семейство SHA-2 разработало АНБ, а NIST опубликовал его в 2001 году. Сегодня SHA-256 работает в блоках Bitcoin, подписях программ, Git и парольных системах. Это не шифр: ключа нет, и текст из результата не восстановить — он отвечает лишь на вопрос «не изменились ли данные?».",
      "The NSA designed the SHA-2 family and NIST published it in 2001. Today SHA-256 runs in Bitcoin blocks, software signatures, Git and password systems. It is not a cipher: there is no key and the text cannot be recovered — it only answers “has this data changed?”.",
    ),
    how: L(
      "Matn 512 bitli bo‘laklarga bo‘linadi; har bo‘lak 64 raundli **siqish funksiyasidan** o‘tadi (aylantirish, XOR, qo‘shish). Natija har doim 256 bit (64 hex belgi) — bir harf yoki butun kitob bo‘lsa ham. Bir xil kirish doim bir xil xesh beradi, lekin bitta bitni o‘zgartirsangiz, xeshning yarmi o‘zgaradi (**ko‘chki effekti**).",
      "Tekst 512 bitli bóleklerge bólinedi; hár bólek 64 raundlı **qısıw funkciyasınan** ótedi (aylandırıw, XOR, qosıw). Nátiyje hámme waqıt 256 bit (64 hex belgi) — bir hárip yamasa pútkil kitap bolsa da. Birdey kiriw hámme waqıt birdey xesh beredi, biraq bir bitti ózgertseńiz, xeshtiń yarımı ózgeredi (**kóshki effekti**).",
      "Текст делится на блоки по 512 бит; каждый проходит 64 раунда **функции сжатия** (сдвиги, XOR, сложение). Результат всегда 256 бит (64 hex-символа) — хоть одна буква, хоть целая книга. Одинаковый вход всегда даёт одинаковый хеш, но смена одного бита меняет половину хеша (**лавинный эффект**).",
      "Text is cut into 512-bit chunks; each goes through 64 rounds of a **compression function** (rotations, XOR, addition). The result is always 256 bits (64 hex characters) — whether one letter or a whole book. The same input always gives the same hash, but flipping one bit changes about half of it (the **avalanche effect**).",
    ),
    fact: L(
      "Bitcoin konchilari soniyasiga yuz kvintilliondan ortiq SHA-256 xesh hisoblaydi — 0 lar bilan boshlanadigan xeshni topish uchun.",
      "Bitcoin kánshileri sekundına júz kvintillionnan artıq SHA-256 xesh esaplaydı — 0 ler menen baslanatuǵın xeshti tabıw ushın.",
      "Майнеры Bitcoin вычисляют сотни квинтиллионов хешей SHA-256 в секунду — в поисках хеша, начинающегося с нулей.",
      "Bitcoin miners compute hundreds of quintillions of SHA-256 hashes per second, hunting for one that starts with zeros.",
    ),
    exercises: [
      { task: L("SHA-256 xeshi nechta hex belgidan iborat?", "SHA-256 xeshi neshe hex belgiden ibarat?", "Сколько hex-символов в хеше SHA-256?", "How many hex characters are in a SHA-256 hash?"), answer: "64", format: "digits" },
      {
        task: L("«abc» xeshining birinchi 8 belgisini yozing", "«abc» xeshiniń birinshi 8 belgisin jazıń", "Запишите первые 8 символов хеша «abc»", "Write the first 8 characters of the hash of “abc”"),
        given: "abc",
        answer: "ba7816bf",
        format: "code",
        hint: L("Asbobga «abc» deb yozing (kichik harflar bilan).", "Quralǵa «abc» dep jazıń (kishi háripler menen).", "Введите в инструмент «abc» (строчными).", "Type “abc” (lowercase) into the tool."),
      },
      {
        task: L("Xeshdan asl matnni qaytarib olish mumkinmi?", "Xeshten dáslepki tekstti qaytarıp alıw múmkin be?", "Можно ли получить исходный текст из хеша?", "Can you get the original text back from a hash?"),
        answer: "1",
        format: "choice",
        options: [yes, no],
      },
      {
        task: L("Parollarni qanday saqlash to‘g‘ri?", "Parollardı qalay saqlaw durıs?", "Как правильно хранить пароли?", "What is the right way to store passwords?"),
        answer: "2",
        format: "choice",
        options: [
          L("Ochiq matnda", "Ashıq tekstte", "Открытым текстом", "As plain text"),
          L("Oddiy SHA-256 bilan", "Ápiwayı SHA-256 penen", "Простым SHA-256", "With plain SHA-256"),
          L("Tuz qo‘shilgan sekin xesh bilan (bcrypt, Argon2)", "Duz qosılǵan áste xesh penen (bcrypt, Argon2)", "Медленным хешем с солью (bcrypt, Argon2)", "With a slow, salted hash (bcrypt, Argon2)"),
        ],
      },
    ],
  },
];
