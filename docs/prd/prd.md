# PRD: Nekibuki

## 1. Product overview
### 1.1 Document title and version
- PRD: Nekibuki
- Version: 1.0

### 1.2 Product summary
Nekibuki is a mobile application that enhances tourist experiences by providing instant, detailed explanations of attractions through photo recognition. Users simply take a photo of any tourist attraction, historical monument, landmark, or point of interest, and the app identifies the subject and delivers comprehensive information about its history, significance, and interesting facts.

The app targets travelers, tourists, and curious explorers who want to learn more about their surroundings without the need for traditional tour guides or extensive research. By leveraging advanced image recognition technology and a curated database of attraction information, nekibuki transforms any smartphone into a personal tour guide.

The initial MVP focuses on photo capture, attraction recognition, and text-based explanations with Google authentication, while future versions will include audio narration, offline capabilities, and enhanced social features.

## 2. Goals
### 2.1 Business goals
- Create an engaging and educational tourist experience that increases user knowledge about attractions
- Build a substantial user base for potential future monetization through premium features or partnerships
- Establish nekibuki as a leading platform for self-guided tourism and attraction discovery
- Generate valuable data insights about popular tourist attractions and user behavior patterns
- Create opportunities for partnerships with tourism boards, museums, and cultural institutions

### 2.2 User goals
- Instantly learn about attractions and landmarks without needing prior research or tour guides
- Enhance travel experiences with rich, contextual information about visited locations
- Discover interesting facts and historical details that might otherwise be missed
- Save time by getting immediate answers about attractions through simple photo capture
- Access reliable and comprehensive information about tourist destinations

### 2.3 Non-goals
- Replace professional tour guides for complex or specialized tours
- Provide real-time navigation or route planning functionality
- Function as a general travel booking or accommodation platform
- Support live video streaming or real-time social interactions
- Serve as a primary photography or photo editing application

## 3. User personas
### 3.1 Key user types
- International tourists exploring new destinations
- Domestic travelers discovering attractions within their own country
- Local residents exploring their own cities and regions
- History and culture enthusiasts seeking detailed information
- Educational users including students and teachers on field trips

### 3.2 Basic persona details
- **International tourists**: Travelers visiting foreign countries who want to understand local attractions, history, and cultural significance without language barriers
- **Domestic explorers**: Local residents or domestic travelers who want to learn more about attractions in their own country or region
- **History enthusiasts**: Users with a strong interest in historical facts, architectural details, and cultural significance of landmarks
- **Educational users**: Students, teachers, and academic groups using the app for educational purposes during field trips or study sessions
- **Casual tourists**: Leisure travelers who want quick, interesting information about attractions they encounter during their trips

### 3.3 Role-based access
- **Authenticated users**: Can capture photos, receive attraction explanations, and access the full app functionality through Google authentication
- **Guests**: Limited to viewing app information and authentication prompts, cannot access core photo recognition features

## 4. Functional requirements
- **Photo capture and upload** (Priority: High)
  - Allow users to take photos directly within the app using device camera
  - Support uploading existing photos from device gallery
  - Optimize photo quality for recognition accuracy

- **Attraction recognition** (Priority: High)
  - Process uploaded photos to identify tourist attractions, monuments, and landmarks
  - Support recognition of various attraction types including buildings, sculptures, natural landmarks, and historical sites
  - Provide confidence scores for recognition accuracy

- **Information delivery** (Priority: High)
  - Generate detailed explanations about identified attractions
  - Include historical facts, architectural details, cultural significance, and interesting trivia
  - Present information in easily readable, structured format

- **User authentication** (Priority: High)
  - Implement Google OAuth for secure user login
  - Maintain user sessions across app usage
  - Handle authentication errors and session management

- **Error handling** (Priority: Medium)
  - Handle cases where attractions cannot be recognized
  - Provide feedback for poor quality photos
  - Manage network connectivity issues and offline scenarios

- **User interface** (Priority: Medium)
  - Provide intuitive photo capture interface
  - Display attraction information in engaging, readable format
  - Include onboarding flow for first-time users

## 5. User experience
### 5.1. Entry points & first-time user flow
- Users download the app from app stores or access via web browser
- First-time users see onboarding screens explaining the app's purpose and functionality
- Users are prompted to authenticate with Google before accessing core features
- After authentication, users receive a brief tutorial on how to capture photos for recognition

### 5.2. Core experience
- **Authentication**: Users sign in with Google credentials to access the app's main functionality
  - The login process is quick and secure, requiring minimal user input beyond Google authorization
