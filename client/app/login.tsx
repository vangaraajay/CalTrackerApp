import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthProvider';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const handleSignIn = async () => {
    try {
      const res = await signIn(email, password);
      if (res.error) {
        Alert.alert('Sign in error', res.error.message || JSON.stringify(res.error));
      }
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  const handleSignUp = async () => {
    try {
      const res = await signUp(email, password);
      if (res.error) {
        Alert.alert('Sign up error', res.error.message || JSON.stringify(res.error));
        return;
      }
      Alert.alert('Check your email', 'A confirmation link was sent if verification is enabled.');
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in to Calorie Tracker</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={styles.input}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      {mode === 'signin' ? (
        <Button title="Sign In" onPress={handleSignIn} />
      ) : (
        <Button title="Sign Up" onPress={handleSignUp} />
      )}

      <View style={styles.switchRow}>
        <Text>{mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}</Text>
        <Button title={mode === 'signin' ? 'Sign up' : 'Sign in'} onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} />
      </View>

      <Text style={styles.hint}>
        If email confirmations are enabled in Supabase, you'll receive a verification email after sign up.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 12, borderRadius: 6 },
  switchRow: { marginTop: 12, alignItems: 'center' },
  hint: { marginTop: 20, color: '#666', textAlign: 'center' },
});
