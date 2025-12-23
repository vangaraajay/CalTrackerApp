import { supabase } from '@/constants/supabase';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthProvider';

interface TdCaloriesProps {
  refreshTrigger: number;
}

export default function TdCalories({ refreshTrigger }: TdCaloriesProps) {
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);
  const { user } = useAuth();

  const fetchDailyHistory = async () => {
    if (!user) {
      setDailyRecords([]);
      return;
    }

    const { data, error } = await supabase
      .from('CalTracker')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      Alert.alert('Error', 'Failed to fetch daily history');
    } else {
      setDailyRecords(data || []);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  useEffect(() => {
    fetchDailyHistory();
  }, [refreshTrigger, user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's Calories</Text>
      
      {dailyRecords.length > 0 ? (
        <View style={styles.recordItem}>
          <Text style={styles.date}>{formatDate(dailyRecords[0].created_at)}</Text>
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionText}>{dailyRecords[0].calories} cal</Text>
            <Text style={styles.nutritionText}>{dailyRecords[0].protein}g protein</Text>
            <Text style={styles.nutritionText}>{dailyRecords[0].carbs}g carbs</Text>
            <Text style={styles.nutritionText}>{dailyRecords[0].fat}g fat</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.emptyText}>No daily records yet. Save some totals from the Meals tab!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  recordItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  date: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionText: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 50,
    fontStyle: 'italic',
  },
});