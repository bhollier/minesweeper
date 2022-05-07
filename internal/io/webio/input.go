package webio

import (
	"bytes"
	"encoding/base64"
	"fmt"
	ms "github.com/bhollier/minesweeper/pkg/minesweeper"
	"math"
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
	case "state":
		io.handleState(msg)
	case "uncover":
		io.handleUncover(msg)
	case "flag":
		io.handleFlag(msg)
	case "save":
		io.handleSave(msg)
	case "load":
		io.handleLoad(msg)
	default:
		sendError(msg, fmt.Errorf("Unknown cmd "+msg.Cmd))
	}
	return nil
}

func (io *WebIO) handleInit(msg Message) {
	consoleLog("Received '" + msg.Cmd + "'")
	var g ms.Game
	// If a mine density was given, the minesweeper field is infinite
	if !msg.Data.Get("mineDensity").IsUndefined() {
		mineDensity := msg.Data.Get("mineDensity").Int()
		consoleLogF("Creating infinite game (mineDensity = %d)", mineDensity)
		// Create a new game with the options
		var err error
		g, err = ms.NewInfiniteGame(mineDensity)
		if err != nil {
			consoleLog("Error:", err)
			sendError(msg, err)
			return
		}

		// Otherwise, assume it's a normal, finite minesweeper game
	} else {
		width := msg.Data.Get("width").Int()
		height := msg.Data.Get("height").Int()
		mines := msg.Data.Get("mines").Int()
		consoleLogF("Creating game (width = %d, height = %d, mines = %d)",
			width, height, mines)
		// Create a new game with the options
		var err error
		g, err = ms.NewGame(width, height, mines)
		if err != nil {
			consoleLog("Error:", err)
			sendError(msg, err)
			return
		}
	}

	// If all goes well, set the game to the new one
	io.game = g
	sendSuccess(msg)
}

func appearancePayload(appearance map[ms.Pos]ms.TileType) interface{} {
	arrConstructor := js.Global().Get("Array")

	// Create a JS array
	payload := arrConstructor.New()

	// Iterate over the tiles
	for pos, tileType := range appearance {
		var tileStr string
		switch tileType {
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
			tileStr = strconv.Itoa(int(tileType) - int(ms.TileType1) + 1)
		}

		// Get the row from the payload
		row := payload.Index(pos.Y)
		// If it hasn't been set, create a new row
		if row.IsUndefined() {
			row = arrConstructor.New()
		}

		// Add the tile string to the row
		row.SetIndex(pos.X, tileStr)
		payload.SetIndex(pos.Y, row)
	}
	return payload
}

func statePayload(s ms.GameState, timer time.Duration) map[string]interface{} {
	return map[string]interface{}{
		"state": s.String(),
		"timer": timer.Milliseconds(),
	}
}

func flagPayload(remaining float64) map[string]interface{} {
	var remainingMines interface{}
	if math.IsInf(remaining, 1) {
		remainingMines = js.Global().Get("Infinity")
	} else {
		remainingMines = remaining
	}

	return map[string]interface{}{
		"remainingMines": remainingMines,
	}
}

func fullStatePayload(game ms.Game) map[string]interface{} {
	payload := statePayload(game.State(), game.SinceStart())
	for key, value := range flagPayload(game.RemainingMines()) {
		payload[key] = value
	}
	return payload
}

func loadPayload(game ms.Game) map[string]interface{} {
	switch g := game.(type) {
	case *ms.FiniteGame:
		w, h := g.Size()
		return map[string]interface{}{
			"width":  w,
			"height": h,
			"mines":  g.StartingMines(),
		}
	case *ms.InfiniteGame:
		return map[string]interface{}{
			"mineDensity": g.MineDensity(),
		}
	default:
		panic("unknown game type")
	}
}

func (io *WebIO) handleAppearance(msg Message) {
	x, y, w, h := msg.Data.Get("x").Int(), msg.Data.Get("y").Int(),
		msg.Data.Get("w").Int(), msg.Data.Get("h").Int()
	sendSuccessWithPayload(msg, appearancePayload(io.game.Appearance(x, y, w, h)))
}

func (io *WebIO) handleState(msg Message) {
	sendSuccessWithPayload(msg, fullStatePayload(io.game))
}

func (io *WebIO) handleUncover(msg Message) {
	io.game.Uncover(msg.Data.Get("x").Int(), msg.Data.Get("y").Int())
	sendSuccessWithPayload(msg, statePayload(io.game.State(), io.game.SinceStart()))
}

func (io *WebIO) handleFlag(msg Message) {
	remaining := io.game.Flag(msg.Data.Get("x").Int(), msg.Data.Get("y").Int())
	sendSuccessWithPayload(msg, flagPayload(remaining))
}

func (io *WebIO) handleSave(msg Message) {
	consoleLog("Received '" + msg.Cmd + "'")
	// todo clone the game to save multithreaded?
	// Save the game state to the byte buffer
	var buf bytes.Buffer
	err := io.game.Save(&buf)
	if err != nil {
		sendError(msg, err)
	} else {
		sendSuccessWithPayload(msg, base64.StdEncoding.EncodeToString(buf.Bytes()))
	}
}

func (io *WebIO) handleLoad(msg Message) {
	consoleLog("Received '" + msg.Cmd + "'")
	// Decode the event message as a hex string
	b, err := base64.StdEncoding.DecodeString(msg.Data.String())
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
	sendSuccessWithPayload(msg, loadPayload(io.game))
}
