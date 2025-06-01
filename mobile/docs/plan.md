# Nekibuki Mobile App Development Guide (TypeScript)

## Overview
This guide will help you build the Nekibuki mobile application using React Native with TypeScript and Expo. Since you're new to React Native, this guide includes detailed explanations, step-by-step instructions, and best practices specifically for mobile development with type safety and simplified development workflow.

**What is React Native with TypeScript and Expo?**
React Native is a framework that allows you to build mobile apps using JavaScript/TypeScript and React. TypeScript adds static type checking to JavaScript, helping you catch errors early and providing better development experience. Expo is a platform and set of tools that makes React Native development much easier, especially for beginners.

**Why TypeScript + Expo?**
- **Type Safety**: Catch errors at compile time instead of runtime
- **Better IntelliSense**: Enhanced code completion and documentation
- **Easier Setup**: No need for Xcode or Android Studio for development
- **Faster Development**: Hot reloading, easy testing on devices
- **Built-in APIs**: Camera, authentication, storage, and more out of the box
- **Over-the-Air Updates**: Update your app without app store approval
- **Self-Documenting Code**: Types serve as inline documentation
- **Cross-Platform**: True write-once, run-anywhere experience

**Expo vs React Native CLI:**
| Feature | Expo Managed | React Native CLI |
|---------|--------------|------------------|
| Setup Time | 5 minutes | 1-2 hours |
| Device Testing | Scan QR code | Need emulators |
| Native Modules | Pre-built APIs | Full customization |
| File Size | Larger | Smaller |
| Updates | Over-the-air | App store only |
| Ejection | Possible | Not needed |

