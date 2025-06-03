import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';

import CameraScreen from '../screens/CameraScreen';
import HistoryScreen from '../screens/HistoryScreen';
import { Colors, Typography, Spacing } from '../constants/theme';

const { width } = Dimensions.get('window');

// Placeholder Profile Screen component - matches the one in AppNavigator
const ProfileScreen: React.FC = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <Text style={Typography.title}>Profile Screen</Text>
      <Text style={Typography.body}>Coming Soon!</Text>
    </View>
  );
};

interface SwipeNavigatorProps {}

const SwipeNavigator: React.FC<SwipeNavigatorProps> = () => {
  const pagerRef = useRef<PagerView>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(1); // Start with camera (middle)
  const [pagePosition, setPagePosition] = useState<number>(1); // Track exact page position for animations
  
  // Animated values for smooth transitions
  const indicatorAnimation = useRef(new Animated.Value(1)).current;
  const pageTransition = useRef(new Animated.Value(0)).current;

  const screens = [
    {
      name: 'History', 
      component: HistoryScreen,
      color: '#F8F9FA',
    },
    {
      name: 'Camera',
      component: CameraScreen,
      color: '#FAF7FA',
    },
    {
      name: 'Profile',
      component: ProfileScreen,
      color: '#F0F9FF',
    }
  ];

  const handlePageChange = useCallback((position: number) => {
    setCurrentIndex(position);
    
    // Animate the indicator
    Animated.spring(indicatorAnimation, {
      toValue: position,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [indicatorAnimation]);

  const handlePageScroll = useCallback((event: any) => {
    const { position, offset } = event.nativeEvent;
    const exactPosition = position + offset;
    setPagePosition(exactPosition);
    
    // Update page transition animation smoothly
    pageTransition.setValue(exactPosition);
    
    // Update indicator animation smoothly during scroll
    indicatorAnimation.setValue(exactPosition);
  }, [pageTransition, indicatorAnimation]);

  const navigateToPage = useCallback((index: number) => {
    pagerRef.current?.setPage(index);
    
    // Add haptic feedback (for mobile devices)
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      navigator.vibrate?.(30);
    }
    
    // Smooth spring animation for better feel
    Animated.spring(indicatorAnimation, {
      toValue: index,
      useNativeDriver: false,
      tension: 120,
      friction: 8,
      velocity: 2,
    }).start();
  }, [indicatorAnimation]);

  // Calculate animated indicator position with smoother interpolation
  const indicatorTranslateX = indicatorAnimation.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [-24, 0, 24], // Adjusted for better spacing with labels
    extrapolate: 'clamp',
  });

  // Add a subtle background animation
  const backgroundOpacity = pageTransition.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0.05, 0.1, 0.05],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Swipe Content */}
        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={1}
          onPageSelected={(e) => handlePageChange(e.nativeEvent.position)}
          onPageScroll={handlePageScroll}
          pageMargin={0}
          orientation="horizontal"
          scrollEnabled={true}
        >
          {screens.map((screen, index) => (
            <View key={index} style={[styles.page, { backgroundColor: screen.color }]}>
              <Animated.View style={[
                styles.pageContent,
                {
                  opacity: pageTransition.interpolate({
                    inputRange: [index - 1, index, index + 1],
                    outputRange: [0.6, 1, 0.6],
                    extrapolate: 'clamp',
                  }),
                  transform: [
                    {
                      scale: pageTransition.interpolate({
                        inputRange: [index - 1, index, index + 1],
                        outputRange: [0.92, 1, 0.92],
                        extrapolate: 'clamp',
                      }),
                    },
                    {
                      translateX: pageTransition.interpolate({
                        inputRange: [index - 1, index, index + 1],
                        outputRange: [width * 0.1, 0, -width * 0.1],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                }
              ]}>
                {screen.name === 'Camera' ? (
                  <CameraScreen isFocused={currentIndex === index} />
                ) : (
                  <screen.component />
                )}
              </Animated.View>
            </View>
          ))}
        </PagerView>

        {/* Enhanced Navigation with Animations */}
        <View style={styles.compactNav}>
          <View style={styles.dotIndicator}>
            {/* Animated background indicator */}
            <Animated.View
              style={[
                styles.activeIndicatorBackground,
                {
                  transform: [{ translateX: indicatorTranslateX }],
                },
                { opacity: backgroundOpacity },
              ]}
            />
            
            {screens.map((screen, index) => (
              <TouchableOpacity
                key={index}
                style={styles.dotContainer}
                onPress={() => navigateToPage(index)}
                activeOpacity={0.6}
              >
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: currentIndex === index ? Colors.buttonPrimary : Colors.textTertiary,
                      transform: [{
                        scale: indicatorAnimation.interpolate({
                          inputRange: [index - 0.5, index, index + 0.5],
                          outputRange: [0.8, 1.2, 0.8],
                          extrapolate: 'clamp',
                        }),
                      }],
                    }
                  ]}
                />
                
                {/* Screen name labels */}
                <Animated.Text
                  style={[
                    styles.screenLabel,
                    {
                      opacity: indicatorAnimation.interpolate({
                        inputRange: [index - 0.5, index, index + 0.5],
                        outputRange: [0.5, 1, 0.5],
                        extrapolate: 'clamp',
                      }),
                      color: currentIndex === index ? Colors.buttonPrimary : Colors.textTertiary,
                    }
                  ]}
                >
                  {screen.name}
                </Animated.Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
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
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
    width: width,
  },
  pageContent: {
    flex: 1,
  },
  compactNav: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.lg,
  },
  dotIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dotContainer: {
    alignItems: 'center',
    padding: Spacing.md,
    minWidth: 60,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeIndicatorBackground: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.buttonPrimary}15`,
    position: 'absolute',
    top: 8,
  },
  screenLabel: {
    marginTop: Spacing.xs,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default SwipeNavigator; 