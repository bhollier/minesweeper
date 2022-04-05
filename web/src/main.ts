import {spritesheetLoaded, canvas, ctx} from './draw';
import * as MainMenu from "./main-menu"

// Once the spritesheet has loaded
spritesheetLoaded.then(() => {
    // Draw the menu and register the events
    MainMenu.draw().then(() => {
        MainMenu.registerEvents()
    })
})

// Make the canvas fullscreen
function fullscreenCanvas() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // @ts-ignore
    ctx.webkitImageSmoothingEnabled = false;
    // @ts-ignore
    ctx.mozImageSmoothingEnabled = false;
    // @ts-ignore
    ctx.imageSmoothingEnabled = false;
}

// Add an event handler to resize the canvas
window.addEventListener("resize", fullscreenCanvas)

// Make the canvas fullscreen
fullscreenCanvas()
