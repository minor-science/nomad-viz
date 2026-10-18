// On-canvas tags for the Explain layer: a short label tied to a live feature by a leader line.
// Coordinates are world units (two per CSS pixel). Labels placed in one frame avoid each other:
// call beginTags() before drawing a frame's tags.

let placed: { x: number; y: number; w: number; h: number }[] = [];
let shown = new Set<string>();
// How far a tag's box sits from its feature, as a multiple of the usual distance.
let tail = 1;

// A tag's process sets its color.
const PROCESS_COLOR: Record<string, string> = {
  CAPTURE: '#00aeef',
  'WAR MACHINE': '#ec008c',
  'WARDING OFF': '#e0a800',
  POLARIZATION: '#2f8f4e',
};

/**
 * Start a frame's tags. `clear` lists areas (such as the legend) that tags should avoid, and
 * `tailLength` sets how far boxes sit from their features (1 is close; larger gives long leader lines).
 */
export function beginTags(clear: { x: number; y: number; w: number; h: number }[] = [], tailLength = 1) {
  placed = [...clear];
  shown = new Set();
  tail = tailLength;
}

/** Mark an area (a readout, a caption) that tags should keep clear of. */
export function reserve(x: number, y: number, w: number, h: number) {
  placed.push({ x, y, w, h });
}

const overlaps = (a: { x: number; y: number; w: number; h: number }) =>
  placed.some((b) => a.x < b.x + b.w + 6 && b.x < a.x + a.w + 6 && a.y < b.y + b.h + 6 && b.y < a.y + a.h + 6);

/** Where a following tag's box sits: its side, above or below, its row, and its glided position. */
export interface Glide {
  lx?: number;
  ly?: number;
  side?: number;
  vert?: number;
  row?: number;
}

