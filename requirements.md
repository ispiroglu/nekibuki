App name : Nekibuki
A progressive web app to take photos of attractions, landscapes, monuments etc... A guide (~ish) app for travelers

# Design System
Anthropic's minimal / elegant design language with shadcn components
Make sure to create animations to increase the smoothness of all page/component transitions. Make it look cool :cool:

Apple Design is a must
https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md


# Requirements
1. A user opens the app, sees the camera itselft on the screen directly. Can take photo, can select photo from gallery. Additional camera features (such as predefined zoom settings etc...)

2. The app contains 3 screens, the middle one is the primary screen, the capture -> analyze(loading era...) -> the report page (the main output of the capture and report flow).  

The left screen; contains profile/settings etc... pages.
The right screen contains history page which includes past analyzes their respective chats.

The screens can be accessed via swiping between them.

3. Login
Only login with google is permitted.
Login is mandatory.

4. A warm, welcoming onboarding page when first login. 3 slights of onboarding slides.

# Core freature of the App
User takes a picture
An LLM with vision capability sees the image (also takes the GPS location into account)
Identifies what it is
Creates a brief introduction and details
4 Cards of trivias (likie built when, built by who, painted by who, why it is painted etc... 'actually its the first ever painting to painted with horse tail brushes')

Then a more detailed (but not bloat of information) explanations
The explanations should include references the the things that are visible on the actual taken picture.
