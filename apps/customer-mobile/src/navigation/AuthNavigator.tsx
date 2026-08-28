import React, { useState } from 'react';
import { View } from 'react-native';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { PhoneLoginScreen } from '../screens/auth/PhoneLoginScreen';
import { OtpVerificationScreen } from '../screens/auth/OtpVerificationScreen';

export const AuthNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'phone' | 'otp'>('welcome');

  return (
    <View style={{ flex: 1 }}>
      {currentScreen === 'welcome' && (
        <WelcomeScreen onGetStarted={() => setCurrentScreen('phone')} />
      )}
      {currentScreen === 'phone' && (
        <PhoneLoginScreen
          onOtpSent={() => setCurrentScreen('otp')}
          onBack={() => setCurrentScreen('welcome')}
        />
      )}
      {currentScreen === 'otp' && (
        <OtpVerificationScreen
          onSuccess={() => {}}
          onBack={() => setCurrentScreen('phone')}
        />
      )}
    </View>
  );
};
