import State, {StateStack} from '../state/state';

import Camera, {PressEvent} from './camera';
import {canvas, ctx} from '../draw';
import Bar from './bar';

import * as goio from '../goio/goio';
import {ElementPressEvent} from '../menu/menu';
import Modal from '../menu/modal';

import RetryModal, {RETRY_BUTTON} from '../menu/retry-modal';
import SuccessModal, {RESET_BUTTON} from '../menu/success-modal';
import ModalState from '../state/modal-state';

import {Rect, Size} from '../common';
import {consoleLog} from '../util';

function preventDefault(e: Event) {
    e.preventDefault();
}

export type FiniteGameProps = Size & {
    numMines: number
}

export type InfiniteGameProps = {
    mineDensity: number
}

export type GameProps = FiniteGameProps | InfiniteGameProps

export default class Game extends State {
    private readonly props: GameProps;

    private readonly handleResize: () => void;
    private readonly handleState: (stateData: goio.UncoverResponseData) => void;
    private readonly handleFlag: (flagData: goio.FlagResponseData) => void;
    private readonly handlePress: (event: PressEvent) => void;
    private readonly handleLongPress: (event: PressEvent) => void;

    private readonly bar: Bar;
    private readonly camera: Camera;

    // The current appearance of the field, not necessarily of the whole field
    private appearance: {
        data: Array<Array<string>>,
        rect: Rect
    } | null;
    private lastAppearanceRequestTimestamp: number;

    private gameState: goio.GameState;

    private readonly autosave: ReturnType<typeof setInterval>;

    constructor(stack: StateStack, props: GameProps, alreadyInitialised?: boolean) {
        super(stack);

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

            this.gameState = stateData.state;
            switch (this.gameState) {
            case goio.GameState.Win:
                this.bar.stopClock();
                consoleLog('Win detected, displaying success modal');
                this.createEndGameModal(SuccessModal, RESET_BUTTON.id);
                break;
            case goio.GameState.Loss:
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
            if (this.gameState !== goio.GameState.Win && this.gameState !== goio.GameState.Loss) {
                // Left mouse button
                if (event.button === 0) {
                    goio.uncover(event.pos)
                        .then(async state => {
                            if (this.gameState === goio.GameState.Start) {
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
            } else if (this.gameState === goio.GameState.Win) {
                this.createEndGameModal(SuccessModal, RESET_BUTTON.id);
            } else if (this.gameState === goio.GameState.Loss) {
                this.createEndGameModal(RetryModal, RETRY_BUTTON.id);
            }
        };

        this.handleLongPress = (event: PressEvent) => {
            if (this.gameState !== goio.GameState.Win && this.gameState !== goio.GameState.Loss
                && event.button === 0) {
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
            // Pop this state off the stack
            this.pop();
        });

        let fieldSize;
        if ('w' in this.props && 'h' in this.props) {
            fieldSize = {w: this.props.w, h: this.props.h};
        }
        this.camera = new Camera(bounds.camera, fieldSize);

        this.camera.addEventListener('press', this.handlePress);
        this.camera.addEventListener('longpress', this.handleLongPress);
        this.camera.addEventListener('move', () => this.draw());

        this.appearance = null;
        this.lastAppearanceRequestTimestamp = 0;

        if (!alreadyInitialised) {
            this.reset();
        } else {
            goio.state().then(stateData => {
                this.bar.remainingMines = stateData.remainingMines;
                this.bar.currentElapsed = stateData.timer;
                if (stateData.state !== goio.GameState.Start) {
                    this.bar.startClock();
                }
            });
            this.camera.load();
        }

        this.autosave = setInterval(() => this.save(), 5000);

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

        this.gameState = goio.GameState.Start;

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

    private createEndGameModal<T extends Modal>(modalCtor: new() => T, resetElementId: string) {
        // Create the modal
        const modal = this.stack.push(ModalState, modalCtor).modal;
        // Add an event listener for reset
        modal.addEventListener('press', (event: ElementPressEvent) => {
            if (event.pressedElement === resetElementId) {
                // Pop the modal
                this.stack.pop();
                // Reset the game
                this.reset();
                // Redraw
                this.stack.draw();
            }
        });
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
            .then(() => this.bar.draw());
    }

    public registerEvents() {
        window.addEventListener('resize', this.handleResize);
        canvas.addEventListener('contextmenu', preventDefault);
        this.bar.registerEvents();
        this.camera.registerEvents();
    }

    public deregisterEvents() {
        window.removeEventListener('resize', this.handleResize);
        canvas.removeEventListener('contextmenu', preventDefault);
        this.bar.deregisterEvents();
        this.camera.deregisterEvents();
    }

    protected onPop() {
        this.bar.stopClock();
        clearInterval(this.autosave);
    }

    public save() {
        goio.save().then(saveData => {
            localStorage.setItem('saveData', saveData);
        });
        this.camera.save();
    }

    // If a valid save exists, loads the game onto the top of the stack.
    // Otherwise the stack isn't modified
    public static async load(stack: StateStack): Promise<Game> {
        const saveData = localStorage.getItem('saveData');
        if (saveData) {
            consoleLog('Previous game found, attempting to load');
            try {
                const loadedGame = await goio.load(saveData);

                let gameProps;
                if ('width' in loadedGame && 'height' in loadedGame && 'mines' in loadedGame) {
                    gameProps = {
                        w: loadedGame.width,
                        h: loadedGame.height,
                        numMines: loadedGame.mines
                    };
                } else if ('mineDensity' in loadedGame) {
                    gameProps = {
                        mineDensity: loadedGame.mineDensity
                    };
                } else {
                    consoleLog(`Unknown game properties: ${JSON.stringify(loadedGame)}. Reverting to main menu`);
                    localStorage.removeItem('saveData');
                    localStorage.removeItem('camera');
                }

                consoleLog('Game loaded successfully');

                // Create the game
                stack.push(Game, gameProps, true);

            } catch (error) {
                consoleLog('Error while loading game, reverting to main menu');
                localStorage.removeItem('saveData');
                localStorage.removeItem('camera');
            }
        }
        return null;
    }
}