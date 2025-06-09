import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Dimensions } from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions, Camera as ExpoCamera } from 'expo-camera';
import { useState, useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Zap, ZapOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence, 
  withTiming 
} from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';
import apiService from '../services/api';
import theme from '../constants/theme';

export default function CameraPage() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  
  // Cleanup old photos on component mount
  useEffect(() => {
    cleanupOldPhotos();
  }, []);

  const cleanupOldPhotos = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);
      const photoFiles = files.filter(file => file.startsWith('nekibuki_photo_'));
      
      // Keep only the last 10 photos, delete the rest
      if (photoFiles.length > 10) {
        photoFiles.sort((a, b) => {
          const timestampA = parseInt(a.split('_')[2].split('.')[0]);
          const timestampB = parseInt(b.split('_')[2].split('.')[0]);
          return timestampA - timestampB; // Oldest first
        });
        
        const filesToDelete = photoFiles.slice(0, photoFiles.length - 10);
        for (const file of filesToDelete) {
          try {
            await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${file}`);
            console.log('Deleted old photo:', file);
          } catch (error) {
            console.log('Failed to delete old photo:', file, error);
          }
        }
      }
    } catch (error) {
      console.log('Error during photo cleanup:', error);
    }
  };
  
  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 375;
  const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
  
  // Polaroid dimensions - 2 stage layout
  const viewfinderWidth = screenWidth * 0.95; // Almost fullscreen width
  const viewfinderHeight = screenHeight - (Platform.OS === 'ios' ? 180 : 160); // Height extends to just above shutter button
  const bottomSectionHeight = isSmallScreen ? 80 : 100; // Reduced height since we removed the rotate button
  
  // Responsive values using theme
  const responsiveValues = {
    viewfinderWidth,
    viewfinderHeight,
    bottomSectionHeight,
    captureButtonSize: isSmallScreen ? 70 : 80,
    headerButtonSize: isSmallScreen ? 40 : 44,
    cornerSize: isSmallScreen ? 16 : 20,
    padding: {
      small: isSmallScreen ? theme.spacing.base : theme.spacing.lg,
      medium: isSmallScreen ? theme.spacing.lg : theme.spacing.xl,
      large: isSmallScreen ? theme.spacing['2xl'] : theme.spacing['3xl'],
    },
    fontSize: {
      small: isSmallScreen ? theme.typography.fontSize.xs : theme.typography.fontSize.sm,
      medium: isSmallScreen ? theme.typography.fontSize.sm : theme.typography.fontSize.base,
      large: isSmallScreen ? theme.typography.fontSize.lg : theme.typography.fontSize.xl,
    },
  };
  
  // Animation values
  const captureScale = useSharedValue(1);
  const focusOpacity = useSharedValue(0);
  const focusScale = useSharedValue(0.8);

  // Create responsive styles using theme
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.primary, // Use theme primary color as polaroid background
    },
    polaroidContainer: {
      flex: 1,
      justifyContent: 'flex-start',
      paddingTop: Platform.OS === 'ios' ? 20 : 10,
      paddingBottom: 0,
      paddingHorizontal: responsiveValues.padding.small,
    },
    // Stage 1: Camera viewfinder area
    viewfinderSection: {
      flex: 1,
      justifyContent: 'flex-start', // Start from top
      alignItems: 'center',
      paddingTop: responsiveValues.padding.small,
    },
    headerTitle: {
      fontSize: responsiveValues.fontSize.large,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text.primary,
      marginBottom: responsiveValues.padding.medium,
      textAlign: 'center',
    },
    viewfinderContainer: {
      width: responsiveValues.viewfinderWidth,
      height: responsiveValues.viewfinderHeight,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.gray[900],
      ...theme.shadows.lg,
      borderWidth: 3,
      borderColor: theme.colors.tertiary,
    },
    camera: {
      flex: 1,
    },
    cameraDisabled: {
      backgroundColor: theme.colors.gray[800],
      justifyContent: 'center',
      alignItems: 'center',
    },
    cameraPlaceholder: {
      alignItems: 'center',
    },
    cameraPlaceholderText: {
      color: theme.colors.text.tertiary,
      fontSize: responsiveValues.fontSize.medium,
      fontFamily: theme.typography.fontFamily.medium,
      marginTop: responsiveValues.padding.small,
    },
    headerControls: {
      position: 'absolute',
      top: responsiveValues.padding.small,
      right: responsiveValues.padding.small,
      flexDirection: 'row',
      zIndex: 2,
    },
    headerButton: {
      width: responsiveValues.headerButtonSize,
      height: responsiveValues.headerButtonSize,
      borderRadius: responsiveValues.headerButtonSize / 2,
      backgroundColor: theme.colors.overlay.dark,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: responsiveValues.padding.small,
      ...theme.shadows.sm,
    },
    viewfinderOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    viewfinderFrame: {
      width: responsiveValues.viewfinderWidth * 0.5,
      height: responsiveValues.viewfinderWidth * 0.5,
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: responsiveValues.cornerSize,
      height: responsiveValues.cornerSize,
      borderColor: theme.colors.accent,
      borderWidth: 2,
    },
    topLeft: {
      top: 0,
      left: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
    },
    topRight: {
      top: 0,
      right: 0,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
    },
    bottomLeft: {
      bottom: 0,
      left: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
    },
    bottomRight: {
      bottom: 0,
      right: 0,
      borderLeftWidth: 0,
      borderTopWidth: 0,
    },
    instructionText: {
      color: theme.colors.accent,
      fontSize: responsiveValues.fontSize.small,
      fontFamily: theme.typography.fontFamily.medium,
      textAlign: 'center',
      marginTop: responsiveValues.padding.medium,
      paddingHorizontal: responsiveValues.padding.medium,
      textShadowColor: theme.colors.overlay.dark,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    focusIndicator: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: responsiveValues.viewfinderWidth * 0.12,
      height: responsiveValues.viewfinderWidth * 0.12,
      marginLeft: -(responsiveValues.viewfinderWidth * 0.06),
      marginTop: -(responsiveValues.viewfinderWidth * 0.06),
      zIndex: 2,
    },
    focusRing: {
      width: responsiveValues.viewfinderWidth * 0.12,
      height: responsiveValues.viewfinderWidth * 0.12,
      borderRadius: responsiveValues.viewfinderWidth * 0.06,
      borderWidth: 2,
      borderColor: theme.colors.accent,
    },
    // Stage 2: Bottom controls area
    bottomSection: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 100 : 80, // Position above navigator dots
      left: 0,
      right: 0,
      height: responsiveValues.bottomSectionHeight,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: responsiveValues.padding.medium,
      zIndex: 10,
    },
    controlsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      position: 'relative',
    },
    captureButton: {
      marginBottom: responsiveValues.bottomSectionHeight + responsiveValues.padding.small, // Remove margin since we're positioning absolutely
      width: responsiveValues.captureButtonSize,
      height: responsiveValues.captureButtonSize,
      borderRadius: responsiveValues.captureButtonSize / 2,
      backgroundColor: theme.colors.secondary,
      borderWidth: 4,
      borderColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.md,
    },
    captureInner: {
      width: responsiveValues.captureButtonSize * 0.65,
      height: responsiveValues.captureButtonSize * 0.65,
      borderRadius: (responsiveValues.captureButtonSize * 0.65) / 2,
      backgroundColor: theme.colors.accent,
    },
    captureButtonDisabled: {
      opacity: 0.6,
    },
    uploadingIndicator: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: responsiveValues.captureButtonSize * 0.25,
      height: responsiveValues.captureButtonSize * 0.25,
      backgroundColor: theme.colors.warning,
      borderRadius: (responsiveValues.captureButtonSize * 0.25) / 2,
      marginLeft: -(responsiveValues.captureButtonSize * 0.125),
      marginTop: -(responsiveValues.captureButtonSize * 0.125),
    },
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: responsiveValues.padding.large,
      backgroundColor: theme.colors.primary,
    },
    permissionContent: {
      alignItems: 'center',
      maxWidth: screenWidth * 0.8,
      backgroundColor: theme.colors.secondary,
      padding: responsiveValues.padding.large,
      borderRadius: theme.borderRadius.xl,
      ...theme.shadows.lg,
    },
    permissionIcon: {
      width: screenWidth * 0.2,
      height: screenWidth * 0.2,
      borderRadius: screenWidth * 0.1,
      backgroundColor: theme.colors.tertiary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: responsiveValues.padding.medium,
    },
    permissionTitle: {
      fontSize: responsiveValues.fontSize.large,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text.primary,
      marginBottom: responsiveValues.padding.small,
      textAlign: 'center',
    },
    permissionText: {
      fontSize: responsiveValues.fontSize.medium,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: responsiveValues.fontSize.medium * 1.5,
      marginBottom: responsiveValues.padding.large,
    },
    permissionButton: {
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      width: '100%',
    },
    buttonGradient: {
      paddingVertical: responsiveValues.padding.medium,
      paddingHorizontal: responsiveValues.padding.large,
      backgroundColor: theme.colors.accent,
    },
    buttonText: {
      fontSize: responsiveValues.fontSize.medium,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.colors.text.inverse,
      textAlign: 'center',
    },
  });

  // Handle camera lifecycle when screen gains/loses focus
  useFocusEffect(
    React.useCallback(() => {
      // Screen gained focus - enable camera
      setIsCameraEnabled(true);
      
      return () => {
        // Screen lost focus - disable camera
        setIsCameraEnabled(false);
      };
    }, [])
  );

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      setIsCameraEnabled(false);
    };
  }, []);

  const captureAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  const focusAnimatedStyle = useAnimatedStyle(() => ({
    opacity: focusOpacity.value,
    transform: [{ scale: focusScale.value }],
  }));

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <View style={styles.permissionIcon}>
            <Camera size={32} color={theme.colors.accent} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionText}>
            Allow camera access to discover amazing places around you
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            activeOpacity={0.9}
          >
            <View style={styles.buttonGradient}>
              <Text style={styles.buttonText}>Enable Camera</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const toggleFlash = () => {
    setFlash(current => {
      switch (current) {
        case 'off':
          return 'on';
        case 'on':
          return 'auto';
        case 'auto':
          return 'off';
        default:
          return 'off';
      }
    });
  };

  const takePicture = async () => {
    if (Platform.OS === 'web') {
      simulatePhotoCapture();
      return;
    }

    if (cameraRef.current && !isUploading && isCameraEnabled) {
      try {
        setIsUploading(true);

        // Animate capture button
        captureScale.value = withSequence(
          withTiming(0.9, { duration: 100 }),
          withTiming(1, { duration: 100 })
        );

        // Show focus animation
        focusOpacity.value = withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0, { duration: 300 })
        );
        focusScale.value = withSequence(
          withSpring(1, { damping: 15 }),
          withTiming(0.8, { duration: 300 })
        );

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });

        // Copy photo to permanent location to prevent deletion
        const timestamp = Date.now();
        const filename = `nekibuki_photo_${timestamp}.jpg`;
        const permanentUri = `${FileSystem.documentDirectory}${filename}`;
        
        try {
          await FileSystem.copyAsync({
            from: photo.uri,
            to: permanentUri,
          });
          console.log('Photo saved to permanent location:', permanentUri);
        } catch (copyError) {
          console.error('Failed to copy photo to permanent location:', copyError);
          // Fall back to original URI if copy fails
          const fallbackUri = photo.uri;
          console.log('Using original URI as fallback:', fallbackUri);
          
          // Upload photo to backend with fallback URI
          const response = await apiService.uploadPhoto(fallbackUri);
          
          // Navigate to result screen with session ID and fallback photo URI
          router.push({
            pathname: '/recognition-result',
            params: { 
              sessionId: response.session_id,
              photoUri: fallbackUri 
            }
          } as any);
          return;
        }

        // Upload photo to backend with permanent URI
        const response = await apiService.uploadPhoto(permanentUri);
        
        // Navigate to result screen with session ID and permanent photo URI
        router.push({
          pathname: '/recognition-result',
          params: { 
            sessionId: response.session_id,
            photoUri: permanentUri 
          }
        } as any);

      } catch (error) {
        console.error('Photo upload error:', error);
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to process photo');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const simulatePhotoCapture = () => {
    // Animate capture for web
    captureScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    focusOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 300 })
    );
    focusScale.value = withSequence(
      withSpring(1, { damping: 15 }),
      withTiming(0.8, { duration: 300 })
    );

    setTimeout(() => {
      Alert.alert('Demo Mode', 'Photo upload simulation - connect to a real backend for full functionality');
    }, 500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.polaroidContainer}>
        {/* Stage 1: Camera Viewfinder Section */}
        <View style={styles.viewfinderSection}>
          <Text style={styles.headerTitle}>Nekibuki</Text>
          
          <View style={styles.viewfinderContainer}>
            {isCameraEnabled && (
              <CameraView 
                style={styles.camera} 
                facing={facing}
                flash={flash}
                ref={cameraRef}
              />
            )}
            
            {!isCameraEnabled && (
              <View style={[styles.camera, styles.cameraDisabled]}>
                <View style={styles.cameraPlaceholder}>
                  <Camera size={48} color={theme.colors.text.tertiary} />
                  <Text style={styles.cameraPlaceholderText}>Camera Loading...</Text>
                </View>
              </View>
            )}
            
            {/* Focus indicator */}
            <Animated.View style={[styles.focusIndicator, focusAnimatedStyle]}>
              <View style={styles.focusRing} />
            </Animated.View>

            {/* Viewfinder overlay */}
            <View style={styles.viewfinderOverlay}>
              <View style={styles.viewfinderFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>

            {/* Header controls positioned on the viewfinder */}
            <View style={styles.headerControls}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={toggleFlash}
                activeOpacity={0.8}
              >
                {flash !== 'off' ? (
                  <Zap size={20} color={theme.colors.warning} fill={theme.colors.warning} />
                ) : (
                  <ZapOff size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Stage 2: Bottom Controls Section - Positioned absolutely above navigator */}
      <View style={styles.bottomSection}>
        <View style={styles.controlsRow}>
          <Animated.View style={captureAnimatedStyle}>
            <TouchableOpacity
              style={[styles.captureButton, isUploading && styles.captureButtonDisabled]}
              onPress={takePicture}
              activeOpacity={0.8}
              disabled={isUploading}
            >
              {isUploading ? (
                <View style={styles.captureInner}>
                  <View style={styles.uploadingIndicator} />
                </View>
              ) : (
                <View style={styles.captureInner} />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}