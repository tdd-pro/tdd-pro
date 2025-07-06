package mcpclient

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	mcp "github.com/metoro-io/mcp-golang"
	"github.com/metoro-io/mcp-golang/transport/stdio"
)

type MCPClient struct {
	APIURL    string
	SessionID string
	lastReply string
	respBody  *http.Response
}

func NewMCPClient(apiURL string) *MCPClient {
	return &MCPClient{APIURL: apiURL}
}

// OpenSSE opens the /sse endpoint and extracts the sessionId, keeps the connection open
func (c *MCPClient) OpenSSE() error {
	resp, err := http.Get(c.APIURL + "/sse")
	if err != nil {
		return err
	}
	c.respBody = resp
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "data:") && strings.Contains(line, "sessionId=") {
			parts := strings.Split(line, "sessionId=")
			if len(parts) > 1 {
				c.SessionID = strings.TrimSpace(parts[1])
				break
			}
		}
	}
	return nil
}

// SendMessage sends a JSON-RPC message to /message?sessionId=...
func (c *MCPClient) SendMessage(agentId, userMsg string) error {
	payload := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      "1",
		"method":  "tasks/send",
		"params": map[string]interface{}{
			"agentId": agentId,
			"messages": []map[string]string{
				{"role": "user", "content": userMsg},
			},
		},
	}
	data, _ := json.Marshal(payload)
	url := fmt.Sprintf("%s/message?sessionId=%s", c.APIURL, c.SessionID)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil // ignore the 'Accepted' response
}

// ListenForReply blocks and returns the next agent reply from the SSE stream
func (c *MCPClient) ListenForReply() (string, error) {
	if c.respBody == nil {
		return "", fmt.Errorf("SSE connection not open")
	}
	scanner := bufio.NewScanner(c.respBody.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "data:") {
			var event struct {
				Result struct {
					Messages []struct {
						Content string `json:"content"`
					} `json:"messages"`
				} `json:"result"`
			}
			jsonStr := strings.TrimPrefix(line, "data:")
			jsonStr = strings.TrimSpace(jsonStr)
			if err := json.Unmarshal([]byte(jsonStr), &event); err == nil && len(event.Result.Messages) > 0 {
				c.lastReply = event.Result.Messages[0].Content
				return c.lastReply, nil
			}
		}
	}
	return "", fmt.Errorf("no reply received from SSE")
}

// CallWorkflow calls a workflow by ID with the given input and returns the response as a string
func (c *MCPClient) CallWorkflow(workflowId string, input map[string]interface{}) (string, error) {
	url := c.APIURL + "/api/workflows/" + workflowId
	data, _ := json.Marshal(input)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(data))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	// Return the whole response as a pretty JSON string for now
	pretty, _ := json.MarshalIndent(result, "", "  ")
	return string(pretty), nil
}

type Feature struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

type FeatureListResponse struct {
	Features []Feature `json:"features"`
}

type FeaturesData struct {
	Approved        []Feature `json:"approved"`
	Planned         []Feature `json:"planned"`
	Refinement      []Feature `json:"refinement"`
	Backlog         []Feature `json:"backlog"`
	CurrentFeatures []string  `json:"current_features,omitempty"`
	// Legacy support for old format  
	CurrentFeature  string    `json:"current_feature,omitempty"`
}

// GetMCPServerPath discovers the path to the MCP stdio server.
func GetMCPServerPath() (string, error) {
	// 1. Check TDDPRO_PATH env var
	tddproPath := os.Getenv("TDDPRO_PATH")
	if tddproPath != "" {
		candidate := filepath.Join(tddproPath, "packages", "tdd-pro", "mcp-stdio-server.ts")
		if _, err := os.Stat(candidate); err == nil {
			return candidate, nil
		}
	}
	// 2. Fallback: search upward from executable for tdd-pro root
	exePath, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("could not determine executable path: %w", err)
	}
	dir := filepath.Dir(exePath)
	for i := 0; i < 6; i++ { // search up to 6 levels
		candidate := filepath.Join(dir, "packages", "tdd-pro", "mcp-stdio-server.ts")
		if _, err := os.Stat(candidate); err == nil {
			return candidate, nil
		}
		dir = filepath.Dir(dir)
	}
	return "", fmt.Errorf("Could not find mcp-stdio-server.ts. Set TDDPRO_PATH or check your installation.")
}

// ListFeaturesViaStdio uses the mcp-golang client to call the list-features tool via stdio transport
func (c *MCPClient) ListFeaturesViaStdio() (*FeaturesData, error) {
	mcpServerPath, err := GetMCPServerPath()
	if err != nil {
		return nil, err
	}
	cmd := exec.Command(mcpServerPath)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}

	transport := stdio.NewStdioServerTransportWithIO(stdout, stdin)
	client := mcp.NewClient(transport)
	ctx := context.Background()
	if _, err := client.Initialize(ctx); err != nil {
		return nil, err
	}
	args := map[string]interface{}{"cwd": "."}
	resp, err := client.CallTool(ctx, "list-features", args)
	if err != nil {
		return nil, err
	}
	var featuresData FeaturesData
	if len(resp.Content) > 0 && resp.Content[0].TextContent != nil {
		if err := json.Unmarshal([]byte(resp.Content[0].TextContent.Text), &featuresData); err != nil {
			return nil, err
		}
	}
	
	// Handle legacy current_feature format
	if featuresData.CurrentFeature != "" && len(featuresData.CurrentFeatures) == 0 {
		featuresData.CurrentFeatures = []string{featuresData.CurrentFeature}
		featuresData.CurrentFeature = ""
	}
	
	return &featuresData, nil
}

