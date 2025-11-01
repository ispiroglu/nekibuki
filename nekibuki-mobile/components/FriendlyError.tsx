import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, SearchX } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import theme from '../constants/theme';

const { width: screenWidth } = Dimensions.get('window');

interface FriendlyErrorProps {
  visible: boolean;
  onClose: () => void;
  type: 'error' | 'notFound';
  title?: string;
  message?: string;
}

const FriendlyError: React.FC<FriendlyErrorProps> = ({
  visible,
  onClose,
  type,
  title,
  message,
}) => {
  const isError = type === 'error';
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
      opacity.value = withSpring(1, { damping: 20, stiffness: 300 });
    } else {
      scale.value = withSpring(0, { damping: 20, stiffness: 300 });
      opacity.value = withSpring(0, { damping: 20, stiffness: 300 });
    }
  }, [visible]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const defaultTitle = isError
    ? 'Oops! Something went wrong'
    : 'No attraction found';
  const defaultMessage = isError
    ? 'We encountered an issue while processing your request. Please try again.'
    : "We couldn't identify the attraction in your photo. Try taking another photo with better lighting or a clearer view.";

  const iconColor = isError ? theme.colors.warning : theme.colors.info;
  const gradientColors = isError 
    ? [theme.colors.primary, theme.colors.secondary, theme.colors.tertiary]
    : [theme.colors.secondary, theme.colors.tertiary, theme.colors.primary];

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <TouchableOpacity 
          style={styles.backdropTouchable} 
          onPress={onClose}
          activeOpacity={1}
        />
        
        <Animated.View style={[styles.modalContainer, modalAnimatedStyle]}>
          <LinearGradient
            colors={gradientColors as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalView}
          >
            {/* Decorative circles */}
            <View style={styles.decorativeCircles}>
              <View style={[styles.circle, styles.circle1]} />
              <View style={[styles.circle, styles.circle2]} />
              <View style={[styles.circle, styles.circle3]} />
            </View>

            {/* Icon container with circular background */}
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
              <View style={[styles.iconCircle, { backgroundColor: iconColor + '30' }]}>
                {isError ? (
                  <AlertTriangle color={iconColor} size={32} strokeWidth={2} />
                ) : (
                  <SearchX color={iconColor} size={32} strokeWidth={2} />
                )}
              </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{title || defaultTitle}</Text>
              <Text style={styles.message}>{message || defaultMessage}</Text>
            </View>

            {/* Action button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.accent, theme.colors.tertiary] as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {isError ? 'Try Again' : 'Take Another Photo'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: screenWidth * 0.85,
    maxWidth: 360,
  },
  modalView: {
    borderRadius: theme.borderRadius['2xl'],
    paddingVertical: theme.spacing['4xl'],
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  decorativeCircles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary + '30',
  },
  circle1: {
    width: 120,
    height: 120,
    top: -60,
    right: -60,
  },
  circle2: {
    width: 80,
    height: 80,
    bottom: -40,
    left: -40,
  },
  circle3: {
    width: 60,
    height: 60,
    top: 40,
    left: 20,
    backgroundColor: theme.colors.accent + '20',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
    zIndex: 1,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: theme.typography.lineHeight.xl,
  },
  message: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.base,
    paddingHorizontal: theme.spacing.sm,
  },
  actionButton: {
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    width: '100%',
    ...theme.shadows.sm,
    zIndex: 1,
  },
  buttonGradient: {
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing['2xl'],
    alignItems: 'center',
  },
  buttonText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
    textAlign: 'center',
  },
});

export default FriendlyError; 