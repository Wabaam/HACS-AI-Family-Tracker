
<img width="1257" height="1044" alt="AI-Family-Mapper-Readme" src="https://github.com/user-attachments/assets/a054dfdd-b377-4a56-9f71-4ee50ee4e79a" />

Make sure you have HACS installed on your Home Assistant
three dots upper right
Add a custom repository
Search for https:/


Add the Panel to your Dashboard
Navigate to your main dashboard in Home Assistant.
Click the pencil in the top-right corner and select "Edit Dashboard".
At the top of the screen (where your tabs are), click the big "+" button to add a new view.
A "Create View" dialog will pop up. Fill it out:
Title: Give it a name, like Family Map.
Icon: Choose an icon, like mdi:map-marker-radius.
URL Path: You can leave this blank or give it a simple name like family-map.
Make sure "Panel (1 card)" is selected. This is very important. It makes your card fill the entire screen.
Click "Save". You'll now have a new, empty view.

<img width="1257" height="1044" alt="AI-Family-Mapper-Readme" src="https://github.com/user-attachments/assets/5876dca2-2289-4519-aa38-9ad445c0aa5c" />

On this empty view, click the "ADD CARD" button in the center.
The card picker will appear. Search for the "Webpage" card and select it.
Now, configure the Webpage card. This is the most critical step:
URL: Enter the path to the index.html file HACS downloaded. The format is always /hacsfiles/HACS-AI-Family-Tracker/dist/index.html
