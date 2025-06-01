# Viewfinder/Camera Screen

## 🎯 **Design Purpose**
Create an intuitive, distraction-free camera interface that makes photo capture feel natural while providing subtle guidance for optimal recognition results.

## 🎨 **Visual Design**

### **Full-Screen Camera Layout**
```
┌─────────────────────────┐
│ [Live Camera Preview]   │
│                         │
│  ╭─────────────────╮    │
│  │   Viewfinder    │    │
│  │     Guide       │    │
│  ╰─────────────────╯    │
│                         │
│     ⚪ Capture           │
│                         │
│ 📁 Gallery  ⚙️ Settings │
└─────────────────────────┘
```

### **Color Scheme**
- **Camera Overlay**: Transparent with subtle gradient borders
- **Viewfinder Guide**: Dashed border in `#F0A8D0` with 60% opacity
- **Capture Button**: Gradient from `#F0A8D0` to `#F7B5CA`
- **UI Elements**: White with soft shadows for visibility

## 📸 **Camera Interface Elements**

### **Viewfinder Guide Design**
- **Shape**: Rounded rectangle with 12px border radius
- **Border**: 2px dashed line in primary color
- **Animation**: Gentle pulsing to draw attention
- **Purpose**: Helps users frame attractions optimally
- **Size**: Approximately 60% of screen width, centered

### **Capture Button**
- **Size**: 80px diameter circle
- **Position**: Bottom center, 40px from safe area
- **Visual**: Radial gradient with subtle shadow
- **States**: 
  - Default: Full gradient with soft glow
  - Pressed: Slightly smaller scale with deeper shadow
  - Processing: Spinner animation overlay

### **Secondary Controls**
- **Gallery Access**: Bottom left, 44px touch target
- **Settings**: Bottom right, 44px touch target
- **Style**: Minimal icons with background blur
- **Color**: White with subtle shadow for contrast

## 🎭 **Interaction Patterns**

### **Gesture Navigation**
- **Tap Center**: Capture photo
- **Swipe Right**: Access gallery
- **Swipe Up**: View recent captures
- **Swipe Down**: Access camera settings
- **Long Press**: Focus and exposure lock

### **Visual Feedback**
- **Focus Indication**: Brief circular animation at tap point
- **Capture Feedback**: Flash animation and haptic response
- **Processing Hint**: Smooth transition to loading screen
- **Error States**: Gentle shake with color change

## 🌟 **Photography Guidance**

### **Optimal Framing Hints**
- **Composition Guide**: Rule of thirds overlay (optional)
- **Distance Indicator**: Subtle hints for optimal distance
- **Lighting Feedback**: Gentle color shifts for lighting conditions
- **Stability Guide**: Steady hand reminder for sharp photos

### **Smart Assistance**
- **Auto-Focus**: Visual confirmation when subject is in focus
- **Exposure Balance**: Automatic adjustment with visual feedback
- **Motion Detection**: Warning for camera shake
- **Subject Recognition**: Highlight when landmark detected in frame

## 📐 **Layout Specifications**

### **Safe Area Considerations**
- **Top Margin**: Respect notch/dynamic island
- **Bottom Controls**: 40px from bottom safe area
- **Side Spacing**: 20px margins for secondary controls
- **Camera Preview**: Full screen minus UI elements

### **Responsive Design**
- **Portrait Mode**: Standard vertical layout
- **Landscape Mode**: Controls shift to sides
- **Device Scaling**: Touch targets maintain 44px minimum
- **Aspect Ratios**: Adapts to various screen proportions

## 🎪 **Animation & Transitions**

### **Entry Animation**
- **Camera Preview**: Smooth fade-in from black
- **UI Elements**: Staggered appearance of controls
- **Viewfinder**: Scale-in animation with bounce

### **Capture Sequence**
- **Pre-Capture**: Brief flash of capture button
- **Capture Moment**: Screen flash with haptic feedback
- **Post-Capture**: Smooth transition to processing screen
- **Preview**: Thumbnail animation to gallery

### **State Transitions**
- **Focus Lock**: Pulsing ring around focus point
- **Low Light**: Gentle yellow tint on UI elements
- **Error States**: Red tint with shake animation
- **Success Feedback**: Green confirmation checkmark

## 🔍 **Photography Assistance Features**

### **Quality Optimization**
- **Composition Tips**: Overlay suggestions for better framing
- **Lighting Guidance**: Real-time lighting quality indicator
- **Stability Helper**: Motion blur prevention warnings
- **Subject Focus**: Smart detection of potential landmarks

### **User Education**
- **First Use**: Subtle tutorial overlay
- **Best Practices**: Contextual tips based on conditions
- **Success Examples**: Reference photos for guidance
- **Common Mistakes**: Gentle prevention warnings

## 🌟 **Accessibility Features**

### **Visual Accessibility**
- **High Contrast Mode**: Enhanced visibility options
- **Focus Indicators**: Clear visual focus for controls
- **Text Alternatives**: VoiceOver descriptions for all elements
- **Color Independence**: Functionality doesn't rely on color alone

### **Motor Accessibility**
- **Large Touch Targets**: All controls minimum 44px
- **Voice Activation**: "Capture" voice command
- **Alternative Controls**: Accessibility button options
- **Gesture Timeout**: Reasonable time limits for interactions

### **Cognitive Accessibility**
- **Simple Interface**: Minimal cognitive load
- **Clear Labeling**: Descriptive labels for all controls
- **Consistent Behavior**: Predictable interaction patterns
- **Help Access**: Easy access to guidance and tips

## 🎨 **Design Tokens**

### **Component-Specific Variables**
```
--camera-capture-size: 80px
--camera-guide-opacity: 0.6
--camera-ui-blur: 10px
--camera-shadow-soft: 0 2px 8px rgba(0,0,0,0.2)
--camera-animation-duration: 0.2s
--camera-transition-ease: cubic-bezier(0.4, 0, 0.2, 1)
```

### **State Colors**
- **Normal State**: Primary gradient
- **Focus State**: Bright white ring
- **Error State**: `#FF6B6B` red tint
- **Success State**: `#4ECDC4` green tint
- **Low Light**: `#FFD93D` yellow tint

## 💡 **UX Principles Applied**

### **Simplicity First**
- **Minimal UI**: Only essential controls visible
- **Clear Hierarchy**: Capture button is primary focus
- **Distraction-Free**: Clean interface promotes focus
- **Intuitive Controls**: Standard camera app patterns

### **Photography Best Practices**
- **Framing Assistance**: Subtle guides without obstruction
- **Quality Feedback**: Real-time optimization suggestions
- **Error Prevention**: Proactive guidance for better results
- **Success Enhancement**: Features that improve recognition accuracy

### **Emotional Design**
- **Confidence Building**: Clear guidance reduces uncertainty
- **Achievement**: Satisfying capture feedback
- **Exploration**: Encourages experimentation and discovery
- **Trust**: Reliable, consistent performance builds confidence 