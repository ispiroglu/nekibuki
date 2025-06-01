# Welcome & Onboarding Screen

## 🎯 **Design Purpose**
Create a warm, inviting first impression that educates users about Nekibuki's value proposition while guiding them seamlessly into the authentication flow.

## 🎨 **Visual Design**

### **Layout Structure**
```
┌─────────────────────────┐
│   🌸 Nekibuki Logo      │
│                         │
│   Discover the stories  │
│   behind every landmark │
│                         │
│   [Feature Preview]     │
│                         │
│   ↑ Swipe up to begin   │
└─────────────────────────┘
```

### **Color Scheme**
- **Background**: Subtle gradient from `#FFEBD4` to `#FFC6C6`
- **Logo**: Custom icon with gradient fill using primary colors
- **Text**: Dark overlay on light background for optimal readability
- **Accent Elements**: `#F0A8D0` for interactive hints

### **Typography Hierarchy**
- **App Name**: 32px, Bold, Primary color gradient fill
- **Tagline**: 24px, Semibold, Dark text with subtle shadow
- **Body Text**: 16px, Regular, Balanced line height for easy reading
- **Navigation Hints**: 14px, Medium, With directional icons

## 🎭 **Onboarding Slides - Detailed Layouts**

### **Slide Navigation Pattern**
- **Movement**: Horizontal swipe between 3 feature introduction slides
- **Progress Indication**: Gradient-filled dots at bottom
- **Transition**: Smooth parallax effect with spring animation
- **Navigation**: Tap dots for direct navigation, swipe for sequential flow

### **Slide Dimensions & Structure**
- **Viewport**: Full screen width with safe area considerations
- **Content Area**: 90% width, centered with 5% margins
- **Vertical Distribution**: 30% hero, 40% content, 30% navigation
- **Aspect Ratio**: Maintains 16:9 for hero illustrations

---

## 📱 **Slide 1: "Capture" - Detailed Layout**

### **Visual Layout**
```
┌─────────────────────────┐
│                         │  ← Safe area (24px)
│        ••• ○●○          │  ← Progress dots (top)
│                         │
│     📸                  │  ← Hero icon (120px)
│   ╭─────────╮           │
│   │ Camera  │           │  ← Illustration frame
│   │ Frame   │           │
│   ╰─────────╯           │
│                         │
│    Snap & Discover      │  ← H2 Heading (24px)
│                         │
│  Point your camera at   │  ← Body text (16px)
│  any landmark and let   │
│  Nekibuki instantly     │
│  reveal its secrets     │
│                         │
│                         │
│    ○○● (Swipe right)    │  ← Navigation dots
│                         │
└─────────────────────────┘
```

### **Content Specifications**
- **Hero Icon**: 120px camera icon with gradient fill `#F0A8D0` to `#F7B5CA`
- **Illustration Frame**: Dashed border camera viewfinder, 200x150px
- **Background**: Radial gradient from `#F0A8D0` (center) to `#F7B5CA` (edges)
- **Animation**: Camera icon gentle float animation (2s cycle)

### **Text Content**
- **Heading**: "Snap & Discover" - 24px, Bold, White with shadow
- **Body**: "Point your camera at any landmark and let Nekibuki instantly reveal its secrets"
- **Character Count**: Heading 15 chars, Body 82 chars (optimal for scanning)

### **Interactive Elements**
- **Progress Dots**: First dot filled with `#FFEBD4`, others outlined
- **Swipe Hint**: Subtle arrow animation pointing right
- **Touch Areas**: Full slide is swipeable, dots are tappable (44px target)

---

## 📱 **Slide 2: "Discover" - Detailed Layout**

