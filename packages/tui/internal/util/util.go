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

// StatFunc is a function type for file stat operations.
type StatFunc func(name string) (os.FileInfo, error)

// FindTddProDirectory traverses up from start, skipping $HOME/.tdd-pro unless no other is found.
// Accepts a stat function for testability.
func FindTddProDirectory(start string, stat StatFunc) string {
	home, _ := os.UserHomeDir()
	homeTddPro := filepath.Join(home, ".tdd-pro")
	dir := start
	var found string

	for {
		candidate := filepath.Join(dir, ".tdd-pro")
		if _, err := stat(candidate); err == nil {
			if candidate != homeTddPro {
				return candidate // Prefer project-local .tdd-pro
			} else {
				found = candidate // Save $HOME/.tdd-pro in case nothing else is found
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	// Only return $HOME/.tdd-pro if nothing else was found
	return found
}

// FindTddProDirectoryDefault uses the real file system.
func FindTddProDirectoryDefault(start string) string {
	return FindTddProDirectory(start, os.Stat)
}

// IsAlreadyInitialized returns true if a project-local .tdd-pro exists (not just ~/.tdd-pro)
func IsAlreadyInitialized(startDir string) bool {
	return FindTddProDirectory(startDir, os.Stat) != ""
}
