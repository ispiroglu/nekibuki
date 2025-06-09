package gemini

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"

	"google.golang.org/genai"
)

// GeminiService handles multimodal image analysis and content generation
type GeminiService struct {
	client *genai.Client
	model  string
}

// AttractionInfo represents the structured response from Gemini
type AttractionInfo struct {
	Name             string              `json:"name"`
	Description      string              `json:"description"`
	HistoricalInfo   string              `json:"historical_info"`
	Significance     string              `json:"significance"`
	InterestingFacts []string            `json:"interesting_facts"`
	QuickFacts       []map[string]string `json:"quick_facts"`
	Location         *LocationInfo       `json:"location,omitempty"`
	Confidence       int                 `json:"confidence"`
}

// LocationInfo represents location details
type LocationInfo struct {
	Country string `json:"country,omitempty"`
	City    string `json:"city,omitempty"`
	Region  string `json:"region,omitempty"`
}

// GeminiErrorResponse represents error response when no attraction is found
type GeminiErrorResponse struct {
	Error      string  `json:"error"`
	Confidence float64 `json:"confidence"`
}

// NewGeminiService creates a new Gemini service instance
func NewGeminiService(ctx context.Context, apiKey string) (*GeminiService, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %w", err)
	}

	return &GeminiService{
		client: client,
		model:  os.Getenv("GEMINI_MODEL"),
	}, nil
}

// AnalyzeImageAndGenerateInfo analyzes an image and generates tourist attraction information
func (g *GeminiService) AnalyzeImageAndGenerateInfo(ctx context.Context, imageData []byte) (*AttractionInfo, error) {
	// Create schema for AttractionInfo
	attractionSchema := &genai.Schema{
		Type: "object",
		Properties: map[string]*genai.Schema{
			"name": {
				Type:        "string",
				Description: "Full name of the attraction",
			},
			"description": {
				Type:        "string",
				Description: "Brief description (2-3 sentences)",
			},
			"historical_info": {
				Type:        "string",
				Description: "Historical background (1 paragraph)",
			},
			"significance": {
				Type:        "string",
				Description: "Cultural/historical significance (1 paragraph)",
			},
			"interesting_facts": {
				Type: "array",
				Items: &genai.Schema{
					Type: "string",
				},
				Description: "Array of interesting facts about the attraction",
			},
			"quick_facts": {
				Type: "array",
				Items: &genai.Schema{
					Type: "object",
					Properties: map[string]*genai.Schema{
						"key":   {Type: "string", Description: "fact category or type"},
						"value": {Type: "string", Description: "fact value or description"},
					},
					Required: []string{"key", "value"},
				},
				Description: "array of quick facts as key-value objects (e.g., [{key: 'Type', value: 'Historical Monument'}, {key: 'Height', value: '330m'}])",
			},
			"location": {
				Type: "object",
				Properties: map[string]*genai.Schema{
					"country": {Type: "string"},
					"city":    {Type: "string"},
					"region":  {Type: "string"},
				},
				Nullable: func() *bool { b := true; return &b }(),
			},
			"confidence": {
				Type:        "integer",
				Description: "Confidence score between 0 and 100",
			},
		},
		Required: []string{"name", "description", "historical_info", "significance", "interesting_facts", "quick_facts", "confidence"},
	}

	// Create the prompt without JSON format instructions
	prompt := `
Analyze this image and identify any tourist attractions, landmarks, or notable locations.

If you can identify a tourist attraction or landmark in the image:
1. Provide detailed information about it
2. Be confident only if you can clearly identify the location
3. Set confidence to a value between 0 and 100 if you can identify the attraction
4. Set confidence to a value below 30 if you cannot clearly identify any specific attraction
5. Generate relevant QuickFacts as an array of key-value objects that are specific to this attraction type (e.g., for buildings: Height, Year Built, Architect; for natural sites: Formation Type, Elevation, Protected Status; for historical sites: Period, UNESCO Status, Architectural Style).
5.1 Do not include location information in the QuickFacts.

Focus on factual, engaging information suitable for tourists.
`

	// Create parts for multimodal input
	parts := []*genai.Part{
		{Text: prompt},
		{InlineData: &genai.Blob{Data: imageData, MIMEType: "image/jpeg"}},
	}

	// Create generation config with structured output
	config := &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
		ResponseSchema:   attractionSchema,
	}

	// Generate content using with structured output
	result, err := g.client.Models.GenerateContent(ctx, g.model, []*genai.Content{{Parts: parts}}, config)
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %w", err)
	}

	// Check if we have a valid response
	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response received from Gemini")
	}

	// Extract the response text
	responseText := result.Candidates[0].Content.Parts[0].Text
	if responseText == "" {
		return nil, fmt.Errorf("empty response received from Gemini")
	}

	slog.Info("Gemini structured response", "response", responseText)

	// Since we're using structured output, we should be able to parse the JSON directly
	var attractionInfo AttractionInfo
	if err := json.Unmarshal([]byte(responseText), &attractionInfo); err != nil {
		return nil, fmt.Errorf("failed to parse structured response: %w", err)
	}

	// Check if confidence indicates a valid attraction was found
	if attractionInfo.Confidence < 30 {
		return nil, fmt.Errorf("no recognizable tourist attraction found (confidence: %d)", attractionInfo.Confidence)
	}

	return &attractionInfo, nil
}
