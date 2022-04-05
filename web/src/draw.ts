import {consoleLog} from './util';
import {Rect} from './common';

// Constant for the size of a tile in the spritesheet
export const TILE_SIZE = 10

// Constant for the height of a row in the spritesheet
export const ROW_HEIGHT = TILE_SIZE

export const SPRITES = {
    TILES: {
        UNCOVERED: {x: 0, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        1: {x: 10, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        2: {x: 20, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        3: {x: 30, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        4: {x: 40, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        5: {x: 50, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        6: {x: 60, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        7: {x: 70, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        8: {x: 80, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        MINE: {x: 90, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        COVERED: {x: 100, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        FLAG: {x: 110, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect,
        CLOSE: {x: 120, y: 0, w: TILE_SIZE, h: TILE_SIZE} as Rect
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
        CUSTOM_HOVERED: {x: 38, y: 50, w: 26, h: ROW_HEIGHT} as Rect
    },

    RETRY_MENU: {
        TITLE: {x: 0, y: 60, w: 45, h: ROW_HEIGHT} as Rect
    }

}

// The canvas
export const canvas = document.getElementById("canvas") as HTMLCanvasElement

// The graphical context to draw to
export const ctx = canvas.getContext('2d')

export const spritesheet = new Image()

export const spritesheetLoaded = new Promise<void>(resolve => {
    spritesheet.addEventListener('load', () => {
        consoleLog("Finished loading spritesheet")
        resolve()
    })
})

spritesheet.src = new URL('../assets/spritesheet.png', import.meta.url).toString()

export function clear(rect?: Rect) {
    if (!rect) {
        rect = {
            x: 0,
            y: 0,
            w: canvas.width,
            h: canvas.height
        }
    }
    ctx.clearRect(rect.x, rect.y, rect.w, rect.h)
}

export function drawSprite(sprite: Rect, drawRect: Rect) {
    ctx.drawImage(spritesheet,
        sprite.x, sprite.y, sprite.w, sprite.h,
        drawRect.x, drawRect.y, drawRect.w, drawRect.h)
}