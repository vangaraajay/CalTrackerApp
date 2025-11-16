import { supabase } from '@/constants/supabase';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { triggerDailyRefresh } from '@/hooks/dailyCountRefresh';

interface TotalCalCountProps {
  refreshTrigger: number;
}

export default function TotalCalCount({ refreshTrigger }: TotalCalCountProps) {
  const [totals, setTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  const fetchTodaysTotals = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('Meals')
      .select('calories, protein, carbs, fat')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    if (error) {
      Alert.alert('Error', 'Failed to fetch daily totals');
    } else {
      const dailyTotals = data?.reduce(
        (acc, meal) => ({
          calories: acc.calories + (meal.calories || 0),
          protein: acc.protein + (meal.protein || 0),
          carbs: acc.carbs + (meal.carbs || 0),
          fat: acc.fat + (meal.fat || 0)
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ) || { calories: 0, protein: 0, carbs: 0, fat: 0 };

      setTotals(dailyTotals);
    }
  };

  const saveDailyTotals = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if there's already a record for today
    const { data: existingRecords, error: fetchError } = await supabase
      .from('CalTracker')
      .select('id')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    if (fetchError) {
      Alert.alert('Error', 'Failed to check existing records');
      return;
    }

    const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

    let data, error;
    
    if (existingRecord) {
      ({ data, error } = await supabase
        .from('CalTracker')
        .update({
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat
        })
        .eq('id', existingRecord.id));
    } else {
      ({ data, error } = await supabase
        .from('CalTracker')
        .insert({
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat
        }));
    }

    if (error) {
      Alert.alert('Error', 'Failed to save daily totals');
    } else {
      Alert.alert('Success', existingRecord ? 'Daily totals updated!' : 'Daily totals saved!');
      triggerDailyRefresh(); // Refresh daily tracker
    }
  };

  useEffect(() => {
    fetchTodaysTotals();
  }, [refreshTrigger]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Totals</Text>
        <TouchableOpacity style={styles.saveButton} onPress={saveDailyTotals}>
          <Text style={styles.saveButtonText}>Update Today's Totals</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.totalsRow}>
        <View style={styles.totalItem}>
          <Text style={styles.totalNumber}>{totals.calories}</Text>
          <Text style={styles.totalLabel}>Calories</Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={styles.totalNumber}>{totals.protein}g</Text>
          <Text style={styles.totalLabel}>Protein</Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={styles.totalNumber}>{totals.carbs}g</Text>
          <Text style={styles.totalLabel}>Carbs</Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={styles.totalNumber}>{totals.fat}g</Text>
          <Text style={styles.totalLabel}>Fat</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalItem: {
    alignItems: 'center',
  },
  totalNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  totalLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});