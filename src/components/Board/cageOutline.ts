// Geometrie für Käfig-Konturen im SVG-Linien-Overlay.
//
// Aus den Zellen eines Käfigs wird ein einzelner, nach innen versetzter
// (inset) Umriss-Pfad mit abgerundeten Ecken erzeugt. Ansatz:
//   1. Randkanten des Käfigs sammeln (Kante zwischen Käfig- und
//      Nicht-Käfig-Zelle), als gerichtete Kanten mit dem Käfig-Inneren
//      "rechts" der Laufrichtung (im Uhrzeigersinn).
//   2. Kanten zu geschlossenen Schleifen zusammennähen.
//   3. Jede Schleife nach innen versetzen (Kante entlang ihrer Innen-
//      Normalen verschieben, Ecken über Normalen-Summe).
//   4. Als Pfad mit abgerundeten Ecken ausgeben.
//
// Löcher (ein Käfig, der eine Leerzelle vollständig umschließt) kommen im
// Killer-Sudoku nicht vor und werden nicht gesondert behandelt.

export interface Pt {
  x: number;
  y: number;
}

interface CellRC {
  row: number;
  col: number;
}

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
const norm = (a: Pt): Pt => {
  const l = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / l, y: a.y / l };
};
const keyOf = (p: Pt): string => `${p.x},${p.y}`;

interface Edge {
  s: Pt;
  e: Pt;
}

/** Randkanten zu geschlossenen Schleifen (in Zell-Einheiten) zusammennähen. */
function traceLoops(cells: CellRC[]): Pt[][] {
  const inSet = new Set(cells.map(c => `${c.row},${c.col}`));
  const has = (r: number, c: number): boolean => inSet.has(`${r},${c}`);

  // Gerichtete Randkanten: im Uhrzeigersinn, Inneres liegt rechts.
  const edges: Edge[] = [];
  for (const { row: r, col: c } of cells) {
    const TL = { x: c, y: r };
    const TR = { x: c + 1, y: r };
    const BR = { x: c + 1, y: r + 1 };
    const BL = { x: c, y: r + 1 };
    if (!has(r - 1, c)) edges.push({ s: TL, e: TR }); // oben,  +x
    if (!has(r, c + 1)) edges.push({ s: TR, e: BR }); // rechts,+y
    if (!has(r + 1, c)) edges.push({ s: BR, e: BL }); // unten, -x
    if (!has(r, c - 1)) edges.push({ s: BL, e: TL }); // links, -y
  }

  const byStart = new Map<string, Edge[]>();
  for (const ed of edges) {
    const k = keyOf(ed.s);
    if (!byStart.has(k)) byStart.set(k, []);
    byStart.get(k)!.push(ed);
  }

  const used = new Set<Edge>();
  const loops: Pt[][] = [];
  for (const startEdge of edges) {
    if (used.has(startEdge)) continue;
    const loop: Pt[] = [];
    let cur: Edge | undefined = startEdge;
    while (cur && !used.has(cur)) {
      used.add(cur);
      loop.push(cur.s);
      const cands: Edge[] = byStart.get(keyOf(cur.e)) || [];
      cur = cands.find((e: Edge) => !used.has(e));
    }
    if (loop.length >= 4) loops.push(simplifyColinear(loop));
  }
  return loops;
}

/** Kollineare Durchgangs-Punkte entfernen (nur echte Ecken behalten). */
function simplifyColinear(loop: Pt[]): Pt[] {
  const n = loop.length;
  const res: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const prev = loop[(i - 1 + n) % n];
    const cur = loop[i];
    const next = loop[(i + 1) % n];
    const dIn = norm(sub(cur, prev));
    const dOut = norm(sub(next, cur));
    if (Math.abs(dIn.x - dOut.x) > 1e-9 || Math.abs(dIn.y - dOut.y) > 1e-9) {
      res.push(cur);
    }
  }
  return res;
}

/** Schleife nach innen versetzen. Innen-Normale einer Kante = (-dy, dx). */
function insetLoop(loop: Pt[], inset: number): Pt[] {
  const n = loop.length;
  const res: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const prev = loop[(i - 1 + n) % n];
    const cur = loop[i];
    const next = loop[(i + 1) % n];
    const dIn = norm(sub(cur, prev));
    const dOut = norm(sub(next, cur));
    const nIn = { x: -dIn.y, y: dIn.x };
    const nOut = { x: -dOut.y, y: dOut.x };
    res.push({
      x: cur.x + (nIn.x + nOut.x) * inset,
      y: cur.y + (nIn.y + nOut.y) * inset,
    });
  }
  return res;
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Geschlossener Pfad mit abgerundeten Ecken. */
function roundedPath(pts: Pt[], radius: number): string {
  const n = pts.length;
  if (n < 3) return '';
  let d = '';
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const cur = pts[i];
    const next = pts[(i + 1) % n];
    const dIn = norm(sub(cur, prev));
    const dOut = norm(sub(next, cur));
    const rr = Math.min(radius, dist(cur, prev) / 2, dist(cur, next) / 2);
    const p1 = { x: cur.x - dIn.x * rr, y: cur.y - dIn.y * rr };
    const p2 = { x: cur.x + dOut.x * rr, y: cur.y + dOut.y * rr };
    d += `${i === 0 ? 'M' : 'L'} ${r2(p1.x)} ${r2(p1.y)} `;
    d += `Q ${r2(cur.x)} ${r2(cur.y)} ${r2(p2.x)} ${r2(p2.y)} `;
  }
  return d + 'Z';
}

/**
 * SVG-Pfad-String für die Inset-Kontur eines Käfigs.
 * @param cells    Zellen des Käfigs.
 * @param cellSize Kantenlänge einer Zelle in px.
 * @param insetPx  Versatz nach innen in px.
 * @param radiusPx Eckenradius in px.
 */
export function cageOutlinePath(
  cells: CellRC[],
  cellSize: number,
  insetPx: number,
  radiusPx: number
): string {
  if (!cells || cells.length === 0) return '';
  const loops = traceLoops(cells);
  return loops
    .map(loop => {
      const px = loop.map(p => ({ x: p.x * cellSize, y: p.y * cellSize }));
      return roundedPath(insetLoop(px, insetPx), radiusPx);
    })
    .join(' ');
}

export default cageOutlinePath;
