import { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useAuth } from '@/context/AuthProvider';
import { triggerMealsRefresh } from '@/hooks/mealsRefresh';

const API_GATEWAY_URL = process.env.EXPO_PUBLIC_API_GATEWAY_URL || '';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim()) {
      return;
    }

    if (!session?.access_token) {
      Alert.alert('Authentication required', 'Please sign in to use the agent.');
      return;
    }

    if (!API_GATEWAY_URL) {
      Alert.alert(
        'Configuration error', 
        'API Gateway URL not configured. Please set EXPO_PUBLIC_API_GATEWAY_URL in your environment variables.'
      );
      console.error('API_GATEWAY_URL is empty. Current value:', API_GATEWAY_URL);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      // API_GATEWAY_URL from terraform output already includes /agent at the end
      const endpoint = API_GATEWAY_URL;
      
      console.log('Sending request to:', endpoint);
      console.log('Request body:', { message: userMessage.text, hasToken: !!session.access_token });
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.text,
          access_token: session.access_token,
        }),
      });

      console.log('Response status:', response.status, response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      let data;
      try {
        const text = await response.text();
        console.log('Response body (raw):', text);
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error(`Server returned invalid JSON. Status: ${response.status}`);
      }

      if (!response.ok) {
        const errorMsg = data.error || `Server error: ${response.status} ${response.statusText}`;
        console.error('API Error:', errorMsg, data);
        throw new Error(errorMsg);
      }

      if (!data.response) {
        throw new Error('No response field in server response');
      }

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, agentMessage]);
      
      // Trigger refresh for meals list and calorie count after agent responds
      // This ensures the UI updates if meals were added/modified/deleted via the agent
      triggerMealsRefresh();
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMsg = error.message || 'Failed to send message';
      Alert.alert('Error', errorMsg);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Error: ${errorMsg}`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Start a conversation with the calorie tracking agent!
            </Text>
          </View>
        )}
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.isUser ? styles.userMessage : styles.agentMessage,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                message.isUser ? styles.userMessageText : styles.agentMessageText,
              ]}
            >
              {message.text}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.messageBubble, styles.agentMessage]}>
            <Text style={[styles.messageText, styles.agentMessageText]}>
              Thinking...
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about your meals..."
          placeholderTextColor="#999"
          multiline
          editable={!loading}
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={loading || !inputText.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2196F3',
  },
  agentMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  agentMessageText: {
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

