package application

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"nekibuki-backend/internal/domain"

	"github.com/google/uuid"
)

// fileAnalysisService implements the domain.FileAnalysisService interface
type fileAnalysisService struct {
	analysisRepo domain.AnalysisRepository
	aiService    domain.AIService
	logger       *slog.Logger
}

// NewFileAnalysisService creates a new file analysis service
func NewFileAnalysisService(
	analysisRepo domain.AnalysisRepository,
	aiService domain.AIService,
	logger *slog.Logger,
) domain.FileAnalysisService {
	return &fileAnalysisService{
		analysisRepo: analysisRepo,
		aiService:    aiService,
		logger:       logger,
	}
}

// ProcessFile handles the complete file analysis workflow
func (s *fileAnalysisService) ProcessFile(ctx context.Context, upload *domain.FileUpload) (*domain.FileAnalysis, error) {
	// Validate input
	if upload == nil {
		return nil, fmt.Errorf("upload cannot be nil")
	}
	if len(upload.FileData) == 0 {
		return nil, fmt.Errorf("file data cannot be empty")
	}
	if upload.FileName == "" {
		return nil, fmt.Errorf("file name cannot be empty")
	}

	// Set default prompt if not provided
	prompt := upload.Prompt
	if prompt == "" {
		prompt = "Analyze this file and provide a detailed description of what you see or what the content contains."
	}

	// Create analysis entity
	analysis := &domain.FileAnalysis{
		ID:        uuid.New().String(),
		FileName:  upload.FileName,
		FileSize:  int64(len(upload.FileData)),
		MimeType:  upload.MimeType,
		Prompt:    prompt,
		Status:    domain.StatusPending,
		CreatedAt: time.Now().UTC(),
	}

	// Save initial analysis record
	if err := s.analysisRepo.Save(ctx, analysis); err != nil {
		s.logger.Error("Failed to save initial analysis: %v", err)
		return nil, fmt.Errorf("failed to save analysis: %w", err)
	}

	// Update status to processing
	analysis.Status = domain.StatusProcessing
	if err := s.analysisRepo.Update(ctx, analysis); err != nil {
		s.logger.Error("Failed to update analysis status: %v", err)
	}

	// Prepare analysis request
	analysisRequest := &domain.AnalysisRequest{
		FileData: upload.FileData,
		MimeType: upload.MimeType,
		Prompt:   prompt,
	}

	// Perform AI analysis
	response, err := s.aiService.AnalyzeFile(ctx, analysisRequest)
	if err != nil {
		s.logger.Error("AI analysis failed for file %s: %v", upload.FileName, err)

		// Update analysis with error
		analysis.Status = domain.StatusFailed
		analysis.ErrorMsg = err.Error()
		completedAt := time.Now().UTC()
		analysis.CompletedAt = &completedAt

		if updateErr := s.analysisRepo.Update(ctx, analysis); updateErr != nil {
			s.logger.Error("Failed to update analysis with error: %v", updateErr)
		}

		return nil, fmt.Errorf("failed to analyze file: %w", err)
	}

	// Update analysis with results
	analysis.Status = domain.StatusCompleted
	analysis.Analysis = response.Analysis
	completedAt := time.Now().UTC()
	analysis.CompletedAt = &completedAt

	if err := s.analysisRepo.Update(ctx, analysis); err != nil {
		s.logger.Error("Failed to update analysis with results: %v", err)
		return nil, fmt.Errorf("failed to save analysis results: %w", err)
	}

	s.logger.Info("Successfully analyzed file %s (ID: %s)", upload.FileName, analysis.ID)
	return analysis, nil
}

// GetAnalysis retrieves an analysis by ID
func (s *fileAnalysisService) GetAnalysis(ctx context.Context, id string) (*domain.FileAnalysis, error) {
	if id == "" {
		return nil, fmt.Errorf("analysis ID cannot be empty")
	}

	analysis, err := s.analysisRepo.GetByID(ctx, id)
	if err != nil {
		s.logger.Error("Failed to get analysis %s: %v", id, err)
		return nil, fmt.Errorf("failed to get analysis: %w", err)
	}

	return analysis, nil
}

// ListAnalyses retrieves a list of analyses with pagination
func (s *fileAnalysisService) ListAnalyses(ctx context.Context, limit, offset int) ([]*domain.FileAnalysis, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	analyses, err := s.analysisRepo.List(ctx, limit, offset)
	if err != nil {
		s.logger.Error("Failed to list analyses: %v", err)
		return nil, fmt.Errorf("failed to list analyses: %w", err)
	}

	return analyses, nil
}

// DeleteAnalysis removes an analysis
func (s *fileAnalysisService) DeleteAnalysis(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("analysis ID cannot be empty")
	}

	// Check if analysis exists
	_, err := s.analysisRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("analysis not found: %w", err)
	}

	if err := s.analysisRepo.Delete(ctx, id); err != nil {
		s.logger.Error("Failed to delete analysis %s: %v", id, err)
		return fmt.Errorf("failed to delete analysis: %w", err)
	}

	s.logger.Info("Successfully deleted analysis %s", id)
	return nil
}

// detectMimeType attempts to detect MIME type from filename if not provided
func detectMimeType(filename, providedMimeType string) string {
	if providedMimeType != "" {
		return providedMimeType
	}

	// Simple MIME type detection based on file extension
	filename = strings.ToLower(filename)

	switch {
	case strings.HasSuffix(filename, ".jpg") || strings.HasSuffix(filename, ".jpeg"):
		return "image/jpeg"
	case strings.HasSuffix(filename, ".png"):
		return "image/png"
	case strings.HasSuffix(filename, ".gif"):
		return "image/gif"
	case strings.HasSuffix(filename, ".pdf"):
		return "application/pdf"
	case strings.HasSuffix(filename, ".txt"):
		return "text/plain"
	case strings.HasSuffix(filename, ".doc"):
		return "application/msword"
	case strings.HasSuffix(filename, ".docx"):
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	default:
		return "application/octet-stream"
	}
}
