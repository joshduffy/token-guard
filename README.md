# token-guard

CLI tool to monitor and limit token usage for AI coding assistants like Claude Code, Aider, and others.

## The Problem

A single "refactor this directory" command can burn 100k+ tokens in minutes. There's no visibility into token usage until you get the bill.

## The Solution

`token-guard` wraps your AI coding commands with real-time token monitoring, budgets, and cost estimates.

## Installation

```bash
npm install -g token-guard
```

## Usage

### Basic Usage

```bash
# Wrap any command with token monitoring
token-guard -- claude "refactor the auth module"

# Set a token budget (stops execution if exceeded)
token-guard --budget 50000 -- aider --message "add tests"

# Set a cost limit (in USD)
token-guard --cost-limit 0.50 -- claude "explain this codebase"
```

### Options

```
Options:
  -b, --budget <tokens>     Maximum tokens allowed (default: unlimited)
  -c, --cost-limit <usd>    Maximum cost in USD (default: unlimited)
  -m, --model <name>        Model for pricing (default: auto-detect)
  -w, --warn <percent>      Warn at percentage of budget (default: 80)
  -q, --quiet               Only show warnings and errors
  -o, --output <file>       Save usage report to file
  -h, --help                Show help
  -v, --version             Show version
```

### Examples

```bash
# Monitor Claude Code with 50k token budget
token-guard -b 50000 -- claude "add error handling to api routes"

# Set $1 cost limit with warnings at 50%
token-guard -c 1.00 -w 50 -- aider --model claude-3-opus

# Quiet mode - only show if budget exceeded
token-guard -b 100000 -q -- claude "refactor src/"

# Save report for later analysis
token-guard -o usage-report.json -- claude "review this PR"
```

### Configuration

Create `~/.token-guard.json` for persistent settings:

```json
{
  "defaultBudget": 50000,
  "warnPercent": 80,
  "models": {
    "claude-3-opus": { "input": 15.00, "output": 75.00 },
    "claude-3-sonnet": { "input": 3.00, "output": 15.00 },
    "gpt-4": { "input": 30.00, "output": 60.00 }
  }
}
```

## How It Works

1. **Intercepts I/O**: Monitors stdin/stdout of wrapped commands
2. **Counts Tokens**: Uses tiktoken for accurate token counting
3. **Tracks Costs**: Applies model-specific pricing
4. **Enforces Limits**: Terminates process if budget exceeded
5. **Reports Usage**: Shows real-time and final usage stats

## Supported Tools

- Claude Code (`claude`)
- Aider (`aider`)
- Any CLI tool that streams text output

## Output Example

```
┌─────────────────────────────────────────────┐
│  token-guard v0.1.0                         │
│  Budget: 50,000 tokens | Warn: 80%          │
├─────────────────────────────────────────────┤
│  ████████████░░░░░░░░  42,150 / 50,000     │
│  Input: 8,200 | Output: 33,950              │
│  Est. Cost: $0.43 (claude-3-sonnet)         │
└─────────────────────────────────────────────┘
```

## License

MIT
