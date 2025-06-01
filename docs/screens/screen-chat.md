# Chat Interface Screen

## 🎯 **Design Purpose**
Provide an intelligent, conversational interface that allows users to ask follow-up questions about attractions, creating a personalized learning experience that adapts to their curiosity and interests.

## 🎨 **Visual Design**

### **Collapsed Chat Bubble**
```
┌─ Main Content ──────────┐
│                         │
│ [Information Display]   │
│                         │
│                         │
│                    💬   │
│               [2 new]   │
└─────────────────────────┘
```

### **Expanded Chat Interface**
```
┌─────────────────────────┐
│ ┌─ Chat Header ───────┐ │
│ │ 🤖 Ask me anything  │ │
│ │              ✕ Close│ │
│ └─────────────────────┘ │
│                         │
│ ┌─ Conversation ──────┐ │
│ │ 🤖: I can help you  │ │
│ │     learn more!     │ │
│ │                     │ │
│ │           You: Hi! 👤│ │
│ └─────────────────────┘ │
│                         │
│ ┌─ Quick Suggestions ─┐ │
│ │ [History] [Photos]  │ │
│ │ [Architecture] [Art]│
│ └─────────────────────┘ │
│                         │
│ [Type your question...] │
│                    [📤] │
└─────────────────────────┘
```

### **Color Scheme**
- **Chat Container**: Gradient from `#FFEBD4` to `#FFC6C6`
- **User Messages**: Gradient from `#F0A8D0` to `#F7B5CA`
- **Bot Messages**: `rgba(255,235,212,0.9)` with subtle border
- **Suggestion Chips**: `rgba(240,168,208,0.2)` background

## 💬 **Chat Bubble Design (Collapsed)**

### **Floating Bubble Styling**
- **Size**: 56px diameter circle
- **Position**: Fixed bottom-right, 20px from edges
- **Background**: Gradient from `#F0A8D0` to `#F7B5CA`
- **Shadow**: Soft drop shadow for depth
- **Animation**: Gentle bob animation (2s cycle)

### **Notification Badge**
- **Position**: Top-right of bubble
- **Size**: 20px diameter
- **Background**: `#FFC6C6` with white text
- **Typography**: 12px, Bold, centered
- **Animation**: Scale bounce when new messages arrive

### **Interactive States**
- **Default**: Gentle pulsing glow
- **Hover**: Slight scale increase (1.05x)
- **Active**: Press animation with haptic feedback
- **New Message**: Color pulse with notification badge

## 🗨️ **Expanded Chat Interface**

### **Chat Header Design**
- **Background**: Slight gradient with transparency
- **Height**: 60px with proper padding
- **Title**: "Ask me anything" with bot emoji
- **Close Button**: Minimal "×" with touch target
- **Border**: Subtle bottom border in `#F7B5CA`

### **Conversation Area**
- **Background**: Transparent with subtle pattern
- **Height**: Maximum 60% of screen height
- **Scrolling**: Smooth with momentum scrolling
- **Padding**: 16px horizontal, 12px vertical
- **Auto-scroll**: Automatically scrolls to newest message

### **Message Bubble Styling**
```
User Messages (Right-aligned):
- Background: Linear gradient (#F0A8D0 to #F7B5CA)
- Color: White text
- Border Radius: 20px 20px 4px 20px
- Max Width: 80% of container
- Margin: Left auto for right alignment

Bot Messages (Left-aligned):
- Background: rgba(255,235,212,0.9)
- Color: Dark text (#333)
- Border: 1px solid rgba(247,181,202,0.3)
- Border Radius: 20px 20px 20px 4px
- Max Width: 85% of container
```

## 🎯 **Quick Suggestion System**

### **Suggestion Chip Design**
```
┌─ Suggestion Chips ──────┐
│                         │
│ [History] [Architecture]│
│ [Photos]  [Fun Facts]   │
│ [Visiting] [Nearby]     │
│                         │
└─────────────────────────┘
```

### **Chip Styling**
- **Background**: `rgba(240,168,208,0.2)` with hover effects
- **Border**: 1px solid `rgba(240,168,208,0.4)`
- **Border Radius**: 20px for pill shape
- **Padding**: 8px horizontal, 6px vertical
- **Typography**: 14px, Medium weight
- **Spacing**: 8px gap between chips

### **Smart Suggestions**
- **Context-Aware**: Based on current attraction information
- **Dynamic**: Updates based on conversation history
- **Categorized**: History, Architecture, Visiting Info, Photos, etc.
- **Learning**: Adapts to user preferences over time

## 📝 **Input Area Design**

### **Text Input Field**
- **Background**: White with subtle shadow
- **Border**: 1px solid `rgba(247,181,202,0.3)`
- **Border Radius**: 24px for rounded appearance
- **Padding**: 12px horizontal, 10px vertical
- **Placeholder**: "Type your question..." in light gray
- **Typography**: 16px system font

### **Send Button**
- **Size**: 40px diameter circle
- **Background**: Gradient from `#F0A8D0` to `#F7B5CA`
- **Icon**: Paper plane in white
- **Position**: Right side of input area
- **States**: Disabled when input is empty

