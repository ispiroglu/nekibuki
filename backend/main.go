package main

import (
	"log"
	"os"
	"os/exec"
)

func main() {
	log.Println("This main.go is deprecated. Please use 'go run cmd/server/main.go' instead.")
	log.Println("Running the new server structure...")

	// Run the new server
	cmd := exec.Command("go", "run", "cmd/server/main.go")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
