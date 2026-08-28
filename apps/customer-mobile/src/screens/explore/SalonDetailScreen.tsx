import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BranchDto, ReviewDto, SalonDto } from '@saloon/shared-types';
import { format12HourTimeRange } from '@saloon/shared-utils';
import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppBadge } from '../../components/ui/AppBadge';
import { Icon } from '../../components/ui/Icon';
import { ReviewCard } from '../../components/salon/ReviewCard';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { reviewService, salonDiscoveryService } from '../../services/customer-domain.services';
import { useTheme } from '../../theme/ThemeContext';
import { getSalonCoverImage } from '../../utils/salon-images';

export interface SalonDetailScreenProps {
  salonId: string;
  onBack: () => void;
  onBookNow: (salon: SalonDto, branch?: BranchDto) => void;
}

export const SalonDetailScreen: React.FC<SalonDetailScreenProps> = ({
  salonId,
  onBack,
  onBookNow,
}) => {
  const { colors, spacing, typography } = useTheme();
  const [salon, setSalon] = useState<SalonDto | null>(null);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<BranchDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const salonData = await salonDiscoveryService.getSalon(salonId);
        setSalon(salonData);

        let branchList: BranchDto[] = [];
        try {
          branchList = await salonDiscoveryService.getBranches(salonId);
          setBranches(branchList || []);
        } catch {
          setBranches([]);
        }

        if (branchList && branchList.length > 0) {
          setSelectedBranch(branchList[0]);
          try {
            const revs = await reviewService.getBranchReviews(branchList[0].id);
            setReviews(revs || []);
          } catch {
            setReviews([]);
          }
        }
      } catch (err) {
        console.error('Failed to load salon details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [salonId]);

  if (loading || !salon) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topHeader, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={onBack} style={styles.headerCircleBtn}>
            <Icon name="arrow-left" size={18} color="#181A20" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DetailsProduct</Text>
          <View style={{ width: 42 }} />
        </View>
        <View style={{ padding: 20 }}>
          <SkeletonLoader height={200} borderRadius={16} />
          <SkeletonLoader height={30} width="60%" style={{ marginTop: 20 }} />
          <SkeletonLoader height={80} borderRadius={16} style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Screen 3 Top Purple Header */}
      <View style={[styles.topHeader, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.headerCircleBtn}>
          <Icon name="arrow-left" size={18} color="#181A20" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>DetailsProduct</Text>

        <TouchableOpacity activeOpacity={0.8} style={styles.headerCircleBtn}>
          <Icon name="share-2" size={18} color="#181A20" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Visual Hero Image Container with Pagination Dots */}
        <View style={styles.heroBanner}>
          <Image
            source={getSalonCoverImage(salon)}
            style={styles.heroCoverImage}
            resizeMode="cover"
          />
          <View style={styles.carouselDotsRow}>
            <View style={[styles.dot, styles.dotActive, { backgroundColor: '#FFFFFF' }]} />
            <View style={[styles.dot, { backgroundColor: 'rgba(255,255,255,0.45)' }]} />
            <View style={[styles.dot, { backgroundColor: 'rgba(255,255,255,0.45)' }]} />
          </View>
        </View>

        {/* Salon Main Info */}
        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={[typography.heading1, styles.salonTitle, { color: colors.textPrimary }]}>
              {salon.name || 'Classic Cuts Barber Shop'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.statusBadgeText}>Open</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Icon name="map-pin" size={14} color={colors.primary} />
            <Text style={[typography.caption, styles.locationText, { color: colors.textSecondary }]}>
              {salon.slug ? `10 Oxford Street, Soho, ${salon.slug}` : '10 Oxford Street, Soho, London, UK'}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Icon name="star" size={14} color="#F59E0B" fill="#F59E0B" />
            <Text style={[typography.caption, styles.ratingText, { color: colors.textPrimary }]}>
              4.8 <Text style={{ color: colors.textSecondary }}>(292 Reviews)</Text>
            </Text>
          </View>
        </View>

        {/* 4 Quick Action Cards in Grid (Call, Message, Direction, Website) */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity activeOpacity={0.8} style={styles.actionCard}>
            <View style={styles.actionIconContainer}>
              <Icon name="phone" size={22} color={colors.primary} />
            </View>
            <Text style={[typography.micro, styles.actionLabel]}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} style={styles.actionCard}>
            <View style={styles.actionIconContainer}>
              <Icon name="message-square" size={22} color={colors.primary} />
            </View>
            <Text style={[typography.micro, styles.actionLabel]}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} style={styles.actionCard}>
            <View style={styles.actionIconContainer}>
              <Icon name="compass" size={22} color={colors.primary} />
            </View>
            <Text style={[typography.micro, styles.actionLabel]}>Direction</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} style={styles.actionCard}>
            <View style={styles.actionIconContainer}>
              <Icon name="globe" size={22} color={colors.primary} />
            </View>
            <Text style={[typography.micro, styles.actionLabel]}>Website</Text>
          </TouchableOpacity>
        </View>

        {/* Branches Selection */}
        <View style={styles.branchesSection}>
          <Text style={[typography.heading2, { color: colors.textPrimary, marginBottom: 12 }]}>
            Branch Locations
          </Text>
          {branches.map((b) => {
            const isSelected = selectedBranch?.id === b.id;
            return (
              <AppCard
                key={b.id}
                onPress={() => setSelectedBranch(b)}
                style={[
                  styles.branchCard,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: isSelected ? colors.primary : '#E8EAF3',
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.branchHeader}>
                  <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{b.name}</Text>
                  {isSelected && <AppBadge variant="primary">Selected</AppBadge>}
                </View>

                <View style={styles.metaRow}>
                  <Icon name="map-pin" size={13} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                    {b.addressLine1}, {b.city} - {b.postalCode}
                  </Text>
                </View>

                {b.operatingHours && b.operatingHours.length > 0 && b.operatingHours[0] && (
                  <View style={[styles.metaRow, { marginTop: 4 }]}>
                    <Icon name="clock" size={13} color={colors.primary} />
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      Hours: {format12HourTimeRange(b.operatingHours[0].openTime, b.operatingHours[0].closeTime)}
                    </Text>
                  </View>
                )}
              </AppCard>
            );
          })}
        </View>

        {/* Client Reviews */}
        <View style={styles.reviewsSection}>
          <Text style={[typography.heading2, { color: colors.textPrimary, marginBottom: 12 }]}>
            Client Reviews
          </Text>
          {reviews.length === 0 ? (
            <Text style={[typography.caption, { color: colors.textMuted, fontStyle: 'italic' }]}>
              No reviews left yet for this branch. Be the first to leave a review!
            </Text>
          ) : (
            reviews.map((r) => <ReviewCard key={r.id} review={r} />)
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: '#FFFFFF', borderTopColor: '#E8EAF3' }]}>
        <View style={styles.bottomBarInfo}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>Starting from</Text>
          <Text style={[typography.heading1, { color: colors.primary, fontWeight: '800' }]}>₹499</Text>
        </View>
        <AppButton
          title="Book Appointment"
          onPress={() => onBookNow(salon, selectedBranch || undefined)}
          size="lg"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  heroBanner: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#ECE7FE',
  },
  heroCoverImage: {
    width: '100%',
    height: '100%',
  },
  carouselDotsRow: {
    position: 'absolute',
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotActive: {
    width: 20,
    borderRadius: 4,
  },
  infoCard: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EAF3',
    shadowColor: '#6C3EE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  salonTitle: {
    fontSize: 19,
    fontWeight: '800',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  locationText: {
    fontSize: 13,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 16,
  },
  actionCard: {
    flex: 1,
    height: 74,
    backgroundColor: '#ECE7FE',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: '#181A20',
    fontWeight: '700',
    fontSize: 11,
  },
  branchesSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  branchCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
  },
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewsSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomBarInfo: {
    justifyContent: 'center',
  },
});