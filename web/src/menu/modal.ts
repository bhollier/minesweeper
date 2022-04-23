import Menu, {Element} from './menu';
import {SPRITES, canvas, ctx, drawSprite} from '../draw';

import {Rect, pos} from '../common';

// THe background of the modal is made up of a grid of 12x12 tiles
const MODAL_GRID_SIZE = 10;

export const CLOSE_BUTTON: Element = {
    id: 'modal.close_button',
    sprite: SPRITES.ICONS.CROSS,
    scale: 1
};

export const BACK_BUTTON: Element = {
    id: 'modal.back_button',
    sprite: SPRITES.MODAL.BACK,
    hoveredSprite: pos(SPRITES.MODAL.BACK_HOVERED),
    scale: 1.25,
    interactable: true
};

export default class Modal extends Menu {
    constructor(elements: Array<Element>) {
        super(elements);
    }

    async draw() {
        // Draw the background in a promise
        await new Promise<Rect>(resolve => {
            // The canvas width and height
            const w = canvas.width, h = canvas.height;

            // Darken the field
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, w, h);

            // The modal is 80% the height of the canvas if landscape, or 80% the width if portrait
            const modalSize = w > h ? h * 0.8 : w * 0.8;

            const modalX = (w / 2) - (modalSize / 2);
            const modalY = (h / 2) - (modalSize / 2);

            // The background is made up of a grid of 12x12 tiles
            const tileSize = modalSize / MODAL_GRID_SIZE;

            for (let y = 0; y < MODAL_GRID_SIZE; y++) {
                for (let x = 0; x < MODAL_GRID_SIZE; x++) {
                    // Create the tile's hitbox
                    const hitbox: Rect = {
                        x: modalX + (x * tileSize),
                        y: modalY + (y * tileSize),
                        w: tileSize, h: tileSize,
                    };

                    // todo draw the background properly
                    let sprite = {
                        // Pick the center pixel
                        x: SPRITES.TILES.EMPTY.x + (SPRITES.TILES.EMPTY.w / 2),
                        y: SPRITES.TILES.EMPTY.y + (SPRITES.TILES.EMPTY.h / 2),
                        w: 1, h: 1
                    } as Rect;

                    // If the tile should be a border
                    if (x === 0 || x === MODAL_GRID_SIZE - 1 ||
                        y === 0 || y === MODAL_GRID_SIZE - 1) {
                        sprite = SPRITES.TILES.HIDDEN;
                    }

                    drawSprite(sprite, hitbox);

                    // If the tile is in the upper right corner
                    if (x === MODAL_GRID_SIZE - 1 && y === 0) {
                        // Draw the cross icon
                        drawSprite(CLOSE_BUTTON.sprite, hitbox);
                        // Add the hitbox to the menu
                        this.elementHitboxes.set(CLOSE_BUTTON.id, hitbox);
                    }
                }
            }

            // Resolve the promise with the modal's inner bounds, for drawing the menu
            resolve({
                x: modalX + tileSize,
                y: modalY + tileSize,
                w: modalSize - (tileSize * 2),
                h: modalSize - (tileSize * 2),
            });

            // Then, draw the menu over it
        }).then(innerModalBounds => super.draw(innerModalBounds));
    }
}