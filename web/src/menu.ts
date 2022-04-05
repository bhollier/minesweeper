import {Pos, Rect} from './common';
import * as Util from "./util";

export type Hitbox = Rect

export type Element = {
    sprite: Rect,
    hoveredSprite?: Pos,
    scale: number,
    interactable?: boolean
}

const biggestElementByField = (elements: Array<Element>, field: string) =>
    elements.reduce((prev, curr) =>
        prev.sprite[field] * prev.scale > curr.sprite[field] * curr.scale ? prev : curr)

function getAbsPos(x, y: number) {
    const rect = Util.ctx.canvas.getBoundingClientRect()
    return [Math.round(x - rect.left), Math.round(y - rect.top)]
}

function intersect(x, y: number, hitbox: Hitbox) {
    return x > hitbox.x && y > hitbox.y &&
        x < hitbox.x + hitbox.w && y < hitbox.y + hitbox.h
}

// Class for a very simple menu, where each "element" is drawn top down, equally spaced
export default class Menu {
    #elements: Array<Element>
    #tallestElement: Element
    #longestElement: Element

    elementHitboxes: Map<Element, Hitbox>
    hoveredElement: Element | null

    constructor(elements: Array<Element>) {
        this.#elements = elements
        this.#tallestElement = biggestElementByField(elements, "h")
        this.#longestElement = biggestElementByField(elements, "w")

        this.elementHitboxes = new Map()
        this.hoveredElement = null
    }

    async draw(bounds?: Rect): Promise<void> {
        // If the bounds weren't given
        if (!bounds) {
            // We assume the bounds are the whole canvas
            bounds = {
                x: 0,
                y: 0,
                w: Util.ctx.canvas.width,
                h: Util.ctx.canvas.height,
            }
        }

        // Determine the scale
        let scale: number
        // If the canvas is landscape
        if (bounds.w > bounds.h) {
            // Scale so the elements are evenly spaced by height
            // todo could break for menus with too few elements
            scale = (bounds.h * (0.5 / this.#elements.length)) / this.#tallestElement.sprite.h
        } else {
            // Otherwise scale so the longest element is 90% the width of the canvas
            // todo could break for menus with too many elements
            scale = (bounds.w * 0.9) / this.#longestElement.sprite.w
        }

        return new Promise<void>(resolve => {
            let y = bounds.y + (this.#tallestElement.sprite.h * scale * 0.5)
            this.#elements.forEach(element => {
                const actualWidth = element.sprite.w * element.scale * scale
                const actualHeight = element.sprite.h * element.scale * scale

                // Create the element's hitbox
                const hitbox: Hitbox = {
                    // The element's position
                    x: bounds.x + ((bounds.w / 2) - (actualWidth / 2)), y: y,
                    // The element's size
                    w: actualWidth, h: actualHeight,
                }

                if (element.interactable) {
                    // Add the element's hitbox to the map
                    this.elementHitboxes.set(element, hitbox)
                }

                let sprite = Util.cloneObj(element.sprite)
                // If this element is being hovered over (and has a sprite)
                if (element === this.hoveredElement && "hoveredSprite" in element) {
                    // We're assuming the hovered sprite is the same size here
                    sprite.x = element.hoveredSprite.x
                    sprite.y = element.hoveredSprite.y
                }

                // Draw the element
                Util.ctx.drawImage(Util.spritesheet,
                    sprite.x, sprite.y, sprite.w, sprite.h,
                    hitbox.x, hitbox.y, hitbox.w, hitbox.h)

                // Move the y down
                y += actualHeight * 1.5
            })

            resolve()
        })
    }

    // Gets the element that was pressed by the pointer event. Returns the element
    // property object of the button that was pressed (or null if none were pressed)
    pressedElement(event: PointerEvent): Element | null {
        // Calculate the absolute X and Y of the button press
        const [x, y] = getAbsPos(event.clientX, event.clientY)
        // Iterate over the menu elements
        for (let [element, hitbox] of this.elementHitboxes.entries()) {
            // If the pointer intersected the menu item
            if (intersect(x, y, hitbox)) {
                // Return the element
                return element
            }
        }
        return null
    }

    // Returns whether the given pointer event has resulted in the user hovering over a different button.
    // Usually this should be called on pointermove events, and if it returns true the menu should be redrawn
    pointerHoveringNewElement(event: PointerEvent): boolean {
        // Calculate the absolute X and Y of the button press
        const [x, y] = getAbsPos(event.clientX, event.clientY)
        // Iterate over the menu elements
        for (let [element, hitbox] of this.elementHitboxes.entries()) {
            // If the pointer intersected the menu item
            if (intersect(x, y, hitbox)) {
                // If this is newly hovered
                if (this.hoveredElement !== element) {
                    // Set the element
                    this.hoveredElement = element
                    // Redraw
                    return true
                }
                // Otherwise don't redraw
                return false
            }
        }
        // If an element is being hovered over (but not anymore)
        if (this.hoveredElement !== null) {
            // Reset the hovered element
            this.hoveredElement = null
            // Redraw
            return true
        }
        return false
    }
}