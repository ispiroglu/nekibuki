package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"nekibuki-backend/internal/services/recognition"
)

// RecognitionHandler handles photo recognition HTTP requests
type RecognitionHandler struct {
	recognitionService *recognition.RecognitionService
}

// NewRecognitionHandler creates a new recognition handler
func NewRecognitionHandler(recognitionService *recognition.RecognitionService) *RecognitionHandler {
	return &RecognitionHandler{
		recognitionService: recognitionService,
	}
}

// UploadPhoto handles photo upload for recognition
// @Summary Upload photo for recognition
// @Description Upload a photo to identify tourist attractions and landmarks
// @Tags recognition
// @Accept multipart/form-data
// @Produce json
// @Param photo formData file true "Photo to analyze"
// @Success 200 {object} recognition.RecognitionResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/recognition/upload [post]
func (h *RecognitionHandler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	// Limit request size to 15MB
	r.ParseMultipartForm(15 << 20)

	slog.Info("UploadPhoto", "request", r)

	// Get the file from form data
	file, fileHeader, err := r.FormFile("photo")
	if err != nil {
		http.Error(w, "Failed to get photo from request", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Process the photo
	response, err := h.recognitionService.ProcessPhoto(r.Context(), fileHeader)
	if err != nil {
		slog.Error("Failed to process photo", "error", err)
		writeErrorResponse(w, "Failed to process photo", http.StatusInternalServerError)
		return
	}

	// Return the response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		slog.Error("Failed to encode response", "error", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// GetResult retrieves the recognition result for a session
// @Summary Get recognition result
// @Description Get the recognition result for a specific session ID
// @Tags recognition
// @Produce json
// @Param session_id path string true "Session ID"
// @Success 200 {object} recognition.RecognitionResult
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/recognition/result/{session_id} [get]
func (h *RecognitionHandler) GetResult(w http.ResponseWriter, r *http.Request) {
	// Extract session ID from URL path
	sessionID := r.PathValue("session_id")
	if sessionID == "" {
		writeErrorResponse(w, "Missing session ID", http.StatusBadRequest)
		return
	}

	// Get the recognition result
	result, err := h.recognitionService.GetRecognitionResult(r.Context(), sessionID)
	if err != nil {
		slog.Error("Failed to get recognition result for session", "session_id", sessionID, "error", err)
		writeErrorResponse(w, "Session not found", http.StatusNotFound)
		return
	}

	// Return the result
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		slog.Error("Failed to encode result", "error", err)
		http.Error(w, "Failed to encode result", http.StatusInternalServerError)
		return
	}
}

// SessionSummary represents a simplified session for API responses
type SessionSummary struct {
	ID                    string  `json:"id"`
	ImagePath             string  `json:"image_path,omitempty"`
	ImageHash             string  `json:"image_hash,omitempty"`
	PrimaryAttraction     string  `json:"primary_attraction,omitempty"`
	ConfidenceScore       float64 `json:"confidence_score,omitempty"`
	Status                string  `json:"status"`
	ErrorMessage          string  `json:"error_message,omitempty"`
	ProcessingStartedAt   string  `json:"processing_started_at"`
	ProcessingCompletedAt string  `json:"processing_completed_at,omitempty"`
	CreatedAt             string  `json:"created_at"`
}

// GetRecentSessions retrieves recent recognition sessions (for debugging/admin)
// @Summary Get recent sessions
// @Description Get a list of recent recognition sessions for debugging purposes
// @Tags recognition
// @Produce json
// @Param limit query int false "Maximum number of sessions to return" default(10)
// @Success 200 {array} SessionSummary
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/recognition/sessions [get]
func (h *RecognitionHandler) GetRecentSessions(w http.ResponseWriter, r *http.Request) {
	// Parse limit parameter
	limitStr := r.URL.Query().Get("limit")
	limit := int32(10) // default

	if limitStr != "" {
		parsedLimit, err := strconv.ParseInt(limitStr, 10, 32)
		if err != nil || parsedLimit < 1 || parsedLimit > 100 {
			writeErrorResponse(w, "Invalid limit parameter (must be between 1 and 100)", http.StatusBadRequest)
			return
		}
		limit = int32(parsedLimit)
	}

	// Get recent sessions
	sessions, err := h.recognitionService.GetRecentSessions(r.Context(), limit)
	if err != nil {
		slog.Error("Failed to get recent sessions", "error", err)
		writeErrorResponse(w, "Failed to get recent sessions", http.StatusInternalServerError)
		return
	}

	// Convert to simplified response format
	sessionSummaries := make([]SessionSummary, 0, len(sessions))
	for _, session := range sessions {
		summary := SessionSummary{
			ID:                  session.ID.String(),
			Status:              session.Status.String,
			ProcessingStartedAt: session.ProcessingStartedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
			CreatedAt:           session.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
		}

		if session.ImagePath.Valid {
			summary.ImagePath = session.ImagePath.String
		}
		if session.ImageHash.Valid {
			summary.ImageHash = session.ImageHash.String
		}
		if session.PrimaryAttraction.Valid {
			summary.PrimaryAttraction = session.PrimaryAttraction.String
		}
		if session.ConfidenceScore.Valid {
			score, _ := session.ConfidenceScore.Float64Value()
			summary.ConfidenceScore = score.Float64
		}
		if session.ErrorMessage.Valid {
			summary.ErrorMessage = session.ErrorMessage.String
		}
		if session.ProcessingCompletedAt.Valid {
			summary.ProcessingCompletedAt = session.ProcessingCompletedAt.Time.Format("2006-01-02T15:04:05Z07:00")
		}

		sessionSummaries = append(sessionSummaries, summary)
	}

	// Return the sessions
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(sessionSummaries); err != nil {
		slog.Error("Failed to encode sessions", "error", err)
		http.Error(w, "Failed to encode sessions", http.StatusInternalServerError)
		return
	}
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Code    int    `json:"code"`
}

// writeErrorResponse writes a JSON error response
func writeErrorResponse(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	errorResp := ErrorResponse{
		Error:   http.StatusText(statusCode),
		Message: message,
		Code:    statusCode,
	}

	if err := json.NewEncoder(w).Encode(errorResp); err != nil {
		slog.Error("Failed to encode error response", "error", err)
	}
}
