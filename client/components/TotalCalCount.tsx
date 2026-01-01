import { supabase } from '@/constants/supabase';
import { useEffect, useState, useRef } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthProvider';
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
  const { user } = useAuth();
  const isSavingRef = useRef(false);

  const fetchTodaysTotals = async () => {
    console.log('[TotalCalCount] fetchTodaysTotals called, refreshTrigger:', refreshTrigger, 'user:', user?.id ?? null);
    const today = new Date().toISOString().split('T')[0];
    if (!user) {
      setTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      return;
    }

    const { data, error } = await supabase
      .from('Meals')
      .select('calories, protein, carbs, fat')
      .eq('user_id', user.id)
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
    // Prevent concurrent saves to avoid race condition
    if (isSavingRef.current) {
      console.log('[TotalCalCount] Save already in progress, skipping...');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Check if there's already a record for today
    if (!user) return;

    isSavingRef.current = true;

    try {
      const { data: existingRecords, error: fetchError } = await supabase
        .from('CalTracker')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      if (fetchError) {
        console.log('Error fetching CalTracker record:', fetchError);
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
          .eq('id', existingRecord.id)
          .eq('user_id', user.id));
      } else {
        ({ data, error } = await supabase
          .from('CalTracker')
          .insert({
            calories: dailyTotals.calories,
            protein: dailyTotals.protein,
            carbs: dailyTotals.carbs,
            fat: dailyTotals.fat,
            user_id: user.id
          }));
        if (error){
          console.error('Error inserting new record:', error);
        }
        console.log(`Inserting new record: ${data}`);
      }

      if (!error) {
        triggerDailyRefresh();
      }
    } catch (error) {
      console.error('Unexpected error in saveDailyTotals:', error);
    } finally {
      isSavingRef.current = false;
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