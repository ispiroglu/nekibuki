# Account Settings Screen

## 🎯 **Design Purpose**
Provide a clean, organized interface for users to manage their account preferences, customize their experience, and access important app settings while maintaining the app's minimalistic aesthetic.

## 🎨 **Visual Design**

### **Settings Layout Structure**
```
┌─────────────────────────┐
│ ←  Settings             │
│                         │
│ ┌─ Profile ───────────┐ │
│ │ 👤 John Doe         │ │
│ │ john@email.com      │ │
│ │ [Edit Profile]      │ │
│ └─────────────────────┘ │
│                         │
│ ┌─ Preferences ───────┐ │
│ │ 🔔 Notifications    │ │
│ │ 🌙 Dark Mode        │ │
│ │ 🎵 Audio Settings   │ │
│ └─────────────────────┘ │
│                         │
│ ┌─ App Info ──────────┐ │
│ │ ❓ Help & Support   │ │
│ │ 🔒 Privacy Policy   │ │
│ │ ⚡ Version 1.0.0   │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### **Color Scheme**
- **Background**: Gradient from `#FFEBD4` to `#FFC6C6`
- **Section Cards**: `rgba(255,235,212,0.9)` with subtle shadows
- **Headers**: `#F0A8D0` for section titles
- **Accent Elements**: `#F7B5CA` for active states and toggles

## 👤 **Profile Section**

### **Profile Card Design**
- **Background**: Gradient from `#FFEBD4` with light transparency
- **Avatar**: Circular Google profile image or default gradient avatar
- **Name Display**: 20px, Semibold, primary color
- **Email Display**: 16px, Regular, secondary text color
- **Edit Button**: Minimal text button with gradient underline

### **Profile Information**
- **User Name**: Display name from Google account
- **Email Address**: Primary email with verification status
- **Profile Photo**: Google account photo with fallback to initials
- **Account Type**: Free/Premium indicator (for future use)

### **Profile Actions**
- **Edit Profile**: Opens profile editing modal
- **Change Photo**: Access to photo selection
- **Account Sync**: Google account synchronization status
- **Sign Out**: Clear logout option with confirmation

## ⚙️ **Preferences Section**

### **Settings Categories**
```
┌─ Notifications ─────────┐
│ 📱 Push Notifications   │
│ 📧 Email Updates        │
│ 🔔 Discovery Alerts    │
└─────────────────────────┘

┌─ Experience ────────────┐
│ 🌙 Dark Mode Theme      │
│ 🎵 Audio Narration     │
│ 🌍 Language Preference │
│ 📏 Units (Metric/Imperial)
└─────────────────────────┘

┌─ Privacy ───────────────┐
│ 📍 Location Services    │
│ 📊 Analytics Sharing    │
│ 🎯 Personalization     │
└─────────────────────────┘
```

### **Toggle Switch Design**
- **Size**: 44px width, 24px height for accessibility
- **Active State**: Gradient from `#F0A8D0` to `#F7B5CA`
- **Inactive State**: Light gray with transparency
- **Animation**: Smooth sliding transition with spring easing
- **Labels**: Clear on/off indicators

### **Preference Controls**
- **Notifications**: Toggle switches for different notification types
- **Theme Settings**: Dark/light mode toggle with system preference option
- **Language**: Dropdown with supported languages
- **Audio**: Volume controls and voice selection
- **Units**: Metric/Imperial measurement toggle

## 📱 **Notification Settings**

### **Notification Categories**
- **Discovery Alerts**: New attractions in user's area
- **Educational Content**: Weekly learning facts and tips
- **App Updates**: Feature announcements and updates
- **Achievement Notifications**: Learning milestones and streaks
- **Social Features**: Future social interaction notifications

### **Notification Controls**
- **Master Toggle**: Enable/disable all notifications
- **Category Toggles**: Individual control for each type
- **Quiet Hours**: Time-based notification blocking
- **Frequency Settings**: How often to receive notifications

### **Visual Design**
- **Section Headers**: 18px, Semibold, with relevant icons
- **Setting Items**: 16px text with clear descriptions
- **State Indicators**: Color-coded toggles and status icons
- **Spacing**: Generous padding for touch accessibility

## 🌙 **Appearance & Accessibility**

### **Theme Options**
- **Light Mode**: Default app color scheme
- **Dark Mode**: Dark backgrounds with adapted color palette
- **System**: Follows device appearance settings
- **High Contrast**: Enhanced visibility for accessibility

### **Accessibility Settings**
- **Text Size**: System font size integration
- **Motion Reduction**: Respect system motion preferences
- **Voice Control**: Enhanced voice command support
- **Screen Reader**: VoiceOver/TalkBack optimization

### **Visual Adaptations**
- **Color Adjustments**: Options for color blind users
- **Contrast Enhancement**: Improved text visibility
- **Focus Indicators**: Enhanced keyboard navigation
- **Touch Targets**: Adjustable touch area sizes

## 🛡️ **Privacy & Security**

