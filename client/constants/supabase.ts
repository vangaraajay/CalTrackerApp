import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_DB_API_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_API_KEY!;

// SecureStore adapter for supabase-js auth storage in React Native / Expo.
const secureStorage = {
	async getItem(key: string) {
		return await SecureStore.getItemAsync(key);
	},
	async setItem(key: string, value: string) {
		await SecureStore.setItemAsync(key, value);
	},
	async removeItem(key: string) {
		await SecureStore.deleteItemAsync(key);
	},
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: {
		storage: secureStorage,
		detectSessionInUrl: false,
	},
});