import {Pos, Size} from './common';
import EventManager from './event-manager';
import {canvas} from './draw';

// Constant for the draw size of a tile
export const TILE_DRAW_SIZE = 30;

// Constant for the minimum scale
export const MIN_SCALE = 0.2;
// Constant for the maximum scale
export const MAX_SCALE = 4.0;

// Constant for how long a pointer needs to be pressed to be a "long press", in
// milliseconds
export const LONG_PRESS_DELAY_MS = 200;

export type MoveEvent = {
    translation: Pos
    scale: number
}

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
    private fieldSize: Size;

    #translation: Pos;
    #scale: number;

    private pointerDownEvent : {
        touches: Array<PointerEvent>
        moveOrScale: boolean,
        distance: number | null,
        timeout: ReturnType<typeof setTimeout>
    } | null;

    private readonly handleWheel;
    private readonly handlePointerDown;
    private readonly handlePointerMove;
    private readonly handlePointerOut;
    private readonly handlePointerUp;

    constructor(fieldSize: Size) {
        super();

        this.fieldSize = fieldSize;

        // Reset the camera
        this.reset();

        this.pointerDownEvent = null;

        this.handleWheel = (event : WheelEvent) => {
            // Change the camera's scale
            const newScale = this.#scale + (event.deltaY * -0.005);
            // Only change the scale if it's valid
            if (newScale > MIN_SCALE && newScale < MAX_SCALE) {
                this.#scale = newScale;

                // Call the event listeners
                this.callEventListeners('move', {
                    translation: this.#translation,
                    scale: this.#scale
                });
            }
            // todo zoom at mouse position
        };

        this.handlePointerDown = (event: PointerEvent) => {
            event.preventDefault();

            // If this is the first pointer event
            if (this.pointerDownEvent == null) {
                // Create the pointerdown event info
                this.pointerDownEvent = {
                    touches: [],
                    moveOrScale: false,
                    distance: null,
                    // Time out for long presses
                    timeout: setTimeout(() => {
                        // Make sure there was a pointer down event
                        if (this.pointerDownEvent == null || this.pointerDownEvent.moveOrScale) {
                            return;
                        }

                        // Call the event listeners
                        this.callEventListeners('longpress', {
                            pos: this.toWorldPos(
                                this.pointerDownEvent.touches[0].clientX,
                                this.pointerDownEvent.touches[0].clientY),
                            button: event.button
                        });

                        this.pointerDownEvent = null;
                    }, LONG_PRESS_DELAY_MS)
                };
            }

            // Add the pointer event
            this.pointerDownEvent.touches.push(event);
        };

        this.handlePointerMove = (event: PointerEvent) => {
            event.preventDefault();
            if (this.pointerDownEvent == null) {
                return;
            }

            // If there's only one touch event
            if (this.pointerDownEvent.touches.length === 1) {
                // Calculate the amount the pointer moved
                const deltaX = event.clientX -
                    this.pointerDownEvent.touches[0].clientX;
                const deltaY = event.clientY -
                    this.pointerDownEvent.touches[0].clientY;
                // Don't register as a moveOrScale event if the pointer only moved half a tile (no
                // scaling)
                if (!this.pointerDownEvent.moveOrScale &&
                    Math.abs(deltaX) < TILE_DRAW_SIZE / 4 &&
                    Math.abs(deltaY) < TILE_DRAW_SIZE / 4) {
                    return;
                }
                // Translate the camera
                this.#translation.x += deltaX;
                this.#translation.y += deltaY;

                // Restrict the camera
                const maxX = (this.fieldSize.w * TILE_DRAW_SIZE * this.#scale) / 2;
                const maxY = (this.fieldSize.h * TILE_DRAW_SIZE * this.#scale) / 2;

                this.#translation.x = Math.min(this.#translation.x, maxX);
                this.#translation.x = Math.max(this.#translation.x, -maxX);
                this.#translation.y = Math.min(this.#translation.y, maxY);
                this.#translation.y = Math.max(this.#translation.y, -maxY);

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

                // If a previous distance has been calculated
                if (this.pointerDownEvent.distance != null) {
                    // Calculate the new scale
                    this.#scale += ((distance - this.pointerDownEvent.distance) * 0.005);

                    // Restrict the scale
                    this.#scale = Math.max(this.#scale, MIN_SCALE);
                    this.#scale = Math.min(this.#scale, MAX_SCALE);

                    // todo zoom at touch position
                }

                // Set the distance
                this.pointerDownEvent.distance = distance;
            }

            // Set the pointer as having moved (so the user doesn't flag something by
            // dragging)
            this.pointerDownEvent.moveOrScale = true;

            // Update the event
            const touchIndex = this.pointerDownEvent.touches.findIndex(
                e => e.pointerId === event.pointerId);
            this.pointerDownEvent.touches[touchIndex] = event;

            // Call the event listeners
            this.callEventListeners('move', {
                translation: this.#translation,
                scale: this.#scale
            });
        };

        this.handlePointerOut = (event: PointerEvent) => {
            event.preventDefault();
            // Make sure there was a pointer down event
            if (this.pointerDownEvent == null) {
                return;
            }

            // If there are multiple pointers
            if (this.pointerDownEvent.touches.length > 1) {
                // Remove the pointer's touch
                this.pointerDownEvent.touches = this.pointerDownEvent.touches.filter(
                    e => e.pointerId !== event.pointerId);
                // Remove the distance
                this.pointerDownEvent.distance = null;

                // Otherwise
            } else {
                // Clear the event
                clearTimeout(this.pointerDownEvent.timeout);
                this.pointerDownEvent = null;
            }
        };

        this.handlePointerUp = (event: PointerEvent) => {
            event.preventDefault();
            // Make sure there was a pointer down event
            if (this.pointerDownEvent == null) {
                return;
            }

            // If there are multiple pointers
            if (this.pointerDownEvent.touches.length > 1) {
                // Remove the pointer's touch
                this.pointerDownEvent.touches = this.pointerDownEvent.touches.filter(
                    e => e.pointerId !== event.pointerId);
                // Remove the distance
                this.pointerDownEvent.distance = null;
                return;

                // If the pointer didn't moveOrScale (and there's one pointer)
            } else if (!this.pointerDownEvent.moveOrScale) {
                // Call the event listeners
                this.callEventListeners('press', {
                    pos: this.toWorldPos(
                        this.pointerDownEvent.touches[0].clientX,
                        this.pointerDownEvent.touches[0].clientY),
                    button: event.button
                });
            }

            // Clear the event
            clearTimeout(this.pointerDownEvent.timeout);
            this.pointerDownEvent = null;
        };

        this.registerEvents();
    }

    private middleTranslation(): Pos {
        return {
            x: ((canvas.width / 2) -
                (this.scale * ((this.fieldSize.w * TILE_DRAW_SIZE) / 2))),
            y: ((canvas.height / 2) -
                (this.scale * ((this.fieldSize.h * TILE_DRAW_SIZE) / 2)))
        };
    }

    public get translation() {
        return this.#translation;
    }

    public get scale() {
        return this.#scale;
    }

    public toCanvasPos(x, y: number): Pos {
        const middleTranslate = this.middleTranslation();
        return {
            x: middleTranslate.x +
                (this.translation.x + ((x * TILE_DRAW_SIZE) * this.scale)),
            // Translate to the center of the canvas
            y: middleTranslate.y +
                (this.translation.y + ((y * TILE_DRAW_SIZE) * this.scale)),
        };
    }

    public toWorldPos(x, y: number): Pos {
        const middleTranslate = this.middleTranslation();
        const rect = canvas.getBoundingClientRect();
        return {
            x: Math.floor(((x - rect.left - middleTranslate.x -
                this.translation.x) / this.scale) / TILE_DRAW_SIZE),
            y: Math.floor(((y - rect.left - middleTranslate.y -
                this.translation.y) / this.scale) / TILE_DRAW_SIZE),
        };
    }

    // Reset the camera to the middle of the field
    public reset() {
        // Fit the game in the canvas
        this.#scale = Math.min(
            canvas.width / (this.fieldSize.w * TILE_DRAW_SIZE * 1.1),
            canvas.height / (this.fieldSize.h * TILE_DRAW_SIZE * 1.1));
        // Restrict the scale
        this.#scale = Math.max(this.#scale, MIN_SCALE);
        this.#scale = Math.min(this.#scale, MAX_SCALE);

        // Reset the translation
        this.#translation = {x: 0, y: 0};
    }

    public registerEvents() {
        canvas.addEventListener('wheel', this.handleWheel);
        canvas.addEventListener('pointerdown', this.handlePointerDown);
        canvas.addEventListener('pointermove', this.handlePointerMove);
        canvas.addEventListener('pointerout', this.handlePointerOut);
        canvas.addEventListener('pointerup', this.handlePointerUp);
    }

    public deregisterEvents() {
        canvas.removeEventListener('wheel', this.handleWheel);
        canvas.removeEventListener('pointerdown', this.handlePointerDown);
        canvas.removeEventListener('pointermove', this.handlePointerMove);
        canvas.removeEventListener('pointerout', this.handlePointerOut);
        canvas.removeEventListener('pointerup', this.handlePointerUp);
    }

}