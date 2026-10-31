import api from "@/lib/api";

// AI yordamchi backend orqali ishlaydi (/api/assistant): Google kaliti faqat serverda turadi
// va brauzerga hech qachon yuborilmaydi.

export interface AssistantMessage {
  role: "user" | "model";
  text: string;
}

export async function fetchAssistantEnabled(token: string | null): Promise<boolean> {
  const res = await api.get<{ enabled: boolean }>("/api/assistant/status", token);
  return res.enabled;
}

export async function askGeminiAssistant(messages: AssistantMessage[], learningContext: string, token: string | null) {
  const res = await api.post<{ text: string }>("/api/assistant", { messages, context: learningContext }, token);
  return res.text;
}
