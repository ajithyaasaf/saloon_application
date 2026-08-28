import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SalonDto } from '@saloon/shared-types';
import { AppCard } from '../ui/AppCard';
import { Icon } from '../ui/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { getSalonCoverImage } from '../../utils/salon-images';

export interface SalonCardProps {
  salon: SalonDto;
  onPress: () => void;
  onToggleFavorite?: () => void;
}

export const SalonCard: React.FC<SalonCardProps> = ({ salon, onPress, onToggleFavorite }) => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [isFavorite, setIsFavorite] = useState(false);

  const handleFavoritePress = () => {
    setIsFavorite(!isFavorite);
    onToggleFavorite?.();
  };

  return (
    <AppCard onPress={onPress} style={styles.card} variant="elevated">
      {/* Visual Cover Banner with Favorite & Rating Overlays */}
      <View style={styles.coverContainer}>
        <Image
          source={getSalonCoverImage(salon)}
          style={styles.coverImage}
          resizeMode="cover"
        />

        {/* Floating Heart Button (Top Right) */}
        <TouchableOpacity
          onPress={handleFavoritePress}
          activeOpacity={0.8}
          style={styles.favoriteButton}
        >
          <Icon
            name="heart"
            size={16}
            color={isFavorite ? '#FF3B5C' : '#8E94A8'}
            fill={isFavorite ? '#FF3B5C' : 'transparent'}
          />
        </TouchableOpacity>

        {/* Rating Badge (Bottom Right of Image) */}
        <View style={[styles.ratingBadge, { backgroundColor: colors.primary }]}>
          <Icon name="star" size={11} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={styles.ratingText}>4.8</Text>
        </View>
      </View>

      {/* Card Content Details */}
      <View style={styles.content}>
        <Text style={[typography.heading2, styles.name, { color: colors.textPrimary }]}>
          {salon.name || 'GlowUp Studio'}
        </Text>

        <Text style={[typography.caption, styles.locationText, { color: colors.textSecondary }]}>
          {salon.slug ? `Tower Plaza, ${salon.slug}` : 'Tower Plaza, Sheikh Zayed Road'}
        </Text>

        <View style={styles.bottomRow}>
          <Text style={[typography.heading2, styles.priceText, { color: colors.textPrimary }]}>
            ₹200
          </Text>

          <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.arrowButton, { backgroundColor: colors.primary }]}>
            <Icon name="arrow-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8EAF3',
    shadowColor: '#6C3EE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  coverContainer: {
    height: 155,
    position: 'relative',
    backgroundColor: '#ECE7FE',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C3EE8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
});
