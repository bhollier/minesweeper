import Camera, {PressEvent} from './camera';
import {canvas} from '../draw';

import * as goio from '../goio/goio';

import Modal, {BACK_BUTTON, CLOSE_BUTTON} from '../menu/modal';
import RetryModal, {RETRY_BUTTON} from '../menu/retry-modal';
import SuccessModal, {RESET_BUTTON} from '../menu/success-modal';
import {ElementPressEvent} from '../menu/menu';

import {consoleLog, limiter} from '../util';
import {Size} from '../common';

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

    private readonly camera: Camera;
    private readonly modal: ModalContainer;

    // The draw function with a limiter, to prevent flickering when resizing
    private readonly drawWithLimit: () => void;
    // The last time a draw was done, to prevent the draw method from spamming the backend
    // todo this isn't a perfect solution, if you scroll fast enough
    //  you can still see the tiles load in. A better solution might be to
    //  load a lot more than necessary, cache it, and then load more once the
    //  camera is near(ish) to the edge
    private lastDrawTimestamp: number;

    private gameOver: boolean;

    constructor(props: GameProps) {
        this.props = props;

        if ('w' in this.props && 'h' in this.props) {
            this.camera = new Camera({w: this.props.w, h: this.props.h});
        } else {
            this.camera = new Camera();
        }

        this.camera.addEventListener('press', this.handlePress.bind(this));
        this.camera.addEventListener('longpress', this.handleLongPress.bind(this));
        this.camera.addEventListener('move', this.draw.bind(this));

        this.modal = new ModalContainer();
        this.drawWithLimit = limiter(this.draw.bind(this), 100);
        this.lastDrawTimestamp = 0;

        this.reset();

        this.registerEvents();
    }

    private reset() {
        this.camera.reset();
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
        initialisePromise.then(this.draw.bind(this));
    }

    public async draw() {
        const now = Date.now();
        // Max of 60 draws per second
        if (now - this.lastDrawTimestamp > 1000 / 60) {
            this.lastDrawTimestamp = now;
            // Request the appearance of the board from Go
            await goio.appearance(this.camera.visibleTiles)
                // Then draw it
                .then(this.camera.draw.bind(this.camera))
                // Then draw the modal over top (if active)
                .then(this.modal.draw.bind(this.modal));
        }
    }

    public registerEvents() {
        window.addEventListener('resize', this.drawWithLimit);
        canvas.addEventListener('contextmenu', preventDefault);
        if (this.modal.hidden) {
            this.camera.registerEvents();
        }
    }

    public deregisterEvents() {
        window.removeEventListener('resize', this.drawWithLimit);
        canvas.removeEventListener('contextmenu', preventDefault);
        this.camera.deregisterEvents();
        this.modal.deregisterEvents();
    }

    private handleState(stateData: goio.UncoverResponseData) {
        switch (stateData.state) {
        case GAME_STATES.WIN:
            this.gameOver = true;
            consoleLog('Win detected, displaying success modal');
            this.handleEndGameModal(SuccessModal, RESET_BUTTON.id);
            break;
        case GAME_STATES.LOSS:
            this.gameOver = true;
            consoleLog('Loss detected, displaying retry modal');
            setTimeout(this.handleEndGameModal.bind(this, RetryModal, RETRY_BUTTON.id),
                // Display after 1s so the user can see the field for a bit
                1000);
            break;
        }
    }

    private async handleEndGameModal(modalConstructor: () => void, resetElementId: string) {
        // Display the modal
        const modal: Modal = new modalConstructor();
        this.modal.open(modal);
        // Add some common event handlers
        modal.addEventListener('hover', this.draw.bind(this));
        modal.addEventListener('press', (event: ElementPressEvent) => {
            switch (event.pressedElement) {
            case CLOSE_BUTTON.id:
                this.modal.hide();
                this.camera.registerEvents();
                this.draw();
                break;
            case resetElementId:
                this.modal.close();
                this.camera.registerEvents();
                this.reset();
                this.draw();
                break;
            case BACK_BUTTON.id:
                this.deregisterEvents();
                this.props.handleBack();
            }
        });
        // The modal is open so don't allow the camera to move
        this.camera.deregisterEvents();
        // Draw the modal
        await this.draw();
    }

    private handlePress(event: PressEvent) {
        if (!this.gameOver) {
            // Left mouse button
            if (event.button === 0) {
                goio.uncover(event.pos)
                    .then(async state => {
                        await this.draw();
                        this.handleState(state);
                    });

                // Right mouse button
            } else if (event.button === 2) {
                goio.flag(event.pos)
                    .then(this.draw.bind(this));
            }

            // If the game is over but the modal is hidden
        } else if (this.modal.hidden) {
            // Reopen the modal
            this.modal.reveal();
            this.camera.deregisterEvents();
            this.draw();
        }
    }

    private handleLongPress(event: PressEvent) {
        if (!this.gameOver && event.button === 0) {
            goio.flag(event.pos).then(this.draw.bind(this));
        }
    }
}