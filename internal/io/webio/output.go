package webio

import (
	ms "github.com/bhollier/minesweeper/pkg/minesweeper"
	"syscall/js"
	"time"
)

func postMessage(name string, msg interface{}) {
	js.Global().Call("postMessage", []interface{}{name, msg})
}

func sendCreateOK() {
	consoleLog("Sending 'create-ok'")
	postMessage("create-ok", "")
}

func sendInitOK() {
	consoleLog("Sending 'init-ok'")
	postMessage("init-ok", "")
}

func sendInitError(err error) {
	consoleLog("Sending 'init-err'")
	postMessage("init-err", err.Error())
}

func sendStateResponse(s ms.GameState, timer time.Duration) {
	body := make(map[string]interface{})
	body["state"] = int(s)
	body["timer"] = timer.Milliseconds()
	postMessage("state", body)
}

func sendAppearanceResponse(appearance [][]ms.TileType) {
	// Convert the appearance array into something js can understand
	response := make([]interface{}, len(appearance))
	for y, row := range appearance {
		responseRow := make([]interface{}, len(row))
		for x, tile := range row {
			responseRow[x] = int(tile)
		}
		response[y] = responseRow
	}
	postMessage("appearance-response", response)
}
