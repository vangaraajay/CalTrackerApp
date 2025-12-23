import { supabase } from '@/constants/supabase';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthProvider';

interface PastCaloriesProps {
  refreshTrigger: number;
}

export default function PastCalories({ refreshTrigger }: PastCaloriesProps) {
  const [pastRecords, setPastRecords] = useState<any[]>([]);
  const { user } = useAuth();

  const fetchPastHistory = async () => {
    if (!user) {
      setPastRecords([]);
      return;
    }

    const { data, error } = await supabase
      .from('CalTracker')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      Alert.alert('Error', 'Failed to fetch past history');
    } else {
      setPastRecords(data || []);
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
    fetchPastHistory();
  }, [refreshTrigger, user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Past 30 Days</Text>
      
      <FlatList
        data={pastRecords}
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
          <Text style={styles.emptyText}>No past records yet.</Text>
        }
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  recordItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
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
    marginTop: 20,
    fontStyle: 'italic',
  },
});