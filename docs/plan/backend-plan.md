# Nekibuki Backend Development Plan

## Overview
This plan focuses exclusively on the backend development for Nekibuki - a mobile application that provides instant, detailed explanations of tourist attractions through photo recognition. The backend will handle image processing, AI-powered content generation, user management, and serve APIs to mobile clients.

**Backend Tech Stack:**
- **Runtime**: Go (latest stable version)
- **Database**: PostgreSQL with connection pooling
- **Authentication**: Google OAuth + JWT
- **AI Service**: Google Gemini Flash LLM
- **Image Recognition**: Google Vision API
- **API**: RESTful with JSON responses
- **Deployment**: VPS with Coolify
- **Caching**: Redis (for session and content caching)
- **File Storage**: Local filesystem with future S3 compatibility

## 1. Project Foundation & Setup

### 1.1 Go Project Structure
```
backend/
├── cmd/
│   └── server/
│       └── main.go                 # Application entry point
├── internal/
│   ├── auth/                       # Authentication logic
│   ├── config/                     # Configuration management
│   ├── database/                   # Database connection and models
│   ├── handlers/                   # HTTP handlers
│   ├── middleware/                 # HTTP middleware
│   ├── services/                   # Business logic services
│   └── utils/                      # Utility functions
├── pkg/
│   ├── models/                     # Data models and structs
│   └── api/                        # API response structures
├── migrations/                     # Database migration files
├── scripts/                        # Deployment and utility scripts
├── docker/                         # Docker configurations
├── docs/                          # API documentation
├── go.mod
├── go.sum
├── .env.example
└── README.md
```

### 1.2 Dependencies and Modules
- [ ] Initialize Go modules with `go mod init`
- [ ] Core dependencies:
  ```go

  
  // Database
  github.com/lib/pq              // PostgreSQL driver
  github.com/jmoiron/sqlx        // SQL extensions
  github.com/golang-migrate/migrate // Database migrations
  
  // Authentication
  github.com/dgrijalva/jwt-go    // JWT handling
  golang.org/x/oauth2           // OAuth2 client
  
  // External APIs
  google.golang.org/api/vision/v1    // Google Vision API
  cloud.google.com/go/aiplatform     // Google Gemini API
  
  // Utilities
  github.com/joho/godotenv       // Environment variables
  github.com/sirupsen/logrus     // Structured logging
  github.com/go-redis/redis/v8   // Redis client
  github.com/google/uuid         // UUID generation
  ```

### 1.3 Environment Configuration
- [ ] Create configuration management system
  ```go
  type Config struct {
      Server struct {
          Port        string
          Environment string
          LogLevel    string
      }
      Database struct {
          Host     string
          Port     string
          Name     string
          User     string
          Password string
          SSLMode  string
      }
      Google struct {
          OAuth struct {
              ClientID     string
              ClientSecret string
              RedirectURL  string
          }
          VisionAPIKey string
          GeminiAPIKey string
      }
      JWT struct {
          SecretKey      string
          ExpirationTime time.Duration
      }
      Redis struct {
          Host     string
          Port     string
          Password string
          DB       int
      }
  }
  ```

- [ ] Environment-specific configurations (dev, staging, prod)
- [ ] Secure secrets management with environment variables
- [ ] Configuration validation on startup

## 2. Database Architecture & Setup

### 2.1 Database Schema Design
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_picture_url TEXT,
    language_preference VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Tourist attractions master data
CREATE TABLE attractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    location_coordinates POINT,
    country VARCHAR(100),
    city VARCHAR(100),
    category VARCHAR(100),
    official_website TEXT,
    wikipedia_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photo recognition history
CREATE TABLE recognition_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    original_image_path TEXT NOT NULL,
    processed_image_path TEXT,
    recognition_confidence DECIMAL(5,4),
    recognized_attraction_id UUID REFERENCES attractions(id),
    custom_attraction_name VARCHAR(500),
    generated_content TEXT,
    processing_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions for authentication
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics and metrics
CREATE TABLE api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content cache for frequently requested attractions
CREATE TABLE content_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_name VARCHAR(500) NOT NULL,
    content_hash VARCHAR(64) UNIQUE NOT NULL,
    generated_content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    cache_hits INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 Database Operations
- [ ] PostgreSQL connection setup with connection pooling
- [ ] Database migration system implementation
- [ ] CRUD operations for each table
- [ ] Database indexes for performance optimization:
  ```sql
  CREATE INDEX idx_users_google_id ON users(google_id);
  CREATE INDEX idx_recognition_sessions_user_id ON recognition_sessions(user_id);
  CREATE INDEX idx_recognition_sessions_created_at ON recognition_sessions(created_at);
  CREATE INDEX idx_attractions_location ON attractions USING GIST(location_coordinates);
  CREATE INDEX idx_content_cache_hash ON content_cache(content_hash);
  ```

