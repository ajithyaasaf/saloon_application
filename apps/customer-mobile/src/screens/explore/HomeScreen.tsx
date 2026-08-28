import React, { useEffect, useState } from 'react';
import {
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SalonDto, ServiceCategoryDto } from '@saloon/shared-types';
import { AppCard } from '../../components/ui/AppCard';
import { AppBadge } from '../../components/ui/AppBadge';
import { AppButton } from '../../components/ui/AppButton';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon, IconName } from '../../components/ui/Icon';
import { SalonCard } from '../../components/salon/SalonCard';
import { catalogService, salonDiscoveryService } from '../../services/customer-domain.services';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';

export interface HomeScreenProps {
  onSelectSalon: (salon: SalonDto) => void;
  onSearchPress: () => void;
  onCategoryPress: (category: ServiceCategoryDto) => void;
  onFavoritesPress?: () => void;
  onNotificationsPress?: () => void;
}

interface ServiceCategoryMeta {
  id: string;
  name: string;
  iconName: IconName;
}

const DEFAULT_CATEGORY_METAS: ServiceCategoryMeta[] = [
  { id: '1', name: 'Haircut', iconName: 'scissors' },
  { id: '2', name: 'Shaving', iconName: 'feather' },
  { id: '3', name: 'Styling', iconName: 'sparkles' },
  { id: '4', name: 'Coloring', iconName: 'palette' },
  { id: '5', name: 'Make Up', iconName: 'brush' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectSalon,
  onSearchPress,
  onCategoryPress,
  onFavoritesPress,
  onNotificationsPress,
}) => {
  const { user } = useAuth();
  const { colors, typography, spacing, borderRadius } = useTheme();
  const [salons, setSalons] = useState<SalonDto[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHomeData = async () => {
    try {
      const [salonList, categoryList] = await Promise.all([
        salonDiscoveryService.getSalons(),
        catalogService.getCategories(),
      ]);
      setSalons(salonList || []);
      setCategories(categoryList || []);
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const getCategoryIcon = (categoryName: string): IconName => {
    const lower = categoryName.toLowerCase();
    if (lower.includes('hair') || lower.includes('cut')) return 'scissors';
    if (lower.includes('shav') || lower.includes('beard')) return 'feather';
    if (lower.includes('style') || lower.includes('spa')) return 'sparkles';
    if (lower.includes('color') || lower.includes('dye')) return 'palette';
    if (lower.includes('make') || lower.includes('face') || lower.includes('skin')) return 'brush';
    return 'sparkles';
  };

  const displayedCategories = categories.length > 0
    ? categories.map(c => ({ id: c.id, name: c.name, iconName: getCategoryIcon(c.name) }))
    : DEFAULT_CATEGORY_METAS;

  const displayName = user?.firstName || 'Valued Guest';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ==========================================================================
            Top Curved Hero Header (Royal Purple Banner)
           ========================================================================== */}
        <View style={[styles.heroHeader, { backgroundColor: colors.primary }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.userInfoRow}>
              <View style={styles.avatarCircle}>
                <Icon name="user" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.userGreetingCol}>
                <Text style={[typography.caption, styles.greetingSub]}>Hello {displayName}</Text>
                <Text style={[typography.heading2, styles.greetingTitle]}>Good Morning</Text>
              </View>
            </View>

            <View style={styles.heroActionsRow}>
              <TouchableOpacity
                onPress={onFavoritesPress || onSearchPress}
                activeOpacity={0.8}
                style={styles.heroActionButton}
              >
                <Icon name="heart" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onNotificationsPress}
                activeOpacity={0.8}
                style={styles.heroActionButton}
              >
                <Icon name="bell" size={20} color="#FFFFFF" />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Input Bar with Filter Button */}
          <View style={styles.searchBarRow}>
            <TouchableOpacity
              onPress={onSearchPress}
              activeOpacity={0.85}
              style={styles.searchInputPill}
            >
              <Icon name="search" size={20} color="#8E94A8" style={styles.searchIcon} />
              <Text style={styles.searchPlaceholder}>Search Salon, Specialist, Service...</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSearchPress}
              activeOpacity={0.85}
              style={styles.filterButton}
            >
              <Icon name="sliders" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ==========================================================================
            Special Offers Promotional Card (40% Off Banner)
           ========================================================================== */}
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[typography.heading2, { color: colors.textPrimary, fontWeight: '700' }]}>
              Special Offers
            </Text>
            <TouchableOpacity onPress={onSearchPress} activeOpacity={0.7} style={styles.seeAllButton}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                See All
              </Text>
              <Icon name="chevron-right" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onSearchPress}
            activeOpacity={0.9}
            style={styles.offerBannerWrapper}
          >
            <Image
              source={require('../../../assets/banners/promotional-banner-1.png')}
              style={styles.offerBannerAbsoluteImage}
              resizeMode="cover"
            />

            <View style={styles.offerContentContainer}>
              <View style={styles.offerBadgeRow}>
                <View style={styles.justForYouBadge}>
                  <Text style={[typography.micro, styles.justForYouText]}>Just For You</Text>
                </View>
                <View style={styles.discountBadge}>
                  <Text style={[typography.micro, styles.discountBadgeText]}>40% Off</Text>
                </View>
              </View>

              <Text
                style={[
                  typography.heading2,
                  styles.offerTitle,
                ]}
                numberOfLines={2}
              >
                Get Special Discount
              </Text>
              <Text
                style={[
                  typography.caption,
                  styles.offerSubtitle,
                ]}
                numberOfLines={2}
              >
                Up to 40% on your next grooming session
              </Text>

              <View style={styles.bookNowButton}>
                <Text style={[typography.caption, styles.bookNowText]}>Book Now</Text>
                <View style={styles.bookNowIconCircle}>
                  <Icon name="arrow-right" size={12} color={colors.primary} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ==========================================================================
            Services Category Icons (Circular Light Lavender Pods)
           ========================================================================== */}
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[typography.heading2, { color: colors.textPrimary, fontWeight: '700' }]}>
              Services
            </Text>
            <TouchableOpacity onPress={onSearchPress} activeOpacity={0.7} style={styles.seeAllButton}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                See All
              </Text>
              <Icon name="chevron-right" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {displayedCategories.map((cat, idx) => (
              <TouchableOpacity
                key={cat.id || idx}
                onPress={() => onCategoryPress(cat as any)}
                activeOpacity={0.75}
                style={styles.categoryItemCol}
              >
                <View style={[styles.categoryCircle, { backgroundColor: '#F4F0FF' }]}>
                  <Icon name={cat.iconName} size={24} color={colors.primary} />
                </View>
                <Text style={[typography.caption, styles.categoryLabel, { color: colors.textPrimary }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ==========================================================================
            Top Rated Salons Nearby
           ========================================================================== */}
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[typography.heading2, { color: colors.textPrimary, fontWeight: '700' }]}>
              Top Rated Salons
            </Text>
            <TouchableOpacity onPress={onSearchPress} activeOpacity={0.7} style={styles.seeAllButton}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                See All
              </Text>
              <Icon name="chevron-right" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.skeletonCol}>
              {[1, 2, 3].map((i) => (
                <SkeletonLoader key={i} height={180} borderRadius={16} style={{ marginBottom: 16 }} />
              ))}
            </View>
          ) : salons.length === 0 ? (
            <EmptyState
              title="No Salons Found"
              description="We couldn't find any verified salons in your location yet."
              iconName="map-pin"
            />
          ) : (
            salons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} onPress={() => onSelectSalon(salon)} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroHeader: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  userGreetingCol: {
    justifyContent: 'center',
  },
  greetingSub: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 13,
  },
  greetingTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroActionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
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
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputPill: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    color: '#8E94A8',
    fontSize: 14,
    flex: 1,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  sectionWrapper: {
    marginTop: 24,
    paddingHorizontal: 20,
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
  offerBannerWrapper: {
    height: 180,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#6C3EE8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  offerBannerAbsoluteImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  offerContentContainer: {
    maxWidth: '62%',
    height: '100%',
    padding: 14,
    justifyContent: 'space-between',
  },
  offerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  justForYouBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  justForYouText: {
    color: '#6C3EE8',
    fontWeight: '700',
  },
  discountBadge: {
    backgroundColor: '#FF4D6D',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  offerTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  offerSubtitle: {
    color: 'rgba(255, 255, 255, 0.92)',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bookNowButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 5,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  bookNowText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bookNowIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesScrollContent: {
    gap: 16,
    paddingRight: 10,
  },
  categoryItemCol: {
    alignItems: 'center',
    gap: 8,
  },
  categoryCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C3EE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  skeletonCol: {
    gap: 16,
  },
});
