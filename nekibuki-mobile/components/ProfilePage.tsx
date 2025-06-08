import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Settings, Heart, MapPin, Bell, Shield, CircleHelp as HelpCircle, LogOut, ChevronRight, Camera, Award } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useState } from 'react';

const stats = [
  { label: 'Discoveries', value: '47', icon: MapPin },
  { label: 'Favorites', value: '23', icon: Heart },
  { label: 'Photos', value: '156', icon: Camera },
];

const menuItems = [
  { id: 1, title: 'Notifications', icon: Bell, hasSwitch: true },
  { id: 2, title: 'Privacy & Security', icon: Shield, hasChevron: true },
  { id: 3, title: 'Help & Support', icon: HelpCircle, hasChevron: true },
  { id: 4, title: 'Settings', icon: Settings, hasChevron: true },
];

export default function ProfilePage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Profile Header */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.profileHeader}>
          <LinearGradient
            colors={['#2563EB', '#1D4ED8']}
            style={styles.avatarGradient}
          >
            <User size={32} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.profileName}>Alex Johnson</Text>
          <Text style={styles.profileEmail}>alex.johnson@email.com</Text>
          <View style={styles.badgeContainer}>
            <Award size={14} color="#F59E0B" />
            <Text style={styles.badgeText}>Explorer</Text>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={stat.label} style={styles.statItem}>
              <View style={styles.statIcon}>
                <stat.icon size={18} color="#2563EB" />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <MapPin size={16} color="#10B981" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Discovered Eiffel Tower</Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
          </View>
          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Heart size={16} color="#EF4444" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Added to favorites</Text>
              <Text style={styles.activityTime}>1 day ago</Text>
            </View>
          </View>
        </Animated.View>

        {/* Menu Items */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          {menuItems.map((item, index) => (
            <Animated.View 
              key={item.id} 
              entering={FadeInDown.delay(600 + index * 100)}
            >
              <TouchableOpacity 
                style={styles.menuItem} 
                activeOpacity={0.7}
                disabled={item.hasSwitch}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIcon}>
                    <item.icon size={18} color="#6B7280" />
                  </View>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                </View>
                {item.hasSwitch && (
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
                    thumbColor="#FFFFFF"
                  />
                )}
                {item.hasChevron && (
                  <ChevronRight size={18} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(800)} style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} activeOpacity={0.7}>
            <LogOut size={18} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* App Version */}
        <Animated.View entering={FadeInDown.delay(900)} style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#92400E',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  versionText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});