### 2.3 Database Models (Go Structs)
```go
type User struct {
    ID                   string    `db:"id" json:"id"`
    GoogleID            string    `db:"google_id" json:"google_id"`
    Email               string    `db:"email" json:"email"`
    Name                string    `db:"name" json:"name"`
    ProfilePictureURL   *string   `db:"profile_picture_url" json:"profile_picture_url"`
    LanguagePreference  string    `db:"language_preference" json:"language_preference"`
    CreatedAt           time.Time `db:"created_at" json:"created_at"`
    UpdatedAt           time.Time `db:"updated_at" json:"updated_at"`
    LastLogin           *time.Time `db:"last_login" json:"last_login"`
}

type Attraction struct {
    ID                  string     `db:"id" json:"id"`
    Name                string     `db:"name" json:"name"`
    Description         *string    `db:"description" json:"description"`
    LocationCoordinates *string    `db:"location_coordinates" json:"location_coordinates"`
    Country             *string    `db:"country" json:"country"`
    City                *string    `db:"city" json:"city"`
    Category            *string    `db:"category" json:"category"`
    OfficialWebsite     *string    `db:"official_website" json:"official_website"`
    WikipediaURL        *string    `db:"wikipedia_url" json:"wikipedia_url"`
    CreatedAt           time.Time  `db:"created_at" json:"created_at"`
    UpdatedAt           time.Time  `db:"updated_at" json:"updated_at"`
}

type RecognitionSession struct {
    ID                      string    `db:"id" json:"id"`
    UserID                  string    `db:"user_id" json:"user_id"`
    OriginalImagePath       string    `db:"original_image_path" json:"original_image_path"`
    ProcessedImagePath      *string   `db:"processed_image_path" json:"processed_image_path"`
    RecognitionConfidence   *float64  `db:"recognition_confidence" json:"recognition_confidence"`
    RecognizedAttractionID  *string   `db:"recognized_attraction_id" json:"recognized_attraction_id"`
    CustomAttractionName    *string   `db:"custom_attraction_name" json:"custom_attraction_name"`
    GeneratedContent        *string   `db:"generated_content" json:"generated_content"`
    ProcessingDurationMs    *int      `db:"processing_duration_ms" json:"processing_duration_ms"`
    CreatedAt               time.Time `db:"created_at" json:"created_at"`
}
```

## 3. Authentication & Security

### 3.1 Google OAuth Implementation
- [ ] Google OAuth2 client configuration
- [ ] OAuth flow endpoints:
  ```go
  // OAuth endpoints
  GET  /auth/google           // Redirect to Google OAuth
  GET  /auth/google/callback  // Handle OAuth callback
  POST /auth/refresh          // Refresh JWT token
  POST /auth/logout           // Invalidate session
  ```

- [ ] User profile extraction from Google
- [ ] Account creation/login logic
- [ ] OAuth error handling and edge cases

### 3.2 JWT Token Management
- [ ] JWT token generation with user claims
- [ ] Token validation middleware
- [ ] Refresh token mechanism
- [ ] Token expiration handling
- [ ] Secure token storage recommendations for mobile clients

### 3.3 Security Middleware
- [ ] Authentication middleware for protected routes
- [ ] CORS configuration for mobile clients
- [ ] Rate limiting middleware:
  ```go
  // Rate limiting rules
  - /api/auth/*: 10 requests per minute per IP
  - /api/recognize: 20 requests per hour per user
  - /api/*: 100 requests per minute per user
  ```
- [ ] Request logging and monitoring
- [ ] Input validation and sanitization
- [ ] SQL injection prevention

## 4. External API Integration

### 4.1 Google Vision API Integration
- [ ] Vision API client setup and authentication
- [ ] Image analysis service:
  ```go
  type VisionService struct {
      client *vision.ImageAnnotatorClient
  }
  
  func (v *VisionService) AnalyzeImage(imageData []byte) (*VisionResult, error) {
      // Landmark detection
      // Object detection
      // Text extraction (OCR)
      // Safe search detection
  }
  ```

- [ ] Landmark and object detection
- [ ] Confidence scoring and filtering
- [ ] Error handling for API failures
- [ ] Response caching for cost optimization

