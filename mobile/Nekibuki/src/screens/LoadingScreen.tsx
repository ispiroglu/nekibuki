import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import PhotoService, { RecognitionResult } from '../services/photoService';
import { RootStackParamList } from '../types';

type LoadingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Loading'>;
type LoadingScreenRouteProp = RouteProp<RootStackParamList, 'Loading'>;

const { width } = Dimensions.get('window');

const LoadingScreen: React.FC = () => {
  const navigation = useNavigation<LoadingScreenNavigationProp>();
  const route = useRoute<LoadingScreenRouteProp>();
  const { imageUri } = route.params;
  
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('Identifying landmarks');

  useEffect(() => {
    // Start the analysis process
    analyzePhoto();
  }, []);

  const analyzePhoto = async () => {
    try {
      const response = await PhotoService.uploadPhotoAndWaitForAnalysis(
        imageUri,
        (progress) => {
          setProgress(progress.progress);
        },
        (status, attempt) => {
          setCurrentStatus(status);
        }
      );

      if (response.success && response.data) {
        // Navigate to result screen
        navigation.replace('Result', { result: response.data, imageUri });
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      // Navigate back to main screen on error
      navigation.goBack();
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 2;
        if (newProgress >= 100) {
          clearInterval(interval);
          return 100;
        }
        
        // Update status based on progress
        if (newProgress < 30) {
          setCurrentStatus('Identifying landmarks');
        } else if (newProgress < 60) {
          setCurrentStatus('Analyzing architecture');
        } else if (newProgress < 90) {
          setCurrentStatus('Gathering information');
        } else {
          setCurrentStatus('Almost done');
        }
        
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
            <Ionicons name="chevron-back" size={16} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nekibuki</Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={styles.main}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image 
              source={{ uri: imageUri }} 
              style={styles.imagePreview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image" size={64} color={Colors.textTertiary} />
            </View>
          )}
        </View>

        {/* Processing Content */}
        <View style={styles.contentContainer}>
          {/* Status */}
          <View style={styles.statusContainer}>
            <Text style={styles.processingTitle}>Processing your photo...</Text>
            <Text style={styles.processingSubtitle}>Hang tight, we're analyzing your image.</Text>
          </View>

          {/* Progress Dots */}
          <View style={styles.progressDotsContainer}>
            {[0, 1, 2].map((index) => (
              <View 
                key={index}
                style={[
                  styles.progressDot,
                  { 
                    opacity: (progress + index * 20) % 60 > 30 ? 1 : 0.3,
                    backgroundColor: Colors.textTertiary
                  }
                ]} 
              />
            ))}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelContainer}>
              <Text style={styles.progressLabel}>{currentStatus}</Text>
              <Text style={styles.progressPercent}>{Math.min(progress, 100)}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${Math.min(progress, 100)}%` }
                ]} 
              />
            </View>
          </View>

          {/* Fun Fact */}
          <View style={styles.funFactContainer}>
            <Text style={styles.funFactText}>
              <Text style={styles.funFactLabel}>Fun Fact: </Text>
              The Eiffel Tower can be 15 cm taller during the summer due to thermal expansion!
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <SafeAreaView style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    backgroundColor: Colors.surface,
    ...Shadows.small,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.subtitle,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Compensate for back button
  },
  main: {
    flex: 1,
  },
  imageContainer: {
    height: 292,
    backgroundColor: '#E5E7EB', // Placeholder background
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.xl,
  },
  statusContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  processingTitle: {
    fontFamily: 'Spline Sans',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: '#1E293B',
    textAlign: 'center',
  },
  processingSubtitle: {
    fontFamily: 'Spline Sans',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  progressDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: Spacing.xl,
  },
  progressDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  progressSection: {
    gap: Spacing.sm,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: 'Spline Sans',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#475569',
  },
  progressPercent: {
    fontFamily: 'Spline Sans',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#475569',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.textTertiary,
    borderRadius: 6,
  },
  funFactContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 17,
  },
  funFactText: {
    fontFamily: 'Spline Sans',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: '#334155',
    textAlign: 'center',
  },
  funFactLabel: {
    fontWeight: '700',
  },
  footer: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  cancelButton: {
    backgroundColor: Colors.textTertiary,
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Spline Sans',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: Colors.surface,
  },
});

export default LoadingScreen; 