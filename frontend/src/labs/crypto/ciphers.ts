import type { Localized } from "@/labs/i18n";
import {
  atbash,
  caesar,
  lettersOnly,
  morseEncode,
  normalizeMorse,
  polybiusEncrypt,
  scytaleEncrypt,
  vigenere,
} from "@/labs/sim/crypto";
import { enigma } from "@/labs/sim/enigma";
import { cipherNotes } from "./cipher-notes";
import { modernCiphers } from "./modern-ciphers";

// The cryptography lab: ten ciphers in the order they were invented. Each has
// a short story, how it works, a fun fact and exercises. Exercise answers are
// computed with the cipher functions, never typed by hand, so a task can
// never carry a wrong key.

export const cipherIds = [
  "atbash",
  "scytale",
  "polybius",
  "caesar",
  "frequency",
  "vigenere",
  "pigpen",
  "morse",
  "otp",
  "enigma",
  "dh",
  "des",
  "rsa",
  "rc4",
  "aes",
  "sha256",
] as const;
export type CipherId = (typeof cipherIds)[number];

/** "manual": pen-and-paper ciphers; "machine": machines and computers. */
export type Era = "manual" | "machine";

/** "code" compares letters and digits only, e.g. hex or binary answers. */
export type AnswerFormat = "letters" | "digits" | "code" | "morse" | "choice";

export interface Exercise {
  task: Localized;
  /** What the student works from: ciphertext, plaintext or Morse. */
  given?: string;
  /** Draw `given` as pigpen symbols instead of text. */
  glyphs?: boolean;
  /** Key shown next to the task (shift, key word, rod size, start position). */
  key?: string;
  answer: string;
  format: AnswerFormat;
  /** Multiple choice: `answer` is the index of the right option. */
  options?: Localized[];
  hint?: Localized;
}

export interface Cipher {
  id: CipherId;
  era: Era;
  title: Localized;
  /** When it appeared, as the timeline shows it. */
  when: Localized;
  /** 1–3: how hard it is. */
  level: 1 | 2 | 3;
  tagline: Localized;
  story: Localized;
  how: Localized;
  /** The algorithm as numbered steps. */
  steps: Localized[];
  /** Why it falls (or where it is limited). */
  weakness: Localized;
  fact: Localized;
  exercises: Exercise[];
}

const encrypt: Localized = { uz: "Shifrlang", kaa: "Shifrlań", ru: "Зашифруйте", en: "Encrypt" };
const decrypt: Localized = { uz: "Shifrni oching", kaa: "Shifrdi ashıń", ru: "Расшифруйте", en: "Decrypt" };

const uzLong =
  "Kiberxavfsizlik mutaxassisi har kuni yangi narsalarni organadi. U tarmoqlarni tekshiradi, zaif joylarni topadi va ularni tuzatishga yordam beradi. Bu ish sabr, qiziqish va halollikni talab qiladi.";
const enLong =
  "Every message you send online passes through many machines before it arrives. Without encryption any of them could read it, change it or keep a copy for later.";

