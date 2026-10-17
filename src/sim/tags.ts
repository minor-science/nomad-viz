// On-canvas tags for the Explain layer: a short label tied to a live feature by a leader line.
// Coordinates are world units (two per CSS pixel). Labels placed in one frame avoid each other:
// call beginTags() before drawing a frame's tags.

let placed: { x: number; y: number; w: number; h: number }[] = [];

export function beginTags() {
  placed = [];
}

/** Mark an area (a readout, a caption) that tags should keep clear of. */
export function reserve(x: number, y: number, w: number, h: number) {
  placed.push({ x, y, w, h });
}

const overlaps = (a: { x: number; y: number; w: number; h: number }) =>
  placed.some((b) => a.x < b.x + b.w + 6 && b.x < a.x + a.w + 6 && a.y < b.y + b.h + 6 && b.y < a.y + a.h + 6);

export function drawTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  bounds: { width: number; height: number },
) {
  ctx.save();
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  const w = ctx.measureText(text).width + 16;
  const h = 30;
  // Place the label up and to the right of the feature, flipped to stay on screen.
  let lx = x + 28;
  let ly = y - 46;
  if (lx + w > bounds.width - 8) lx = x - 28 - w;
  if (ly < 8) ly = y + 22;
  for (let k = 0; k < 8 && overlaps({ x: lx, y: ly, w, h }); k++) {
    ly += h + 8;
    if (ly + h > bounds.height - 8) ly = 8 + k * (h + 8);
  }
  placed.push({ x: lx, y: ly, w, h });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(lx < x ? lx + w : lx, ly + h / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(5, 5, 5, 0.85)';
  ctx.fillRect(lx, ly, w, h);
  ctx.strokeRect(lx, ly, w, h);
  ctx.fillStyle = color;
  ctx.fillText(text, lx + 8, ly + 21);
  ctx.restore();
}

// A tag that holds on to one feature for a while, follows it smoothly, and only then looks for
// another, so it can be read. `locate` finds the current anchor's position (null if it is gone);
// `pick` chooses a new anchor.
export class StickyTag<A> {
  x = 0;
  y = 0;
  /** True while the tag outlives a feature that has disappeared. */
  lost = false;
  private anchor: A | null = null;
  /** The feature currently tagged (null if none). */
  get current(): A | null {
    return this.anchor;
  }
  private age = 0;
  private alpha = 0;
  private dwell: number;
  private minDwell: number;
  /**
   * @param dwell frames before the tag looks for a new feature
   * @param minDwell frames a tag stays put, even if its feature disappears first
   */
  constructor(dwell = 240, minDwell = 150) {
    this.dwell = dwell;
    this.minDwell = minDwell;
  }

  update(locate: (a: A) => { x: number; y: number } | null, pick: () => { anchor: A; x: number; y: number } | null) {
    let pos = this.anchor !== null && !this.lost ? locate(this.anchor) : null;
    // A feature that vanishes early keeps its tag in place until the minimum time is up.
    if (!pos && this.anchor !== null && this.age < this.minDwell) {
      this.lost = true;
      this.alpha = Math.min(1, this.alpha + 0.08);
      this.age++;
      return;
    }
    if (!pos || this.age > this.dwell) {
      const p = pick();
      if (p) {
        if (this.anchor === null || !pos) {
          this.x = p.x;
          this.y = p.y;
        }
        this.anchor = p.anchor;
        this.lost = false;
        pos = { x: p.x, y: p.y };
        this.age = 0;
      } else if (!pos) {
        this.anchor = null;
        this.lost = false;
      }
    }
    if (pos) {
      this.x += (pos.x - this.x) * 0.12;
      this.y += (pos.y - this.y) * 0.12;
      this.alpha = Math.min(1, this.alpha + 0.08);
    } else {
      this.alpha = Math.max(0, this.alpha - 0.05);
    }
    this.age++;
  }

  /** Draw the tag; `lostText` replaces the text while the feature is gone. */
  draw(ctx: CanvasRenderingContext2D, text: string, color: string, bounds: { width: number; height: number }, lostText?: string, lostColor?: string) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha * (this.lost ? 0.8 : 1);
    drawTag(ctx, this.x, this.y, this.lost && lostText ? lostText : text, this.lost && lostColor ? lostColor : color, bounds);
    ctx.restore();
  }
}

// A caption box: a bold headline and a lighter second line, wrapped to a width. World units.
export function drawCaption(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxW: number,
  head: string,
  sub: string,
  color: string,
) {
  const wrap = (text: string, font: string) => {
    ctx.font = font;
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > maxW - 28 && line) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  };
  const headFont = 'bold 22px "JetBrains Mono", monospace';
  const subFont = '19px "Inter", sans-serif';
  const hl = wrap(head, headFont);
  const sl = wrap(sub, subFont);
  const h = 18 + hl.length * 28 + sl.length * 25 + 8;
  reserve(x, y, maxW, h);
  ctx.save();
  ctx.fillStyle = 'rgba(5, 5, 5, 0.82)';
  ctx.fillRect(x, y, maxW, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 6, h);
  ctx.font = headFont;
  hl.forEach((l, k) => ctx.fillText(l, x + 18, y + 30 + k * 28));
  ctx.font = subFont;
  ctx.fillStyle = '#d1d5db';
  sl.forEach((l, k) => ctx.fillText(l, x + 18, y + 30 + hl.length * 28 + k * 25));
  ctx.restore();
}

// A faint map label on the ground, letterspaced, centered on (x, y). World units.
export function drawPlace(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.save();
  ctx.font = 'bold 34px "JetBrains Mono", monospace';
  ctx.letterSpacing = '8px';
  ctx.fillStyle = 'rgba(242, 242, 242, 0.16)';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.restore();
}
