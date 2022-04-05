package main

import (
	"log"
	"net/http"
	"strings"
)

func main() {
	fs := http.FileServer(http.Dir("./web"))
	err := http.ListenAndServe(":8080", http.HandlerFunc(
		func(resp http.ResponseWriter, req *http.Request) {
			resp.Header().Add("Cache-Control", "no-cache")
			if strings.HasSuffix(req.URL.Path, ".wasm") {
				resp.Header().Set("content-type", "application/wasm")
			}
			fs.ServeHTTP(resp, req)
		}))
	if err != nil {
		log.Fatal(err)
	}
}
