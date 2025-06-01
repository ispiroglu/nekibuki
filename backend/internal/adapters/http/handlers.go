package http

import (
	"io"
	"log/slog"
	"strconv"
	"strings"

	"nekibuki-backend/internal/domain"

	"github.com/gofiber/fiber/v2"
)

// Handler contains the HTTP handlers for the file analysis API
type Handler struct {
	fileAnalysisService domain.FileAnalysisService
	logger              *slog.Logger
}

// NewHandler creates a new HTTP handler
func NewHandler(fileAnalysisService domain.FileAnalysisService, logger *slog.Logger) *Handler {
	return &Handler{
		fileAnalysisService: fileAnalysisService,
		logger:              logger,
	}
}

// UploadResponse represents the response for file upload
type UploadResponse struct {
	Success bool                 `json:"success"`
	Message string               `json:"message"`
	Data    *domain.FileAnalysis `json:"data,omitempty"`
	Error   string               `json:"error,omitempty"`
}

// ListResponse represents the response for listing analyses
type ListResponse struct {
	Success bool                   `json:"success"`
	Message string                 `json:"message"`
	Data    []*domain.FileAnalysis `json:"data,omitempty"`
	Error   string                 `json:"error,omitempty"`
}

// UploadFile handles file upload and analysis
func (h *Handler) UploadFile(c *fiber.Ctx) error {
	// Get file from form
	file, err := c.FormFile("file")
	if err != nil {
		h.logger.Error("Failed to get file from form: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(UploadResponse{
			Success: false,
			Message: "File upload failed",
			Error:   "Failed to get file: " + err.Error(),
		})
	}

	// Open file
	fileReader, err := file.Open()
	if err != nil {
		h.logger.Error("Failed to open file: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(UploadResponse{
			Success: false,
			Message: "File processing failed",
			Error:   "Failed to open file: " + err.Error(),
		})
	}
	defer fileReader.Close()

	// Read file content
	fileData, err := io.ReadAll(fileReader)
	if err != nil {
		h.logger.Error("Failed to read file content: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(UploadResponse{
			Success: false,
			Message: "File processing failed",
			Error:   "Failed to read file: " + err.Error(),
		})
	}

	// Get prompt from form (optional)
	prompt := c.FormValue("prompt")

	// Detect MIME type
	mimeType := file.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = detectMimeType(file.Filename)
	}

	h.logger.Info("Processing file upload: %s (type: %s, size: %d bytes)",
		file.Filename, mimeType, len(fileData))

	// Create upload request
	upload := &domain.FileUpload{
		FileName: file.Filename,
		FileData: fileData,
		MimeType: mimeType,
		Prompt:   prompt,
	}

	// Process file
	analysis, err := h.fileAnalysisService.ProcessFile(c.Context(), upload)
	if err != nil {
		h.logger.Error("Failed to process file: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(UploadResponse{
			Success: false,
			Message: "Analysis failed",
			Error:   err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(UploadResponse{
		Success: true,
		Message: "File analyzed successfully",
		Data:    analysis,
	})
}

// GetAnalysis retrieves an analysis by ID
func (h *Handler) GetAnalysis(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(UploadResponse{
			Success: false,
			Message: "Invalid request",
			Error:   "Analysis ID is required",
		})
	}

	analysis, err := h.fileAnalysisService.GetAnalysis(c.Context(), id)
	if err != nil {
		h.logger.Error("Failed to get analysis %s: %v", id, err)
		return c.Status(fiber.StatusNotFound).JSON(UploadResponse{
			Success: false,
			Message: "Analysis not found",
			Error:   err.Error(),
		})
	}

	return c.JSON(UploadResponse{
		Success: true,
		Message: "Analysis retrieved successfully",
		Data:    analysis,
	})
}

// ListAnalyses retrieves a list of analyses with pagination
func (h *Handler) ListAnalyses(c *fiber.Ctx) error {
	// Parse query parameters
	limit := 10
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	analyses, err := h.fileAnalysisService.ListAnalyses(c.Context(), limit, offset)
	if err != nil {
		h.logger.Error("Failed to list analyses: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ListResponse{
			Success: false,
			Message: "Failed to retrieve analyses",
			Error:   err.Error(),
		})
	}

	return c.JSON(ListResponse{
		Success: true,
		Message: "Analyses retrieved successfully",
		Data:    analyses,
	})
}

// DeleteAnalysis removes an analysis
func (h *Handler) DeleteAnalysis(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(UploadResponse{
			Success: false,
			Message: "Invalid request",
			Error:   "Analysis ID is required",
		})
	}

	err := h.fileAnalysisService.DeleteAnalysis(c.Context(), id)
	if err != nil {
		h.logger.Error("Failed to delete analysis %s: %v", id, err)
		return c.Status(fiber.StatusNotFound).JSON(UploadResponse{
			Success: false,
			Message: "Failed to delete analysis",
			Error:   err.Error(),
		})
	}

	return c.JSON(UploadResponse{
		Success: true,
		Message: "Analysis deleted successfully",
	})
}

// Health check endpoint
func (h *Handler) Health(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":  "healthy",
		"service": "nekibuki-backend",
		"version": "1.0.0",
	})
}

// detectMimeType attempts to detect MIME type from filename
func detectMimeType(filename string) string {
	filename = strings.ToLower(filename)

	switch {
	case strings.HasSuffix(filename, ".jpg") || strings.HasSuffix(filename, ".jpeg"):
		return "image/jpeg"
	case strings.HasSuffix(filename, ".png"):
		return "image/png"
	case strings.HasSuffix(filename, ".gif"):
		return "image/gif"
	case strings.HasSuffix(filename, ".bmp"):
		return "image/bmp"
	case strings.HasSuffix(filename, ".webp"):
		return "image/webp"
	case strings.HasSuffix(filename, ".pdf"):
		return "application/pdf"
	case strings.HasSuffix(filename, ".txt"):
		return "text/plain"
	case strings.HasSuffix(filename, ".doc"):
		return "application/msword"
	case strings.HasSuffix(filename, ".docx"):
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	case strings.HasSuffix(filename, ".xls"):
		return "application/vnd.ms-excel"
	case strings.HasSuffix(filename, ".xlsx"):
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case strings.HasSuffix(filename, ".ppt"):
		return "application/vnd.ms-powerpoint"
	case strings.HasSuffix(filename, ".pptx"):
		return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
	default:
		return "application/octet-stream"
	}
}