- **Photo capture**: Users point their camera at an attraction and take a photo using the in-app camera
  - The camera interface provides clear guidance on optimal photo composition and lighting
- **Processing**: The app processes the photo and attempts to identify the attraction
  - Users see a loading indicator with encouraging messages during processing
- **Information display**: The app presents detailed information about the identified attraction
  - Information is organized in easily digestible sections with clear headings and engaging content

### 5.3. Advanced features & edge cases
- Handle photos with multiple attractions or unclear subjects
- Provide alternative suggestions when primary recognition fails
- Support photos taken in various lighting conditions and angles
- Manage cases where attractions are partially obscured or photographed from unusual perspectives
- Handle network interruptions during photo processing

### 5.4. UI/UX highlights
- Clean, intuitive camera interface optimized for quick photo capture
- Engaging loading animations during photo processing to maintain user interest
- Well-organized information presentation with clear typography and visual hierarchy
- Responsive design that works across different device sizes and orientations
- Consistent branding and visual design throughout the app

## 6. Narrative
Sarah is an international tourist visiting Tokyo who wants to understand the historical and cultural significance of the landmarks she encounters but doesn't speak Japanese and doesn't want to carry guidebooks. She finds nekibuki and is amazed by how it instantly transforms her smartphone into a knowledgeable tour guide. By simply taking photos of temples, monuments, and cultural sites, she receives rich, detailed explanations that enhance her understanding and appreciation of Japanese culture, making her trip more meaningful and educational than she ever imagined possible.

## 7. Success metrics
### 7.1. User-centric metrics
- Number of photos processed per user session
- User retention rate after first week and first month
- Time spent reading attraction explanations
- User satisfaction scores and app store ratings
- Frequency of app usage during travel periods

### 7.2. Business metrics
- Monthly active users and user growth rate
- User acquisition cost and conversion rates
- App store download and rating metrics
- User engagement duration and session frequency
- Potential revenue from future premium features

### 7.3. Technical metrics
- Photo recognition accuracy rates
- Average response time for photo processing
- App performance metrics including load times and crash rates
- Server uptime and API response reliability
- Data usage and storage efficiency

## 8. Technical considerations
### 8.1. Integration points
- Google OAuth API for user authentication
- Image recognition services (Google Vision API, AWS Rekognition, or custom ML models)
- Content delivery network for serving attraction information
- Mobile device camera and photo library access
- Cloud storage for user data and attraction database

### 8.2. Data storage & privacy
- Secure storage of user authentication tokens and profile information
- Compliance with GDPR and other privacy regulations for user data
- Optional storage of user photo history with appropriate privacy controls
- Secure transmission of photos and data between client and server
- Clear privacy policy regarding photo processing and data retention

### 8.3. Scalability & performance
- Efficient image processing pipelines to handle multiple concurrent requests
- Content delivery network implementation for fast global access
- Database optimization for quick attraction information retrieval
- Mobile app performance optimization for smooth photo capture and display
- Load balancing and auto-scaling for varying usage patterns

### 8.4. Potential challenges
- Achieving high accuracy in attraction recognition across diverse photo conditions
- Building comprehensive attraction database with reliable, up-to-date information
- Managing processing costs for image recognition at scale
- Handling edge cases where attractions are not in the database
- Ensuring consistent performance across different mobile devices and operating systems

## 9. Milestones & sequencing
### 9.1. Project estimate
- Medium: 3-4 months for complete MVP development and testing

### 9.2. Team size & composition
- Medium team: 4-5 total people
  - 1 product manager, 2-3 engineers (1 mobile, 1 backend, 1 ML/AI), 1 UI/UX designer

### 9.3. Suggested phases
- **Phase 1**: Core MVP development including Google authentication, photo capture, basic recognition, and text explanations (6-8 weeks)
  - Key deliverables: Functional mobile app with authentication, camera integration, basic image recognition, and information display
- **Phase 2**: Enhanced accuracy and user experience improvements including better recognition algorithms and polished UI (3-4 weeks)
  - Key deliverables: Improved recognition accuracy, refined user interface, comprehensive error handling, and performance optimization
- **Phase 3**: Advanced features including audio narration, user history, and offline capabilities (4-6 weeks)
  - Key deliverables: Audio playback functionality, user photo history, offline mode, and additional user engagement features

