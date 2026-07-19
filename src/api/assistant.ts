import { API_URL } from "./base";

export type AssistantReply = {
  level: "emergency" | "priority" | "general";
  reply: string;
  action: "call-emergency" | "find-center";
  generated: boolean;
};

export async function chatWithAssistant(message: string): Promise<AssistantReply> {
  const response = await fetch(`${API_URL}/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) throw new Error("No se pudo contactar al asistente.");
  return response.json();
}

export async function transcribeAssistantAudio(audio: Blob, filename: string): Promise<{ text: string; available: boolean }> {
  const form = new FormData();
  form.append("audio", audio, filename);
  const response = await fetch(`${API_URL}/assistant/transcribe`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) throw new Error("No se pudo transcribir el audio.");
  return response.json();
}

export async function synthesizeAssistantSpeech(text: string): Promise<{ audio: string; mimeType: string; available: boolean }> {
  const response = await fetch(`${API_URL}/assistant/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error("No se pudo generar la voz.");
  return response.json();
}
