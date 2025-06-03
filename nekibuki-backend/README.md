# Nekibuki Backend MVP

A Go backend service for tourist attraction recognition using Google Gemini AI. Upload photos of landmarks and get detailed information about tourist attractions, historical sites, and points of interest.

## Features

- **Photo Upload & Analysis**: Upload photos for tourist attraction recognition
- **Gemini AI Integration**: Uses Google Gemini 2.0 Flash for multimodal image analysis
- **Async Processing**: Non-blocking photo processing with session-based result retrieval
- **PostgreSQL Storage**: Type-safe database operations with sqlc
- **RESTful API**: Clean HTTP endpoints with proper error handling
- **Image Storage**: Local file storage with hash-based deduplication
- **Rate Limiting**: Built-in rate limiting and CORS support
- **Structured Logging**: Uses Go's slog for structured, production-ready logging

## Architecture

- **Language**: Go 1.22+
- **Database**: PostgreSQL with sqlc for type-safe queries
- **AI Service**: Google Gemini 2.0 Flash (multimodal)
- **Storage**: Local filesystem (configurable)
- **HTTP Framework**: Standard library with custom middleware
- **Documentation**: Swagger/OpenAPI integration

## Quick Start

### Prerequisites

- Go 1.22 or later
- PostgreSQL 14+
- Google Gemini API key

### 1. Clone and Setup

```bash
git clone <your-repo>
cd nekibuki-backend
```

### 2. Environment Configuration

Create `.env` file:

```bash
# Server Configuration
SERVER_HOST=localhost
SERVER_PORT=8080

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=nekibuki
DB_SSL_MODE=disable

# Gemini AI Configuration (REQUIRED)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp

# Storage Configuration
STORAGE_LOCAL_PATH=./uploads
```

### 3. Database Setup

Start PostgreSQL and create the database:

```bash
# Using Docker (recommended)
docker run --name nekibuki-postgres -e POSTGRES_PASSWORD=your_password -e POSTGRES_DB=nekibuki -p 5432:5432 -d postgres:15

# Or use your local PostgreSQL installation
createdb nekibuki
```

Run migrations:

```bash
# Install golang-migrate (if not installed)
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Run migrations
migrate -path migrations -database "postgres://postgres:your_password@localhost:5432/nekibuki?sslmode=disable" up
```

### 4. Install Dependencies

```bash
go mod download
```

### 5. Generate Database Code

```bash
# Install sqlc (if not installed)
go install github.com/kyleconroy/sqlc/cmd/sqlc@latest

# Generate type-safe database code
sqlc generate
```

### 6. Run the Server

```bash
go run cmd/api/main.go
```

The server will start on `http://localhost:8080`

## API Endpoints

### Health Check
```
GET /api/health
```

### Photo Recognition
```
POST /api/recognition/upload
Content-Type: multipart/form-data
Body: photo (file)

Response:
{
  "session_id": "uuid",
  "status": "processing",
  "message": "Photo uploaded successfully. Processing in progress."
}
```

### Get Recognition Result
```
GET /api/recognition/result/{session_id}

Response (when completed):
{
  "session_id": "uuid",
  "status": "completed",
  "attraction_info": {
    "name": "Eiffel Tower",
    "description": "Famous iron lattice tower in Paris, France",
    "historical_info": "Built from 1887 to 1889...",
    "significance": "Global cultural icon of France...",
    "interesting_facts": [
      "324 meters tall",
      "Named after engineer Gustave Eiffel"
    ],
    "location": {
      "country": "France",
      "city": "Paris",
      "region": "Île-de-France"
    },
    "confidence": 0.95
  },
  "processing_time_ms": 2500
}
```

### Debug: Recent Sessions
```
GET /api/recognition/sessions?limit=10
```

## API Documentation

Access Swagger UI at: `http://localhost:8080/swagger/`

## Usage Example

```bash
# Upload a photo
curl -X POST \
  http://localhost:8080/api/recognition/upload \
  -H 'Content-Type: multipart/form-data' \
  -F 'photo=@/path/to/landmark-photo.jpg'

# Response: {"session_id":"123e4567-e89b-12d3-a456-426614174000","status":"processing",...}

# Check result (wait a few seconds for processing)
curl http://localhost:8080/api/recognition/result/123e4567-e89b-12d3-a456-426614174000
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | - | ✅ |
| `DB_PASSWORD` | PostgreSQL password | - | ✅ |
| `SERVER_HOST` | Server host | localhost | |
| `SERVER_PORT` | Server port | 8080 | |
| `DB_HOST` | Database host | localhost | |
| `DB_PORT` | Database port | 5432 | |
| `DB_USER` | Database user | postgres | |
| `DB_NAME` | Database name | nekibuki | |
| `STORAGE_LOCAL_PATH` | Local storage path | ./uploads | |

### Getting Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Add it to your `.env` file as `GEMINI_API_KEY`

## Development

### Project Structure

```
├── cmd/api/           # Application entry point
├── internal/
│   ├── config/        # Configuration management
│   ├── database/      # Database models & queries (generated)
│   ├── handlers/      # HTTP handlers
│   ├── middleware/    # HTTP middleware
│   ├── services/
│   │   ├── gemini/    # Gemini AI integration
│   │   └── recognition/ # Main recognition service
│   └── storage/       # Image storage
├── migrations/        # Database migrations
├── queries/          # SQL queries for sqlc
├── scripts/          # Setup scripts
└── docs/             # API documentation
```

### Adding New Features

1. Add SQL queries to `queries/`
2. Run `sqlc generate` to update database code
3. Implement business logic in `internal/services/`
4. Add HTTP handlers in `internal/handlers/`
5. Register routes in `cmd/api/main.go`

### Database Migrations

Create new migration:
```bash
migrate create -ext sql -dir migrations -seq migration_name
```

Apply migrations:
```bash
migrate -path migrations -database $DATABASE_URL up
```

## Testing

```bash
# Run tests
go test ./...

# Run with coverage
go test -cover ./...
```

## Production Deployment

For production deployment:

1. Set `DEBUG=false`
2. Use proper PostgreSQL connection with SSL
3. Configure proper storage (consider S3 for scale)
4. Set up monitoring and logging
5. Use environment-specific configuration
6. Set up database connection pooling
7. Configure proper rate limiting

## Troubleshooting

### Common Issues

1. **Database connection failed**: Check PostgreSQL is running and credentials are correct
2. **Gemini API errors**: Verify API key is valid and has proper permissions
3. **File upload fails**: Check storage directory permissions and disk space
4. **Processing timeout**: Increase timeout in configuration or check Gemini API status

### Logs

The server uses structured logging with Go's `slog` package. Log format and level can be configured:

- **Development**: Human-readable text format with source information
- **Production**: JSON format for log aggregation systems
- **Log Levels**: debug, info, warn, error

Set `LOG_LEVEL=debug` for detailed logging and `DEBUG=true` for development format.

**Example log output (JSON format):**
```json
{
  "time": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "msg": "HTTP request",
  "method": "POST",
  "path": "/api/recognition/upload",
  "status": 200,
  "duration_ms": 150,
  "remote_addr": "127.0.0.1:54321"
}
```

## Support

For issues and questions:
1. Check the logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure PostgreSQL and dependencies are running
4. Check Gemini API key permissions and quotas

## License

MIT License - see LICENSE file for details.
