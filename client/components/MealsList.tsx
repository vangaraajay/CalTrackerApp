import { supabase } from '@/constants/supabase';
import { useState, useEffect } from 'react';
import { Alert, StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';

interface MealsListProps {
  refreshTrigger: number;
  onEdit: (meal: any) => void;
  onMealDeleted: () => void;
}

export default function MealsList({ refreshTrigger, onEdit, onMealDeleted }: MealsListProps) {
  const [meals, setMeals] = useState<any[]>([]);

  const fetchMeals = async () => {
    const { data, error } = await supabase
      .from('Meals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error', 'Failed to fetch meals');
    } else {
      setMeals(data || []);
    }
  };

  const deleteMeal = async (id: number) => {
    const { error } = await supabase
      .from('Meals')
      .delete()
      .eq('id', id);

    if (error) {
      Alert.alert('Error', 'Failed to delete meal');
    } else {
      Alert.alert('Success', 'Meal deleted!');
      fetchMeals(); // Refresh the list
      onMealDeleted(); // Notify parent to refresh totals
    }
  };

  useEffect(() => {
    fetchMeals();
  }, [refreshTrigger]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Meals</Text>
      
      <FlatList
        data={meals}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.mealItem}>
            <View style={styles.mealContent}>
              <Text style={styles.mealName}>{item.meal_name}</Text>
              <Text style={styles.mealDetails}>
                {item.calories} cal | {item.protein}g protein | {item.carbs}g carbs | {item.fat}g fat
              </Text>
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => onEdit(item)}
              >
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => deleteMeal(item.id)}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No meals logged yet. Add your first meal below!</Text>
        }
        style={styles.mealsList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  mealsList: {
    flex: 1,
    marginBottom: 20,
  },
  mealItem: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealContent: {
    flex: 1,
  },
  mealName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  mealDetails: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 20,
  },
});