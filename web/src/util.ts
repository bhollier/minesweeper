import './vendor/date.format.js'

const LOG_TIME_FORMAT = "yyyy/mm/dd HH:MM:ss.l"

// Writes the given text to the console, with 'JS: ' prepended (to distinguish
// from logs in the WASM module
export function consoleLog(s) {
    const now = new Date()
    console.log("(" + now.format(LOG_TIME_FORMAT) + ") JS: " + s)
}

export function cloneObj(o) {
    return JSON.parse(JSON.stringify(o))
}

// todo make spritesheet.js

// Constant for the size of a tile in the spritesheet
export const TILE_SIZE = 10

// Constant for the height of a row in the spritesheet
export const ROW_HEIGHT = TILE_SIZE

// The canvas
export const canvas = document.getElementById("canvas") as HTMLCanvasElement

// The graphical context to draw to
export const ctx = canvas.getContext('2d')

export const spritesheet = new Image()

export const spritesheetLoaded = new Promise<void>(resolve => {
    spritesheet.addEventListener('load', () => {
        consoleLog("Finished loading spritesheet")
        resolve()
    })
})

consoleLog("Loading spritesheet.png")
spritesheet.src = 'spritesheet.png'

const timeoutIdForFunc = new Map<Function, number>()

// Returns a function that only calls func if there have
// been no calls to the returned function in delay milliseconds.
// Useful for preventing excessive calls from event handlers (e.g. not drawing on every resize event)
export function limiter(func, delay) {
    return () => {
        const id = timeoutIdForFunc.get(func)
        if (id) {
            clearTimeout(id)
        }
        timeoutIdForFunc.set(func, setTimeout(func, delay))
    }
}