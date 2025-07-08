package main

import (
	"flag"
	"fmt"
	"os"

	"tddpro/internal/tui"
)

// Version is injected at build time via -ldflags "-X main.version=..."
var version = "dev"

func main() {
	// Add --version and -v flag support
	showVersion := false
	flag.BoolVar(&showVersion, "version", false, "Print version and exit")
	flag.BoolVar(&showVersion, "v", false, "Print version and exit (shorthand)")
	flag.Parse()
	if showVersion {
		fmt.Println(version)
		os.Exit(0)
	}

	apiURL := tui.LoadAPIURL()
	if err := tui.Start(apiURL, version); err != nil {
		fmt.Println("Error running program:", err)
		os.Exit(1)
	}
}
