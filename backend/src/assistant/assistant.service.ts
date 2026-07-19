import { Injectable, Logger } from '@nestjs/common';
import { createSaludCercaSystemPrompt } from './saludcerca.prompt';

type AssistantLevel = 'emergency' | 'priority' | 'general';

type AssistantResponse = {
  level: AssistantLevel;
  reply: string;
  action: 'call-emergency' | 'find-center';
  generated: boolean;
};

type GeminiContentResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  async chat(message: string): Promise<AssistantResponse> {
    const level = this.classify(message);

    // Una alarma clínica nunca depende de que Azure responda o no.
    if (level === 'emergency') {
      return {
        level,
        reply:
          'Podría ser una emergencia. No esperes una respuesta del chat: llama ahora a Auxilio La Paz 167 o acude al servicio de emergencias más cercano.',
        action: 'call-emergency',
        generated: false,
      };
    }

    const generatedReply = await this.askGenerativeModel(message, level);
    if (generatedReply) {
      return {
        level,
        reply: generatedReply,
        action: 'find-center',
        generated: true,
      };
    }

    return {
      level,
      reply:
        level === 'priority'
          ? 'Por lo que describes, conviene que un profesional te evalúe hoy. Busca el centro de salud municipal verificado más cercano. Si aparece dolor en el pecho, dificultad para respirar, desmayo, sangrado abundante u otra señal de alarma, llama al 167.'
          : 'Puedo orientarte para encontrar atención, pero no diagnostico ni indico tratamientos. Revisa los centros municipales cercanos y solicita una ficha. Si los síntomas empeoran o aparece una señal de alarma, llama al 167.',
      action: 'find-center',
      generated: false,
    };
  }

  async transcribeAudio(audio: Buffer, contentType: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_AUDIO_MODEL ?? 'gemini-3.5-flash';
    if (!apiKey) return { text: '', available: false };

    const mimeType = contentType.split(';')[0] || 'audio/webm';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: 'Transcribe únicamente las palabras dichas en este audio en español. No añadas explicaciones, diagnóstico ni formato.' },
              { inlineData: { mimeType, data: audio.toString('base64') } },
            ],
          }],
          generationConfig: { maxOutputTokens: 500, thinkingConfig: { thinkingLevel: 'minimal' } },
          store: false,
        }),
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        this.logger.warn(`Gemini no pudo transcribir audio: ${response.status} ${detail}`);
        return { text: '', available: false };
      }

      const text = this.readGeminiText((await response.json()) as GeminiContentResponse);
      return { text: text ?? '', available: Boolean(text) };
    } catch {
      this.logger.warn('No se pudo conectar con Gemini para transcribir audio.');
      return { text: '', available: false };
    }
  }

  async synthesizeSpeech(text: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_TTS_MODEL ?? 'gemini-2.5-flash-preview-tts';
    if (!apiKey) return { audio: '', mimeType: 'audio/wav', available: false };

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
          'Api-Revision': '2026-05-20',
        },
        body: JSON.stringify({
          model,
          input: `Lee el siguiente texto en español, con voz clara, serena y cercana. No leas instrucciones ni agregues palabras: ${text}`,
          response_format: { type: 'audio' },
          generation_config: { speech_config: [{ voice: 'Kore' }] },
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Gemini no pudo generar voz: ${response.status}`);
        return { audio: '', mimeType: 'audio/wav', available: false };
      }

      const body = (await response.json()) as {
        steps?: Array<{ content?: Array<{ type?: string; data?: string; sample_rate?: number }> }>;
      };
      const audio = body.steps?.flatMap((step) => step.content ?? [])
        .find((content) => content.type === 'audio' && content.data);
      if (!audio?.data) return { audio: '', mimeType: 'audio/wav', available: false };

      const wav = this.pcmToWav(Buffer.from(audio.data, 'base64'), audio.sample_rate ?? 24000);
      return { audio: wav.toString('base64'), mimeType: 'audio/wav', available: true };
    } catch {
      this.logger.warn('No se pudo conectar con Gemini para generar voz.');
      return { audio: '', mimeType: 'audio/wav', available: false };
    }
  }

  private classify(message: string): AssistantLevel {
    const text = normalize(message);
    if (
      includesAny(text, [
        'dolor fuerte en el pecho',
        'dolor en el pecho',
        'dificultad para respirar',
        'no puedo respirar',
        'me falta el aire',
        'inconsciente',
        'perdio el conocimiento',
        'desmayo',
        'convulsion',
        'sangrado abundante',
        'hemorragia',
        'cara torcida',
        'no puede hablar',
        'debilidad de un lado',
        'embarazada y sangrado',
        'quiero hacerme dano',
        'suicid',
      ])
    ) {
      return 'emergency';
    }

    if (
      includesAny(text, [
        'fiebre alta',
        'vomito persistente',
        'diarrea intensa',
        'dolor intenso',
        'herida',
        'golpe fuerte',
        'embarazada',
        'bebe',
        'recien nacido',
        'nino con fiebre',
      ])
    ) {
      return 'priority';
    }

    return 'general';
  }

  private async askGenerativeModel(message: string, level: Exclude<AssistantLevel, 'emergency'>) {
    const provider = process.env.AI_PROVIDER?.toLowerCase();
    if (provider === 'gemini') return this.askGemini(message, level);
    if (provider === 'azure') return this.askAzure(message, level);
    return null;
  }

  private async askGemini(message: string, level: Exclude<AssistantLevel, 'emergency'>) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_CHAT_MODEL ?? 'gemini-3.1-flash-lite';
    if (!apiKey) return null;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: createSaludCercaSystemPrompt(level) }] },
          contents: [{ role: 'user', parts: [{ text: message }] }],
          generationConfig: {
            temperature: 0.2,
            // Gemini 3.5 puede usar parte de este presupuesto para razonamiento interno.
            // Dejamos margen suficiente para que no corte una orientación breve.
            maxOutputTokens: 800,
            thinkingConfig: { thinkingLevel: 'minimal' },
          },
          store: false,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Gemini no respondió correctamente: ${response.status}`);
        return null;
      }

      const content = this.readGeminiText((await response.json()) as GeminiContentResponse);
      return content ? content.slice(0, 1400) : null;
    } catch {
      this.logger.warn('No se pudo conectar con Gemini. Se usará orientación segura local.');
      return null;
    }
  }

  private async askAzure(message: string, level: Exclude<AssistantLevel, 'emergency'>) {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, '');
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2024-10-21';

    if (!endpoint || !apiKey || !deployment) return null;

    const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
    const system = createSaludCercaSystemPrompt(level);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: message },
          ],
          temperature: 0.2,
          max_tokens: 220,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Azure OpenAI no respondió correctamente: ${response.status}`);
        return null;
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const content = body.choices?.[0]?.message?.content?.trim();
      return content ? content.slice(0, 1400) : null;
    } catch (error) {
      this.logger.warn('No se pudo conectar con Azure OpenAI. Se usará orientación segura local.');
      return null;
    }
  }

  private readGeminiText(body: GeminiContentResponse) {
    const content = body.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();
    return content || null;
  }

  private pcmToWav(pcm: Buffer, sampleRate: number) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([header, pcm]);
  }
}
