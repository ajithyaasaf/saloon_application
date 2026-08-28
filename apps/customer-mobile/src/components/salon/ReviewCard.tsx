import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ReviewDto } from '@saloon/shared-types';
import { AppCard } from '../ui/AppCard';
import { Icon } from '../ui/Icon';
import { useTheme } from '../../theme/ThemeContext';

export interface ReviewCardProps {
  review: ReviewDto;
  onHelpfulVote?: () => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, onHelpfulVote }) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <AppCard style={styles.card} variant="default">
      <View style={styles.header}>
        <View style={styles.customerInfo}>
          <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
            {review.customerName || 'Verified Client'}
          </Text>
          <View style={styles.starsRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Icon
                key={i}
                name="star"
                size={13}
                color={i < review.overallRating ? '#F59E0B' : '#E8EAF3'}
                fill={i < review.overallRating ? '#F59E0B' : 'transparent'}
              />
            ))}
          </View>
        </View>
        <Text style={[typography.micro, { color: colors.textMuted }]}>
          {new Date(review.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <Text style={[typography.body, styles.comment, { color: colors.textSecondary }]}>
        "{review.comment || 'Amazing styling service, very hygienic and skilled staff.'}"
      </Text>

      {review.reply && (
        <View style={[styles.replyBox, { backgroundColor: '#F4F0FF', borderLeftColor: colors.primary }]}>
          <Text style={[typography.micro, { color: colors.primary, fontWeight: '700', marginBottom: 2 }]}>
            {review.reply.authorName || 'Salon Response'}:
          </Text>
          <Text style={[typography.caption, { color: colors.textPrimary }]}>
            {review.reply.comment}
          </Text>
        </View>
      )}

      {onHelpfulVote && (
        <TouchableOpacity
          onPress={onHelpfulVote}
          activeOpacity={0.7}
          style={styles.helpfulRow}
        >
          <Icon name="thumbs-up" size={13} color={colors.primary} />
          <Text style={[typography.micro, { color: colors.primary, fontWeight: '600' }]}>
            Helpful ({review.helpfulVotesCount || 0})
          </Text>
        </TouchableOpacity>
      )}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EAF3',
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  comment: {
    marginBottom: 8,
    lineHeight: 20,
  },
  replyBox: {
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    marginTop: 6,
    marginBottom: 6,
  },
  helpfulRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
});
