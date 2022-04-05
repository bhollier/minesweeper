import Menu, {Element} from "./menu.js"
import * as Util from "./util.js";
import {Rect} from './common';

// THe background of the modal is made up of a grid of 12x12 tiles
const MODAL_GRID_SIZE = 10

const BACKGROUND_TILE: Element = {
    sprite: {
        // Select the middle pixel of the empty tile
        x: Util.TILE_SIZE / 2,
        y: Util.TILE_SIZE / 2,
        w: 1,
        h: 1
    },
    scale: 1
}

const WALL_TILE: Element = {
    sprite: {
        x: Util.TILE_SIZE * 10,
        y: 0,
        w: Util.TILE_SIZE,
        h: Util.TILE_SIZE
    },
    scale: 1
}

export const CLOSE_BUTTON: Element = {
    sprite: {
        x: Util.TILE_SIZE * 12,
        y: 0,
        w: Util.TILE_SIZE,
        h: Util.TILE_SIZE
    },
    scale: 1
}

export default class Modal extends Menu {
    constructor(elements: Array<Element>) {
        super(elements)
    }

    async draw() : Promise<void> {
        // Draw the background in a promise
        return new Promise<Rect>(resolve => {
            // The canvas width and height
            const w = Util.ctx.canvas.width, h = Util.ctx.canvas.height

            // Darken the field
            Util.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
            Util.ctx.fillRect(0, 0, w, h)

            // The modal is 80% the height of the canvas if landscape, or 80% the width if portrait
            const modalSize = w > h ? h * 0.8 : w * 0.8

            const modalX = (w / 2) - (modalSize / 2)
            const modalY = (h / 2) - (modalSize / 2)

            // The background is made up of a grid of 12x12 tiles
            const tileSize = modalSize / MODAL_GRID_SIZE

            for (let y = 0; y < MODAL_GRID_SIZE; y++) {
                for (let x = 0; x < MODAL_GRID_SIZE; x++) {
                    // Create the tile's hitbox
                    const hitbox: Rect = {
                        x: modalX + (x * tileSize),
                        y: modalY + (y * tileSize),
                        w: tileSize, h: tileSize,
                    }

                    let sprite = BACKGROUND_TILE.sprite
                    // If the tile should be a corner
                    if (x === 0 || x === MODAL_GRID_SIZE - 1 ||
                        y === 0 || y === MODAL_GRID_SIZE - 1) {
                        // If the tile is in the upper right corner
                        if (x === MODAL_GRID_SIZE - 1 && y === 0) {
                            // The element is the close button
                            sprite = CLOSE_BUTTON.sprite
                            // Add the hitbox to the menu
                            super.elementHitboxes.set(CLOSE_BUTTON, hitbox)

                        } else {
                            sprite = WALL_TILE.sprite
                        }
                    }

                    Util.ctx.drawImage(Util.spritesheet,
                        sprite.x, sprite.y, sprite.w, sprite.h,
                        hitbox.x, hitbox.y, hitbox.w, hitbox.h)
                }
            }

            // Resolve the promise with the modal's inner bounds, for drawing the menu
            resolve({
                x: modalX + tileSize,
                y: modalY + tileSize,
                w: modalSize - (tileSize * 2),
                h: modalSize - (tileSize * 2),
            })

            // Then, draw the menu over it
        }).then(innerModalBounds => super.draw(innerModalBounds))
    }
}