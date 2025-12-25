import { View, Text, StyleSheet } from 'react-native';
import SignOutButton from '@/components/SignOutButton';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <SignOutButton />
      
      <View style={styles.content}>
        <Text style={styles.title}>Calorie Tracker</Text>
        <Text style={styles.subtitle}>Dashboard</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
});