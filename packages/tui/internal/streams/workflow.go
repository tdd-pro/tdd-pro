package streams

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strings"
)

type WorkflowRun struct {
	RunID         string
	WatchURL      string
	StartURL      string
	Events        chan WorkflowEvent
	Done          chan struct{}
	ThinkingState []string // last 3 thinking messages
	// ... other state as needed
}

type WorkflowEvent struct {
	Type    string
	Payload json.RawMessage // or a more specific struct
}

func NewWorkflowRun(cwd string) (*WorkflowRun, error) {
	// 1. POST to create-run, get runId
	createRunURL := "http://localhost:4111/api/workflows/tddPlanning/create-run"
	resp, err := http.Post(createRunURL, "application/json", bytes.NewBuffer([]byte("{}")))
	if err != nil {
		return nil, fmt.Errorf("failed to create run: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := ioutil.ReadAll(resp.Body)
	var createRunResult map[string]interface{}
	if err := json.Unmarshal(respBody, &createRunResult); err != nil {
		return nil, fmt.Errorf("failed to parse create-run response: %w", err)
	}
	runId, ok := createRunResult["runId"].(string)
	if !ok {
		return nil, fmt.Errorf("runId not found in create-run response: %s", string(respBody))
	}
	watchURL := fmt.Sprintf("http://localhost:4111/api/workflows/tddPlanning/watch?runId=%s", runId)
	startURL := fmt.Sprintf("http://localhost:4111/api/workflows/tddPlanning/start?runId=%s", runId)
	return &WorkflowRun{
		RunID:    runId,
		WatchURL: watchURL,
		StartURL: startURL,
		Events:   make(chan WorkflowEvent, 10),
		Done:     make(chan struct{}),
	}, nil
}

func (wr *WorkflowRun) Watch() {
	go func() {
		resp, err := http.Get(wr.WatchURL)
		if err != nil {
			close(wr.Events)
			return
		}
		defer resp.Body.Close()
		reader := bufio.NewReader(resp.Body)
		for {
			chunk, err := reader.ReadString('\x1e')
			if err != nil {
				break
			}
			chunk = strings.TrimSuffix(chunk, "\x1e")
			chunk = strings.TrimSpace(chunk)
			if chunk == "" {
				continue
			}
			var evt WorkflowEvent
			if err := json.Unmarshal([]byte(chunk), &evt); err == nil {
				wr.Events <- evt
			}
		}
		close(wr.Events)
	}()
}

func (wr *WorkflowRun) StartWorkflow(cwd string) error {
	body := map[string]interface{}{
		"inputData": map[string]interface{}{
			"cwd": cwd,
		},
		"runtimeContext": map[string]interface{}{},
	}
	jsonBody, _ := json.Marshal(body)
	resp, err := http.Post(wr.StartURL, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to start workflow: %w", err)
	}
	defer resp.Body.Close()
	return nil
}
