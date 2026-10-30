export interface AssistantMessage {
  role: "user" | "model";
  text: string;
}

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
}

const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;

export function hasGeminiApiKey() {
  return Boolean(GEMINI_API_KEY);
}

export async function askGeminiAssistant(messages: AssistantMessage[], learningContext: string) {
  if (!GEMINI_API_KEY) {
    throw new Error("Google AI Studio API key topilmadi. .env fayliga VITE_GOOGLE_AI_API_KEY qiymatini kiriting.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: [
                "Siz CyberAl Platform ichidagi AI yordamchisiz.",
                "Javoblarni o'zbek tilida, qisqa va amaliy yozing.",
                "Kiberxavfsizlik bo'yicha ta'lim, tushuntirish, mudofaa choralari, laboratoriya fikrlashi va o'quv rejasiga yordam bering.",
                "Zararli ekspluatatsiya, ruxsatsiz buzib kirish, credential o'g'irlash yoki zararli kod bo'yicha bosqichma-bosqich ko'rsatma bermang.",
                "Agar savol xavfli bo'lsa, uni himoyaviy va etik o'quv yo'nalishiga burib javob bering.",
                learningContext,
              ].join("\n"),
            },
          ],
        },
        contents: messages.map((message) => ({
          role: message.role,
          parts: [{ text: message.text }],
        })),
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
          maxOutputTokens: 700,
        },
      }),
    },
  );

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini API javob qaytarishda xatolik yuz berdi.");
  }

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();

  if (!text) {
    throw new Error("Gemini bo'sh javob qaytardi.");
  }

  return text;
}
