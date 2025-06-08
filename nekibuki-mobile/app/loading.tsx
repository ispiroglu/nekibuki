import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Camera, MapPin } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  withDelay,
  FadeInUp,
  FadeInDown
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const loadingSteps = [
  { id: 1, text: 'Analyzing your photo...', icon: Camera },
  { id: 2, text: 'Identifying landmarks...', icon: MapPin },
  { id: 3, text: 'Gathering information...', icon: Sparkles },
];

export default function LoadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Animation values
  const pulseScale = useSharedValue(1);
  const rotationAngle = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationAngle.value}deg` }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  useEffect(() => {
    // Start animations
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      false
    );

    rotationAngle.value = withRepeat(
      withTiming(360, { duration: 2000 }),
      -1,
      false
    );

    // Progress animation
    progressWidth.value = withSequence(
      withDelay(500, withTiming(33, { duration: 1500 })),
      withDelay(500, withTiming(66, { duration: 1500 })),
      withDelay(500, withTiming(100, { duration: 1000 }))
    );

    // Navigate to results after loading
    const timer = setTimeout(() => {
      router.replace({
        pathname: '/report',
        params: { 
          photoUri: params.photoUri || '',
          attractionName: 'Eiffel Tower',
          location: 'Paris, France'
        }
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#FFFFFF', '#E0F2F1']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Main loading animation */}
          <Animated.View entering={FadeInUp.delay(200)} style={styles.animationContainer}>
            <Animated.View style={[styles.outerCircle, pulseStyle]}>
              <Animated.View style={[styles.innerCircle, rotationStyle]}>
                <LinearGradient
                  colors={['#1976D2', '#42A5F5']}
                  style={styles.iconContainer}
                >
                  <Sparkles size={32} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
            </Animated.View>
          </Animated.View>

          {/* Loading text */}
          <Animated.View entering={FadeInUp.delay(400)} style={styles.textContainer}>
            <Text style={styles.title}>Discovering Magic</Text>
            <Text style={styles.subtitle}>
              Let me identify this amazing place for you
            </Text>
          </Animated.View>

          {/* Progress steps */}
          <Animated.View entering={FadeInDown.delay(600)} style={styles.stepsContainer}>
            {loadingSteps.map((step, index) => (
              <View key={step.id} style={styles.stepItem}>
                <View style={styles.stepIcon}>
                  <step.icon size={16} color="#1976D2" />
                </View>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Progress bar */}
          <Animated.View entering={FadeInDown.delay(800)} style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressStyle]} />
            </View>
            <Text style={styles.progressText}>Processing...</Text>
          </Animated.View>

          {/* Fun facts while loading */}
          <Animated.View entering={FadeInDown.delay(1000)} style={styles.factsContainer}>
            <View style={styles.factCard}>
              <LinearGradient
                colors={['#FFFFFF', '#F8F9FA']}
                style={styles.factGradient}
              >
                <View style={styles.factIcon}>
                  <Sparkles size={20} color="#F57C00" />
                </View>
                <Text style={styles.factTitle}>Did you know?</Text>
                <Text style={styles.factText}>
                  Tourist attractions around the world receive over 1.4 billion visitors annually
                </Text>
              </LinearGradient>
            </View>
          </Animated.View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  animationContainer: {
    marginBottom: 40,
  },
  outerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  stepsContainer: {
    width: '100%',
    marginBottom: 40,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  progressTrack: {
    width: '80%',
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1976D2',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  factsContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 40,
  },
  factCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  factGradient: {
    padding: 20,
    alignItems: 'center',
  },
  factIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  factTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  factText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});