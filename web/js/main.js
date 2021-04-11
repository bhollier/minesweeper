function consoleLog(s) {
    console.log("JS: " + s)
}

// Try to get the width, height and mines from the session storage
{
    const width = sessionStorage.getItem("width")
    if (width != null) {
        document.getElementById("width").value = width
    }
    const height = sessionStorage.getItem("height")
    if (height != null) {
        document.getElementById("height").value = height
    }
    const mines = sessionStorage.getItem("mines")
    if (mines != null) {
        document.getElementById("mines").value = mines
    }
}

// Constants for the displayed size of a tile
const TILE_SIZE = 30
// And the size of the sprite in spritesheet.png
const SPRITE_SIZE = 10

// Get the canvas
const canvas = document.getElementById("canvas")
const ctx = canvas.getContext('2d')

// The WASM web worker
let worker

// Load the spritesheet
consoleLog("Loading spritesheet.png...")
const spritesheet = new Image();

// Add a listener for when the sheet is loaded
spritesheet.addEventListener('load', function() {
    consoleLog("Done")
    // Create the WASM web worker
    consoleLog("Creating WASM worker...")
    worker = new Worker('js/worker.js')
    consoleLog("Setting onmessage handler")
    // The event handler for receiving events from Go
    worker.onmessage = function (e) {
        let msg = e.data
        switch (msg[0]) {
            case "create-ok":
                consoleLog("Received 'create-ok'")
                consoleLog("Registering WebIO event listener for GO...")
                connectWebIO()
                consoleLog("Done")
                init()
                break
            case "init-ok":
                consoleLog("Received 'init-ok'")
                consoleLog("Requesting initial appearance...")
                worker.postMessage(["appearance-request"])
                break
            case "init-err":
                consoleLog("Received 'init-err'")
                initError(msg[1])
                break
            case "state":
                updateState(msg[1])
                break
            case "appearance-response":
                drawAppearance(msg[1])
                break
        }
    }
})
spritesheet.src = 'spritesheet.png'

// Whether the state has been displayed since initialisation
let stateDisplayed = false

// Sends initialisation info to Go
function init() {
    stateDisplayed = false
    consoleLog("Sending 'init'")
    // Get the parameters from the document
    const width = document.getElementById("width").value
    const height = document.getElementById("height").value
    const mines = document.getElementById("mines").value
    // Post the init message
    worker.postMessage(["init", {
        "width": parseInt(width),
        "height": parseInt(height),
        "mines": parseInt(mines),
    }])
    // Add the parameters to the session storage
    sessionStorage.setItem("width", width)
    sessionStorage.setItem("height", height)
    sessionStorage.setItem("mines", mines)

    // Set the canvas' size
    canvas.width = width * TILE_SIZE
    canvas.height = height * TILE_SIZE

    // Make sure the pixel art is crisp
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
}

// Handles an error while initialising
function initError(error) {
    const stateElement = document.getElementById("state")
    stateElement.innerText = "Error: " + error
    stateElement.style.visibility = "visible"
    stateDisplayed = true
}

// The conduit for HTML events to Go
function connectWebIO() {
    // todo handle long press for mobile
    canvas.addEventListener("pointerdown", function(e) {
        if (e.isPrimary) {
            const rect = canvas.getBoundingClientRect()
            const canvasX = Math.round(e.clientX - rect.left)
            const canvasY = Math.round(e.clientY - rect.top)
            const eventData = {
                x: Math.floor(canvasX / TILE_SIZE),
                y: Math.floor(canvasY / TILE_SIZE),
            };
            if (e.button === 0) {
                worker.postMessage(["uncover", eventData])
            } else if (e.button === 2) {
                worker.postMessage(["flag", eventData])
            }
        }
    })
    // Prevent the context menu when right clicking
    canvas.addEventListener("contextmenu", function(e) {
        e.preventDefault()
    })
}

// Handle's the game's state being updated. Currently happens every time a user
// interacts with the game
function updateState(stateData) {
    const stateElement = document.getElementById("state")
    // If the game is finished and the state wasn't displayed
    if (stateData.state > 1 && stateDisplayed === false) {
        if (stateData.state === 2) {
            stateElement.innerText = "You lose! Elapsed time: " +
                (stateData.timer / 1000).toString() + "s"
        } else {
            stateElement.innerText = "You win! Elapsed time: " +
                (stateData.timer / 1000).toString() + "s"
        }
        // Display the state box
        stateElement.style.visibility = "visible"
        stateDisplayed = true

        // If the game isn't finished and the state hasn't been displayed
    } else if (stateDisplayed === false) {
        // Hide the state box
        stateElement.style.visibility = "hidden"
    }
}

// Draws the state of the game to the canvas.
function drawAppearance(appearanceData) {
    // todo slow for very large fields, as it draws tiles that don't change
    // Iterate over the tiles
    for (let y = 0; y < appearanceData.length; ++y) {
        for (let x = 0; x < appearanceData[y].length; ++x) {
            ctx.drawImage(spritesheet,
                appearanceData[y][x] * SPRITE_SIZE, 0,
                SPRITE_SIZE, SPRITE_SIZE,
                x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }
    }
}