export type PressEvent = [offsetMs: number, durationMs: number];

const MORSE_ALPHABET: Record<string, string> = {
  '.-': 'A',    '-...': 'B',  '-.-.': 'C',  '-..': 'D',   '.': 'E',
  '..-.': 'F',  '--.': 'G',   '....': 'H',  '..': 'I',    '.---': 'J',
  '-.-': 'K',   '.-..': 'L',  '--': 'M',    '-.': 'N',    '---': 'O',
  '.--.': 'P',  '--.-': 'Q',  '.-.': 'R',   '...': 'S',   '-': 'T',
  '..-': 'U',   '...-': 'V',  '.--': 'W',   '-..-': 'X',  '-.--': 'Y',
  '--..': 'Z',
  '-----': '0', '.----': '1', '..---': '2', '...--': '3', '....-': '4',
  '.....': '5', '-....': '6', '--...': '7', '---..': '8', '----.': '9',
  '.-.-.-': '.', '--..--': ',', '..--..': '?', '.----.': '\'',
  '-.-.--': '!', '-..-.': '/',  '-.--.': '(',  '-.--.-': ')',
  '.-...': '&',  '---...': ':', '-.-.-.': ';', '-...-': '=',
  '.-.-.': '+',  '-....-': '-', '..--.-': '_', '.-..-.': '"',
  '...-..-': '$', '.--.-.': '@',
};

/** Binary trie: left = dot, right = dash. Walked one symbol at a time. */
type TrieNode = { char: string | null; dot: TrieNode | null; dash: TrieNode | null };
const newNode = (): TrieNode => ({ char: null, dot: null, dash: null });

const TRIE_ROOT: TrieNode = (() => {
  const root = newNode();
  for (const [pattern, char] of Object.entries(MORSE_ALPHABET)) {
    let node = root;
    for (const sym of pattern) {
      if (sym === '.') {
        if (!node.dot) node.dot = newNode();
        node = node.dot;
      } else {
        if (!node.dash) node.dash = newNode();
        node = node.dash;
      }
    }
    node.char = char;
  }
  return root;
})();

function lookup(pattern: string): string {
  let node: TrieNode | null = TRIE_ROOT;
  for (const sym of pattern) {
    if (!node) return '?';
    node = sym === '.' ? node.dot : node.dash;
  }
  return node?.char ?? '?';
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** 1D k-means. Returns the k centroids sorted ascending, or null if any cluster is empty. */
function kmeans(values: number[], k: number, maxIter = 24): number[] | null {
  if (values.length < k) return null;
  const sorted = [...values].sort((a, b) => a - b);
  // Seed centroids at evenly spaced quantiles of the sorted data.
  let centroids: number[] = [];
  for (let i = 0; i < k; i++) {
    centroids.push(sorted[Math.floor(((i + 0.5) * sorted.length) / k)]);
  }
  // Deduplicate seeds — degenerate when many identical values.
  if (new Set(centroids).size < k) return null;

  for (let iter = 0; iter < maxIter; iter++) {
    const buckets: number[][] = Array.from({ length: k }, () => []);
    for (const v of values) {
      let best = 0;
      let bestDist = Math.abs(v - centroids[0]);
      for (let i = 1; i < k; i++) {
        const d = Math.abs(v - centroids[i]);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      buckets[best].push(v);
    }
    if (buckets.some((b) => b.length === 0)) return null;
    const next = buckets.map((b) => b.reduce((s, x) => s + x, 0) / b.length);
    let converged = true;
    for (let i = 0; i < k; i++) {
      if (Math.abs(next[i] - centroids[i]) > 0.5) converged = false;
    }
    centroids = next;
    if (converged) break;
  }
  return centroids.slice().sort((a, b) => a - b);
}

/** Decode a press-event sequence into morse pattern + ASCII.
 *
 *  - Presses clustered k=2 to find dot/dash threshold.
 *  - Gaps clustered separately (k=3 then k=2) — does **not** assume gap = press unit,
 *    which is the trap untrained typists fall into.
 *  - Pattern walked through a binary trie, one symbol at a time.
 */
export function decode(events: PressEvent[]): { pattern: string; text: string } {
  if (events.length === 0) return { pattern: '', text: '' };

  // 1. Dot/dash threshold from press durations.
  const durations = events.map((e) => e[1]);
  const pressC = kmeans(durations, 2);
  let dotMax: number;
  if (pressC && pressC[1] >= pressC[0] * 1.8) {
    dotMax = (pressC[0] + pressC[1]) / 2;
  } else {
    // All presses cluster — single class. Decide by median heuristic.
    const m = median(durations);
    dotMax = m < 180 ? Math.max(m * 2, 100) : 0; // 0 means everything is a dash
  }

  // 2. Gap thresholds — clustered independently. Try 3-means (intra/letter/word),
  //    fall back to 2-means (intra/letter), fall back to "all intra-letter".
  const gaps: number[] = [];
  for (let i = 0; i < events.length - 1; i++) {
    gaps.push(events[i + 1][0] - (events[i][0] + events[i][1]));
  }

  let letterGapMin = Infinity;
  let wordGapMin = Infinity;

  // Default path: 2-means. Splits gaps into "within a letter" vs "between letters".
  // Human typing is irregular; 3-means is too eager to find a third class out of noise.
  if (gaps.length >= 2) {
    const c2 = kmeans(gaps, 2);
    if (c2 && c2[1] >= c2[0] * 1.8) {
      letterGapMin = (c2[0] + c2[1]) / 2;
    }
  }

  // Escalate to 3-means only with strong evidence:
  //   - enough gaps that 3 classes can be supported,
  //   - strict ratio between adjacent clusters (≥ 2.5×, canonical morse is 3×),
  //   - "word break" cluster is rare (≤ 25% of gaps) since words are spaced sparingly.
  if (gaps.length >= 8) {
    const c3 = kmeans(gaps, 3);
    if (c3 && c3[1] >= c3[0] * 2.5 && c3[2] >= c3[1] * 2.5) {
      const wordThreshold = (c3[1] + c3[2]) / 2;
      const wordBreakCount = gaps.reduce((n, g) => (g >= wordThreshold ? n + 1 : n), 0);
      if (wordBreakCount * 4 <= gaps.length) {
        letterGapMin = (c3[0] + c3[1]) / 2;
        wordGapMin = wordThreshold;
      }
    }
  }

  // 3. Walk the events, descending the trie per press; emit on letter/word breaks.
  let pattern = '';
  let currentLetter = '';
  const words: string[][] = [];
  let currentWord: string[] = [];

  const flushLetter = () => {
    if (!currentLetter) return;
    if (pattern && !pattern.endsWith(' ')) pattern += ' ';
    pattern += currentLetter;
    currentWord.push(lookup(currentLetter));
    currentLetter = '';
  };
  const flushWord = () => {
    if (currentWord.length === 0) return;
    words.push(currentWord);
    currentWord = [];
  };

  for (let i = 0; i < events.length; i++) {
    const [offset, dur] = events[i];
    currentLetter += dur < dotMax ? '.' : '-';
    if (i === events.length - 1) break;
    const gap = events[i + 1][0] - (offset + dur);
    if (gap >= wordGapMin) {
      flushLetter();
      flushWord();
      pattern += ' / ';
    } else if (gap >= letterGapMin) {
      flushLetter();
    }
  }
  flushLetter();
  flushWord();

  const text = words.map((w) => w.join('')).join(' ');
  return { pattern: pattern.trim(), text };
}
