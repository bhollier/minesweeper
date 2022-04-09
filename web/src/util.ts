import dateFormat from "dateformat"

const LOG_TIME_FORMAT = "yyyy/mm/dd HH:MM:ss.l"

// Writes the given text to the console, with 'JS: ' prepended (to distinguish
// from logs in the WASM module)
export function consoleLog(s) {
    const now = new Date()
    console.log("(" + dateFormat(now, LOG_TIME_FORMAT) + ") JS: " + s)
}

export function cloneObj(o) {
    return JSON.parse(JSON.stringify(o))
}

const timeoutIdForFunc = new Map<TimerHandler, number>()

// Returns a function that only calls func if there have
// been no calls to the returned function in delay milliseconds.
// Useful for preventing excessive calls from event handlers (e.g. not drawing on every resize event)
export function limiter(func: TimerHandler, delay: number) {
    return () => {
        const id = timeoutIdForFunc.get(func)
        if (id) {
            clearTimeout(id)
        }
        timeoutIdForFunc.set(func, setTimeout(func, delay))
    }
}