# Nekibuki Mobile App

A React Native app built with Expo that allows users to discover stories behind landmarks through photo recognition.

## 🆕 New Feature: Swipe Navigation

**Navigation has been upgraded from bottom tabs to smooth swipe gestures!**

### Features:
- **Swipe Gestures**: Swipe left/right between Camera, History, and Profile screens
- **Visual Indicators**: Top navigation bar with icons and active states
- **Progress Bar**: Animated progress indicator showing current screen
- **Dot Navigation**: Bottom dots for quick screen switching
- **Touch Navigation**: Tap icons or dots to jump to specific screens
- **Smooth Animations**: Fluid transitions powered by react-native-pager-view

### Usage:
- **Swipe Right**: Go to previous screen (Camera ← History ← Profile)
- **Swipe Left**: Go to next screen (Camera → History → Profile)  
- **Tap Icons**: Click on Camera/History/Profile icons to jump to screen
- **Tap Dots**: Use bottom navigation dots for quick access

## 📱 App Features

### Core Functionality
- **Photo Capture**: Take photos with device camera or select from gallery
- **Landmark Recognition**: AI-powered identification of landmarks and attractions
- **Historical Information**: Detailed facts and stories about recognized landmarks
- **Recognition History**: View past discoveries and results

### Screens
- **Camera Screen**: Capture and analyze landmark photos
- **History Screen**: Browse past recognition results (Coming Soon)
- **Profile Screen**: User settings and preferences (Coming Soon)

### Technical Stack
- **React Native + Expo**: Cross-platform mobile development
- **TypeScript**: Type-safe development
- **Swipe Navigation**: react-native-pager-view + gesture-handler
- **Authentication**: Google OAuth integration
- **State Management**: React Context API
- **UI Components**: Expo Vector Icons, custom design system

## 🚀 Getting Started

### Prerequisites
- Node.js (18+)
- Expo CLI
- Expo Go app (for testing)

### Installation
```bash
cd mobile/Nekibuki
npm install
```

### Development
```bash
# Start development server
npx expo start

# Scan QR code with Expo Go app to test on device
```

## 🎨 Design System

### Colors
- **Primary**: `#0D80F2` (Blue)
- **Background**: `#FFFFFF` (White)
- **Surface**: `#FCF7FA` (Light Pink)
- **Text**: `#1A0F12` (Dark)
- **Secondary Text**: `#945463` (Medium)
- **Tertiary Text**: `#964F75` (Light)

### Navigation
- **Swipe Threshold**: 30% of screen width
- **Velocity Threshold**: 500px/s for quick swipes
- **Animation**: Spring animation (tension: 100, friction: 8)

## 🏗️ Project Structure

```
mobile/Nekibuki/
├── src/
│   ├── components/         # Reusable UI components
│   ├── constants/          # Theme, colors, spacing
│   ├── context/           # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── navigation/        # Navigation setup
│   │   ├── AppNavigator.tsx
│   │   ├── SwipeNavigator.tsx
│   │   └── EnhancedSwipeNavigator.tsx
│   ├── screens/           # Screen components
│   │   ├── CameraScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   └── WelcomeScreen.tsx
│   ├── services/          # API and external services
│   └── types/             # TypeScript type definitions
├── assets/                # Images, icons, fonts
├── App.tsx               # App entry point
└── package.json
```

## 🔧 Navigation Implementation

### Basic Swipe Navigator
- Uses `react-native-pager-view` for smooth swiping
- Simple icon indicators and dot navigation
- Clean, minimal interface

### Enhanced Swipe Navigator (Optional)
- Additional gesture detection with `react-native-gesture-handler`
- Animated progress bar
- Enhanced touch feedback and navigation buttons
- More responsive swipe detection

## 📋 Development Notes

### Navigation Switch
To switch between navigation styles:

1. **Basic Swipe Navigation** (Current):
   ```typescript
   import SwipeNavigator from './SwipeNavigator';
   ```

2. **Enhanced Swipe Navigation** (Alternative):
   ```typescript
   import EnhancedSwipeNavigator from './EnhancedSwipeNavigator';
   ```

### Dependencies
- `react-native-pager-view`: Swipe container
- `react-native-gesture-handler`: Enhanced gestures (already installed)
- `@expo/vector-icons`: Icon system
- `react-native-safe-area-context`: Safe area handling

