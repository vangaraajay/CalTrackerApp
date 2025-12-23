import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../context/AuthProvider';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGate() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // send to login if not signed in
      router.replace('/login');
    } else {
      // user signed in, go to root tabs
      router.replace('/');
    }
  }, [user, loading, router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
      <>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
