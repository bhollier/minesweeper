import * as worker from './worker-helper'
import {CLOSE_BUTTON} from "./modal";
import RetryModal from "./retry-modal"
import {canvas, ctx, spritesheet, TILE_SIZE} from './util';
import {Pos} from './common';

// Constant for the draw size of a tile
const TILE_DRAW_SIZE = 30

// Constant for the minimum scale
const MIN_SCALE = 0.2
// Constant for the maximum scale
const MAX_SCALE = 4.0

// Constants for the game states
const GAME_STATES = {
    START: "start",
    PLAYING: "playing",
    WIN: "win",
    LOSS: "loss"
}

// The camera settings
const camera = {
    translation: {
        x: 0.0,
        y: 0.0,
    },
    scale: 1.0,
}

// The size of the field
export let fieldSize = null

let activeModal = {
    modal: null,
    hidden: true
}

function unhideModal() {
    activeModal.hidden = false
    activeModal.modal.registerEvents()
    draw()
}

function hideModal() {
    activeModal.hidden = true
    activeModal.modal.deregisterEvents()
    draw()
}

function middleTranslation(): Pos {
    return {
        x: ((canvas.width / 2) -
            (camera.scale * ((fieldSize.x * TILE_DRAW_SIZE) / 2))),
        y: ((canvas.height / 2) -
            (camera.scale * ((fieldSize.y * TILE_DRAW_SIZE) / 2)))
    }
}

function toCanvasPos(x, y: number): Pos {
    const middleTranslate = middleTranslation()
    return {
        x: middleTranslate.x +
            (camera.translation.x + ((x * TILE_DRAW_SIZE) * camera.scale)),
        // Translate to the center of the canvas
        y: middleTranslate.y +
            (camera.translation.y + ((y * TILE_DRAW_SIZE) * camera.scale)),
    }
}
function toWorldPos(x, y: number): Pos {
    const middleTranslate = middleTranslation()
    const rect = canvas.getBoundingClientRect()
    return {
        x: Math.floor(((x - rect.left - middleTranslate.x -
            camera.translation.x) / camera.scale) / TILE_DRAW_SIZE),
        y: Math.floor(((y - rect.left - middleTranslate.y -
            camera.translation.y) / camera.scale) / TILE_DRAW_SIZE),
    }
}

// Create the minesweeper game
export function create(width, height, numMines) {
    activeModal = {
        modal: null,
        hidden: true
    }

    // Set the canvas size
    fieldSize = {
        x: width,
        y: height
    }

    // Fit the game in the canvas
    camera.scale = Math.min(
        canvas.width / (fieldSize.x * TILE_DRAW_SIZE * 1.1),
        canvas.height / (fieldSize.y * TILE_DRAW_SIZE * 1.1))
    // Restrict the scale
    camera.scale = Math.max(camera.scale, MIN_SCALE)
    camera.scale = Math.min(camera.scale, MAX_SCALE)

    // Reset the translation
    camera.translation.x = 0
    camera.translation.y = 0

    // Initialise the board
    worker.postMessage("init", {
        "width": fieldSize.x,
        "height": fieldSize.y,
        "mines": numMines,

        // Once initialised, draw it
    }).then(async () => {
        await draw()
    })
}

function drawAppearance(appearanceData: Array<Array<number>>) {
    // The canvas width and height
    const w = canvas.width, h = canvas.height

    // Clear the canvas (for now)
    ctx.clearRect(0, 0, w, h)

    // Iterate over the tiles
    for (let y = 0; y < fieldSize.y; ++y) {
        for (let x = 0; x < fieldSize.x; ++x) {
            // Calculate the position of the tile on the canvas
            const pos = toCanvasPos(x, y)
            // Draw it
            ctx.drawImage(spritesheet,
                // The position of the sprite
                appearanceData[y][x] * TILE_SIZE, 0,
                // The size of the sprite
                TILE_SIZE, TILE_SIZE,

                // The position of the tile to draw to
                pos.x, pos.y,
                // The size of the tile to draw to
                TILE_DRAW_SIZE * camera.scale, TILE_DRAW_SIZE * camera.scale)
        }
    }

    // todo pagination
    // todo draw bar
}

