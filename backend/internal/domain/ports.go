package domain

import "context"

// AnalysisRepository defines the contract for file analysis persistence
type AnalysisRepository interface {
	Save(ctx context.Context, analysis *FileAnalysis) error
	GetByID(ctx context.Context, id string) (*FileAnalysis, error)
	List(ctx context.Context, limit, offset int) ([]*FileAnalysis, error)
	Update(ctx context.Context, analysis *FileAnalysis) error
	Delete(ctx context.Context, id string) error
}

// AIService defines the contract for AI analysis service
type AIService interface {
	AnalyzeFile(ctx context.Context, request *AnalysisRequest) (*AnalysisResponse, error)
	IsHealthy(ctx context.Context) bool
}

// FileAnalysisService defines the business logic contract
type FileAnalysisService interface {
	ProcessFile(ctx context.Context, upload *FileUpload) (*FileAnalysis, error)
	GetAnalysis(ctx context.Context, id string) (*FileAnalysis, error)
	ListAnalyses(ctx context.Context, limit, offset int) ([]*FileAnalysis, error)
	DeleteAnalysis(ctx context.Context, id string) error
}