## 🎯 Future Enhancements
- Vertical swipe gestures for additional actions
- Custom page transitions and animations  
- Haptic feedback for swipe actions
- Voice navigation commands
- Accessibility improvements for gesture navigation

## 🐛 Troubleshooting

### Common Issues
1. **Swipe not working**: Ensure `react-native-pager-view` is properly installed
2. **Icons not showing**: Check `@expo/vector-icons` installation
3. **Gesture conflicts**: Verify `GestureHandlerRootView` wraps the app

### Development Tips
- Test swipe navigation on real devices for best experience
- Adjust swipe thresholds based on user feedback
- Use Expo Go app for quick testing iterations

## Features

- 🌟 **Beautiful Onboarding**: Gradient-based welcome screens with smooth animations
- 📸 **Photo Capture**: Take photos of landmarks with an intuitive camera interface
- 🤖 **AI Recognition**: Upload photos to get instant information about attractions
- 🔐 **Google Authentication**: Secure sign-in with Google OAuth
- 📱 **Cross-Platform**: Works on both iOS and Android
- 🎨 **Modern Design**: Beautiful UI following Figma designs with pink gradient theme

## Tech Stack

- **React Native** with **TypeScript** for type safety
- **Expo** for simplified development and deployment
- **React Navigation** for navigation between screens
- **Expo Camera & Image Picker** for photo functionality
- **AsyncStorage** for local data persistence
- **Linear Gradients** for beautiful UI styling

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- Expo CLI: `npm install -g @expo/cli`
- Expo Go app on your phone (for testing)

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd mobile/Nekibuki
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Test on your device:**
   - Scan the QR code with your camera (iOS) or Expo Go app (Android)
   - Or press `i` for iOS simulator, `a` for Android emulator

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── Button.tsx      # Gradient button component
├── constants/           # App constants and theme
│   └── theme.ts        # Colors, typography, spacing
├── context/            # React Context providers
│   └── AuthContext.tsx # Authentication state management
├── navigation/         # Navigation configuration
│   └── AppNavigator.tsx # Main navigation setup
├── screens/            # Screen components
│   ├── WelcomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── CameraScreen.tsx
│   └── LoadingScreen.tsx
├── types/              # TypeScript type definitions
│   └── index.ts
└── services/           # API and external services
```

## App Flow

1. **First Launch**: Welcome screen with onboarding
2. **Authentication**: Google sign-in required
3. **Main App**: 
   - **Camera Tab**: Take photos with viewfinder guide
   - **History Tab**: View past recognitions (coming soon)
   - **Profile Tab**: User settings (coming soon)

## Design System

### Colors
- **Primary Gradient**: `#FFEBD4` → `#FFC6C6`
- **Pink Accent**: `#F0A8D0` → `#F7B5CA`
- **Text**: `#2C2C2E` (primary), `#8E8E93` (tertiary)

### Typography
- **Large Title**: 32px, Bold
- **Title**: 28px, Bold
- **Subtitle**: 24px, Semibold
- **Body**: 16px, Regular

## Development

### Running on Device
```bash
npx expo start
# Scan QR code with Expo Go app
```

### Building for Production
```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Configure build
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS  
eas build --platform ios
```

### Over-the-Air Updates
```bash
eas update --branch production --message "Bug fixes"
```

## Camera Functionality

The app currently uses Expo ImagePicker for:
- Taking photos with device camera
- Selecting images from gallery
- Permission handling

Future enhancement: Integrate live camera preview with Expo Camera for real-time viewfinder.

## Authentication

Currently implements mock Google authentication. To integrate real Google OAuth:

1. Set up Google OAuth credentials
2. Configure `google-services.json` (Android) and GoogleService-Info.plist (iOS)
3. Update the authentication service in `src/services/`

## Contributing

1. Follow TypeScript best practices
2. Use the established design system
3. Maintain component reusability
4. Write self-documenting code with proper types

## Deployment

The app is configured for deployment via Expo Application Services (EAS):
- Automatic builds in the cloud
- Easy app store submission
- Over-the-air updates for quick fixes

## Future Enhancements

- [ ] Real Google OAuth integration
- [ ] Backend API integration for photo recognition
- [ ] History screen with saved recognitions
- [ ] Profile screen with user settings
- [ ] Push notifications
- [ ] Offline functionality
- [ ] Social sharing features

---

Built with ❤️ using React Native, TypeScript, and Expo 