export function drawTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  bounds: { width: number; height: number },
  glide?: Glide,
) {
  // Two tags of the same kind never show at once; different kinds may, even for one process.
  if (shown.has(text)) return;
  shown.add(text);
  const kind = text.split(' · ')[0];
  if (kind in PROCESS_COLOR) color = PROCESS_COLOR[kind];
  // The label before " · " sets the color; only the words after it are drawn, since the color
  // already says which process a tag belongs to.
  if (text.includes(' · ')) text = text.slice(text.indexOf(' · ') + 3);
  ctx.save();
  ctx.font = '22px Inter, ui-sans-serif, system-ui, sans-serif';
  const w = ctx.measureText(text).width + 16;
  const h = 30;
  // Candidate spots: right or left of the feature (side 0, 1), above or below it (vert 0, 1),
  // pushed down by whole rows to clear other tags. The first spot that fits wins, but a tag that
  // already has a spot keeps it while it still fits, so it does not flip back and forth.
  // Rows run away from the feature: upward from a spot above it, downward from a spot below it.
  const rect = (side: number, vert: number, row: number) => ({
    x: side === 0 ? x + 28 * tail : x - 28 * tail - w,
    y: vert === 0 ? y - 46 * tail - row * (h + 8) : y + 22 * tail + row * (h + 8),
    w,
    h,
  });
  const fits = (r: { x: number; y: number; w: number; h: number }) =>
    r.x >= 8 && r.x + r.w <= bounds.width - 8 && r.y >= 8 && r.y + r.h <= bounds.height - 8 && !overlaps(r);
  let spot: [number, number, number] | null = null;
  if (glide?.side !== undefined && fits(rect(glide.side, glide.vert!, glide.row!))) spot = [glide.side, glide.vert!, glide.row!];
  for (let row = 0; row < 8 && !spot; row++) {
    for (let vert = 0; vert < 2 && !spot; vert++) {
      for (let side = 0; side < 2 && !spot; side++) if (fits(rect(side, vert, row))) spot = [side, vert, row];
    }
  }
  const target = rect(...(spot ?? [0, 0, 0]));
  let lx = Math.max(8, Math.min(target.x, bounds.width - 8 - w));
  let ly = Math.max(8, Math.min(target.y, bounds.height - 8 - h));
  // A tag that follows something moving glides its box toward its spot instead of jumping.
  if (glide) {
    if (spot) [glide.side, glide.vert, glide.row] = spot;
    if (glide.lx !== undefined && glide.ly !== undefined) {
      lx = glide.lx + (lx - glide.lx) * 0.08;
      ly = glide.ly + (ly - glide.ly) * 0.08;
    }
    glide.lx = lx;
    glide.ly = ly;
  }
  placed.push({ x: lx, y: ly, w, h });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  // The leader line meets the nearest point of the box, so it moves continuously as the box glides.
  const ex = Math.max(lx, Math.min(x, lx + w));
  const ey = ex === x ? (y < ly ? ly : ly + h) : ly + h / 2;
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(5, 8, 16, 0.8)';
  ctx.fillRect(lx, ly, w, h);
  ctx.lineWidth = 1.5;
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
  /** True while the tag reports on a feature that has disappeared. */
  lost = false;
  private anchor: A | null = null;
  /** The feature currently tagged, kept while its loss is reported (null if none). */
  get current(): A | null {
    return this.anchor;
  }
  private age = 0;
  // Frames the current feature has been shown live, and frames left to report its loss.
  private live = 0;
  private lostLeft = 0;
  // Fading out before picking another feature, so the tag never jumps across the canvas.
  private fading = false;
  private hasLostText = false;
  private alpha = 0;
  private box: Glide = {};
  // First stage of the anchor's smoothing; x and y follow this, so jitter is filtered twice.
  private fx = 0;
  private fy = 0;
  private dwell: number;
  private minDwell: number;
  private readable: number;
  /**
   * @param dwell frames before the tag looks for a new feature
   * @param minDwell for an outcome tag (readable 0), frames its outcome is reported, every time
   * @param readable frames a feature must have been shown before its loss is reported at all;
   *   the report then lasts about half as long as the feature was shown, so it never outstays it
   */
  constructor(dwell = 240, minDwell = 150, readable = 60) {
    this.dwell = dwell;
    this.minDwell = minDwell;
    this.readable = readable;
  }

  update(locate: (a: A) => { x: number; y: number } | null, pick: () => { anchor: A; x: number; y: number } | null) {
    let pos = this.anchor !== null && !this.lost && !this.fading ? locate(this.anchor) : null;
    if (this.anchor !== null && !this.lost && !this.fading && !pos) {
      // The feature has just disappeared: report it, or fade out quietly if it was barely shown.
      const report = !this.hasLostText
        ? 0
        : this.readable === 0
          ? this.minDwell
          : this.live >= this.readable
            ? Math.min(90, Math.max(45, this.live / 2))
            : 0;
      if (report > 0) {
        this.lost = true;
        this.lostLeft = report;
      } else this.fading = true;
    }
    if (this.lost) {
      if (this.lostLeft-- > 0) {
        this.alpha = Math.min(1, this.alpha + 0.08);
        this.age++;
        return;
      }
      this.fading = true;
    }
    if (this.fading || this.anchor === null) {
      if (this.alpha > 0) {
        this.alpha = Math.max(0, this.alpha - 0.08);
        return;
      }
      this.fading = false;
      this.lost = false;
      const p = pick();
      this.anchor = p ? p.anchor : null;
      if (!p) return;
      this.x = this.fx = p.x;
      this.y = this.fy = p.y;
      pos = { x: p.x, y: p.y };
      this.age = 0;
      this.live = 0;
    } else if (this.age > this.dwell) {
      // Time to move on: the tag glides over to the next feature.
      const p = pick();
      if (p) {
        this.anchor = p.anchor;
        pos = { x: p.x, y: p.y };
        this.age = 0;
        this.live = 0;
      }
    }
    if (pos) {
      // Follow through two smoothing stages, so a feature whose position jitters (a cluster's
      // center, a band stepping from cell to cell) still moves its tag smoothly.
      this.fx += (pos.x - this.fx) * 0.12;
      this.fy += (pos.y - this.fy) * 0.12;
      this.x += (this.fx - this.x) * 0.12;
      this.y += (this.fy - this.y) * 0.12;
      this.alpha = Math.min(1, this.alpha + 0.08);
      this.live++;
    }
    this.age++;
  }

  /** Draw the tag; `lostText` replaces the text while the feature is gone. */
  draw(ctx: CanvasRenderingContext2D, text: string, color: string, bounds: { width: number; height: number }, lostText?: string, lostColor?: string) {
    this.hasLostText = lostText !== undefined;
    if (this.alpha <= 0) {
      this.box = {};
      return;
    }
    ctx.save();
    ctx.globalAlpha = this.alpha * (this.lost ? 0.8 : 1);
    drawTag(ctx, this.x, this.y, this.lost && lostText ? lostText : text, this.lost && lostColor ? lostColor : color, bounds, this.box);
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

export interface Series {
  values: number[];
  color: string;
  label: string;
}

// The narrator's panel: a headline, an ATP line, and an optional chart of named series (each
// scaled 0 to 1) with a key. Reserves its area so tags keep clear. Returns its height. World units.
export function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  head: string,
  sub: string,
  color: string,
  series: Series[] = [],
  span = 600,
): number {
  const wrap = (text: string, font: string) => {
    ctx.font = font;
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (ctx.measureText(t).width > w - 32 && line) {
        lines.push(line);
        line = word;
      } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  };
  const headFont = 'bold 22px "JetBrains Mono", monospace';
  const subFont = '19px "Inter", sans-serif';
  const hl = wrap(head, headFont);
  const sl = wrap(sub, subFont);
  const chartH = series.length ? 74 : 0;
  const keyH = series.length ? 26 : 0;
  const h = 20 + hl.length * 28 + sl.length * 25 + (series.length ? 14 + chartH + keyH : 4);
  reserve(x, y, w, h);
  ctx.save();
  ctx.fillStyle = 'rgba(5, 5, 5, 0.82)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 6, h);
  ctx.font = headFont;
  hl.forEach((l, k) => ctx.fillText(l, x + 18, y + 30 + k * 28));
  ctx.font = subFont;
  ctx.fillStyle = '#d1d5db';
  sl.forEach((l, k) => ctx.fillText(l, x + 18, y + 30 + hl.length * 28 + k * 25));
  if (series.length) {
    const cx = x + 18;
    const cy = y + 22 + hl.length * 28 + sl.length * 25 + 10;
    const cw = w - 36;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, cy, cw, chartH);
    for (const s of series) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      s.values.forEach((v, k) => {
        const px = cx + (k / Math.max(1, span - 1)) * cw;
        const py = cy + chartH - Math.max(0, Math.min(1, v)) * chartH;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
    ctx.font = '17px "JetBrains Mono", monospace';
    let kx = cx;
    for (const s of series) {
      ctx.fillStyle = s.color;
      ctx.fillRect(kx, cy + chartH + 10, 14, 4);
      ctx.fillText(s.label, kx + 20, cy + chartH + 20);
      kx += 20 + ctx.measureText(s.label).width + 24;
    }
  }
  ctx.restore();
  return h;
}
