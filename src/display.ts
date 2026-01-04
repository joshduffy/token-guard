import type { UsageStats, TokenGuardOptions } from './types.js';
import { formatTokens } from './tokenizer.js';

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
};

export function clearLine(): void {
  process.stderr.write('\x1b[2K\x1b[G');
}

export function moveCursorUp(lines: number): void {
  process.stderr.write(`\x1b[${lines}A`);
}

export function progressBar(current: number, max: number, width: number = 20): string {
  const percent = Math.min(current / max, 1);
  const filled = Math.round(width * percent);
  const empty = width - filled;

  let color = COLORS.green;
  if (percent >= 0.9) color = COLORS.red;
  else if (percent >= 0.8) color = COLORS.yellow;

  return `${color}${'█'.repeat(filled)}${COLORS.dim}${'░'.repeat(empty)}${COLORS.reset}`;
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

export function renderStatus(
  stats: UsageStats,
  options: TokenGuardOptions,
  inline: boolean = true
): string {
  const { budget, costLimit, warnPercent } = options;
  const { inputTokens, outputTokens, totalTokens, estimatedCost, model } = stats;

  if (options.quiet) {
    return '';
  }

  const lines: string[] = [];

  if (inline) {
    // Compact inline display
    let status = `${COLORS.cyan}◆${COLORS.reset} `;
    status += `${COLORS.bold}${formatTokens(totalTokens)}${COLORS.reset} tokens `;
    status += `${COLORS.dim}(in:${formatTokens(inputTokens)} out:${formatTokens(outputTokens)})${COLORS.reset} `;
    status += `${COLORS.green}${formatCost(estimatedCost)}${COLORS.reset} `;

    if (budget) {
      const percent = (totalTokens / budget) * 100;
      if (percent >= 100) {
        status += `${COLORS.bgRed}${COLORS.white} BUDGET EXCEEDED ${COLORS.reset}`;
      } else if (percent >= warnPercent) {
        status += `${COLORS.yellow}⚠ ${percent.toFixed(0)}% of budget${COLORS.reset}`;
      }
    }

    if (costLimit) {
      const percent = (estimatedCost / costLimit) * 100;
      if (percent >= 100) {
        status += `${COLORS.bgRed}${COLORS.white} COST LIMIT EXCEEDED ${COLORS.reset}`;
      } else if (percent >= warnPercent) {
        status += `${COLORS.yellow}⚠ ${percent.toFixed(0)}% of cost limit${COLORS.reset}`;
      }
    }

    return status;
  }

  // Box display
  const width = 47;
  const border = '─'.repeat(width - 2);

  lines.push(`${COLORS.dim}┌${border}┐${COLORS.reset}`);
  lines.push(`${COLORS.dim}│${COLORS.reset}  ${COLORS.bold}${COLORS.cyan}token-guard${COLORS.reset} v0.1.0${' '.repeat(width - 24)}${COLORS.dim}│${COLORS.reset}`);

  if (budget) {
    const budgetLine = `  Budget: ${formatTokens(budget)} tokens | Warn: ${warnPercent}%`;
    lines.push(`${COLORS.dim}│${COLORS.reset}${budgetLine}${' '.repeat(width - budgetLine.length - 2)}${COLORS.dim}│${COLORS.reset}`);
  }

  lines.push(`${COLORS.dim}├${border}┤${COLORS.reset}`);

  // Progress bar
  if (budget) {
    const bar = progressBar(totalTokens, budget, 20);
    const counts = `${formatTokens(totalTokens)} / ${formatTokens(budget)}`;
    lines.push(`${COLORS.dim}│${COLORS.reset}  ${bar}  ${counts}${' '.repeat(width - 30 - counts.length)}${COLORS.dim}│${COLORS.reset}`);
  }

  // Token breakdown
  const breakdown = `  Input: ${formatTokens(inputTokens)} | Output: ${formatTokens(outputTokens)}`;
  lines.push(`${COLORS.dim}│${COLORS.reset}${breakdown}${' '.repeat(width - breakdown.length - 2)}${COLORS.dim}│${COLORS.reset}`);

  // Cost
  const costLine = `  Est. Cost: ${formatCost(estimatedCost)} (${model})`;
  lines.push(`${COLORS.dim}│${COLORS.reset}${costLine}${' '.repeat(width - costLine.length - 2)}${COLORS.dim}│${COLORS.reset}`);

  lines.push(`${COLORS.dim}└${border}┘${COLORS.reset}`);

  return lines.join('\n');
}

export function renderFinalReport(stats: UsageStats, options: TokenGuardOptions): string {
  const lines: string[] = [];
  const duration = stats.endTime
    ? ((stats.endTime.getTime() - stats.startTime.getTime()) / 1000).toFixed(1)
    : '?';

  lines.push('');
  lines.push(`${COLORS.bold}${COLORS.cyan}═══ token-guard Report ═══${COLORS.reset}`);
  lines.push('');
  lines.push(`${COLORS.bold}Command:${COLORS.reset} ${stats.command}`);
  lines.push(`${COLORS.bold}Model:${COLORS.reset}   ${stats.model}`);
  lines.push(`${COLORS.bold}Duration:${COLORS.reset} ${duration}s`);
  lines.push('');
  lines.push(`${COLORS.bold}Tokens:${COLORS.reset}`);
  lines.push(`  Input:  ${formatTokens(stats.inputTokens).padStart(10)}`);
  lines.push(`  Output: ${formatTokens(stats.outputTokens).padStart(10)}`);
  lines.push(`  Total:  ${formatTokens(stats.totalTokens).padStart(10)}`);
  lines.push('');
  lines.push(`${COLORS.bold}Estimated Cost:${COLORS.reset} ${COLORS.green}${formatCost(stats.estimatedCost)}${COLORS.reset}`);

  if (stats.budgetExceeded) {
    lines.push('');
    lines.push(`${COLORS.bgRed}${COLORS.white} BUDGET EXCEEDED - Process terminated ${COLORS.reset}`);
  }

  if (stats.costExceeded) {
    lines.push('');
    lines.push(`${COLORS.bgRed}${COLORS.white} COST LIMIT EXCEEDED - Process terminated ${COLORS.reset}`);
  }

  lines.push('');

  return lines.join('\n');
}

export function warn(message: string): void {
  console.error(`${COLORS.yellow}⚠ token-guard:${COLORS.reset} ${message}`);
}

export function error(message: string): void {
  console.error(`${COLORS.red}✖ token-guard:${COLORS.reset} ${message}`);
}
