import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { RootStackParamList, RecognitionResult, AttractionInfo } from '../types';

type ReportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Result'>;
type ReportScreenRouteProp = RouteProp<RootStackParamList, 'Result'>;

const { width } = Dimensions.get('window');

const ReportScreen: React.FC = () => {
  const navigation = useNavigation<ReportScreenNavigationProp>();
  const route = useRoute<ReportScreenRouteProp>();
  const { result, imageUri } = route.params;

  const attractionInfo = result.attraction_info;

  // Helper function to format location
  const formatLocation = (location?: AttractionInfo['location']): string => {
    if (!location) return 'Unknown location';
    const parts = [location.city, location.region, location.country].filter(Boolean);
    return parts.join(', ');
  };

  // Helper function to split description into paragraphs
  const formatDescription = (description?: string): string[] => {
    if (!description) return ['No description available.'];
    // Split by double newlines or periods followed by space and capital letter
    const paragraphs = description
      .split(/\n\n|\. (?=[A-Z])/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    return paragraphs.length > 0 ? paragraphs : [description];
  };

  // Helper function to format interesting facts
  const formatInterestingFacts = (facts?: string[]): string[] => {
    if (!facts || facts.length === 0) return [];
    return facts.filter(fact => fact && fact.trim().length > 0);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleRetake = () => {
    navigation.navigate('Main');
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share functionality to be implemented');
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Save functionality to be implemented');
  };

  const handleAskNekibuki = () => {
    // TODO: Implement AI chat functionality
    console.log('Ask Nekibuki functionality to be implemented');
  };

  // Fallback data if no attraction info is available
  if (!attractionInfo) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>No attraction information available</Text>
        <TouchableOpacity style={styles.errorButton} onPress={handleBack}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={16} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nekibuki</Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image" size={64} color={Colors.textSecondary} />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Header Info */}
          <View style={styles.landmarkHeader}>
            <Text style={styles.landmarkName}>{attractionInfo.name}</Text>
            <View style={styles.confidenceContainer}>
              <View style={styles.confidenceIcon}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              </View>
              <Text style={styles.confidenceText}>{attractionInfo.confidence}% Confidence</Text>
            </View>
          </View>

          {/* Quick Facts */}
          <View style={styles.factsSection}>
            <Text style={styles.sectionTitle}>Quick Facts</Text>
            <View style={styles.factsContainer}>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>Location</Text>
                <Text style={styles.factValue}>{formatLocation(attractionInfo.location)}</Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>Confidence</Text>
                <Text style={styles.factValue}>{attractionInfo.confidence}%</Text>
              </View>
              {attractionInfo.significance && (
                <View style={styles.factRow}>
                  <Text style={styles.factLabel}>Significance</Text>
                  <Text style={styles.factValue}>{attractionInfo.significance}</Text>
                </View>
              )}
              {attractionInfo.historical_info && (
                <View style={styles.factRow}>
                  <Text style={styles.factLabel}>Historical Info</Text>
                  <Text style={styles.factValue}>{attractionInfo.historical_info}</Text>
                </View>
              )}
            </View>
          </View>

          {/* About Section */}
          <View style={styles.aboutSection}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.aboutContent}>
              {formatDescription(attractionInfo.description).map((paragraph, index) => (
                <Text key={index} style={styles.aboutText}>
                  {paragraph}
                </Text>
              ))}
            </View>
          </View>

          {/* Interesting Facts Section */}
          {formatInterestingFacts(attractionInfo.interesting_facts).length > 0 && (
            <View style={styles.aboutSection}>
              <Text style={styles.sectionTitle}>Interesting Facts</Text>
              <View style={styles.aboutContent}>
                {formatInterestingFacts(attractionInfo.interesting_facts).map((fact, index) => (
                  <Text key={index} style={styles.aboutText}>
                    • {fact}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <SafeAreaView style={styles.footer}>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleRetake}>
            <View style={styles.actionButtonIcon}>
              <Ionicons name="camera" size={20} color="#334155" />
            </View>
            <Text style={styles.actionButtonText}>Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <View style={styles.actionButtonIcon}>
              <Ionicons name="share" size={20} color="#334155" />
            </View>
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <View style={styles.saveButtonIcon}>
              <Ionicons name="bookmark" size={20} color={Colors.surface} />
            </View>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.askButton} onPress={handleAskNekibuki}>
          <View style={styles.askButtonIcon}>
            <Ionicons name="chatbubble-ellipses" size={14} color={Colors.surface} />
          </View>
          <Text style={styles.askButtonText}>Ask Nekibuki</Text>
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
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 25,
    letterSpacing: -0.5,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  imageContainer: {
    height: 256,
    backgroundColor: '#E5E7EB',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 23,
    gap: 23,
  },
  landmarkHeader: {
    gap: 45,
  },
  landmarkName: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.6,
    color: Colors.text,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceIcon: {
    paddingTop: 5,
  },
  confidenceText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: '#16A34A',
  },
  factsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22.5,
    letterSpacing: -0.45,
    color: Colors.text,
  },
  factsContainer: {
    // Remove fixed height to accommodate dynamic content
  },
  factRow: {
    flexDirection: 'row',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  factLabel: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    color: Colors.textSecondary,
    width: 167,
    paddingTop: 2,
  },
  factValue: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    color: Colors.text,
    flex: 1,
  },
  aboutSection: {
    gap: 11.375,
  },
  aboutContent: {
    gap: 15.4,
  },
  aboutText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22.75,
    color: '#334155',
  },
  footer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: Spacing.md,
    paddingTop: 17,
    paddingBottom: Spacing.xl,
    gap: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    height: 47.5,
    gap: 3.5,
  },
  actionButtonIcon: {
    paddingVertical: 4,
  },
  actionButtonText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: '#334155',
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.textTertiary,
    borderRadius: 12,
    paddingVertical: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    height: 47.5,
    gap: 3.5,
  },
  saveButtonIcon: {
    paddingVertical: 4,
  },
  saveButtonText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: Colors.surface,
    textAlign: 'center',
  },
  askButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.textTertiary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  askButtonIcon: {},
  askButtonText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: Colors.surface,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22.5,
    letterSpacing: -0.45,
    color: Colors.text,
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: Colors.textTertiary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  errorButtonText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: Colors.surface,
  },
});

export default ReportScreen; 