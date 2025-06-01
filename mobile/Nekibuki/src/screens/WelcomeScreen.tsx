import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const { width, height } = Dimensions.get('window');

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  const handleSwipeGesture = (event: any) => {
    const { translationY, velocityY, state } = event.nativeEvent;
    
    // Detect upward swipe: negative translationY with sufficient velocity
    if (state === State.END) {
      if (translationY < -50 && velocityY < -500) {
        onGetStarted();
      }
    }
  };

  return (
    <PanGestureHandler onHandlerStateChange={handleSwipeGesture}>
      <View style={{ flex: 1 }}>
        <View style={styles.container}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.contentContainer}>
              {/* Header Section */}
              <View style={styles.headerSection}>
                <Text style={styles.title}>Nekibuki</Text>
                <Text style={styles.subtitle}>
                  Discover the stories behind every landmark
                </Text>
              </View>

              {/* Feature Preview - Illustration Area */}
              <View style={styles.featurePreview}>
                <View style={styles.illustrationContainer}>
                  <View style={styles.illustration}>
                    {/* Simple illustration placeholder */}
                    <View style={styles.building} />
                    
                    {/* Speech Bubble */}
                    <View style={styles.speechBubble}>
                      <Text style={styles.speechText}>...</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Navigation Section */}
              <View style={styles.navigationSection}>
                {/* Swipe Hint - Now handles both tap and swipe */}
                <TouchableOpacity style={styles.swipeHint} onPress={onGetStarted}>
                  <Text style={styles.swipeText}>Swipe up to begin</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, // #FFFFFF from Figma
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: Colors.contentBackground, // #FAF7FA from Figma
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    ...Typography.largeTitle,
    color: Colors.text, // #1A0F12 from Figma
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.title,
    color: Colors.text, // #1A0F12 from Figma
    textAlign: 'center',
    lineHeight: 30,
  },
  featurePreview: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginVertical: Spacing.xl,
  },
  illustrationContainer: {
    width: 280,
    height: 280,
    marginBottom: Spacing.md,
  },
  illustration: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.contentBackground,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  building: {
    width: 180,
    height: 140,
    backgroundColor: '#2C5530',
    borderRadius: 8,
    marginBottom: 20,
  },
  speechBubble: {
    position: 'absolute',
    top: 40,
    right: 40,
    width: 80,
    height: 40,
    backgroundColor: Colors.background,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  speechText: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.text,
  },
  navigationSection: {
    alignItems: 'center',
    paddingBottom: Spacing.lg,
  },
  swipeHint: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  swipeText: {
    ...Typography.caption,
    color: Colors.textSecondary, // #945463 from Figma
    textAlign: 'center',
  },
});

export default WelcomeScreen; 