### 4.2 Google Gemini Flash Integration
- [ ] Gemini API client setup
- [ ] Content generation service:
  ```go
  type ContentService struct {
      geminiClient *aiplatform.Client
  }
  
  func (c *ContentService) GenerateAttractionInfo(attractionName string, context string) (*GeneratedContent, error) {
      // Prompt engineering for consistent responses
      // Content formatting and structure
      // Language-specific generation
      // Quality validation
  }
  ```

- [ ] Prompt engineering for tourist attraction information
- [ ] Multi-language content generation
- [ ] Content quality validation
- [ ] Cost optimization through caching

### 4.3 Image Processing Pipeline
- [ ] Image upload validation (size, format, quality)
- [ ] Image optimization and compression
- [ ] Temporary storage management
- [ ] Processing queue for high-load scenarios
- [ ] Cleanup of processed images

## 5. Core API Endpoints

### 5.1 Authentication APIs
```go
// Authentication routes
router.Group("/api/auth").
    GET("/google", handlers.GoogleOAuthRedirect).
    GET("/google/callback", handlers.GoogleOAuthCallback).
    POST("/refresh", handlers.RefreshToken).
    POST("/logout", middleware.AuthRequired, handlers.Logout)
```

### 5.2 Photo Recognition APIs
```go
// Recognition routes
router.Group("/api/recognize", middleware.AuthRequired).
    POST("/upload", handlers.UploadAndRecognize).      // Main recognition endpoint
    GET("/history", handlers.GetRecognitionHistory).   // User's recognition history
    GET("/session/:id", handlers.GetRecognitionSession). // Specific session details
    DELETE("/session/:id", handlers.DeleteRecognitionSession)
```

### 5.3 User Management APIs
```go
// User routes
router.Group("/api/user", middleware.AuthRequired).
    GET("/profile", handlers.GetUserProfile).
    PUT("/profile", handlers.UpdateUserProfile).
    GET("/preferences", handlers.GetUserPreferences).
    PUT("/preferences", handlers.UpdateUserPreferences).
    DELETE("/account", handlers.DeleteUserAccount)
```

### 5.4 Content & Attraction APIs
```go
// Content routes
router.Group("/api/attractions").
    GET("/search", handlers.SearchAttractions).        // Search attractions
    GET("/:id", handlers.GetAttractionDetails).        // Get specific attraction
    GET("/popular", handlers.GetPopularAttractions).   // Popular attractions
    GET("/nearby", handlers.GetNearbyAttractions)      // Location-based search
```

### 5.5 Analytics & Monitoring APIs
```go
// Admin/monitoring routes (protected)
router.Group("/api/admin", middleware.AdminRequired).
    GET("/stats", handlers.GetSystemStats).
    GET("/usage", handlers.GetUsageAnalytics).
    GET("/health", handlers.HealthCheck)
```

## 6. Business Logic Services

### 6.1 Recognition Service
- [ ] Main photo recognition workflow:
  ```go
  func (r *RecognitionService) ProcessPhoto(userID string, imageData []byte) (*RecognitionResult, error) {
      // 1. Validate and process image
      // 2. Call Google Vision API for recognition
      // 3. Match results with attraction database
      // 4. Generate content using Gemini Flash
      // 5. Cache results for future use
      // 6. Store recognition session
      // 7. Return formatted response
  }
  ```

- [ ] Confidence threshold management
- [ ] Fallback handling for unrecognized images
- [ ] Content caching and retrieval
- [ ] Performance monitoring and optimization

### 6.2 Content Generation Service
- [ ] Prompt templates for different attraction types
- [ ] Content formatting and structure
- [ ] Multi-language support
- [ ] Content quality validation
- [ ] Caching strategies for generated content

### 6.3 User Service
- [ ] User registration and profile management
- [ ] Preference handling
- [ ] Recognition history management
- [ ] Privacy and data retention compliance

## 7. Caching Strategy

### 7.1 Redis Implementation
- [ ] Redis client setup and connection pooling
- [ ] Cache layers:
  ```go
  // Cache keys structure
  "user:profile:{userID}"              // User profile data
  "content:{contentHash}"              // Generated attraction content
  "recognition:{attractionName}"       // Recognition results
  "session:{sessionToken}"             // User session data
  ```

- [ ] Cache invalidation strategies
- [ ] TTL management for different data types
- [ ] Cache warming for popular attractions

### 7.2 Performance Optimization
- [ ] Database query optimization
- [ ] API response compression
- [ ] Image processing optimization
- [ ] Concurrent processing for multiple requests

## 8. Monitoring & Logging

### 8.1 Structured Logging
- [ ] Log levels and formatting
- [ ] Request/response logging
- [ ] Error tracking and alerting
- [ ] Performance metrics logging

