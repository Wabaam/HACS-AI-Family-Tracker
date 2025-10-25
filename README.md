
Install using Custom Repository from HACS, then set up as a Dashboard card in Home Assistant.  (Requires a Gemini API)

<img width="1257" height="1044" alt="AI-Family-Mapper-Readme" src="https://github.com/user-attachments/assets/f3ce9a14-dc52-4a61-b385-952cdab36dc0" />

Here is exactly what you need to do:
Add the Panel to your Dashboard
Navigate to your main dashboard in Home Assistant.
Click the three-dot menu in the top-right corner and select "Edit Dashboard".
At the top of the screen (where your tabs are), click the big "+" button to add a new view.
A "Create View" dialog will pop up. Fill it out:
Title: Give it a name, like Family Map.
Icon: Choose an icon, like mdi:map-marker-radius.
URL Path: You can leave this blank or give it a simple name like family-map.
Make sure "Panel (1 card)" is selected. This is very important. It makes your card fill the entire screen.
Click "Save". You'll now have a new, empty view.
On this empty view, click the "ADD CARD" button in the center.
The card picker will appear. Search for the "Webpage" card and select it.
Now, configure the Webpage card. This is the most critical step:
URL: You must enter the path to the index.html file that HACS downloaded. The format is always /hacsfiles/<repository-name>/<path-to-file>. Based on your project structure, the URL will be:
code
Code
/hacsfiles/family-mapper-ai/dist/index.html
(Note: If your GitHub repository is named something different, replace family-mapper-ai with your repository's name.)
Aspect Ratio: You can leave this blank, since we're in Panel Mode.
Click "Save". You should now see your application's setup screen appear inside the card preview.
Click the "Done" button in the top-right corner of the screen to exit the dashboard editor.
That's it! You should now have a fully functional "Family Map" tab in your Home Assistant that runs your application.
User
I have done everything in your instructions and I just have a solid dark blue screen. Nothing is happening. here is the YAML:
type: panel
title: Family Map
path: family-map
icon: mdi:map-marker-radius
cards:
type: iframe
url: /hacsfiles/HACS-AI-Family-Tracker/dist/index.html
aspect_ratio: 100%
title: AI Family Tracker

<img width="636" height="909" alt="AI-Family-Mapper-Readme_Setup Model" src="https://github.com/user-attachments/assets/8fbe4c14-9ecc-4cc6-92a3-961632bd3ee4" />
