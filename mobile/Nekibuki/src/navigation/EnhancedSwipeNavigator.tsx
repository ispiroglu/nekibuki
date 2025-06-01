import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { 
  PanGestureHandler, 
  State, 
  GestureHandlerRootView 
} from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import CameraScreen from '../screens/CameraScreen';
import HistoryScreen from '../screens/HistoryScreen';
import { Colors, Typography, Spacing } from '../constants/theme';

const { width } = Dimensions.get('window');

// Placeholder Profile Screen component
const ProfileScreen: React.FC = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <Text style={Typography.title}>Profile Screen</Text>
      <Text style={Typography.body}>Coming Soon!</Text>
    </View>
  );
};

interface EnhancedSwipeNavigatorProps {}

const EnhancedSwipeNavigator: React.FC<EnhancedSwipeNavigatorProps> = () => {
  const pagerRef = useRef<PagerView>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const animationValue = useRef(new Animated.Value(0)).current;

  const screens = [
    {
      name: 'Camera',
      component: CameraScreen,
      icon: 'camera',
      iconOutline: 'camera-outline'
    },
    {
      name: 'History', 
      component: HistoryScreen,
      icon: 'time',
      iconOutline: 'time-outline'
    },
    {
      name: 'Profile',
      component: ProfileScreen, 
      icon: 'person',
      iconOutline: 'person-outline'
    }
  ];

  const handlePageChange = (position: number) => {
    setCurrentIndex(position);
    
    // Animate indicator
    Animated.spring(animationValue, {
      toValue: position,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const navigateToPage = (index: number) => {
    if (index >= 0 && index < screens.length) {
      pagerRef.current?.setPage(index);
      setCurrentIndex(index);
    }
  };

  const onGestureEvent = (event: any) => {
    const { translationX, velocityX, state } = event.nativeEvent;
    
    if (state === State.END) {
      const threshold = width * 0.3; // 30% of screen width
      const velocityThreshold = 500;
      
      if (translationX > threshold || velocityX > velocityThreshold) {
        // Swipe right - go to previous screen
        navigateToPage(currentIndex - 1);
      } else if (translationX < -threshold || velocityX < -velocityThreshold) {
        // Swipe left - go to next screen  
        navigateToPage(currentIndex + 1);
      }
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          {/* Enhanced Page Indicator */}
          <View style={styles.headerContainer}>
            <View style={styles.pageIndicator}>
              {screens.map((screen, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.indicatorItem,
                    currentIndex === index && styles.activeIndicatorItem
                  ]}
                  onPress={() => navigateToPage(index)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={currentIndex === index ? screen.icon as any : screen.iconOutline as any}
                    size={24}
                    color={currentIndex === index ? Colors.buttonPrimary : Colors.textTertiary}
                  />
                  <Text style={[
                    styles.indicatorText,
                    currentIndex === index && styles.activeIndicatorText
                  ]}>
                    {screen.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <Animated.View 
                style={[
                  styles.progressBar,
                  {
                    transform: [{
                      translateX: animationValue.interpolate({
                        inputRange: [0, screens.length - 1],
                        outputRange: [0, (width - Spacing.lg * 2) / screens.length * (screens.length - 1)],
                        extrapolate: 'clamp',
                      })
                    }]
                  }
                ]}
              />
            </View>
          </View>

          {/* Enhanced Swipe Content with Gesture Detection */}
          <PanGestureHandler onHandlerStateChange={onGestureEvent}>
            <View style={styles.gestureContainer}>
              <PagerView
                ref={pagerRef}
                style={styles.pagerView}
                initialPage={0}
                onPageSelected={(e) => handlePageChange(e.nativeEvent.position)}
                scrollEnabled={true}
                overdrag={true}
              >
                {screens.map((screen, index) => (
                  <View key={index} style={styles.page}>
                    <screen.component />
                  </View>
                ))}
              </PagerView>
            </View>
          </PanGestureHandler>

          {/* Enhanced Swipe Hint */}
          <View style={styles.footerContainer}>
            <View style={styles.navigationHints}>
              <TouchableOpacity 
                style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
                onPress={() => navigateToPage(currentIndex - 1)}
                disabled={currentIndex === 0}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={20} 
                  color={currentIndex === 0 ? Colors.textTertiary : Colors.buttonPrimary} 
                />
              </TouchableOpacity>
              
              <View style={styles.dotIndicator}>
                {screens.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dot,
                      currentIndex === index && styles.activeDot
                    ]}
                    onPress={() => navigateToPage(index)}
                  />
                ))}
              </View>
              
              <TouchableOpacity 
                style={[styles.navButton, currentIndex === screens.length - 1 && styles.navButtonDisabled]}
                onPress={() => navigateToPage(currentIndex + 1)}
                disabled={currentIndex === screens.length - 1}
              >
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={currentIndex === screens.length - 1 ? Colors.textTertiary : Colors.buttonPrimary} 
                />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.swipeHintText}>
              Swipe or tap to navigate
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  indicatorItem: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    minWidth: 80,
  },
  activeIndicatorItem: {
    backgroundColor: Colors.surface,
  },
  indicatorText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 4,
    fontSize: 12,
  },
  activeIndicatorText: {
    color: Colors.buttonPrimary,
    fontWeight: '600',
  },
  progressContainer: {
    height: 3,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    width: `${100 / 3}%`,
    backgroundColor: Colors.buttonPrimary,
    borderRadius: 1.5,
  },
  gestureContainer: {
    flex: 1,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
    width: width,
  },
  footerContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  navigationHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  dotIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textTertiary,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: Colors.buttonPrimary,
    width: 12,
    height: 8,
    borderRadius: 4,
  },
  swipeHintText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    fontSize: 12,
  },
});

export default EnhancedSwipeNavigator; 