// Draw the game
export async function draw() {
    worker.postMessage("appearance").then(appearancePayload => {
        drawAppearance(appearancePayload)
    }).then(async () => {
        if (activeModal.modal && !activeModal.hidden) {
            await activeModal.modal.draw()
        }
    })
}

// The draw function with a limiter, to prevent flickering when resizing
const drawWithLimit = Util.limiter(draw, 100)

function handleState(stateData) {
    if (stateData.state === GAME_STATES.LOSS) {
        Util.consoleLog("Loss detected, displaying retry modal")
        setTimeout(async () => {
            // Display the modal
            activeModal.modal = new RetryModal()
            activeModal.hidden = false
            await draw()

            // Display after 1s so the user can see the field for a bit
        }, 1000)
    }
}

function preventDefault(e) {
    e.preventDefault()
}

// Register the game's events
export function registerEvents() {
    window.addEventListener("resize", drawWithLimit)
    canvas.addEventListener("wheel", handleWheel)
    canvas.addEventListener("contextmenu", preventDefault)

    canvas.addEventListener("pointerdown", handlePointerDown)
    canvas.addEventListener("pointermove", handlePointerMove)
    canvas.addEventListener("pointerout", handlePointerOut)
    canvas.addEventListener("pointerup", handlePointerUp)
}

// Deregister the game's events
export function deregisterEvents() {
    window.removeEventListener("resize", drawWithLimit)
    canvas.removeEventListener("wheel", handleWheel)
    canvas.removeEventListener("contextmenu", preventDefault)

    canvas.removeEventListener("pointerdown", handlePointerDown)
    canvas.removeEventListener("pointermove", handlePointerMove)
    canvas.removeEventListener("pointerout", handlePointerOut)
    canvas.removeEventListener("pointerup", handlePointerUp)
}

// Callback function to handle 'wheel' events, for zooming
function handleWheel(event) {
    // Change the camera's scale
    const newScale = camera.scale + (event.deltaY * -0.005)
    // Only change the scale if it's valid
    if (newScale > MIN_SCALE && newScale < MAX_SCALE) {
        camera.scale = newScale
        // Redraw
        draw()
    }
}

let pointerDownEvent = null

// Constant for how long a pointer needs to be pressed to be a "long press", in
// milliseconds
const LONG_PRESS_DELAY_MS = 200

// Callback function to handle 'pointerdown' events
function handlePointerDown(event) {
    event.preventDefault()

    // If there is a modal open
    if (!activeModal?.hidden) {
        // If the user pressed the close button on the modal
        const pressedButton = activeModal.modal.pressedElement(event)
        if (pressedButton === CLOSE_BUTTON) {
            // Hide the modal
            hideModal()
        }
        return
    }

    // If this is the first pointer event
    if (pointerDownEvent == null) {
        // Create the pointerdown event info
        pointerDownEvent = {
            touches: [],
            moveOrScale: false,
            distance: null,
            // Time out for long presses
            timeout: setTimeout(() => {
                // Make sure there was a pointer down event
                if (pointerDownEvent == null || pointerDownEvent.moveOrScale) {
                    return
                }

                // Send a flag event
                const pos = toWorldPos(
                    pointerDownEvent.touches[0].clientX,
                    pointerDownEvent.touches[0].clientY)
                worker.postMessage("flag", pos)
                    .then(draw)

                pointerDownEvent = null
            }, LONG_PRESS_DELAY_MS)
        }
    }

    // Add the pointer event
    pointerDownEvent.touches.push(event)
}

