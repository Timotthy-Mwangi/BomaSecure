import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import TenantDashboard from '../screens/tenant/Dashboard';
import TenantVisitors from '../screens/tenant/Visitors';
import TenantDeliveries from '../screens/tenant/Deliveries';
import TenantPayments from '../screens/tenant/Payments';
import TenantEmergency from '../screens/tenant/Emergency';
import TenantFinance from '../screens/tenant/Finance';
import GuardDashboard from '../screens/guard/Dashboard';
import GuardCheckIn from '../screens/guard/CheckIn';
import GuardVisitors from '../screens/guard/Visitors';
import GuardDeliveries from '../screens/guard/Deliveries';
import AdminDashboard from '../screens/admin/Dashboard';
import MaintenanceDashboard from '../screens/maintenance/Dashboard';
import MaintenanceRequests from '../screens/maintenance/Requests';
import MaintenanceDirectory from '../screens/maintenance/Directory';
import NotificationsScreen from '../screens/common/Notifications';
import ProfileScreen from '../screens/common/Profile';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationBadge from '../components/NotificationBadge';
import { COLORS } from '../config';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabBarIconWithBadge = ({ routeName, focused, count }) => {
  let iconName;
  if (routeName === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
  else if (routeName === 'Visitors') iconName = focused ? 'people' : 'people-outline';
  else if (routeName === 'Deliveries') iconName = focused ? 'cube' : 'cube-outline';
  else if (routeName === 'Payments') iconName = focused ? 'card' : 'card-outline';
  else if (routeName === 'Finance') iconName = focused ? 'wallet' : 'wallet-outline';
  else if (routeName === 'Emergency') iconName = focused ? 'warning' : 'warning-outline';
  else if (routeName === 'CheckIn') iconName = focused ? 'qr-code' : 'qr-code-outline';
  else if (routeName === 'Requests') iconName = focused ? 'list' : 'list-outline';
  else if (routeName === 'Directory') iconName = focused ? 'people' : 'people-outline';
  else if (routeName === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
  else if (routeName === 'Profile') iconName = focused ? 'person' : 'person-outline';
  else if (routeName === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
  else iconName = 'ellipse';

  return (
    <View style={{ position: 'relative' }}>
      <Ionicons name={iconName} size={size} color={focused ? COLORS.primary : COLORS.textSecondary} />
      {routeName === 'Notifications' && count > 0 && (
        <View style={styles.badgeContainer}>
          <NotificationBadge count={count} />
        </View>
      )}
    </View>
  );
};

const size = 24;

const TenantTabs = () => {
  const { unreadCount } = useNotifications();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => (
          <TabBarIconWithBadge routeName={route.name} focused={focused} count={unreadCount} />
        ),
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: { backgroundColor: COLORS.dark, borderTopColor: COLORS.light },
        headerStyle: { backgroundColor: COLORS.dark },
        headerTintColor: COLORS.text
      })}
    >
      <Tab.Screen name="Dashboard" component={TenantDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="Visitors" component={TenantVisitors} />
      <Tab.Screen name="Deliveries" component={TenantDeliveries} />
      <Tab.Screen name="Payments" component={TenantPayments} />
      <Tab.Screen name="Emergency" component={TenantEmergency} options={{ title: 'Emergency' }} />
    </Tab.Navigator>
  );
};

const GuardTabs = () => {
  const { unreadCount } = useNotifications();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => (
          <TabBarIconWithBadge routeName={route.name} focused={focused} count={unreadCount} />
        ),
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: { backgroundColor: COLORS.dark, borderTopColor: COLORS.light },
        headerStyle: { backgroundColor: COLORS.dark },
        headerTintColor: COLORS.text
      })}
    >
      <Tab.Screen name="Dashboard" component={GuardDashboard} options={{ title: 'Security' }} />
      <Tab.Screen name="CheckIn" component={GuardCheckIn} options={{ title: 'Scan QR' }} />
      <Tab.Screen name="Visitors" component={GuardVisitors} />
      <Tab.Screen name="Deliveries" component={GuardDeliveries} />
    </Tab.Navigator>
  );
};

const AdminTabs = () => {
  const { unreadCount } = useNotifications();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => (
          <TabBarIconWithBadge routeName={route.name} focused={focused} count={unreadCount} />
        ),
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: { backgroundColor: COLORS.dark, borderTopColor: COLORS.light },
        headerStyle: { backgroundColor: COLORS.dark },
        headerTintColor: COLORS.text
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboard} options={{ title: 'Admin' }} />
      <Tab.Screen name="Finance" component={TenantFinance} options={{ title: 'Finance' }} />
      <Tab.Screen name="Payments" component={TenantPayments} options={{ 
        title: 'Tenant Payments',
        tabBarIcon: ({ focused }) => (
          <Ionicons name={focused ? 'card' : 'card-outline'} size={size} color={focused ? COLORS.primary : COLORS.textSecondary} />
        )
      }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ 
        tabBarIcon: ({ focused }) => (
          <View style={{ position: 'relative' }}>
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={size} color={focused ? COLORS.primary : COLORS.textSecondary} />
            {unreadCount > 0 && <NotificationBadge count={unreadCount} />}
          </View>
        )
      }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const MaintenanceTabs = () => {
  const { unreadCount } = useNotifications();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => (
          <View style={{ position: 'relative' }}>
            <Ionicons 
              name={
                route.name === 'Dashboard' ? (focused ? 'home' : 'home-outline') :
                route.name === 'Requests' ? (focused ? 'list' : 'list-outline') :
                route.name === 'Directory' ? (focused ? 'call' : 'call-outline') :
                route.name === 'Notifications' ? (focused ? 'notifications' : 'notifications-outline') :
                route.name === 'Profile' ? (focused ? 'person' : 'person-outline') : 'ellipse'
              } 
              size={size} 
              color={focused ? COLORS.accent : COLORS.textSecondary} 
            />
            {route.name === 'Notifications' && unreadCount > 0 && (
              <NotificationBadge count={unreadCount} />
            )}
          </View>
        ),
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: { backgroundColor: COLORS.dark, borderTopColor: COLORS.light },
        headerStyle: { backgroundColor: COLORS.dark },
        headerTintColor: COLORS.text
      })}
    >
      <Tab.Screen name="Dashboard" component={MaintenanceDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="Requests" component={MaintenanceRequests} />
      <Tab.Screen name="Directory" component={MaintenanceDirectory} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const MainStack = () => {
  const { user } = useAuth();
  
  const getRoleScreen = () => {
    if (!user) return <LoginScreen />;
    switch (user.role) {
      case 'tenant': return <TenantTabs />;
      case 'guard': return <GuardTabs />;
      case 'admin': return <AdminTabs />;
      case 'maintenance': return <MaintenanceTabs />;
      default: return <TenantTabs />;
    }
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={getRoleScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
};

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -10
  }
});