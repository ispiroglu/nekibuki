import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, MapPin, Heart, TrendingUp, User } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const recentDiscoveries = [
  {
    id: 1,
    title: 'Eiffel Tower',
    location: 'Paris, France',
    time: '2 hours ago',
    image: 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800',
    likes: 124,
  },
  {
    id: 2,
    title: 'Colosseum',
    location: 'Rome, Italy',
    time: '1 day ago',
    image: 'https://images.pexels.com/photos/2290753/pexels-photo-2290753.jpeg?auto=compress&cs=tinysrgb&w=800',
    likes: 89,
  },
  {
    id: 3,
    title: 'Statue of Liberty',
    location: 'New York, USA',
    time: '3 days ago',
    image: 'https://images.pexels.com/photos/64271/queen-of-liberty-statue-of-liberty-new-york-liberty-statue-64271.jpeg?auto=compress&cs=tinysrgb&w=800',
    likes: 156,
  },
];

const trending = [
  { id: 1, name: 'Notre Dame Cathedral', discoveries: 1247 },
  { id: 2, name: 'Big Ben', discoveries: 982 },
  { id: 3, name: 'Machu Picchu', discoveries: 856 },
];

export default function DiscoverPage() {
  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <User size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.greeting}>Good morning</Text>
              <Text style={styles.username}>Alex</Text>
            </View>
          </View>
        </Animated.View>

        {/* Recent Discoveries */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={18} color="#6B7280" />
            <Text style={styles.sectionTitle}>Recent Discoveries</Text>
          </View>
          
          {recentDiscoveries.map((item, index) => (
            <Animated.View 
              key={item.id} 
              entering={FadeInDown.delay(400 + index * 100)}
            >
              <TouchableOpacity style={styles.discoveryCard} activeOpacity={0.95}>
                <Image source={{ uri: item.image }} style={styles.cardImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.cardOverlay}
                >
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <View style={styles.cardMeta}>
                      <View style={styles.locationRow}>
                        <MapPin size={12} color="#FFFFFF" />
                        <Text style={styles.locationText}>{item.location}</Text>
                      </View>
                      <Text style={styles.timeText}>{item.time}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.likeButton}>
                    <Heart size={16} color="#FFFFFF" />
                    <Text style={styles.likeCount}>{item.likes}</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Trending */}
        <Animated.View entering={FadeInDown.delay(600)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color="#6B7280" />
            <Text style={styles.sectionTitle}>Trending</Text>
          </View>
          
          {trending.map((item, index) => (
            <Animated.View 
              key={item.id} 
              entering={FadeInDown.delay(700 + index * 100)}
            >
              <TouchableOpacity style={styles.trendingItem} activeOpacity={0.7}>
                <View style={styles.trendingRank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.trendingInfo}>
                  <Text style={styles.trendingName}>{item.name}</Text>
                  <Text style={styles.trendingCount}>{item.discoveries.toLocaleString()} discoveries</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 40,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  greeting: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  username: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  discoveryCard: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardMeta: {
    gap: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginLeft: 4,
    opacity: 0.9,
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.7,
  },
  likeButton: {
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  trendingRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  trendingInfo: {
    flex: 1,
  },
  trendingName: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginBottom: 2,
  },
  trendingCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
});