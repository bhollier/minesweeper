if (!WebAssembly.instantiateStreaming) { // polyfill
    WebAssembly.instantiateStreaming = async (resp, importObject) => {
        const source = await (await resp).arrayBuffer();
        return await WebAssembly.instantiate(source, importObject);
    };
}

importScripts('./vendor/wasm_exec.js');
const APP_WASM_PATH = "../wasm/app.wasm";

const go = new Go();
let mod, inst;
WebAssembly.instantiateStreaming(fetch(APP_WASM_PATH), go.importObject).then(
    (result) => {
        mod = result.module;
        inst = result.instance;
        go.run(inst);
    });