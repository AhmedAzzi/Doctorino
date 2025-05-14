# Doctorino

A medical practice management system with ECG and mammography analysis capabilities.

## Project Structure

The project has been reorganized into a more structured Electron-Python application. All code is now in the `app/` directory.

```bash
app/
├── backend/         # Python FastAPI backend
├── frontend/        # React/TypeScript frontend with Electron
├── shared/          # Shared code between frontend and backend
├── scripts/         # Utility scripts
├── main.py          # Python entry point
├── main.js          # Electron entry point
├── package.json     # Project configuration
└── README.md        # Project documentation
```

## Getting Started

Please see the [app/README.md](app/README.md) file for detailed installation and usage instructions.

## Key Features

- **Patient Management**: Add, edit, and manage patient records
- **Appointment Scheduling**: Schedule and manage appointments
- **Medical Reports**: Create and manage medical reports
- **ECG Analysis**: AI-powered ECG signal analysis
- **Mammography Analysis**: AI-powered mammogram analysis
- **Analytics**: View practice analytics and statistics

## License

This project is licensed under the ISC License - see the LICENSE file for details.
