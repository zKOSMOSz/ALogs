# Cloudflare Logs Viewer

This project is a web application for viewing and managing log files. It allows users to upload log files, view their contents, and switch between light and dark themes.

## Project Structure

```
cloudflare-logs-viewer
├── public
│   ├── index.html        # Main HTML structure of the application
│   ├── styles
│   │   └── main.css      # CSS styles for the application
│   └── scripts
│       └── main.js       # JavaScript functionality for the application
└── README.md             # Documentation for the project
```

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd cloudflare-logs-viewer
   ```

2. **Deploy to Cloudflare Pages:**
   - Push the project to your GitHub repository.
   - Connect your GitHub repository to Cloudflare Pages.
   - Set the build command to `npm run build` (if applicable) and the output directory to `public`.

## Usage Guidelines

- Open `public/index.html` in your web browser to access the logs viewer.
- Use the upload button to select and upload log files.
- Switch between light and dark themes using the theme toggle button.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.