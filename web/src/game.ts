import * as worker from './worker-helper'
import Modal, {CLOSE_BUTTON, BACK_BUTTON} from "./modal";
import RetryModal, {RETRY_BUTTON} from "./retry-modal"
import SuccessModal, {RESET_BUTTON} from "./success-modal";
import {canvas, ctx, drawSprite, SPRITES} from './draw';
import {Size} from './common';
import {consoleLog, limiter} from "./util";
import Camera, {PressEvent, TILE_DRAW_SIZE} from "./camera";
import {ElementPressEvent} from "./menu";

// Constants for the game states
const GAME_STATES = {
    START: "start",
    PLAYING: "playing",
    WIN: "win",
    LOSS: "loss"
}

class ModalContainer {
    private modal: Modal | null
    #hidden: boolean

    constructor() {
        this.modal = null
        this.#hidden = true
    }

    public open(modal: Modal) {
        this.modal = modal
        this.#hidden = false
    }

    public close() {
        if (!this.modal) {
            throw new Error("No modal to close")
        }
        this.hide()
        this.modal = null
    }

    public get hidden() {
        return this.#hidden
    }

    public hide() {
        if (!this.modal) {
            throw new Error("No modal to hide")
        }
        this.modal.deregisterEvents()
        this.#hidden = true
    }

    public reveal() {
        if (!this.modal) {
            throw new Error("No modal to reveal")
        }
        this.modal.registerEvents()
        this.#hidden = false
    }

    public async draw() {
        if (!this.#hidden) {
            await this.modal.draw()
        }
    }

    public deregisterEvents() {
        this.modal?.deregisterEvents()
    }
}

function preventDefault(e: Event) {
    e.preventDefault()
}

export default class Game {
    private readonly fieldSize: Size
    private readonly numMines: number
    private readonly handleBack: () => void

    private readonly camera: Camera
    private readonly modal: ModalContainer

    // The draw function with a limiter, to prevent flickering when resizing
    private readonly drawWithLimit: () => void

    private gameOver: boolean

    constructor(width, height, numMines: number, handleBack: () => void) {
        this.fieldSize = {w: width, h: height}
        this.numMines = numMines
        this.handleBack = handleBack

        this.camera = new Camera(this.fieldSize)
        this.camera.addEventListener("press", this.handlePress.bind(this))
        this.camera.addEventListener("longpress", this.handleLongPress.bind(this))
        this.camera.addEventListener("move", this.draw.bind(this))

        this.modal = new ModalContainer()
        this.drawWithLimit = limiter(this.draw.bind(this), 100)

        this.reset()

        this.registerEvents()
    }

    private reset() {
        this.camera.reset()
        this.gameOver = false
        worker.postMessage("init", {
            "width": this.fieldSize.w,
            "height": this.fieldSize.h,
            "mines": this.numMines,

            // Once initialised, draw it
        }).then(this.draw.bind(this))
    }

    public async draw() {
        // Request the appearance of the board from Go
        await worker.postMessage("appearance")
            // Then draw it
            .then(this.drawAppearance.bind(this))
            // Then draw the modal over top (if active)
            .then(this.modal.draw.bind(this.modal))
    }

    public registerEvents() {
        window.addEventListener("resize", this.drawWithLimit)
        canvas.addEventListener("contextmenu", preventDefault)
        if (this.modal.hidden) {
            this.camera.registerEvents()
        }
    }

    public deregisterEvents() {
        window.removeEventListener("resize", this.drawWithLimit)
        canvas.removeEventListener("contextmenu", preventDefault)
        this.camera.deregisterEvents()
        this.modal.deregisterEvents()
    }

    private async drawAppearance(appearanceData: Array<Array<string>>) {
        // The canvas width and height
        const w = canvas.width, h = canvas.height

        // Clear the canvas (for now)
        ctx.clearRect(0, 0, w, h)

        const drawPromises = [] as Array<Promise<void>>

        // Iterate over the tiles
        for (let y = 0; y < this.fieldSize.h; ++y) {
            for (let x = 0; x < this.fieldSize.w; ++x) {
                // Get the sprite
                const sprite = SPRITES.TILES[appearanceData[y][x]]
                // Calculate the position of the tile on the canvas
                const pos = this.camera.toCanvasPos(x, y)
                drawPromises.push(drawSprite(sprite, {
                    // The position of the tile to draw to
                    x: pos.x, y: pos.y,
                    // The size of the tile to draw to
                    w: TILE_DRAW_SIZE * this.camera.scale, h: TILE_DRAW_SIZE * this.camera.scale
                }))
            }
        }

        // todo pagination
        // todo draw bar

        return Promise.all(drawPromises)
    }

    private handleState(stateData) {
        switch (stateData.state) {
            case GAME_STATES.WIN:
                this.gameOver = true
                consoleLog("Win detected, displaying success modal")
                // Display the modal
                const successModal = new SuccessModal();
                this.modal.open(successModal);
                successModal.addEventListener("hover", this.draw.bind(this))
                successModal.addEventListener("press", (event: ElementPressEvent) => {
                    switch (event.pressedElement) {
                        case CLOSE_BUTTON.id:
                            this.modal.hide()
                            this.camera.registerEvents()
                            this.draw()
                            break
                        case RESET_BUTTON.id:
                            this.modal.close()
                            this.camera.registerEvents()
                            this.reset()
                            this.draw()
                            break
                        case BACK_BUTTON.id:
                            this.deregisterEvents()
                            this.handleBack()
                    }
                })
                // The modal is open so don't allow the camera to move
                this.camera.deregisterEvents()
                this.draw()
                break
            case GAME_STATES.LOSS:
                this.gameOver = true
                consoleLog("Loss detected, displaying retry modal")
                setTimeout(async () => {
                    // Display the modal
                    const retryModal = new RetryModal();
                    this.modal.open(retryModal);
                    retryModal.addEventListener("hover", this.draw.bind(this))
                    retryModal.addEventListener("press", (event: ElementPressEvent) => {
                        switch (event.pressedElement) {
                            case CLOSE_BUTTON.id:
                                this.modal.hide()
                                this.camera.registerEvents()
                                this.draw()
                                break
                            case RETRY_BUTTON.id:
                                this.modal.close()
                                this.camera.registerEvents()
                                this.reset()
                                this.draw()
                                break
                            case BACK_BUTTON.id:
                                this.deregisterEvents()
                                this.handleBack()
                        }
                    })
                    // The modal is open so don't allow the camera to move
                    this.camera.deregisterEvents()
                    await this.draw()

                    // Display after 1s so the user can see the field for a bit
                }, 1000)
        }
    }

    private handlePress(event: PressEvent) {
        if (!this.gameOver) {
            // Left mouse button
            if (event.button === 0) {
                worker.postMessage("uncover", event.pos)
                    .then(async state => {
                        await this.draw()
                        this.handleState(state)
                    })

                // Right mouse button
            } else if (event.button === 2) {
                worker.postMessage("flag", event.pos)
                    .then(this.draw.bind(this))
            }

            // If the game is over but the modal is hidden
        } else if (this.modal.hidden) {
            // Reopen the modal
            this.modal.reveal()
            this.camera.deregisterEvents()
            this.draw()
        }
    }

    private handleLongPress(event: PressEvent) {
        if (!this.gameOver && event.button === 0) {
            worker.postMessage("flag", event.pos)
                .then(this.draw.bind(this))
        }
    }
}