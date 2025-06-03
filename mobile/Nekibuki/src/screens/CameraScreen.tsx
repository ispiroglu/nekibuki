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
  const cameraRef = useRef<CameraView>(null);

  // Handle camera lifecycle based on focus state
  useEffect(() => {
    if (isFocused && permission?.granted) {
      // Add a small delay to ensure smooth transitions
      const timer = setTimeout(() => {
        setShouldShowCamera(true);
        setCameraKey(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setShouldShowCamera(false);
      // Reset any ongoing capture state when camera becomes unfocused
      if (isCapturing) {
        setIsCapturing(false);
      }
    }
  }, [isFocused, permission?.granted, isCapturing]);

  // Force camera refresh when component mounts to fix restart bug
  useEffect(() => {
    if (isFocused && permission?.granted) {
      setCameraKey(prev => prev + 1);
    }
  }, []);

  // Add timeout for permission check
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!permission) {
        console.log('Camera permission check taking longer than expected');
        setCameraError('Camera initialization is taking longer than expected. Please restart the app.');
      }
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(timeout);
  }, [permission]);

  const retryCameraSetup = () => {
    setCameraError(null);
    setCameraKey(prev => prev + 1);
    requestPermission();
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
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false,
      });

      if (photo?.uri) {
        console.log('Photo captured:', photo.uri);
        onImageCaptured?.(photo.uri);

        // Navigate to loading screen for analysis
        navigation.navigate('Loading', { imageUri: photo.uri });
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const getButtonContent = () => {
    if (isCapturing) {
      return <Text style={styles.statusText}>📸</Text>;
    }
    return <View style={styles.shutterButtonInner} />;
  };

  const getStatusText = () => {
    if (isCapturing) return 'Capturing...';
    return '';
  };

  const isProcessing = isCapturing;

  return (
    <View style={styles.container}>
      {/* Viewfinder Container */}
      <View style={styles.viewfinderContainer}>
        <View style={styles.viewfinderFrame}>
          {shouldShowCamera && isFocused ? (
            <CameraView
              key={cameraKey}
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              mode="picture"
            />
          ) : (
            <View style={styles.cameraPlaceholder}>
              <Ionicons name="camera" size={64} color={Colors.textTertiary} />
              <Text style={styles.placeholderText}>
                {!permission?.granted ? 'Camera permission required' : 'Camera loading...'}
              </Text>
            </View>
          )}
          
          {/* Shutter Button Inside Viewfinder */}
          <View style={styles.shutterOverlay}>
            <TouchableOpacity
              style={[
                styles.shutterButton,
                (isProcessing || !shouldShowCamera || !isFocused) && styles.shutterButtonDisabled
              ]}
              onPress={takePicture}
              disabled={isProcessing || !shouldShowCamera || !isFocused}
              activeOpacity={0.7}
            >
              {getButtonContent()}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Top Title Overlay */}
      <SafeAreaView style={styles.titleOverlay}>
        <Text style={styles.headerTitle}>Nekibuki</Text>
      </SafeAreaView>

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
    backgroundColor: Colors.background,
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingTop: 100,
    paddingBottom: Spacing.sm,
  },
  viewfinderFrame: {
    width: '95%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    ...Shadows.medium,
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  shutterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30,
  },
  shutterButton: {
    width: 101,
    height: 101,
    borderRadius: 50.5,
    backgroundColor: '#964F75',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterButtonDisabled: {
    opacity: 0.7,
  },
  shutterButtonInner: {
    width: 81,
    height: 81,
    borderRadius: 40.5,
    backgroundColor: '#FFFFFF',
  },
  titleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 18,
    fontWeight: '700',
    color: '#1C0D14',
    textAlign: 'center',
  },
  statusOverlay: {
    position: 'absolute',
    bottom: 140,
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
  shutterButtonText: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  placeholderText: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});

export default CameraScreen; 