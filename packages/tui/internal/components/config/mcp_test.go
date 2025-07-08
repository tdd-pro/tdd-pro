package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestMCPConfigDialog_createMCPConfigFile(t *testing.T) {
	// Create temporary directory for testing
	tempDir := t.TempDir()
	
	dialog := &MCPConfigDialog{
		projectPath: tempDir,
	}
	
	testCases := []struct {
		name         string
		filePath     string
		expectedPath string
	}{
		{
			name:         "root config",
			filePath:     filepath.Join(tempDir, ".mcp.json"),
			expectedPath: ".mcp.json",
		},
		{
			name:         "cursor config",
			filePath:     filepath.Join(tempDir, ".cursor", "mcp.json"),
			expectedPath: ".cursor/mcp.json",
		},
		{
			name:         "vscode config",
			filePath:     filepath.Join(tempDir, ".vscode", "mcp.json"),
			expectedPath: ".vscode/mcp.json",
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Mock finding the MCP server by creating a temporary executable
			mockMCPPath := filepath.Join(tempDir, "mock-tdd-pro-mcp")
			if err := os.WriteFile(mockMCPPath, []byte("#!/bin/sh\necho 'mock mcp server'\n"), 0755); err != nil {
				t.Fatalf("Failed to create mock MCP server: %v", err)
			}
			
			// Temporarily change the findMCPServerPathFunc to return our mock
			originalFindMCPServerPathFunc := dialog.findMCPServerPathFunc
			dialog.findMCPServerPathFunc = func() (string, error) {
				return mockMCPPath, nil
			}
			defer func() {
				dialog.findMCPServerPathFunc = originalFindMCPServerPathFunc
			}()
			
			// Create the config file
			err := dialog.createMCPConfigFile(tc.filePath)
			if err != nil {
				t.Fatalf("Failed to create MCP config file: %v", err)
			}
			
			// Verify the file was created
			if _, err := os.Stat(tc.filePath); os.IsNotExist(err) {
				t.Fatalf("Expected config file to be created at %s", tc.filePath)
			}
			
			// Verify the file content
			data, err := os.ReadFile(tc.filePath)
			if err != nil {
				t.Fatalf("Failed to read config file: %v", err)
			}
			
			var config MCPConfig
			if err := json.Unmarshal(data, &config); err != nil {
				t.Fatalf("Failed to parse config JSON: %v", err)
			}
			
			// Verify the structure
			if config.MCPServers == nil {
				t.Fatal("Expected mcpServers to be present")
			}
			
			tddProServer, exists := config.MCPServers["tdd-pro"]
			if !exists {
				t.Fatal("Expected tdd-pro server to be present")
			}
			
			if tddProServer.Command != mockMCPPath {
				t.Errorf("Expected command to be %s, got %s", mockMCPPath, tddProServer.Command)
			}
			
			if len(tddProServer.Args) != 0 {
				t.Errorf("Expected empty args, got %v", tddProServer.Args)
			}
			
			if tddProServer.Env["NODE_ENV"] != "development" {
				t.Errorf("Expected NODE_ENV to be 'development', got %s", tddProServer.Env["NODE_ENV"])
			}
		})
	}
}

func TestMCPConfigDialog_createMCPConfigFile_MergeExisting(t *testing.T) {
	tempDir := t.TempDir()
	
	dialog := &MCPConfigDialog{
		projectPath: tempDir,
	}
	
	configPath := filepath.Join(tempDir, ".mcp.json")
	
	// Create existing config with a different server
	existingConfig := MCPConfig{
		MCPServers: map[string]MCPServer{
			"other-server": {
				Command: "/path/to/other-server",
				Args:    []string{"--flag"},
				Env:     map[string]string{"OTHER_ENV": "value"},
			},
		},
	}
	
	existingData, err := json.MarshalIndent(existingConfig, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal existing config: %v", err)
	}
	
	if err := os.WriteFile(configPath, existingData, 0644); err != nil {
		t.Fatalf("Failed to write existing config: %v", err)
	}
	
	// Mock the MCP server path
	mockMCPPath := filepath.Join(tempDir, "mock-tdd-pro-mcp")
	dialog.findMCPServerPathFunc = func() (string, error) {
		return mockMCPPath, nil
	}
	
	// Create the config file (should merge with existing)
	err = dialog.createMCPConfigFile(configPath)
	if err != nil {
		t.Fatalf("Failed to create MCP config file: %v", err)
	}
	
	// Verify the merged content
	data, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("Failed to read config file: %v", err)
	}
	
	var config MCPConfig
	if err := json.Unmarshal(data, &config); err != nil {
		t.Fatalf("Failed to parse config JSON: %v", err)
	}
	
	// Verify both servers are present
	if len(config.MCPServers) != 2 {
		t.Fatalf("Expected 2 servers, got %d", len(config.MCPServers))
	}
	
	// Verify existing server is preserved
	otherServer, exists := config.MCPServers["other-server"]
	if !exists {
		t.Fatal("Expected other-server to be preserved")
	}
	
	if otherServer.Command != "/path/to/other-server" {
		t.Errorf("Expected other-server command to be preserved")
	}
	
	// Verify new server is added
	tddProServer, exists := config.MCPServers["tdd-pro"]
	if !exists {
		t.Fatal("Expected tdd-pro server to be added")
	}
	
	if tddProServer.Command != mockMCPPath {
		t.Errorf("Expected tdd-pro command to be %s, got %s", mockMCPPath, tddProServer.Command)
	}
}

