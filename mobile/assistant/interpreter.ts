import knowledgeBase from "./knowledgeBase.json";

export function interpretCommand(text: string) {
  const lower = text.toLowerCase();

  for (const key in knowledgeBase) {
    const entry = knowledgeBase[key];
    if (entry.phrases.some((p) => lower.includes(p))) {
      return entry.action;
    }
  }

  return null;
}