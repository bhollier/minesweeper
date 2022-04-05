import Menu, {Element} from "./menu"
import {canvas, ctx, drawSprite, SPRITES} from "./draw";
import {Rect} from './common';

// THe background of the modal is made up of a grid of 12x12 tiles
const MODAL_GRID_SIZE = 10

export const CLOSE_BUTTON: Element = {
    sprite: SPRITES.TILES.CLOSE,
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
            const w = canvas.width, h = canvas.height

            // Darken the field
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
            ctx.fillRect(0, 0, w, h)

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

                    let sprite = SPRITES.TILES.UNCOVERED
                    // If the tile should be a corner
                    if (x === 0 || x === MODAL_GRID_SIZE - 1 ||
                        y === 0 || y === MODAL_GRID_SIZE - 1) {
                        // If the tile is in the upper right corner
                        if (x === MODAL_GRID_SIZE - 1 && y === 0) {
                            // The element is the close button
                            sprite = CLOSE_BUTTON.sprite
                            // Add the hitbox to the menu
                            this.elementHitboxes.set(CLOSE_BUTTON, hitbox)

                        } else {
                            sprite = SPRITES.TILES.COVERED
                        }
                    }

                    drawSprite(sprite, hitbox)
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