func TestMCPConfigDialog_findMCPServerPath(t *testing.T) {
	dialog := &MCPConfigDialog{}
	
	t.Run("server not found", func(t *testing.T) {
		// This test assumes no tdd-pro-mcp binary exists in the expected locations
		_, err := dialog.findMCPServerPath()
		if err == nil {
			// If the binary actually exists, skip this test
			t.Skip("tdd-pro-mcp binary exists, skipping not found test")
		}
		
		// Verify error message mentions where it looked
		if err.Error() == "" {
			t.Error("Expected non-empty error message")
		}
	})
}

func TestMCPConfigPaths(t *testing.T) {
	// Test that the paths are correctly formed without leading dots
	testCases := []struct {
		name         string
		editorDir    string
		expectedFile string
	}{
		{
			name:         "cursor path",
			editorDir:    ".cursor",
			expectedFile: "mcp.json",
		},
		{
			name:         "vscode path",
			editorDir:    ".vscode",
			expectedFile: "mcp.json",
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			tempDir := t.TempDir()
			
			// Test the path construction
			fullPath := filepath.Join(tempDir, tc.editorDir, tc.expectedFile)
			
			// Verify the file name is correct (no leading dot on mcp.json)
			fileName := filepath.Base(fullPath)
			if fileName != "mcp.json" {
				t.Errorf("Expected filename to be 'mcp.json', got '%s'", fileName)
			}
			
			// Verify the directory name is correct (with leading dot)
			dirName := filepath.Base(filepath.Dir(fullPath))
			if dirName != tc.editorDir {
				t.Errorf("Expected directory to be '%s', got '%s'", tc.editorDir, dirName)
			}
		})
	}
}

