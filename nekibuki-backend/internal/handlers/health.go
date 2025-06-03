package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"nekibuki-backend/internal/database"
)

type HealthHandler struct {
	db *database.DB
}

func NewHealthHandler(db *database.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

// HealthResponse represents the health check response
// @Description Health check response with system and database status
type HealthResponse struct {
	Status   string               `json:"status" example:"healthy" description:"Overall system status"`
	Version  string               `json:"version" example:"1.0.0" description:"API version"`
	Database DatabaseHealthStatus `json:"database" description:"Database health information"`
	System   SystemHealthStatus   `json:"system" description:"System health information"`
}

// DatabaseHealthStatus represents database health information
// @Description Database connection and health status
type DatabaseHealthStatus struct {
	Status      string `json:"status" example:"healthy" description:"Database connection status"`
	Connections int    `json:"connections" example:"2" description:"Current active connections"`
	MaxConns    int32  `json:"max_connections" example:"10" description:"Maximum allowed connections"`
}

// SystemHealthStatus represents system health information
// @Description System uptime and timestamp information
type SystemHealthStatus struct {
	Timestamp time.Time `json:"timestamp" example:"2023-12-01T12:00:00Z" description:"Current timestamp"`
	Uptime    string    `json:"uptime" example:"24h30m45s" description:"System uptime duration"`
}

var startTime = time.Now()

// HealthCheck performs a health check of the system
// @Summary Health Check
// @Description Get the health status of the API and its dependencies
// @Tags Health
// @Accept json
// @Produce json
// @Success 200 {object} HealthResponse "Healthy system"
// @Failure 503 {object} HealthResponse "System unhealthy"
// @Router /api/health [get]
func (h *HealthHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Check database health
	var dbStatus DatabaseHealthStatus
	if err := h.db.Health(ctx); err != nil {
		dbStatus = DatabaseHealthStatus{
			Status: "unhealthy",
		}
	} else {
		stats := h.db.Stats()
		dbStatus = DatabaseHealthStatus{
			Status:      "healthy",
			Connections: int(stats.AcquiredConns()),
			MaxConns:    stats.MaxConns(),
		}
	}

	// Overall status
	status := "healthy"
	if dbStatus.Status != "healthy" {
		status = "unhealthy"
	}

	response := HealthResponse{
		Status:   status,
		Version:  "1.0.0", // MVP version
		Database: dbStatus,
		System: SystemHealthStatus{
			Timestamp: time.Now(),
			Uptime:    time.Since(startTime).String(),
		},
	}

	// Set appropriate status code
	statusCode := http.StatusOK
	if status != "healthy" {
		statusCode = http.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}
