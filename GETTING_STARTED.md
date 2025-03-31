# SpeakScore - Getting Started Guide

This guide will help you quickly set up and run SpeakScore on your local machine.

## Quick Start

### Prerequisites

- Node.js v18 or later
- npm v9 or later

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/speakscore.git
cd speakscore

# Install dependencies
npm install
```

### Step 2: Set Up API Keys

SpeakScore requires API keys for its AI features. Create a `.env` file in the project root with:

```
MISTRAL_API_KEY=your_mistral_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
```

Get your API keys from:
- [Mistral AI](https://mistral.ai/)
- [AssemblyAI](https://www.assemblyai.com/)

### Step 3: Start the Application

```bash
npm run dev
```

The application will be available at http://localhost:5000

## Troubleshooting

### Microphone Issues

If you're having problems with the microphone:

1. Ensure your browser has permission to access your microphone
2. Try using Chrome if other browsers aren't working properly
3. Check that no other application is using your microphone
4. Use the built-in microphone testing tool in the application

### API Connection Issues

If you see errors about API connections:

1. Verify your API keys are correct in the `.env` file
2. Check your internet connection
3. Ensure the API services are currently available

### Running on a Different Port

If port 5000 is already in use:

1. Modify the port in `server/index.ts` to an available port
2. Update the `VITE_API_URL` in `.env` to match the new port

## Need Help?

If you encounter any issues not covered here, please:

1. Check the main README.md for more detailed information
2. Open an issue on the GitHub repository
3. Contact the project maintainers