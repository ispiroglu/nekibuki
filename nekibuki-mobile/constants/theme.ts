import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Color palette - ordered from primary (most used) to least used
export const colors = {
  // Primary palette (user specified)
  primary: '#FEFCF3',     // Cream/off-white - main backgrounds
  secondary: '#F5EBE0',   // Light beige - card backgrounds, secondary surfaces
  tertiary: '#F0DBDB',    // Soft pink-beige - borders, subtle accents
  accent: '#DBA39A',      // Muted rose - buttons, active states, highlights
  
  // Complementary colors that work with the warm palette
  text: {
    primary: '#2D1B14',     // Dark brown for main text
    secondary: '#5D4037',   // Medium brown for secondary text
    tertiary: '#8D6E63',    // Light brown for muted text
    inverse: '#FEFCF3',     // Light text for dark backgrounds
  },
  
  // Functional colors that harmonize with the palette
  success: '#8BC34A',       // Soft green
  warning: '#FF9800',       // Warm orange
  error: '#E57373',         // Soft red
  info: '#81C784',          // Soft mint
  
  // Neutral grays with warm undertones
  gray: {
    50: '#FEFCF3',
    100: '#F5EBE0',
    200: '#F0DBDB',
    300: '#E0C4B8',
    400: '#C8A696',
    500: '#A68B7A',
    600: '#8D6E63',
    700: '#6D4C41',
    800: '#5D4037',
    900: '#3E2723',
  },
  
  // Transparent overlays
  overlay: {
    light: 'rgba(254, 252, 243, 0.9)',
    medium: 'rgba(245, 235, 224, 0.8)',
    dark: 'rgba(45, 27, 20, 0.7)',
    black: 'rgba(0, 0, 0, 0.5)',
  },
};

// Typography system
export const typography = {
  fontFamily: {
    regular: 'SpaceGrotesk_400Regular',
    medium: 'SpaceGrotesk_500Medium',
    semiBold: 'SpaceGrotesk_600SemiBold',
    bold: 'SpaceGrotesk_700Bold',
  },
  
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
  } as const,
  
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 28,
    '2xl': 32,
    '3xl': 36,
    '4xl': 40,
    '5xl': 44,
  },
};

// Spacing system
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
};

// Border radius system
export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// Shadow system
export const shadows = {
  sm: {
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  base: {
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  md: {
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  lg: {
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
};

// Layout dimensions
export const layout = {
  screen: {
    width: screenWidth,
    height: screenHeight,
  },
  isSmallScreen: screenWidth < 375,
  isMediumScreen: screenWidth >= 375 && screenWidth < 414,
  isLargeScreen: screenWidth >= 414,
};

// Component-specific theme objects
export const components = {
  button: {
    primary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
      textColor: colors.text.inverse,
    },
    secondary: {
      backgroundColor: colors.secondary,
      borderColor: colors.tertiary,
      textColor: colors.text.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: colors.tertiary,
      textColor: colors.text.primary,
    },
  },
  
  card: {
    primary: {
      backgroundColor: colors.secondary,
      borderColor: colors.tertiary,
    },
    elevated: {
      backgroundColor: colors.primary,
      borderColor: colors.tertiary,
      ...shadows.base,
    },
  },
  
  input: {
    backgroundColor: colors.primary,
    borderColor: colors.tertiary,
    focusBorderColor: colors.accent,
    textColor: colors.text.primary,
    placeholderColor: colors.text.tertiary,
  },
};

// Gradient definitions using the color palette
export const gradients = {
  primary: [colors.primary, colors.secondary],
  warm: [colors.secondary, colors.tertiary],
  accent: [colors.tertiary, colors.accent],
  subtle: [colors.primary, colors.secondary, colors.tertiary],
  overlay: ['transparent', colors.overlay.medium],
};

// Animation durations
export const animations = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Default theme export
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  layout,
  components,
  gradients,
  animations,
};

export default theme; 