package domain

import (
	"time"
)

// FileAnalysis represents the core business entity for file analysis
type FileAnalysis struct {
	ID          string     `json:"id"`
	FileName    string     `json:"fileName"`
	FileSize    int64      `json:"fileSize"`
	MimeType    string     `json:"mimeType"`
	Prompt      string     `json:"prompt"`
	Analysis    string     `json:"analysis"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"createdAt"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
	ErrorMsg    string     `json:"errorMsg,omitempty"`
}

// FileUpload represents the input for file upload and analysis
type FileUpload struct {
	FileName string `json:"fileName"`
	FileData []byte `json:"fileData"`
	MimeType string `json:"mimeType"`
	Prompt   string `json:"prompt"`
}

// AnalysisRequest represents the request to analyze a file
type AnalysisRequest struct {
	FileData []byte `json:"fileData"`
	MimeType string `json:"mimeType"`
	Prompt   string `json:"prompt"`
}

// AnalysisResponse represents the response from the AI analysis
type AnalysisResponse struct {
	Analysis string `json:"analysis"`
	Success  bool   `json:"success"`
	Error    string `json:"error,omitempty"`
}

// Status constants
const (
	StatusPending    = "pending"
	StatusProcessing = "processing"
	StatusCompleted  = "completed"
	StatusFailed     = "failed"
)
