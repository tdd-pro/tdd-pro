package util

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGetConfigDir(t *testing.T) {
	home, err := os.UserHomeDir()
	if err != nil {
		t.Fatal("could not get user home dir")
	}
	expected := filepath.Join(home, ".tdd-pro")
	if got := GetConfigDir(); got != expected {
		t.Errorf("GetConfigDir() = %q, want %q", got, expected)
	}
}

func TestFindTddProDirectory(t *testing.T) {
	tempHome := t.TempDir()
	os.Setenv("HOME", tempHome)
	defer os.Unsetenv("HOME")

	// Only ~/.tdd-pro exists
	homeTddPro := filepath.Join(tempHome, ".tdd-pro")
	os.MkdirAll(homeTddPro, 0755)
	if got := FindTddProDirectory(filepath.Join(tempHome, "foo")); got != homeTddPro {
		t.Errorf("FindTddProDirectory (only home) = %q, want %q", got, homeTddPro)
	}

	// Project-local .tdd-pro exists
	proj := filepath.Join(tempHome, "project")
	os.MkdirAll(proj, 0755)
	projTddPro := filepath.Join(proj, ".tdd-pro")
	os.MkdirAll(projTddPro, 0755)
	if got := FindTddProDirectory(filepath.Join(proj, "subdir")); got != projTddPro {
		t.Errorf("FindTddProDirectory (project-local) = %q, want %q", got, projTddPro)
	}

	// No .tdd-pro exists
	other := filepath.Join(tempHome, "other")
	os.MkdirAll(other, 0755)
	if got := FindTddProDirectory(other); got != "" {
		t.Errorf("FindTddProDirectory (none) = %q, want empty", got)
	}
}

func TestIsAlreadyInitialized(t *testing.T) {
	tempHome := t.TempDir()
	os.Setenv("HOME", tempHome)
	defer os.Unsetenv("HOME")

	// Only ~/.tdd-pro exists
	homeTddPro := filepath.Join(tempHome, ".tdd-pro")
	os.MkdirAll(homeTddPro, 0755)
	if !IsAlreadyInitialized(filepath.Join(tempHome, "foo")) {
		t.Error("IsAlreadyInitialized (only home) = false, want true")
	}

	// Project-local .tdd-pro exists
	proj := filepath.Join(tempHome, "project")
	os.MkdirAll(proj, 0755)
	projTddPro := filepath.Join(proj, ".tdd-pro")
	os.MkdirAll(projTddPro, 0755)
	if !IsAlreadyInitialized(filepath.Join(proj, "subdir")) {
		t.Error("IsAlreadyInitialized (project-local) = false, want true")
	}

	// No .tdd-pro exists
	other := filepath.Join(tempHome, "other")
	os.MkdirAll(other, 0755)
	if IsAlreadyInitialized(other) {
		t.Error("IsAlreadyInitialized (none) = true, want false")
	}
}
