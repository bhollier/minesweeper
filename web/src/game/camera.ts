import {SPRITES, canvas, drawSprite} from '../draw';

import EventManager from '../event-manager';

import * as Util from '../util';
import {Pos, Rect, Size, intersect} from '../common';

function consoleLog(s) {
    Util.consoleLog('(camera) ' + s);
}

// todo translate/scale on window resize

// Constant for the draw size of a tile
const TILE_DRAW_SIZE = 30;

// todo might be better if scaling were based on canvas size
// Constant for the minimum scale
const MIN_SCALE = 1.0;
// Constant for the maximum scale
const MAX_SCALE = 4.0;

// Constant for the default scale (e.g. for infinite mode)
const DEFAULT_SCALE = 2.0;

const MOUSE_WHEEL_SCALE_FACTOR = 0.8;

// Constant for how long a pointer needs to be pressed to be a "long press", in
// milliseconds
const LONG_PRESS_DELAY_MS = 200;

// Constant for the minimum amount the mouse has to move to be considered a move event
const MIN_MOUSE_MOVE_DISTANCE = 5;

// Constant for how long after a press event another
// press event can be triggered (to prevent spamming)
const PRESS_LIMIT_MS = 50;

// todo pass useful information here, e.g. delta scale/translation
export type MoveEvent = Record<string, never>

export type PressEvent = {
    pos: Pos
    button: number
}

interface CameraEventMap {
    // A move event includes zooming in or out
    'move': MoveEvent
    'press': PressEvent
    'longpress': PressEvent
}

export default class Camera extends EventManager<CameraEventMap> {
    private bounds: Rect;
    private readonly fieldSize: Size | undefined;

    private translation: Pos;
    private scale: number;

    private pointerDownEvent : {
        touches: Array<PointerEvent>
        moveOrScale: boolean,
        moveDistance: number,
        pinchDistance: number | null,
        longPressTimeout: ReturnType<typeof setTimeout> | null
    };

    private lastPressTimestamp;

    private readonly handleWheel;
    private readonly handlePointerDown;
    private readonly handlePointerMove;
    private readonly handlePointerCancel;
    private readonly handlePointerOut;
    private readonly handlePointerUp;

