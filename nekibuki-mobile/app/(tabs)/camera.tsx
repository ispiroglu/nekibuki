import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, RotateCcw, Zap, ZapOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  
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
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#E3F2FD', '#FFFFFF']} style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <Camera size={64} color="#1976D2" />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              Nekibuki needs camera access to identify attractions and landmarks
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#1976D2', '#1565C0']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Grant Permission</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
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
      // For web platform, simulate photo capture
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

        // Navigate to loading screen with photo data
        router.push({
          pathname: '/loading',
          params: { photoUri: photo.uri }
        });
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

    // Navigate to loading screen
    setTimeout(() => {
      router.push('/loading');
    }, 500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing={facing}
        flash={flash}
        ref={cameraRef}
      >
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
                <Zap size={24} color="#FFB000" fill="#FFB000" />
              ) : (
                <ZapOff size={24} color="#FFFFFF" />
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
            Point your camera at an attraction or landmark
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
                  <View style={styles.captureInner}>
                    <Camera size={32} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity
                style={styles.flipButton}
                onPress={toggleCameraFacing}
                activeOpacity={0.8}
              >
                <RotateCcw size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </CameraView>
    </SafeAreaView>
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
  },
  permissionContent: {
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    borderRadius: 12,
    overflow: 'hidden',
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
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#FFFFFF',
    borderWidth: 3,
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
    fontSize: 16,
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
    width: 80,
    height: 80,
    marginLeft: -40,
    marginTop: -40,
    zIndex: 2,
  },
  focusRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    zIndex: 1,
  },
  bottomControls: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  spacer: {
    width: 44,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});