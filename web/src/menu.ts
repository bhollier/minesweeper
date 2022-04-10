import {Pos, Rect} from './common';
import {canvas, drawSprite} from "./draw";
import {cloneObj} from "./util";
import EventManager from "./event-manager";

export type Hitbox = Rect

export type Element = {
    id: string
    sprite: Rect,
    hoveredSprite?: Pos,
    scale: number,
    interactable?: boolean
}

const biggestElementByField = (elements: Array<Element>, field: string) =>
    elements.reduce((prev, curr) =>
        prev.sprite[field] * prev.scale > curr.sprite[field] * curr.scale ? prev : curr)

function getAbsPos(x, y: number) {
    const rect = canvas.getBoundingClientRect()
    return [Math.round(x - rect.left), Math.round(y - rect.top)]
}

function intersect(x, y: number, hitbox: Hitbox) {
    return x > hitbox.x && y > hitbox.y &&
        x < hitbox.x + hitbox.w && y < hitbox.y + hitbox.h
}

export type ElementPressEvent = {
    pressedElement: string
}

export type ElementHoveredEvent = {
    hoveredElement: string | null
}

interface MenuEventMap {
    "press": ElementPressEvent
    "hover": ElementHoveredEvent
}

// Class for a very simple menu, where each "element" is drawn top down, equally spaced
export default class Menu extends EventManager<MenuEventMap> {
    private elements: Array<Element>
    private tallestElement: Element
    private longestElement: Element

    protected elementHitboxes: Map<string, Hitbox>
    protected hoveredElement: string | null

    private readonly handlePointerMove
    private readonly handlePointerDown

    constructor(elements: Array<Element>) {
        super()
        this.elements = elements
        this.tallestElement = biggestElementByField(elements, "h")
        this.longestElement = biggestElementByField(elements, "w")

        this.elementHitboxes = new Map()
        this.hoveredElement = null

        this.handlePointerMove = (event: PointerEvent) => {
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
                        this.callEventListeners("hover", {
                            hoveredElement: element
                        })
                    }
                    return
                }
            }
            // If an element is being hovered over (but not anymore)
            if (this.hoveredElement !== null) {
                // Reset the hovered element
                this.hoveredElement = null
                this.callEventListeners("hover", {
                    hoveredElement: null
                })
            }
        }

        this.handlePointerDown = (event: PointerEvent) => {
            // Calculate the absolute X and Y of the button press
            const [x, y] = getAbsPos(event.clientX, event.clientY)
            // Iterate over the menu elements
            for (let [element, hitbox] of this.elementHitboxes.entries()) {
                // If the pointer intersected the menu item
                if (intersect(x, y, hitbox)) {
                    this.callEventListeners("press", {
                        pressedElement: element
                    })
                }
            }
            return null
        }

        this.registerEvents()
    }

    async draw(bounds?: Rect): Promise<void> {
        // If the bounds weren't given
        if (!bounds) {
            // We assume the bounds are the whole canvas
            bounds = {
                x: 0,
                y: 0,
                w: canvas.width,
                h: canvas.height,
            }
        }

        // First, scale so the elements are evenly spaced by height
        let scale = (bounds.h * (0.5 / this.elements.length)) /
            (this.tallestElement.sprite.h * this.tallestElement.scale)

        // If the longest element would be too long
        if (scale * this.longestElement.sprite.w * this.longestElement.scale >= bounds.w * 0.9) {
            // Scale so the longest element is 90% the width of the canvas
            scale = (bounds.w * 0.9) / (this.longestElement.sprite.w * this.longestElement.scale)
        }

        return new Promise<void>(resolve => {
            let y = bounds.y + (this.tallestElement.sprite.h * scale * 0.5)
            this.elements.forEach(element => {
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
                    this.elementHitboxes.set(element.id, hitbox)
                }

                let sprite = cloneObj(element.sprite)
                // If this element is being hovered over (and has a sprite)
                if (element.id === this.hoveredElement && "hoveredSprite" in element) {
                    // We're assuming the hovered sprite is the same size here
                    sprite.x = element.hoveredSprite.x
                    sprite.y = element.hoveredSprite.y
                }

                // Draw the element
                drawSprite(sprite, hitbox)

                // Move the y down
                y += actualHeight * 1.5
            })

            resolve()
        })
    }

    public registerEvents() {
        window.addEventListener("pointermove", this.handlePointerMove)
        window.addEventListener("pointerdown", this.handlePointerDown)
    }

    public deregisterEvents() {
        window.removeEventListener("pointermove", this.handlePointerMove)
        window.removeEventListener("pointerdown", this.handlePointerDown)
    }
}