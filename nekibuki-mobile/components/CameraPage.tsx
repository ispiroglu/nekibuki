import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, RotateCcw, Zap, ZapOff } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withSequence, 
  withTiming 
} from 'react-native-reanimated';

export default function CameraPage() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  
  // Animation values
  const captureScale = useSharedValue(1);
  const focusOpacity = useSharedValue(0);
  const focusScale = useSharedValue(0.8);

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
      <View style={styles.container}>
        <LinearGradient colors={['#F8FAFC', '#FFFFFF']} style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <View style={styles.permissionIcon}>
              <Camera size={32} color="#2563EB" />
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
              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Enable Camera</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };

  const takePicture = async () => {
    if (Platform.OS === 'web') {
      simulatePhotoCapture();
      return;
    }

    if (cameraRef.current) {
      try {
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

        Alert.alert('Photo captured!', `Photo saved: ${photo.uri}`);
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
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
      Alert.alert('Photo captured!', 'Discovering location...');
    }, 500);
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing={facing}
        flash={flash}
        ref={cameraRef}
      />
      
      {/* Focus indicator */}
      <Animated.View style={[styles.focusIndicator, focusAnimatedStyle]}>
        <View style={styles.focusRing} />
      </Animated.View>

      {/* Header controls */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'transparent']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={toggleFlash}
            activeOpacity={0.8}
          >
            {flash === 'on' ? (
              <Zap size={20} color="#FFB000" fill="#FFB000" />
            ) : (
              <ZapOff size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Viewfinder overlay */}
      <View style={styles.viewfinderOverlay}>
        <View style={styles.viewfinderFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <Text style={styles.instructionText}>
          Point at landmarks to discover their stories
        </Text>
      </View>

      {/* Bottom controls */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)']}
        style={styles.bottomGradient}
      >
        <View style={styles.bottomControls}>
          <View style={styles.controlsRow}>
            <View style={styles.spacer} />
            
            <Animated.View style={captureAnimatedStyle}>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
                activeOpacity={0.8}
              >
                <View style={styles.captureInner} />
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={styles.flipButton}
              onPress={toggleCameraFacing}
              activeOpacity={0.8}
            >
              <RotateCcw size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionContent: {
    alignItems: 'center',
    maxWidth: 280,
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 240,
    height: 240,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 40,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  focusIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -30,
    zIndex: 2,
  },
  focusRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    zIndex: 1,
  },
  bottomControls: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 60,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  spacer: {
    width: 40,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
  },
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});