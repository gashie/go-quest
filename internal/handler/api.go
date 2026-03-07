package handler

import (
	"bytes"
	"encoding/json"
	"goquest/internal/content"
	"io"
	"net/http"
)

// APIHandler serves JSON API endpoints
type APIHandler struct {
	curriculum *content.Curriculum
}

// NewAPIHandler creates an API handler
func NewAPIHandler(c *content.Curriculum) *APIHandler {
	return &APIHandler{curriculum: c}
}

// ListLessons returns all phases with lesson metadata
func (h *APIHandler) ListLessons(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.curriculum.Phases)
}

// GetLesson returns a single lesson with all content
func (h *APIHandler) GetLesson(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	lesson := h.curriculum.FindLesson(slug)
	if lesson == nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lesson)
}

// playgroundRequest is the format expected by play.golang.org
type playgroundRequest struct {
	Body    string `json:"body"`
	Version int    `json:"version"`
	WithVet bool   `json:"withVet"`
}

// RunCode proxies user code to the Go Playground API
func (h *APIHandler) RunCode(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	pgReq := playgroundRequest{
		Body:    req.Code,
		Version: 2,
		WithVet: true,
	}
	body, _ := json.Marshal(pgReq)

	resp, err := http.Post(
		"https://play.golang.org/compile",
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		http.Error(w, "Go Playground unreachable", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, resp.Body)
}
