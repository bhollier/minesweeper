import Menu, {Element} from "./menu";
import * as Game from "./game";
import {canvas, ctx, limiter, ROW_HEIGHT} from './util';

const TITLE: Element = {
    sprite: {
        x: 0,
        y: 10,
        w: 95,
        h: ROW_HEIGHT
    },
    scale: 1,
}

const EASY_BUTTON: Element = {
    sprite: {
        x: 0,
        y: 20,
        w: 26,
        h: ROW_HEIGHT
    },
    hoveredSprite: {
        x: 26,
        y: 20
    },
    scale: 1.25,
    interactable: true
}

const MEDIUM_BUTTON: Element = {
    sprite: {
        x: 0,
        y: 30,
        w: 35,
        h: ROW_HEIGHT
    },
    hoveredSprite: {
        x: 35,
        y: 30
    },
    scale: 1.25,
    interactable: true
}

const HARD_BUTTON: Element = {
    sprite: {
        x: 0,
        y: 40,
        w: 25,
        h: ROW_HEIGHT
    },
    hoveredSprite: {
        x: 25,
        y: 40
    },
    scale: 1.25,
    interactable: true
}

const CUSTOM_BUTTON: Element = {
    sprite: {
        x: 0,
        y: 50,
        w: 38,
        h: ROW_HEIGHT
    },
    hoveredSprite: {
        x: 38,
        y: 50
    },
    scale: 1.25,
    interactable: false // todo
}

// The elements, in order of how they're displayed on screen (top down)
const ELEMENTS: Array<Element> = [TITLE, EASY_BUTTON, MEDIUM_BUTTON, HARD_BUTTON, CUSTOM_BUTTON]

const menu = new Menu(ELEMENTS)

// Draws the menu to the given canvas context
export async function draw() {
    return new Promise<void>(resolve => {
        // Clear the canvas (for now)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        resolve()
    }).then(menu.draw.bind(menu))
}

// The draw function with a limiter, to prevent flickering when resizing
const drawWithLimit = limiter(draw, 100)

// Register the menu's events
export function registerEvents() {
    window.addEventListener("resize", drawWithLimit)
    canvas.addEventListener("pointermove", handlePointerMove)
    canvas.addEventListener("pointerdown", handlePointerDown)
}

// Deregister the menu's events
export function deregisterEvents() {
    window.removeEventListener("resize", drawWithLimit)
    canvas.removeEventListener("pointermove", handlePointerMove)
    canvas.removeEventListener("pointerdown", handlePointerDown)
}

// Callback function to handle 'pointermove' events. Purely for showing the
// element as hovered
export function handlePointerMove(event: PointerEvent) {
    if (menu.pointerHoveringNewElement(event)) {
        menu.draw()
    }
}

export async function handlePointerDown(event: PointerEvent) {
    const pressedButton = menu.pressedElement(event)
    if (pressedButton) {
        // Deregister the menu events
        deregisterEvents()

        // Determine the width, height and number of mines
        let width, height, numMines
        switch (pressedButton) {
            case EASY_BUTTON:
                width = 9
                height = 9
                numMines = 10
                break
            case MEDIUM_BUTTON:
                width = 16
                height = 16
                numMines = 40
                break
            case HARD_BUTTON:
                width = 30
                height = 16
                numMines = 99
                break
        }

        // Once the worker has been connected
        Game.create(width, height, numMines)
        Game.registerEvents()
    }
}