import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { updateManager, UpdatePromptState } from '../../services/update/UpdateManager';
import { UpdateMode } from '../../services/app-config.service';

export const UpdatePromptModal: React.FC = () => {
  const [state, setState] = useState<UpdatePromptState>({
    visible: false,
    mode: UpdateMode.NONE,
    title: '',
    message: '',
    storeUrl: '',
    isMandatory: false,
  });

  useEffect(() => {
    const unsubscribe = updateManager.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  if (!state.visible) return null;

  return (
    <Modal
      transparent
      visible={state.visible}
      animationType="fade"
      onRequestClose={() => {
        if (!state.isMandatory) {
          updateManager.handleDismiss();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Top Badge */}
          <View
            style={[
              styles.badgeContainer,
              state.isMandatory ? styles.mandatoryBadge : styles.recommendedBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                state.isMandatory
                  ? styles.mandatoryBadgeText
                  : styles.recommendedBadgeText,
              ]}
            >
              {state.isMandatory ? 'REQUIRED UPDATE' : 'NEW VERSION AVAILABLE'}
            </Text>
          </View>

          {/* Title & Message */}
          <Text style={styles.title}>{state.title}</Text>
          <Text style={styles.message}>{state.message}</Text>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {!state.isMandatory && (
              <TouchableOpacity
                onPress={() => updateManager.handleDismiss()}
                activeOpacity={0.7}
                style={styles.laterButton}
              >
                <Text style={styles.laterButtonText}>Later</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => updateManager.handleUpdateAction()}
              activeOpacity={0.85}
              style={[
                styles.updateButton,
                state.isMandatory && styles.updateButtonFullWidth,
              ]}
            >
              <Text style={styles.updateButtonText}>Update Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#131927',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#242F46',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  badgeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  recommendedBadge: {
    backgroundColor: 'rgba(108, 62, 232, 0.15)',
    borderWidth: 1,
    borderColor: '#6C3EE8',
  },
  recommendedBadgeText: {
    color: '#A78BFA',
  },
  mandatoryBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  mandatoryBadgeText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  laterButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButtonText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '700',
  },
  updateButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#6C3EE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonFullWidth: {
    flex: 1,
    width: '100%',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