func TestMCPConfigMerging_AllLocations(t *testing.T) {
	// Test merging behavior for all three config locations: root, cursor, vscode
	testCases := []struct {
		name         string
		configPath   string
		description  string
	}{
		{
			name:        "root config merging",
			configPath:  ".mcp.json",
			description: "Tests merging with existing root .mcp.json",
		},
		{
			name:        "cursor config merging", 
			configPath:  ".cursor/mcp.json",
			description: "Tests merging with existing .cursor/mcp.json",
		},
		{
			name:        "vscode config merging",
			configPath:  ".vscode/mcp.json", 
			description: "Tests merging with existing .vscode/mcp.json",
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			tempDir := t.TempDir()
			dialog := &MCPConfigDialog{projectPath: tempDir}
			
			fullConfigPath := filepath.Join(tempDir, tc.configPath)
			
			// Create existing config with multiple servers
			existingConfig := MCPConfig{
				MCPServers: map[string]MCPServer{
					"other-server": {
						Command: "/path/to/other-server",
						Args:    []string{"--flag", "value"},
						Env:     map[string]string{"OTHER_ENV": "other_value"},
					},
					"third-server": {
						Command: "/usr/bin/third-server",
						Args:    []string{},
						Env:     map[string]string{"THIRD_ENV": "third_value"},
					},
				},
			}
			
			// Write existing config
			existingData, err := json.MarshalIndent(existingConfig, "", "  ")
			if err != nil {
				t.Fatalf("Failed to marshal existing config: %v", err)
			}
			
			if err := os.MkdirAll(filepath.Dir(fullConfigPath), 0755); err != nil {
				t.Fatalf("Failed to create config directory: %v", err)
			}
			
			if err := os.WriteFile(fullConfigPath, existingData, 0644); err != nil {
				t.Fatalf("Failed to write existing config: %v", err)
			}
			
			// Mock MCP server path
			mockMCPPath := filepath.Join(tempDir, "mock-tdd-pro-mcp")
			dialog.findMCPServerPathFunc = func() (string, error) {
				return mockMCPPath, nil
			}
			
			// Create/merge the config
			err = dialog.createMCPConfigFile(fullConfigPath)
			if err != nil {
				t.Fatalf("Failed to merge MCP config: %v", err)
			}
			
			// Verify merged content
			data, err := os.ReadFile(fullConfigPath)
			if err != nil {
				t.Fatalf("Failed to read merged config: %v", err)
			}
			
			var mergedConfig MCPConfig
			if err := json.Unmarshal(data, &mergedConfig); err != nil {
				t.Fatalf("Failed to parse merged config JSON: %v", err)
			}
			
			// Should have 3 servers: original 2 + tdd-pro
			if len(mergedConfig.MCPServers) != 3 {
				t.Fatalf("Expected 3 servers, got %d", len(mergedConfig.MCPServers))
			}
			
			// Verify original servers are preserved
			otherServer := mergedConfig.MCPServers["other-server"]
			if otherServer.Command != "/path/to/other-server" {
				t.Errorf("other-server command not preserved")
			}
			if len(otherServer.Args) != 2 || otherServer.Args[0] != "--flag" {
				t.Errorf("other-server args not preserved: %v", otherServer.Args)
			}
			
			thirdServer := mergedConfig.MCPServers["third-server"]
			if thirdServer.Command != "/usr/bin/third-server" {
				t.Errorf("third-server command not preserved")
			}
			
			// Verify tdd-pro server was added
			tddProServer := mergedConfig.MCPServers["tdd-pro"]
			if tddProServer.Command != mockMCPPath {
				t.Errorf("Expected tdd-pro command %s, got %s", mockMCPPath, tddProServer.Command)
			}
			if tddProServer.Env["NODE_ENV"] != "development" {
				t.Errorf("Expected NODE_ENV=development, got %s", tddProServer.Env["NODE_ENV"])
			}
		})
	}
}

func TestMCPConfig_OverwriteExistingTddPro(t *testing.T) {
	// Test that existing tdd-pro server config gets overwritten with new settings
	tempDir := t.TempDir()
	dialog := &MCPConfigDialog{projectPath: tempDir}
	configPath := filepath.Join(tempDir, ".mcp.json")
	
	// Create existing config with outdated tdd-pro server
	existingConfig := MCPConfig{
		MCPServers: map[string]MCPServer{
			"tdd-pro": {
				Command: "/old/path/to/tdd-pro-mcp",
				Args:    []string{"--old-flag"},
				Env:     map[string]string{"NODE_ENV": "production", "OLD_VAR": "old_value"},
			},
			"other-server": {
				Command: "/path/to/other-server",
				Args:    []string{},
				Env:     map[string]string{},
			},
		},
	}
	
	existingData, err := json.MarshalIndent(existingConfig, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal existing config: %v", err)
	}
	
	if err := os.WriteFile(configPath, existingData, 0644); err != nil {
		t.Fatalf("Failed to write existing config: %v", err)
	}
	
	// Mock new MCP server path
	newMCPPath := filepath.Join(tempDir, "new-tdd-pro-mcp")
	dialog.findMCPServerPathFunc = func() (string, error) {
		return newMCPPath, nil
	}
	
	// Update the config
	err = dialog.createMCPConfigFile(configPath)
	if err != nil {
		t.Fatalf("Failed to update MCP config: %v", err)
	}
	
	// Verify updated content
	data, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("Failed to read updated config: %v", err)
	}
	
	var updatedConfig MCPConfig
	if err := json.Unmarshal(data, &updatedConfig); err != nil {
		t.Fatalf("Failed to parse updated config JSON: %v", err)
	}
	
	// Should still have 2 servers
	if len(updatedConfig.MCPServers) != 2 {
		t.Fatalf("Expected 2 servers, got %d", len(updatedConfig.MCPServers))
	}
	
	// Verify tdd-pro was updated with new settings
	tddProServer := updatedConfig.MCPServers["tdd-pro"]
	if tddProServer.Command != newMCPPath {
		t.Errorf("Expected updated command %s, got %s", newMCPPath, tddProServer.Command)
	}
	if len(tddProServer.Args) != 0 {
		t.Errorf("Expected empty args, got %v", tddProServer.Args)
	}
	if tddProServer.Env["NODE_ENV"] != "development" {
		t.Errorf("Expected NODE_ENV=development, got %s", tddProServer.Env["NODE_ENV"])
	}
	if _, hasOldVar := tddProServer.Env["OLD_VAR"]; hasOldVar {
		t.Error("Expected old environment variable to be removed")
	}
	
	// Verify other server was preserved
	otherServer := updatedConfig.MCPServers["other-server"]
	if otherServer.Command != "/path/to/other-server" {
		t.Error("other-server should be preserved unchanged")
	}
}

