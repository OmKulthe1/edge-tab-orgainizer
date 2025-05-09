# Edge Tab Organizer

A Microsoft Edge extension that helps you organize your browser tabs using AI.

## Features

- Organize tabs by topics using AI categorization
- Group tabs by domain names
- Prioritize tabs (High, Medium, Low)
- Automatically create browser tab groups based on organization
- Keyboard shortcut (Ctrl+Shift+O) for quick organization
- Clean and intuitive UI
- Works without requiring an API key (fallback methods)

## Installation

### From Source

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/edge-tab-organizer.git
   ```

2. Open Microsoft Edge and navigate to `edge://extensions/`

3. Enable "Developer mode" by toggling the switch in the bottom-left corner

4. Click "Load unpacked" and select the directory containing this extension

5. The extension should now appear in your toolbar as a button

## Usage

### Via Popup

1. Click the extension icon in your toolbar to open the popup
2. Select an organization method from the dropdown:
   - By Topic: Groups tabs based on their content
   - By Domain: Groups tabs based on their domain name
   - By Priority: Categorizes tabs by importance
3. Toggle "Auto-group tabs in browser" if you want tabs to be automatically grouped in Edge
4. Click "Organize Tabs" button
5. Your tabs will be organized into groups that you can expand/collapse
6. If auto-grouping is enabled, your browser tabs will be organized into color-coded groups
7. Click on any tab in a group to navigate to it

### Via Keyboard Shortcut

Simply press **Ctrl+Shift+O** (or **Command+Shift+O** on Mac) to instantly organize your tabs using the current settings.

The extension will:
1. Use your last selected organization method
2. Apply auto-grouping based on your toggle setting
3. Show a checkmark icon briefly when successful

## Tab Grouping

The extension can automatically create and manage tab groups in Microsoft Edge. When you organize your tabs with the "Auto-group tabs in browser" option enabled:

1. Any existing tab groups will be removed
2. New tab groups will be created based on the organization method
3. Each group gets a title and a consistent color
4. You can collapse/expand the browser tab groups to save space

To disable this feature, simply toggle off the "Auto-group tabs in browser" option.

## AI Integration

The extension uses the Hugging Face free inference API for AI-based tab categorization. You can get a free API key from [Hugging Face](https://huggingface.co/). Once you have an API key, add it to the `API_KEY` variable in `background.js`.

If no API key is provided, the extension will fall back to simpler organization methods based on keywords and domains.

## Privacy

This extension only accesses your open tabs when you explicitly click the "Organize Tabs" button or use the keyboard shortcut. Your tab data is only sent to the AI API if you've configured an API key. No data is stored or transmitted elsewhere.

## Development

### Project Structure

- `manifest.json`: Extension configuration
- `popup.html/css/js`: User interface files
- `background.js`: Background script for tab organization logic

### Building/Testing

The extension can be loaded directly as an unpacked extension in Edge for testing.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.