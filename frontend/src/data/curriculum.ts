// Ta'lim tuzilmasi: Yo'nalish → Modullar → (Nazariya, O'qituvchi topshiriqlari, CTF).
// Modul ID'lari backend'dagi modullar bilan mos (1..4).

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
}

export interface ModuleContent {
  id: number;
  title: string;
  summary: string;
  content: string;
  concepts: string[];
}

export interface Direction {
  id: string;
  title: string;
  summary: string;
  description: string;
  outcomes: string[];
  moduleIds: number[];
  /** Savollar va to'g'ri javoblar faqat serverda (GET /api/diagnostic) — bu yerda faqat tavsif */
  diagnostic: {
    title: string;
    description: string;
    questionCount: number;
  };
}

export const MODULE_PASSING_SCORE = 0.7;

export const modules: Record<number, ModuleContent> = {
  1: {
    id: 1,
    title: "Kiberxavfsizlik asoslari",
    summary: "CIA triadasi, tahdidlarni modellashtirish va himoya qatlamlari.",
    content:
      "Kiberxavfsizlik tizimlar, tarmoqlar va ilovalarni raqamli hujumlardan himoya qilish amaliyotidir.\n\nCIA triadasi — maxfiylik, butunlik va mavjudlik — barcha xavfsizlik tamoyillarining asosini tashkil etadi. Maxfiylik faqat ruxsat etilgan tomonlarga ma'lumotga kirishga imkon beradi. Butunlik ma'lumotning o'zgartirilmaganini ta'minlaydi. Mavjudlik esa tizimlarning kerak paytda ishlashini kafolatlaydi.\n\nOdatiy tahdidlar: zararli dasturlar, phishing, ijtimoiy muhandislik va xizmatni rad etish (DoS) hujumlari.",
    concepts: ["CIA triadasi", "Tahdidlarni modellashtirish", "Hujum vektorlari", "Chuqur himoya qatlamlari"],
  },
  2: {
    id: 2,
    title: "Tarmoq xavfsizligi",
    summary: "MitM, DDoS va paket ushlash hujumlarini aniqlash hamda ularga qarshi turish.",
    content:
      "Tarmoq xavfsizligi tarmoq va undagi ma'lumotlarning yaxlitligi hamda mavjudligini himoya qiladi.\n\nKeng tarqalgan tahdidlar: Man-in-the-Middle (MitM), DDoS, paket ushlash va portlarni skanerlash.\n\nAsosiy himoya vositalari: firewall, IDS/IPS tizimlari va VPN.",
    concepts: ["Firewall", "IDS/IPS", "VPN", "DDoS himoyasi"],
  },
  3: {
    id: 3,
    title: "Kriptografiya",
    summary: "Simmetrik va asimmetrik shifrlash, hash algoritmlari orqali xavfsiz aloqa.",
    content:
      "Kriptografiya — xavfsiz aloqa haqidagi fan.\n\nSimmetrik shifrlash (AES) bitta kalit bilan ishlaydi. Asimmetrik shifrlash (RSA) ochiq va maxfiy kalitlar juftligidan foydalanadi. Hash funksiyalari (SHA-256) belgilangan uzunlikdagi «barmoq izi»ni yaratadi.\n\nTLS/SSL protokollari veb aloqani himoyalaydi.",
    concepts: ["AES shifrlash", "RSA algoritmi", "Hash funksiyalari", "TLS/SSL"],
  },
  4: {
    id: 4,
    title: "Tizim himoyasi",
    summary: "Endpoint xavfsizligi, kirish nazorati, MFA va SIEM monitoring.",
    content:
      "Tizim himoyasi endpoint xavfsizligi, yangilanishlarni boshqarish va kirish nazoratini qamrab oladi.\n\nMinimal huquq tamoyili ruxsatlarni cheklaydi. Ko'p faktorli autentifikatsiya (MFA) qo'shimcha himoya qatlamini beradi. Muntazam yangilanishlar ma'lum zaifliklarni yopadi.\n\nSIEM tizimlari voqealarni markazlashgan holda kuzatish imkonini beradi.",
    concepts: ["Minimal huquq", "Yangilanishlarni boshqarish", "MFA", "SIEM"],
  },
};

export const directions: Direction[] = [
  {
    id: "kiberxavfsizlik",
    title: "Kiberxavfsizlik",
    summary: "Asoslardan tizim himoyasigacha — 4 ta bosqichma-bosqich modul.",
    description:
      "Axborot xavfsizligining asosiy tamoyillari, tarmoq hujumlari, kriptografiya va tizimlarni himoyalash. Har bir modulda nazariya, o'qituvchi topshiriqlari va amaliy CTF mashqlari bor.",
    outcomes: [
      "Tahdid va zaifliklarni farqlay olish",
      "Tarmoq hujumlarini aniqlash va oldini olish",
      "Shifrlash algoritmlarini to'g'ri qo'llash",
      "Tizimlarni xavfsiz sozlash",
    ],
    moduleIds: [1, 2, 3, 4],
    diagnostic: {
      title: "Diagnostika testi",
      description:
        "8 ta savoldan iborat qisqa test. Natija asosida fuzzy (ANFIS) tizimi darajangizni aniqlaydi va mos modullarni ochadi. Testni istalgan vaqtda qayta topshirishingiz mumkin.",
      questionCount: 8,
    },
  },
];

export const getDirection = (id: string | undefined) => directions.find((d) => d.id === id);

export const getDirectionByModule = (moduleId: number) =>
  directions.find((d) => d.moduleIds.includes(moduleId));

export const moduleCode = (id: number) => `M-${id.toString().padStart(2, "0")}`;
