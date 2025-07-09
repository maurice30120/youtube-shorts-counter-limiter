# YouTube Shorts Counter Project Guide

## Project Overview

### Purpose
The **YouTube Shorts Counter** is a browser extension designed to help users regain control over their time spent on YouTube. It counts the number of Shorts videos watched and gently redirects users after reaching a set limit.

### Key Technologies
- **Languages**: JavaScript
- **Frameworks/Libraries**: None
- **Tools**: WebExtensions API

### Architecture
The extension follows a simple structure with key components including:
- `manifest.json`: Defines the extension's metadata and permissions.
- `background.js`: Manages the counting logic and redirection.
- `popup.html` and `popup.js`: Provide the user interface for interaction.

## Getting Started

### Prerequisites
- A web browser that supports extensions (e.g., Firefox, Chrome).

### Installation
1. Clone or download the repository.
2. Open the browser's extension management page:
   - Firefox: `about:debugging`
   - Chrome/Edge: `chrome://extensions`
3. Enable developer mode.
4. Load the extension:
   - Firefox: "Load Temporary Add-on"
   - Chrome/Edge: "Load unpacked"
5. Select the `manifest.json` file from the project root.

### Basic Usage
- The extension icon displays the current count of Shorts watched.
- After reaching 10 Shorts, users are redirected to the YouTube homepage.

### Running Tests
- Currently, there are no automated tests. Manual testing involves watching Shorts and verifying the count and redirection.

## Project Structure

### Main Directories
- **Root Directory**: Contains configuration and main script files.

### Key Files
- `manifest.json`: Extension metadata and permissions.
- `background.js`: Core logic for counting and redirection.
- `popup.html`: User interface layout.
- `popup.js`: Interactivity for the popup interface.

### Important Configuration Files
- `manifest.json`: Defines the extension's settings and permissions.

## Development Workflow

### Coding Standards
- Follow standard JavaScript coding practices.
- Use meaningful variable and function names.

### Testing Approach
- Manual testing is the primary method.

### Build and Deployment
- No build process required. Simply load the extension in the browser.

### Contribution Guidelines
- Fork the repository and create a new branch for your feature or bug fix.
- Submit a pull request with a clear description of your changes.

## Key Concepts

### Domain-Specific Terminology
- **Shorts**: The short-form videos on YouTube.

### Core Abstractions
- The extension uses the WebExtensions API to interact with the browser.

### Design Patterns Used
- Simple event-driven architecture using browser events.

## Common Tasks

### Adding a New Feature
1. Identify the feature in the roadmap.
2. Create a new branch for the feature.
3. Implement the feature in `background.js` and update `popup.js` if necessary.
4. Test the feature manually.
5. Submit a pull request.

## Troubleshooting

### Common Issues
- **Extension Not Loading**: Ensure all files are in the correct directory and `manifest.json` is properly configured.
- **Count Not Updating**: Verify that the background script is correctly listening for video events.

### Debugging Tips
- Use browser developer tools to debug the background script.

## References

### Documentation
- [MDN Web Docs - WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)

### Resources
- [YouTube Shorts](https://www.youtube.com/shorts)

This guide provides a comprehensive overview to help developers understand and contribute to the YouTube Shorts Counter project. For more detailed information, refer to the project's README and ROADMAP files.

## Future Enhancements

### Advanced Time Management
- **Time Limits**: Set limits for the number of Shorts watched per hour or day. The value is configurable, and in case of exceeding the limit, the user will be redirected directly. There will be a button to reset the limit.
- **Scheduled Breaks**: Automatically pause Shorts watching during specified times.

### Custom Blocking Modes
- **Strict Mode**: Immediate redirection without the option to return.
- **Gentle Mode**: Warning with the option to continue.
- **Whitelist**: Allow specific creators to bypass the limit.

### Statistics and Tracking
- **Dashboard**: View graphs of daily/weekly consumption.
- **History**: Track consumption over the past 30 days.

### User Interface Improvements
- **Themes**: Dark/light mode options.
- **Customizable Colors**: Change the badge color.
- **Gamification**: Points system, badges, and streaks for adhering to limits.

### Technical Improvements
- **Cross-Platform Support**: Ensure compatibility with Chrome, Edge, and Safari.
- **Synchronization**: Sync settings across devices.

### AI and Learning
- **Smart Suggestions**: AI-driven limit suggestions based on history.
- **Content Recommendations**: Suggest longer videos or educational playlists after reaching the limit.

### Security and Privacy
- **Anti-Bypass**: Detect and prevent attempts to disable the extension.
- **Parental Controls**: Admin interface for parents with email reports.

This roadmap outlines potential future enhancements for the YouTube Shorts Counter project. Contributions in any of these areas are welcome!