### **Data Management**
- **Photo Storage**: Options for local vs cloud storage
- **Search History**: View and clear recognition history
- **Location Data**: Control location tracking preferences
- **Analytics**: Opt-in/out of usage analytics

### **Account Security**
- **Two-Factor Authentication**: Enhanced security options
- **Connected Apps**: Manage third-party integrations
- **Data Export**: Download personal data
- **Account Deletion**: Clear account removal process

### **Privacy Controls**
- **Data Sharing**: Control what information is shared
- **Personalization**: Manage algorithmic personalization
- **Marketing**: Communication preferences
- **Cookies**: Web-based privacy controls

## 📋 **App Information**

### **Help & Support Section**
```
┌─ Support ───────────────┐
│ ❓ FAQ & Help Center    │
│ 💬 Contact Support     │
│ 🐛 Report a Bug        │
│ 💡 Feature Requests    │
└─────────────────────────┘
```

### **Legal & Information**
- **Privacy Policy**: Link to comprehensive privacy documentation
- **Terms of Service**: User agreement and terms
- **Licenses**: Open source and third-party licenses
- **Version Information**: Current app version and build

### **Support Features**
- **Help Center**: Searchable FAQ and documentation
- **Contact Form**: Direct support communication
- **Bug Reporting**: Simplified issue reporting
- **Feedback**: User suggestion and rating system

## 🎭 **Interaction Patterns**

### **Navigation**
- **Entry**: Swipe from left edge or settings button
- **Back Navigation**: Swipe right or back arrow
- **Section Scrolling**: Smooth vertical scrolling
- **Sub-menus**: Slide-in panels for detailed settings

### **Touch Interactions**
- **Toggle Switches**: Large touch targets with haptic feedback
- **List Items**: Full-width touch areas with visual feedback
- **Buttons**: Clear press states with color transitions
- **Links**: Underlined text with external link indicators

### **Visual Feedback**
- **Setting Changes**: Immediate visual confirmation
- **Loading States**: Subtle spinners for network operations
- **Error States**: Clear error messages with retry options
- **Success States**: Brief confirmation animations

## 📐 **Layout Specifications**

### **Content Organization**
- **Section Spacing**: 32px between major sections
- **Item Spacing**: 16px between individual settings
- **Card Padding**: 20px internal spacing
- **Safe Areas**: 20px margins from screen edges

### **Responsive Design**
- **Portrait Mode**: Standard vertical layout
- **Landscape Mode**: Adapted spacing for wider screens
- **Text Scaling**: Supports accessibility text sizes
- **Touch Targets**: Minimum 44px for all interactive elements

### **Visual Hierarchy**
- **Section Headers**: 18px, Semibold, with icons
- **Setting Labels**: 16px, Medium, descriptive text
- **Sub-text**: 14px, Regular, additional context
- **Status Text**: 14px, color-coded for state indication

## 🌟 **Accessibility Features**

### **Screen Reader Support**
- **Semantic Structure**: Proper heading and list structures
- **Descriptive Labels**: Clear labels for all controls
- **State Announcements**: Toggle states announced clearly
- **Navigation Hints**: Clear instructions for complex interactions

### **Motor Accessibility**
- **Large Touch Targets**: All controls minimum 44px
- **Switch Alternatives**: Voice commands for toggle controls
- **Gesture Alternatives**: Traditional tap alternatives to swipes
- **Timeout Considerations**: No automatic logouts during use

### **Cognitive Accessibility**
- **Clear Language**: Simple, jargon-free descriptions
- **Consistent Patterns**: Predictable interaction patterns
- **Progressive Disclosure**: Complex settings revealed gradually
- **Help Context**: Contextual help for confusing settings

## 🎨 **Design Tokens**

### **Settings-Specific Variables**
```
--settings-section-spacing: 32px
--settings-item-height: 56px
--settings-toggle-width: 44px
--settings-toggle-height: 24px
--settings-card-radius: 16px
--settings-animation-duration: 0.2s
--settings-shadow-card: 0 2px 12px rgba(240,168,208,0.1)
```

### **Component Colors**
- **Card Background**: `rgba(255,235,212,0.9)`
- **Toggle Active**: `linear-gradient(90deg, #F0A8D0 0%, #F7B5CA 100%)`
- **Toggle Inactive**: `rgba(200,200,200,0.5)`
- **Text Primary**: `#333333`
- **Text Secondary**: `#666666`

## 💡 **UX Principles Applied**

### **User Control**
- **Clear Options**: All settings clearly labeled and explained
- **Reversible Actions**: Easy to undo setting changes
- **Default Values**: Sensible defaults that work for most users
- **Progressive Enhancement**: Advanced options available but not overwhelming

### **Information Architecture**
- **Logical Grouping**: Related settings grouped together
- **Frequency-Based Order**: Most-used settings at the top
- **Search Capability**: Find specific settings quickly
- **Contextual Help**: Explanations available when needed

### **Trust & Security**
- **Transparent Data Use**: Clear explanations of data usage
- **User Consent**: Explicit opt-in for data sharing
- **Easy Opt-out**: Simple ways to disable features
- **Security Indicators**: Clear security status information 