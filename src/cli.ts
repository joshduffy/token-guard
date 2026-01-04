#!/usr/bin/env node

import { loadConfig } from './config.js';
import { TokenMonitor } from './monitor.js';
import type { TokenGuardOptions } from './types.js';

const VERSION = '0.1.0';

const HELP = `
token-guard v${VERSION}
Monitor and limit token usage for AI coding assistants

USAGE:
  token-guard [options] -- <command>

OPTIONS:
  -b, --budget <tokens>     Maximum tokens allowed (default: unlimited)
  -c, --cost-limit <usd>    Maximum cost in USD (default: unlimited)
  -m, --model <name>        Model for pricing (default: auto-detect)
  -w, --warn <percent>      Warn at percentage of budget (default: 80)
  -q, --quiet               Only show warnings and errors
  -o, --output <file>       Save usage report to JSON file
  -h, --help                Show this help message
  -v, --version             Show version

EXAMPLES:
  token-guard -- claude "refactor the auth module"
  token-guard -b 50000 -- aider --message "add tests"
  token-guard -c 0.50 -- claude "explain this codebase"
  token-guard -b 100000 -w 50 -o report.json -- claude "review PR"

CONFIGURATION:
  Create ~/.token-guard.json for persistent settings:
  {
    "defaultBudget": 50000,
    "warnPercent": 80,
    "models": {
      "custom-model": { "input": 5.00, "output": 15.00 }
    }
  }

`;

function parseArgs(args: string[]): { options: TokenGuardOptions; command: string[] } {
  const config = loadConfig();

  const options: TokenGuardOptions = {
    budget: config.defaultBudget,
    costLimit: config.defaultCostLimit,
    warnPercent: config.warnPercent,
    quiet: false,
  };

  const command: string[] = [];
  let i = 0;
  let foundSeparator = false;

  while (i < args.length) {
    const arg = args[i];

    if (foundSeparator) {
      command.push(arg);
      i++;
      continue;
    }

    if (arg === '--') {
      foundSeparator = true;
      i++;
      continue;
    }

    switch (arg) {
      case '-h':
      case '--help':
        console.log(HELP);
        process.exit(0);
        break;

      case '-v':
      case '--version':
        console.log(`token-guard v${VERSION}`);
        process.exit(0);
        break;

      case '-b':
      case '--budget':
        options.budget = parseInt(args[++i], 10);
        if (isNaN(options.budget)) {
          console.error('Error: --budget requires a number');
          process.exit(1);
        }
        break;

      case '-c':
      case '--cost-limit':
        options.costLimit = parseFloat(args[++i]);
        if (isNaN(options.costLimit)) {
          console.error('Error: --cost-limit requires a number');
          process.exit(1);
        }
        break;

      case '-m':
      case '--model':
        options.model = args[++i];
        break;

      case '-w':
      case '--warn':
        options.warnPercent = parseInt(args[++i], 10);
        if (isNaN(options.warnPercent)) {
          console.error('Error: --warn requires a number');
          process.exit(1);
        }
        break;

      case '-q':
      case '--quiet':
        options.quiet = true;
        break;

      case '-o':
      case '--output':
        options.output = args[++i];
        break;

      default:
        // If we hit an unknown arg before --, treat rest as command
        command.push(arg);
        foundSeparator = true;
        break;
    }

    i++;
  }

  return { options, command };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const { options, command } = parseArgs(args);

  if (command.length === 0) {
    console.error('Error: No command specified');
    console.error('Usage: token-guard [options] -- <command>');
    process.exit(1);
  }

  const monitor = new TokenMonitor(command.join(' '), options);
  const exitCode = await monitor.run(command);

  process.exit(exitCode);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
