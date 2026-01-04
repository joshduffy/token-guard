export interface TokenGuardOptions {
  budget?: number;
  costLimit?: number;
  model?: string;
  warnPercent: number;
  quiet: boolean;
  output?: string;
}

export interface ModelPricing {
  input: number;  // per 1M tokens
  output: number; // per 1M tokens
}

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
  startTime: Date;
  endTime?: Date;
  command: string;
  budgetExceeded: boolean;
  costExceeded: boolean;
}

export interface Config {
  defaultBudget?: number;
  defaultCostLimit?: number;
  warnPercent: number;
  models: Record<string, ModelPricing>;
}
