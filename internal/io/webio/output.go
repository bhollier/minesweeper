package webio

import (
	"syscall/js"
)

type ResponseMessage struct {
	Message
	Success bool
}

func (m ResponseMessage) ToJS() js.Value {
	return js.ValueOf(map[string]interface{}{
		"cmd":     m.Cmd,
		"id":      m.Id,
		"success": m.Success,
		"data":    m.Data,
	})
}

func postMessage(orig Message, success bool, payload interface{}) {
	js.Global().Call("postMessage", ResponseMessage{
		Message{
			Cmd:  orig.Cmd,
			Id:   orig.Id,
			Data: js.ValueOf(payload),
		},
		success,
	}.ToJS())
}

func sendSuccess(orig Message) {
	postMessage(orig, true, nil)
}

func sendSuccessWithPayload(orig Message, payload interface{}) {
	postMessage(orig, true, payload)
}

func sendError(orig Message, err error) {
	postMessage(orig, false, err.Error())
}
