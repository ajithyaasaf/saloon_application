import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BranchDto, SalonDto, ServiceDto } from '@saloon/shared-types';
import { HomeScreen } from '../screens/explore/HomeScreen';
import { SearchScreen } from '../screens/explore/SearchScreen';
import { SalonDetailScreen } from '../screens/explore/SalonDetailScreen';
import { ServiceMenuScreen } from '../screens/explore/ServiceMenuScreen';
import { DateTimeSlotScreen } from '../screens/booking/DateTimeSlotScreen';
import { OrderSummaryScreen } from '../screens/booking/OrderSummaryScreen';
import { PaymentConfirmationScreen } from '../screens/booking/PaymentConfirmationScreen';
import { MyBookingsScreen } from '../screens/my-bookings/MyBookingsScreen';
import { BookingDetailScreen } from '../screens/my-bookings/BookingDetailScreen';
import { WalletHomeScreen } from '../screens/wallet/WalletHomeScreen';
import { ProfileHomeScreen } from '../screens/profile/ProfileHomeScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { CreateReviewScreen } from '../screens/reviews/CreateReviewScreen';
import { NotificationCenterScreen } from '../screens/notifications/NotificationCenterScreen';
import { useBookingFlow } from '../context/BookingFlowContext';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from '../components/ui/Icon';

export type MainTabType = 'explore' | 'bookings' | 'wallet' | 'profile';

