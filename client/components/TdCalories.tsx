import { supabase } from '@/constants/supabase';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

interface TdCaloriesProps {
  refreshTrigger: number;
}

export default function TdCalories({ refreshTrigger }: TdCaloriesProps) {
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);

  const fetchDailyHistory = async () => {
    const { data, error } = await supabase
      .from('CalTracker')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30); // Last 30 days

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
  }, [refreshTrigger]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's Calories</Text>
      
      <FlatList
        data={dailyRecords}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.recordItem}>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionText}>{item.calories} cal</Text>
              <Text style={styles.nutritionText}>{item.protein}g protein</Text>
              <Text style={styles.nutritionText}>{item.carbs}g carbs</Text>
              <Text style={styles.nutritionText}>{item.fat}g fat</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No daily records yet. Save some totals from the Meals tab!</Text>
        }
        showsVerticalScrollIndicator={false}
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