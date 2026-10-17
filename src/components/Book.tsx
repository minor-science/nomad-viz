import { Fragment } from 'react';

// Text that may name the book: "A Thousand Plateaus", or "Plateaus" for short, set in italics.
export function Book({ text }: { text: string }) {
  const parts = text.split(/(A Thousand Plateaus|\bPlateaus\b)/);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <i key={i}>{p}</i> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

/** The same text with its first letter capitalized, for fields that open a sentence. */
export const capFirst = (s: string) => s.replace(/^([“"]?)(\p{Ll})/u, (_, q: string, c: string) => q + c.toUpperCase());
