// Shared geometry for the Gcode mark — the winning design.
// A heavy rounded "C" bowl + a spur, with a diagonal channel splitting the
// whole letter into two interlocking halves.

export const VB = 1024;
export const C = 512; // center x/y
export const R = 300; // bowl radius (stroke centerline)
export const SW = 145; // stroke weight of the letterform
export const SPLIT_W = 52; // width of the diagonal channel

const pt = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [C + R * Math.cos(a), C + R * Math.sin(a)] as const;
};

const arc = (a0: number, a1: number) => {
  const [x0, y0] = pt(a0);
  const [x1, y1] = pt(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 ${large} ${sweep} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

// Full bowl: from 3 o'clock, clockwise around to the upper-right mouth.
export const BOWL_PATH = arc(0, 305);

// Spur: heavy crossbar anchored to the ring at 3 o'clock.
export const SPUR = { x1: 812, y1: 512, x2: 488, y2: 512 };

// Diagonal channel running "/" through the center.
export const SPLIT = { x1: 170, y1: 854, x2: 854, y2: 170 };

// Fragments used by the build-up loader. The three arcs (with a slight
// overlap so the joints stay seamless) plus the spur reconstruct the bowl.
// `start` is the extra rotation each piece spins through before locking in.
export type Fragment =
  | { id: string; type: "arc"; d: string; start: number }
  | { id: string; type: "spur"; start: number };

export const FRAGMENTS: Fragment[] = [
  { id: "a1", type: "arc", d: arc(0, 105), start: 400 },
  { id: "a2", type: "arc", d: arc(101, 208), start: 540 },
  { id: "a3", type: "arc", d: arc(204, 305), start: 670 },
  { id: "spur", type: "spur", start: 470 },
];
