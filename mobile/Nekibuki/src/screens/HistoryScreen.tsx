import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

interface HistoryItem {
  id: string;
  name: string;
  time: string;
  date: string;
}

interface HistoryScreenProps {
  onBack?: () => void;
  onItemPress?: (item: HistoryItem) => void;
}

const mockHistoryData: HistoryItem[] = [
  {
    id: '1',
    name: 'Eiffel Tower',
    time: '12:30 PM',
    date: 'today',
  },
  {
    id: '2',
    name: 'Louvre Museum',
    time: '10:15 AM',
    date: 'today',
  },
  {
    id: '3',
    name: 'Arc de Triomphe',
    time: '3:45 PM',
    date: 'yesterday',
  },
  {
    id: '4',
    name: 'Notre-Dame Cathedral',
    time: '1:20 PM',
    date: 'yesterday',
  },
  {
    id: '5',
    name: 'Sacre-Coeur Basilica',
    time: '11:00 AM',
    date: 'yesterday',
  },
];

const HistoryScreen: React.FC<HistoryScreenProps> = ({ onBack, onItemPress }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const groupedData = mockHistoryData.reduce((acc, item) => {
    const section = item.date === 'today' ? 'Today' : 'Yesterday';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(item);
    return acc;
  }, {} as Record<string, HistoryItem[]>);

  const filteredData = Object.entries(groupedData).reduce((acc, [section, items]) => {
    const filtered = items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[section] = filtered;
    }
    return acc;
  }, {} as Record<string, HistoryItem[]>);

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => onItemPress?.(item)}
    >
      <View style={styles.historyItemContent}>
        <Text style={styles.historyItemName}>{item.name}</Text>
        <Text style={styles.historyItemTime}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>History</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <View style={styles.searchInputContainer}>
              <View style={styles.searchIconContainer}>
                <Ionicons name="search" size={24} color={Colors.textTertiary} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search history"
                placeholderTextColor={Colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
        </View>

        {/* History List */}
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {Object.entries(filteredData).map(([section, items]) => (
            <View key={section} style={styles.section}>
              {/* Section Header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section}</Text>
              </View>

              {/* Section Items */}
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.historyItem}
                  onPress={() => onItemPress?.(item)}
                >
                  <View style={styles.historyItemContent}>
                    <Text style={styles.historyItemName}>{item.name}</Text>
                    <Text style={styles.historyItemTime}>{item.time}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {Object.keys(filteredData).length === 0 && searchQuery && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No results found for "{searchQuery}"</Text>
            </View>
          )}
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
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitleContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  headerTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
    color: '#1C0D14',
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    height: 48,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2E8ED',
    borderRadius: BorderRadius.md,
  },
  searchIconContainer: {
    paddingLeft: Spacing.md,
    height: 24,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.surface,
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
  historyItem: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  historyItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyItemName: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    color: '#1C0D14',
    flex: 1,
  },
  historyItemTime: {
    fontFamily: 'Space Grotesk',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    color: Colors.textTertiary,
    marginLeft: Spacing.md,
  },
  emptyState: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default HistoryScreen; 