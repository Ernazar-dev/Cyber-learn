import type { Localized } from "@/labs/i18n";
import type { CipherId } from "./ciphers";

// For every cipher: the algorithm as numbered steps and its weak spot.
// Kept apart from ciphers.ts so the stories stay readable.

const L = (uz: string, kaa: string, ru: string, en: string): Localized => ({ uz, kaa, ru, en });

export const cipherNotes: Record<CipherId, { steps: Localized[]; weakness: Localized }> = {
  atbash: {
    steps: [
      L("Alifboni yozing, ostiga uni teskari tartibda yozing (A–Z, Z–A).", "Álipbeni jazıń, astına onı keri tártipte jazıń (A–Z, Z–A).", "Запишите алфавит, а под ним — его же задом наперёд (A–Z, Z–A).", "Write the alphabet, then write it reversed underneath (A–Z, Z–A)."),
      L("Har bir harfni ostidagi jufti bilan almashtiring.", "Hár bir háripti astındaǵı jubı menen almastırıń.", "Замените каждую букву её парой снизу.", "Swap each letter for the partner beneath it."),
      L("Ochish uchun aynan shu amalni takrorlang.", "Ashıw ushın dál usı ámeldi qaytalań.", "Для расшифровки повторите то же самое.", "To decrypt, do exactly the same again."),
    ],
    weakness: L("Kalit yo‘q: qoidani bilgan har kim darhol o‘qiydi. Har harf doim bir xil harfga aylanadi — chastota tahlili ham ochadi.", "Gilt joq: qaǵıydanı bilgen hár kim dárhal oqıydı. Hár hárip hámme waqıt birdey háripke aylanadı — jiyilik analizi de ashadı.", "Ключа нет: знающий правило читает сразу. Каждая буква всегда заменяется одной и той же — вскрывает и частотный анализ.", "No key: anyone who knows the rule reads it at once. Each letter always maps to the same one — frequency analysis breaks it too."),
  },
  scytale: {
    steps: [
      L("Qatorlar sonini (tayoqcha qalinligini) tanlang — bu kalit.", "Qatarlar sanın (tayaqsha qalıńlıǵın) tańlań — bul gilt.", "Выберите число строк (толщину жезла) — это ключ.", "Pick the number of rows (the rod’s thickness) — that is the key."),
      L("Xabarni jadvalga qatorma-qator yozing; bo‘sh joylarni X bilan to‘ldiring.", "Xabardı kestege qatarma-qatar jazıń; bos orınlardı X penen toltırıń.", "Впишите сообщение в таблицу по строкам; пустые клетки заполните X.", "Write the message into the table row by row; fill gaps with X."),
      L("Jadvalni ustunma-ustun o‘qing — bu tasmadagi shifr.", "Kesteni baǵanama-baǵana oqıń — bul taspadaǵı shifr.", "Прочитайте таблицу по столбцам — это шифр на ленте.", "Read the table column by column — that is the strip’s ciphertext."),
      L("Qabul qiluvchi tasmani xuddi shunday tayoqchaga o‘rab o‘qiydi.", "Qabıllawshı taspanı dál sonday tayaqshaǵa orap oqıydı.", "Получатель наматывает ленту на такой же жезл и читает.", "The receiver winds the strip on an identical rod and reads."),
    ],
    weakness: L("Mumkin bo‘lgan qatorlar soni juda kam — hammasini sinash oson. Harflar o‘zgarmaydi, faqat joyi almashadi.", "Múmkin bolǵan qatarlar sanı júdá az — hámmesin sınaw ańsat. Háripler ózgermeydi, tek ornı almasadı.", "Вариантов числа строк очень мало — легко перебрать все. Буквы не меняются, только переставляются.", "There are very few possible row counts — trying them all is easy. The letters themselves never change."),
  },
  polybius: {
    steps: [
      L("5×5 jadval tuzing (I va J bitta katakda).", "5×5 keste dúziń (I hám J bir katakta).", "Составьте таблицу 5×5 (I и J в одной клетке).", "Draw a 5×5 grid (I and J share a cell)."),
      L("Harf joylashgan qator raqamini yozing.", "Hárip jaylasqan qatar sanın jazıń.", "Запишите номер строки буквы.", "Write the letter’s row number."),
      L("Keyin ustun raqamini yozing — har harf ikki raqam bo‘ladi.", "Keyin baǵana sanın jazıń — hár hárip eki san boladı.", "Затем номер столбца — каждая буква становится двумя цифрами.", "Then its column number — each letter becomes two digits."),
    ],
    weakness: L("Bu aslida kodlash: jadval odatiy tartibda bo‘lsa, sir yo‘q. Aralashtirilgan jadvalda ham chastota tahlili ochadi.", "Bul haqıyqatında kodlaw: keste ádettegi tártipte bolsa, sır joq. Aralastırılǵan kestede de jiyilik analizi ashadı.", "По сути это кодировка: при обычном порядке таблицы секрета нет. Даже перемешанную таблицу вскрывает частотный анализ.", "It is really an encoding: with the usual grid there is no secret. Even a shuffled grid falls to frequency analysis."),
  },
  caesar: {
    steps: [
      L("Kalitni tanlang — 1 dan 25 gacha son.", "Giltti tańlań — 1 den 25 ke shekem san.", "Выберите ключ — число от 1 до 25.", "Choose a key — a number from 1 to 25."),
      L("Har bir harfni alifboda shuncha qadam oldinga suring; Z dan keyin yana A keladi.", "Hár bir háripti álipbede sonsha qádem aldıǵa jılıstırıń; Z ten keyin jáne A keledi.", "Сдвиньте каждую букву на столько шагов вперёд; после Z снова идёт A.", "Move each letter that many steps forward; after Z comes A again."),
      L("Ochish uchun xuddi shuncha qadam orqaga suring.", "Ashıw ushın dál sonsha qádem artqa jılıstırıń.", "Для расшифровки сдвиньте на столько же назад.", "To decrypt, move the same number of steps back."),
    ],
    weakness: L("Atigi 25 ta kalit — kompyuter hammasini bir zumda sinaydi (brute-force). Chastota tahlili ham kalitni darhol topadi.", "Bar bolǵanı 25 gilt — kompyuter hámmesin bir zamatta sınaydı (brute-force). Jiyilik analizi de giltti dárhal tabadı.", "Всего 25 ключей — компьютер перебирает их мгновенно (brute-force). Частотный анализ тоже сразу находит ключ.", "Only 25 keys — a computer tries them all instantly (brute force). Frequency analysis finds the key right away too."),
  },
  frequency: {
    steps: [
      L("Shifrlangan matndagi har bir harfni sanang.", "Shifrlanǵan tekstegi hár bir háripti sanań.", "Подсчитайте каждую букву шифротекста.", "Count every letter in the ciphertext."),
      L("Eng ko‘p uchraganlarini tilning eng ko‘p harflari bilan solishtiring (o‘zbekcha A, I; inglizcha E, T).", "Eń kóp ushırasqanların tildiń eń kóp háripleri menen salıstırıń (ózbekshe A, I; inglisshe E, T).", "Сравните самые частые с самыми частыми буквами языка (узбекский A, I; английский E, T).", "Match the most frequent ones to the language’s most common letters (Uzbek A, I; English E, T)."),
      L("Taxminiy kalit bilan oching va ma’noli matn chiqqanini tekshiring.", "Shamalı gilt penen ashıń hám mánili tekst shıqqanın tekseriń.", "Расшифруйте предполагаемым ключом и проверьте, получился ли осмысленный текст.", "Decrypt with the guessed key and check whether sensible text appears."),
    ],
    weakness: L("Bu hujum usuli. Qisqa matnlarda statistika ishonchsiz, Vijener kabi ko‘p alifboli shifrlarga esa to‘g‘ridan-to‘g‘ri ishlamaydi.", "Bul hújim usılı. Qısqa tekstlerde statistika isenimsiz, Vijener sıyaqlı kóp álipbeli shifrlerge bolsa tikkeley islemeydi.", "Это метод атаки. На коротких текстах статистика ненадёжна, а против многоалфавитных шифров вроде Виженера напрямую не работает.", "This is an attack. On short texts the statistics are unreliable, and it doesn’t work directly on polyalphabetic ciphers like Vigenère."),
  },
  vigenere: {
    steps: [
      L("Kalit so‘zni tanlang.", "Gilt sózdi tańlań.", "Выберите ключевое слово.", "Choose a key word."),
      L("Uni matn ostiga takror-takror yozing.", "Onı tekst astına qaytalap jazıń.", "Повторяйте его под текстом.", "Write it repeatedly under the text."),
      L("Har bir harfni ostidagi kalit harfi qadar suring (A = 0 … Z = 25).", "Hár bir háripti astındaǵı gilt háribi shamasında jılıstırıń (A = 0 … Z = 25).", "Сдвиньте каждую букву на величину буквы ключа под ней (A = 0 … Z = 25).", "Shift each letter by the key letter beneath it (A = 0 … Z = 25)."),
      L("Ochish — xuddi shu kalit bilan teskari surish.", "Ashıw — dál sol gilt penen keri jılıstırıw.", "Расшифровка — обратный сдвиг тем же ключом.", "Decrypt by shifting back with the same key."),
    ],
    weakness: L("Kalit takrorlanadi. Kasiski usuli takrorlar orasidagi masofadan kalit uzunligini topadi, so‘ng har bir ustun oddiy Sezar kabi ochiladi.", "Gilt qaytalanadı. Kasiski usılı qaytalanıwlar arasındaǵı aralıqtan gilt uzınlıǵın tabadı, sońınan hár bir baǵana ápiwayı Sezar sıyaqlı ashıladı.", "Ключ повторяется. Метод Касиски находит его длину по расстояниям между повторами, а затем каждый столбец вскрывается как обычный Цезарь.", "The key repeats. Kasiski’s method finds its length from the gaps between repeats, then each column falls like a plain Caesar."),
  },
  pigpen: {
    steps: [
      L("Ikkita # panjara va ikkita X chizing; ikkinchilariga nuqta qo‘ying.", "Eki # panjara hám eki X sızıń; ekinshilerine noqat qoyıń.", "Нарисуйте две решётки # и два креста X; во вторые поставьте точки.", "Draw two # grids and two X’s; add dots to the second of each."),
      L("Harflarni tartib bilan kataklarga joylang.", "Háriplerdi tártip penen katakshalarǵa jaylastırıń.", "Расставьте буквы по клеткам по порядку.", "Place the letters in the cells in order."),
      L("Har bir harf o‘rniga uning katagini o‘rab turgan chiziqlarni (va nuqtani) chizing.", "Hár bir hárip ornına onıń katagın orap turǵan sızıqlardı (hám noqattı) sızıń.", "Вместо каждой буквы нарисуйте линии вокруг её клетки (и точку).", "Instead of each letter, draw the lines around its cell (and the dot)."),
    ],
    weakness: L("Belgilar sirli ko‘rinsa ham, bu oddiy almashtirish. Diagramma keng tarqalgan va chastota tahlili uni ochadi.", "Belgiler sırlı kórinse de, bul ápiwayı almastırıw. Diagramma keń tarqalǵan hám jiyilik analizi onı ashadı.", "Как бы загадочно ни выглядели знаки, это простая замена. Схема общеизвестна, а частотный анализ её вскрывает.", "However mysterious it looks, it is simple substitution. The diagram is well known and frequency analysis breaks it."),
  },
  morse: {
    steps: [
      L("Har bir harf uchun nuqta va tire kodini jadvaldan toping.", "Hár bir hárip ushın noqat hám tire kodın kesteden tabıń.", "Найдите в таблице код каждой буквы из точек и тире.", "Look up each letter’s dot-and-dash code."),
      L("Tire nuqtadan 3 marta uzun; harflar orasida qisqa, so‘zlar orasida uzun pauza.", "Tire noqattan 3 ese uzın; háripler arasında qısqa, sózler arasında uzın pauza.", "Тире втрое длиннее точки; между буквами — короткая пауза, между словами — длинная.", "A dash is three dots long; short pause between letters, long between words."),
      L("Signalni tovush, chiroq yoki radio orqali yuboring.", "Signaldı dawıs, shıraq yamasa radio arqalı jiberiń.", "Передайте сигнал звуком, светом или по радио.", "Send it by sound, light or radio."),
    ],
    weakness: L("Bu shifr emas — kalit yo‘q, jadvalni bilgan har kim o‘qiydi. Maxfiylik uchun Morze ustidan boshqa shifr kerak.", "Bul shifr emes — gilt joq, kesteni bilgen hár kim oqıydı. Jasırınlıq ushın Morze ústinen basqa shifr kerek.", "Это не шифр — ключа нет, таблицу знает любой. Для секретности поверх Морзе нужен другой шифр.", "Not a cipher — there is no key and the table is public. For secrecy you need another cipher on top."),
  },
  otp: {
    steps: [
      L("Matnni baytlarga, ya’ni bitlarga aylantiring.", "Tekstti baytlarǵa, yaǵnıy bitlerge aylandırıń.", "Превратите текст в байты, то есть в биты.", "Turn the text into bytes — that is, bits."),
      L("Matn uzunligida haqiqiy tasodifiy kalit oling.", "Tekst uzınlıǵında haqıyqıy tosınnan gilt alıń.", "Возьмите по-настоящему случайный ключ длиной с текст.", "Take a truly random key as long as the text."),
      L("Har bir bitni kalit biti bilan XOR qiling.", "Hár bir bitti gilt biti menen XOR qılıń.", "XOR каждый бит с битом ключа.", "XOR each bit with a key bit."),
      L("Ochish — yana o‘sha kalit bilan XOR. Keyin kalitni yo‘q qiling.", "Ashıw — jáne sol gilt penen XOR. Keyin giltti joq etiń.", "Расшифровка — снова XOR с тем же ключом. Затем ключ уничтожается.", "Decrypt by XORing with the same key again. Then destroy the key."),
    ],
    weakness: L("Algoritm mukammal, lekin amalda qiyin: kalit matn qadar uzun, tasodifiy va faqat bir martalik bo‘lishi shart. Kalit qayta ishlatilsa, shifr ochiladi.", "Algoritm kámil, biraq ámelde qıyın: gilt tekst shamasında uzın, tosınnan hám tek bir mártelik bolıwı shárt. Gilt qayta qollanılsa, shifr ashıladı.", "Алгоритм совершенен, но на практике сложен: ключ должен быть длиной с текст, случайным и одноразовым. Повторное использование ключа раскрывает шифр.", "Perfect in theory, hard in practice: the key must be as long as the text, random and used once. Reuse it and the cipher breaks."),
  },
  enigma: {
    steps: [
      L("Kunlik sozlamani o‘rnating: rotorlar tartibi va boshlang‘ich holati (kalit).", "Kúnlik sazlawdı ornatıń: rotorlar tártibi hám baslanǵısh jaǵdayı (gilt).", "Выставьте дневную настройку: порядок роторов и начальные позиции (ключ).", "Set the daily key: rotor order and starting positions."),
      L("Tugma bosilganda avval o‘ng rotor bir qadam buriladi.", "Túyme basılǵanda aldın oń rotor bir qádem buraladı.", "При нажатии клавиши сначала поворачивается правый ротор.", "On each key press the right rotor first steps once."),
      L("Tok uch rotor, reflektor va yana rotorlar orqali chiroqqa boradi.", "Tok úsh rotor, reflektor hám jáne rotorlar arqalı shıraqqa baradı.", "Ток идёт через три ротора, рефлектор и обратно к лампе.", "Current runs through three rotors, the reflector and back to a lamp."),
      L("Qabul qiluvchi xuddi shu sozlama bilan shifrni terib, matnni oladi.", "Qabıllawshı dál sol sazlaw menen shifrdi terip, tekstti aladı.", "Получатель с той же настройкой набирает шифр и получает текст.", "The receiver, set the same way, types the ciphertext to get the text."),
    ],
    weakness: L("Harf hech qachon o‘ziga aylanmaydi, operatorlar esa bir xil iboralarni («ob-havo hisoboti») takrorlashgan. Tyuringning «Bomba» mashinasi shundan foydalangan.", "Hárip hesh qashan ózine aylanbaydı, operatorlar bolsa birdey sózlerdi («hawa rayı esabatı») qaytalaǵan. Tyuringtiń «Bomba» mashinası usınnan paydalanǵan.", "Буква никогда не шифруется сама в себя, а операторы повторяли одни и те же фразы («сводка погоды»). Этим воспользовалась «Бомба» Тьюринга.", "A letter never maps to itself, and operators repeated stock phrases (“weather report”). Turing’s “Bombe” exploited both."),
  },
  dh: {
    steps: [
      L("Ochiq ravishda tub son p va asos g kelishiladi.", "Ashıq túrde jay san p hám tiykar g kelisiledi.", "Открыто договариваются о простом p и основании g.", "Agree openly on a prime p and a base g."),
      L("Har kim maxfiy son tanlaydi: Aziza — a, Bobur — b.", "Hár kim jasırın san tańlaydı: Aziza — a, Bobur — b.", "Каждый выбирает тайное число: Азиза — a, Бобур — b.", "Each picks a secret: Aziza a, Bobur b."),
      L("A = gᵃ mod p va B = gᵇ mod p ochiq almashiniladi.", "A = gᵃ mod p hám B = gᵇ mod p ashıq almasıladı.", "Открыто обмениваются A = gᵃ mod p и B = gᵇ mod p.", "They swap A = gᵃ mod p and B = gᵇ mod p openly."),
      L("Har biri umumiy sirni hisoblaydi: s = Bᵃ mod p = Aᵇ mod p.", "Hár biri ulıwma sırdı esaplaydı: s = Bᵃ mod p = Aᵇ mod p.", "Каждый вычисляет общий секрет: s = Bᵃ mod p = Aᵇ mod p.", "Each computes the shared secret: s = Bᵃ mod p = Aᵇ mod p."),
    ],
    weakness: L("O‘zi suhbatdoshning kimligini tekshirmaydi: o‘rtada turgan hujumchi har ikki tomon bilan alohida kalit kelishib olishi mumkin (MITM). Shuning uchun HTTPS’da sertifikat va imzo bilan birga ishlatiladi.", "Ózi sáwbetlestiń kim ekenin tekserbeydi: ortada turǵan hújimshi hár eki tárep penen bólek gilt kelisip alıwı múmkin (MITM). Sonlıqtan HTTPS’te sertifikat hám qol menen birge qollanıladı.", "Сам по себе он не проверяет, кто на другой стороне: атакующий посередине может договориться с каждым отдельно (MITM). Поэтому в HTTPS его используют вместе с сертификатом и подписью.", "On its own it doesn’t check who’s on the other end: an attacker in the middle can agree separate keys with each side (MITM). HTTPS pairs it with certificates and signatures."),
  },
  des: {
    steps: [
      L("Matn 64 bitli bloklarga bo‘linadi; kalit — 56 bit.", "Tekst 64 bitli bloklarǵa bólinedi; gilt — 56 bit.", "Текст делится на блоки по 64 бита; ключ — 56 бит.", "Text is split into 64-bit blocks; the key is 56 bits."),
      L("Kalitdan 16 ta raund kaliti yasaladi.", "Giltten 16 raund gilti jasaladı.", "Из ключа получают 16 ключей раундов.", "Sixteen round keys are derived from the key."),
      L("Blok L va R yarmlarga bo‘linadi; har raundda: yangi L = R, yangi R = L ⊕ F(R, Kᵢ).", "Blok L hám R yarımlarǵa bólinedi; hár raundta: jańa L = R, jańa R = L ⊕ F(R, Kᵢ).", "Блок делится на L и R; в каждом раунде: новый L = R, новый R = L ⊕ F(R, Kᵢ).", "The block splits into L and R; each round: new L = R, new R = L ⊕ F(R, Kᵢ)."),
      L("16 raunddan keyin yarmlar birlashtirilib, shifr chiqadi.", "16 raundtan keyin yarımlar biriktirilip, shifr shıǵadı.", "После 16 раундов половины соединяются — получается шифр.", "After 16 rounds the halves are joined into the ciphertext."),
    ],
    weakness: L("56 bitli kalit bugungi kompyuterlar uchun juda qisqa — 1998-yilda 56 soatda brute-force qilingan. O‘rniga avval 3DES, keyin AES keldi.", "56 bitli gilt búgingi kompyuterler ushın júdá qısqa — 1998-jılı 56 saatta brute-force qılınǵan. Ornına aldın 3DES, keyin AES keldi.", "56-битный ключ слишком короток для нынешних компьютеров — в 1998 году его перебрали за 56 часов. На смену пришёл 3DES, затем AES.", "A 56-bit key is far too short for today’s computers — brute-forced in 56 hours in 1998. 3DES and then AES replaced it."),
  },
  rsa: {
    steps: [
      L("Ikkita katta tub son p va q tanlanadi (sir).", "Eki úlken jay san p hám q tańlanadı (sır).", "Выбирают два больших простых числа p и q (секрет).", "Pick two large primes p and q (secret)."),
      L("n = p·q va φ = (p−1)(q−1) hisoblanadi.", "n = p·q hám φ = (p−1)(q−1) esaplanadı.", "Вычисляют n = p·q и φ = (p−1)(q−1).", "Compute n = p·q and φ = (p−1)(q−1)."),
      L("e tanlanadi (φ bilan umumiy bo‘luvchisi yo‘q), d = e⁻¹ mod φ topiladi.", "e tańlanadı (φ menen ulıwma bóliwshisi joq), d = e⁻¹ mod φ tabıladı.", "Выбирают e (взаимно простое с φ) и находят d = e⁻¹ mod φ.", "Choose e (coprime to φ) and find d = e⁻¹ mod φ."),
      L("Ochiq kalit (n, e): c = mᵉ mod n. Yopiq kalit d: m = cᵈ mod n.", "Ashıq gilt (n, e): c = mᵉ mod n. Jabıq gilt d: m = cᵈ mod n.", "Открытый ключ (n, e): c = mᵉ mod n. Закрытый ключ d: m = cᵈ mod n.", "Public key (n, e): c = mᵉ mod n. Private key d: m = cᵈ mod n."),
    ],
    weakness: L("Kichik kalitlar va to‘ldirishsiz «darslik» RSA xavfli; sekinligi sababli u odatda faqat kalit almashish va imzo uchun ishlatiladi. Kelajakdagi kvant kompyuterlar (Shor algoritmi) unga tahdid soladi.", "Kishi giltler hám toltırıwsız «sabaqlıq» RSA qáwipli; ásteligi sebepli ol ádette tek gilt almasıw hám qol ushın qollanıladı. Keleshektegi kvant kompyuterler (Shor algoritmi) oǵan qáwip saladı.", "Маленькие ключи и «учебный» RSA без дополнения опасны; из-за медлительности его обычно используют лишь для обмена ключами и подписи. Будущие квантовые компьютеры (алгоритм Шора) ему угрожают.", "Small keys and unpadded “textbook” RSA are unsafe; being slow, it is mostly used for key exchange and signatures. Future quantum computers (Shor’s algorithm) threaten it."),
  },
  rc4: {
    steps: [
      L("0 dan 255 gacha sonlar jadvali tuziladi.", "0 den 255 ke shekem sanlar kestesi dúziledi.", "Составляется таблица чисел от 0 до 255.", "Build a table of the numbers 0–255."),
      L("Jadval kalit baytlari bo‘yicha aralashtiriladi (KSA).", "Keste gilt baytları boyınsha aralastırıladı (KSA).", "Таблица перемешивается по байтам ключа (KSA).", "Shuffle it guided by the key bytes (KSA)."),
      L("Har qadamda ikki son almashadi va bitta kalit oqimi bayti chiqadi (PRGA).", "Hár qádemde eki san almasadı hám bir gilt aǵımı baytı shıǵadı (PRGA).", "На каждом шаге два числа меняются местами и выходит байт ключевого потока (PRGA).", "Each step swaps two numbers and emits one keystream byte (PRGA)."),
      L("Matn baytlari kalit oqimi bilan XOR qilinadi.", "Tekst baytları gilt aǵımı menen XOR qılınadı.", "Байты текста XOR-ятся с ключевым потоком.", "The text bytes are XORed with the keystream."),
    ],
    weakness: L("Kalit oqimining boshida statistik qonuniyatlar bor va kalit tayyorlash zaif. WEP shu sababli buzilgan; 2015-yildan TLS’da taqiqlangan.", "Gilt aǵımınıń basında statistikalıq nızamlılıqlar bar hám gilt tayarlaw álsiz. WEP usı sebepli buzılǵan; 2015-jıldan TLS’te qadaǵan etilgen.", "В начале ключевого потока есть статистические закономерности, а подготовка ключа слабая. Из-за этого взломали WEP; с 2015 года запрещён в TLS.", "The start of the keystream is statistically biased and key setup is weak. That broke WEP; banned in TLS since 2015."),
  },
  aes: {
    steps: [
      L("16 baytli blok 4×4 jadvalga (holat) joylanadi.", "16 baytlıq blok 4×4 kestege (jaǵday) jaylastırıladı.", "16-байтовый блок раскладывается в таблицу 4×4 (состояние).", "The 16-byte block is laid out as a 4×4 state."),
      L("Kalitdan 11 ta raund kaliti yasaladi (AES-128).", "Giltten 11 raund gilti jasaladı (AES-128).", "Из ключа получают 11 ключей раундов (AES-128).", "Eleven round keys are derived from the key (AES-128)."),
      L("Har raundda: SubBytes → ShiftRows → MixColumns → AddRoundKey.", "Hár raundta: SubBytes → ShiftRows → MixColumns → AddRoundKey.", "В каждом раунде: SubBytes → ShiftRows → MixColumns → AddRoundKey.", "Each round: SubBytes → ShiftRows → MixColumns → AddRoundKey."),
      L("10 raunddan keyin (oxirgisida MixColumns yo‘q) shifr tayyor. Ochish — teskari amallar teskari tartibda.", "10 raundtan keyin (aqırǵısında MixColumns joq) shifr tayın. Ashıw — keri ámeller keri tártipte.", "После 10 раундов (в последнем нет MixColumns) шифр готов. Расшифровка — обратные операции в обратном порядке.", "After 10 rounds (the last skips MixColumns) it is done. Decryption runs inverse steps in reverse."),
    ],
    weakness: L("Algoritmning o‘zi buzilmagan. Xavf — noto‘g‘ri ishlatishda: masalan, ECB rejimi rasm va matndagi naqshlarni ko‘rsatib qo‘yadi, kalit esa xavfsiz saqlanmasa, eng kuchli shifr ham yordam bermaydi.", "Algoritmniń ózi buzılmaǵan. Qáwip — nadurıs qollanıwda: mısalı, ECB rejimi súwret hám tekstegi naqıslardı kórsetip qoyadı, gilt bolsa qáwipsiz saqlanbasa, eń kúshli shifr de járdem bermeydi.", "Сам алгоритм не взломан. Опасность — в неправильном использовании: режим ECB выдаёт узоры в картинках и тексте, а при плохо хранимом ключе не поможет даже сильнейший шифр.", "The algorithm itself is unbroken. The danger is misuse: ECB mode leaks patterns in images and text, and a poorly kept key defeats even the strongest cipher."),
  },
  sha256: {
    steps: [
      L("Matn oxiriga 1 bit, nollar va uzunligi qo‘shilib, 512 bitli bo‘laklarga bo‘linadi.", "Tekst aqırına 1 bit, nollar hám uzınlıǵı qosılıp, 512 bitli bóleklerge bólinedi.", "К тексту дописывают бит 1, нули и длину, затем режут на блоки по 512 бит.", "Append a 1 bit, zeros and the length, then cut into 512-bit chunks."),
      L("Har bo‘lakdan 64 ta so‘z yasaladi.", "Hár bólekten 64 sóz jasaladı.", "Из каждого блока получают 64 слова.", "Each chunk is expanded into 64 words."),
      L("64 raund davomida 8 ta registr aylantirish, XOR va qo‘shish bilan aralashtiriladi.", "64 raund dawamında 8 registr aylandırıw, XOR hám qosıw menen aralastırıladı.", "За 64 раунда 8 регистров перемешиваются сдвигами, XOR и сложением.", "Over 64 rounds, 8 registers are mixed with rotations, XOR and addition."),
      L("Oxirida registrlar birlashtirilib, 256 bitli xesh chiqadi.", "Aqırında registrler biriktirilip, 256 bitli xesh shıǵadı.", "В конце регистры склеиваются в 256-битный хеш.", "Finally the registers are joined into the 256-bit hash."),
    ],
    weakness: L("Xesh tez — bu fayllar uchun yaxshi, parollar uchun yomon: hujumchi soniyasiga milliardlab taxminni sinaydi. Parollarga tuz va sekin xesh (bcrypt, Argon2) kerak.", "Xesh tez — bul fayllar ushın jaqsı, parollar ushın jaman: hújimshi sekundına milliardlaǵan boljawdı sınaydı. Parollarǵa duz hám áste xesh (bcrypt, Argon2) kerek.", "Хеш быстрый — это хорошо для файлов и плохо для паролей: атакующий проверяет миллиарды вариантов в секунду. Паролям нужны соль и медленный хеш (bcrypt, Argon2).", "It is fast — good for files, bad for passwords: attackers test billions of guesses a second. Passwords need salt and a slow hash (bcrypt, Argon2)."),
  },
};
