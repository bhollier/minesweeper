import {
    SPRITES,
    canvas,
    drawNumber,
    drawSprite, numberDrawWidth
} from '../draw';

import EventManager from '../event-manager';

import {Pos, Rect, intersect} from '../common';
import {formatNumber} from '../util';

export type CloseEvent = Record<string, void>;

interface BarEventMap {
    'close': CloseEvent
}

export default class Bar extends EventManager<BarEventMap> {
    private bounds: Rect;

    public remainingMines: number;
    public currentElapsed: number;

    private clock: ReturnType<typeof setInterval> | null;

    private closeHitbox: Rect;

    private readonly handlePointerDown: (event: PointerEvent) => void;

    constructor(bounds: Rect, remainingMines: number) {
        super();
        this.bounds = bounds;
        this.remainingMines = remainingMines;
        this.currentElapsed = 0;
        this.clock = null;

        this.handlePointerDown = (event: PointerEvent) => {
            if (intersect({x: event.clientX, y: event.clientY}, this.closeHitbox)) {
                this.callEventListeners('close', {});
            }
        };
    }

    public startClock() {
        // The timestamp of when the elapsed time was last updated
        let lastElapsedTimestamp = Date.now();
        // The elapsed time (in seconds) when the bar was last drawn
        let lastDrawnElapsed = Math.floor(this.currentElapsed / 1000);
        // Create the clock
        this.clock = setInterval(async () => {
            const now = Date.now();
            // Add the elapsed time
            this.currentElapsed += now - lastElapsedTimestamp;
            // If the elapsed time (in seconds) has changed
            if (Math.floor(this.currentElapsed / 1000) !== lastDrawnElapsed) {
                // Draw the bar
                await this.draw();
                lastDrawnElapsed = Math.floor(this.currentElapsed / 1000);
            }
            lastElapsedTimestamp = now;
        }, 100);
    }

    public stopClock() {
        if (this.clock != null) {
            clearInterval(this.clock);
        }
    }

    public resize(bounds: Rect) {
        this.bounds = bounds;
    }

    public async draw() {
        // Create a promise to draw the background
        return new Promise<void>(resolve => {
            // Use the middle 80% of the width of the HIDDEN tile sprite (to remove the borders) for the background sprite
            // todo this isn't ideal obviously, it assumes 10% (either side) of the HIDDEN tile is border,
            //  and if the tile has any pattern it'll be stretched
            const backgroundTileSprite = {
                x: SPRITES.TILES.HIDDEN.x + (SPRITES.TILES.HIDDEN.w * 0.1),
                y: SPRITES.TILES.HIDDEN.y,
                w: SPRITES.TILES.HIDDEN.w * 0.8,
                h: SPRITES.TILES.HIDDEN.h
            };

            drawSprite(backgroundTileSprite, this.bounds);
            resolve();
        }).then(() => {
            // todo again, assuming here that the top and bottom 10% is border
            const drawHeight = this.bounds.h * 0.8;
            const drawY = this.bounds.y + ((this.bounds.h / 2) - (drawHeight / 2));

            // Draw the elapsed time
            {
                // todo display in MM:SS format
                const elapsed = formatNumber(Math.floor(this.currentElapsed / 1000), 3, true);

                const drawWidth = numberDrawWidth(elapsed, drawHeight);

                const elapsedDrawPos: Pos = {
                    x: this.bounds.x + ((this.bounds.w / 2) - drawWidth),
                    y: drawY
                };

                drawNumber(elapsed, elapsedDrawPos, drawHeight);

                const clockDrawRect: Rect = {
                    x: elapsedDrawPos.x - drawHeight * 1.1,
                    y: drawY,
                    w: drawHeight,
                    h: drawHeight
                };

                drawSprite(SPRITES.ICONS.CLOCK, clockDrawRect);
            }

            // Draw the remaining mines
            {
                const mineDrawRect: Rect = {
                    x: this.bounds.x + (this.bounds.w / 2),
                    y: drawY,
                    w: drawHeight,
                    h: drawHeight
                };

                drawSprite(SPRITES.ICONS.MINE, mineDrawRect);

                const remainingMinesDrawPos: Pos = {
                    x: mineDrawRect.x + mineDrawRect.w,
                    y: drawY
                };

                if (this.remainingMines === Infinity) {
                    const drawRect: Rect = {
                        ...remainingMinesDrawPos,
                        w: (drawHeight / SPRITES.ICONS.INFINITY.h) * SPRITES.ICONS.INFINITY.w,
                        h: drawHeight
                    };

                    drawSprite(SPRITES.ICONS.INFINITY, drawRect);
                } else {
                    // todo set maxDigits as number of digits in the initial num mines
                    const remainingMines = formatNumber(this.remainingMines, 2, true);

                    drawNumber(remainingMines, remainingMinesDrawPos, drawHeight);
                }
            }

            // Draw the close button
            {
                this.closeHitbox = {
                    x: (this.bounds.x + this.bounds.w) - this.bounds.h,
                    y: this.bounds.y,
                    w: this.bounds.h,
                    h: this.bounds.h
                };

                drawSprite(SPRITES.ICONS.CROSS, this.closeHitbox);
            }
        });
    }

    public registerEvents() {
        canvas.addEventListener('pointerdown', this.handlePointerDown);
    }

    public deregisterEvents() {
        canvas.removeEventListener('pointerdown', this.handlePointerDown);
    }
}