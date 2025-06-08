# Nekibuki Mobile - API Integration Setup

This guide explains how to connect the Nekibuki mobile application with the backend API.

## Backend Connection

### Environment Configuration

To connect the mobile app to your backend server, you need to set the API URL:

1. **For Development**: Create a `.env` file in the root directory:
```
EXPO_PUBLIC_API_URL=http://your-backend-server:8080
```

2. **For Local Development**: Use your local machine's IP address:
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:8080
```

3. **For Production**: Use your production backend URL:
```
EXPO_PUBLIC_API_URL=https://your-api-domain.com
```

### Backend Requirements

The mobile app expects the following API endpoints from your backend (based on swagger.yaml):

- `GET /api/health` - Health check
- `POST /api/recognition/upload` - Upload photo for recognition
- `GET /api/recognition/result/{sessionId}` - Get recognition result
- `GET /api/recognition/sessions` - Get recent sessions (optional)

## How It Works

1. **Photo Capture**: User takes a photo using the camera
2. **Upload**: Photo is uploaded to `/api/recognition/upload`
3. **Session Creation**: Backend returns a session ID
4. **Polling**: App polls `/api/recognition/result/{sessionId}` every 2 seconds
5. **Results**: When processing completes, results are displayed

## API Integration Features

### Photo Upload with Polling
```typescript
// Upload photo and start polling
const response = await apiService.uploadPhoto(photoUri);
const result = await apiService.pollRecognitionResult(response.session_id);
```

### Automatic Navigation
- After photo capture, automatically navigates to processing screen
- Polls for results in the background
- Shows results when processing completes

### Error Handling
- Network connectivity issues
- Backend server errors
- Processing timeouts
- Invalid responses

## TypeScript Types

All API types are defined in `services/api.ts` based on the swagger specification:

- `RecognitionResponse` - Upload response
- `RecognitionResult` - Final result with attraction info
- `AttractionInfo` - Detailed attraction information
- `LocationInfo` - Geographic location details

## Usage Example

```typescript
import { useQuery } from '@tanstack/react-query';
import apiService from '../services/api';

// In a component
const { data: result, isLoading } = useQuery({
  queryKey: ['recognition-result', sessionId],
  queryFn: () => apiService.getRecognitionResult(sessionId),
  refetchInterval: 2000, // Poll every 2 seconds
});
```

## Running the App

1. **Install dependencies**:
```bash
npm install
```

2. **Set environment variables** (see above)

3. **Start the development server**:
```bash
npx expo start
```

4. **Test with your backend**: Take a photo to test the full flow

## Development Notes

- The app uses React Query for API state management
- Polling automatically stops when processing completes
- All network requests include proper error handling
- TypeScript provides full type safety for API responses

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check that your backend is running and accessible
2. **CORS Errors**: Ensure your backend allows requests from the mobile app
3. **Upload Failures**: Verify the `/api/recognition/upload` endpoint accepts multipart/form-data
4. **Polling Timeouts**: Default timeout is 60 seconds (30 attempts × 2 seconds)

### Debug Mode

Enable console logging to see API requests:
```typescript
// In services/api.ts
console.log('API Request:', method, url);
console.log('Response:', response);
``` 