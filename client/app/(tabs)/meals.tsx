import { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import TotalCalCount from '@/components/TotalCalCount';
import MealsList from '@/components/MealsList';
import AddMeals from '@/components/AddMeals';
import { supabase } from '@/constants/supabase';
import { useMealsRefresh } from '@/hooks/mealsRefresh';

export default function MealsScreen() {
  const globalRefreshTrigger = useMealsRefresh();
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);

  // Combine both triggers - update refreshTrigger when either global or local changes
  useEffect(() => {
    setRefreshTrigger(prev => prev + 1);
  }, [globalRefreshTrigger, localRefreshTrigger]);

  const clearOldMeals = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: lastMeal } = await supabase
      .from('Meals')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastMeal && lastMeal.length > 0) {
      const lastMealDate = new Date(lastMeal[0].created_at).toISOString().split('T')[0];
      
      if (lastMealDate !== today) {
        await supabase.from('Meals').delete().neq('id', 0);
        setLocalRefreshTrigger(prev => prev + 1);
      }
    }
  };

  const handleMealAdded = () => {
    setLocalRefreshTrigger(prev => prev + 1); // Trigger local refresh
  };

  const handleMealDeleted = () => {
    setLocalRefreshTrigger(prev => prev + 1); // Trigger local refresh for totals
  };

  const handleEdit = (meal: any) => {
    setEditingMeal(meal);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingMeal(null);
  };

  useEffect(() => {
    clearOldMeals();
  }, []);

  return (
    <View style={styles.container}>
      <MealsList refreshTrigger={refreshTrigger} onEdit={handleEdit} onMealDeleted={handleMealDeleted} />
      <TotalCalCount refreshTrigger={refreshTrigger} />
      
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