# Family Mapper AI for Home Assistant

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/yourusername/family-mapper-ai)
[![Home Assistant](https://img.shields.io/badge/home%20assistant-%2041BDF5.svg?&logo=home-assistant&logoColor=white)](https://www.home-assistant.io/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A comprehensive family tracking solution for Home Assistant that provides real-time location tracking, automatic trip detection, zone monitoring, and intelligent notifications - all while keeping your data private and local.

![Family Mapper AI Screenshot](screenshot.png)

## ✨ Features

### 🗺️ Real-Time Family Tracking
- Live location updates every 5 seconds
- Beautiful interactive map with family member avatars
- Battery level monitoring with low battery warnings
- Speed tracking and display
- Visual indicators for driving status

### 🚗 Automatic Trip Detection
- Automatically detects when family members start driving (customizable speed threshold)
- Records complete trip routes with waypoints
- Tracks stops and their duration
- Calculates distance traveled and trip duration
- Shows maximum and average speed
- Visual trip paths on map
- Trip history with detailed analytics

### 📍 Smart Zone Management
- Create unlimited custom zones
- Automatic zone entry/exit detection
- Track time spent in each zone
- See which family members are in each zone
- Zone visit history and patterns
- Color-coded zones for easy identification

### 🔔 Intelligent Notifications
- Customizable notification rules per user and zone
- Zone arrival/departure alerts
- Trip start/end notifications
- Low battery warnings (< 20%)
- Speeding alerts (customizable threshold)
- Send notifications to specific family members
- Integration with Home Assistant notify service

### 📊 Comprehensive Analytics
- Daily trip statistics
- Total distance traveled
- Active trips counter
- Average speed calculations
- Timeline of all events
- Filterable history (by date, type, user)
- Trip summaries with key metrics

### 🤖 AI Integration (Optional)
- Gemini API support for intelligent insights
- Natural language trip summaries
- Driving pattern analysis
- Family coordination suggestions
- Anomaly detection

### 🔒 Privacy First
- All data stored locally
- No external servers (except optional AI)
- Runs entirely within your Home Assistant
- No tracking or analytics
- You own your data

## 📋 Requirements

- Home Assistant 2023.1 or newer
- Person entities with GPS device trackers
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Long-lived access token for API access

## 🚀 Installation

### Quick Install (Single File)

1. **Download the application file:**
   - Download `Family-Mapper-AI-Complete.html` from the latest release

2. **Copy to Home Assistant:**
   ```bash
   # For HACS installations
   cp Family-Mapper-AI-Complete.html /config/www/community/HACS-AI-Family-Tracker/
   
   # For manual installations
   cp Family-Mapper-AI-Complete.html /config/www/
   ```

3. **Add to your dashboard:**

   **Option A - Full Dashboard:**
   ```yaml
   views:
     - title: Family Tracker
       path: family-tracker
       type: panel
       cards:
         - type: iframe
           url: /hacsfiles/HACS-AI-Family-Tracker/index.html
           aspect_ratio: 100%
   ```

   **Option B - Dashboard Card:**
   ```yaml
   type: iframe
   url: /local/index.html
   aspect_ratio: 75%
   ```

4. **Restart Home Assistant** (if using panel configuration)

## ⚙️ Configuration

### Initial Setup

1. **Open Family Mapper AI** from your dashboard
2. **Click the Settings button** (⚙️ in bottom right)
3. **Configure Home Assistant connection:**
   - URL: Usually auto-detected when in iframe
   - Access Token: Enter your long-lived token (see below)
4. **Click "Save & Connect"**
5. **Test the connection** with the Test button

### Creating a Long-Lived Access Token

1. Go to your Home Assistant profile (click your username in bottom left)
2. Scroll to "Long-Lived Access Tokens"
3. Click "Create Token"
4. Name it "Family Mapper AI"
5. **Copy the token immediately** (you won't see it again!)
6. Paste into Family Mapper AI settings

### Feature Configuration

#### Trip Detection Settings
- **Start Speed**: Speed threshold to start recording (default: 5 mph)
- **Stop Duration**: Time stopped before ending trip (default: 120 seconds)
- **Enable/Disable**: Toggle trip detection on/off

#### Notification Settings
- **Enable Notifications**: Master toggle for all notifications
- **Add Rules**: Click 🔔 then "Add Notification Rule"
- **Rule Options**:
  - Select specific users or "all"
  - Select specific zones or "all"
  - Choose enter, exit, or both events
  - Custom notification text

#### AI Configuration (Optional)
1. Enable AI in settings
2. Get a [Gemini API key](https://makersuite.google.com/app/apikey)
3. Enter the API key in settings
4. AI summaries will automatically generate for completed trips

## 📱 Usage Guide

### Interface Overview

**Bottom Right Control Buttons:**
- 👥 **Family Members** - View all tracked users, battery levels, and driving status
- 📍 **Zones** - Manage zones, see who's in each zone
- 🚗 **Driving** - View active trips, today's statistics, trip history
- 📅 **Timeline** - Chronological history of all events
- 🔔 **Notifications** - Configure alert rules
- ⚙️ **Settings** - App configuration and connection

**Header Indicators:**
- 🟢 **Connection Status** - Green when connected to Home Assistant
- 🚗 **Active Trips** - Shows count with pulse animation when someone is driving
- 🤖 **AI Status** - Displayed when AI is configured and active

### Map Features

- **User Markers**: 
  - Letter avatar in colored circle
  - Green border when driving
  - Red dot for low battery (< 20%)
  - Click to center and view details

- **Zones**: 
  - Colored circles showing boundaries
  - Transparency indicates zone area
  - Popup shows zone details

- **Trip Paths**: 
  - Blue dashed line for active trips
  - Shows real-time route being traveled

### Creating Zones

1. Click the 📍 **Zones** button
2. Click **"Add Zone"**
3. Enter zone details:
   - Name (e.g., "Home", "School", "Work")
   - Latitude and Longitude
   - Radius in meters
4. Zone appears immediately on map

### Setting Up Notifications

1. Click the 🔔 **Notifications** button
2. Click **"Add Notification Rule"**
3. Configure the rule:
   - Give it a name
   - Select who to monitor (specific person or all)
   - Select which zones (specific zone or all)
   - Choose events (arrive, leave, or both)
4. Enable/disable with toggle switch

### Viewing Trip History

1. Click the 🚗 **Driving** button
2. View today's statistics at top
3. Scroll to see recent trips
4. Each trip shows:
   - Distance traveled
   - Duration
   - Maximum speed
   - Number of waypoints
   - AI summary (if enabled)

### Timeline Filters

1. Click the 📅 **Timeline** button
2. Use filter buttons:
   - **All** - Show everything
   - **Today** - Today's events only
   - **Zones** - Zone entries/exits only
   - **Trips** - Completed trips only

## 🔧 Troubleshooting

### No Family Members Showing
- Ensure person entities have GPS coordinates
- Check that device_tracker is assigned to person
- Verify entities have `latitude` and `longitude` attributes
- Check Settings → Test Connection

### Trips Not Recording
- Verify trip detection is enabled in Settings
- Check speed threshold (default 5 mph)
- Ensure GPS is updating on mobile device
- Check that users have speed attribute

### Notifications Not Working
- Ensure notifications are enabled in Settings
- Verify Home Assistant notify service is configured
- Check notification rules are enabled
- Test with manual notification from HA

### Connection Issues
- Verify Long-Lived Access Token is valid
- Check Home Assistant URL is correct
- Ensure you're accessing via HTTPS if remote
- Try regenerating the access token

### Zones Not Detecting
- Verify zone radius is large enough
- Check GPS accuracy on devices
- Ensure zones are saved properly
- Refresh the page to reload zones

## 📊 Data Storage

All data is stored locally in browser localStorage:
- **Settings & Configuration**: `familyMapperConfig`
- **Trip History**: `familyMapperTrips`
- **Zone Events**: `familyMapperEvents`
- **Notification Rules**: `familyMapperNotifications`

To backup your data:
1. Open browser Developer Tools (F12)
2. Go to Application → Local Storage
3. Export the family mapper keys

## 🎨 Customization

### Adjusting Refresh Rate
- Settings → Refresh Interval
- Lower = more real-time (more resource usage)
- Higher = less frequent updates (less resource usage)
- Default: 5 seconds

### Map Style
The map uses OpenStreetMap by default. To change map tiles, edit the HTML file and modify the tile layer URL in the `initMap()` function.

### Colors and Theme
The app uses CSS variables that match Home Assistant's dark theme. These can be customized by editing the CSS variables in the `<style>` section.

## 🔐 Security Considerations

- **Access Token**: Keep your long-lived access token secret
- **HTTPS**: Use HTTPS when accessing remotely
- **Permissions**: Only users with dashboard access can view
- **Data**: All tracking data stays local to your browser
- **Network**: No external connections except optional AI

## 📝 Privacy Notice

Family Mapper AI is designed with privacy first:
- ✅ No external tracking or analytics
- ✅ No data sent to third parties (except optional Gemini AI)
- ✅ All processing happens locally
- ✅ You maintain complete control of your data
- ✅ Open source and auditable

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the Home Assistant community
- Inspired by the need for privacy-respecting family tracking
- Uses Leaflet.js for mapping
- Optional Gemini AI for intelligent insights

## 💬 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check the [Troubleshooting](#-troubleshooting) section
- Review Home Assistant logs for errors

## 🚀 Roadmap

Future enhancements planned:
- [ ] Route optimization suggestions
- [ ] Predictive ETAs based on patterns
- [ ] Weather-aware driving alerts
- [ ] Multi-language support
- [ ] Custom map styles
- [ ] Export trip data to CSV
- [ ] Integration with calendar for location-based reminders
- [ ] Geofencing webhooks

---

**Note**: Family Mapper AI is not affiliated with Life360® or any other commercial tracking service. It's an independent, open-source project designed for Home Assistant users who value privacy and local control.

---

Made with ❤️ for the Home Assistant Community
