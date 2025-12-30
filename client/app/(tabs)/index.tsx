import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SignOutButton from '@/components/SignOutButton';
import { supabase } from '@/constants/supabase';

export default function HomeScreen() {
  /*
  const [name, setName] = useState('');

  useEffect(() => {
    const fetchName = async () => {
      try {
        // Get the currently logged-in user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Auth error:', userError);
          return;
        }
        if (!user) {
          console.error('User not found');
          return;
        }

        // Query the profiles table in the public schema
        const { data, error } = await supabase
          .from('profiles') // Make sure this table exists in public schema
          .select('name')
          .eq('id', user.id) // Use the auth user's id
          .single();

        if (error) {
          console.error('Profile fetch error:', error);
          return;
        }

        if (data) {
          setName(data.name);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      }
    };


    fetchName();
  }, []);*/

  return (
    <View style={styles.container}>
      <SignOutButton />

      <View style={styles.content}>
        <Text style={styles.title}>Welcome!</Text>
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
    marginLeft: 20,
    marginRight: 20,
    textAlign: 'center',
    color: '#666',
  },
});