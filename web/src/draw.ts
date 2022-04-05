import {consoleLog} from './util';
import {Rect} from './common';

// Constant for the size of a tile in the spritesheet
export const TILE_SIZE = 10

type SpriteDict = {
    [key: string]: Rect | SpriteDict
}

export const SPRITES: SpriteDict = {
    TILES: {
        UNCOVERED: {
            x: 0,
            y: 0,
            w: TILE_SIZE,
            h: TILE_SIZE,
        },
    },

}

// Constant for the height of a row in the spritesheet
export const ROW_HEIGHT = TILE_SIZE

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

export function draw(sprite: Rect, drawRect: Rect) {
    ctx.drawImage(spritesheet,
        sprite.x, sprite.y, sprite.w, sprite.h,
        drawRect.x, drawRect.y, drawRect.w, drawRect.h)
}