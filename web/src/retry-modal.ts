import Modal from './modal'
import {Element} from './menu'
import * as Util from "./util.js";
import {canvas} from './util.js';

export const TITLE: Element = {
    sprite: {
        x: 0,
        y: 60,
        w: 45,
        h: Util.ROW_HEIGHT
    },
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
        canvas.addEventListener("pointerdown", this.#handlePointerDown)
    }

    deregisterEvents() {
        canvas.removeEventListener("pointerdown", this.#handlePointerDown)
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