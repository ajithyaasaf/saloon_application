import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AvailableTimeSlotDto } from '@saloon/shared-types';
import { formatDateToISTString } from '@saloon/shared-utils';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppButton } from '../../components/ui/AppButton';
import { Icon } from '../../components/ui/Icon';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { customerBookingService } from '../../services/customer-domain.services';
import { useBookingFlow } from '../../context/BookingFlowContext';
import { useTheme } from '../../theme/ThemeContext';

export interface DateTimeSlotScreenProps {
  onBack: () => void;
  onContinueToSummary: () => void;
}

export const DateTimeSlotScreen: React.FC<DateTimeSlotScreenProps> = ({
  onBack,
  onContinueToSummary,
}) => {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { draft, setDateTimeSlot, acquireSlotLock } = useBookingFlow();
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateToISTString(new Date()),
  );
  const [slots, setSlots] = useState<AvailableTimeSlotDto[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableTimeSlotDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);

  // Generate 7 rolling upcoming days for quick selection
  const upcomingDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dateStr: formatDateToISTString(d),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
    };
  });

  useEffect(() => {
    const fetchSlots = async () => {
      setLoading(true);
      try {
        const branchId = draft.branch?.id || 'default-branch';
        const serviceIds = draft.services.map((s) => s.id);
        const data = await customerBookingService.getAvailableSlots(
          branchId,
          selectedDate,
          serviceIds,
        );
        setSlots(data || []);
      } catch (err) {
        console.error('Failed to load slots:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDate, draft.branch?.id]);

  const handleContinue = async () => {
    if (!selectedSlot) return;
    setDateTimeSlot(selectedDate, selectedSlot);
    setLocking(true);
    await acquireSlotLock();
    setLocking(false);
    onContinueToSummary();
  };

  const morningSlots = slots.filter((s) => s.startTime < '12:00');
  const afternoonSlots = slots.filter((s) => s.startTime >= '12:00');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Select Appointment Time" showBack onBackPress={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Date Selector Row */}
        <Text style={[typography.caption, styles.sectionLabel, { color: colors.textSecondary }]}>
          Choose Date
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          {upcomingDays.map((day) => {
            const isSelected = selectedDate === day.dateStr;
            return (
              <TouchableOpacity
                key={day.dateStr}
                onPress={() => {
                  setSelectedDate(day.dateStr);
                  setSelectedSlot(null);
                }}
                style={[
                  styles.dateCard,
                  {
                    backgroundColor: isSelected ? colors.primary : '#FFFFFF',
                    borderColor: isSelected ? colors.primary : '#E8EAF3',
                  },
                ]}
              >
                <Text
                  style={[
                    typography.micro,
                    { color: isSelected ? 'rgba(255, 255, 255, 0.8)' : colors.textMuted },
                  ]}
                >
                  {day.dayName}
                </Text>
                <Text
                  style={[
                    typography.heading1,
                    { color: isSelected ? '#FFFFFF' : colors.textPrimary, marginVertical: 2 },
                  ]}
                >
                  {day.dayNumber}
                </Text>
                <Text
                  style={[
                    typography.micro,
                    { color: isSelected ? 'rgba(255, 255, 255, 0.8)' : colors.textMuted },
                  ]}
                >
                  {day.month}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Morning Slots */}
        <View style={styles.slotHeaderRow}>
          <Icon name="sun" size={15} color={colors.primary} />
          <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
            Morning Slots
          </Text>
        </View>

        {loading ? (
          <View style={styles.grid}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader key={i} width="48%" height={44} borderRadius={10} />
            ))}
          </View>
        ) : morningSlots.length === 0 ? (
          <Text style={[typography.caption, { color: colors.textMuted, fontStyle: 'italic', marginBottom: 16 }]}>
            No morning slots available for this date
          </Text>
        ) : (
          <View style={styles.grid}>
            {morningSlots.map((slot) => {
              const isSelected = selectedSlot?.startTime === slot.startTime;
              return (
                <TouchableOpacity
                  key={slot.startTime}
                  disabled={!slot.isAvailable}
                  onPress={() => setSelectedSlot(slot)}
                  style={[
                    styles.slotPill,
                    {
                      backgroundColor: isSelected ? colors.primary : '#FFFFFF',
                      borderColor: isSelected ? colors.primary : '#E8EAF3',
                      opacity: slot.isAvailable ? 1 : 0.4,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.bodyBold,
                      {
                        color: isSelected ? '#FFFFFF' : slot.isAvailable ? colors.textPrimary : colors.textMuted,
                      },
                    ]}
                  >
                    {slot.startTime}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Afternoon & Evening Slots */}
        <View style={[styles.slotHeaderRow, { marginTop: 24 }]}>
          <Icon name="moon" size={15} color={colors.primary} />
          <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
            Afternoon & Evening Slots
          </Text>
        </View>

        {loading ? (
          <View style={styles.grid}>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader key={i} width="48%" height={44} borderRadius={10} />
            ))}
          </View>
        ) : afternoonSlots.length === 0 ? (
          <Text style={[typography.caption, { color: colors.textMuted, fontStyle: 'italic', marginBottom: 16 }]}>
            No afternoon slots available for this date
          </Text>
        ) : (
          <View style={styles.grid}>
            {afternoonSlots.map((slot) => {
              const isSelected = selectedSlot?.startTime === slot.startTime;
              return (
                <TouchableOpacity
                  key={slot.startTime}
                  disabled={!slot.isAvailable}
                  onPress={() => setSelectedSlot(slot)}
                  style={[
                    styles.slotPill,
                    {
                      backgroundColor: isSelected ? colors.primary : '#FFFFFF',
                      borderColor: isSelected ? colors.primary : '#E8EAF3',
                      opacity: slot.isAvailable ? 1 : 0.4,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.bodyBold,
                      {
                        color: isSelected ? '#FFFFFF' : slot.isAvailable ? colors.textPrimary : colors.textMuted,
                      },
                    ]}
                  >
                    {slot.startTime}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Confirmation */}
      <View style={[styles.bottomBar, { backgroundColor: '#FFFFFF', borderTopColor: '#E8EAF3' }]}>
        <View>
          <Text style={[typography.caption, { color: colors.textMuted }]}>Selected Time</Text>
          <Text style={[typography.bodyBold, { color: colors.primary }]}>
            {selectedSlot ? `${selectedDate} at ${selectedSlot.startTime}` : 'Choose a time slot'}
          </Text>
        </View>
        <AppButton
          title="Continue"
          disabled={!selectedSlot || locking}
          loading={locking}
          onPress={handleContinue}
          size="md"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionLabel: {
    marginBottom: 10,
  },
  dateScroll: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  dateCard: {
    width: 64,
    height: 80,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  slotPill: {
    width: '48%',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});