## 10. User stories
### 10.1. Sign in with Google account
- **ID**: US-001
- **Description**: As a user, I want to sign in with my Google account so that I can access the app's features securely
- **Acceptance criteria**:
  - The app presents a Google sign-in button on the login screen
  - Users are redirected to Google's authentication page
  - After successful authentication, users are redirected back to the app
  - The app stores authentication tokens securely for future sessions
  - Users see a personalized welcome message after signing in

### 10.2. Take a photo of an attraction
- **ID**: US-002
- **Description**: As a user, I want to take a photo of an attraction using the app's camera so that I can get information about it
- **Acceptance criteria**:
  - The app opens the device camera when user taps the camera button
  - Users can see a live camera preview with capture controls
  - The app captures high-quality photos suitable for recognition
  - Users receive visual feedback when a photo is successfully taken
  - The captured photo is immediately processed for recognition

### 10.3. Upload existing photo from gallery
- **ID**: US-003
- **Description**: As a user, I want to upload an existing photo from my device gallery so that I can get information about attractions in photos I've already taken
- **Acceptance criteria**:
  - The app provides an option to select photos from the device gallery
  - Users can browse and select photos from their photo library
  - The selected photo is uploaded and processed for recognition
  - The app handles various photo formats and sizes
  - Users receive confirmation when the photo is successfully uploaded

### 10.4. Receive attraction information
- **ID**: US-004
- **Description**: As a user, I want to receive detailed information about the attraction I photographed so that I can learn about its history and significance
- **Acceptance criteria**:
  - The app processes the photo and identifies the attraction
  - Users receive comprehensive information including history, significance, and interesting facts
  - Information is presented in a clear, readable format with proper headings
  - The app displays the confidence level of the recognition
  - Users can easily read and navigate through the provided information

### 10.5. Handle unrecognized attractions
- **ID**: US-005
- **Description**: As a user, I want to receive helpful feedback when my photo cannot be recognized so that I understand what happened and can try again
- **Acceptance criteria**:
  - The app clearly communicates when an attraction cannot be identified
  - Users receive suggestions for improving photo quality or angle
  - The app offers the option to retake or upload a different photo
  - Error messages are friendly and constructive rather than technical
  - Users are encouraged to try again with improved photo techniques

### 10.6. View loading status during processing
- **ID**: US-006
- **Description**: As a user, I want to see the processing status when my photo is being analyzed so that I know the app is working and how long to wait
- **Acceptance criteria**:
  - The app displays a loading indicator immediately after photo capture
  - Users see engaging messages or animations during processing
  - The loading screen provides estimated processing time when possible
  - Users cannot accidentally interrupt the processing by tapping other areas
  - The loading indicator disappears when processing is complete or fails

### 10.7. Handle poor quality photos
- **ID**: US-007
- **Description**: As a user, I want to receive guidance when my photo quality is insufficient for recognition so that I can take better photos
- **Acceptance criteria**:
  - The app detects photos that are too blurry, dark, or unclear for processing
  - Users receive specific feedback about photo quality issues
  - The app provides tips for taking better photos (lighting, distance, angle)
  - Users can immediately retake the photo with the provided guidance
  - The app explains how photo quality affects recognition accuracy

### 10.8. Access app without internet connection
- **ID**: US-008
- **Description**: As a user, I want to understand what functionality is available when I don't have internet connection so that I can plan my usage accordingly
- **Acceptance criteria**:
  - The app clearly communicates when network connection is unavailable
  - Users can still access previously loaded information when offline
  - The app explains which features require internet connectivity
  - Users can queue photos for processing when connection is restored
  - Error messages provide clear guidance for offline usage limitations

### 10.9. Sign out of the application
- **ID**: US-009
- **Description**: As a user, I want to sign out of my account so that I can protect my privacy and switch accounts if needed
- **Acceptance criteria**:
  - The app provides a clearly visible sign-out option in settings or menu
  - Users are prompted to confirm sign-out action
  - All user session data is cleared when signing out
  - Users are redirected to the login screen after signing out
  - The app removes stored authentication tokens securely

### 10.10. Complete first-time user onboarding
- **ID**: US-010
- **Description**: As a first-time user, I want to understand how to use the app effectively so that I can get the most value from the attraction recognition features
- **Acceptance criteria**:
  - New users see a brief tutorial explaining the app's main features
  - The onboarding includes visual examples of good photo techniques
  - Users can skip the tutorial if they prefer to explore independently
  - The tutorial explains the authentication requirement and benefits
  - Users feel confident about using the app after completing onboarding
