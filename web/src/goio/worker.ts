if (!WebAssembly.instantiateStreaming) { // polyfill
    WebAssembly.instantiateStreaming = async (resp, importObject) => {
        const source = await (await resp).arrayBuffer();
        return await WebAssembly.instantiate(source, importObject);
    };
}

importScripts(new URL('../../vendor/wasm_exec.js', import.meta.url));
const APP_WASM_PATH = new URL('../../wasm/app.wasm', import.meta.url);

const go = new Go();
let inst;
WebAssembly.instantiateStreaming(fetch(APP_WASM_PATH.toString()), go.importObject).then(
    (result) => {
        inst = result.instance;
        go.run(inst);
    });