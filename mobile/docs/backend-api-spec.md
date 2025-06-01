# Backend API Specification for Nekibuki

This document outlines the API endpoints that the Nekibuki mobile app expects from the backend service.

## Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-production-api.com/api`

## Endpoints

### 1. Photo Upload
**POST** `/photos/upload`

Upload a photo for landmark analysis.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `image` (file) - JPEG image file

**Response:**
```json
{
  "photoId": "string",
  "uploadUrl": "string",
  "processingStatus": "pending|processing|completed|failed",
  "analysis": {
    "id": "string",
    "name": "string",
    "confidence": number,
    "location": {
      "latitude": number,
      "longitude": number,
      "address": "string"
    },
    "description": "string",
    "facts": ["string"],
    "historicalInfo": {
      "period": "string",
      "architect": "string",
      "significance": "string"
    },
    "quickFacts": {
      "key": "value"
    }
  }
}
```

### 2. Analysis Status
**GET** `/photos/{photoId}/analysis`

Get the analysis status and results for a photo.

**Response:**
```json
{
  "status": "pending|processing|completed|failed",
  "progress": number,
  "analysis": {
    // Same structure as above
  },
  "error": "string"
}
```

### 3. Photo History
**GET** `/photos/history`

Get user's photo upload history.

**Response:**
```json
[
  {
    "photoId": "string",
    "uploadUrl": "string",
    "processingStatus": "string",
    "analysis": {
      // Same structure as above
    }
  }
]
```

### 4. Delete Photo
**POST** `/photos/{photoId}/delete`

Delete a photo and its analysis.

**Response:**
```json
{
  "success": boolean
}
```

### 5. Landmark Info
**GET** `/landmarks/{landmarkId}`

Get detailed information about a specific landmark.

**Response:**
```json
{
  "id": "string",
  "name": "string",
  "confidence": number,
  "location": {
    "latitude": number,
    "longitude": number,
    "address": "string"
  },
  "description": "string",
  "facts": ["string"],
  "historicalInfo": {
    "period": "string",
    "architect": "string",
    "significance": "string"
  },
  "quickFacts": {
    "key": "value"
  }
}
```

### 6. Search Landmarks
**GET** `/landmarks/search?q={query}`

Search for landmarks by name or location.

**Response:**
```json
[
  {
    // Same structure as landmark info
  }
]
```

## Error Responses

All endpoints should return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "message": "User-friendly error message"
}
```

## Authentication

Currently, the app doesn't implement authentication, but you can add:
- JWT tokens in Authorization header
- API keys
- OAuth integration

## Image Processing Flow

1. **Upload**: Client uploads image to `/photos/upload`
2. **Processing**: Backend analyzes image (AI/ML service)
3. **Status Updates**: Client can poll `/photos/{photoId}/analysis` for progress
4. **Results**: Analysis results returned when complete

## Tech Stack Suggestions

### Backend Framework Options:
- **Node.js**: Express.js, Fastify
- **Python**: FastAPI, Django REST
- **Go**: Gin, Echo
- **Java**: Spring Boot

### AI/ML Services:
- **Google Vision API**: Landmark detection
- **AWS Rekognition**: Custom labels
- **Azure Computer Vision**: Landmark recognition
- **Custom ML Models**: TensorFlow, PyTorch

### Database:
- **MongoDB**: Document-based for flexible landmark data
- **PostgreSQL**: Relational with JSON support
- **Firebase Firestore**: Real-time updates

### File Storage:
- **AWS S3**: Scalable image storage
- **Google Cloud Storage**: Global CDN
- **Azure Blob Storage**: Integration with other Azure services

## Development Notes

- The app currently uses a mock service that simulates the API
- Replace `PhotoService.mockPhotoAnalysis()` with `PhotoService.uploadPhoto()` when backend is ready
- Ensure CORS is configured for mobile app domains
- Implement rate limiting for photo uploads
- Add image validation (size, format, content)
- Consider image compression before upload

## Example Backend Implementation

### Node.js + Express Example:

```javascript
const express = require('express');
const multer = require('multer');
const app = express();

const upload = multer({ dest: 'uploads/' });

app.post('/api/photos/upload', upload.single('image'), async (req, res) => {
  try {
    const { file } = req;
    
    // Process image with AI service
    const analysis = await analyzeLandmark(file.path);
    
    res.json({
      photoId: generateId(),
      uploadUrl: file.path,
      processingStatus: 'completed',
      analysis: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
``` 