// Callback function to handle 'pointermove' events
function handlePointerMove(event) {
    event.preventDefault()
    if (pointerDownEvent == null) {
        return
    }
    if (!activeModal?.hidden) {
        return
    }

    // If there's only one touch event
    if (pointerDownEvent.touches.length === 1) {
        // Calculate the amount the pointer moved
        const deltaX = event.clientX -
            pointerDownEvent.touches[0].clientX
        const deltaY = event.clientY -
            pointerDownEvent.touches[0].clientY
        // Don't register as a moveOrScale event if the pointer only moved half a tile (no
        // scaling)
        if (!pointerDownEvent.moveOrScale &&
            Math.abs(deltaX) < TILE_DRAW_SIZE / 4 &&
            Math.abs(deltaY) < TILE_DRAW_SIZE / 4) {
            return
        }
        // Translate the camera
        camera.translation.x += deltaX
        camera.translation.y += deltaY

        // Restrict the camera
        const maxX = (fieldSize.x * TILE_DRAW_SIZE * camera.scale) / 2
        const maxY = (fieldSize.y * TILE_DRAW_SIZE * camera.scale) / 2

        camera.translation.x = Math.min(camera.translation.x, maxX)
        camera.translation.x = Math.max(camera.translation.x, -maxX)
        camera.translation.y = Math.min(camera.translation.y, maxY)
        camera.translation.y = Math.max(camera.translation.y, -maxY)

        // If there's multiple, this is a pinch event
    } else {
        // Get the two touch events (we only care about the first two, even if
        // the user has more than 2 fingers pressed on the screen)
        const touch0 = pointerDownEvent.touches[0]
        const touch1 = pointerDownEvent.touches[1]

        // Calculate the distance between the two touch events
        const distance = Math.hypot(
            touch0.clientX - touch1.clientX,
            touch0.clientY - touch1.clientY)

        // If a previous distance has been calculated
        if (pointerDownEvent.distance != null) {
            // Calculate the new scale
            camera.scale += ((distance - pointerDownEvent.distance) * 0.005)

            // Restrict the scale
            camera.scale = Math.max(camera.scale, MIN_SCALE)
            camera.scale = Math.min(camera.scale, MAX_SCALE)
        }

        // Set the distance
        pointerDownEvent.distance = distance
    }

    // Set the pointer as having moved (so the user doesn't flag something by
    // dragging)
    pointerDownEvent.moveOrScale = true

    // Update the event
    const touchIndex = pointerDownEvent.touches.findIndex(
        e => e.pointerId === event.pointerId)
    pointerDownEvent.touches[touchIndex] = event

    // Redraw
    draw()
}

// Callback function to handle 'pointerout' events
function handlePointerOut(event) {
    event.preventDefault()
    // Make sure there was a pointer down event
    if (pointerDownEvent == null) {
        return
    }

    // If there are multiple pointers
    if (pointerDownEvent.touches.length > 1) {
        // Remove the pointer's touch
        pointerDownEvent.touches = pointerDownEvent.touches.filter(
            e => e.pointerId !== event.pointerId)
        // Remove the distance
        pointerDownEvent.distance = null

        // Otherwise
    } else {
        // Clear the event
        clearTimeout(pointerDownEvent.timeout)
        pointerDownEvent = null
    }
}

// Callback function to handle 'pointerup' events
function handlePointerUp(event) {
    event.preventDefault()
    // Make sure there was a pointer down event
    if (pointerDownEvent == null) {
        return
    }

    // If there are multiple pointers
    if (pointerDownEvent.touches.length > 1) {
        // Remove the pointer's touch
        pointerDownEvent.touches = pointerDownEvent.touches.filter(
            e => e.pointerId !== event.pointerId)
        // Remove the distance
        pointerDownEvent.distance = null
        return

        // If the pointer didn't moveOrScale (and there's one pointer)
    } else if (!pointerDownEvent.moveOrScale) {
        // If there is a modal
        if (activeModal.modal) {
            // Unhide it
            unhideModal()

            // Otherwise
        } else {
            // Convert the pointer position to world coordinates
            const pos = toWorldPos(
                pointerDownEvent.touches[0].clientX,
                pointerDownEvent.touches[0].clientY)

            // Left mouse button
            if (event.button === 0) {
                worker.postMessage("uncover", pos)
                    .then(async state => {
                        await draw()
                        handleState(state)
                    })

                // Right mouse button
            } else if (event.button === 2) {
                worker.postMessage("flag", pos)
                    .then(async () => {
                        await draw()
                    })
            }
        }
    }

    // Clear the event
    clearTimeout(pointerDownEvent.timeout)
    pointerDownEvent = null
}