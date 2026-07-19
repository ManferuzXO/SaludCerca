export type TriageReply = {
  level: "emergency" | "priority" | "general";
  title: string;
  text: string;
  action: "call-emergency" | "find-center";
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function createTriageReply(message: string): TriageReply {
  const text = normalize(message);
  const emergency = includesAny(text, [
    "dolor fuerte en el pecho",
    "dolor en el pecho",
    "dificultad para respirar",
    "no puedo respirar",
    "me falta el aire",
    "inconsciente",
    "perdio el conocimiento",
    "desmayo",
    "convulsion",
    "sangrado abundante",
    "hemorragia",
    "cara torcida",
    "no puede hablar",
    "debilidad de un lado",
    "embarazada y sangrado",
    "quiero hacerme dano",
    "suicid",
  ]);

  if (emergency) {
    return {
      level: "emergency",
      title: "Podría ser una emergencia",
      text: "No esperes una respuesta del chat ni intentes resolverlo aquí. Llama a Auxilio La Paz 167 o acude al servicio de emergencias más cercano ahora.",
      action: "call-emergency",
    };
  }

  const priority = includesAny(text, [
    "fiebre alta",
    "vomito persistente",
    "diarrea intensa",
    "dolor intenso",
    "herida",
    "golpe fuerte",
    "embarazada",
    "bebe",
    "recien nacido",
    "nino con fiebre",
  ]);

  if (priority) {
    return {
      level: "priority",
      title: "Busca valoración médica hoy",
      text: "Por lo que describes, es recomendable que un profesional te evalúe hoy. SaludCerca puede ordenar los centros verificados desde el más cercano a tu ubicación.",
      action: "find-center",
    };
  }

  return {
    level: "general",
    title: "Orientación inicial",
    text: "No puedo diagnosticar ni indicar tratamientos. Para una consulta no urgente, busca el centro más cercano y agenda una ficha. Si los síntomas empeoran o aparece una señal de alarma, llama al 167.",
    action: "find-center",
  };
}