export const MainTabNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { setSalonAndBranch, setServices } = useBookingFlow();
  const [activeTab, setActiveTab] = useState<MainTabType>('explore');
  const [exploreView, setExploreView] = useState<'home' | 'search' | 'detail' | 'services'>('home');
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
  const [bookingFlowStep, setBookingFlowStep] = useState<'none' | 'slot' | 'summary' | 'payment'>('none');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [profileView, setProfileView] = useState<'home' | 'edit' | 'notifications'>('home');

  // Handle Salon selection from Home/Search
  const handleSelectSalon = (salon: SalonDto) => {
    setSelectedSalonId(salon.id);
    setSalonAndBranch(salon);
    setExploreView('detail');
  };

  // Handle Book Now from Salon Details
  const handleBookNow = (salon: SalonDto, branch?: BranchDto) => {
    setSalonAndBranch(salon, branch);
    setExploreView('services');
  };

  // Handle Services Selected -> Continue to Slot
  const handleContinueToSlot = (services: ServiceDto[]) => {
    setServices(services);
    setBookingFlowStep('slot');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Active Screen Viewport */}
      <View style={styles.viewport}>
        {/* Booking Flow Modal Overlay */}
        {bookingFlowStep === 'slot' && (
          <DateTimeSlotScreen
            onBack={() => setBookingFlowStep('none')}
            onContinueToSummary={() => setBookingFlowStep('summary')}
          />
        )}
        {bookingFlowStep === 'summary' && (
          <OrderSummaryScreen
            onBack={() => setBookingFlowStep('slot')}
            onProceedToPayment={() => setBookingFlowStep('payment')}
          />
        )}
        {bookingFlowStep === 'payment' && (
          <PaymentConfirmationScreen
            onDone={() => {
              setBookingFlowStep('none');
              setExploreView('home');
            }}
            onViewBookings={() => {
              setBookingFlowStep('none');
              setActiveTab('bookings');
            }}
          />
        )}

        {/* Review Submission Modal Overlay */}
        {reviewBookingId && (
          <CreateReviewScreen
            bookingId={reviewBookingId}
            onBack={() => setReviewBookingId(null)}
            onSuccess={() => setReviewBookingId(null)}
          />
        )}

        {/* Explore Tab Stacks */}
        {bookingFlowStep === 'none' && !reviewBookingId && activeTab === 'explore' && (
          <>
            {exploreView === 'home' && (
              <HomeScreen
                onSelectSalon={handleSelectSalon}
                onSearchPress={() => setExploreView('search')}
                onCategoryPress={() => setExploreView('search')}
                onFavoritesPress={() => setExploreView('search')}
                onNotificationsPress={() => {
                  setActiveTab('profile');
                  setProfileView('notifications');
                }}
              />
            )}
            {exploreView === 'search' && (
              <SearchScreen
                onSelectSalon={handleSelectSalon}
                onBack={() => setExploreView('home')}
              />
            )}
            {exploreView === 'detail' && selectedSalonId && (
              <SalonDetailScreen
                salonId={selectedSalonId}
                onBack={() => setExploreView('home')}
                onBookNow={handleBookNow}
              />
            )}
            {exploreView === 'services' && selectedSalonId && (
              <ServiceMenuScreen
                salonId={selectedSalonId}
                onBack={() => setExploreView('detail')}
                onContinueToSlot={handleContinueToSlot}
              />
            )}
          </>
        )}

        {/* Bookings Tab Stacks */}
        {bookingFlowStep === 'none' && !reviewBookingId && activeTab === 'bookings' && (
          <>
            {selectedBookingId ? (
              <BookingDetailScreen
                bookingId={selectedBookingId}
                onBack={() => setSelectedBookingId(null)}
                onLeaveReview={(id: string) => setReviewBookingId(id)}
              />
            ) : (
              <MyBookingsScreen
                onSelectBooking={(id: string) => setSelectedBookingId(id)}
                onExploreSalons={() => {
                  setActiveTab('explore');
                  setExploreView('home');
                }}
              />
            )}
          </>
        )}

        {/* Rewards / Wallet Tab */}
        {bookingFlowStep === 'none' && !reviewBookingId && activeTab === 'wallet' && (
          <WalletHomeScreen
            onViewLoyaltyLedger={() => {}}
            onViewMembership={() => {}}
            onViewReferrals={() => {}}
          />
        )}

        {/* Profile Tab Stacks */}
        {bookingFlowStep === 'none' && !reviewBookingId && activeTab === 'profile' && (
          <>
            {profileView === 'home' && (
              <ProfileHomeScreen
                onEditProfile={() => setProfileView('edit')}
                onViewNotifications={() => setProfileView('notifications')}
                onViewReferrals={() => {}}
              />
            )}
            {profileView === 'edit' && (
              <EditProfileScreen onBack={() => setProfileView('home')} />
            )}
            {profileView === 'notifications' && (
              <NotificationCenterScreen onBack={() => setProfileView('home')} />
            )}
          </>
        )}
      </View>

      {/* Persistent Bottom Tab Bar */}
      {bookingFlowStep === 'none' && !reviewBookingId && (
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: '#FFFFFF',
              borderTopColor: '#E8EAF3',
            },
          ]}
        >
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => {
              setActiveTab('explore');
              setExploreView('home');
            }}
            activeOpacity={0.7}
            accessibilityLabel="Explore tab"
          >
            <Icon
              name="search"
              size={22}
              color={activeTab === 'explore' ? colors.primary : '#8E94A8'}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'explore' ? colors.primary : '#8E94A8' },
              ]}
            >
              Explore
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => {
              setActiveTab('bookings');
              setSelectedBookingId(null);
            }}
            activeOpacity={0.7}
            accessibilityLabel="Bookings tab"
          >
            <Icon
              name="calendar"
              size={22}
              color={activeTab === 'bookings' ? colors.primary : '#8E94A8'}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'bookings' ? colors.primary : '#8E94A8' },
              ]}
            >
              Bookings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('wallet')}
            activeOpacity={0.7}
            accessibilityLabel="Rewards tab"
          >
            <Icon
              name="gift"
              size={22}
              color={activeTab === 'wallet' ? colors.primary : '#8E94A8'}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'wallet' ? colors.primary : '#8E94A8' },
              ]}
            >
              Rewards
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => {
              setActiveTab('profile');
              setProfileView('home');
            }}
            activeOpacity={0.7}
            accessibilityLabel="Profile tab"
          >
            <Icon
              name="user"
              size={22}
              color={activeTab === 'profile' ? colors.primary : '#8E94A8'}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'profile' ? colors.primary : '#8E94A8' },
              ]}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewport: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 70,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});
