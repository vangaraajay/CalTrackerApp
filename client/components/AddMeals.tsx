import { supabase } from '@/constants/supabase';
import { useState, useEffect } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View, Modal, TouchableOpacity } from 'react-native';

interface AddMealsProps {
  visible: boolean;
  onClose: () => void;
  onMealAdded: () => void;
  editMeal?: any;
}

export default function AddMeals({ visible, onClose, onMealAdded, editMeal }: AddMealsProps) {
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (editMeal) {
      setFoodName(editMeal.meal_name || '');
      setCalories(editMeal.calories?.toString() || '');
      setProtein(editMeal.protein?.toString() || '');
      setCarbs(editMeal.carbs?.toString() || '');
      setFat(editMeal.fat?.toString() || '');
      setIsEditing(true);
    } else {
      // Clear form for new meal
      setFoodName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setIsEditing(false);
    }
  }, [editMeal, visible]);

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

    let data, error;
    
    if (isEditing && editMeal) {
      // Update existing meal
      ({ data, error } = await supabase
        .from('Meals')
        .update({
          meal_name: foodName,
          calories: caloriesNum,
          protein: proteinNum,
          carbs: carbsNum,
          fat: fatNum
        })
        .eq('id', editMeal.id));
    } else {
      // Insert new meal
      ({ data, error } = await supabase
        .from('Meals')
        .insert({
          meal_name: foodName,
          calories: caloriesNum,
          protein: proteinNum,
          carbs: carbsNum,
          fat: fatNum
        }));
    }

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', isEditing ? 'Meal updated!' : 'Meal added!');
      setFoodName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      onMealAdded(); // Notify parent to refresh
      onClose(); // Close modal
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{isEditing ? 'Edit Meal' : 'Add Meal'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      
      <TextInput
        style={styles.regularInput}
        placeholder="Put the name of the meal here!"
        placeholderTextColor="#666"
        value={foodName}
        onChangeText={setFoodName}
      />
      
      <TextInput
        style={styles.regularInput}
        placeholder="Calorie count"
        placeholderTextColor="#666"
        value={calories}
        onChangeText={setCalories}
        keyboardType="numeric"
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Protein content"
          placeholderTextColor="#666"
          value={protein}
          onChangeText={setProtein}
          keyboardType="numeric"
        />
        <Text style={styles.suffix}>g</Text>
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Carb content"
          placeholderTextColor="#666"
          value={carbs}
          onChangeText={setCarbs}
          keyboardType="numeric"
        />
        <Text style={styles.suffix}>g</Text>
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Fat content"
          placeholderTextColor="#666"
          value={fat}
          onChangeText={setFat}
          keyboardType="numeric"
        />
        <Text style={styles.suffix}>g</Text>
      </View>
      
        <Button title={isEditing ? 'Update Meal' : 'Add Meal'} onPress={addMeal} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
  },
  closeText: {
    fontSize: 20,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 15,
    paddingRight: 10,
  },
  regularInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
    width: '100%',
  },
  input: {
    flex: 1,
    padding: 10,
    borderWidth: 0,
  },
  suffix: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});