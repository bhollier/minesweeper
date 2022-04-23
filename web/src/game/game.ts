import Camera, {PressEvent} from './camera';
import {canvas, ctx} from '../draw';
import Bar from './bar';

import * as goio from '../goio/goio';

import Modal, {BACK_BUTTON, CLOSE_BUTTON} from '../menu/modal';
import RetryModal, {RETRY_BUTTON} from '../menu/retry-modal';
import SuccessModal, {RESET_BUTTON} from '../menu/success-modal';
import {ElementPressEvent} from '../menu/menu';

import {Rect, Size} from '../common';
import {consoleLog} from '../util';

// Constants for the game states
const GAME_STATES = {
    START: 'start',
    PLAYING: 'playing',
    WIN: 'win',
    LOSS: 'loss'
};

class ModalContainer {
    private modal: Modal | null;
    #hidden: boolean;

    constructor() {
        this.modal = null;
        this.#hidden = true;
    }

    public open(modal: Modal) {
        this.modal = modal;
        this.#hidden = false;
    }

    public close() {
        if (!this.modal) {
            throw new Error('No modal to close');
        }
        this.hide();
        this.modal = null;
    }

    public get hidden() {
        return this.#hidden;
    }

    public hide() {
        if (!this.modal) {
            throw new Error('No modal to hide');
        }
        this.modal.deregisterEvents();
        this.#hidden = true;
    }

    public reveal() {
        if (!this.modal) {
            throw new Error('No modal to reveal');
        }
        this.modal.registerEvents();
        this.#hidden = false;
    }

    public async draw() {
        if (!this.#hidden) {
            await this.modal.draw();
        }
    }

    public deregisterEvents() {
        this.modal?.deregisterEvents();
    }
}

function preventDefault(e: Event) {
    e.preventDefault();
}

export type FiniteGameProps = Size & {
    numMines: number
}

export type InfiniteGameProps = {
    mineDensity: number
}

export type GameProps = (FiniteGameProps | InfiniteGameProps) & {
    handleBack: () => void
}

export default class Game {
    private readonly props: GameProps;

    private readonly handleResize: () => void;
    private readonly handleState: (stateData: goio.UncoverResponseData) => void;
    private readonly handleFlag: (flagData: goio.FlagResponseData) => void;
    private readonly handlePress: (event: PressEvent) => void;
    private readonly handleLongPress: (event: PressEvent) => void;

    private readonly bar: Bar;
    private readonly camera: Camera;
    private readonly modal: ModalContainer;

    // The current appearance of the field, not necessarily of the whole field
    private appearance: {
        data: Array<Array<string>>,
        rect: Rect
    } | null;
    private lastAppearanceRequestTimestamp: number;

    private gameStarted: boolean;
    private gameOver: boolean;

    constructor(props: GameProps) {
        this.props = props;

        const bounds = Game.bounds();

        // Handlers:
        this.handleResize = () => {
            // Get the new bounds
            const bounds = Game.bounds();

            // Resize the bar and camera
            this.bar.resize(bounds.bar);
            this.camera.resize(bounds.camera);

            // Redraw
            this.draw();
        };

        this.handleState = (stateData: goio.UncoverResponseData) => {
            // Synchronise the current elapsed time with the Go backend
            this.bar.currentElapsed = stateData.timer;

            switch (stateData.state) {
            case GAME_STATES.WIN:
                this.gameOver = true;
                this.bar.stopClock();
                consoleLog('Win detected, displaying success modal');
                this.createEndGameModal(SuccessModal, RESET_BUTTON.id);
                break;
            case GAME_STATES.LOSS:
                this.gameOver = true;
                this.bar.stopClock();
                consoleLog('Loss detected, displaying retry modal');
                setTimeout(() => this.createEndGameModal(RetryModal, RETRY_BUTTON.id),
                    // Display after 1s so the user can see the field for a bit
                    1000);
                break;
            }
        };

        this.handleFlag = (flagData: goio.FlagResponseData) => {
            // Synchronise the remaining mines
            this.bar.remainingMines = flagData.remainingMines;

            // Redraw
            this.draw(true);
        };

        this.handlePress = (event: PressEvent) => {
            if (!this.gameOver) {
                // Left mouse button
                if (event.button === 0) {
                    goio.uncover(event.pos)
                        .then(async state => {
                            if (!this.gameStarted) {
                                this.gameStarted = true;
                                this.bar.startClock();
                            }
                            await this.draw(true);
                            this.handleState(state);
                        });

                    // Right mouse button
                } else if (event.button === 2) {
                    goio.flag(event.pos)
                        .then(this.handleFlag);
                }

                // If the game is over but the modal is hidden
            } else if (this.modal.hidden) {
                // Reopen the modal
                this.modal.reveal();
                this.bar.deregisterEvents();
                this.camera.deregisterEvents();
                this.draw();
            }
        };

        this.handleLongPress = (event: PressEvent) => {
            if (!this.gameOver && event.button === 0) {
                goio.flag(event.pos)
                    .then(this.handleFlag);
            }
        };

        let remainingMines = Infinity;
        if ('numMines' in this.props) {
            remainingMines = this.props.numMines;
        }
        this.bar = new Bar(bounds.bar, remainingMines);

        this.bar.addEventListener('close', () => {
            this.bar.stopClock();
            this.deregisterEvents();
            this.props.handleBack();
        });

        let fieldSize;
        if ('w' in this.props && 'h' in this.props) {
            fieldSize = {w: this.props.w, h: this.props.h};
        }
        this.camera = new Camera(bounds.camera, fieldSize);

        this.camera.addEventListener('press', this.handlePress);
        this.camera.addEventListener('longpress', this.handleLongPress);
        this.camera.addEventListener('move', () => this.draw());

        this.modal = new ModalContainer();
        this.appearance = null;
        this.lastAppearanceRequestTimestamp = 0;

        this.reset();

        this.registerEvents();
    }

