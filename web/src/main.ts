import Game, {FiniteGameProps, InfiniteGameProps} from './game/game';
import MainMenu, {EASY_BUTTON, HARD_BUTTON, INFINITE_BUTTON, MEDIUM_BUTTON} from './menu/main-menu';

import {canvas, ctx, spritesheetLoaded} from './draw';
import {ElementPressEvent} from './menu/menu';

import '../assets/styles.css';

// Make the canvas fullscreen
function fullscreenCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.imageSmoothingEnabled = false;

    /* eslint-disable @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    ctx.webkitImageSmoothingEnabled = false;
    // @ts-ignore
    ctx.mozImageSmoothingEnabled = false;
    /* eslint-enable @typescript-eslint/ban-ts-comment */
}

// Add an event handler to resize the canvas
window.addEventListener('resize', fullscreenCanvas);

// Make the canvas fullscreen
fullscreenCanvas();

// Create the main menu
const mainMenu = new MainMenu();

// Add an event listener for pressing the menu buttons
mainMenu.addEventListener('press', (event : ElementPressEvent) => {
    mainMenu.deregisterEvents();

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

    // Create the game
    new Game({
        ...gameProps,
        handleBack: () => {
            mainMenu.registerEvents();
            mainMenu.draw();
        }
    });
});

// Draw the main menu once the spritesheet has loaded
spritesheetLoaded.then(mainMenu.draw.bind(mainMenu));
