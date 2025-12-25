import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
        }}
      />
      <Tabs.Screen
        name="daily-tracker"
        options={{
          title: 'Daily Tracker',
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          title: 'Agent',
        }}
      />
    </Tabs>
  );
}
