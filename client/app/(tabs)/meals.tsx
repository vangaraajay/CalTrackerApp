import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import TotalCalCount from '@/components/TotalCalCount';
import MealsList from '@/components/MealsList';
import AddMeals from '@/components/AddMeals';

export default function MealsScreen() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [dailyTrackerRefresh, setDailyTrackerRefresh] = useState(0);

  const handleMealAdded = () => {
    setRefreshTrigger(prev => prev + 1); // Trigger refresh
  };

  const handleMealDeleted = () => {
    setRefreshTrigger(prev => prev + 1); // Trigger refresh for totals
  };

  const handleEdit = (meal: any) => {
    setEditingMeal(meal);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingMeal(null);
  };

  return (
    <View style={styles.container}>
      <MealsList refreshTrigger={refreshTrigger} onEdit={handleEdit} onMealDeleted={handleMealDeleted} />
      <TotalCalCount 
        refreshTrigger={refreshTrigger} 
        onDailyTotalsSaved={() => setDailyTrackerRefresh(prev => prev + 1)}
      />
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ Add Meal</Text>
      </TouchableOpacity>

      <AddMeals 
        visible={modalVisible}
        onClose={handleCloseModal}
        onMealAdded={handleMealAdded}
        editMeal={editingMeal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  addButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});