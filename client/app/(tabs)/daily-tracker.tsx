import { ScrollView, StyleSheet } from 'react-native';
import TdCalories from '@/components/TdCalories';
import PastCalories from '@/components/PastCalories';
import { useDailyRefresh } from '@/hooks/dailyCountRefresh';

export default function DailyTrackerScreen() {
  const trigger = useDailyRefresh();

  return (
    <ScrollView style={styles.container}>
      <TdCalories refreshTrigger={trigger} />
      <PastCalories refreshTrigger={trigger} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});