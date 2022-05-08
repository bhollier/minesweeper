import State, {StateStack} from './state';

import MainMenu, {
    EASY_BUTTON,
    HARD_BUTTON,
    INFINITE_BUTTON,
    MEDIUM_BUTTON
} from '../menu/main-menu';
import {ElementPressEvent} from '../menu/menu';

import Game, {FiniteGameProps, InfiniteGameProps} from '../game/game';

export default class MainMenuState extends State {
    public readonly mainMenu: MainMenu;

    constructor(stateStack: StateStack) {
        super(stateStack);

        this.mainMenu = new MainMenu();
        this.mainMenu.addEventListener('press', (event : ElementPressEvent) => {
            // Determine the game properties
            let gameProps: FiniteGameProps | InfiniteGameProps | undefined;
            switch (event.pressedElement) {
            case EASY_BUTTON.id:
                gameProps = {
                    w: 9,
                    h: 9,
                    numMines: 10
                };
                break;
            case MEDIUM_BUTTON.id:
                gameProps = {
                    w: 16,
                    h: 16,
                    numMines: 40
                };
                break;
            case HARD_BUTTON.id:
                gameProps = {
                    w: 30,
                    h: 16,
                    numMines: 99
                };
                break;
            case INFINITE_BUTTON.id:
                gameProps = {
                    // Medium difficulty mine density
                    mineDensity: 40,
                };
            }

            // Add the game state to the stack
            stateStack.push(Game, gameProps);
        });
    }

    public async draw() {
        await this.mainMenu.draw();
    }

    public registerEvents() {
        this.mainMenu.registerEvents();
    }

    public deregisterEvents() {
        this.mainMenu.deregisterEvents();
    }
}