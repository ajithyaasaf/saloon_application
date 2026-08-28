import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FileCategory } from '@saloon/shared-types';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppButton } from '../../components/ui/AppButton';
import { AppCard } from '../../components/ui/AppCard';
import { AppInput } from '../../components/ui/AppInput';
import { Icon } from '../../components/ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { mediaUploadService, customerProfileService } from '../../services/customer-domain.services';
import { useTheme } from '../../theme/ThemeContext';

export interface EditProfileScreenProps {
  onBack: () => void;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ onBack }) => {
  const { user, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await customerProfileService.updateProfile({
        firstName,
        lastName,
        email,
      });
      showToast('Profile updated successfully!', 'success');
      await refreshProfile();
      onBack();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async () => {
    setUploadingAvatar(true);
    try {
      await mediaUploadService.requestPresignedUpload(
        'avatar.jpg',
        'image/jpeg',
        1024 * 300,
        FileCategory.PROFILE,
      );
      showToast('Profile picture uploaded!', 'success');
      await refreshProfile();
    } catch (err: any) {
      showToast(err?.message || 'Avatar upload failed', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Edit Profile" showBack onBackPress={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Upload */}
        <AppCard style={styles.avatarCard} variant="elevated">
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircle, { backgroundColor: '#F4F0FF' }]}>
              <Icon name="user" size={32} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Profile Avatar</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 8 }]}>
                Upload high-res JPG or PNG
              </Text>
              <View style={{ alignSelf: 'flex-start' }}>
                <AppButton
                  title={uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                  variant="outline"
                  size="sm"
                  onPress={handleAvatarUpload}
                  loading={uploadingAvatar}
                />
              </View>
            </View>
          </View>
        </AppCard>

        {/* Inputs */}
        <AppCard style={styles.formCard}>
          <AppInput
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter first name"
          />

          <AppInput
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter last name"
          />

          <AppInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </AppCard>

        <View style={styles.saveSection}>
          <AppButton
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            size="lg"
          />
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
    padding: 20,
  },
  avatarCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF3',
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAF3',
    gap: 12,
    marginBottom: 24,
  },
  saveSection: {},
});
