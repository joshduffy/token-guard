import { spawn, type ChildProcess } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import type { TokenGuardOptions, UsageStats } from './types.js';
import { countTokens } from './tokenizer.js';
import { calculateCost, detectModel } from './pricing.js';
import { renderStatus, renderFinalReport, clearLine, warn, error } from './display.js';

export class TokenMonitor {
  private stats: UsageStats;
  private options: TokenGuardOptions;
  private process: ChildProcess | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastStatusLength = 0;

  constructor(command: string, options: TokenGuardOptions) {
    const model = options.model || detectModel(command);

    this.options = options;
    this.stats = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      model,
      startTime: new Date(),
      command,
      budgetExceeded: false,
      costExceeded: false,
    };
  }

  async run(args: string[]): Promise<number> {
    return new Promise((resolve) => {
      const [cmd, ...cmdArgs] = args;

      this.process = spawn(cmd, cmdArgs, {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true,
      });

      // Track input (what we send to the process)
      // For now, we count the command itself as input
      this.addInputTokens(args.join(' '));

      // Track stdout
      this.process.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.addOutputTokens(text);
        process.stdout.write(data);
        this.checkLimits();
      });

      // Track stderr
      this.process.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.addOutputTokens(text);
        process.stderr.write(data);
        this.checkLimits();
      });

      // Periodic status update
      if (!this.options.quiet) {
        this.updateInterval = setInterval(() => {
          this.showStatus();
        }, 1000);
      }

      this.process.on('close', (code) => {
        this.cleanup();
        this.stats.endTime = new Date();

        if (!this.options.quiet) {
          console.error(renderFinalReport(this.stats, this.options));
        }

        if (this.options.output) {
          this.saveReport();
        }

        resolve(code ?? 0);
      });

      this.process.on('error', (err) => {
        this.cleanup();
        error(`Failed to start command: ${err.message}`);
        resolve(1);
      });
    });
  }

  private addInputTokens(text: string): void {
    const tokens = countTokens(text);
    this.stats.inputTokens += tokens;
    this.updateTotals();
  }

  private addOutputTokens(text: string): void {
    const tokens = countTokens(text);
    this.stats.outputTokens += tokens;
    this.updateTotals();
  }

  private updateTotals(): void {
    this.stats.totalTokens = this.stats.inputTokens + this.stats.outputTokens;
    this.stats.estimatedCost = calculateCost(
      this.stats.inputTokens,
      this.stats.outputTokens,
      this.stats.model
    );
  }

  private checkLimits(): void {
    const { budget, costLimit, warnPercent } = this.options;

    // Check token budget
    if (budget) {
      const percent = (this.stats.totalTokens / budget) * 100;

      if (percent >= 100) {
        this.stats.budgetExceeded = true;
        this.terminate('Token budget exceeded');
        return;
      }

      if (percent >= warnPercent && percent < warnPercent + 5) {
        warn(`${percent.toFixed(0)}% of token budget used`);
      }
    }

    // Check cost limit
    if (costLimit) {
      const percent = (this.stats.estimatedCost / costLimit) * 100;

      if (percent >= 100) {
        this.stats.costExceeded = true;
        this.terminate('Cost limit exceeded');
        return;
      }

      if (percent >= warnPercent && percent < warnPercent + 5) {
        warn(`${percent.toFixed(0)}% of cost limit used`);
      }
    }
  }

  private terminate(reason: string): void {
    error(reason);
    if (this.process) {
      this.process.kill('SIGTERM');
    }
  }

  private showStatus(): void {
    if (this.options.quiet) return;

    const status = renderStatus(this.stats, this.options, true);
    clearLine();
    process.stderr.write(status);
  }

  private cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    clearLine();
  }

  private saveReport(): void {
    if (!this.options.output) return;

    const report = {
      ...this.stats,
      startTime: this.stats.startTime.toISOString(),
      endTime: this.stats.endTime?.toISOString(),
      options: this.options,
    };

    try {
      writeFileSync(this.options.output, JSON.stringify(report, null, 2));
    } catch (err) {
      error(`Failed to save report: ${err}`);
    }
  }

  getStats(): UsageStats {
    return { ...this.stats };
  }
}
