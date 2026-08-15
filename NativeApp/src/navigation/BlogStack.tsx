import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BlogDetailScreen from '../screens/BlogDetailScreen';
import BlogListScreen from '../screens/BlogListScreen';
import type { BlogStackParamList } from './types';

const Stack = createNativeStackNavigator<BlogStackParamList>();

export default function BlogStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BlogList" component={BlogListScreen} />
      <Stack.Screen name="BlogDetail" component={BlogDetailScreen} />
    </Stack.Navigator>
  );
}
