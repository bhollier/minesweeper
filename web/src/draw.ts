import {Pos, Rect, Size} from './common';
import {consoleLog} from './util';

// Constant for the size of a tile in the spritesheet
export const TILE_SIZE = 10;

// Constant for the height of a row in the spritesheet
export const ROW_HEIGHT = TILE_SIZE;

export const SPRITES = {
    TILES: {
        EMPTY: {x: 0, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        1: {x: 10, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        2: {x: 20, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        3: {x: 30, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        4: {x: 40, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        5: {x: 50, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        6: {x: 60, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        7: {x: 70, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        8: {x: 80, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        MINE: {x: 90, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        HIDDEN: {x: 100, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        FLAG: {x: 110, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect
    },

    MODAL: {
        BACK: {x: 0, y: 90, w: 24, h: ROW_HEIGHT} as Rect,
        BACK_HOVERED: {x: 24, y: 90, w: 24, h: ROW_HEIGHT} as Rect
    },

    MAIN_MENU: {
        TITLE: {x: 0, y: 10, w: 95, h: ROW_HEIGHT} as Rect,
        EASY: {x: 0, y: 20, w: 26, h: ROW_HEIGHT} as Rect,
        EASY_HOVERED: {x: 26, y: 20, w: 26, h: ROW_HEIGHT} as Rect,
        MEDIUM: {x: 0, y: 30, w: 35, h: ROW_HEIGHT} as Rect,
        MEDIUM_HOVERED: {x: 35, y: 30, w: 30, h: ROW_HEIGHT} as Rect,
        HARD: {x: 0, y: 40, w: 25, h: ROW_HEIGHT} as Rect,
        HARD_HOVERED: {x: 25, y: 40, w: 26, h: ROW_HEIGHT} as Rect,
        CUSTOM: {x: 0, y: 50, w: 38, h: ROW_HEIGHT} as Rect,
        CUSTOM_HOVERED: {x: 38, y: 50, w: 26, h: ROW_HEIGHT} as Rect,
        INFINITE: {x: 0, y: 60, w: 43, h: ROW_HEIGHT} as Rect,
        INFINITE_HOVERED: {x: 43, y: 60, w: 43, h: ROW_HEIGHT} as Rect
    },

    RETRY_MODAL: {
        TITLE: {x: 0, y: 70, w: 45, h: ROW_HEIGHT} as Rect,
        RETRY: {x: 0, y: 80, w: 30, h: ROW_HEIGHT} as Rect,
        RETRY_HOVERED: {x: 30, y: 80, w: 30, h: ROW_HEIGHT} as Rect,
    },

    SUCCESS_MODAL: {
        TITLE: {x: 0, y: 100, w: 52, h: ROW_HEIGHT} as Rect,
        RESET: {x: 0, y: 110, w: 53, h: ROW_HEIGHT} as Rect,
        RESET_HOVERED: {x: 53, y: 110, w: 53, h: ROW_HEIGHT} as Rect,
    },

    ICONS: {
        0: {x: 0, y: 120, w: 7, h: ROW_HEIGHT} as Rect,
        1: {x: 7, y: 120, w: 7, h: ROW_HEIGHT} as Rect,
        2: {x: 14, y: 120, w: 7, h: ROW_HEIGHT} as Rect,
        3: {x: 21, y: 120, w: 7, h: ROW_HEIGHT} as Rect,
        4: {x: 28, y: 120, w: 7, h: ROW_HEIGHT} as Rect,
        5: {x: 35, y: 120, w: 7, h: ROW_HEIGHT} as Rect,
        6: {x: 42, y: 120, w: 7, h: ROW_HEIGHT} as Rect,
        7: {x: 49, y: 120, w: 7, h: ROW_HEIGHT} as Rect,
        8: {x: 56, y: 120, w: 7, h: ROW_HEIGHT} as Rect,
        9: {x: 63, y: 120, w: 7, h: ROW_HEIGHT} as Rect,
        ':': {x: 70, y: 120, w: 7, h: ROW_HEIGHT} as Rect,
        '-': {x: 77, y: 120, w: 7, h: ROW_HEIGHT} as Rect,
        INFINITY: {x: 84, y: 120, w: 14, h: ROW_HEIGHT} as Rect,
        CLOCK: {x: 98, y: 120, w: 10, h: ROW_HEIGHT} as Rect,
        CROSS: {x: 108, y: 120, w: 10, h: ROW_HEIGHT} as Rect,
        MINE: {x: 0, y: 10, w: 10, h: ROW_HEIGHT} as Rect
    }
};

// The canvas
export const canvas = document.getElementById('canvas') as HTMLCanvasElement;

// The graphical context to draw to
export const ctx = canvas.getContext('2d');

const spritesheet = new Image();

export const spritesheetLoaded = new Promise<void>(resolve => {
    spritesheet.addEventListener('load', () => {
        consoleLog('Finished loading spritesheet');
        resolve();
    });
});

spritesheet.src = new URL('../assets/spritesheet.png', import.meta.url).toString();

export async function clear(rect?: Rect) {
    if (!rect) {
        rect = {
            x: 0,
            y: 0,
            w: canvas.width,
            h: canvas.height
        };
    }
    ctx.clearRect(rect.x, rect.y, rect.w, rect.h);
}

export function drawSprite(sprite: Rect, drawRect: Rect) {
    ctx.drawImage(spritesheet,
        sprite.x, sprite.y, sprite.w, sprite.h,
        drawRect.x, drawRect.y, drawRect.w, drawRect.h);
}

export function numberDrawWidth(number: string, drawHeight: number): number {
    return ((drawHeight / ROW_HEIGHT) * SPRITES.ICONS['0'].w) * number.length;
}

export function drawNumber(number: string, drawPos: Pos, drawHeight: number) {
    const drawSize: Size = {
        w: (drawHeight / ROW_HEIGHT) * SPRITES.ICONS['0'].w,
        h: drawHeight
    };
    let x = drawPos.x;
    for (const digit of number) {
        const drawRect: Rect = {
            x,
            y: drawPos.y,
            ...drawSize
        };
        drawSprite(SPRITES.ICONS[digit], drawRect);
        x += drawRect.w;
    }
}