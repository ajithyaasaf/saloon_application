import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SalonDto } from '@saloon/shared-types';
import { Icon } from '../../components/ui/Icon';
import { SalonCard } from '../../components/salon/SalonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { salonDiscoveryService } from '../../services/customer-domain.services';
import { useTheme } from '../../theme/ThemeContext';

export interface SearchScreenProps {
  onBack: () => void;
  onSelectSalon: (salon: SalonDto) => void;
}

const CATEGORIES = ['All Service', 'Barber', 'Hair Salon', 'Massage', 'Spa', 'Facial'];

export const SearchScreen: React.FC<SearchScreenProps> = ({ onBack, onSelectSalon }) => {
  const { colors, spacing, typography } = useTheme();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Service');
  const [salons, setSalons] = useState<SalonDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalons = async () => {
      try {
        const data = await salonDiscoveryService.getSalons();
        setSalons(data || []);
      } catch (err) {
        console.error('Failed to load salons in search:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSalons();
  }, []);

  const filteredSalons = salons.filter((s) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.slug?.toLowerCase().includes(q);
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Curved Purple Header Matching Screen 2 */}
      <View style={[styles.headerContainer, { backgroundColor: colors.primary }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.headerCircleBtn}>
            <Icon name="arrow-left" size={18} color="#181A20" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Appointment</Text>

          <TouchableOpacity activeOpacity={0.8} style={styles.headerCircleBtn}>
            <Icon name="bell" size={18} color="#181A20" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Search Bar inside Header */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchPill}>
            <Icon name="search" size={18} color="#8E94A8" style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Search Salon, Specialist"
              placeholderTextColor="#8E94A8"
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
            />
          </View>

          <TouchableOpacity activeOpacity={0.85} style={styles.filterButton}>
            <Icon name="sliders" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Category Pills Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.8}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isActive ? colors.primary : '#ECE7FE',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color: isActive ? '#FFFFFF' : '#5E6478',
                      fontWeight: isActive ? '700' : '600',
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Section Title */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[typography.heading2, { color: colors.textPrimary, fontWeight: '700' }]}>
            Top Rated Salons
          </Text>
          <TouchableOpacity activeOpacity={0.7} style={styles.seeAllButton}>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
              See All
            </Text>
            <Icon name="chevron-right" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Salons List */}
        {filteredSalons.length === 0 ? (
          <EmptyState
            title="No Results"
            description="Try searching with a different salon name or treatment keyword."
            iconName="search"
          />
        ) : (
          filteredSalons.map((salon) => (
            <SalonCard key={salon.id} salon={salon} onPress={() => onSelectSalon(salon)} />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4D6D',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchPill: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#181A20',
    paddingVertical: 0,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  pillsScroll: {
    gap: 10,
    marginBottom: 24,
  },
  categoryPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 13,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
});
