interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  progress: number;
}

class ApiService {
  private baseURL: string;
  
  constructor() {
    // TODO: Replace with your actual backend URL
    // For mobile development, use your computer's IP address instead of localhost
    // You can find your IP with: ifconfig (Mac/Linux) or ipconfig (Windows)
    this.baseURL = __DEV__ 
      ? 'http://192.168.1.14:8080' // Use your development machine's IP
      : 'http://localhost:8080';
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('Post error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Helper function to detect MIME type from filename
  private detectMimeType(filename: string): string {
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.endsWith('.jpg') || lowerFilename.endsWith('.jpeg')) {
      return 'image/jpeg';
    } else if (lowerFilename.endsWith('.png')) {
      return 'image/png';
    } else if (lowerFilename.endsWith('.gif')) {
      return 'image/gif';
    } else if (lowerFilename.endsWith('.bmp')) {
      return 'image/bmp';
    } else if (lowerFilename.endsWith('.webp')) {
      return 'image/webp';
    } else if (lowerFilename.endsWith('.pdf')) {
      return 'application/pdf';
    } else if (lowerFilename.endsWith('.txt')) {
      return 'text/plain';
    } else if (lowerFilename.endsWith('.doc')) {
      return 'application/msword';
    } else if (lowerFilename.endsWith('.docx')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (lowerFilename.endsWith('.xls')) {
      return 'application/vnd.ms-excel';
    } else if (lowerFilename.endsWith('.xlsx')) {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (lowerFilename.endsWith('.ppt')) {
      return 'application/vnd.ms-powerpoint';
    } else if (lowerFilename.endsWith('.pptx')) {
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else {
      return 'application/octet-stream';
    }
  }

  async uploadFile<T>(
    endpoint: string, 
    fileUri: string, 
    fileName: string,
    onProgress?: (progress: UploadProgress) => void,
    prompt?: string
  ): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      
      // Use 'file' key to match backend expectation
      formData.append('file', {
        uri: fileUri,
        type: this.detectMimeType(fileName),
        name: fileName,
      } as any);

      // Add optional prompt if provided
      if (prompt) {
        formData.append('prompt', prompt);
      }

      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = (event.loaded / event.total) * 100;
            onProgress({
              loaded: event.loaded,
              total: event.total,
              progress: Math.round(progress),
            });
          }
        });

        xhr.addEventListener('load', () => {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              // Parse the analysis JSON string if it exists
              if (response.data && response.data.data) {
                try {
                  response.data.data = JSON.parse(response.data.data);
                } catch (parseError) {
                  console.error('Failed to parse analysis JSON:', parseError);
                  // Keep the original string if parsing fails
                }
              }
              resolve(response); // Return the backend response directly
            } else {
              resolve({
                success: false,
                error: response.message || response.error || `Upload failed with status ${xhr.status}`,
              });
            }
          } catch (error) {
            resolve({
              success: false,
              error: 'Failed to parse server response',
            });
          }
        });

        xhr.addEventListener('error', () => {
          resolve({
            success: false,
            error: 'Upload failed due to network error',
          });
        });

        xhr.addEventListener('timeout', () => {
          resolve({
            success: false,
            error: 'Upload timed out',
          });
        });

        xhr.open('POST', `${this.baseURL}${endpoint}`);
        xhr.timeout = 30000; // 30 seconds timeout
        xhr.send(formData);
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload preparation failed',
      };
    }
  }
}

export default new ApiService();
export type { ApiResponse, UploadProgress }; 