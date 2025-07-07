package mcpclient

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGetMCPServerPath_TDDPRO_MCP_PATH(t *testing.T) {
	// Test highest priority: TDDPRO_MCP_PATH
	dir := t.TempDir()
	mockServer := filepath.Join(dir, "custom-mcp-server")
	if err := os.WriteFile(mockServer, []byte("#!/bin/sh\necho 'mock'\n"), 0755); err != nil {
		t.Fatalf("Failed to write mock server: %v", err)
	}
	
	// Clear all env vars and set only TDDPRO_MCP_PATH
	os.Unsetenv("TDDPRO_PATH")
	os.Setenv("TDDPRO_MCP_PATH", mockServer)
	defer os.Unsetenv("TDDPRO_MCP_PATH")
	
	path, err := GetMCPServerPath()
	if err != nil {
		t.Fatalf("Expected to find server, got error: %v", err)
	}
	if path != mockServer {
		t.Errorf("Expected %s, got %s", mockServer, path)
	}
}

func TestGetMCPServerPath_InstalledBinary(t *testing.T) {
	// Test second priority: installed binary in ~/.tdd-pro/bin
	// This test will pass if the binary exists, skip if it doesn't
	
	// Clear env vars to test installed binary priority
	os.Unsetenv("TDDPRO_MCP_PATH")
	os.Unsetenv("TDDPRO_PATH")
	
	homeDir, err := os.UserHomeDir()
	if err != nil {
		t.Skip("Cannot get home directory")
	}
	
	expectedPath := filepath.Join(homeDir, ".tdd-pro", "bin", "tdd-pro-mcp")
	if _, err := os.Stat(expectedPath); os.IsNotExist(err) {
		t.Skip("Installed binary not found, skipping test")
	}
	
	path, err := GetMCPServerPath()
	if err != nil {
		t.Fatalf("Expected to find installed server, got error: %v", err)
	}
	if path != expectedPath {
		t.Errorf("Expected %s, got %s", expectedPath, path)
	}
}

func TestGetMCPServerPath_TDDPRO_PATH(t *testing.T) {
	// Test third priority: TDDPRO_PATH (legacy development mode)
	dir := t.TempDir()
	mockDir := filepath.Join(dir, "packages", "tdd-pro")
	if err := os.MkdirAll(mockDir, 0755); err != nil {
		t.Fatalf("Failed to create mock dir: %v", err)
	}
	mockServer := filepath.Join(mockDir, "mcp-stdio-server.ts")
	if err := os.WriteFile(mockServer, []byte("#!/bin/sh\necho 'mock'\n"), 0755); err != nil {
		t.Fatalf("Failed to write mock server: %v", err)
	}
	
	// Clear higher priority env vars
	os.Unsetenv("TDDPRO_MCP_PATH")
	os.Setenv("TDDPRO_PATH", dir)
	defer os.Unsetenv("TDDPRO_PATH")
	
	// Mock home directory to avoid finding installed binary
	originalHome := os.Getenv("HOME")
	os.Setenv("HOME", "/non/existent/path")
	defer os.Setenv("HOME", originalHome)
	
	path, err := GetMCPServerPath()
	if err != nil {
		t.Fatalf("Expected to find server, got error: %v", err)
	}
	if path != mockServer {
		t.Errorf("Expected %s, got %s", mockServer, path)
	}
}

func TestGetMCPServerPath_NotFound(t *testing.T) {
	// Clear all env vars and mock home to ensure nothing is found
	os.Unsetenv("TDDPRO_MCP_PATH")
	os.Unsetenv("TDDPRO_PATH")
	
	// Mock home directory to avoid finding installed binary
	originalHome := os.Getenv("HOME")
	os.Setenv("HOME", "/non/existent/path")
	defer os.Setenv("HOME", originalHome)
	
	_, err := GetMCPServerPath()
	if err == nil {
		t.Fatal("Expected error when server not found, got nil")
	}
}
