import Game, {FiniteGameProps, InfiniteGameProps} from './game/game';
import MainMenu, {EASY_BUTTON, HARD_BUTTON, INFINITE_BUTTON, MEDIUM_BUTTON} from './menu/main-menu';

import * as goio from './goio/goio';

import {canvas, ctx, spritesheetLoaded} from './draw';
import {ElementPressEvent} from './menu/menu';

import '../assets/styles.css';
import {consoleLog} from './util';

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
let mainMenuActive = true;

// Add an event listener for pressing the menu buttons
mainMenu.addEventListener('press', (event : ElementPressEvent) => {
    mainMenuActive = false;
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

// Look for save data
const saveData = localStorage.getItem('saveData');
if (saveData) {
    consoleLog('Previous game found, attempting to load');
    goio.load(saveData).then(loadedGame => {
        mainMenuActive = false;
        mainMenu.deregisterEvents();

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

        // Create the game
        new Game({
            ...gameProps,
            alreadyInitialised: true,
            handleBack: () => {
                localStorage.removeItem('saveData');
                localStorage.removeItem('camera');
                mainMenu.registerEvents();
                mainMenu.draw();
            }
        }).draw();
        consoleLog('Game loaded successfully');

    }).catch(() => {
        consoleLog('Error while loading game, reverting to main menu');
        localStorage.removeItem('saveData');
        localStorage.removeItem('camera');
    });
}

// Draw the main menu once the spritesheet has loaded
spritesheetLoaded.then(() => {
    if (mainMenuActive) {
        mainMenu.draw();
    }
});
