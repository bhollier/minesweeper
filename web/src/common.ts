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