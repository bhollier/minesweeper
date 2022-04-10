package webio

import (
	"fmt"
	ms "github.com/bhollier/minesweeper/pkg/minesweeper"
	"strconv"
	"syscall/js"
	"time"
)

type Message struct {
	Cmd  string
	Id   js.Value
	Data js.Value
}

func MessageFromJS(val js.Value) Message {
	return Message{
		Cmd:  val.Get("cmd").String(),
		Id:   val.Get("id"),
		Data: val.Get("data"),
	}
}

func (io *WebIO) eventHandler(_ js.Value, args []js.Value) interface{} {
	msg := MessageFromJS(args[0].Get("data"))

	// Handle any panics properly
	defer func() {
		if r := recover(); r != nil {
			err, ok := r.(error)
			if ok {
				consoleLogF("Recovered from panic: %s", err.Error())
				sendError(msg, err)
			} else {
				consoleLogF("Recovered from panic: %v", r)
				sendError(msg, fmt.Errorf("%v", r))
			}
		}
	}()

	switch msg.Cmd {
	case "ping":
		sendSuccess(msg)
	case "init":
		io.handleInit(msg)
	case "appearance":
		io.handleAppearance(msg)
	case "uncover":
		io.handleUncover(msg)
	case "flag":
		io.handleFlag(msg)
	/*case "save":
		io.handleSave(msg)
	case "load":
		io.handleLoad(msg)*/
	default:
		sendError(msg, fmt.Errorf("Unknown cmd "+msg.Cmd))
	}
	return nil
}

func (io *WebIO) handleInit(msg Message) {
	consoleLog("Received '" + msg.Cmd + "'")
	width := msg.Data.Get("width").Int()
	height := msg.Data.Get("height").Int()
	mines := msg.Data.Get("mines").Int()
	consoleLogF("Creating game (width = %d, height = %d, mines = %d)",
		width, height, mines)
	// Create a new game with the options
	g, err := ms.NewGame(width, height, mines)
	if err != nil {
		consoleLog("Error:", err)
		sendError(msg, err)
		return
	}
	// If all goes well, set the game to the new one
	io.game = g
	sendSuccess(msg)
}

func appearancePayload(appearance [][]ms.TileType) []interface{} {
	// Convert the appearance array into something js can understand
	payload := make([]interface{}, len(appearance))
	for y, row := range appearance {
		responseRow := make([]interface{}, len(row))
		for x, tile := range row {
			var tileStr string
			switch tile {
			case ms.TileTypeEmpty:
				tileStr = "EMPTY"
			case ms.TileTypeFlag:
				tileStr = "FLAG"
			case ms.TileTypeHidden:
				tileStr = "HIDDEN"
			case ms.TileTypeMine:
				tileStr = "MINE"
			case ms.TileType1, ms.TileType2, ms.TileType3, ms.TileType4,
				ms.TileType5, ms.TileType6, ms.TileType7, ms.TileType8:
				tileStr = strconv.Itoa(int(tile) - int(ms.TileType1) + 1)
			}
			responseRow[x] = tileStr
		}
		payload[y] = responseRow
	}
	return payload
}

func statePayload(s ms.GameState, timer time.Duration) map[string]interface{} {
	return map[string]interface{}{
		"state": s.String(),
		"timer": timer.Milliseconds(),
	}
}

func (io *WebIO) handleAppearance(msg Message) {
	sendSuccessWithPayload(msg, appearancePayload(io.game.Appearance()))
}

func (io *WebIO) handleUncover(msg Message) {
	if io.game == nil {
		return
	}
	io.game.Uncover(msg.Data.Get("x").Int(), msg.Data.Get("y").Int())
	sendSuccessWithPayload(msg, statePayload(io.game.State(), io.game.SinceStart()))
}

func (io *WebIO) handleFlag(msg Message) {
	if io.game == nil {
		return
	}
	io.game.Flag(msg.Data.Get("x").Int(), msg.Data.Get("y").Int())
	sendSuccess(msg)
}

/*
func (io *WebIO) handleSave(msg Message) {
	consoleLog("Received '" + msg.Cmd + "'")
	// Copy the game
	gCopy := *io.game
	// Start a thread to save it
	go func() {
		// Save the game state to the byte buffer
		var buf bytes.Buffer
		err := gCopy.Save(&buf)
		if err != nil {
			sendError(msg, err)
		} else {
			sendSuccessWithPayload(msg, hex.EncodeToString(buf.Bytes()))
		}
	}()
}

func (io *WebIO) handleLoad(msg Message) {
	consoleLog("Received '" + msg.Cmd + "'")
	// Decode the event message as a hex string
	consoleLogF("Decoding save data '%s'", msg.Data.String())
	b, err := hex.DecodeString(msg.Data.String())
	if err != nil {
		sendError(msg, err)
		return
	}
	// Create a byte buffer from the decoded string
	buf := bytes.NewBuffer(b)
	// Load the game from the bytes
	consoleLog("Creating game from save data")
	g, err := ms.Load(buf)
	if err != nil {
		sendError(msg, err)
		return
	}
	// If all goes well, set the game to the new one
	io.game = g
	// Send OK
	sendSuccess(msg)
}
*/