    // todo bounding box (for top bar)
    constructor(bounds: Rect, fieldSize?: Size) {
        super();

        this.bounds = bounds;
        this.fieldSize = fieldSize;

        // Reset the camera
        this.reset();

        this.pointerDownEvent = {
            touches: [],
            moveOrScale: false,
            moveDistance: 0,
            pinchDistance: null,
            longPressTimeout: null
        };

        this.lastPressTimestamp = 0;

        this.handleWheel = (event : WheelEvent) => {
            if (this.intersect(event)) {
                event.preventDefault();

                // Calculate the scale factor
                const factor = event.deltaY > 0 ? MOUSE_WHEEL_SCALE_FACTOR : 1 / MOUSE_WHEEL_SCALE_FACTOR;

                // Zoom the camera
                this.zoom(factor, event.clientX, event.clientY);
            }
        };

        this.handlePointerDown = (event: PointerEvent) => {
            // We only care about pointers that are in the bounds of the camera
            if (this.intersect(event)) {
                event.preventDefault();

                // If this is the first pointer event
                if (this.pointerDownEvent.touches.length == 0) {
                    consoleLog('first pointerdown');
                    // Set the timeout for long presses
                    this.pointerDownEvent.longPressTimeout = setTimeout(() => {
                        // Make sure there was a pointer down event
                        if (this.pointerDownEvent.touches.length === 0 ||
                            this.pointerDownEvent.moveOrScale) {
                            return;
                        }
                        consoleLog('longpress timeout');

                        // Call the event listeners
                        this.callEventListeners('longpress', {
                            pos: this.toWorldPos(
                                this.pointerDownEvent.touches[0].clientX,
                                this.pointerDownEvent.touches[0].clientY),
                            button: event.button
                        });
                    }, LONG_PRESS_DELAY_MS);
                    // Reset the other fields
                    this.pointerDownEvent.moveOrScale = false;
                    this.pointerDownEvent.moveDistance = 0;
                    this.pointerDownEvent.pinchDistance = null;
                } else {
                    consoleLog('another pointerdown');
                }

                // Add the pointer event
                this.pointerDownEvent.touches.push(event);
            }
        };

        this.handlePointerMove = (event: PointerEvent) => {
            if (this.pointerDownEvent.touches.length === 0) {
                return;
            }

            // Get the index of the previous touch event
            const previousTouchIndex = this.pointerDownEvent.touches.findIndex(
                e => e.pointerId === event.pointerId);
            if (previousTouchIndex === -1) {
                return;
            }
            event.preventDefault();

            // Save the previous touch
            const previousTouch = this.pointerDownEvent.touches[previousTouchIndex];
            // Update the touch event
            this.pointerDownEvent.touches[previousTouchIndex] = event;

            // If there's only one touch event
            if (this.pointerDownEvent.touches.length === 1) {
                // Calculate the amount the pointer moved
                const delta = {
                    x: event.clientX - previousTouch.clientX,
                    y: event.clientY - previousTouch.clientY
                };
                const distance = Math.hypot(delta.x, delta.y);

                // Add it to the move distance
                this.pointerDownEvent.moveDistance += distance;

                // Don't register as a moveOrScale event if the pointer didn't move much
                // todo maybe reset long press timeout if the delta is > 0
                if (!this.pointerDownEvent.moveOrScale &&
                    this.pointerDownEvent.moveDistance < MIN_MOUSE_MOVE_DISTANCE) {
                    return;
                }

                // Translate the camera
                this.translation.x += delta.x;
                this.translation.y += delta.y;

                // Restrict the camera if the field is fixed size
                if (this.fieldSize !== undefined) {
                    const fieldRealSize = {
                        x: this.fieldSize.w * TILE_DRAW_SIZE * this.scale,
                        y: this.fieldSize.h * TILE_DRAW_SIZE * this.scale,
                    };

                    // At least half the field must be visible
                    const min = {
                        x: (this.bounds.w / 2) - fieldRealSize.x,
                        y: (this.bounds.h / 2) - fieldRealSize.y
                    };
                    const max = {
                        x: this.bounds.w / 2,
                        y: this.bounds.h / 2
                    };

                    // Limit the translation
                    this.translation.x = Math.min(this.translation.x, max.x);
                    this.translation.x = Math.max(this.translation.x, min.x);
                    this.translation.y = Math.min(this.translation.y, max.y);
                    this.translation.y = Math.max(this.translation.y, min.y);
                }

                // If there's multiple, this is a pinch event
            } else {
                // Get the two touch events (we only care about the first two, even if
                // the user has more than 2 fingers pressed on the screen)
                const touch0 = this.pointerDownEvent.touches[0];
                const touch1 = this.pointerDownEvent.touches[1];

                // Calculate the distance between the two touch events
                const distance = Math.hypot(
                    touch0.clientX - touch1.clientX,
                    touch0.clientY - touch1.clientY);

                // If a previous pinch distance has been calculated
                if (this.pointerDownEvent.pinchDistance != null) {
                    // Calculate the scale factor
                    const factor = distance / this.pointerDownEvent.pinchDistance;

                    // Calculate the center of the zoom
                    const center = {
                        x: (touch0.clientX + touch1.clientX) / 2,
                        y: (touch0.clientY + touch1.clientY) / 2
                    };

                    // Zoom the camera around the center
                    this.zoom(factor, center.x, center.y);
                }

                // Set the distance
                this.pointerDownEvent.pinchDistance = distance;
            }

            // Set the pointer as having moved (so the user doesn't flag something by
            // dragging)
            if (!this.pointerDownEvent.moveOrScale) {
                consoleLog('pointer moved, not press event');
                this.pointerDownEvent.moveOrScale = true;
                clearTimeout(this.pointerDownEvent.longPressTimeout);
            }

            // Call the event listeners
            this.callEventListeners('move', {});
        };

        this.handlePointerCancel = (event: PointerEvent) => {
            // todo
            consoleLog('pointercancel');
        };
        
        this.handlePointerOut = (event: PointerEvent) => {
            // Make sure there was a pointer down event
            if (this.pointerDownEvent.touches.length == 0) {
                return;
            }

            const touchIndex = this.pointerDownEvent.touches.findIndex(
                e => e.pointerId === event.pointerId);
            if (touchIndex === -1) {
                return;
            }

            event.preventDefault();

            // If there are multiple pointers
            if (this.pointerDownEvent.touches.length > 1) {
                consoleLog('pointerout: one of multiple');
                // Remove the pointer's touch
                this.pointerDownEvent.touches = this.pointerDownEvent.touches.filter(
                    e => e.pointerId !== event.pointerId);
                // Remove the pinch distance
                this.pointerDownEvent.pinchDistance = null;
            } else {
                consoleLog('pointerout: no press event');
                // Clear the event
                clearTimeout(this.pointerDownEvent.longPressTimeout);
                this.pointerDownEvent.touches = [];
            }
        };

        this.handlePointerUp = (event: PointerEvent) => {
            // Make sure there was a pointer down event
            if (this.pointerDownEvent.touches.length === 0) {
                return;
            }

            const touchIndex = this.pointerDownEvent.touches.findIndex(
                e => e.pointerId === event.pointerId);
            if (touchIndex === -1) {
                return;
            }

            event.preventDefault();

            // If there are multiple pointers
            if (this.pointerDownEvent.touches.length > 1) {
                consoleLog('pointerup: one of multiple');
                // Remove the pointer's touch
                this.pointerDownEvent.touches = this.pointerDownEvent.touches.filter(
                    e => e.pointerId !== event.pointerId);
                // Remove the distance
                this.pointerDownEvent.pinchDistance = null;
                return;
            }

            // If the pointer didn't moveOrScale
            if (!this.pointerDownEvent.moveOrScale) {
                consoleLog('pointerup: no movement or scaling, press event');
                const now = Date.now();
                if (now - this.lastPressTimestamp > PRESS_LIMIT_MS) {
                    this.lastPressTimestamp = now;
                    // Call the event listeners
                    this.callEventListeners('press', {
                        pos: this.toWorldPos(
                            this.pointerDownEvent.touches[0].clientX,
                            this.pointerDownEvent.touches[0].clientY),
                        button: event.button
                    });
                } else {
                    consoleLog(`last press was ${now - this.lastPressTimestamp}ms ago, no event (min${PRESS_LIMIT_MS}ms)`);
                }
            } else {
                consoleLog('pointerup');
            }

            // Clear the event
            clearTimeout(this.pointerDownEvent.longPressTimeout);
            this.pointerDownEvent.touches = [];
        };

        this.registerEvents();
    }