### **Voice Input Option**
- **Position**: Left side of input field
- **Icon**: Microphone in `#F7B5CA`
- **Functionality**: Speech-to-text capability
- **Visual Feedback**: Pulsing animation during recording

## 🎭 **Interaction Patterns**

### **Opening Animation**
- **Trigger**: Tap on floating chat bubble
- **Animation**: Scale and slide-up from bubble position
- **Duration**: 300ms with spring easing
- **Background**: Fade-in overlay behind chat

### **Closing Animation**
- **Triggers**: Tap close button, swipe down, tap outside
- **Animation**: Scale down to original bubble position
- **Duration**: 250ms with ease-in timing
- **State Preservation**: Conversation history maintained

### **Message Sending**
- **User Input**: Immediate appearance with slide-in animation
- **Bot Response**: Typing indicator followed by message reveal
- **Scroll Behavior**: Auto-scroll to show new messages
- **Loading States**: Three-dot typing animation

### **Gesture Support**
- **Swipe Down**: Minimize chat interface
- **Pull to Refresh**: Clear conversation (with confirmation)
- **Long Press Message**: Copy text option
- **Tap Suggestion**: Insert into input field

## 🤖 **Conversational AI Design**

### **Bot Personality**
- **Tone**: Friendly, knowledgeable, enthusiastic about learning
- **Language**: Conversational but informative
- **Responses**: Concise but comprehensive
- **Fallbacks**: Graceful handling of unknown questions

### **Message Types**
- **Text Responses**: Primary communication method
- **Quick Facts**: Structured information cards
- **Image Suggestions**: Related photos or diagrams
- **External Links**: Resources for deeper learning
- **Follow-up Questions**: Encouraging continued exploration

### **Error Handling**
- **Network Issues**: Clear offline indicators
- **Processing Delays**: Typing indicators with timeout
- **Unrecognized Queries**: Helpful suggestions for rephrasing
- **System Errors**: Friendly error messages with retry options

## 🌟 **Accessibility Features**

### **Screen Reader Support**
- **Message Announcements**: New messages read automatically
- **Navigation Labels**: Clear labels for all interactive elements
- **Focus Management**: Logical tab order through interface
- **Conversation Summary**: Overview of chat content available

### **Visual Accessibility**
- **High Contrast**: Enhanced visibility for message bubbles
- **Text Scaling**: Messages adapt to system font sizes
- **Color Independence**: Message ownership indicated by position and shape
- **Focus Indicators**: Clear visual focus for keyboard navigation

### **Motor Accessibility**
- **Large Touch Targets**: All interactive elements 44px minimum
- **Voice Input**: Alternative to typing for users with mobility issues
- **Gesture Alternatives**: Traditional tap/touch alternatives to swipes
- **Timeout Considerations**: No automatic timeouts during typing

## 🎨 **Design Tokens**

### **Chat-Specific Variables**
```
--chat-bubble-size: 56px
--chat-container-radius: 24px
--chat-message-radius: 20px
--chat-input-height: 44px
--chat-suggestion-radius: 20px
--chat-animation-duration: 0.3s
--chat-shadow-bubble: 0 4px 16px rgba(240,168,208,0.3)
```

### **Message Styling**
- **User Background**: `linear-gradient(135deg, #F0A8D0 0%, #F7B5CA 100%)`
- **Bot Background**: `rgba(255,235,212,0.9)`
- **Input Background**: `rgba(255,255,255,0.95)`
- **Suggestion Background**: `rgba(240,168,208,0.2)`

## 🎪 **Animation & Micro-interactions**

### **Message Animations**
- **Send Animation**: Message slides in from input area
- **Receive Animation**: Bot messages appear with gentle slide-up
- **Typing Indicator**: Three dots with sequential bounce
- **Suggestion Selection**: Smooth transition from chip to input

### **Interface Transitions**
- **Expand/Collapse**: Spring-based scaling animation
- **Scroll Behavior**: Smooth momentum scrolling
- **Input Focus**: Gentle highlight with border color change
- **Button States**: Subtle scale and color transitions

### **Feedback Animations**
- **Send Success**: Brief checkmark in send button
- **Connection Issues**: Gentle shake with error color
- **Voice Recording**: Pulsing microphone icon
- **Message Delivery**: Read receipts with fade animation

## 💡 **UX Principles Applied**

### **Conversational Design**
- **Natural Language**: Supports casual, human-like interaction
- **Context Awareness**: Remembers conversation flow and attraction context
- **Progressive Disclosure**: Reveals information based on user interest
- **Error Prevention**: Helps users ask better questions

### **Accessibility & Inclusion**
- **Multiple Input Methods**: Text, voice, and suggestion chips
- **Clear Communication**: Visual and textual feedback for all states
- **Flexible Interaction**: Adapts to user preferences and abilities
- **Respectful Design**: Never assumes user knowledge level

### **Engagement Strategy**
- **Curiosity-Driven**: Encourages exploration through follow-up questions
- **Personalized Learning**: Adapts to individual interests and pace
- **Social Learning**: Conversational format feels natural and engaging
- **Achievement**: Satisfying interactions that build knowledge 