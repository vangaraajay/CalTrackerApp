import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useAuth } from '@/context/AuthProvider';

export default function SignOutButton() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        Alert.alert('Error', error.message || 'Failed to sign out');
      }
      // Navigation is handled by AuthGate in _layout.tsx
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerSpacer} />
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  headerSpacer: {
    flex: 1,
  },
  signOutButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

