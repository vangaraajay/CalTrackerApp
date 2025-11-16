import { supabase } from '@/constants/supabase';
import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

interface AddMealsProps {
  onMealAdded: () => void;
}

export default function AddMeals({ onMealAdded }: AddMealsProps) {
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const addMeal = async () => {
    if (!foodName || !calories) {
      Alert.alert('Error', 'Food name and calories are required!');
      return;
    }

    const caloriesNum = parseInt(calories);
    const proteinNum = parseInt(protein) || 0;
    const carbsNum = parseInt(carbs) || 0;
    const fatNum = parseInt(fat) || 0;

    if (isNaN(caloriesNum) || caloriesNum <= 0) {
      Alert.alert('Error', 'Please enter a valid calorie amount');
      return;
    }

    if (protein && (isNaN(proteinNum) || proteinNum < 0)) {
      Alert.alert('Error', 'Please enter a valid protein amount');
      return;
    }

    if (carbs && (isNaN(carbsNum) || carbsNum < 0)) {
      Alert.alert('Error', 'Please enter a valid carbs amount');
      return;
    }

    if (fat && (isNaN(fatNum) || fatNum < 0)) {
      Alert.alert('Error', 'Please enter a valid fat amount');
      return;
    }

    const { data, error } = await supabase
      .from('Meals')
      .insert({
        meal_name: foodName,
        calories: caloriesNum,
        protein: proteinNum,
        carbs: carbsNum,
        fat: fatNum
      });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Meal added!');
      setFoodName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      onMealAdded(); // Notify parent to refresh
    }
  };

  return (
    <View>
      <Text style={styles.title}>Add Meal</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Put the name of the meal here!"
        value={foodName}
        onChangeText={setFoodName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Calorie count"
        value={calories}
        onChangeText={setCalories}
        keyboardType="numeric"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Protein content (g)"
        value={protein}
        onChangeText={setProtein}
        keyboardType="numeric"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Carb content (g)"
        value={carbs}
        onChangeText={setCarbs}
        keyboardType="numeric"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Fat content (g)"
        value={fat}
        onChangeText={setFat}
        keyboardType="numeric"
      />
      
      <Button title="Add Meal" onPress={addMeal} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
    width: '100%',
  },
});