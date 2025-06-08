import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, MapPin, Calendar, Star } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const favorites = [
  {
    id: 1,
    name: 'Eiffel Tower',
    location: 'Paris, France',
    visitDate: 'March 15, 2024',
    rating: 4.9,
    description: 'Iron lattice tower and global cultural icon of France',
  },
  {
    id: 2,
    name: 'Colosseum',
    location: 'Rome, Italy',
    visitDate: 'March 10, 2024',
    rating: 4.8,
    description: 'Ancient amphitheater and UNESCO World Heritage Site',
  },
  {
    id: 3,
    name: 'Statue of Liberty',
    location: 'New York, USA',
    visitDate: 'February 28, 2024',
    rating: 4.7,
    description: 'Symbol of freedom and democracy',
  },
];

export default function FavoritesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FFF3E0', '#FFFFFF']}
        style={styles.gradient}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>
            <Heart size={32} color="#F57C00" fill="#F57C00" />
            <Text style={styles.title}>Your Favorites</Text>
            <Text style={styles.subtitle}>Places that captured your heart</Text>
          </Animated.View>

          {favorites.length > 0 ? (
            <View style={styles.favoritesContainer}>
              {favorites.map((item, index) => (
                <Animated.View 
                  key={item.id} 
                  entering={FadeInDown.delay(400 + index * 100)}
                >
                  <TouchableOpacity 
                    style={styles.favoriteCard}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#FFFFFF', '#FFF8F3']}
                      style={styles.cardGradient}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.cardIcon}>
                          <LinearGradient
                            colors={['#F57C00', '#FF8F00']}
                            style={styles.iconGradient}
                          >
                            <MapPin size={20} color="#FFFFFF" />
                          </LinearGradient>
                        </View>
                        <TouchableOpacity style={styles.heartButton}>
                          <Heart size={20} color="#F57C00" fill="#F57C00" />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <Text style={styles.cardDescription}>{item.description}</Text>
                      
                      <View style={styles.cardMeta}>
                        <View style={styles.locationRow}>
                          <MapPin size={14} color="#666" />
                          <Text style={styles.locationText}>{item.location}</Text>
                        </View>
                        
                        <View style={styles.visitRow}>
                          <Calendar size={14} color="#666" />
                          <Text style={styles.visitText}>{item.visitDate}</Text>
                        </View>
                        
                        <View style={styles.ratingRow}>
                          <Star size={14} color="#FFB000" fill="#FFB000" />
                          <Text style={styles.ratingText}>{item.rating}</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          ) : (
            <Animated.View entering={FadeInDown.delay(400)} style={styles.emptyState}>
              <Heart size={64} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptyText}>
                Start exploring and add places to your favorites by tapping the heart icon
              </Text>
            </Animated.View>
          )}
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
  title: {
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  favoritesContainer: {
    flex: 1,
  },
  favoriteCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardGradient: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  iconGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  cardMeta: {
    gap: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
    marginLeft: 6,
  },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
    marginLeft: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 40,
  },
});