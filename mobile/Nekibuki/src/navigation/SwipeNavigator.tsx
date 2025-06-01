import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
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

  const screens = [
    {
      name: 'History', 
      component: HistoryScreen,
    },
    {
      name: 'Camera',
      component: CameraScreen,
    },
    {
      name: 'Profile',
      component: ProfileScreen, 
    }
  ];

  const handlePageChange = (position: number) => {
    setCurrentIndex(position);
  };

  const navigateToPage = (index: number) => {
    pagerRef.current?.setPage(index);
    setCurrentIndex(index);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Swipe Content */}
        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={1}
          onPageSelected={(e) => handlePageChange(e.nativeEvent.position)}
        >
          {screens.map((screen, index) => (
            <View key={index} style={styles.page}>
              <screen.component />
            </View>
          ))}
        </PagerView>

        {/* Compact Navigation */}
        <View style={styles.compactNav}>
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
  compactNav: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
  },
  dotIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textTertiary,
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: Colors.buttonPrimary,
    width: 10,
    height: 6,
    borderRadius: 3,
  },
});

export default SwipeNavigator; 