import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SignOutButton from '@/components/SignOutButton';
import { supabase } from '@/constants/supabase';

export default function HomeScreen() {
  const [name, setName] = useState('');

  useEffect(() => {
    const fetchName = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error(userError);
      }
      if (!user) {
        return console.error('User not found');
      }
      const { data, error } = await supabase
        .from('Users')
        .select('name')
        .eq('user_id', user.id)
        .single();

      if (error) console.error(error);
      else setName(data.name);
    };

    fetchName();
  }, []);

  return (
    <View style={styles.container}>
      <SignOutButton />

      <View style={styles.content}>
        <Text style={styles.title}>Welcome, {name}!</Text>
        <Text style={styles.subtitle}>Enter your daily meals, see your calorie totals, and chat with your AI agent!</Text>
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
});