// Task represents a task for a feature
type Task struct {
	ID                 string   `json:"id"`
	Title              string   `json:"title"`
	Description        string   `json:"description"`
	EvaluationCriteria []string `json:"evaluation_criteria"`
}

// FeatureDetail represents detailed feature information including tasks
type FeatureDetail struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Tasks []Task `json:"tasks"`
}

// GetFeatureViaStdio uses the mcp-golang client to call the get-feature tool via stdio transport
func (c *MCPClient) GetFeatureViaStdio(featureId string) (*FeatureDetail, error) {
	mcpServerPath, err := GetMCPServerPath()
	if err != nil {
		return nil, err
	}
	cmd := exec.Command(mcpServerPath)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}

	transport := stdio.NewStdioServerTransportWithIO(stdout, stdin)
	client := mcp.NewClient(transport)
	ctx := context.Background()
	if _, err := client.Initialize(ctx); err != nil {
		return nil, err
	}
	args := map[string]interface{}{
		"cwd":       ".",
		"featureId": featureId,
	}
	resp, err := client.CallTool(ctx, "get-feature", args)
	if err != nil {
		return nil, err
	}
	
	// Parse the response 
	var featureResponse struct {
		Tasks []Task `json:"tasks"`
	}
	if len(resp.Content) > 0 && resp.Content[0].TextContent != nil {
		if err := json.Unmarshal([]byte(resp.Content[0].TextContent.Text), &featureResponse); err != nil {
			return nil, err
		}
	}
	
	return &FeatureDetail{
		ID:    featureId,
		Tasks: featureResponse.Tasks,
	}, nil
}

// UpdateTaskViaStdio uses the mcp-golang client to call the update-task tool via stdio transport
func (c *MCPClient) UpdateTaskViaStdio(featureId, taskId string, updates map[string]interface{}) error {
	mcpServerPath, err := GetMCPServerPath()
	if err != nil {
		return err
	}
	cmd := exec.Command(mcpServerPath)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	if err := cmd.Start(); err != nil {
		return err
	}

	transport := stdio.NewStdioServerTransportWithIO(stdout, stdin)
	client := mcp.NewClient(transport)
	ctx := context.Background()
	if _, err := client.Initialize(ctx); err != nil {
		return err
	}
	
	args := map[string]interface{}{
		"cwd":       ".",
		"featureId": featureId,
		"taskId":    taskId,
		"updates":   updates,
	}
	
	_, err = client.CallTool(ctx, "update-task", args)
	if err != nil {
		return err
	}
	
	return nil
}

// GetFeatureDocumentViaStdio gets the PRD document for a feature
func (c *MCPClient) GetFeatureDocumentViaStdio(featureId string) (string, error) {
	mcpServerPath, err := GetMCPServerPath()
	if err != nil {
		return "", err
	}
	cmd := exec.Command(mcpServerPath)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return "", err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return "", err
	}
	if err := cmd.Start(); err != nil {
		return "", err
	}

	transport := stdio.NewStdioServerTransportWithIO(stdout, stdin)
	client := mcp.NewClient(transport)
	ctx := context.Background()
	if _, err := client.Initialize(ctx); err != nil {
		return "", err
	}
	
	args := map[string]interface{}{
		"cwd":       ".",
		"featureId": featureId,
	}
	
	resp, err := client.CallTool(ctx, "get-feature-document", args)
	if err != nil {
		return "", err
	}
	
	// Parse the response
	if len(resp.Content) > 0 && resp.Content[0].TextContent != nil {
		var docResponse struct {
			Content string `json:"content"`
		}
		if err := json.Unmarshal([]byte(resp.Content[0].TextContent.Text), &docResponse); err != nil {
			return "", err
		}
		return docResponse.Content, nil
	}
	
	return "", fmt.Errorf("no document content received")
}

// UpdateFeatureDocumentViaStdio updates the PRD document for a feature
func (c *MCPClient) UpdateFeatureDocumentViaStdio(featureId, content string) error {
	mcpServerPath, err := GetMCPServerPath()
	if err != nil {
		return err
	}
	cmd := exec.Command(mcpServerPath)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	if err := cmd.Start(); err != nil {
		return err
	}

	transport := stdio.NewStdioServerTransportWithIO(stdout, stdin)
	client := mcp.NewClient(transport)
	ctx := context.Background()
	if _, err := client.Initialize(ctx); err != nil {
		return err
	}
	
	args := map[string]interface{}{
		"cwd":       ".",
		"featureId": featureId,
		"content":   content,
	}
	
	_, err = client.CallTool(ctx, "update-feature-document", args)
	return err
}
