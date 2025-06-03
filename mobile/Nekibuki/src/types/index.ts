// Import the correct types from photoService
import type { RecognitionResult, AttractionInfo } from '../services/photoService';

// Photo recognition types
export interface LegacyRecognitionResult {
  id: string;
  attraction_name: string;
  description: string;
  historical_facts: string;
  interesting_details: string;
  confidence: number;
  image_url?: string;
  timestamp: string;
}

// Re-export the types for convenience
export type { RecognitionResult, AttractionInfo };

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
}

// Navigation types
export type RootStackParamList = {
  Main: undefined;
  Loading: { imageUri: string };
  Result: { result: RecognitionResult; imageUri?: string };
};

export type MainTabParamList = {
  Camera: undefined;
  History: undefined;
  Profile: undefined;
};

// Component prop types
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: any;
}

export interface CameraComponentProps {
  onImageSelected: (image: any) => void;
}

// Image picker types
export interface ImagePickerResponse {
  uri: string;
  type: string;
  name: string;
  size: number;
} 