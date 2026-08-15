import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SiteWebView from './src/components/SiteWebView';
import { TAB_ROUTES } from './src/config';
import BlogStack from './src/navigation/BlogStack';
import MembershipStack from './src/navigation/MembershipStack';

type TabParamList = {
  Contents: undefined;
  Blog: undefined;
  Gear: undefined;
  Membership: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#000000',
              borderTopColor: '#27272a',
            },
            tabBarActiveTintColor: '#BF953F',
            tabBarInactiveTintColor: '#71717a',
            tabBarIcon: ({ color, size }) => {
              const iconName = getTabIcon(route.name);
              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen
            name="Contents"
            options={{ title: 'Contents' }}
            children={() => <SiteWebView path={TAB_ROUTES.contents} />}
          />
          <Tab.Screen name="Blog" component={BlogStack} options={{ title: 'ブログ' }} />
          <Tab.Screen
            name="Gear"
            options={{ title: 'Gear' }}
            children={() => <SiteWebView path={TAB_ROUTES.gear} />}
          />
          <Tab.Screen name="Membership" component={MembershipStack} options={{ title: '会員' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function getTabIcon(routeName: keyof TabParamList): keyof typeof Ionicons.glyphMap {
  switch (routeName) {
    case 'Contents':
      return 'grid-outline';
    case 'Blog':
      return 'book-outline';
    case 'Gear':
      return 'bag-outline';
    case 'Membership':
      return 'person-circle-outline';
    default:
      return 'ellipse-outline';
  }
}
