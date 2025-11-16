import { View, StyleSheet } from 'react-native';
import TdCalories from '@/components/TdCalories';
import { useDailyRefresh } from '@/hooks/dailyCountRefresh';

export default function DailyTrackerScreen() {
  const trigger = useDailyRefresh();

  return (
    <View style={styles.container}>
      <TdCalories refreshTrigger={trigger} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});