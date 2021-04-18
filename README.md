## Minesweeper

A very overcomplicated minesweeper clone. The backend is implemented entirely in 
Go, with a [pixel](https://github.com/faiface/pixel) and a web frontend. The
pixel frontend is very simplistic and exists purely for debugging purposes (for 
now). The web frontend is much more sophisticated, it is compiled into Web 
Assembly and communicates with Javascript using events.

Take a look at the web version for yourself [here](https://bhollier.github.io/minesweeper/index.html)

![Screenshot of the minesweeper clone running in a browser](screenshot.png)

### Running in a window

Execute the following command in the root of the repo to build and run the pixel
frontend:

```shell
go run cmd/pixel/main.go
```

This creates a game with "intermediate" difficulty (16 x 16, 40 mines). The
program needs to be restarted (closed and rerun) if the user wins or loses
a game. Uses standard minesweeper controls (lmb to uncover a tile, rmb to place a 
flag)

### Running in a browser

Firstly, to build the WASM module, run the following command in the root of the 
repo:

```shell
GOOS=js GOARCH=wasm go build -o ./web/wasm/app.wasm cmd/web/main.go
```

Now you can start a web server in `web`. If you don't have a webserver, a very 
simple one is included:

```shell
go run cmd/web/main.go
```

This will serve the web frontend at http://localhost:8080

#### tinygo

Currently, building the WASM module with `go` creates a file that is ~2MB. This 
can be reduced down to ~150KB by compiling with [tinygo](https://tinygo.org/):

```shell
tinygo -o ./web/wasm/app.wasm -target wasm --no-debug cmd/web/main.go
```

The `wasm_exec.js` file in ./web/js also needs to be replaced with the tinygo
version. On debian systems, this can be done with the following command:

```shell
cp /usr/local/lib/tinygo/targets/wasm_exec.js ./web/js/wasm_exec.js
```