### **Visual Layout**
```
┌─────────────────────────┐
│                         │
│        ○●○ •••          │  ← Progress dots (center active)
│                         │
│      🧠💡              │  ← Brain + lightbulb icons
│   ┌────┐ ┌────┐        │
│   │Fact│ │Info│        │  ← Floating info cards
│   │ 1  │ │ 2  │        │
│   └────┘ └────┘        │
│      ┌────┐             │
│      │Tip │             │
│      │ 3  │             │
│      └────┘             │
│                         │
│   Instant Knowledge     │  ← H2 Heading (24px)
│                         │
│  Get rich historical    │  ← Body text (16px)
│  facts, architectural   │
│  details, and cultural  │
│  significance instantly │
│                         │
│    ○●○ (Swipe right)    │  ← Navigation dots
│                         │
└─────────────────────────┘
```

### **Content Specifications**
- **Hero Icons**: Brain (64px) + Lightbulb (48px) with sparkle effects
- **Info Cards**: 80x60px cards with subtle drop shadows
- **Background**: Linear gradient from `#F7B5CA` (top) to `#FFC6C6` (bottom)
- **Animation**: Cards float with staggered bounce animation

### **Text Content**
- **Heading**: "Instant Knowledge" - 24px, Bold, White with shadow
- **Body**: "Get rich historical facts, architectural details, and cultural significance instantly"
- **Card Labels**: "History", "Architecture", "Culture" - 12px, Medium

### **Interactive Elements**
- **Info Cards**: Subtle scale animation on appearance
- **Knowledge Icons**: Rotating sparkle particles around brain icon
- **Swipe Direction**: Right for next slide, left for previous

---

## 📱 **Slide 3: "Learn" - Detailed Layout**

### **Visual Layout**
```
┌─────────────────────────┐
│                         │
│        ○○● •••          │  ← Progress dots (last active)
│                         │
│       💬❓              │  ← Chat bubble with question
│    ╭─────────╮          │
│    │ "Tell   │          │  ← Speech bubble
│    │ me more │          │
│    │ about..." │        │
│    ╰─────────╯          │
│     ✨ 🤖 ✨           │  ← AI assistant with sparkles
│                         │
│   Interactive Chat      │  ← H2 Heading (24px)
│                         │
│  Ask follow-up questions│  ← Body text (16px)
│  and dive deeper into   │
│  topics that fascinate  │
│  you most              │
│                         │
│    ●●● (Get Started)    │  ← Final CTA
│                         │
└─────────────────────────┘
```

### **Content Specifications**
- **Chat Bubble**: 180x100px with tail, white background with subtle shadow
- **AI Robot Icon**: 80px friendly robot with gradient colors
- **Background**: Linear gradient from `#FFC6C6` (top) to `#FFEBD4` (bottom)
- **Animation**: Typing dots inside chat bubble, sparkles around robot

### **Text Content**
- **Heading**: "Interactive Chat" - 24px, Bold, Dark text
- **Body**: "Ask follow-up questions and dive deeper into topics that fascinate you most"
- **Bubble Text**: "Tell me more about..." with animated typing dots

### **Interactive Elements**
- **Chat Animation**: Simulated typing with three bouncing dots
- **Sparkle Effects**: Rotating particles around AI assistant
- **Final CTA**: "Get Started" button leading to authentication

---

## 🎪 **Cross-Slide Animation System**

### **Slide Transitions**
- **Parallax Effect**: Background moves slower than foreground content
- **Elastic Easing**: `cubic-bezier(0.68, -0.55, 0.265, 1.55)` for bounce
- **Duration**: 500ms for smooth but snappy feel
- **Overlap**: 20% content overlap during transition for depth

### **Element Animations**
```css
/* Slide entrance animation */
.slide-enter {
  transform: translateX(100%) scale(0.95);
  opacity: 0;
}

.slide-enter-active {
  transform: translateX(0) scale(1);
  opacity: 1;
  transition: all 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Hero icon animations */
.hero-icon {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
```

### **Progress Dots Design**
- **Size**: 12px diameter with 8px spacing
- **Active State**: Filled with gradient `#F0A8D0` to `#F7B5CA`
- **Inactive State**: Outlined with 2px border, transparent center
- **Animation**: Scale and color transition on state change

---

## 🔐 **Authentication Section**

