#!/usr/bin/env python3
"""
Doctorino - Medical Practice Management System
Main entry point for the application
"""
import os
import sys
import subprocess
import threading
import webbrowser
import argparse
import signal
import time
from pathlib import Path

# Add the app directory to the Python path
APP_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(APP_DIR)

# Try to import backend modules
try:
    from backend.core.config import settings
    BACKEND_IMPORT_SUCCESS = True
except ImportError as e:
    print(f"Error importing backend modules: {e}")
    print("Make sure you have installed all required dependencies.")
    print("Try running: pip install -r backend/requirements.txt")
    BACKEND_IMPORT_SUCCESS = False

# Default port for the API server
DEFAULT_PORT = 34664

def start_backend_server(port=DEFAULT_PORT, debug=False):
    """Start the FastAPI backend server"""
    backend_dir = os.path.join(APP_DIR, "backend")
    os.chdir(backend_dir)

    # Command to start the backend server
    cmd = [
        sys.executable, "-m", "uvicorn", "main:app",
        "--host", "0.0.0.0",
        "--port", str(port)
    ]

    if debug:
        cmd.append("--reload")

    # Start the server process
    server_process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE if not debug else None,
        stderr=subprocess.PIPE if not debug else None
    )

    # Wait a moment for the server to start
    time.sleep(2)

    return server_process

def start_electron_app(port=DEFAULT_PORT, debug=False):
    """Start the Electron frontend application"""
    frontend_dir = os.path.join(APP_DIR, "frontend")
    os.chdir(frontend_dir)

    # Set environment variables for the frontend
    env = os.environ.copy()
    env["API_PORT"] = str(port)

    # Command to start the Electron app
    if debug:
        cmd = ["npm", "run", "dev:full"]
    else:
        cmd = ["npm", "run", "start"]

    # Print the command being executed
    print(f"Executing: {' '.join(cmd)}")

    # Start the Electron process
    electron_process = subprocess.Popen(
        cmd,
        env=env,
        stdout=subprocess.PIPE if not debug else None,
        stderr=subprocess.PIPE if not debug else None
    )

    return electron_process

def open_in_browser(port=DEFAULT_PORT):
    """Open the application in a web browser"""
    url = f"http://localhost:{port}"
    webbrowser.open(url)

def main():
    """Main entry point for the application"""
    parser = argparse.ArgumentParser(description="Doctorino - Medical Practice Management System")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"Port for the API server (default: {DEFAULT_PORT})")
    parser.add_argument("--debug", action="store_true", help="Run in debug mode")
    parser.add_argument("--browser", action="store_true", help="Open in browser instead of Electron")
    parser.add_argument("--install-deps", action="store_true", help="Install missing dependencies")
    args = parser.parse_args()

    # Check if we need to install dependencies
    if args.install_deps or not BACKEND_IMPORT_SUCCESS:
        print("Installing missing dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", os.path.join(APP_DIR, "backend", "requirements.txt")])
        print("Dependencies installed. Please restart the application.")
        return

    # Start the backend server
    print(f"Starting backend server on port {args.port}...")
    backend_process = start_backend_server(args.port, args.debug)

    try:
        # Either open in browser or start Electron
        if args.browser:
            print("Opening in browser...")
            open_in_browser(args.port)
        else:
            print("Starting Electron application...")
            electron_process = start_electron_app(args.port, args.debug)
            electron_process.wait()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        # Ensure the backend server is terminated
        if backend_process:
            backend_process.terminate()
            backend_process.wait()

    print("Application terminated.")

if __name__ == "__main__":
    main()
