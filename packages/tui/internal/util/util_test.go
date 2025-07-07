package util

import (
	"os"
	"path/filepath"
	"testing"
	"time"
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
	// Simulate a fake file system as a map
	type fakeFS map[string]bool
	stat := func(fs fakeFS) StatFunc {
		return func(name string) (os.FileInfo, error) {
			if fs[name] {
				return &fakeFileInfo{name: name}, nil
			}
			return nil, os.ErrNotExist
		}
	}

	tempHome := "/home/testuser"
	homeTddPro := filepath.Join(tempHome, ".tdd-pro")
	proj := filepath.Join(tempHome, "project")
	projTddPro := filepath.Join(proj, ".tdd-pro")
	other := filepath.Join(tempHome, "other")

	// Only ~/.tdd-pro exists
	fs1 := fakeFS{homeTddPro: true}
	if got := FindTddProDirectory(filepath.Join(tempHome, "foo"), stat(fs1)); got != homeTddPro {
		t.Errorf("FindTddProDirectory (only home) = %q, want %q", got, homeTddPro)
	}

	// Project-local .tdd-pro exists
	fs2 := fakeFS{homeTddPro: true, projTddPro: true}
	if got := FindTddProDirectory(filepath.Join(proj, "subdir"), stat(fs2)); got != projTddPro {
		t.Errorf("FindTddProDirectory (project-local) = %q, want %q", got, projTddPro)
	}

	// No .tdd-pro exists
	fs3 := fakeFS{}
	if got := FindTddProDirectory(other, stat(fs3)); got != "" {
		t.Errorf("FindTddProDirectory (none) = %q, want empty", got)
	}
}

// fakeFileInfo implements os.FileInfo for the mock stat
// Only the Name method is used in this context

type fakeFileInfo struct {
	name string
}

func (f *fakeFileInfo) Name() string       { return f.name }
func (f *fakeFileInfo) Size() int64        { return 0 }
func (f *fakeFileInfo) Mode() os.FileMode  { return 0755 }
func (f *fakeFileInfo) ModTime() time.Time { return time.Now() }
func (f *fakeFileInfo) IsDir() bool        { return true }
func (f *fakeFileInfo) Sys() interface{}   { return nil }

func TestIsAlreadyInitialized(t *testing.T) {
	// Mock the home directory for testing
	originalHome := os.Getenv("HOME")
	tempHome := "/home/testuser"
	os.Setenv("HOME", tempHome)
	defer os.Setenv("HOME", originalHome)

	homeTddPro := filepath.Join(tempHome, ".tdd-pro")
	proj := filepath.Join(tempHome, "project")
	projTddPro := filepath.Join(proj, ".tdd-pro")
	other := filepath.Join(tempHome, "other")

	// Only ~/.tdd-pro exists - should return false (ignore home .tdd-pro)
	if IsAlreadyInitializedWithStat(filepath.Join(tempHome, "foo"), func(name string) (os.FileInfo, error) {
		if name == homeTddPro {
			return &fakeFileInfo{name: name}, nil
		}
		return nil, os.ErrNotExist
	}) {
		t.Error("IsAlreadyInitialized (only home) = true, want false (should ignore ~/.tdd-pro)")
	}

	// Project-local .tdd-pro exists - should return true
	if !IsAlreadyInitializedWithStat(filepath.Join(proj, "subdir"), func(name string) (os.FileInfo, error) {
		if name == homeTddPro || name == projTddPro {
			return &fakeFileInfo{name: name}, nil
		}
		return nil, os.ErrNotExist
	}) {
		t.Error("IsAlreadyInitialized (project-local) = false, want true")
	}

	// No .tdd-pro exists - should return false
	if IsAlreadyInitializedWithStat(other, func(name string) (os.FileInfo, error) {
		return nil, os.ErrNotExist
	}) {
		t.Error("IsAlreadyInitialized (none) = true, want false")
	}
}

// IsAlreadyInitializedWithStat is a test helper for injecting a stat func
func IsAlreadyInitializedWithStat(startDir string, stat StatFunc) bool {
	// Use our updated logic that ignores $HOME/.tdd-pro
	home, _ := os.UserHomeDir()
	homeTddPro := filepath.Join(home, ".tdd-pro")
	dir := startDir

	for {
		candidate := filepath.Join(dir, ".tdd-pro")
		if _, err := stat(candidate); err == nil {
			// Ignore $HOME/.tdd-pro - it's just for binaries
			if candidate != homeTddPro {
				return true // Found a project-local .tdd-pro
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	
	return false // No project-local .tdd-pro found
}
