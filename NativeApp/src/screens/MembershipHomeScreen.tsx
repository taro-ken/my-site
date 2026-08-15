import { useCallback } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import SiteWebView from '../components/SiteWebView';
import { TAB_ROUTES } from '../config';
import { useMembershipAuth } from '../context/MembershipAuthContext';
import type { MembershipStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<MembershipStackParamList, 'MembershipHome'>;

export default function MembershipHomeScreen({ navigation }: Props) {
  const { webViewKey } = useMembershipAuth();

  const handleInterceptInternalPath = useCallback(
    (pathname: string) => {
      if (pathname === '/login') {
        navigation.navigate('Login', { registered: false });
        return true;
      }

      if (pathname === '/register') {
        navigation.navigate('Register');
        return true;
      }

      return false;
    },
    [navigation],
  );

  return (
    <SiteWebView
      path={TAB_ROUTES.membership}
      remountKey={webViewKey}
      onInterceptInternalPath={handleInterceptInternalPath}
    />
  );
}