### **Google Sign-in Design**
```
┌─────────────────────────┐
│     Ready to explore?   │
│                         │
│  ┌─ Sign-in Area ─────┐ │
│  │ 📱 Continue with    │ │
│  │    Google           │ │
│  └─────────────────────┘ │
│                         │
│   Privacy policy link   │
└─────────────────────────┘
```

### **Interactive Elements**
- **Sign-in Button**: Large touch target (56px height) with gradient border
- **Visual Feedback**: Subtle scale animation on press
- **Trust Indicators**: Google branding maintained within aesthetic
- **Legal Links**: Accessible but unobtrusive privacy policy link

## 🎪 **Animation & Micro-interactions**

### **Entry Animation**
- **Logo**: Gentle fade-in with slight scale animation
- **Content**: Staggered appearance of text elements
- **Background**: Subtle gradient shift animation

### **Navigation Hints**
- **Swipe Indicator**: Animated arrow with gentle pulsing
- **Progress Dots**: Smooth fill animation when advancing
- **Slide Transitions**: Parallax effect with elastic easing

### **Interactive Feedback**
- **Touch Response**: Light haptic feedback for interactions
- **Button States**: Gradient shift on hover/press
- **Loading States**: Gentle spinner during authentication

## 📐 **Spacing & Layout**

### **Content Hierarchy**
- **Logo Area**: 80px top margin from safe area
- **Content Sections**: 32px vertical spacing between major elements
- **Text Blocks**: 16px spacing between related text elements
- **Bottom Actions**: 24px from bottom safe area

### **Responsive Considerations**
- **Safe Area Handling**: Automatic adjustment for notches/islands
- **Content Scaling**: Typography scales with system preferences
- **Landscape Mode**: Horizontal layout adaptation for wide screens

## 🌟 **Accessibility Features**

### **Visual Accessibility**
- **Contrast**: All text meets WCAG AA standards (4.5:1 minimum)
- **Color Independence**: Navigation cues don't rely solely on color
- **Focus Indicators**: Clear focus rings for keyboard navigation

### **Motor Accessibility**
- **Touch Targets**: Minimum 44px touch areas for all interactive elements
- **Gesture Alternatives**: Skip options for users who prefer not to swipe
- **Timeout Settings**: No automatic progression without user interaction

### **Cognitive Accessibility**
- **Clear Messaging**: Simple, jargon-free language
- **Consistent Patterns**: Predictable interaction patterns
- **Progress Indication**: Clear steps and current position in flow

## 🎨 **Design Tokens**

### **Component-Specific Variables**
```
--welcome-logo-size: 64px
--welcome-gradient-primary: linear-gradient(180deg, #FFEBD4 0%, #FFC6C6 100%)
--welcome-card-radius: 24px
--welcome-button-height: 56px
--welcome-spacing-section: 32px
--welcome-animation-duration: 0.6s
--welcome-animation-easing: cubic-bezier(0.4, 0, 0.2, 1)

/* Slide-specific variables */
--slide-hero-icon-size: 120px
--slide-content-width: 90%
--slide-transition-duration: 500ms
--slide-parallax-offset: 20%
--progress-dot-size: 12px
--progress-dot-spacing: 8px
```

### **State Variations**
- **Default State**: Full gradient backgrounds with clear contrast
- **Loading State**: Subtle opacity reduction with spinner overlay
- **Error State**: Gentle shake animation with error color hints
- **Success State**: Brief checkmark animation before navigation

## 💡 **UX Principles Applied**

### **First Impression Goals**
- **Trust Building**: Professional yet approachable visual design
- **Value Communication**: Clear demonstration of app benefits
- **Ease of Use**: Minimal friction to get started
- **Emotional Connection**: Warm, inviting color palette and messaging

### **Onboarding Best Practices**
- **Progressive Disclosure**: Information revealed in digestible chunks
- **Interactive Learning**: Users can explore at their own pace
- **Clear Exit Points**: Easy to skip or return to later
- **Immediate Value**: Benefits clear before commitment required 