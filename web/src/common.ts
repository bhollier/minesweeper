export type Pos = {
    x: number,
    y: number
}

export type Size = {
    w: number,
    h: number
}

export type Rect = Pos & Size

export const pos = (r: Rect): Pos => ({x: r.x, y: r.y});

export const rect = (p: Pos, s: Size): Rect => ({x: p.x, y: p.y, w: s.w, h: s.h});

export const intersect = (p: Pos, r: Rect): boolean =>
    (p.x > r.x && p.y > r.y && p.x < r.x + r.w && p.y < r.y + r.h);