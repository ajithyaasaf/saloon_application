import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gender, ServiceCategoryDto, ServiceDto } from '@saloon/shared-types';
import { formatDuration, formatINR } from '@saloon/shared-utils';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { Icon } from '../../components/ui/Icon';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { catalogService } from '../../services/customer-domain.services';
import { useTheme } from '../../theme/ThemeContext';

export interface ServiceMenuScreenProps {
  salonId: string;
  onBack: () => void;
  onContinueToSlot: (selectedServices: ServiceDto[]) => void;
}

export const ServiceMenuScreen: React.FC<ServiceMenuScreenProps> = ({
  salonId,
  onBack,
  onContinueToSlot,
}) => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [categories, setCategories] = useState<ServiceCategoryDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<Gender | 'ALL'>('ALL');
  const [selectedServices, setSelectedServices] = useState<ServiceDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [catList, srvList] = await Promise.all([
          catalogService.getCategories(),
          catalogService.getServices(),
        ]);
        setCategories(catList || []);
        setServices(srvList || []);
        if (catList && catList.length > 0) {
          setSelectedCategory(catList[0].id);
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, [salonId]);

  const toggleService = (srv: ServiceDto) => {
    if (selectedServices.some((s) => s.id === srv.id)) {
      setSelectedServices((prev) => prev.filter((s) => s.id !== srv.id));
    } else {
      setSelectedServices((prev) => [...prev, srv]);
    }
  };

  const filteredServices = services.filter((srv) => {
    const matchesCategory = !selectedCategory || srv.categoryId === selectedCategory;
    const matchesGender =
      selectedGender === 'ALL' || srv.targetGender === selectedGender || srv.targetGender === Gender.OTHER;
    return matchesCategory && matchesGender;
  });

  const totalAmount = selectedServices.reduce((sum, s) => sum + s.basePrice, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Service Catalog" showBack onBackPress={onBack} />

      {/* Gender Filter Pills */}
      <View style={[styles.genderFilterRow, { paddingHorizontal: spacing.lg }]}>
        {(['ALL', Gender.FEMALE, Gender.MALE] as const).map((g) => {
          const isActive = selectedGender === g;
          return (
            <TouchableOpacity
              key={g}
              onPress={() => setSelectedGender(g)}
              style={[
                styles.genderPill,
                {
                  backgroundColor: isActive ? colors.primary : '#FFFFFF',
                  borderColor: isActive ? colors.primary : '#E8EAF3',
                },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: isActive ? '#FFFFFF' : colors.textSecondary,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {g === 'ALL' ? 'All Services' : g === Gender.FEMALE ? 'Women' : 'Men'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.categoryTabs, { paddingHorizontal: spacing.lg }]}
      >
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              style={[
                styles.categoryTab,
                {
                  backgroundColor: isActive ? '#F4F0FF' : 'transparent',
                  borderColor: isActive ? colors.primary : '#E8EAF3',
                },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: isActive ? colors.primary : colors.textSecondary,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Services List */}
      <ScrollView contentContainerStyle={[styles.serviceList, { paddingHorizontal: spacing.lg }]}>
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <SkeletonLoader key={i} height={100} borderRadius={14} />
            ))}
          </View>
        ) : (
          filteredServices.map((srv) => {
            const isSelected = selectedServices.some((s) => s.id === srv.id);
            return (
              <AppCard
                key={srv.id}
                onPress={() => toggleService(srv)}
                style={[
                  styles.serviceCard,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: isSelected ? colors.primary : '#E8EAF3',
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.serviceRow}>
                  <View style={styles.serviceInfo}>
                    <Text style={[typography.bodyBold, { color: colors.textPrimary, marginBottom: 4 }]}>
                      {srv.name}
                    </Text>
                    <View style={styles.metaRow}>
                      <Icon name="clock" size={13} color={colors.textMuted} />
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        {formatDuration(srv.durationMinutes)} • {srv.targetGender}
                      </Text>
                    </View>
                    <Text style={[typography.bodyBold, { color: colors.primary, marginTop: 6 }]}>
                      {formatINR(srv.basePrice)}
                    </Text>
                  </View>

                  <AppButton
                    title={isSelected ? 'Added' : 'Add'}
                    variant={isSelected ? 'primary' : 'outline'}
                    size="sm"
                    onPress={() => toggleService(srv)}
                  />
                </View>
              </AppCard>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Cart Drawer */}
      {selectedServices.length > 0 && (
        <View style={[styles.cartBar, { backgroundColor: '#FFFFFF', borderTopColor: '#E8EAF3' }]}>
          <View>
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {selectedServices.length} {selectedServices.length === 1 ? 'Service' : 'Services'} Selected
            </Text>
            <View style={styles.metaRow}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                {formatINR(totalAmount)}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}> • </Text>
              <Icon name="clock" size={12} color={colors.textSecondary} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {formatDuration(totalDuration)}
              </Text>
            </View>
          </View>
          <AppButton
            title="Select Date & Time"
            onPress={() => onContinueToSlot(selectedServices)}
            size="md"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  genderFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  genderPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  serviceList: {
    paddingBottom: 100,
    gap: 12,
  },
  serviceCard: {
    padding: 14,
    borderRadius: 16,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cartBar: {
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
});
