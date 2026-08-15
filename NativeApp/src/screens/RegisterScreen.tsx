import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createUserWithEmailForApp, getIdentityAuthErrorMessage } from '../lib/identityAuth';
import type { MembershipStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<MembershipStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage('メールアドレスとパスワードを入力してください。');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createUserWithEmailForApp(trimmedEmail, trimmedPassword);
    } catch (error) {
      setErrorMessage(getIdentityAuthErrorMessage(error, 'register'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>アカウント作成</Text>
        <Text style={styles.subtitle}>メンバーシップに参加するためのアカウントを作成します。</Text>

        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>メールアドレス</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#52525b"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>パスワード</Text>
          <View style={styles.passwordRow}>
            <TextInput
              autoCapitalize="none"
              autoComplete="new-password"
              placeholder="••••••••"
              placeholderTextColor="#52525b"
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'パスワードを隠す' : 'パスワードを表示する'}
              onPress={() => setShowPassword((current) => !current)}
              style={styles.passwordToggle}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#a1a1aa" />
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={() => {
            void handleRegister();
          }}
          style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.primaryButtonText}>登録する</Text>
          )}
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.linkButton}>
          <Text style={styles.linkText}>
            すでにアカウントがありますか？ <Text style={styles.linkTextStrong}>ログイン</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#09090b',
    padding: 24,
    gap: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: 'rgba(69, 10, 10, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(127, 29, 29, 0.5)',
    borderRadius: 8,
    padding: 12,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    backgroundColor: '#000000',
    color: '#ffffff',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  linkButton: {
    paddingTop: 8,
  },
  linkText: {
    color: '#71717a',
    fontSize: 14,
    textAlign: 'center',
  },
  linkTextStrong: {
    color: '#ffffff',
    textDecorationLine: 'underline',
  },
});
