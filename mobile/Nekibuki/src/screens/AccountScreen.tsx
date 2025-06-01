import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface AccountScreenProps {
  onBack?: () => void;
  onManagePlan?: () => void;
  onPurchasePlan?: () => void;
}

const AccountScreen: React.FC<AccountScreenProps> = ({ 
  onBack, 
  onManagePlan, 
  onPurchasePlan 
}) => {
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Ionicons name="chevron-back" size={24} color="#1C0D14" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Account</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* User Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileContainer}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  {/* Avatar placeholder - in real app this would be an image */}
                  <View style={styles.avatarPlaceholder} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>Ethan</Text>
                  <Text style={styles.userPlan}>Premium</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Plan Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Plan</Text>
          </View>

          {/* Current Plan */}
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemIcon}>
              <Ionicons name="star" size={24} color="#1C0D14" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Premium</Text>
              <Text style={styles.menuItemSubtitle}>Current plan</Text>
            </View>
          </TouchableOpacity>

          {/* Manage Plan */}
          <TouchableOpacity style={styles.menuItem} onPress={onManagePlan}>
            <View style={styles.menuItemIcon}>
              <Ionicons name="settings" size={24} color="#1C0D14" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Manage plan</Text>
              <Text style={styles.menuItemSubtitle}>Manage your plan</Text>
            </View>
          </TouchableOpacity>

          {/* Purchase Plan */}
          <TouchableOpacity style={styles.menuItem} onPress={onPurchasePlan}>
            <View style={styles.menuItemIcon}>
              <Ionicons name="card" size={24} color="#1C0D14" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Purchase plan</Text>
              <Text style={styles.menuItemSubtitle}>Purchase a new plan</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingRight: 48, // Compensate for back button
  },
  headerTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
    color: '#1C0D14',
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  profileSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  profileContainer: {
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontFamily: 'Space Grotesk',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    color: '#1C0D14',
    textAlign: 'center',
  },
  userPlan: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  sectionHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
    color: '#1C0D14',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  menuItemIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F2E8ED',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    color: '#1C0D14',
  },
  menuItemSubtitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    color: Colors.textTertiary,
  },
});

export default AccountScreen; 