### 8.2 Health Monitoring
- [ ] Health check endpoints
- [ ] Database connection monitoring
- [ ] External API status monitoring
- [ ] Resource usage tracking

### 8.3 Analytics Collection
- [ ] API usage analytics
- [ ] Recognition success rates
- [ ] Popular attraction tracking
- [ ] User engagement metrics

## 9. Testing Strategy

### 9.1 Unit Testing
- [ ] Service layer testing
- [ ] Database operation testing
- [ ] Utility function testing
- [ ] Mock external API dependencies

### 9.2 Integration Testing
- [ ] API endpoint testing
- [ ] Database integration testing
- [ ] External service integration testing
- [ ] End-to-end workflow testing

### 9.3 Performance Testing
- [ ] Load testing for high-traffic scenarios
- [ ] Database performance testing
- [ ] External API rate limit testing
- [ ] Memory and resource usage testing

## 10. Deployment & DevOps

### 10.1 VPS Setup
- [ ] Server requirements and specifications
- [ ] Security hardening (firewall, SSH, etc.)
- [ ] SSL certificate setup
- [ ] Domain configuration

### 10.2 Coolify Configuration
- [ ] Coolify installation and setup
- [ ] Go application deployment configuration
- [ ] Environment variables management
- [ ] Database deployment and management
- [ ] Redis deployment and configuration

### 10.3 Production Configuration
- [ ] Production environment variables
- [ ] Database backup and restoration
- [ ] Log rotation and management
- [ ] Monitoring and alerting setup

### 10.4 CI/CD Pipeline
- [ ] Automated testing pipeline
- [ ] Build and deployment automation
- [ ] Database migration execution
- [ ] Rollback procedures

## 11. Security & Compliance

### 11.1 Data Protection
- [ ] GDPR compliance implementation
- [ ] User data encryption at rest
- [ ] Secure API communication (HTTPS)
- [ ] Input validation and sanitization

### 11.2 API Security
- [ ] Rate limiting and DDoS protection
- [ ] API key management
- [ ] Request signature validation
- [ ] SQL injection prevention

### 11.3 Image Security
- [ ] Image validation and sanitization
- [ ] Malware scanning for uploaded files
- [ ] Safe image processing
- [ ] Secure file storage

## 12. Performance & Scalability

### 12.1 Database Optimization
- [ ] Query optimization and indexing
- [ ] Connection pooling configuration
- [ ] Database partitioning strategies
- [ ] Read replica setup (future enhancement)

### 12.2 API Performance
- [ ] Response compression
- [ ] Caching strategies
- [ ] Async processing for heavy operations
- [ ] Load balancing preparation

### 12.3 Resource Management
- [ ] Memory usage optimization
- [ ] Goroutine management
- [ ] File system cleanup
- [ ] External API quota management

---

## Development Timeline (Backend Only)

### Phase 1: Foundation (3-4 weeks)
- [ ] Project setup and Go structure
- [ ] Database schema and migrations
- [ ] Basic web server and middleware
- [ ] Configuration management

### Phase 2: Authentication & Core APIs (3-4 weeks)
- [ ] Google OAuth implementation
- [ ] JWT token management
- [ ] User management APIs
- [ ] Basic security middleware

### Phase 3: External Integrations (4-5 weeks)
- [ ] Google Vision API integration
- [ ] Google Gemini Flash integration
- [ ] Image processing pipeline
- [ ] Content generation service

### Phase 4: Core Features (3-4 weeks)
- [ ] Photo recognition API
- [ ] Recognition history management
- [ ] Content caching implementation
- [ ] Analytics and monitoring

### Phase 5: Testing & Optimization (2-3 weeks)
- [ ] Unit and integration testing
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Load testing

### Phase 6: Deployment (2-3 weeks)
- [ ] VPS setup and configuration
- [ ] Coolify deployment
- [ ] Production monitoring
- [ ] Documentation completion

**Total Backend Development Time: 17-23 weeks**

## Getting Started

### Immediate Next Steps:
1. **Initialize Go project structure** in the `backend/` directory
2. **Set up PostgreSQL** development environment
3. **Implement basic web server** with Http standard library
4. **Create database migrations** for core tables
5. **Set up Google OAuth** client credentials
6. **Implement basic authentication** flow

### Development Order:
1. Start with project structure and database setup
2. Implement authentication and user management
3. Add external API integrations (Vision + Gemini)
4. Build core recognition and content generation features
5. Add caching, monitoring, and optimization
6. Prepare for deployment and production

This backend plan provides a comprehensive foundation that can support the mobile application independently, with clear APIs and robust architecture for scalability and maintenance.