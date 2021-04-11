// +build wasm

package main

import (
	"github.com/bhollier/minesweeper/internal/io/webio"
)

func main() {
	io := webio.New()
	io.Run()
}
