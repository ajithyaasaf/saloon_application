import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { BookingFlowProvider } from './src/context/BookingFlowContext';
import { ToastProvider } from './src/context/ToastContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/theme/index';
import { updateManager } from './src/services/update/UpdateManager';
import { UpdatePromptModal } from './src/components/common/UpdatePromptModal';

function AppContent() {
  const { colors, theme } = useTheme();

  useEffect(() => {
    // Non-blocking update and governance check on app start
    updateManager.initialize();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme.appearance === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <ToastProvider>
        <AuthProvider>
          <BookingFlowProvider>
            <RootNavigator />
            <UpdatePromptModal />
          </BookingFlowProvider>
        </AuthProvider>
      </ToastProvider>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
