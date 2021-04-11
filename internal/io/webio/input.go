package webio

import (
	ms "github.com/bhollier/minesweeper/pkg/minesweeper"
	"math/rand"
	"syscall/js"
	"time"
)

func (io *WebIO) eventHandler(_ js.Value, args []js.Value) interface{} {
	event := args[0].Get("data")
	eventType := event.Index(0).String()
	eventData := event.Index(1)
	switch eventType {
	case "init":
		io.handleInit(eventData)
	case "appearance-request":
		io.handleAppearanceRequest()
	case "uncover":
		io.handleUncover(eventData)
	case "flag":
		io.handleFlag(eventData)
	}
	return nil
}

func (io *WebIO) handleInit(event js.Value) {
	consoleLog("Received 'init'")
	// Destroy the game first
	io.game = nil
	width := event.Get("width").Int()
	height := event.Get("height").Int()
	mines := event.Get("mines").Int()
	consoleLogF("Creating game (width = %d, height = %d, mines = %d)",
		width, height, mines)
	var err error
	rand.Seed(time.Now().Unix())
	io.game, err = ms.NewGame(width, height, mines)
	if err != nil {
		consoleLog("Error:", err)
		sendInitError(err)
		return
	}
	consoleLog("Done")
	sendInitOK()
}

func (io *WebIO) handleAppearanceRequest() {
	sendAppearanceResponse(io.game.Appearance())
}

func (io *WebIO) handleUncover(event js.Value) {
	if io.game == nil {
		return
	}
	io.game.Uncover(event.Get("x").Int(), event.Get("y").Int())
	sendStateResponse(io.game.State(), io.game.SinceStart())
	sendAppearanceResponse(io.game.Appearance())
}

func (io *WebIO) handleFlag(event js.Value) {
	if io.game == nil {
		return
	}
	io.game.Flag(event.Get("x").Int(), event.Get("y").Int())
	sendAppearanceResponse(io.game.Appearance())
}
