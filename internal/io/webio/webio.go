package webio

import (
	ms "github.com/bhollier/minesweeper/pkg/minesweeper"
	"syscall/js"
)

// Type for the WebIO object
type WebIO struct {
	game *ms.Game
}

func New() *WebIO {
	return new(WebIO)
}

// Gets the game
func (io *WebIO) Game() *ms.Game {
	return io.game
}

// Runs the WebIO object
func (io *WebIO) Run() {
	consoleLog("Registering WebIO event listener for JS...")
	js.Global().Get("self").Call(
		"addEventListener", "message",
		js.FuncOf(io.eventHandler), true)
	consoleLog("Done")
	sendCreateOK()
	// Wait infinitely
	channel := make(chan bool)
	<-channel
}
