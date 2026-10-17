// Wählt die KI für die Anrufer: Google Gemini (Standard) oder Ollama (lokal, optional).
import * as ollama from './ollama.js';
import * as gemini from './gemini.js';

export const isGemini = (S) => S.provider !== 'ollama';
export const providerName = (S) => (isGemini(S) ? 'Gemini' : 'Ollama');
export const providerIcon = (S) => (isGemini(S) ? '✨' : '🦙');

export function listModels(S) {
  return isGemini(S) ? gemini.listModels(S.geminiKey) : ollama.listModels(S.base);
}

export function chatJSON(S, model, messages, opts = {}) {
  return isGemini(S) ? gemini.chatJSON(S.geminiKey, model, messages, opts) : ollama.chatJSON(S.base, model, messages, opts);
}

export function warmUp(S, model) {
  if (!isGemini(S)) ollama.warmUp(S.base, model); // Gemini braucht kein Vorladen
}

export const defaultModel = (S, models) => (isGemini(S) ? gemini.defaultModel(models) : '');
