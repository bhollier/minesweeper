import MainMenu, {EASY_BUTTON, HARD_BUTTON, MEDIUM_BUTTON} from './main-menu';
import Game from './game';

import {canvas, ctx} from './draw';
import {ElementPressEvent} from './menu';

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

    // Determine the width, height and number of mines
    let width, height, numMines;
    switch (event.pressedElement) {
    case EASY_BUTTON.id:
        width = 9;
        height = 9;
        numMines = 10;
        break;
    case MEDIUM_BUTTON.id:
        width = 16;
        height = 16;
        numMines = 40;
        break;
    case HARD_BUTTON.id:
        width = 30;
        height = 16;
        numMines = 99;
        break;
    }

    // Create the game
    new Game(width, height, numMines, () => {
        mainMenu.registerEvents();
        mainMenu.draw();
    });
});
mainMenu.draw();
