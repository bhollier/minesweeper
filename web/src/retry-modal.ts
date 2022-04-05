import Modal from './modal'
import {Element} from './menu'
import {canvas, SPRITES} from "./draw";

export const TITLE: Element = {
    sprite: SPRITES.RETRY_MENU.TITLE,
    scale: 1,
}

// The elements, in order of how they're displayed on screen (top down)
const ELEMENTS: Array<Element> = [TITLE]

export default class RetryModal extends Modal {
    constructor() {
        super(ELEMENTS)
        this.registerEvents()
    }

    registerEvents() {
        canvas.addEventListener("pointerdown", this.#handlePointerDown.bind(this))
    }

    deregisterEvents() {
        canvas.removeEventListener("pointerdown", this.#handlePointerDown.bind(this))
    }

    #handlePointerDown(event: PointerEvent) {
        const pressedButton = this.pressedElement(event)
        if (pressedButton) {
            switch (pressedButton) {
                // Hiding the modal is handled in game.ts
                // todo handle actual options
            }
        }
    }
}