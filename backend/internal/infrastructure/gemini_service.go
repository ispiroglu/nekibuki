package infrastructure

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"nekibuki-backend/internal/domain"

	"google.golang.org/genai"
)

// geminiService implements the domain.AIService interface
type geminiService struct {
	client *genai.Client
	logger *slog.Logger
	model  string
}

// NewGeminiService creates a new Gemini AI service
func NewGeminiService(logger *slog.Logger) (domain.AIService, error) {
	apiKey := os.Getenv("GOOGLE_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GOOGLE_API_KEY environment variable is required")
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %w", err)
	}

	return &geminiService{
		client: client,
		logger: logger,
		model:  "gemini-2.0-flash-lite", // Using Gemini 2.0 Flash as specified
	}, nil
}

// AnalyzeFile analyzes a file using Gemini AI
func (s *geminiService) AnalyzeFile(ctx context.Context, request *domain.AnalysisRequest) (*domain.AnalysisResponse, error) {
	if request == nil {
		return nil, fmt.Errorf("analysis request cannot be nil")
	}
	if len(request.FileData) == 0 {
		return nil, fmt.Errorf("file data cannot be empty")
	}

	s.logger.Info("Analyzing file with Gemini (type: %s, size: %d bytes)", request.MimeType, len(request.FileData))

	// Create structured prompt for landmark analysis
	prompt := `Analyze this image and identify any landmarks, monuments, or notable locations. 
	If no landmark is identified, describe what you see in the image as a general scene.`

	// Use custom prompt if provided
	if request.Prompt != "" && !strings.Contains(strings.ToLower(request.Prompt), "analyze this file and provide") {
		prompt = prompt + " Additional context: " + request.Prompt
	}

	// Define the response schema for structured output
	config := &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
		ResponseSchema: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"id": {
					Type:        genai.TypeString,
					Description: "Unique identifier for the landmark or 'general_scene' if no landmark",
				},
				"name": {
					Type:        genai.TypeString,
					Description: "Name of the landmark or 'General Scene' if no landmark identified",
				},
				"confidence": {
					Type:        genai.TypeInteger,
					Description: "Confidence level from 0-100",
				},
				"location": {
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"latitude": {
							Type:        genai.TypeNumber,
							Description: "Latitude coordinate (0 if unknown)",
						},
						"longitude": {
							Type:        genai.TypeNumber,
							Description: "Longitude coordinate (0 if unknown)",
						},
						"address": {
							Type:        genai.TypeString,
							Description: "Full address or 'Location unknown' if not identifiable",
						},
					},
					PropertyOrdering: []string{"latitude", "longitude", "address"},
					Required:         []string{"latitude", "longitude", "address"},
				},
				"description": {
					Type:        genai.TypeString,
					Description: "Detailed description of the landmark or scene",
				},
				"facts": {
					Type: genai.TypeArray,
					Items: &genai.Schema{
						Type: genai.TypeString,
					},
					Description: "Array of interesting facts about the landmark or observations about the scene",
				},
				"historicalInfo": {
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"period": {
							Type:        genai.TypeString,
							Description: "Construction period or 'Unknown' if not applicable",
						},
						"architect": {
							Type:        genai.TypeString,
							Description: "Architect name if known, can be omitted if unknown",
						},
						"significance": {
							Type:        genai.TypeString,
							Description: "Historical significance or 'No historical significance identified' for general scenes",
						},
					},
					PropertyOrdering: []string{"period", "architect", "significance"},
					Required:         []string{"period", "significance"},
				},
				"quickFacts": {
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"Height":        {Type: genai.TypeString},
						"Construction":  {Type: genai.TypeString},
						"Visitors/Year": {Type: genai.TypeString},
						"Style":         {Type: genai.TypeString},
						"Type":          {Type: genai.TypeString},
					},
					Description: "Object with key-value pairs of quick facts",
				},
			},
			PropertyOrdering: []string{"id", "name", "confidence", "location", "description", "facts", "historicalInfo", "quickFacts"},
			Required:         []string{"id", "name", "confidence", "location", "description", "facts", "historicalInfo", "quickFacts"},
		},
	}

	// Prepare content parts for multimodal input
	parts := []*genai.Part{
		{Text: prompt},
		{InlineData: &genai.Blob{
			Data:     request.FileData,
			MIMEType: request.MimeType,
		}},
	}

	// Generate content using Gemini 2.0 Flash with structured output
	result, err := s.client.Models.GenerateContent(
		ctx,
		s.model,
		[]*genai.Content{{Parts: parts}},
		config,
	)
	if err != nil {
		s.logger.Error("Gemini API error: %v", err)
		return &domain.AnalysisResponse{
			Success: false,
			Error:   fmt.Sprintf("Gemini API error: %v", err),
		}, fmt.Errorf("failed to generate content: %w", err)
	}

	// Extract text from response
	if len(result.Candidates) == 0 {
		return &domain.AnalysisResponse{
			Success: false,
			Error:   "no response candidates received from Gemini",
		}, fmt.Errorf("no response candidates received")
	}

	candidate := result.Candidates[0]
	if len(candidate.Content.Parts) == 0 {
		return &domain.AnalysisResponse{
			Success: false,
			Error:   "no content parts in Gemini response",
		}, fmt.Errorf("no content parts in response")
	}

	// Collect all text parts from the response
	var responseText strings.Builder
	for _, part := range candidate.Content.Parts {
		if part.Text != "" {
			responseText.WriteString(part.Text)
		}
	}

	if responseText.Len() == 0 {
		return &domain.AnalysisResponse{
			Success: false,
			Error:   "empty response from Gemini",
		}, fmt.Errorf("empty response from Gemini")
	}

	analysisText := strings.TrimSpace(responseText.String())
	s.logger.Info("Successfully received structured analysis from Gemini (%d characters)", len(analysisText))

	return &domain.AnalysisResponse{
		Analysis: analysisText,
		Success:  true,
	}, nil
}

// IsHealthy checks if the Gemini service is healthy
func (s *geminiService) IsHealthy(ctx context.Context) bool {
	// Simple health check by trying to get model information
	// We'll use a minimal test request to verify connectivity

	// Create a very simple text content for health check
	parts := []*genai.Part{
		{Text: "Health check: respond with 'healthy'"},
	}

	result, err := s.client.Models.GenerateContent(
		ctx,
		s.model,
		[]*genai.Content{{Parts: parts}},
		nil,
	)

	if err != nil {
		s.logger.Error("Health check failed: %v", err)
		return false
	}

	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		s.logger.Error("Health check failed: empty response")
		return false
	}

	return true
}
