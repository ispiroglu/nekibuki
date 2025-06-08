import { View, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useState } from 'react';
import DiscoverPage from '../components/DiscoverPage';
import CameraPage from '../components/CameraPage';
import ProfilePage from '../components/ProfilePage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGES = 3;

export default function MainScreen() {
  const [currentPage, setCurrentPage] = useState(1); // Start with camera page (index 1)
  const translateX = useSharedValue(-SCREEN_WIDTH); // Start at camera page

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: (_, context) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
    },
    onEnd: (event) => {
      const velocity = event.velocityX;
      const threshold = SCREEN_WIDTH * 0.3;
      
      let targetPage = currentPage;
      
      if (event.translationX > threshold || velocity > 500) {
        // Swipe right - go to previous page
        targetPage = Math.max(0, currentPage - 1);
      } else if (event.translationX < -threshold || velocity < -500) {
        // Swipe left - go to next page
        targetPage = Math.min(PAGES - 1, currentPage + 1);
      }
      
      const targetTranslateX = -targetPage * SCREEN_WIDTH;
      translateX.value = withSpring(targetTranslateX, {
        damping: 20,
        stiffness: 90,
      });
      
      if (targetPage !== currentPage) {
        runOnJS(setCurrentPage)(targetPage);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Page indicator animation
  const indicatorStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [-(PAGES - 1) * SCREEN_WIDTH, 0],
      [PAGES - 1, 0],
      Extrapolate.CLAMP
    );
    
    return {
      transform: [
        {
          translateX: interpolate(
            progress,
            [0, 1, 2],
            [0, 20, 40]
          ),
        },
      ],
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.pagesContainer, animatedStyle]}>
          <View style={styles.page}>
            <DiscoverPage />
          </View>
          <View style={styles.page}>
            <CameraPage />
          </View>
          <View style={styles.page}>
            <ProfilePage />
          </View>
        </Animated.View>
      </PanGestureHandler>
      
      {/* Page Indicators */}
      <View style={styles.indicatorContainer}>
        <View style={styles.indicatorTrack}>
          <Animated.View style={[styles.activeIndicator, indicatorStyle]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pagesContainer: {
    flex: 1,
    flexDirection: 'row',
    width: SCREEN_WIDTH * PAGES,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  indicatorTrack: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    width: 20,
    height: 4,
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
});