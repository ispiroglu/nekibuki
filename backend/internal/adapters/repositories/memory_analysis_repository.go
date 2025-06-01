package repositories

import (
	"context"
	"fmt"
	"sort"
	"sync"

	"nekibuki-backend/internal/domain"
)

// memoryAnalysisRepository implements domain.AnalysisRepository using in-memory storage
type memoryAnalysisRepository struct {
	mu       sync.RWMutex
	analyses map[string]*domain.FileAnalysis
}

// NewMemoryAnalysisRepository creates a new in-memory analysis repository
func NewMemoryAnalysisRepository() domain.AnalysisRepository {
	return &memoryAnalysisRepository{
		analyses: make(map[string]*domain.FileAnalysis),
	}
}

// Save stores a file analysis
func (r *memoryAnalysisRepository) Save(ctx context.Context, analysis *domain.FileAnalysis) error {
	if analysis == nil {
		return fmt.Errorf("analysis cannot be nil")
	}
	if analysis.ID == "" {
		return fmt.Errorf("analysis ID cannot be empty")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	// Check if analysis already exists
	if _, exists := r.analyses[analysis.ID]; exists {
		return fmt.Errorf("analysis with ID %s already exists", analysis.ID)
	}

	// Create a copy to avoid external modifications
	analysisCopy := *analysis
	r.analyses[analysis.ID] = &analysisCopy

	return nil
}

// GetByID retrieves a file analysis by ID
func (r *memoryAnalysisRepository) GetByID(ctx context.Context, id string) (*domain.FileAnalysis, error) {
	if id == "" {
		return nil, fmt.Errorf("analysis ID cannot be empty")
	}

	r.mu.RLock()
	defer r.mu.RUnlock()

	analysis, exists := r.analyses[id]
	if !exists {
		return nil, fmt.Errorf("analysis with ID %s not found", id)
	}

	// Return a copy to avoid external modifications
	analysisCopy := *analysis
	return &analysisCopy, nil
}

// List retrieves a list of file analyses with pagination
func (r *memoryAnalysisRepository) List(ctx context.Context, limit, offset int) ([]*domain.FileAnalysis, error) {
	if limit <= 0 {
		return nil, fmt.Errorf("limit must be greater than 0")
	}
	if offset < 0 {
		return nil, fmt.Errorf("offset must be non-negative")
	}

	r.mu.RLock()
	defer r.mu.RUnlock()

	// Get all analyses and sort by creation date (newest first)
	analyses := make([]*domain.FileAnalysis, 0, len(r.analyses))
	for _, analysis := range r.analyses {
		analysisCopy := *analysis
		analyses = append(analyses, &analysisCopy)
	}

	// Sort by creation date (newest first)
	sort.Slice(analyses, func(i, j int) bool {
		return analyses[i].CreatedAt.After(analyses[j].CreatedAt)
	})

	// Apply pagination
	totalCount := len(analyses)
	if offset >= totalCount {
		return []*domain.FileAnalysis{}, nil
	}

	end := offset + limit
	if end > totalCount {
		end = totalCount
	}

	return analyses[offset:end], nil
}

// Update updates an existing file analysis
func (r *memoryAnalysisRepository) Update(ctx context.Context, analysis *domain.FileAnalysis) error {
	if analysis == nil {
		return fmt.Errorf("analysis cannot be nil")
	}
	if analysis.ID == "" {
		return fmt.Errorf("analysis ID cannot be empty")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	// Check if analysis exists
	if _, exists := r.analyses[analysis.ID]; !exists {
		return fmt.Errorf("analysis with ID %s not found", analysis.ID)
	}

	// Update with a copy
	analysisCopy := *analysis
	r.analyses[analysis.ID] = &analysisCopy

	return nil
}

// Delete removes a file analysis
func (r *memoryAnalysisRepository) Delete(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("analysis ID cannot be empty")
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	// Check if analysis exists
	if _, exists := r.analyses[id]; !exists {
		return fmt.Errorf("analysis with ID %s not found", id)
	}

	delete(r.analyses, id)
	return nil
}

// Count returns the total number of analyses (useful for testing)
func (r *memoryAnalysisRepository) Count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.analyses)
}
