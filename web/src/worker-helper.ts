import * as Util from "./util"

// Messages that have been posted while the worker is being created
const queuedMessages: Array<Message> = []

// Create the WASM web worker
Util.consoleLog("Creating WASM worker")
const worker = new Worker('src/worker.src')

// Whether the worker has been connected
export let workerConnected = false

// A map of promises, indexed by message ID
const promises = new Map<string, Array<Function>>()

type Message = {
    cmd: string,
    id: string,
    data: any
}

type ResponseMessage = Message & {
    success: boolean
}

function newMessage(cmd, data): Message {
    return {
        cmd,
        // We're assuming the cmd name + current time in milliseconds is a good enough ID
        id: cmd + Date.now(),
        data
    }
}

Util.consoleLog("Registering WebIO event listener for Go")
worker.addEventListener("message", e => {
    if (e.data) {
        const response: ResponseMessage = e.data
        const promise = promises.get(response.id)
        const [resolve, reject] = promise
        if (response.success) {
            resolve(response.data)
        } else {
            Util.consoleLog("Error response for '" + response.cmd + "': " + response.data)
            reject(response.data)
        }
    }
})

export function postMessage(cmd: string, data?: any, noQueue?: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
        const msg = newMessage(cmd, data)
        // Add the promise
        promises.set(msg.id, [resolve, reject])
        if (!noQueue && !workerConnected) {
            Util.consoleLog(cmd + " message received, but worker hasn't connected yet. Adding to queue")
            queuedMessages.push(msg)
        } else {
            worker.postMessage(msg)
        }
    })
}

async function sendPing(timeout: number): Promise<boolean> {
    const pingPromise = postMessage("ping", null, true)
    const timeoutPromise = new Promise((_, r) => setTimeout(r, timeout))

    try {
        // Await the ping, and if it succeeds
        await Promise.race([pingPromise, timeoutPromise])
        // Set the worker as connected
        workerConnected = true
        // Post the queued messages to the worker
        queuedMessages.forEach((msg) => {
            worker.postMessage(msg)
        })
        // Clear the queue
        queuedMessages.length = 0
        return true

        // If the timeout promise resolved first
    } catch (_) {
        return false
    }
}

const MAX_PINGS = 5

async function sendPingUntilConnect() {
    let pings = 0
    let timeout = 100
    while (!workerConnected && pings < MAX_PINGS) {
        Util.consoleLog("Sending ping with timeout " + timeout + "ms")
        pings++
        if (!await sendPing(timeout)) {
            timeout = timeout * 2
            Util.consoleLog("Ping timeout reached")
        }
    }

    if (pings >= MAX_PINGS) {
        throw new Error("Max pings " + MAX_PINGS + " reached, assuming WASM module is not functional")
    }
}
sendPingUntilConnect().then(() => {
    Util.consoleLog("Response to ping received, worker connected")
})