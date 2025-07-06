package mcpclient

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGetMCPServerPath_TDDPRO_PATH(t *testing.T) {
	dir := t.TempDir()
	mockDir := filepath.Join(dir, "packages", "tdd-pro")
	if err := os.MkdirAll(mockDir, 0755); err != nil {
		t.Fatalf("Failed to create mock dir: %v", err)
	}
	mockServer := filepath.Join(mockDir, "mcp-stdio-server.ts")
	if err := os.WriteFile(mockServer, []byte("#!/bin/sh\necho 'mock'\n"), 0755); err != nil {
		t.Fatalf("Failed to write mock server: %v", err)
	}
	os.Setenv("TDDPRO_PATH", dir)
	defer os.Unsetenv("TDDPRO_PATH")
	path, err := GetMCPServerPath()
	if err != nil {
		t.Fatalf("Expected to find server, got error: %v", err)
	}
	if path != mockServer {
		t.Errorf("Expected %s, got %s", mockServer, path)
	}
}

func TestGetMCPServerPath_NotFound(t *testing.T) {
	os.Unsetenv("TDDPRO_PATH")
	_, err := GetMCPServerPath()
	if err == nil {
		t.Fatal("Expected error when server not found, got nil")
	}
}
