import { View, StyleSheet } from 'react-native';
import AgentChat from '@/components/AgentChat';
import SignOutButton from '@/components/SignOutButton';

export default function AgentScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.chatContainer}>
        <AgentChat />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatContainer: {
    flex: 1,
  },
});

