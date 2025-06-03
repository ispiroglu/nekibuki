package recognition

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"mime/multipart"
	"time"

	"nekibuki-backend/internal/database"
	"nekibuki-backend/internal/services/gemini"
	"nekibuki-backend/internal/storage"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// RecognitionService handles the main image recognition workflow
type RecognitionService struct {
	db            *database.Queries
	geminiService *gemini.GeminiService
	imageStorage  *storage.ImageStorage
}

// RecognitionResponse represents the immediate response after photo upload
type RecognitionResponse struct {
	SessionID string `json:"session_id"`
	Status    string `json:"status"`
	Message   string `json:"message"`
}

// RecognitionResult represents the final result after processing
type RecognitionResult struct {
	SessionID      string                 `json:"session_id"`
	Status         string                 `json:"status"`
	AttractionInfo *gemini.AttractionInfo `json:"attraction_info,omitempty"`
	Error          *ErrorDetail           `json:"error,omitempty"`
	ProcessingTime *int64                 `json:"processing_time_ms,omitempty"`
}

// ErrorDetail represents error information
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// ProcessingStatus represents the processing status
type ProcessingStatus string

const (
	StatusProcessing ProcessingStatus = "processing"
	StatusCompleted  ProcessingStatus = "completed"
	StatusFailed     ProcessingStatus = "failed"
	StatusTimeout    ProcessingStatus = "timeout"
)

// NewRecognitionService creates a new recognition service
func NewRecognitionService(
	db *database.Queries,
	geminiService *gemini.GeminiService,
	imageStorage *storage.ImageStorage,
) *RecognitionService {
	return &RecognitionService{
		db:            db,
		geminiService: geminiService,
		imageStorage:  imageStorage,
	}
}

// ProcessPhoto handles the main photo processing workflow
func (s *RecognitionService) ProcessPhoto(ctx context.Context, file *multipart.FileHeader) (*RecognitionResponse, error) {
	// 1. Validate the image file
	if err := s.imageStorage.ValidateImageFile(file); err != nil {
		return nil, fmt.Errorf("invalid image file: %w", err)
	}

	// 2. Save the image and get file data
	imagePath, imageHash, imageData, err := s.imageStorage.SaveImage(file)
	if err != nil {
		return nil, fmt.Errorf("failed to save image: %w", err)
	}

	// 3. Create recognition session in database
	session, err := s.db.CreateRecognitionSession(ctx, database.CreateRecognitionSessionParams{
		ImagePath: pgtype.Text{String: imagePath, Valid: true},
		ImageHash: pgtype.Text{String: imageHash, Valid: true},
	})
	if err != nil {
		// Clean up saved file if database operation fails
		if deleteErr := s.imageStorage.DeleteFile(imagePath); deleteErr != nil {
			slog.Error("Failed to clean up image file after database error", slog.String("error", deleteErr.Error()))
		}
		return nil, fmt.Errorf("failed to create recognition session: %w", err)
	}

	// Convert pgtype.UUID to uuid.UUID for background processing
	sessionUUID, err := uuid.Parse(session.ID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to parse session UUID: %w", err)
	}

	// 4. Start async processing
	go s.processInBackground(context.Background(), sessionUUID, imageData)

	// 5. Return immediate response
	return &RecognitionResponse{
		SessionID: sessionUUID.String(),
		Status:    string(StatusProcessing),
		Message:   "Photo uploaded successfully. Processing in progress.",
	}, nil
}

// processInBackground handles the async image processing
func (s *RecognitionService) processInBackground(ctx context.Context, sessionID uuid.UUID, imageData []byte) {
	slog.Info("Starting background processing for session", slog.String("session_id", sessionID.String()))

	// Set processing timeout
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	startTime := time.Now()

	// Use Gemini for image analysis and content generation
	attractionInfo, err := s.geminiService.AnalyzeImageAndGenerateInfo(ctx, imageData)
	if err != nil {
		slog.Error("Gemini analysis failed for session", slog.String("session_id", sessionID.String()), slog.String("error", err.Error()))

		// Convert uuid.UUID to pgtype.UUID for database operations
		var pgUUID pgtype.UUID
		pgUUID.Scan(sessionID.String())

		// Update session with error
		errorMsg := err.Error()
		if updateErr := s.db.UpdateSessionError(ctx, database.UpdateSessionErrorParams{
			ID:           pgUUID,
			ErrorMessage: pgtype.Text{String: errorMsg, Valid: true},
		}); updateErr != nil {
			slog.Error("Failed to update session with error", slog.String("session_id", sessionID.String()), slog.String("error", updateErr.Error()))
		}
		return
	}

	processingTime := time.Since(startTime)

	// Marshal attraction info for storage
	geminiResponseJSON, err := json.Marshal(attractionInfo)
	if err != nil {
		slog.Error("Failed to marshal Gemini response for session", slog.String("session_id", sessionID.String()), slog.String("error", err.Error()))

		// Convert uuid.UUID to pgtype.UUID for database operations
		var pgUUID pgtype.UUID
		pgUUID.Scan(sessionID.String())

		errorMsg := "Failed to process Gemini response"
		if updateErr := s.db.UpdateSessionError(ctx, database.UpdateSessionErrorParams{
			ID:           pgUUID,
			ErrorMessage: pgtype.Text{String: errorMsg, Valid: true},
		}); updateErr != nil {
			slog.Error("Failed to update session with marshal error", slog.String("session_id", sessionID.String()), slog.String("error", updateErr.Error()))
		}
		return
	}

	attractionInfoJSON, err := json.Marshal(attractionInfo)
	if err != nil {
		slog.Error("Failed to marshal attraction info for session", slog.String("session_id", sessionID.String()), slog.String("error", err.Error()))

		// Convert uuid.UUID to pgtype.UUID for database operations
		var pgUUID pgtype.UUID
		pgUUID.Scan(sessionID.String())

		errorMsg := "Failed to process attraction information"
		if updateErr := s.db.UpdateSessionError(ctx, database.UpdateSessionErrorParams{
			ID:           pgUUID,
			ErrorMessage: pgtype.Text{String: errorMsg, Valid: true},
		}); updateErr != nil {
			slog.Error("Failed to update session with marshal error", slog.String("session_id", sessionID.String()), slog.String("error", updateErr.Error()))
		}
		return
	}

	// Convert confidence to decimal for database
	var confidenceDecimal pgtype.Numeric
	confidenceDecimal.Scan(attractionInfo.Confidence)

	// Convert uuid.UUID to pgtype.UUID for database operations
	var pgUUID pgtype.UUID
	pgUUID.Scan(sessionID.String())

	// Update session with successful results
	err = s.db.UpdateSessionWithResults(ctx, database.UpdateSessionWithResultsParams{
		ID:                pgUUID,
		GeminiResponse:    geminiResponseJSON,
		PrimaryAttraction: pgtype.Text{String: attractionInfo.Name, Valid: true},
		ConfidenceScore:   confidenceDecimal,
		AttractionInfo:    attractionInfoJSON,
		Status:            pgtype.Text{String: string(StatusCompleted), Valid: true},
	})

	if err != nil {
		slog.Error("Failed to update session with results", slog.String("session_id", sessionID.String()), slog.String("error", err.Error()))
		return
	}

	slog.Info("Successfully completed processing for session", slog.String("session_id", sessionID.String()), slog.Int64("processing_time_ms", processingTime.Milliseconds()))
}

