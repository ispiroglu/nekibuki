package main

import (
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"nekibuki-backend/internal/adapters/http"
	"nekibuki-backend/internal/adapters/repositories"
	"nekibuki-backend/internal/application"
	"nekibuki-backend/internal/infrastructure"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	// Create logger
	godotenv.Load()
	appLogger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	appLogger.Info("Starting Nekibuki Backend Server...")

	// Check for required environment variables
	if os.Getenv("GOOGLE_API_KEY") == "" {
		appLogger.Error("GOOGLE_API_KEY environment variable is required")
	}

	// Initialize dependencies (Dependency Injection)

	// Infrastructure layer
	aiService, err := infrastructure.NewGeminiService(appLogger)
	if err != nil {
		appLogger.Error("Failed to create Gemini service: %v", err)
	}

	// Repository layer
	analysisRepo := repositories.NewMemoryAnalysisRepository()

	// Application layer
	fileAnalysisService := application.NewFileAnalysisService(analysisRepo, aiService, appLogger)

	// HTTP adapter layer
	handler := http.NewHandler(fileAnalysisService, appLogger)

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:       "Nekibuki Backend API v1.0.0",
		ServerHeader:  "Nekibuki",
		CaseSensitive: false,
		StrictRouting: false,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			appLogger.Error("Fiber error: %v", err)
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"success": false,
				"message": "Server error",
				"error":   err.Error(),
			})
		},
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} - ${latency}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: false,
	}))

	// Routes
	setupRoutes(app, handler)

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start server in a goroutine
	go func() {
		appLogger.Info("Server starting on port %s", port)
		appLogger.Info("Health check: http://localhost:%s/health", port)
		appLogger.Info("Upload endpoint: http://localhost:%s/api/v1/upload", port)

		if err := app.Listen(":" + port); err != nil {
			appLogger.Error("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	// Block until we receive our signal
	<-c
	appLogger.Info("Shutting down server...")

	// Shutdown server
	if err := app.Shutdown(); err != nil {
		appLogger.Error("Error during server shutdown: %v", err)
	}

	appLogger.Info("Server stopped")
}

// setupRoutes configures all the API routes
func setupRoutes(app *fiber.App, handler *http.Handler) {
	// Root endpoint
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "Nekibuki Backend API",
			"version": "1.0.0",
			"status":  "running",
			"endpoints": map[string]string{
				"health":   "GET /health",
				"upload":   "POST /api/v1/upload",
				"analysis": "GET /api/v1/analysis/:id",
				"analyses": "GET /api/v1/analyses",
				"delete":   "DELETE /api/v1/analysis/:id",
			},
		})
	})

	// Health check
	app.Get("/health", handler.Health)

	// API v1 routes
	api := app.Group("/api/v1")

	// File upload and analysis
	api.Post("/upload", handler.UploadFile)

	// Analysis management
	api.Get("/analysis/:id", handler.GetAnalysis)
	api.Get("/analyses", handler.ListAnalyses)
	api.Delete("/analysis/:id", handler.DeleteAnalysis)

	// Handle 404
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Endpoint not found",
			"error":   "The requested endpoint does not exist",
		})
	})
}
