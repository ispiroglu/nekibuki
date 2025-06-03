import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors, Typography, Spacing, Layout, Shadows } from '../constants/theme';
import PhotoService, { RecognitionResult, AttractionInfo } from '../services/photoService';
import { UploadProgress } from '../services/api';
import { RootStackParamList } from '../types';

type CameraScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface CameraScreenProps {
  onImageCaptured?: (imageUri: string) => void;
  onAnalysisComplete?: (result: RecognitionResult) => void;
  isFocused?: boolean;
}

const { width, height } = Dimensions.get('window');

const CameraScreen: React.FC<CameraScreenProps> = ({ 
  onImageCaptured, 
  onAnalysisComplete, 
  isFocused = true 
}) => {
  const navigation = useNavigation<CameraScreenNavigationProp>();
  const [isCapturing, setIsCapturing] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [shouldShowCamera, setShouldShowCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Handle camera lifecycle based on focus state
  useEffect(() => {
    if (isFocused && permission?.granted) {
      setShouldShowCamera(true);
      setIsCameraReady(false);
    } else {
      setShouldShowCamera(false);
      setIsCameraReady(false);
      if (isCapturing) {
        setIsCapturing(false);
      }
    }
  }, [isFocused, permission?.granted, isCapturing]);

  // Ultra-fast error feedback
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!permission) {
        console.log('Camera permission check taking longer than expected');
        setCameraError('Camera initialization is taking longer than expected. Please restart the app.');
      }
    }, 1500); // Even faster feedback - 1.5 seconds
    
    return () => clearTimeout(timeout);
  }, [permission]);

  const retryCameraSetup = () => {
    setCameraError(null);
    setCameraKey(prev => prev + 1);
    requestPermission();
  };

  // Camera ready handlers
  const handleCameraReady = () => {
    console.log('Camera is ready for capture');
    setIsCameraReady(true);
  };

  const handleCameraMountError = (error: any) => {
    console.error('Camera mount error:', error);
    setIsCameraReady(false);
    setCameraError('Camera failed to initialize. Please restart the app.');
  };

  if (cameraError) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.headerTitle}>Camera Setup Issue</Text>
        <Text style={styles.subtitle}>{cameraError}</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={retryCameraSetup}>
          <Text style={styles.permissionButtonText}>Retry Camera Setup</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.headerTitle}>Setting up camera...</Text>
        <Text style={styles.subtitle}>Please wait a moment</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.headerTitle}>Camera Permission Required</Text>
        <Text style={styles.subtitle}>We need camera access to take photos</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async (): Promise<void> => {
    if (!cameraRef.current || isCapturing || !isCameraReady) {
      console.log('Camera not ready:', { 
        hasCameraRef: !!cameraRef.current, 
        isCapturing,
        isCameraReady,
        isFocused,
        shouldShowCamera,
        permission: permission?.granted 
      });
      
      if (!isCameraReady) {
        Alert.alert('Camera Not Ready', 'Please wait for the camera to finish loading before taking a picture.');
      }
      return;
    }

    try {
      setIsCapturing(true);
      console.log('Starting photo capture...');
      
      // Try with improved camera settings for better compatibility
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7, // Slightly lower quality for better compatibility
        base64: false,
        exif: false,
        skipProcessing: false, // Ensure proper processing
      });

      console.log('Photo capture result:', { 
        hasPhoto: !!photo, 
        hasUri: !!photo?.uri,
        uri: photo?.uri 
      });

      if (photo?.uri) {
        console.log('Photo captured successfully:', photo.uri);
        onImageCaptured?.(photo.uri);

        // Navigate to loading screen for analysis
        navigation.navigate('Loading', { imageUri: photo.uri });
      } else {
        console.error('Photo captured but no URI received');
        Alert.alert('Error', 'Photo was taken but no image file was created. Please try again.');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      
      // More detailed error handling
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : 'Unknown';
      
      console.error('Detailed error info:', {
        name: errorName,
        message: errorMessage,
        error: error,
        cameraState: {
          hasRef: !!cameraRef.current,
          isFocused,
          shouldShowCamera,
          permission: permission?.granted,
          facing,
          isCameraReady
        }
      });
      
      // Handle specific "Failed to capture image" error
      if (errorMessage.includes('Failed to capture image')) {
        Alert.alert(
          'Camera Error', 
          'Camera capture failed. This can happen when the camera is still initializing.\n\nTry waiting a moment and try again.',
          [
            { 
              text: 'Retry', 
              onPress: () => {
                // Reset camera and try again
                setIsCameraReady(false);
                setCameraKey(prev => prev + 1);
                setTimeout(() => takePicture(), 1000);
              }
            },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert(
          'Camera Error', 
          `Failed to take picture: ${errorMessage}\n\nTry closing and reopening the app.`,
          [
            { text: 'Retry', onPress: () => takePicture() },
            { text: 'OK' }
          ]
        );
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const getButtonContent = () => {
    if (isCapturing) {
      return <Text style={styles.statusText}>📸</Text>;
    }
    if (!isCameraReady) {
      return <View style={[styles.shutterButtonInner, { backgroundColor: '#E5E7EB' }]} />;
    }
    return <View style={styles.shutterButtonInner} />;
  };

  const getStatusText = () => {
    if (isCapturing) return 'Capturing...';
    if (!isCameraReady) return 'Camera initializing...';
    return '';
  };

  const isProcessing = isCapturing;

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <Text style={styles.headerTitle}>Nekibuki</Text>
      </SafeAreaView>

      {/* Main Viewfinder Container - Figma Design */}
      <View style={styles.mainContainer}>
        <View style={styles.viewfinderContainer}>
          <View style={styles.viewfinderFrame}>
            {shouldShowCamera && isFocused && permission?.granted ? (
              <CameraView
                key={cameraKey}
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
                mode="picture"
                onCameraReady={handleCameraReady}
                onMountError={handleCameraMountError}
                responsiveOrientationWhenOrientationLocked={true}
              />
            ) : (
              <View style={styles.cameraPlaceholder}>
                <Ionicons name="camera" size={64} color={Colors.textTertiary} />
                <Text style={styles.placeholderText}>
                  {!permission?.granted ? 'Camera permission required' : 'Camera loading...'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Three Button Controls - Figma Design */}
        <View style={styles.controlsContainer}>
          {/* Center Button - Shutter */}
          <TouchableOpacity
            style={[
              styles.shutterButton,
              (isProcessing || !shouldShowCamera || !isFocused || !permission?.granted || !isCameraReady) && styles.shutterButtonDisabled
            ]}
            onPress={takePicture}
            disabled={isProcessing || !shouldShowCamera || !isFocused || !permission?.granted || !isCameraReady}
            activeOpacity={0.7}
          >
            {getButtonContent()}
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Text */}
      {getStatusText() && (
        <View style={styles.statusOverlay}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7FA', // Figma background color
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 18,
    fontWeight: '700',
    color: '#1C0D14',
    textAlign: 'center',
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'space-between', // Distribute space properly
    paddingHorizontal: 16, // Figma 16px padding
    paddingBottom: 20, // Ensure space for controls
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400, // Prevent collapse
  },
  viewfinderFrame: {
    width: width - 32, // Full width minus 16px padding on each side
    height: Math.min(626, height * 0.7), // Figma 626px height, but responsive
    borderRadius: 12, // Figma 12px border radius
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...Shadows.medium,
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: '#F5F5F5',
  },
  placeholderText: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20, // Vertical padding for breathing room
    minHeight: 120, // Minimum height to prevent collapse
  },
  // Center shutter button - 101x101px from Figma
  shutterButton: {
    width: 101,
    height: 101,
    borderRadius: 50.5,
    backgroundColor: '#964F75', // Figma button color
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  shutterButtonInner: {
    width: 81,
    height: 81,
    borderRadius: 40.5,
    backgroundColor: '#FFFFFF',
  },
  shutterButtonDisabled: {
    opacity: 0.7,
  },
  statusOverlay: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '500',
    color: '#1C0D14',
    textAlign: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '500',
    color: '#1C0D14',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  permissionButton: {
    backgroundColor: '#964F75',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  permissionButtonText: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default CameraScreen; 