package util

import (
	"os"
	"path/filepath"
)

// GetConfigDir returns the path to the user's config directory (~/.tdd-pro)
func GetConfigDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".tdd-pro")
}

// FindTddProDirectory traverses up from startDir, skipping ~/.tdd-pro unless no other is found.
// Returns the path to the .tdd-pro directory, or "" if not found.
func FindTddProDirectory(startDir string) string {
	homeConfig := GetConfigDir()
	var foundHome string
	dir := startDir
	for {
		tddProPath := filepath.Join(dir, ".tdd-pro")
		if stat, err := os.Stat(tddProPath); err == nil && stat.IsDir() {
			if filepath.Clean(tddProPath) == filepath.Clean(homeConfig) {
				foundHome = tddProPath
			} else {
				return tddProPath
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	if foundHome != "" {
		return foundHome
	}
	return ""
}

// IsAlreadyInitialized returns true if a project-local .tdd-pro exists (not just ~/.tdd-pro)
func IsAlreadyInitialized(startDir string) bool {
	return FindTddProDirectory(startDir) != ""
}