// GetRecognitionResult retrieves the processing result for a session
func (s *RecognitionService) GetRecognitionResult(ctx context.Context, sessionID string) (*RecognitionResult, error) {
	// Parse session ID
	parsedID, err := uuid.Parse(sessionID)
	if err != nil {
		return nil, fmt.Errorf("invalid session ID format: %w", err)
	}

	// Convert to pgtype.UUID
	var pgUUID pgtype.UUID
	pgUUID.Scan(parsedID.String())

	// Get session from database
	session, err := s.db.GetRecognitionSession(ctx, pgUUID)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	// Calculate processing time if completed
	var processingTime *int64
	if session.ProcessingCompletedAt.Valid && session.ProcessingStartedAt.Valid {
		duration := session.ProcessingCompletedAt.Time.Sub(session.ProcessingStartedAt.Time)
		durationMs := duration.Milliseconds()
		processingTime = &durationMs
	}

	result := &RecognitionResult{
		SessionID:      sessionID,
		Status:         session.Status.String,
		ProcessingTime: processingTime,
	}

	// Handle different statuses
	switch session.Status.String {
	case string(StatusCompleted):
		// Parse attraction info if available
		if len(session.AttractionInfo) > 0 {
			var attractionInfo gemini.AttractionInfo
			if err := json.Unmarshal(session.AttractionInfo, &attractionInfo); err != nil {
				slog.Error("Failed to unmarshal attraction info for session", slog.String("session_id", sessionID), slog.String("error", err.Error()))
				result.Error = &ErrorDetail{
					Code:    "PARSE_ERROR",
					Message: "Failed to parse attraction information",
				}
			} else {
				result.AttractionInfo = &attractionInfo
			}
		}

	case string(StatusFailed):
		// Include error details
		errorMessage := "Processing failed"
		if session.ErrorMessage.Valid {
			errorMessage = session.ErrorMessage.String
		}

		result.Error = &ErrorDetail{
			Code:    "RECOGNITION_FAILED",
			Message: errorMessage,
			Details: "Try taking a clearer photo with better lighting",
		}

	case string(StatusTimeout):
		result.Error = &ErrorDetail{
			Code:    "TIMEOUT",
			Message: "Processing timed out",
			Details: "Please try again with a different photo",
		}
	}

	return result, nil
}

// GetRecentSessions returns recent recognition sessions
func (s *RecognitionService) GetRecentSessions(ctx context.Context, limit int32) ([]database.RecognitionSessions, error) {
	return s.db.GetRecentSessions(ctx, limit)
}

// CleanupOldSessions removes old sessions and their associated files
func (s *RecognitionService) CleanupOldSessions(ctx context.Context, olderThan time.Time) error {
	// Get sessions to clean up first (to get file paths)
	sessions, err := s.db.GetRecentSessions(ctx, 1000) // Get a large batch
	if err != nil {
		return fmt.Errorf("failed to get sessions for cleanup: %w", err)
	}

	// Delete old files first
	for _, session := range sessions {
		if session.CreatedAt.Valid && session.CreatedAt.Time.Before(olderThan) && session.ImagePath.Valid {
			if err := s.imageStorage.DeleteFile(session.ImagePath.String); err != nil {
				slog.Error("Failed to delete file", slog.String("file_path", session.ImagePath.String), slog.String("error", err.Error()))
				// Continue with cleanup even if file deletion fails
			}
		}
	}

	// Convert time.Time to pgtype.Timestamp
	var pgTimestamp pgtype.Timestamp
	pgTimestamp.Scan(olderThan)

	// Delete old sessions from database
	return s.db.DeleteOldSessions(ctx, pgTimestamp)
}
