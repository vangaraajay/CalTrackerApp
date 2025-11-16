import { supabase } from '@/constants/supabase';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
      saveDailyTotals(dailyTotals);
    }
  };

  const saveDailyTotals = async (dailyTotals: typeof totals) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if there's already a record for today
    const { data: existingRecords, error: fetchError } = await supabase
      .from('CalTracker')
      .select('id')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    if (fetchError) {
      return;
    }

    const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

    let data, error;
    
    if (existingRecord) {
      ({ data, error } = await supabase
        .from('CalTracker')
        .update({
          calories: dailyTotals.calories,
          protein: dailyTotals.protein,
          carbs: dailyTotals.carbs,
          fat: dailyTotals.fat
        })
        .eq('id', existingRecord.id));
    } else {
      ({ data, error } = await supabase
        .from('CalTracker')
        .insert({
          calories: dailyTotals.calories,
          protein: dailyTotals.protein,
          carbs: dailyTotals.carbs,
          fat: dailyTotals.fat
        }));
    }

    if (!error) {
      triggerDailyRefresh();
    }
  };

  useEffect(() => {
    fetchTodaysTotals();
  }, [refreshTrigger]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's Totals</Text>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
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