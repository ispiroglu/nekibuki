import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Clock, Star, TrendingUp } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const recentDiscoveries = [
  {
    id: 1,
    name: 'Eiffel Tower',
    location: 'Paris, France',
    time: '2 hours ago',
    rating: 4.9,
    image: 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 2,
    name: 'Colosseum',
    location: 'Rome, Italy',
    time: '1 day ago',
    rating: 4.8,
    image: 'https://images.pexels.com/photos/2290753/pexels-photo-2290753.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

const trending = [
  { id: 1, name: 'Notre Dame Cathedral', discoveries: 1247 },
  { id: 2, name: 'Big Ben', discoveries: 982 },
  { id: 3, name: 'Statue of Liberty', discoveries: 856 },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E3F2FD', '#FFFFFF']}
        style={styles.gradient}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.appName}>Nekibuki</Text>
            <Text style={styles.subtitle}>Discover the world through your lens</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color="#1976D2" />
              <Text style={styles.sectionTitle}>Recent Discoveries</Text>
            </View>
            
            {recentDiscoveries.map((item, index) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.discoveryCard}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F8F9FA']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <View style={styles.locationRow}>
                        <MapPin size={14} color="#666" />
                        <Text style={styles.locationText}>{item.location}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.timeText}>{item.time}</Text>
                        <View style={styles.ratingRow}>
                          <Star size={14} color="#FFB000" fill="#FFB000" />
                          <Text style={styles.ratingText}>{item.rating}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.cardImageContainer}>
                      <LinearGradient
                        colors={['#E3F2FD', '#1976D2']}
                        style={styles.imagePlaceholder}
                      >
                        <MapPin size={24} color="#FFFFFF" />
                      </LinearGradient>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(600)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={20} color="#00695C" />
              <Text style={styles.sectionTitle}>Trending Attractions</Text>
            </View>
            
            {trending.map((item, index) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.trendingItem}
                activeOpacity={0.7}
              >
                <View style={styles.trendingNumber}>
                  <Text style={styles.trendingNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.trendingInfo}>
                  <Text style={styles.trendingName}>{item.name}</Text>
                  <Text style={styles.trendingCount}>{item.discoveries} discoveries</Text>
                </View>
              </TouchableOpacity>
            ))}
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
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  appName: {
    fontSize: 36,
    fontFamily: 'Inter-SemiBold',
    color: '#1976D2',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginLeft: 8,
  },
  discoveryCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardGradient: {
    padding: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Inter-Regular',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginLeft: 4,
  },
  cardImageContainer: {
    marginLeft: 16,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingItem: {
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
  trendingNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  trendingNumberText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#00695C',
  },
  trendingInfo: {
    flex: 1,
  },
  trendingName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginBottom: 4,
  },
  trendingCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
});