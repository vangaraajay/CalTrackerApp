import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MealsList from '@/components/MealsList';
import AddMeals from '@/components/AddMeals';

export default function MealsScreen() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleMealAdded = () => {
    setRefreshTrigger(prev => prev + 1); // Trigger refresh
  };

  return (
    <View style={styles.container}>
      <MealsList refreshTrigger={refreshTrigger} />
      <AddMeals onMealAdded={handleMealAdded} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
});