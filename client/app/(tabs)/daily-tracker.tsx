import { View, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import DailyHistory from '@/components/DailyHistory';

export default function DailyTrackerScreen() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Listen for focus events to refresh when user switches to this tab
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 5000); // Refresh every 5 seconds when on this tab

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <DailyHistory refreshTrigger={refreshTrigger} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});