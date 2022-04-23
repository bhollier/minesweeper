import dateFormat from 'dateformat';

const LOG_TIME_FORMAT = 'yyyy/mm/dd HH:MM:ss.l';

// Writes the given text to the console, with 'JS: ' prepended (to distinguish
// from logs in the WASM module)
export function consoleLog(s) {
    const now = new Date();
    console.log('(' + dateFormat(now, LOG_TIME_FORMAT) + ') JS: ' + s);
}

export function cloneObj(o) {
    return JSON.parse(JSON.stringify(o));
}

export function formatNumber(n: number, maxDigits?: number, padding?: boolean): string {
    if (maxDigits !== undefined) {
        n = Math.min(n, Math.pow(10, maxDigits) - 1);
        n = Math.max(n, -(Math.pow(10, maxDigits) - 1));
    }

    let nStr = n.toString(10);

    // Don't add padding to negative numbers
    if (padding && n >= 0) {
        nStr = [...Array(maxDigits - nStr.length)].map(() => '0').join('').concat(nStr);
    }

    return nStr;
}