    // Get the bounding boxes of the bar and camera elements of the canvas
    private static bounds(): {bar: Rect, camera: Rect} {
        const bar: Rect = {
            x: 0, y: 0,
            w: canvas.width,
            // The bar's height is either 7.5% the height or
            // 7.5% the width of the canvas, depending on which is lower
            h: Math.min(canvas.width * 0.075, canvas.height * 0.075)
        };
        // The camera takes up the rest of the canvas
        const camera: Rect = {
            x: 0, y: bar.y + bar.h,
            w: canvas.width,
            h: canvas.height - (bar.y + bar.h)
        };
        return {bar, camera};
    }

    private reset() {
        this.camera.reset();

        this.bar.stopClock();
        this.bar.currentElapsed = 0;
        if ('numMines' in this.props) {
            // Only update remaining mines for finite minesweeper
            this.bar.remainingMines = this.props.numMines;
        }

        this.gameStarted = false;
        this.gameOver = false;

        let initialisePromise;
        // Finite type
        if ('w' in this.props && 'h' in this.props && 'numMines' in this.props) {
            initialisePromise = goio.init({
                width: this.props.w,
                height: this.props.h,
                mines: this.props.numMines
            });

            // Infinite type
        } else if ('mineDensity' in this.props) {
            initialisePromise = goio.init({
                mineDensity: this.props.mineDensity
            });
        } else {
            throw new Error('unknown game props type');
        }

        // Once initialised, draw it
        initialisePromise.then(() => this.draw(true));
    }

    private async createEndGameModal(modalConstructor: () => void, resetElementId: string) {
        // Display the modal
        const modal: Modal = new modalConstructor();
        this.modal.open(modal);
        // Add some common event handlers
        modal.addEventListener('hover', () => this.draw());
        modal.addEventListener('press', (event: ElementPressEvent) => {
            switch (event.pressedElement) {
            case CLOSE_BUTTON.id:
                this.modal.hide();
                this.bar.registerEvents();
                this.camera.registerEvents();
                this.draw();
                break;
            case resetElementId:
                this.modal.close();
                this.bar.registerEvents();
                this.camera.registerEvents();
                this.reset();
                this.draw();
                break;
            case BACK_BUTTON.id:
                this.deregisterEvents();
                this.props.handleBack();
            }
        });
        // The modal is open so don't allow the background elements to be interactable
        this.bar.deregisterEvents();
        this.camera.deregisterEvents();
        // Draw the modal
        await this.draw();
    }

    private shouldUpdateAppearance(): boolean {
        // Always request if there's no appearance
        if (this.appearance == null) {
            return true;
        }

        // Don't request too often
        const now = Date.now();
        if (now - this.lastAppearanceRequestTimestamp < 100) {
            return false;
        }

        // Get the visible tiles
        const visibleTiles = this.camera.visibleTiles;

        // If any edge of the visible rect is close(ish) to the edge of the appearance, redraw
        return visibleTiles.x < this.appearance.rect.x + (this.appearance.rect.w / 6)
            || visibleTiles.y < this.appearance.rect.y + (this.appearance.rect.h / 6)
            || visibleTiles.x + visibleTiles.w > (this.appearance.rect.x + this.appearance.rect.w) - (this.appearance.rect.w / 6)
            || visibleTiles.y + visibleTiles.h > (this.appearance.rect.y + this.appearance.rect.h) - (this.appearance.rect.h / 6);
    }

    public async draw(stateChanged?: boolean) {
        // If a new appearance is required
        if (stateChanged || this.shouldUpdateAppearance()) {
            // The appearance to request is more than what is visible
            const rect = this.camera.visibleTiles;
            rect.x -= rect.w / 2;
            rect.y -= rect.h / 2;
            rect.w *= 2;
            rect.h *= 2;
            consoleLog(`redrawing, rect x${rect.x} y ${rect.y} w ${rect.w} h ${rect.h}`);

            // Request the appearance
            this.lastAppearanceRequestTimestamp = Date.now();
            this.appearance = {
                data: await goio.appearance(rect),
                rect
            };
        }

        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the appearance
        await this.camera.draw(this.appearance.data)
            // Then draw the GUI bar
            .then(() => this.bar.draw())
            // Then draw the modal over top (if active)
            .then(() => this.modal.draw());
    }

    public registerEvents() {
        window.addEventListener('resize', this.handleResize);
        canvas.addEventListener('contextmenu', preventDefault);
        if (this.modal.hidden) {
            this.bar.registerEvents();
            this.camera.registerEvents();
        }
    }

    public deregisterEvents() {
        window.removeEventListener('resize', this.handleResize);
        canvas.removeEventListener('contextmenu', preventDefault);
        this.bar.deregisterEvents();
        this.camera.deregisterEvents();
        this.modal.deregisterEvents();
    }
}