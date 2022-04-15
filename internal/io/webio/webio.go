package webio

import (
	ms "github.com/bhollier/minesweeper/pkg/minesweeper"
	"math/rand"
	"syscall/js"
	"time"
)

// WebIO is an IO for minesweeper with javascript
type WebIO struct {
	game ms.Game
}

func New() *WebIO {
	return new(WebIO)
}

// Run registers the event listeners with JS and then waits forever
func (io *WebIO) Run() {
	rand.Seed(time.Now().Unix())
	consoleLog("Registering WebIO event listener for JS")
	js.Global().Get("self").Call(
		"addEventListener", "message",
		js.FuncOf(io.eventHandler), true)
	// Wait infinitely
	// todo don't do this, maybe using a context.Context
	channel := make(chan bool)
	<-channel
}
