import { ViewStyle, TextStyle } from 'react-native';

export const Colors = {
  // Primary backgrounds (from Figma)
  background: '#FFFFFF',           // Main background - fill_SQDJ7F
  contentBackground: '#FAF7FA',    // Content area background - fill_TJ25E9
  surface: '#FCF7FA',             // Surface background - fill_1MYPTC
  
  // Text colors (from Figma)
  text: '#1A0F12',                // Primary text - fill_N0ZR3P
  textSecondary: '#945463',       // Secondary text - fill_4V0KAU
  textTertiary: '#964F75',        // Tertiary text - fill_0LXYNG
  
  // Button colors (from Figma welcome.2)
  buttonPrimary: '#0D80F2',       // Primary button - fill_YBUMQL
  buttonText: '#F7FAFC',          // Button text - fill_90BTPH
  
  // Legacy gradient colors (keeping for compatibility)
  gradientStart: '#FFEBD4',
  gradientEnd: '#FFC6C6',
  primaryPink: '#F0A8D0',
  primaryPinkLight: '#F7B5CA',
  
  // Status colors
  success: '#16A34A',             // From Figma - fill_TK3XNX
  error: '#FF3B30',
  warning: '#FF9500',
  
  // Border and divider colors
  border: '#E2E8F0',              // From Figma - stroke_N4EJZN
  divider: '#E2E8F0',
  
  // Background colors
  backgroundSecondary: '#F2F2F7',
  overlay: 'rgba(0,0,0,0.3)',
  
  // Text colors
  textInverse: '#FFFFFF',
  
  // Border and divider colors
  borderLight: 'rgba(240,168,208,0.3)',
  
  // Status colors
  online: '#34C759',
  offline: '#8E8E93',
  
  // Camera overlay colors
  cameraOverlay: 'rgba(255,255,255,0.9)',
  focusRing: '#FFFFFF',
  guideStroke: '#F0A8D0',
};

export const Gradients = {
  primary: ['#F0A8D0', '#F7B5CA'],
  background: ['#FFEBD4', '#FFC6C6'],
  backgroundRadial: {
    colors: ['#F0A8D0', '#F7B5CA'],
    type: 'radial' as const,
  },
};

export const Sizes = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const Typography = {
  // Main title - style_3BN7SY (Nekibuki title)
  largeTitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    textAlign: 'center' as const,
  },
  
  // Subtitle - style_BKCZEF
  title: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
    textAlign: 'center' as const,
  },
  
  // Section headers - style_1UP70S
  subtitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 23,
  },
  
  // Body text - style_MP5DIF
  body: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 23,
  },
  
  // Small text - style_B3ALVO
  caption: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 21,
  },
  
  // Button text - style_C4YRKK
  buttonText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 24,
    textAlign: 'center' as const,
  },
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  } as ViewStyle,
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6.27,
    elevation: 4,
  } as ViewStyle,
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  } as ViewStyle,
  pink: {
    shadowColor: '#F0A8D0',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  } as ViewStyle,
};

export const Layout = {
  window: {
    width: 393,
    height: 852,
  },
  safeArea: {
    top: 60,
    bottom: 40,
  },
  captureButton: {
    size: 80,
    innerSize: 68,
    dotSize: 56,
  },
  controlButton: {
    size: 44,
  },
  guide: {
    width: 280,
    height: 200,
  },
}; 