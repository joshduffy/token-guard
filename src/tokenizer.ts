// Simple token estimation without external dependencies
// Uses GPT-4 style tokenization rules (~4 chars per token)

const CHARS_PER_TOKEN = 4;

export function countTokens(text: string): number {
  if (!text) return 0;

  // More accurate estimation:
  // - Split on whitespace and punctuation
  // - Count special tokens for code

  // Count words
  const words = text.split(/\s+/).filter(w => w.length > 0);

  // Estimate tokens (rough approximation)
  // - Short words (1-4 chars) = 1 token
  // - Medium words (5-8 chars) = 1-2 tokens
  // - Long words (9+ chars) = 2+ tokens
  // - Code symbols often get their own tokens

  let tokens = 0;

  for (const word of words) {
    if (word.length <= 4) {
      tokens += 1;
    } else if (word.length <= 8) {
      tokens += Math.ceil(word.length / 4);
    } else {
      tokens += Math.ceil(word.length / 3);
    }
  }

  // Add tokens for punctuation and special characters
  const specialChars = text.match(/[{}()\[\]<>:;,."'`~!@#$%^&*+=|\\/?-]/g);
  if (specialChars) {
    tokens += Math.ceil(specialChars.length * 0.5);
  }

  // Add tokens for newlines (often separate tokens)
  const newlines = text.match(/\n/g);
  if (newlines) {
    tokens += newlines.length;
  }

  return Math.max(1, Math.round(tokens));
}

export function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(2)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return count.toString();
}
