// The models write captions as "LABEL · text" (and sometimes "LABEL · SUBLABEL · text"). The page
// shows them as plain prose: the label in sentence case, then the sentence, with no separators.

/** Sentence case for an all-capitals label, keeping the State capitalized as Plateaus does. */
export function sentenceCase(s: string) {
  if (s !== s.toUpperCase()) return s;
  const lower = s.toLowerCase().replace(/\bstate\b/g, 'State');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Split a caption into its label and the rest, ready to display. */
export function splitHead(head: string): { label: string; text: string } {
  const parts = head.split(' · ');
  if (parts.length === 1) return { label: '', text: head };
  const label = sentenceCase(parts[0]);
  const rest = parts.slice(1).map((p, i, all) => {
    const t = sentenceCase(p);
    // A middle part (a sublabel) ends as its own sentence.
    return i < all.length - 1 && !/[.!?]$/.test(t) ? `${t}.` : t;
  });
  return { label, text: rest.join(' ') };
}
