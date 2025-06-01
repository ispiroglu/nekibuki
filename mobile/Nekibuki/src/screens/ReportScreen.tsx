import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

interface ReportScreenProps {
  onBack?: () => void;
  onRetake?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onAskNekibuki?: () => void;
  landmark?: {
    name: string;
    confidence: number;
    location: string;
    style: string;
    capacity: string;
    constructionPeriod: string;
    openingDate: string;
    unescoSite: string;
    description: string[];
  };
}

const { width } = Dimensions.get('window');

const defaultLandmark = {
  name: 'The Colosseum',
  confidence: 95,
  location: 'Rome, Italy',
  style: 'Roman Amphitheater',
  capacity: '50,000 spectators',
  constructionPeriod: '70-80 AD',
  openingDate: '80 AD',
  unescoSite: 'Yes',
  description: [
    'The Colosseum, also known as the Flavian Amphitheatre, is an elliptical amphitheatre in the centre of the city of Rome, Italy. Built of concrete and sand, it is the largest amphitheatre ever built. It is considered one of the greatest works of Roman architecture and engineering.',
    'The Colosseum could hold an estimated 50,000 to 80,000 spectators, having an average audience of some 65,000; it was used for gladiatorial contests and public spectacles such as mock sea battles, animal hunts, executions, re-enactments of famous battles, and dramas based on Classical mythology.',
    'The Colosseum remained in use for over 400 years, with the last recorded games being held in the 6th century AD. It is now one of Rome\'s most popular tourist attractions and still has close connections with the Roman Catholic Church, as every Good Friday the Pope leads a torchlit "Way of the Cross" procession that starts in the area around the Colosseum.'
  ]
};

const ReportScreen: React.FC<ReportScreenProps> = ({ 
  onBack, 
  onRetake, 
  onShare, 
  onSave, 
  onAskNekibuki,
  landmark = defaultLandmark 
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={16} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nekibuki</Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View style={styles.imageContainer}>
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image" size={64} color={Colors.textSecondary} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Header Info */}
          <View style={styles.landmarkHeader}>
            <Text style={styles.landmarkName}>{landmark.name}</Text>
            <View style={styles.confidenceContainer}>
              <View style={styles.confidenceIcon}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              </View>
              <Text style={styles.confidenceText}>{landmark.confidence}% Confidence</Text>
            </View>
          </View>

          {/* Quick Facts */}
          <View style={styles.factsSection}>
            <Text style={styles.sectionTitle}>Quick Facts</Text>
            <View style={styles.factsContainer}>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>Location</Text>
                <Text style={styles.factValue}>{landmark.location}</Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>Architectural Style</Text>
                <Text style={styles.factValue}>{landmark.style}</Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>Capacity</Text>
                <Text style={styles.factValue}>{landmark.capacity}</Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>Construction Period</Text>
                <Text style={styles.factValue}>{landmark.constructionPeriod}</Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>Opening Date</Text>
                <Text style={styles.factValue}>{landmark.openingDate}</Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>UNESCO Site</Text>
                <Text style={styles.factValue}>{landmark.unescoSite}</Text>
              </View>
            </View>
          </View>

          {/* About Section */}
          <View style={styles.aboutSection}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.aboutContent}>
              {landmark.description.map((paragraph, index) => (
                <Text key={index} style={styles.aboutText}>
                  {paragraph}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <SafeAreaView style={styles.footer}>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={onRetake}>
            <View style={styles.actionButtonIcon}>
              <Ionicons name="camera" size={20} color="#334155" />
            </View>
            <Text style={styles.actionButtonText}>Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={onShare}>
            <View style={styles.actionButtonIcon}>
              <Ionicons name="share" size={20} color="#334155" />
            </View>
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <View style={styles.saveButtonIcon}>
              <Ionicons name="bookmark" size={20} color={Colors.surface} />
            </View>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.askButton} onPress={onAskNekibuki}>
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
    height: 230,
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
});

export default ReportScreen; 