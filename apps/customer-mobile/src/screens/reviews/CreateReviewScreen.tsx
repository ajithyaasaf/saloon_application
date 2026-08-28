import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ReviewRating } from '@saloon/shared-types';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppInput } from '../../components/ui/AppInput';
import { Icon } from '../../components/ui/Icon';
import { reviewService } from '../../services/customer-domain.services';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';

export interface CreateReviewScreenProps {
  bookingId: string;
  branchId?: string;
  onBack: () => void;
  onSuccess: () => void;
}

export const CreateReviewScreen: React.FC<CreateReviewScreenProps> = ({
  bookingId,
  branchId = 'default-branch',
  onBack,
  onSuccess,
}) => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { showToast } = useToast();
  const [overallRating, setOverallRating] = useState<ReviewRating>(5 as ReviewRating);
  const [cleanlinessRating, setCleanlinessRating] = useState<ReviewRating>(5 as ReviewRating);
  const [staffRating, setStaffRating] = useState<ReviewRating>(5 as ReviewRating);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await reviewService.createReview({
        branchId,
        bookingId,
        overallRating,
        cleanlinessRating,
        staffRating,
        comment,
      });
      showToast('Thank you for your review!', 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit review', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderStarSelector = (
    label: string,
    currentVal: number,
    setter: (v: ReviewRating) => void,
  ) => {
    return (
      <View style={styles.starRow}>
        <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>{label}</Text>
        <View style={styles.starsGroup}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setter(star as ReviewRating)}
              style={styles.starTouch}
            >
              <Icon
                name="star"
                size={26}
                color={star <= currentVal ? '#F59E0B' : '#E8EAF3'}
                fill={star <= currentVal ? '#F59E0B' : 'transparent'}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Review Your Experience" showBack onBackPress={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card} variant="elevated">
          <Text style={[typography.heading2, { color: colors.textPrimary, marginBottom: 4 }]}>
            Rate Your Visit
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 16 }]}>
            Help other clients discover top styling talent and maintain service excellence.
          </Text>

          <View style={styles.selectorsBox}>
            {renderStarSelector('Overall Rating', overallRating, setOverallRating)}
            {renderStarSelector('Cleanliness & Hygiene', cleanlinessRating, setCleanlinessRating)}
            {renderStarSelector('Stylist Professionalism', staffRating, setStaffRating)}
          </View>

          <AppInput
            label="Share Your Feedback (Optional)"
            placeholder="Tell us about your experience, salon ambience, or stylist service..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            style={{ height: 100 }}
          />

          <View style={{ marginTop: 16 }}>
            <AppButton
              title="Submit Review"
              onPress={handleSubmit}
              loading={loading}
              size="lg"
            />
          </View>
        </AppCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF3',
  },
  selectorsBox: {
    gap: 16,
    marginBottom: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E8EAF3',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  starTouch: {
    padding: 4,
  },
});
