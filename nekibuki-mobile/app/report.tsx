import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, Share2, MapPin, Clock, Star, Users, Calendar, Bookmark } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import Animated, { FadeInUp, FadeInDown, SlideInRight } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Mock data for the attraction
const attractionData = {
  name: 'Eiffel Tower',
  location: 'Paris, France',
  rating: 4.9,
  visitors: '7 million annually',
  buildYear: '1889',
  height: '330 meters',
  description: 'The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France. It is named after the engineer Gustave Eiffel, whose company designed and built the tower.',
  history: 'Constructed from 1887 to 1889 as the entrance to the 1889 World\'s Fair, it was initially criticized by some of France\'s leading artists and intellectuals for its design, but it has become a global cultural icon of France and one of the most recognizable structures in the world.',
  facts: [
    'It was the world\'s tallest man-made structure until 1930',
    'The tower sways up to 7 cm in the wind',
    'It\'s painted every 7 years to prevent rust',
    'Lightning strikes the tower about 5 times per year',
  ],
  nearby: [
    { name: 'Trocadéro Gardens', distance: '0.3 km' },
    { name: 'Seine River', distance: '0.1 km' },
    { name: 'Champ de Mars', distance: '0.2 km' },
  ],
};

export default function ReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this amazing place I discovered with Nekibuki: ${attractionData.name} in ${attractionData.location}!`,
        title: `${attractionData.name} - Discovered with Nekibuki`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const toggleFavorite = () => {
    setIsFavorited(!isFavorited);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Animated.View entering={FadeInUp.delay(200)}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{attractionData.description}</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Star size={20} color="#FFB000" fill="#FFB000" />
                <Text style={styles.statValue}>{attractionData.rating}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statItem}>
                <Users size={20} color="#1976D2" />
                <Text style={styles.statValue}>{attractionData.visitors}</Text>
                <Text style={styles.statLabel}>Visitors</Text>
              </View>
              <View style={styles.statItem}>
                <Calendar size={20} color="#00695C" />
                <Text style={styles.statValue}>{attractionData.buildYear}</Text>
                <Text style={styles.statLabel}>Built</Text>
              </View>
            </View>
          </Animated.View>
        );
      
      case 'history':
        return (
          <Animated.View entering={FadeInUp.delay(200)}>
            <Text style={styles.sectionTitle}>Historical Background</Text>
            <Text style={styles.description}>{attractionData.history}</Text>
            
            <Text style={styles.sectionTitle}>Interesting Facts</Text>
            {attractionData.facts.map((fact, index) => (
              <View key={index} style={styles.factItem}>
                <View style={styles.factBullet} />
                <Text style={styles.factText}>{fact}</Text>
              </View>
            ))}
          </Animated.View>
        );
      
      case 'nearby':
        return (
          <Animated.View entering={FadeInUp.delay(200)}>
            <Text style={styles.sectionTitle}>Nearby Attractions</Text>
            {attractionData.nearby.map((place, index) => (
              <TouchableOpacity key={index} style={styles.nearbyItem} activeOpacity={0.7}>
                <View style={styles.nearbyIcon}>
                  <MapPin size={16} color="#1976D2" />
                </View>
                <View style={styles.nearbyInfo}>
                  <Text style={styles.nearbyName}>{place.name}</Text>
                  <Text style={styles.nearbyDistance}>{place.distance} away</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#FFFFFF']}
        style={styles.gradient}
      >
        {/* Header */}
        <Animated.View entering={SlideInRight.delay(100)} style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.actionButton, isFavorited && styles.favoriteActive]}
              onPress={toggleFavorite}
              activeOpacity={0.8}
            >
              <Heart 
                size={20} 
                color={isFavorited ? "#FFFFFF" : "#666"} 
                fill={isFavorited ? "#FFFFFF" : "none"}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Share2 size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Hero Section */}
          <Animated.View entering={FadeInUp.delay(300)} style={styles.heroSection}>
            <LinearGradient
              colors={['#1976D2', '#42A5F5']}
              style={styles.heroGradient}
            >
              <View style={styles.heroIcon}>
                <MapPin size={32} color="#FFFFFF" />
              </View>
            </LinearGradient>
            
            <Text style={styles.attractionName}>{attractionData.name}</Text>
            <View style={styles.locationRow}>
              <MapPin size={16} color="#666" />
              <Text style={styles.locationText}>{attractionData.location}</Text>
            </View>
          </Animated.View>

          {/* Quick Stats */}
          <Animated.View entering={FadeInUp.delay(400)} style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{attractionData.height}</Text>
              <Text style={styles.quickStatLabel}>Height</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{attractionData.buildYear}</Text>
              <Text style={styles.quickStatLabel}>Built</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{attractionData.rating}</Text>
              <Text style={styles.quickStatLabel}>Rating</Text>
            </View>
          </Animated.View>

          {/* Tab Navigation */}
          <Animated.View entering={FadeInDown.delay(500)} style={styles.tabContainer}>
            {['overview', 'history', 'nearby'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>

          {/* Tab Content */}
          <View style={styles.contentContainer}>
            {renderTabContent()}
          </View>

          {/* Action Button */}
          <Animated.View entering={FadeInUp.delay(700)} style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.saveButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#1976D2', '#1565C0']}
                style={styles.saveGradient}
              >
                <Bookmark size={20} color="#FFFFFF" />
                <Text style={styles.saveText}>Save to Collection</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteActive: {
    backgroundColor: '#F57C00',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIcon: {
    // Additional icon styling if needed
  },
  attractionName: {
    fontSize: 32,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Regular',
    marginLeft: 6,
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  activeTabText: {
    color: '#1976D2',
  },
  contentContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  factItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  factBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1976D2',
    marginTop: 8,
    marginRight: 12,
  },
  factText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
  },
  nearbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  nearbyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  nearbyInfo: {
    flex: 1,
  },
  nearbyName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginBottom: 4,
  },
  nearbyDistance: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  actionContainer: {
    marginTop: 20,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  saveGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  saveText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});