import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Clock, Star, ArrowLeft, RefreshCw, Check, Share, Bookmark, Camera } from 'lucide-react-native';
import apiService, { RecognitionResult } from '../services/api';
import theme from '../constants/theme';
import FriendlyError from '../components/FriendlyError';

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function RecognitionResultScreen() {
  const { sessionId, photoUri } = useLocalSearchParams<{ sessionId: string; photoUri?: string }>();
  const router = useRouter();
  const [pollingEnabled, setPollingEnabled] = useState(true);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'error' | 'notFound'>('error');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalOnClose, setModalOnClose] = useState(() => () => {});
  
  // Debug log to check photoUri
  console.log('Recognition Result - photoUri:', photoUri);
  
  // Loading screen state
  const [progress, setProgress] = useState(0);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [animatedProgress] = useState(new Animated.Value(0));
  const [dotAnimation] = useState(new Animated.Value(0));

  // Fun facts for the loading screen
  const funFacts = [
    "The Eiffel Tower can be 15 cm taller during the summer due to thermal expansion!",
    "The Great Wall of China isn't visible from space with the naked eye.",
    "Machu Picchu was built without using wheels, iron tools, or mortar.",
    "The Statue of Liberty was originally copper colored, not green.",
    "Big Ben is actually the name of the bell, not the clock tower.",
    "The Leaning Tower of Pisa took 344 years to complete.",
    "Mount Rushmore was originally going to feature the presidents from head to waist."
  ];

  // Query for recognition result with polling
  const {
    data: result,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['recognition-result', sessionId],
    queryFn: () => apiService.getRecognitionResult(sessionId!),
    enabled: !!sessionId && pollingEnabled,
    refetchInterval: pollingEnabled ? 2000 : false,
    retry: 3,
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Animate progress bar and rotate fun facts
  useEffect(() => {
    if (isLoading || result?.status === 'processing') {
      // Animate progress from 0 to 75% over 10 seconds
      Animated.timing(animatedProgress, {
        toValue: 75,
        duration: 10000,
        useNativeDriver: false,
      }).start();

      // Animate dots
      const animateDots = () => {
        Animated.sequence([
          Animated.timing(dotAnimation, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnimation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]).start(() => animateDots());
      };
      animateDots();

      // Rotate fun facts every 4 seconds
      const factInterval = setInterval(() => {
        setCurrentFactIndex((prev) => (prev + 1) % funFacts.length);
      }, 4000);

      return () => {
        clearInterval(factInterval);
      };
    }
  }, [isLoading, result?.status]);

  // Stop polling when processing is complete
  useEffect(() => {
    if (result && (result.status === 'completed' || result.status === 'failed')) {
      setPollingEnabled(false);
      
      // Handle failed state
      if (result.status === 'failed' || (result.status === 'completed' && !result.attraction_info)) {
        setModalType('notFound');
        setModalTitle('Recognition Failed');
        setModalMessage(result.error?.message || "We couldn't identify the attraction. Please try another photo.");
        setModalOnClose(() => handleRetake);
        setIsModalVisible(true);
      }
    }
  }, [result]);

  // Handle query error
  useEffect(() => {
    if (error) {
      setPollingEnabled(false);
      setModalType('error');
      setModalTitle('Something Went Wrong');
      setModalMessage(error.message);
      setModalOnClose(() => handleRetry);
      setIsModalVisible(true);
    }
  }, [error]);

  const handleBack = () => {
    router.back();
  };

  const handleRetry = () => {
    refetch();
  };

  const handleRetake = () => {
    // Navigate to main screen to reset the flow
    router.replace('/');
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    Alert.alert('Share', 'Share functionality will be implemented soon!');
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    Alert.alert('Save', 'Save functionality will be implemented soon!');
  };

  const handleAskNekibuki = () => {
    // TODO: Implement AI chat functionality
    Alert.alert('Ask Nekibuki', 'AI chat functionality will be implemented soon!');
  };

  // Render beautiful loading screen
  const renderLoadingScreen = () => (
    <View style={styles.container}>
      <LinearGradient 
        colors={theme.gradients.subtle as any} 
        style={styles.loadingGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.loadingHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.loadingHeaderTitle}>Nekibuki</Text>
        </View>

        {/* Pagoda Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.pagoda}>
            {/* Steps */}
            <View style={styles.steps} />
            {/* Pagoda structure */}
            <View style={styles.pagodaBase}>
              <View style={styles.pagodaRoof} />
              <View style={styles.pagodaPillars}>
                <View style={styles.pillar} />
                <View style={styles.pillar} />
                <View style={styles.pillar} />
                <View style={styles.pillar} />
              </View>
            </View>
            {/* Trees */}
            <View style={styles.trees}>
              <View style={[styles.tree, styles.treeLeft]} />
              <View style={[styles.tree, styles.treeRight]} />
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.loadingContent}>
          <Text style={styles.loadingTitle}>Processing your photo</Text>
          <Text style={styles.loadingSubtitle}>Hang tight, we're analyzing your image.</Text>

          {/* Animated Dots */}
          <View style={styles.dotsContainer}>
            {[0, 1, 2].map((index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    opacity: dotAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: index === 0 ? [0.3, 1] : index === 1 ? [0.3, 0.7] : [0.3, 0.4],
                    }),
                    transform: [{
                      scale: dotAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, index === 0 ? 1.2 : 1.1],
                      }),
                    }],
                  },
                ]}
              />
            ))}
          </View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Identifying landmarks</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width: animatedProgress.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <Animated.Text style={styles.progressText}>
                {Math.round(animatedProgress.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, 75],
                  easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),  
                }) as any)}%
              </Animated.Text>
            </View>
          </View>

          {/* Fun Fact */}
          <View style={styles.funFactContainer}>
            <Text style={styles.funFactLabel}>Fun Fact:</Text>
            <Text style={styles.funFactText}>{funFacts[currentFactIndex]}</Text>
          </View>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButton} onPress={handleBack}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  if (!sessionId) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={theme.gradients.primary as any} style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid session ID</Text>
          <TouchableOpacity style={styles.backButtonSimple} onPress={handleBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  // Always render loading or result screen, modal will overlay
  const shouldShowLoading = isLoading || result?.status === 'processing';
  const shouldShowResult = result?.status === 'completed' && result.attraction_info;

  return (
    <View style={styles.container}>
      {shouldShowLoading && renderLoadingScreen()}
      
      {shouldShowResult && result && result.attraction_info && (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backIconButton} onPress={handleBack}>
              <ArrowLeft size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nekibuki</Text>
          </View>

          {/* Captured Photo - Prominently displayed at the top */}
          <View style={styles.capturedPhotoSection}>
            <Text style={styles.capturedPhotoTitle}>Your Photo</Text>
            <View style={styles.capturedPhotoContainer}>
              {photoUri && typeof photoUri === 'string' && photoUri.length > 0 ? (
                <>
                  <Image 
                    source={{ uri: photoUri }} 
                    style={styles.capturedPhoto}
                    onError={(error) => {
                      console.log('Image loading error:', error);
                      console.log('Failed URI:', photoUri);
                    }}
                    onLoad={() => console.log('Image loaded successfully from:', photoUri)}
                    resizeMode="cover"
                  />
                  <View style={styles.photoOverlay}>
                    <View style={styles.confidenceBadge}>
                      <Check size={14} color={theme.colors.text.inverse} />
                      <Text style={styles.confidenceBadgeText}>
                        {Math.floor(result.attraction_info.confidence)}% Match
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={32} color={theme.colors.text.tertiary} />
                  <Text style={styles.photoPlaceholderText}>
                    {photoUri ? 'Photo loading failed' : 'Photo not available'}
                  </Text>
                  {photoUri && (
                    <Text style={styles.debugText}>URI: {String(photoUri).substring(0, 50)}...</Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Attraction Title */}
            <View style={styles.titleSection}>
              <Text style={styles.attractionName}>{result.attraction_info.name}</Text>
              <Text style={styles.attractionLocation}>
                {result.attraction_info.location.city}, {result.attraction_info.location.country}
              </Text>
            </View>

            {/* Quick Facts */}
            <View style={styles.quickFactsSection}>
              <Text style={styles.sectionTitle}>Quick Facts</Text>
              <View style={styles.factsGrid}>
                {/* Always show location first */}
                <View style={styles.factItem}>
                  <Text style={styles.factLabel}>Location</Text>
                  <Text style={styles.factValue}>
                    {result.attraction_info.location.city}, {result.attraction_info.location.country}
                  </Text>
                </View>
                
                {/* Dynamically render quick facts from backend */}
                {result.attraction_info.quick_facts && result.attraction_info.quick_facts.map((fact, index) => (
                  <View key={index} style={styles.factItem}>
                    <Text style={styles.factLabel}>{fact.key}</Text>
                    <Text style={styles.factValue}>{fact.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* About Section */}
            <View style={styles.aboutSection}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{result.attraction_info.description}</Text>
              
              {result.attraction_info.historical_info && (
                <Text style={styles.historicalInfo}>{result.attraction_info.historical_info}</Text>
              )}

              {result.attraction_info.interesting_facts && result.attraction_info.interesting_facts.length > 0 && (
                <View style={styles.factsContainer}>
                  {result.attraction_info.interesting_facts.map((fact, index) => (
                    <View key={index} style={styles.interestingFactItem}>
                      <Text style={styles.factBullet}>•</Text>
                      <Text style={styles.factText}>{fact}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Fallback for when not loading and no result */}
      {!shouldShowLoading && !shouldShowResult && !isModalVisible && (
        <View style={styles.container}>
          <LinearGradient colors={theme.gradients.primary as any} style={styles.errorContainer}>
            <Text style={styles.errorText}>No results available</Text>
            <TouchableOpacity style={styles.backButtonSimple} onPress={handleBack}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      <FriendlyError 
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          modalOnClose();
        }}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.base,
    ...theme.shadows.sm,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  
  // Captured Photo Section - Prominently displayed
  capturedPhotoSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  capturedPhotoTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.base,
  },
  capturedPhotoContainer: {
    position: 'relative',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  capturedPhoto: {
    height: 220,
    width: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    height: 220,
    backgroundColor: theme.colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.sm,
  },
  debugText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  photoOverlay: {
    position: 'absolute',
    top: theme.spacing.base,
    right: theme.spacing.base,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    ...theme.shadows.sm,
  },
  confidenceBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
    marginLeft: theme.spacing.xs,
  },
  
  content: {
    paddingHorizontal: theme.spacing.lg,
  },
  titleSection: {
    marginBottom: theme.spacing['2xl'],
  },
  attractionName: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    lineHeight: theme.typography.lineHeight['3xl'],
  },
  attractionLocation: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  quickFactsSection: {
    marginBottom: theme.spacing['2xl'],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.base,
  },
  factsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  factItem: {
    width: '48%',
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.base,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.tertiary,
  },
  factLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  factValue: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  aboutSection: {
    marginBottom: theme.spacing['4xl'],
  },
  description: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.lineHeight.base,
    marginBottom: theme.spacing.base,
  },
  historicalInfo: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.lineHeight.base,
    marginBottom: theme.spacing.base,
  },
  factsContainer: {
    marginTop: theme.spacing.base,
  },
  interestingFactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  factBullet: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.accent,
    marginRight: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  factText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.lineHeight.base,
  },
  bottomActions: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.secondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.tertiary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.base,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    marginHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.tertiary,
  },
  actionButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    marginHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.accent,
  },
  saveButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.inverse,
    marginLeft: theme.spacing.sm,
  },
  askButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  askButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
  },
  
  // Loading screen styles
  loadingGradient: {
    flex: 1,
  },
  loadingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  loadingHeaderTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.base,
  },

  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: screenHeight * 0.1,
  },
  pagoda: {
    width: screenWidth * 0.6,
    height: screenHeight * 0.25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  steps: {
    width: 120,
    height: 60,
    backgroundColor: theme.colors.overlay.light,
    borderRadius: theme.borderRadius.base,
    marginBottom: theme.spacing.base,
  },
  pagodaBase: {
    width: 100,
    height: 40,
    backgroundColor: theme.colors.overlay.medium,
    borderRadius: theme.borderRadius.sm,
  },
  pagodaRoof: {
    width: 120,
    height: 20,
    backgroundColor: theme.colors.overlay.light,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  pagodaPillars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 80,
    paddingHorizontal: theme.spacing.base,
  },
  pillar: {
    width: 8,
    height: 30,
    backgroundColor: theme.colors.overlay.light,
    borderRadius: theme.borderRadius.sm,
  },
  trees: {
    position: 'absolute',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
  },
  tree: {
    width: 25,
    height: 60,
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.md,
    opacity: 0.7,
  },
  treeLeft: {},
  treeRight: {},
  loadingContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
  },
  loadingTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing['3xl'],
    gap: theme.spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
  },
  progressSection: {
    marginBottom: theme.spacing['2xl'],
  },
  progressLabel: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.tertiary,
    borderRadius: theme.borderRadius.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.sm,
  },
  progressText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    minWidth: 40,
  },
  funFactContainer: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.tertiary,
    ...theme.shadows.sm,
  },
  funFactLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.accent,
    marginBottom: theme.spacing.sm,
  },
  funFactText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.lineHeight.sm,
  },
  cancelButton: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    paddingVertical: theme.spacing.base,
    paddingHorizontal: theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.overlay.dark,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['4xl'],
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.base,
    marginBottom: theme.spacing.xl,
  },
  errorActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  retryButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
  },
  backButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.secondary,
  },
  backButtonSimple: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.tertiary,
    backgroundColor: theme.colors.secondary,
  },
}); 