func TestMCPConfig_HandleCorruptedJSON(t *testing.T) {
	// Test that corrupted/invalid JSON files are handled gracefully
	tempDir := t.TempDir()
	dialog := &MCPConfigDialog{projectPath: tempDir}
	configPath := filepath.Join(tempDir, ".mcp.json")
	
	testCases := []struct {
		name        string
		fileContent string
		description string
	}{
		{
			name:        "invalid json",
			fileContent: `{"mcpServers": {"incomplete": }`,
			description: "Invalid JSON syntax should be ignored",
		},
		{
			name:        "wrong schema",
			fileContent: `{"wrongField": "value"}`,
			description: "Wrong schema should create new config",
		},
		{
			name:        "empty object",
			fileContent: `{}`,
			description: "Empty object should work fine",
		},
		{
			name:        "null mcpServers",
			fileContent: `{"mcpServers": null}`,
			description: "Null mcpServers should be handled",
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Write corrupted/invalid config
			if err := os.WriteFile(configPath, []byte(tc.fileContent), 0644); err != nil {
				t.Fatalf("Failed to write test config: %v", err)
			}
			
			// Mock MCP server path
			mockMCPPath := filepath.Join(tempDir, "mock-tdd-pro-mcp")
			dialog.findMCPServerPathFunc = func() (string, error) {
				return mockMCPPath, nil
			}
			
			// Should not fail even with corrupted input
			err := dialog.createMCPConfigFile(configPath)
			if err != nil {
				t.Fatalf("Should handle corrupted JSON gracefully, got error: %v", err)
			}
			
			// Verify valid config was created
			data, err := os.ReadFile(configPath)
			if err != nil {
				t.Fatalf("Failed to read config after corruption handling: %v", err)
			}
			
			var config MCPConfig
			if err := json.Unmarshal(data, &config); err != nil {
				t.Fatalf("Output should be valid JSON: %v", err)
			}
			
			// Should have at least tdd-pro server
			tddProServer, exists := config.MCPServers["tdd-pro"]
			if !exists {
				t.Fatal("tdd-pro server should exist even after handling corruption")
			}
			
			if tddProServer.Command != mockMCPPath {
				t.Errorf("Expected tdd-pro command %s, got %s", mockMCPPath, tddProServer.Command)
			}
			
			// Clean up for next test
			os.Remove(configPath)
		})
	}
}

func TestMCPConfig_EmptyMcpServersSection(t *testing.T) {
	// Test handling of existing config with empty mcpServers section
	tempDir := t.TempDir()
	dialog := &MCPConfigDialog{projectPath: tempDir}
	configPath := filepath.Join(tempDir, ".mcp.json")
	
	// Create config with empty mcpServers
	existingConfig := MCPConfig{
		MCPServers: map[string]MCPServer{},
	}
	
	existingData, err := json.MarshalIndent(existingConfig, "", "  ")
	if err != nil {
		t.Fatalf("Failed to marshal existing config: %v", err)
	}
	
	if err := os.WriteFile(configPath, existingData, 0644); err != nil {
		t.Fatalf("Failed to write existing config: %v", err)
	}
	
	// Mock MCP server path
	mockMCPPath := filepath.Join(tempDir, "mock-tdd-pro-mcp")
	dialog.findMCPServerPathFunc = func() (string, error) {
		return mockMCPPath, nil
	}
	
	// Create the config
	err = dialog.createMCPConfigFile(configPath)
	if err != nil {
		t.Fatalf("Failed to handle empty mcpServers: %v", err)
	}
	
	// Verify content
	data, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("Failed to read config: %v", err)
	}
	
	var config MCPConfig
	if err := json.Unmarshal(data, &config); err != nil {
		t.Fatalf("Failed to parse config JSON: %v", err)
	}
	
	// Should have 1 server now
	if len(config.MCPServers) != 1 {
		t.Fatalf("Expected 1 server, got %d", len(config.MCPServers))
	}
	
	// Verify tdd-pro server was added
	tddProServer := config.MCPServers["tdd-pro"]
	if tddProServer.Command != mockMCPPath {
		t.Errorf("Expected tdd-pro command %s, got %s", mockMCPPath, tddProServer.Command)
	}
}