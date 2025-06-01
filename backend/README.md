# Nekibuki Backend

A backend server built with Go, Fiber, and Gemini 2.0 Flash API for file analysis using hexagonal architecture.

## Architecture

This project follows hexagonal architecture (ports and adapters) pattern:

```
backend/
├── cmd/server/           # Application entry point
├── internal/
│   ├── domain/          # Business entities and interfaces (ports)
│   ├── application/     # Use cases and business logic
│   ├── infrastructure/  # External services (Gemini AI)
│   └── adapters/
│       ├── http/        # HTTP handlers (Fiber)
│       └── repositories/ # Data persistence
├── pkg/                 # Shared packages
└── docs/                # Documentation
```

### Architecture Layers

1. **Domain Layer**: Contains business entities, value objects, and interfaces (ports)
2. **Application Layer**: Implements use cases and orchestrates domain objects
3. **Infrastructure Layer**: External services like Gemini AI API
4. **Adapters Layer**: HTTP handlers, repositories, and other I/O adapters

## Features

- ✅ File upload and analysis with Gemini 2.0 Flash
- ✅ RESTful API with JSON responses
- ✅ Hexagonal architecture for clean separation of concerns
- ✅ CORS support for web applications
- ✅ Graceful shutdown
- ✅ Comprehensive error handling
- ✅ Request/response logging
- ✅ Health check endpoint
- ✅ In-memory storage (can be easily replaced with database)

## Prerequisites

- Go 1.21 or higher
- Google AI API Key (Gemini API access)

## Setup

1. **Clone and navigate to the backend directory**
2. **Install dependencies:**
   ```bash
   go mod tidy
   ```

3. **Set environment variables:**
   ```bash
   export GOOGLE_API_KEY="your-gemini-api-key"
   export PORT="8080"  # Optional, defaults to 8080
   ```

4. **Run the server:**
   ```bash
   # Using the new architecture
   go run cmd/server/main.go
   
   # Or using the legacy main.go (redirects to new structure)
   go run main.go
   ```

## API Endpoints

### Base URL: `http://localhost:8080`

### Root Endpoint
- **GET** `/` - API information and available endpoints

### Health Check
- **GET** `/health` - Server health status

### File Analysis
- **POST** `/api/v1/upload` - Upload and analyze file
- **GET** `/api/v1/analysis/:id` - Get analysis by ID
- **GET** `/api/v1/analyses` - List all analyses (with pagination)
- **DELETE** `/api/v1/analysis/:id` - Delete analysis

## API Usage Examples

### Upload File for Analysis

```bash
curl -X POST http://localhost:8080/api/v1/upload \
  -F "file=@example.jpg" \
  -F "prompt=Describe what you see in this image"
```

**Response:**
```json
{
  "success": true,
  "message": "File analyzed successfully",
  "data": {
    "id": "uuid-here",
    "fileName": "example.jpg",
    "fileSize": 1024,
    "mimeType": "image/jpeg",
    "prompt": "Describe what you see in this image",
    "analysis": "AI analysis result here...",
    "status": "completed",
    "createdAt": "2024-01-01T12:00:00Z",
    "completedAt": "2024-01-01T12:00:05Z"
  }
}
```

### Get Analysis by ID

```bash
curl http://localhost:8080/api/v1/analysis/{analysis-id}
```

### List All Analyses

```bash
# With pagination
curl "http://localhost:8080/api/v1/analyses?limit=10&offset=0"
```

### Health Check

```bash
curl http://localhost:8080/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "nekibuki-backend",
  "version": "1.0.0"
}
```

## Supported File Types

The server can analyze various file types including:

- **Images**: JPEG, PNG, GIF, BMP, WebP
- **Documents**: PDF, DOC, DOCX, TXT
- **Spreadsheets**: XLS, XLSX
- **Presentations**: PPT, PPTX

## Configuration

### Environment Variables

- `GOOGLE_API_KEY` (required) - Your Google AI API key for Gemini access
- `PORT` (optional) - Server port, defaults to 8080

### Getting Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new project or select existing one
3. Generate an API key
4. Set the key in your environment variables

## Development

### Project Structure

```
backend/
├── cmd/server/main.go                                    # Application entry point
├── internal/
│   ├── domain/
│   │   ├── entities.go                                   # Business entities
│   │   └── ports.go                                      # Domain interfaces
│   ├── application/
│   │   └── file_analysis_service.go                     # Business logic
│   ├── infrastructure/
│   │   └── gemini_service.go                            # Gemini AI integration
│   └── adapters/
│       ├── http/
│       │   └── handlers.go                              # HTTP handlers
│       └── repositories/
│           └── memory_analysis_repository.go            # In-memory storage
├── main.go                                              # Legacy entry point
├── go.mod                                               # Dependencies
└── README.md                                            # This file
```

### Adding New Features

1. **Domain Changes**: Add new entities or interfaces in `internal/domain/`
2. **Business Logic**: Implement use cases in `internal/application/`
3. **External Services**: Add new services in `internal/infrastructure/`
4. **API Endpoints**: Add new handlers in `internal/adapters/http/`

### Testing

```bash
# Run tests (when implemented)
go test ./...

# Run with coverage
go test -cover ./...
```

## Docker Support

Create a `Dockerfile`:

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o server cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/server .

EXPOSE 8080
CMD ["./server"]
```

Build and run:

```bash
docker build -t nekibuki-backend .
docker run -p 8080:8080 -e GOOGLE_API_KEY=your-key nekibuki-backend
```

## Deployment

### Environment Setup

For production deployment, ensure:

1. Set `GOOGLE_API_KEY` environment variable
2. Configure `PORT` if needed
3. Set up proper logging and monitoring
4. Consider using a proper database instead of in-memory storage

### Database Integration

To replace in-memory storage with a database:

1. Create a new repository implementation in `internal/adapters/repositories/`
2. Implement the `domain.AnalysisRepository` interface
3. Update dependency injection in `cmd/server/main.go`

Example for PostgreSQL:
```go
// internal/adapters/repositories/postgres_analysis_repository.go
type postgresAnalysisRepository struct {
    db *sql.DB
}

func (r *postgresAnalysisRepository) Save(ctx context.Context, analysis *domain.FileAnalysis) error {
    // PostgreSQL implementation
}
```

## Contributing

1. Follow the hexagonal architecture principles
2. Keep domain logic pure and free of external dependencies
3. Use dependency injection for better testability
4. Write tests for business logic
5. Follow Go best practices and idioms

## License

This project is part of the Nekibuki application suite. 