    private intersect(event: MouseEvent): boolean {
        return intersect({x: event.clientX, y: event.clientY}, this.bounds);
    }

    // Returns the translation so the game field is in the middle of the bounds
    private middleTranslation(): Pos {
        // If there's no field size, the middle is just 0, 0
        if (this.fieldSize === undefined) {
            return {x: 0, y: 0};
        }
        return {
            x: (this.bounds.w / 2) - (this.scale * ((this.fieldSize.w * TILE_DRAW_SIZE) / 2)),
            y: (this.bounds.h / 2) - (this.scale * ((this.fieldSize.h * TILE_DRAW_SIZE) / 2))
        };
    }

    public toCanvasPos(x, y: number): Pos {
        return {
            x: this.bounds.x + this.translation.x + (x * TILE_DRAW_SIZE * this.scale),
            y: this.bounds.y + this.translation.y + (y * TILE_DRAW_SIZE * this.scale),
        };
    }

    public toWorldPos(x, y: number): Pos {
        return {
            x: Math.floor(((x - this.translation.x - this.bounds.x) / this.scale) / TILE_DRAW_SIZE),
            y: Math.floor(((y - this.translation.y - this.bounds.y) / this.scale) / TILE_DRAW_SIZE),
        };
    }

    // Zooms the camera by the given factor around the given point
    private zoom(factor: number, x, y: number): void {
        // Calculate the camera's new scale
        const newScale = this.scale * factor;

        // Only change the scale if it's valid
        if (newScale > MIN_SCALE && newScale < MAX_SCALE) {
            // Translate the field so the mouse is still over the same tile
            this.translation.x -= (x - this.translation.x) * (factor - 1);
            this.translation.y -= (y - this.translation.y) * (factor - 1);

            // Set the new scale
            this.scale = newScale;

            // Call the event listeners
            this.callEventListeners('move', {});
        }
    }

