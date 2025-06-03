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
    // Updated to use your machine's IP address instead of localhost
    // This allows mobile devices/simulators to connect to your development backend
    this.baseURL = __DEV__ 
      ? 'http://192.168.1.14:8080' // Your development machine's IP
      : 'http://localhost:8080'; // Update this for production
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
        console.log(response);
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

  /**
   * Upload file using standard fetch POST method with multipart/form-data
   */
  async uploadFileWithPost<T>(
    endpoint: string,
    fileUri: string,
    fileName: string,
    fieldName: string = 'file',
    additionalFields?: { [key: string]: string }
  ): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      
      // Add the file to form data
      formData.append(fieldName, {
        uri: fileUri,
        type: this.detectMimeType(fileName),
        name: fileName,
      } as any);

      // Add any additional fields
      if (additionalFields) {
        Object.entries(additionalFields).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      console.log(`curl -X POST \\
        -F "${fieldName}=@${fileUri};filename=${fileName};type=${this.detectMimeType(fileName)}" \\
        ${this.baseURL}${endpoint}`);
        
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let React Native set it automatically with boundary
      });

      

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload file with progress tracking using XMLHttpRequest when progress is needed
   */
  async uploadFileWithProgress<T>(
    endpoint: string,
    fileUri: string,
    fileName: string,
    fieldName: string = 'file',
    onProgress?: (progress: UploadProgress) => void,
    additionalFields?: { [key: string]: string }
  ): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      
      // Add the file to form data
      formData.append(fieldName, {
        uri: fileUri,
        type: this.detectMimeType(fileName),
        name: fileName,
      } as any);

      // Add any additional fields
      if (additionalFields) {
        Object.entries(additionalFields).forEach(([key, value]) => {
          formData.append(key, value);
        });
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
              resolve({
                success: true,
                data: response,
              });
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
    prompt?: string,
    fieldName: string = 'file'
  ): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      
      // Use the specified field name (defaults to 'file', but can be 'photo' for recognition endpoint)
      formData.append(fieldName, {
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