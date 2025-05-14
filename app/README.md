# Doctorino

A medical practice management system with ECG and mammography analysis capabilities.

## Project Structure

```
app/
├── backend/         # Python FastAPI backend
│   ├── core/        # Core modules (config, database, security)
│   ├── ecg/         # ECG analysis module
│   ├── mammography/ # Mammography analysis module
│   ├── models/      # AI models
│   ├── routers/     # API endpoints
│   ├── schemas/     # Pydantic schemas
│   ├── static/      # Static files
│   ├── uploads/     # Uploaded files
│   └── utils/       # Utility functions
├── frontend/        # React/TypeScript frontend
│   ├── assets/      # Static assets
│   ├── electron/    # Electron-specific code
│   └── src/         # React source code
├── shared/          # Shared code between frontend and backend
├── scripts/         # Utility scripts
└── main.py          # Main entry point
```

## Installation

### Prerequisites

- Python 3.8+
- Node.js 16+
- MongoDB

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/doctorino.git
   cd doctorino
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   This will install both frontend and backend dependencies.

3. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file to customize your configuration.

## Development

### Running the application

```bash
npm run dev
```

This will start both the backend server and the Electron application in development mode.

### Running in browser (without Electron)

```bash
npm run browser
```

### Building for production

```bash
npm run build
```

This will create a distributable package in the `dist` directory.

## Features

- **Patient Management**: Add, edit, and manage patient records
- **Appointment Scheduling**: Schedule and manage appointments
- **Medical Reports**: Create and manage medical reports
- **ECG Analysis**: AI-powered ECG signal analysis
- **Mammography Analysis**: AI-powered mammogram analysis
- **Analytics**: View practice analytics and statistics

## License

This project is licensed under the ISC License - see the LICENSE file for details.