    public async draw(tileData: Array<Array<string>>) {
        // Iterate over the visible tiles
        const visibleRect = this.visibleTiles;
        for (let y = visibleRect.y; y < visibleRect.y + visibleRect.h; y++) {
            for (let x = visibleRect.x; x < visibleRect.x + visibleRect.w; x++) {
                if (tileData[y] && tileData[y][x]) {
                    // Get the sprite
                    const sprite = SPRITES.TILES[tileData[y][x]];
                    // Calculate the position of the tile on the canvas
                    const pos = this.toCanvasPos(x, y);
                    drawSprite(sprite, {
                        // The position of the tile to draw to
                        x: pos.x, y: pos.y,
                        // The size of the tile to draw to
                        w: TILE_DRAW_SIZE * this.scale, h: TILE_DRAW_SIZE * this.scale
                    });
                }
            }
        }
    }

    public get visibleTiles(): Rect {
        const min = this.toWorldPos(this.bounds.x, this.bounds.y);
        const max = this.toWorldPos(this.bounds.x + this.bounds.w, this.bounds.y + this.bounds.h);
        return {
            x: min.x - 1,
            y: min.y - 1,
            w: max.x - min.x + 2,
            h: max.y - min.y + 2,
        };
    }

    // Reset the camera to the middle of the field
    public reset() {
        // If the field size is set
        if (this.fieldSize !== undefined) {
            // Fit the game in the bounds
            this.scale = Math.min(
                this.bounds.w / (this.fieldSize.w * TILE_DRAW_SIZE * 1.1),
                this.bounds.h / (this.fieldSize.h * TILE_DRAW_SIZE * 1.1));
            // Restrict the scale
            this.scale = Math.max(this.scale, MIN_SCALE);
            this.scale = Math.min(this.scale, MAX_SCALE);

            // Otherwise set the scale to the default
        } else {
            this.scale = DEFAULT_SCALE;
        }

        // Translate to the middle
        this.translation = this.middleTranslation();
    }

    // Resize the camera's bounding box
    public resize(bounds: Rect) {
        // Translate the canvas
        this.translation.x += (bounds.w - this.bounds.w) / 2;
        this.translation.y += (bounds.h - this.bounds.h) / 2;

        // Set the new bounds
        this.bounds = bounds;
    }

    public registerEvents() {
        canvas.addEventListener('wheel', this.handleWheel);
        canvas.addEventListener('pointerdown', this.handlePointerDown);
        canvas.addEventListener('pointermove', this.handlePointerMove);
        canvas.addEventListener('pointercancel', this.handlePointerCancel);
        canvas.addEventListener('pointerout', this.handlePointerOut);
        canvas.addEventListener('pointerup', this.handlePointerUp);
    }

    public deregisterEvents() {
        canvas.removeEventListener('wheel', this.handleWheel);
        canvas.removeEventListener('pointerdown', this.handlePointerDown);
        canvas.removeEventListener('pointermove', this.handlePointerMove);
        canvas.removeEventListener('pointercancel', this.handlePointerCancel);
        canvas.removeEventListener('pointerout', this.handlePointerOut);
        canvas.removeEventListener('pointerup', this.handlePointerUp);
    }

}