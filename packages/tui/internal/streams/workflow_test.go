package streams

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

type testEvent struct {
	Type    string                 `json:"type"`
	Payload map[string]interface{} `json:"payload"`
}

func TestWorkflowRun_StreamParsingAndLifecycle(t *testing.T) {
	// Prepare mock events
	events := []testEvent{
		{Type: "watch", Payload: map[string]interface{}{"step": "thinking", "msg": "Thinking 1"}},
		{Type: "watch", Payload: map[string]interface{}{"step": "thinking", "msg": "Thinking 2"}},
		{Type: "watch", Payload: map[string]interface{}{"step": "clarification", "prompt": "Please clarify"}},
		{Type: "watch", Payload: map[string]interface{}{"step": "finished", "result": "done!"}},
	}
	var streamBuilder strings.Builder
	for _, evt := range events {
		b, _ := json.Marshal(evt)
		streamBuilder.WriteString(string(b))
		streamBuilder.WriteRune('\x1e')
	}
	mockStream := streamBuilder.String()

	// Mock /create-run endpoint
	createRunHandler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"runId":"test-run-id"}`)
	}
	// Mock /start endpoint
	startHandler := func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}
	// Mock /watch endpoint (SSE-like)
	watchHandler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		io.WriteString(w, mockStream)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/workflows/tddPlanning/create-run", createRunHandler)
	mux.HandleFunc("/api/workflows/tddPlanning/start", startHandler)
	mux.HandleFunc("/api/workflows/tddPlanning/watch", watchHandler)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	// Patch URLs in NewWorkflowRun and StartWorkflow for test
	// Patch the URLs by replacing localhost:4111 with ts.URL
	createRunURL := ts.URL + "/api/workflows/tddPlanning/create-run"
	startURL := ts.URL + "/api/workflows/tddPlanning/start?runId=test-run-id"
	watchURL := ts.URL + "/api/workflows/tddPlanning/watch?runId=test-run-id"

	// Patch NewWorkflowRun for test
	newWorkflowRun := func(cwd string) (*WorkflowRun, error) {
		resp, err := http.Post(createRunURL, "application/json", strings.NewReader("{}"))
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		runId := result["runId"].(string)
		return &WorkflowRun{
			RunID:    runId,
			WatchURL: watchURL,
			StartURL: startURL,
			Events:   make(chan WorkflowEvent, 10),
			Done:     make(chan struct{}),
		}, nil
	}

	wr, err := newWorkflowRun("/tmp")
	if err != nil {
		t.Fatalf("failed to create workflow run: %v", err)
	}

	var wg sync.WaitGroup
	wg.Add(1)
	var gotEvents []WorkflowEvent
	go func() {
		defer wg.Done()
		wr.Watch()
		for evt := range wr.Events {
			gotEvents = append(gotEvents, evt)
		}
	}()

	err = wr.StartWorkflow("/tmp")
	if err != nil {
		t.Fatalf("failed to start workflow: %v", err)
	}

	wg.Wait()

	if len(gotEvents) != len(events) {
		t.Fatalf("expected %d events, got %d", len(events), len(gotEvents))
	}
	for i, evt := range gotEvents {
		var payload map[string]interface{}
		json.Unmarshal(evt.Payload, &payload)
		if payload["step"] != events[i].Payload["step"] {
			t.Errorf("event %d: expected step %v, got %v", i, events[i].Payload["step"], payload["step"])
		}
	}
}
