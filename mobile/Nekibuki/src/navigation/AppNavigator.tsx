import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import SwipeNavigator from './SwipeNavigator';
import LoadingScreen from '../screens/LoadingScreen';
import ReportScreen from '../screens/ReportScreen';
import { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

// Main navigation logic
const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={SwipeNavigator} />
        <Stack.Screen name="Loading" component={LoadingScreen} />
        <Stack.Screen name="Result" component={ReportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 