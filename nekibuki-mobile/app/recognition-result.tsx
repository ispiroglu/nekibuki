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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Clock, Star, ArrowLeft, RefreshCw, Check, Share, Bookmark, Camera } from 'lucide-react-native';
import apiService, { RecognitionResult } from '../services/api';

export default function RecognitionResultScreen() {
  const { sessionId, photoUri } = useLocalSearchParams<{ sessionId: string; photoUri?: string }>();
  const router = useRouter();
  const [pollingEnabled, setPollingEnabled] = useState(true);

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
  });

  // Stop polling when processing is complete
  useEffect(() => {
    if (result && (result.status === 'completed' || result.status === 'failed')) {
      setPollingEnabled(false);
    }
  }, [result]);

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

  if (!sessionId) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#F8FAFC', '#FFFFFF']} style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid session ID</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  if (isLoading && !result) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#F8FAFC', '#FFFFFF']} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Analyzing your photo...</Text>
          <Text style={styles.loadingSubtext}>This may take a few moments</Text>
        </LinearGradient>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#F8FAFC', '#FFFFFF']} style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error.message}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <RefreshCw size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (result?.status === 'processing') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#F8FAFC', '#FFFFFF']} style={styles.processingContainer}>
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.processingTitle}>Processing your photo</Text>
            <Text style={styles.processingText}>
              Our AI is analyzing the image to identify landmarks and attractions
            </Text>
            <View style={styles.processingInfo}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.processingInfoText}>
                Session: {sessionId?.slice(0, 8)}...
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.cancelButton} onPress={handleBack}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  if (result?.status === 'failed' || result?.error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#F8FAFC', '#FFFFFF']} style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Recognition Failed</Text>
          <Text style={styles.errorText}>
            {result.error?.message || 'Unable to identify the attraction in your photo'}
          </Text>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
              <Text style={styles.retryButtonText}>Take Another Photo</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (result?.status === 'completed' && result.attraction_info) {
    const attraction = result.attraction_info;

    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backIconButton} onPress={handleBack}>
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nekibuki</Text>
          </View>

          {/* Attraction Image */}
          <View style={styles.imageContainer}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.attractionImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>Attraction Image</Text>
              </View>
            )}
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Attraction Title and Confidence */}
            <View style={styles.titleSection}>
              <Text style={styles.attractionName}>{attraction.name}</Text>
              <View style={styles.confidenceContainer}>
                <Check size={16} color="#10B981" />
                <Text style={styles.confidenceText}>
                  {Math.round(attraction.confidence)}% Confidence
                </Text>
              </View>
            </View>

            {/* Quick Facts */}
            <View style={styles.quickFactsSection}>
              <Text style={styles.sectionTitle}>Quick Facts</Text>
              <View style={styles.factsGrid}>
                {/* Always show location first */}
                <View style={styles.factItem}>
                  <Text style={styles.factLabel}>Location</Text>
                  <Text style={styles.factValue}>
                    {attraction.location.city}, {attraction.location.country}
                  </Text>
                </View>
                
                {/* Dynamically render quick facts from backend */}
                {attraction.quick_facts && attraction.quick_facts.map((fact, index) => (
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
              <Text style={styles.description}>{attraction.description}</Text>
              
              {attraction.historical_info && (
                <Text style={styles.historicalInfo}>{attraction.historical_info}</Text>
              )}

              {attraction.interesting_facts && attraction.interesting_facts.length > 0 && (
                <View style={styles.factsContainer}>
                  {attraction.interesting_facts.map((fact, index) => (
                    <Text key={index} style={styles.factText}>
                      {fact}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleRetake}>
              <Camera size={20} color="#6B7280" />
              <Text style={styles.actionButtonText}>Retake</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Share size={20} color="#6B7280" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Bookmark size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.askButton} onPress={handleAskNekibuki}>
            <Text style={styles.askButtonText}>Ask Nekibuki</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F8FAFC', '#FFFFFF']} style={styles.errorContainer}>
        <Text style={styles.errorText}>No results available</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  imageContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attractionImage: {
    height: 200,
    width: '100%',
    borderRadius: 12,
    resizeMode: 'cover',
  },
  imagePlaceholderText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  content: {
    paddingHorizontal: 20,
  },
  titleSection: {
    marginBottom: 24,
  },
  attractionName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 8,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
    marginLeft: 8,
  },
  quickFactsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  factsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  factItem: {
    width: '48%',
    marginBottom: 16,
  },
  factLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  factValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  aboutSection: {
    marginBottom: 40,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  historicalInfo: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  factsContainer: {
    marginTop: 16,
  },
  factText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 24,
    marginBottom: 12,
  },
  bottomActions: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 8,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  askButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  askButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  processingContent: {
    alignItems: 'center',
  },
  processingTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 16,
    textAlign: 'center',
  },
  processingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  processingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  processingInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 8,
  },
  cancelButton: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
}); 