## Table of Contents
1. [Development Environment Setup](#1-development-environment-setup)
2. [React Native TypeScript Fundamentals](#2-react-native-typescript-fundamentals)
3. [Project Structure](#3-project-structure)
4. [Core Concepts with TypeScript](#4-core-concepts-with-typescript)
5. [State Management](#5-state-management)
6. [Navigation](#6-navigation)
7. [Camera & Image Handling with Expo](#7-camera--image-handling-with-expo)
8. [Authentication with Expo](#8-authentication-with-expo)
9. [API Integration](#9-api-integration)
10. [UI Components & Styling](#10-ui-components--styling)
11. [Feature Implementation](#11-feature-implementation)
12. [Testing & Debugging with Expo](#12-testing--debugging-with-expo)
13. [Build & Deployment with Expo](#13-build--deployment-with-expo)

## 1. Development Environment Setup

### Prerequisites (Simplified with Expo)
Before starting, you'll need:
- **Node.js** (version 18 or newer)
- **npm** or **yarn**
- **Expo CLI**
- **Expo Go app** on your phone (for testing)
- **Optional**: Android Studio or Xcode (only needed for final builds)

### Step-by-Step Setup

#### 1.1 Install Node.js and npm
```bash
# Check if you have Node.js installed
node --version
npm --version

# If not installed, download from nodejs.org
```

#### 1.2 Install Expo CLI
```bash
npm install -g @expo/cli
# or using yarn
yarn global add @expo/cli
```

#### 1.3 Install Expo Go on Your Phone
1. **iOS**: Download "Expo Go" from the App Store
2. **Android**: Download "Expo Go" from Google Play Store

#### 1.4 Optional: Android Studio (for final builds only)
Only needed when you're ready to build standalone APKs:
1. Download and install **Android Studio**
2. Configure Android SDK

#### 1.5 Optional: Xcode (Mac only, for final builds)
Only needed for iOS builds:
1. Install **Xcode** from Mac App Store

#### 1.6 Verify Installation
```bash
expo --version
```

## 2. React Native TypeScript Fundamentals

### What You Need to Know

#### 2.1 TypeScript Basics
Key TypeScript concepts for React Native:
- **Types**: Define the shape of data (string, number, boolean, etc.)
- **Interfaces**: Define object structures
- **Type Annotations**: Explicitly declare types for variables and functions
- **Generic Types**: Reusable types that work with multiple data types
- **Union Types**: Types that can be one of several types

#### 2.2 React Native vs React Web (TypeScript)
| React Web | React Native | TypeScript Type |
|-----------|--------------|-----------------|
| `<div>` | `<View>` | `ViewProps` |
| `<span>`, `<p>` | `<Text>` | `TextProps` |
| `<input>` | `<TextInput>` | `TextInputProps` |
| `<button>` | `<TouchableOpacity>` | `TouchableOpacityProps` |
| CSS | StyleSheet | `ViewStyle`, `TextStyle` |

#### 2.3 Basic React Native TypeScript Component
```typescript
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Define prop types
interface MyComponentProps {
  title: string;
  subtitle?: string; // Optional prop
  onPress?: () => void;
}

// Define style types
interface Styles {
  container: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, subtitle, onPress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

export default MyComponent;
```

## 3. Project Structure

### 3.1 Initialize Expo TypeScript Project
```bash
cd mobile
npx create-expo-app Nekibuki --template blank-typescript
cd Nekibuki
```

### 3.2 Recommended Expo Folder Structure
```
mobile/Nekibuki/
├── .expo/            # Expo configuration (auto-generated)
├── assets/           # Images, fonts, icons
├── src/              # Your app code
│   ├── components/   # Reusable UI components
│   ├── screens/      # App screens
│   ├── navigation/   # Navigation configuration
│   ├── context/      # State management
│   ├── services/     # API calls and external services
│   ├── utils/        # Helper functions
│   ├── hooks/        # Custom React hooks
│   ├── types/        # TypeScript type definitions
│   └── constants/    # App constants (colors, sizes, etc.)
├── app.json          # Expo configuration
├── App.tsx           # Main app entry point
├── package.json      # Dependencies
├── tsconfig.json     # TypeScript configuration
└── expo-env.d.ts     # Expo TypeScript definitions
```

### 3.3 Create Folder Structure
```bash
mkdir -p src/{components,screens,navigation,context,services,utils,hooks,types,constants}
```

### 3.4 Expo Configuration (app.json)
```json
{
  "expo": {
    "name": "Nekibuki",
    "slug": "nekibuki",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.nekibuki"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.yourcompany.nekibuki",
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-camera",
      "expo-image-picker",
      "@react-native-google-signin/google-signin"
    ]
  }
}
```

### 3.5 Enhanced TypeScript Configuration
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": "./src",
    "paths": {
      "@components/*": ["components/*"],
      "@screens/*": ["screens/*"],
      "@services/*": ["services/*"],
      "@types/*": ["types/*"],
      "@utils/*": ["utils/*"],
      "@constants/*": ["constants/*"],
      "@navigation/*": ["navigation/*"],
      "@context/*": ["context/*"],
      "@hooks/*": ["hooks/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

## 4. Core Concepts with TypeScript

### 4.1 TypeScript Type Definitions
Create a types file for your app:

```typescript
// src/types/index.ts

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  token: string;
}

// Authentication types
export interface AuthState {
  user: User | null;
  isLoading: boolean;
}

// Photo recognition types
export interface RecognitionResult {
  id: string;
  attraction_name: string;
  description: string;
  historical_facts: string;
  interesting_details: string;
  confidence: number;
  image_url?: string;
  timestamp: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Result: { result: RecognitionResult };
};

export type MainTabParamList = {
  Camera: undefined;
  History: undefined;
  Profile: undefined;
};

// Component prop types
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}

export interface CameraComponentProps {
  onImageSelected: (image: ImagePickerResponse) => void;
}

// Image picker types
export interface ImagePickerResponse {
  uri: string;
  type: string;
  name: string;
  size: number;
}
```

### 4.2 Components with TypeScript

#### Functional Components with Props
```typescript
import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';

interface WelcomeScreenProps {
  userName: string;
  onGetStarted?: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ userName, onGetStarted }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Welcome, {userName}!</Text>
    </View>
  );
};

interface Styles {
  container: ViewStyle;
  welcome: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default WelcomeScreen;
```

#### Using Hooks with TypeScript
```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const Counter: React.FC = () => {
  const [count, setCount] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    console.log('Count changed:', count);
  }, [count]);

  const increment = (): void => {
    setCount(prev => prev + 1);
  };

  const reset = (): void => {
    setCount(0);
  };

  return (
    <View>
      <Text>Count: {count}</Text>
      <TouchableOpacity onPress={increment}>
        <Text>Increment</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={reset}>
        <Text>Reset</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Counter;
```

### 4.3 Styling with TypeScript

```typescript
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';

// Define style interfaces
interface Styles {
  container: ViewStyle;
  button: ViewStyle;
  buttonText: TextStyle;
  image: ImageStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
});
```

## 5. State Management

### 5.1 React Context Setup with TypeScript

For Nekibuki, we'll use React Context for state management with full TypeScript support.

#### Create Authentication Context
```typescript
// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check if user is already logged in
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async (): Promise<void> => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser: User = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User): Promise<void> => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error saving user data:', error);
      throw new Error('Failed to save user data');
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Error removing user data:', error);
      throw new Error('Failed to logout');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

#### Create App Context for Photo Processing
```typescript
// src/context/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { RecognitionResult } from '../types';

interface AppContextType {
  isProcessingPhoto: boolean;
  setIsProcessingPhoto: (processing: boolean) => void;
  recognitionHistory: RecognitionResult[];
  addToHistory: (result: RecognitionResult) => void;
  currentPhotoResult: RecognitionResult | null;
  setCurrentPhotoResult: (result: RecognitionResult | null) => void;
  clearHistory: () => void;
}

interface AppProviderProps {
  children: ReactNode;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const [recognitionHistory, setRecognitionHistory] = useState<RecognitionResult[]>([]);
  const [currentPhotoResult, setCurrentPhotoResult] = useState<RecognitionResult | null>(null);

  const addToHistory = (result: RecognitionResult): void => {
    setRecognitionHistory(prev => [result, ...prev]);
  };

  const clearHistory = (): void => {
    setRecognitionHistory([]);
  };

  const value: AppContextType = {
    isProcessingPhoto,
    setIsProcessingPhoto,
    recognitionHistory,
    addToHistory,
    currentPhotoResult,
    setCurrentPhotoResult,
    clearHistory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
```

## 6. Navigation

### 6.1 Install React Navigation with TypeScript Support
```bash
npm install @react-navigation/native
npm install react-native-screens react-native-safe-area-context
npm install @react-navigation/stack @react-navigation/bottom-tabs
npm install @types/react-navigation

# For iOS
cd ios && pod install && cd ..
```

### 6.2 Navigation Types
```typescript
// src/types/navigation.ts
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { RecognitionResult } from './index';

// Stack Navigator Types
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Result: { result: RecognitionResult };
  Onboarding: undefined;
};

export type MainTabParamList = {
  Camera: undefined;
  History: undefined;
  Profile: undefined;
};

// Navigation Prop Types
export type RootStackNavigationProp = StackNavigationProp<RootStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;

// Specific Screen Navigation Props
export type CameraScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Camera'>,
  StackNavigationProp<RootStackParamList>
>;

export type ResultScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Result'>;
export type ResultScreenRouteProp = RouteProp<RootStackParamList, 'Result'>;

// Screen Props Types
export interface CameraScreenProps {
  navigation: CameraScreenNavigationProp;
}

export interface ResultScreenProps {
  navigation: ResultScreenNavigationProp;
  route: ResultScreenRouteProp;
}
```

### 6.3 Basic Navigation Setup with TypeScript
```typescript
// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import CameraScreen from '../screens/CameraScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ResultScreen from '../screens/ResultScreen';
import LoadingScreen from '../screens/LoadingScreen';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, MainTabParamList } from '../types/navigation';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Screens for authenticated users
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <Tab.Screen 
        name="Camera" 
        component={CameraScreen}
        options={{
          tabBarLabel: 'Camera',
          // You can add tab bar icons here
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

// Main navigation logic
const AppNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // User is logged in
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen 
              name="Result" 
              component={ResultScreen}
              options={{
                headerShown: true,
                title: 'Recognition Result',
              }}
            />
          </>
        ) : (
          // User is not logged in
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
```

### 6.4 Using Navigation with TypeScript
```typescript
// In your screen components
import { useNavigation } from '@react-navigation/native';
import { CameraScreenNavigationProp } from '../types/navigation';

const CameraScreen: React.FC = () => {
  const navigation = useNavigation<CameraScreenNavigationProp>();

  const navigateToResult = (result: RecognitionResult): void => {
    navigation.navigate('Result', { result });
  };

  // ... rest of component
};
```

## 7. Camera & Image Handling with Expo

### 7.1 Install Expo Camera and Image Picker
```bash
npx expo install expo-camera expo-image-picker
# No additional setup needed - Expo handles permissions automatically!
```

### 7.2 Camera Component with Expo
```typescript
// src/components/CameraComponent.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, ViewStyle, TextStyle } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

interface CameraComponentProps {
  onImageSelected: (image: ImagePicker.ImagePickerResult) => void;
}

interface Styles {
  container: ViewStyle;
  button: ViewStyle;
  buttonText: TextStyle;
}

const CameraComponent: React.FC<CameraComponentProps> = ({ onImageSelected }) => {
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);

  const requestPermissions = async (): Promise<boolean> => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted');
    return status === 'granted';
  };

  const showImagePicker = (): void => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Gallery', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openCamera = async (): Promise<void> => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission required', 'Camera permission is needed to take photos.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const openGallery = async (): Promise<void> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={showImagePicker}>
        <Text style={styles.buttonText}>📷</Text>
        <Text style={styles.buttonText}>Take Photo</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 50,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default CameraComponent;
```

## 8. Authentication with Expo

### 8.1 Install Google Sign-In for Expo
```bash
npx expo install @react-native-google-signin/google-signin
npx expo install expo-auth-session expo-crypto
```

### 8.2 Google Sign-In Setup with Expo
```typescript
// src/services/googleAuth.ts
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { User } from '../types';

// Google OAuth configuration
const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: 'YOUR_EXPO_CLIENT_ID.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.googleusercontent.com',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.googleusercontent.com',
    webClientId: 'YOUR_WEB_CLIENT_ID.googleusercontent.com',
  });

  return { request, response, promptAsync };
};

export const signInWithGoogle = async (
  promptAsync: () => Promise<AuthSession.AuthRequestPromptOptions>
): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const result = await promptAsync();
    
    if (result.type === 'success') {
      // Get user info from Google
      const userInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${result.params.access_token}`
      );
      const userInfo = await userInfoResponse.json();
      
      const user: User = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        token: result.params.access_token,
      };
      
      return { success: true, user };
    }
    
    return { success: false, error: 'Login was cancelled' };
  } catch (error) {
    return { success: false, error: 'Login failed. Please try again.' };
  }
};

export { useGoogleAuth };
```

### 8.3 Login Screen with Expo
```typescript
// src/screens/LoginScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ViewStyle,
  TextStyle 
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogle, useGoogleAuth } from '../services/googleAuth';

interface Styles {
  container: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  googleButton: ViewStyle;
  buttonText: TextStyle;
}

const LoginScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { login } = useAuth();
  const { request, response, promptAsync } = useGoogleAuth();

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleResponse();
    }
  }, [response]);

  const handleGoogleResponse = async (): Promise<void> => {
    if (!response?.params.access_token) return;
    
    setIsLoading(true);
    try {
      const result = await signInWithGoogle(() => Promise.resolve(response));
      if (result.success && result.user) {
        await login(result.user);
      } else {
        Alert.alert('Login Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      Alert.alert('Login Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    if (!request) {
      Alert.alert('Error', 'Google Sign-In is not ready yet. Please try again.');
      return;
    }
    
    setIsLoading(true);
    try {
      await promptAsync();
    } catch (error) {
      Alert.alert('Login Error', 'Failed to open Google Sign-In. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Nekibuki</Text>
      <Text style={styles.subtitle}>
        Discover attractions through photos{'\n'}
        Learn about the world around you
      </Text>
      
      <TouchableOpacity
        style={[styles.googleButton, isLoading && { opacity: 0.7 }]}
        onPress={handleGoogleSignIn}
        disabled={isLoading || !request}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Signing in...' : '🚀 Sign in with Google'}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.subtitle}>
        Take photos of landmarks, monuments, and attractions{'\n'}
        Get instant detailed information powered by AI
      </Text>
    </View>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 22,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    borderRadius: 12,
    padding: 16,
    minWidth: 250,
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
```

## 9. API Integration

### 9.1 Create API Service
```javascript
// src/services/api.js
const API_BASE_URL = 'http://localhost:8080/api'; // Your Go backend URL

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Upload photo for recognition
  async uploadPhoto(imageUri, authToken) {
    const formData = new FormData();
    formData.append('photo', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    });

    return this.makeRequest('/recognize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
  }

  // Get user's recognition history
  async getHistory(authToken) {
    return this.makeRequest('/history', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
  }
}

export default new ApiService();
```

### 9.2 Custom Hook for API Calls
```javascript
// src/hooks/useApi.js
import { useState } from 'react';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const callApi = async (apiFunction, ...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction(...args);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const recognizePhoto = async (imageUri) => {
    return callApi(apiService.uploadPhoto, imageUri, user.token);
  };

  const getHistory = async () => {
    return callApi(apiService.getHistory, user.token);
  };

  return {
    loading,
    error,
    recognizePhoto,
    getHistory,
  };
};
```

## 10. UI Components & Styling

### 10.1 Design System Constants
```javascript
// src/constants/theme.js
export const Colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#C6C6C8',
};

export const Sizes = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Typography = {
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  caption: {
    fontSize: 14,
    fontWeight: 'normal',
  },
};
```

### 10.2 Reusable Components
```javascript
// src/components/Button.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Sizes } from '../constants/theme';

const Button = ({ title, onPress, variant = 'primary', disabled = false, ...props }) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Text style={[styles.text, styles[`${variant}Text`]]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    padding: Sizes.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: 'white',
  },
  secondaryText: {
    color: 'white',
  },
  outlineText: {
    color: Colors.primary,
  },
});

export default Button;
```

## 11. Feature Implementation

### 11.1 Camera Screen
```javascript
// src/screens/CameraScreen.js
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Alert } from 'react-native';
import CameraComponent from '../components/CameraComponent';
import Button from '../components/Button';
import { useApi } from '../hooks/useApi';
import { useApp } from '../context/AppContext';

const CameraScreen = ({ navigation }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const { recognizePhoto, loading } = useApi();
  const { setCurrentPhotoResult, addToHistory } = useApp();

  const handleImageSelected = (image) => {
    setSelectedImage(image);
  };

  const handleRecognize = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first.');
      return;
    }

    try {
      const result = await recognizePhoto(selectedImage.uri);
      setCurrentPhotoResult(result);
      addToHistory(result);
      navigation.navigate('Result', { result });
    } catch (error) {
      Alert.alert('Recognition Failed', 'Could not recognize the attraction. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capture an Attraction</Text>
      
      <CameraComponent onImageSelected={handleImageSelected} />
      
      {selectedImage && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage.uri }} style={styles.preview} />
          <Button
            title={loading ? "Recognizing..." : "Recognize Attraction"}
            onPress={handleRecognize}
            disabled={loading}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
});

export default CameraScreen;
```

### 11.2 Results Screen
```javascript
// src/screens/ResultScreen.js
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Button from '../components/Button';

const ResultScreen = ({ route, navigation }) => {
  const { result } = route.params;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{result.attraction_name}</Text>
        <Text style={styles.confidence}>
          Confidence: {(result.confidence * 100).toFixed(1)}%
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{result.description}</Text>

        <Text style={styles.sectionTitle}>Historical Facts</Text>
        <Text style={styles.description}>{result.historical_facts}</Text>

        <Text style={styles.sectionTitle}>Interesting Details</Text>
        <Text style={styles.description}>{result.interesting_details}</Text>
      </View>

      <View style={styles.footer}>
        <Button
          title="Take Another Photo"
          onPress={() => navigation.goBack()}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  confidence: {
    fontSize: 16,
    color: '#6c757d',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#495057',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#212529',
  },
  footer: {
    padding: 20,
  },
});

export default ResultScreen;
```

## 12. Testing & Debugging with Expo

### 12.1 Running the App (Much Simpler!)
```bash
# Start Expo development server
npx expo start

# This will show a QR code
# Scan it with:
# - Camera app (iOS)
# - Expo Go app (Android)
# - Or press 'a' for Android emulator
# - Or press 'i' for iOS simulator
```

### 12.2 Expo Development Benefits

#### Hot Reloading
- Changes appear instantly on your device
- No need to rebuild or restart
- Works across multiple devices simultaneously

#### Easy Device Testing
- Scan QR code with your phone
- Test on real devices without complex setup
- Share with team members easily

#### Built-in Debugging
```bash
# Enable debugging in Expo
# Shake your device or press Ctrl+M
# Select "Debug Remote JS" 
# Opens Chrome DevTools automatically
```

### 12.3 Expo DevTools
```bash
# Open Expo DevTools in browser
npx expo start --dev-client

# Features available:
# - Device logs
# - Performance monitoring
# - Asset management
# - Build status
```

### 12.4 Common Expo Issues and Solutions

**Metro bundler issues:**
```bash
npx expo start --clear
```

**Dependencies issues:**
```bash
npx expo install --fix
```

**Cache problems:**
```bash
npx expo start --clear --reset-cache
```

## 13. Build & Deployment with Expo

### 13.1 Expo Application Services (EAS)

#### Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

#### Configure EAS Build
```bash
eas build:configure
```

This creates `eas.json`:
```json
{
  "cli": {
    "version": ">= 2.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

### 13.2 Building for Different Platforms

#### Android Build (APK)
```bash
# Development build
eas build --platform android --profile development

# Production build  
eas build --platform android --profile production
```

#### iOS Build (IPA)
```bash
# Development build
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production
```

### 13.3 Over-the-Air Updates
```bash
# Install Expo Updates
npx expo install expo-updates

# Publish update
eas update --branch production --message "Bug fixes and improvements"
```

### 13.4 App Store Submission with EAS
```bash
# Submit to Google Play
eas submit --platform android

# Submit to App Store  
eas submit --platform ios
```

### 13.5 Expo vs Traditional Deployment

| Feature | Expo EAS | Traditional |
|---------|----------|-------------|
| Setup Time | 10 minutes | 2-3 hours |
| Build Process | Cloud-based | Local machine |
| Signing | Automatic | Manual setup |
| Updates | Over-the-air | App store only |
| Cost | Free tier available | Free (but complex) |

## Getting Started Checklist (Expo)

- [ ] Install Node.js and Expo CLI
- [ ] Download Expo Go app on your phone  
- [ ] Create new Expo TypeScript project
- [ ] Set up folder structure
- [ ] Test app on your phone (scan QR code)
- [ ] Implement navigation with TypeScript
- [ ] Add authentication context
- [ ] Create login screen with Expo Google Sign-In
- [ ] Implement camera functionality with Expo Camera
- [ ] Create API service for backend communication
- [ ] Build main camera screen
- [ ] Add results display screen
- [ ] Test thoroughly on multiple devices
- [ ] Build with EAS and deploy

## Why Expo is Perfect for Nekibuki

1. **Rapid Prototyping**: Get your app running on a real device in minutes
2. **Built-in Camera API**: No complex setup for photo capture
3. **Easy Authentication**: Simplified Google OAuth flow
4. **Cross-Platform**: Write once, test everywhere
5. **Over-the-Air Updates**: Fix bugs and add features without app store delays
6. **Team Collaboration**: Easy sharing and testing
7. **Production Ready**: Many apps in app stores use Expo

**When to consider ejecting from Expo:**
- Need specific native modules not available in Expo
- App store size is critical (Expo apps are larger)
- Need deep native customization
- Advanced background processing requirements

For Nekibuki's requirements (camera, authentication, API calls, image processing), Expo provides everything you need with much less complexity! 