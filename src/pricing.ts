import type { ModelPricing } from './types.js';

// Pricing per 1M tokens (as of Jan 2026)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude models
  'claude-opus-4-5': { input: 15.00, output: 75.00 },
  'claude-opus-4': { input: 15.00, output: 75.00 },
  'claude-sonnet-4': { input: 3.00, output: 15.00 },
  'claude-3-opus': { input: 15.00, output: 75.00 },
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },

  // OpenAI models
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'o1': { input: 15.00, output: 60.00 },
  'o1-mini': { input: 3.00, output: 12.00 },

  // Default fallback (sonnet-level pricing)
  'default': { input: 3.00, output: 15.00 },
};

export function getPricing(model: string): ModelPricing {
  const normalizedModel = model.toLowerCase().replace(/[_-]/g, '-');

  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (normalizedModel.includes(key.replace(/[_-]/g, '-'))) {
      return pricing;
    }
  }

  return MODEL_PRICING['default'];
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const pricing = getPricing(model);
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

export function detectModel(command: string): string {
  const lowerCommand = command.toLowerCase();

  if (lowerCommand.includes('claude')) {
    if (lowerCommand.includes('opus')) return 'claude-opus-4';
    if (lowerCommand.includes('haiku')) return 'claude-3-haiku';
    return 'claude-sonnet-4'; // default for claude commands
  }

  if (lowerCommand.includes('aider')) {
    // Aider defaults vary, assume sonnet
    return 'claude-sonnet-4';
  }

  if (lowerCommand.includes('gpt-4')) return 'gpt-4o';
  if (lowerCommand.includes('openai')) return 'gpt-4o';

  return 'default';
}
