import MainMenuState from './state/main-menu-state';
import {StateStack} from './state/state';

import Game from './game/game';

import {canvas, ctx, spritesheetLoaded} from './draw';

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

// Create the state stack
const stateStack = new StateStack();

// Create the main menu
stateStack.push(MainMenuState);

// Try to load the game onto the stack
Game.load(stateStack);

// Draw the state stack once the spritesheet has loaded
spritesheetLoaded.then(() => {
    return stateStack.draw();
});