const classic: Omit<Cipher, "steps" | "weakness">[] = [
  {
    id: "atbash",
    era: "manual",
    title: { uz: "Atbash — ko‘zgu shifri", kaa: "Atbash — ayna shifri", ru: "Атбаш — зеркальный шифр", en: "Atbash — the mirror cipher" },
    when: { uz: "Mil. avv. ~600-yil", kaa: "B.e.sh. ~600-jıl", ru: "~600 г. до н. э.", en: "~600 BC" },
    level: 1,
    tagline: {
      uz: "Alifboni ko‘zguga tuting: A — Z, B — Y bo‘ladi.",
      kaa: "Álipbeni aynaǵa tutıń: A — Z, B — Y boladı.",
      ru: "Поднесите алфавит к зеркалу: A станет Z, B — Y.",
      en: "Hold the alphabet to a mirror: A becomes Z, B becomes Y.",
    },
    story: {
      uz: "Qadimgi yahudiy mirzolari muqaddas kitoblarda ba’zi shahar nomlarini shu usulda yashirgan. Nomi ibroniy alifbosining birinchi va oxirgi harflaridan olingan: **A**lef–**T**av, **B**et–**Sh**in.",
      kaa: "Áyyemgi evrey mirzaları muqaddes kitaplarda ayırım qala atların usı usılda jasırǵan. Atı ibrayım álipbesiniń birinshi hám aqırǵı háriplerinen alınǵan: **A**lef–**T**av, **B**et–**Sh**in.",
      ru: "Древние еврейские писцы прятали так названия городов в священных текстах. Имя составлено из первых и последних букв иврита: **А**леф–**Т**ав, **Б**ет–**Ш**ин.",
      en: "Ancient Hebrew scribes hid some city names in sacred texts this way. The name comes from the first and last Hebrew letters: **A**leph–**T**av, **B**et–**Sh**in.",
    },
    how: {
      uz: "Har bir harf alifboning teskari tomonidagi juftiga almashadi. Kalit yo‘q — qoidani bilgan har kim o‘qiy oladi.",
      kaa: "Hár bir hárip álipbeniń keri tárepindegi jubına almasadı. Gilt joq — qaǵıydanı bilgen hár kim oqıy aladı.",
      ru: "Каждая буква меняется на парную с другого конца алфавита. Ключа нет — прочитает любой, кто знает правило.",
      en: "Each letter swaps with its partner from the other end of the alphabet. There is no key — anyone who knows the rule can read it.",
    },
    fact: {
      uz: "Atbashni ikki marta qo‘llasangiz, asl matn qaytadi: shifrlash va ochish — bitta amal.",
      kaa: "Atbashtı eki ret qollasańız, haqıyqıy tekst qaytadı: shifrlaw hám ashıw — bir ámel.",
      ru: "Примените Атбаш дважды — и вернётся исходный текст: шифрование и расшифровка — одно действие.",
      en: "Apply Atbash twice and the original comes back: encrypting and decrypting are the same step.",
    },
    exercises: [
      { task: encrypt, given: "SALOM", answer: atbash("SALOM"), format: "letters" },
      { task: decrypt, given: atbash("KITOB"), answer: "KITOB", format: "letters" },
      { task: decrypt, given: atbash("ROOTY TEAM"), answer: "ROOTY TEAM", format: "letters" },
      {
        task: {
          uz: "Qaysi so‘z Atbashda o‘zining teskari yozilishiga aylanadi?",
          kaa: "Qaysı sóz Atbashta óziniń keri jazılıwına aylanadı?",
          ru: "Какое слово в Атбаше превращается в себя, записанное задом наперёд?",
          en: "Which word turns into itself spelled backwards under Atbash?",
        },
        answer: "1",
        format: "choice",
        options: [
          { uz: "SALOM", kaa: "SALOM", ru: "SALOM", en: "SALOM" },
          { uz: "WIZARD", kaa: "WIZARD", ru: "WIZARD", en: "WIZARD" },
          { uz: "HACKER", kaa: "HACKER", ru: "HACKER", en: "HACKER" },
        ],
        hint: {
          uz: "Har birini asbobda sinab ko‘ring va natijani orqadan o‘qing.",
          kaa: "Hár birin quralda sınap kóriń hám nátiyjeni arttan oqıń.",
          ru: "Проверьте каждое в инструменте и прочитайте результат с конца.",
          en: "Try each one in the tool and read the result backwards.",
        },
      },
    ],
  },
  {
    id: "scytale",
    era: "manual",
    title: { uz: "Skital — Sparta tayoqchasi", kaa: "Skital — Sparta tayaqshası", ru: "Скитала — спартанский жезл", en: "Scytale — the Spartan rod" },
    when: { uz: "Mil. avv. ~400-yil", kaa: "B.e.sh. ~400-jıl", ru: "~400 г. до н. э.", en: "~400 BC" },
    level: 1,
    tagline: {
      uz: "Harflar almashmaydi — faqat joyi aralashadi.",
      kaa: "Háripler almaspaydı — tek ornı aralasadı.",
      ru: "Буквы не меняются — только перемешиваются местами.",
      en: "The letters don’t change — only their order does.",
    },
    story: {
      uz: "Spartalik sarkardalar tayoqchaga charm tasma o‘rab, xabarni tayoqcha bo‘ylab yozgan. Tasma yechilganda harflar tartibsiz qatorga aylangan. Faqat **xuddi shunday qalinlikdagi** tayoqchasi bor odam uni qayta o‘qiy olgan.",
      kaa: "Spartalı áskerbasılar tayaqshaǵa teri taspa orap, xabardı tayaqsha boylap jazǵan. Taspa sheshilgende háripler tártipsiz qatarǵa aylanǵan. Tek **dál sonday qalıńlıqtaǵı** tayaqshası bar adam onı qaytadan oqıy alǵan.",
      ru: "Спартанские полководцы наматывали на жезл кожаную ленту и писали сообщение вдоль жезла. Размотанная лента превращалась в беспорядочную строку букв. Прочитать её мог лишь тот, у кого был жезл **той же толщины**.",
      en: "Spartan generals wound a leather strip around a rod and wrote along it. Unwound, the strip became a jumble of letters. Only someone with a rod of **exactly the same thickness** could read it again.",
    },
    how: {
      uz: "Xabar jadvalga qatorma-qator yoziladi, so‘ng ustunma-ustun o‘qiladi. Kalit — tayoqcha atrofidagi qatorlar soni. Bu **o‘rin almashtirish** (transpozitsiya) shifri.",
      kaa: "Xabar kestege qatarma-qatar jazıladı, sońınan baǵanama-baǵana oqıladı. Gilt — tayaqsha átirapındaǵı qatarlar sanı. Bul **orın almastırıw** (transpoziciya) shifri.",
      ru: "Сообщение пишется в таблицу по строкам, а читается по столбцам. Ключ — число строк вокруг жезла. Это **перестановочный** шифр.",
      en: "The message is written into a table row by row and read column by column. The key is the number of rows around the rod. It is a **transposition** cipher.",
    },
    fact: {
      uz: "Zamonaviy shifrlar ham ikki g‘oyani birlashtiradi: harflarni almashtirish (Sezar kabi) va joyini aralashtirish (Skital kabi).",
      kaa: "Zamanagóy shifrler de eki pikirdi birlestiredi: háriplerdi almastırıw (Sezar sıyaqlı) hám ornın aralastırıw (Skital sıyaqlı).",
      ru: "Современные шифры тоже соединяют две идеи: замену букв (как у Цезаря) и их перестановку (как у скиталы).",
      en: "Modern ciphers still combine two ideas: substituting letters (like Caesar) and shuffling them (like the scytale).",
    },
    exercises: [
      { task: encrypt, given: "SPARTA KELDI", key: "3", answer: scytaleEncrypt("SPARTA KELDI", 3), format: "letters" },
      { task: decrypt, given: scytaleEncrypt("YORDAM KERAK", 4), key: "4", answer: "YORDAMKERAK", format: "letters" },
      { task: decrypt, given: scytaleEncrypt("TONGDA HUJUM", 2), key: "2", answer: "TONGDAHUJUM", format: "letters" },
    ],
  },
  {
    id: "polybius",
    era: "manual",
    title: { uz: "Polibiy kvadrati", kaa: "Polibiy kvadratı", ru: "Квадрат Полибия", en: "The Polybius square" },
    when: { uz: "Mil. avv. ~150-yil", kaa: "B.e.sh. ~150-jıl", ru: "~150 г. до н. э.", en: "~150 BC" },
    level: 1,
    tagline: {
      uz: "Har bir harf — ikki raqam: qator va ustun.",
      kaa: "Hár bir hárip — eki san: qatar hám baǵana.",
      ru: "Каждая буква — две цифры: строка и столбец.",
      en: "Every letter becomes two digits: row and column.",
    },
    story: {
      uz: "Yunon tarixchisi Polibiy alifboni 5×5 jadvalga joylab, harflarni mash’alalar bilan uzatishni taklif qilgan: chap qo‘lda — qator, o‘ng qo‘lda — ustun soni. Shu tariqa xabar tepalikdan tepalikka uzatilgan.",
      kaa: "Grek tariyxshısı Polibiy álipbeni 5×5 kestege jaylastırıp, háriplerdi mash’alalar menen jetkeriwdi usınǵan: shep qolda — qatar, oń qolda — baǵana sanı. Usılay xabar tóbeden tóbege jetkerilgen.",
      ru: "Греческий историк Полибий разложил алфавит в таблицу 5×5 и предложил передавать буквы факелами: в левой руке — номер строки, в правой — столбца. Так сообщения передавали с холма на холм.",
      en: "The Greek historian Polybius laid the alphabet out in a 5×5 grid and proposed sending letters with torches: the left hand showed the row, the right the column. Messages hopped from hill to hill.",
    },
    how: {
      uz: "Harfni jadvaldan toping va avval qator, keyin ustun raqamini yozing. 26 harf 25 katakka sig‘ishi uchun I va J bitta katakda turadi.",
      kaa: "Háripti kesteden tabıń hám aldın qatar, keyin baǵana sanın jazıń. 26 hárip 25 katakqa sıyıwı ushın I hám J bir katakta turadı.",
      ru: "Найдите букву в таблице и запишите сначала номер строки, потом столбца. Чтобы 26 букв влезли в 25 клеток, I и J делят одну клетку.",
      en: "Find the letter in the grid and write its row number, then its column number. To fit 26 letters into 25 cells, I and J share one.",
    },
    fact: {
      uz: "Qamoqxonalarda mahbuslar shu jadval bilan devorga taqillatib gaplashgan — bu «taqillatish kodi» deb ataladi.",
      kaa: "Qamaqxanalarda tutqınlar usı keste menen diywalǵa taqıllatıp sóylesken — bul «taqıllatıw kodı» dep ataladı.",
      ru: "Заключённые перестукивались через стену по этой таблице — это называют «тюремной азбукой».",
      en: "Prisoners used this grid to talk by knocking on walls — it is known as the “tap code”.",
    },
    exercises: [
      { task: encrypt, given: "KOD", answer: polybiusEncrypt("KOD"), format: "digits" },
      { task: decrypt, given: polybiusEncrypt("PAROL"), answer: "PAROL", format: "letters" },
      { task: decrypt, given: polybiusEncrypt("TOSHKENT"), answer: "TOSHKENT", format: "letters" },
    ],
  },
  {
    id: "caesar",
    era: "manual",
    title: { uz: "Sezar shifri", kaa: "Sezar shifri", ru: "Шифр Цезаря", en: "The Caesar cipher" },
    when: { uz: "Mil. avv. ~50-yil", kaa: "B.e.sh. ~50-jıl", ru: "~50 г. до н. э.", en: "~50 BC" },
    level: 1,
    tagline: {
      uz: "Har bir harf bir necha qadam oldinga suriladi.",
      kaa: "Hár bir hárip bir neshe qádem aldıǵa jılısadı.",
      ru: "Каждая буква сдвигается на несколько шагов вперёд.",
      en: "Every letter moves a few steps along the alphabet.",
    },
    story: {
      uz: "Rim tarixchisi Svetoniy yozishicha, Yuliy Sezar maxfiy xatlarda har bir harfni uch qadam surgan: A o‘rniga D, B o‘rniga E. O‘sha davrda ko‘pchilik o‘qishni ham bilmagani uchun bu yetarli himoya edi.",
      kaa: "Rim tariyxshısı Svetoniy jazıwınsha, Yuliy Sezar jasırın xatlarda hár bir háripti úsh qádem jılıstırǵan: A ornına D, B ornına E. Sol dáwirde kópshilik oqıwdı da bilmegeni ushın bul jetkilikli qorǵaw edi.",
      ru: "По словам историка Светония, Юлий Цезарь в тайных письмах сдвигал каждую букву на три: D вместо A, E вместо B. Тогда многие не умели даже читать, так что этого хватало.",
      en: "According to the historian Suetonius, Julius Caesar shifted every letter by three in secret letters: D for A, E for B. Back then many people could not read at all, so it was enough.",
    },
    how: {
      uz: "Kalit — siljish soni (1–25). Ochish uchun harflar teskari tomonga suriladi. Kalitlar atigi 25 ta, shuning uchun hammasini sinab chiqish oson.",
      kaa: "Gilt — jılısıw sanı (1–25). Ashıw ushın háripler keri tárepke jılısadı. Giltler bar bolǵanı 25, sonlıqtan hámmesin sınap shıǵıw ańsat.",
      ru: "Ключ — величина сдвига (1–25). Для расшифровки буквы сдвигают обратно. Ключей всего 25, поэтому перебрать их легко.",
      en: "The key is the shift (1–25). To decrypt, shift back. There are only 25 keys, so trying them all is easy.",
    },
    fact: {
      uz: "ROT13 — 13 qadamli Sezar. Uni ikki marta qo‘llasangiz, matn qaytadi; internet forumlarida spoylerlarni yashirish uchun hozir ham ishlatiladi.",
      kaa: "ROT13 — 13 qádemli Sezar. Onı eki ret qollasańız, tekst qaytadı; internet forumlarında spoylerlerdi jasırıw ushın házir de qollanıladı.",
      ru: "ROT13 — это Цезарь со сдвигом 13. Примените дважды — текст вернётся; им до сих пор прячут спойлеры на форумах.",
      en: "ROT13 is Caesar with a shift of 13. Apply it twice and the text returns; forums still use it to hide spoilers.",
    },
    exercises: [
      { task: encrypt, given: "HUJUM", key: "3", answer: caesar("HUJUM", 3), format: "letters" },
      { task: decrypt, given: caesar("XAVFSIZLIK", 5), key: "5", answer: "XAVFSIZLIK", format: "letters" },
      {
        task: {
          uz: "Kalit noma’lum. Shifrni oching",
          kaa: "Gilt belgisiz. Shifrdi ashıń",
          ru: "Ключ неизвестен. Расшифруйте",
          en: "The key is unknown. Decrypt",
        },
        given: caesar("SIRLI XABAR", 11),
        answer: "SIRLI XABAR",
        format: "letters",
        hint: {
          uz: "Asbobdagi «barcha 25 kalit» tugmasi bilan ma’noli qatorni toping.",
          kaa: "Quraldaǵı «barlıq 25 gilt» túymesi menen mánili qatardı tabıń.",
          ru: "Кнопкой «все 25 ключей» найдите строку со смыслом.",
          en: "Use the “all 25 keys” button and find the line that makes sense.",
        },
      },
      { task: decrypt, given: caesar("SPOYLER", 13), key: "13 (ROT13)", answer: "SPOYLER", format: "letters" },
    ],
  },
  {
    id: "frequency",
    era: "manual",
    title: {
      uz: "Al-Kindiy va chastota tahlili",
      kaa: "Al-Kindiy hám jiyilik analizi",
      ru: "Аль-Кинди и частотный анализ",
      en: "Al-Kindi and frequency analysis",
    },
    when: { uz: "~850-yil, Bag‘dod", kaa: "~850-jıl, Baǵdad", ru: "~850 г., Багдад", en: "~850, Baghdad" },
    level: 2,
    tagline: {
      uz: "Har bir tilning sevimli harflari bor — ular shifrni fosh qiladi.",
      kaa: "Hár bir tildiń súyikli háripleri bar — olar shifrdi áshkaralaydı.",
      ru: "У каждого языка есть любимые буквы — они и выдают шифр.",
      en: "Every language has favourite letters — and they give the cipher away.",
    },
    story: {
      uz: "Bag‘dodning «Hikmat uyi»da ishlagan olim Al-Kindiy kalitni bilmasdan shifrni ochish usulini birinchi bo‘lib yozib qoldirgan. U matndagi harflarni sanab, eng ko‘p uchraydigan belgilarni tilning eng ko‘p ishlatiladigan harflariga moslashtirgan.",
      kaa: "Baǵdadtıń «Danalıq úyi»nde islegen alım Al-Kindiy giltti bilmey turıp shifrdi ashıw usılın birinshi bolıp jazıp qaldırǵan. Ol tekstegi háriplerdi sanap, eń kóp ushırasatuǵın belgilerdi tildiń eń kóp qollanılatuǵın háriplerine sáykeslestirgen.",
      ru: "Учёный Аль-Кинди из багдадского «Дома мудрости» первым описал, как вскрыть шифр без ключа. Он подсчитывал буквы в тексте и сопоставлял самые частые знаки с самыми частыми буквами языка.",
      en: "Al-Kindi, a scholar at Baghdad’s House of Wisdom, was the first to write down how to break a cipher without the key. He counted the letters and matched the most common symbols to the language’s most common letters.",
    },
    how: {
      uz: "O‘zbek tilida eng ko‘p **A** va **I**, ingliz tilida esa **E** uchraydi. Shifrlangan matnda qaysi harf eng ko‘p bo‘lsa, u ehtimol shu harfning niqobi. Sezarda bitta moslik butun kalitni ochadi.",
      kaa: "Ózbek tilinde eń kóp **A** hám **I**, inglis tilinde bolsa **E** ushırasadı. Shifrlanǵan tekstte qaysı hárip eń kóp bolsa, ol itimal sol háriptiń perdesi. Sezarda bir sáykeslik pútkil giltti ashadı.",
      ru: "В узбекском чаще всего встречаются **A** и **I**, в английском — **E**. Самая частая буква шифротекста, скорее всего, их «маска». У Цезаря одно совпадение раскрывает весь ключ.",
      en: "Uzbek uses **A** and **I** most, English uses **E**. The most frequent ciphertext letter is probably one of them in disguise. With Caesar, one match reveals the whole key.",
    },
    fact: {
      uz: "Bu usul 700 yil davomida barcha oddiy almashtirish shifrlarini ochib kelgan — Vijener shifri paydo bo‘lgunga qadar.",
      kaa: "Bul usıl 700 jıl dawamında barlıq ápiwayı almastırıw shifrlerin ashıp kelgen — Vijener shifri payda bolǵanǵa shekem.",
      ru: "Этот метод 700 лет вскрывал все простые шифры замены — пока не появился шифр Виженера.",
      en: "For 700 years this method broke every simple substitution cipher — until Vigenère came along.",
    },
    exercises: [
      {
        task: {
          uz: "O‘zbekcha matn Sezar bilan shifrlangan. Kalitni (siljishni) toping",
          kaa: "Ózbekshe tekst Sezar menen shifrlanǵan. Giltti (jılısıwdı) tabıń",
          ru: "Узбекский текст зашифрован Цезарем. Найдите ключ (сдвиг)",
          en: "An Uzbek text was encrypted with Caesar. Find the key (shift)",
        },
        given: caesar(uzLong, 9),
        answer: "9",
        format: "digits",
        hint: {
          uz: "Matnni asbobga qo‘ying: eng baland ustun qaysi harf? U, ehtimol, A.",
          kaa: "Tekstti quralǵa qoyıń: eń biyik baǵana qaysı hárip? Ol, itimal, A.",
          ru: "Вставьте текст в инструмент: какая буква самая частая? Скорее всего, это A.",
          en: "Paste it into the tool: which letter is tallest? It is probably A.",
        },
      },
      {
        task: {
          uz: "Inglizcha matnning kalitini toping",
          kaa: "Inglisshe tekstiń giltin tabıń",
          ru: "Найдите ключ английского текста",
          en: "Find the key of the English text",
        },
        given: caesar(enLong, 17),
        answer: "17",
        format: "digits",
        hint: {
          uz: "Ingliz tilida eng ko‘p uchraydigan harf — E.",
          kaa: "Inglis tilinde eń kóp ushırasatuǵın hárip — E.",
          ru: "Самая частая буква английского — E.",
          en: "The most common English letter is E.",
        },
      },
      {
        task: {
          uz: "Nega chastota tahlili Sezarga qarshi ishlaydi?",
          kaa: "Nege jiyilik analizi Sezarǵa qarsı isleydi?",
          ru: "Почему частотный анализ работает против Цезаря?",
          en: "Why does frequency analysis beat Caesar?",
        },
        answer: "0",
        format: "choice",
        options: [
          {
            uz: "Har bir harf doim bitta harfga almashadi — tilning «izi» saqlanib qoladi",
            kaa: "Hár bir hárip hámme waqıt bir háripke almasadı — tildiń «izi» saqlanıp qaladı",
            ru: "Каждая буква всегда заменяется одной и той же — «отпечаток» языка сохраняется",
            en: "Each letter always maps to the same letter — the language’s “fingerprint” survives",
          },
          {
            uz: "Sezar shifrida harflar soni kamayadi",
            kaa: "Sezar shifrinde háripler sanı kemeyedi",
            ru: "В шифре Цезаря становится меньше букв",
            en: "Caesar removes some letters",
          },
          {
            uz: "Kompyuter kalitni eslab qoladi",
            kaa: "Kompyuter giltti yadta saqlaydı",
            ru: "Компьютер запоминает ключ",
            en: "The computer remembers the key",
          },
        ],
      },
    ],
  },
  {
    id: "vigenere",
    era: "manual",
    title: { uz: "Vijener shifri", kaa: "Vijener shifri", ru: "Шифр Виженера", en: "The Vigenère cipher" },
    when: { uz: "1553-yil", kaa: "1553-jıl", ru: "1553 г.", en: "1553" },
    level: 2,
    tagline: {
      uz: "Kalit so‘z har bir harfni har xil suradi.",
      kaa: "Gilt sóz hár bir háripti hár qıylı jılıstıradı.",
      ru: "Ключевое слово сдвигает каждую букву по-своему.",
      en: "A key word shifts every letter differently.",
    },
    story: {
      uz: "Italiyalik Jovan Battista Bellazo 1553-yilda kalit so‘zli shifrni e’lon qilgan, ammo u keyinchalik fransuz Blez de Vijener nomi bilan mashhur bo‘lgan. 300 yil davomida uni «le chiffre indéchiffrable» — buzib bo‘lmaydigan shifr deyishgan.",
      kaa: "Italiyalı Jovan Battista Bellazo 1553-jılı gilt sózli shifrdi járiyalaǵan, biraq ol keyinirek francuz Blez de Vijener atı menen belgili bolǵan. 300 jıl dawamında onı «le chiffre indéchiffrable» — buzıp bolmaytuǵın shifr dep ataǵan.",
      ru: "Итальянец Джован Баттиста Беллазо опубликовал шифр с ключевым словом в 1553 году, но прославился он под именем француза Блеза де Виженера. 300 лет его называли «le chiffre indéchiffrable» — неразгадываемым шифром.",
      en: "The Italian Giovan Battista Bellaso published a key-word cipher in 1553, but it became famous under the Frenchman Blaise de Vigenère’s name. For 300 years it was called “le chiffre indéchiffrable” — the unbreakable cipher.",
    },
    how: {
      uz: "Kalit so‘z matn ostiga takror-takror yoziladi. Har bir harf ostidagi kalit harfi qadar suriladi (A = 0, B = 1 …). Bir xil harf turli joyda turli harfga aylanadi — chastota tahlili chalkashadi.",
      kaa: "Gilt sóz tekst astına qaytalap jazıladı. Hár bir hárip astındaǵı gilt háribi shamasında jılısadı (A = 0, B = 1 …). Birdey hárip hár túrli jerde hár túrli háripke aylanadı — jiyilik analizi shatasadı.",
      ru: "Ключевое слово повторяется под текстом. Каждая буква сдвигается на величину буквы ключа под ней (A = 0, B = 1 …). Одна и та же буква в разных местах шифруется по-разному — частотный анализ сбивается.",
      en: "The key word is repeated under the text. Each letter shifts by the key letter beneath it (A = 0, B = 1 …). The same letter becomes different letters in different places — which confuses frequency analysis.",
    },
    fact: {
      uz: "1863-yilda Fridrix Kasiski takrorlanuvchi bo‘laklar orasidagi masofadan kalit uzunligini topib, uni baribir ochgan.",
      kaa: "1863-jılı Fridrix Kasiski qaytalanatuǵın bólekler arasındaǵı aralıqtan gilt uzınlıǵın tawıp, onı bári bir ashqan.",
      ru: "В 1863 году Фридрих Касиски всё же вскрыл его, вычислив длину ключа по расстояниям между повторами.",
      en: "In 1863 Friedrich Kasiski broke it anyway, working out the key length from the distances between repeats.",
    },
    exercises: [
      { task: encrypt, given: "SALOM", key: "KOD", answer: vigenere("SALOM", "KOD"), format: "letters" },
      { task: decrypt, given: vigenere("HUJUM TONGDA", "QALQON"), key: "QALQON", answer: "HUJUM TONGDA", format: "letters" },
      { task: decrypt, given: vigenere("KALIT SIRDA", "ROOTY"), key: "ROOTY", answer: "KALIT SIRDA", format: "letters" },
    ],
  },
  {
    id: "pigpen",
    era: "manual",
    title: { uz: "Masonlar shifri (Pigpen)", kaa: "Masonlar shifri (Pigpen)", ru: "Шифр масонов (Pigpen)", en: "The Freemasons’ cipher (Pigpen)" },
    when: { uz: "XVIII asr", kaa: "XVIII ásir", ru: "XVIII век", en: "18th century" },
    level: 1,
    tagline: {
      uz: "Harflar o‘rniga — panjaradagi katak shakllari.",
      kaa: "Háripler ornına — panjaradaǵı katak formaları.",
      ru: "Вместо букв — формы клеток решётки.",
      en: "Instead of letters — the shapes of cells in a grid.",
    },
    story: {
      uz: "Masonlar jamiyati a’zolari yozuvlarini shu belgilar bilan yashirgan; ularni hatto qabr toshlarida ham uchratish mumkin. AQSh fuqarolar urushida asirlar ham undan foydalangan.",
      kaa: "Masonlar jámiyeti aǵzaları jazıwların usı belgiler menen jasırǵan; olardı hátte qábir taslarında da ushıratıw múmkin. AQSh puqaralar urısında tutqınlar da onnan paydalanǵan.",
      ru: "Масоны прятали этими знаками свои записи — их можно встретить даже на надгробиях. Пользовались им и пленные во время Гражданской войны в США.",
      en: "Freemasons hid their records with these symbols — they appear even on gravestones. Prisoners in the American Civil War used it too.",
    },
    how: {
      uz: "A–I oddiy # panjaraga, J–R nuqtali # panjaraga, S–V X shakliga, W–Z nuqtali X ga joylanadi. Harf o‘rniga uning katagini o‘rab turgan chiziqlar chiziladi.",
      kaa: "A–I ápiwayı # panjaraǵa, J–R noqatlı # panjaraǵa, S–V X formasına, W–Z noqatlı X qa jaylastırıladı. Hárip ornına onıń katagın orap turǵan sızıqlar sızıladı.",
      ru: "A–I стоят в обычной решётке #, J–R — в решётке с точками, S–V — в кресте X, W–Z — в кресте с точками. Вместо буквы рисуют линии вокруг её клетки.",
      en: "A–I sit in a plain # grid, J–R in a dotted one, S–V in an X and W–Z in a dotted X. A letter is drawn as the lines around its cell.",
    },
    fact: {
      uz: "Pigpen sirli ko‘rinadi, lekin aslida oddiy almashtirish shifri — chastota tahlili uni ham bir zumda ochadi.",
      kaa: "Pigpen sırlı kórinedi, biraq haqıyqatında ápiwayı almastırıw shifri — jiyilik analizi onı da bir zamatta ashadı.",
      ru: "Pigpen выглядит загадочно, но по сути это простая замена — частотный анализ вскроет и его.",
      en: "Pigpen looks mysterious, but it is just simple substitution — frequency analysis breaks it too.",
    },
    exercises: [
      { task: decrypt, given: "SIR", glyphs: true, answer: "SIR", format: "letters" },
      { task: decrypt, given: "MAKTAB", glyphs: true, answer: "MAKTAB", format: "letters" },
      { task: decrypt, given: "XAKER", glyphs: true, answer: "XAKER", format: "letters" },
    ],
  },
  {
    id: "morse",
    era: "manual",
    title: { uz: "Morze alifbosi", kaa: "Morze álipbesi", ru: "Азбука Морзе", en: "Morse code" },
    when: { uz: "1838-yil", kaa: "1838-jıl", ru: "1838 г.", en: "1838" },
    level: 1,
    tagline: {
      uz: "Nuqta va tire — simdan, radio orqali, hatto chiroq bilan.",
      kaa: "Noqat hám tire — sımnan, radio arqalı, hátte shıraq penen.",
      ru: "Точки и тире — по проводу, по радио и даже фонарём.",
      en: "Dots and dashes — by wire, by radio, even by flashlight.",
    },
    story: {
      uz: "Semyuel Morze va Alfred Veyl telegraf uchun harflarni qisqa va uzun signallarga aylantirgan. Ko‘p uchraydigan harflarga eng qisqa kod berilgan: E — bitta nuqta, T — bitta tire.",
      kaa: "Semyuel Morze hám Alfred Veyl telegraf ushın háriplerdi qısqa hám uzın signallarǵa aylandırǵan. Kóp ushırasatuǵın háriplerge eń qısqa kod berilgen: E — bir noqat, T — bir tire.",
      ru: "Сэмюэл Морзе и Альфред Вейл превратили буквы в короткие и длинные сигналы для телеграфа. Самым частым буквам достались самые короткие коды: E — одна точка, T — одно тире.",
      en: "Samuel Morse and Alfred Vail turned letters into short and long signals for the telegraph. The most common letters got the shortest codes: E is one dot, T is one dash.",
    },
    how: {
      uz: "Harflar orasiga bo‘sh joy, so‘zlar orasiga « / » qo‘yiladi. Morze — **shifr emas, kodlash**: jadval hammaga ochiq, sirli kalit yo‘q.",
      kaa: "Háripler arasına bos orın, sózler arasına « / » qoyıladı. Morze — **shifr emes, kodlaw**: keste hámmege ashıq, sırlı gilt joq.",
      ru: "Между буквами — пробел, между словами — « / ». Морзе — **не шифр, а кодировка**: таблица открыта всем, секретного ключа нет.",
      en: "Letters are separated by a space, words by “ / ”. Morse is **an encoding, not a cipher**: the table is public and there is no secret key.",
    },
    fact: {
      uz: "SOS (··· ––– ···) hech narsaning qisqartmasi emas — u shunchaki oson eslab qolinadigan va adashtirib bo‘lmaydigan signal.",
      kaa: "SOS (··· ––– ···) hesh nárseniń qısqartpası emes — ol jay ǵana ańsat yadta qalatuǵın hám adastırıp bolmaytuǵın signal.",
      ru: "SOS (··· ––– ···) ничего не сокращает — это просто сигнал, который легко запомнить и невозможно спутать.",
      en: "SOS (··· ––– ···) doesn’t stand for anything — it is simply easy to remember and impossible to mistake.",
    },
    exercises: [
      { task: decrypt, given: morseEncode("SOS"), answer: "SOS", format: "letters" },
      { task: encrypt, given: "SALOM", answer: morseEncode("SALOM"), format: "morse" },
      { task: decrypt, given: morseEncode("ROOTY TEAM"), answer: "ROOTY TEAM", format: "letters" },
      {
        task: {
          uz: "Morze alifbosi nima?",
          kaa: "Morze álipbesi ne?",
          ru: "Что такое азбука Морзе?",
          en: "What is Morse code?",
        },
        answer: "1",
        format: "choice",
        options: [
          { uz: "Kalitli shifr", kaa: "Giltli shifr", ru: "Шифр с ключом", en: "A cipher with a key" },
          { uz: "Hammaga ochiq kodlash", kaa: "Hámmege ashıq kodlaw", ru: "Открытая всем кодировка", en: "A public encoding" },
          { uz: "Xeshlash usuli", kaa: "Xeshlew usılı", ru: "Способ хеширования", en: "A hashing method" },
        ],
      },
    ],
  },
  {
    id: "enigma",
    era: "machine",
    title: { uz: "Enigma mashinasi", kaa: "Enigma mashinası", ru: "Машина «Энигма»", en: "The Enigma machine" },
    when: { uz: "1939–1945", kaa: "1939–1945", ru: "1939–1945", en: "1939–1945" },
    level: 3,
    tagline: {
      uz: "Har bir tugma bosilganda shifr o‘zgaradi.",
      kaa: "Hár bir túyme basılǵanda shifr ózgeredi.",
      ru: "С каждым нажатием клавиши шифр меняется.",
      en: "The cipher changes with every key press.",
    },
    story: {
      uz: "Ikkinchi jahon urushida Germaniya armiyasi Enigma mashinasini buzib bo‘lmas deb hisoblagan. Polshalik matematiklar va keyin Bletchli-Parkda Alan Tyuring jamoasi uni ochib, urushni taxminan ikki yilga qisqartirgan, deb hisoblanadi.",
      kaa: "Ekinshi jáhán urısında Germaniya armiyası Enigma mashinasın buzıp bolmas dep esaplaǵan. Polshalı matematikler hám keyin Bletchli-Parkta Alan Tyuring komandası onı ashıp, urıstı shama menen eki jılǵa qısqartqan dep esaplanadı.",
      ru: "Во Второй мировой войне немецкая армия считала «Энигму» невзламываемой. Польские математики, а затем команда Алана Тьюринга в Блетчли-парке вскрыли её — считается, что это сократило войну примерно на два года.",
      en: "In World War II the German army believed Enigma was unbreakable. Polish mathematicians and then Alan Turing’s team at Bletchley Park broke it — shortening the war by about two years, historians estimate.",
    },
    how: {
      uz: "Har bosishda o‘ng rotor bir qadam aylanadi (ba’zan qo‘shnisini ham suradi). Tok uchta rotordan o‘tadi, reflektordan qaytadi va yana rotorlar orqali chiroqqa boradi. Kalit — rotorlarning boshlang‘ich holati (masalan, `AAA`).",
      kaa: "Hár basıwda oń rotor bir qádem aylanadı (geyde qońsısın da jılıstıradı). Tok úsh rotordan ótedi, reflektordan qaytadı hám qaytadan rotorlar arqalı shıraqqa baradı. Gilt — rotorlardıń baslanǵısh jaǵdayı (mısalı, `AAA`).",
      ru: "При каждом нажатии правый ротор поворачивается на шаг (иногда толкая соседа). Ток проходит три ротора, отражается от рефлектора и через роторы идёт к лампочке. Ключ — начальное положение роторов (например, `AAA`).",
      en: "Each key press turns the right rotor one step (sometimes nudging its neighbour). The current runs through three rotors, bounces off the reflector and back through the rotors to a lamp. The key is the rotors’ starting position (e.g. `AAA`).",
    },
    fact: {
      uz: "Reflektor tufayli Enigma hech qachon harfni o‘ziga aylantirmaydi. Aynan shu «kichik» xususiyat uni buzishga yordam bergan.",
      kaa: "Reflektor sebepli Enigma hesh qashan háripti ózine aylandırmaydı. Dál usı «kishkene» ózgeshelik onı buzıwǵa járdem bergen.",
      ru: "Из-за рефлектора «Энигма» никогда не шифрует букву в саму себя. Именно эта «мелочь» помогла её взломать.",
      en: "Because of the reflector, Enigma never encrypts a letter as itself. That “small” detail helped break it.",
    },
    exercises: [
      {
        task: { uz: "Boshlanish: ROT. Shifrni oching", kaa: "Baslanıw: ROT. Shifrdi ashıń", ru: "Начало: ROT. Расшифруйте", en: "Start: ROT. Decrypt" },
        given: enigma("SALOM DUNYO", "ROT"),
        key: "ROT",
        answer: "SALOM DUNYO",
        format: "letters",
        hint: {
          uz: "Enigma o‘zini o‘zi ochadi: rotorlarni ROT ga qo‘ying va shifrlangan matnni tering.",
          kaa: "Enigma ózin ózi ashadı: rotorlardı ROT qa qoyıń hám shifrlanǵan tekstti teriń.",
          ru: "«Энигма» сама себя расшифровывает: поставьте роторы на ROT и наберите шифротекст.",
          en: "Enigma undoes itself: set the rotors to ROT and type the ciphertext.",
        },
      },
      {
        task: { uz: "Boshlanish: AAA. Shifrlang", kaa: "Baslanıw: AAA. Shifrlań", ru: "Начало: AAA. Зашифруйте", en: "Start: AAA. Encrypt" },
        given: "HACKER",
        key: "AAA",
        answer: enigma("HACKER", "AAA"),
        format: "letters",
      },
      {
        task: {
          uz: "Enigmada A harfi shifrlanganda A bo‘lib qolishi mumkinmi?",
          kaa: "Enigmada A háribi shifrlanǵanda A bolıp qalıwı múmkin be?",
          ru: "Может ли в «Энигме» буква A зашифроваться в A?",
          en: "Can Enigma ever encrypt A as A?",
        },
        answer: "1",
        format: "choice",
        options: [
          { uz: "Ha, ba’zan", kaa: "Awa, geyde", ru: "Да, иногда", en: "Yes, sometimes" },
          { uz: "Yo‘q, hech qachon", kaa: "Yaq, hesh qashan", ru: "Нет, никогда", en: "No, never" },
        ],
      },
    ],
  },
];

// Timeline order comes from cipherIds; notes add the steps and weak spots.
const all = [...classic, ...modernCiphers];
export const ciphers: Cipher[] = cipherIds.map((id) => ({ ...all.find((c) => c.id === id)!, ...cipherNotes[id] }));

export function getCipher(id: string) {
  return ciphers.find((cipher) => cipher.id === id);
}

/** Letters ignore case, spaces and punctuation; Morse ignores dash style. */
export function isRightAnswer(exercise: Exercise, given: string) {
  switch (exercise.format) {
    case "morse":
      return normalizeMorse(given) !== "" && normalizeMorse(given) === normalizeMorse(exercise.answer);
    case "digits":
      return given.replace(/\D/g, "") !== "" && given.replace(/\D/g, "") === exercise.answer.replace(/\D/g, "");
    case "code": {
      const tidy = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
      return tidy(given) !== "" && tidy(given) === tidy(exercise.answer);
    }
    case "choice":
      return given === exercise.answer;
    default:
      return lettersOnly(given) !== "" && lettersOnly(given) === lettersOnly(exercise.answer);
  }
}
