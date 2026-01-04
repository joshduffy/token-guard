import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Config } from './types.js';
import { MODEL_PRICING } from './pricing.js';

const CONFIG_FILENAME = '.token-guard.json';

const DEFAULT_CONFIG: Config = {
  warnPercent: 80,
  models: MODEL_PRICING,
};

export function loadConfig(): Config {
  const configPaths = [
    join(process.cwd(), CONFIG_FILENAME),
    join(homedir(), CONFIG_FILENAME),
  ];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf-8');
        const userConfig = JSON.parse(content);
        return {
          ...DEFAULT_CONFIG,
          ...userConfig,
          models: {
            ...DEFAULT_CONFIG.models,
            ...userConfig.models,
          },
        };
      } catch {
        // Ignore invalid config files
      }
    }
  }

  return DEFAULT_CONFIG;
}

export function getConfigPath(): string {
  return join(homedir(), CONFIG_FILENAME);
}
