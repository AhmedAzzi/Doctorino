#!/bin/bash
# Simple script to run the Doctorino application

# Change to the app directory
cd app

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3 and try again."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm and try again."
    exit 1
fi

# Use the existing virtual environment
if [ -d "../venv" ]; then
    echo "Using existing virtual environment..."
    source ../venv/bin/activate
elif [ -d "venv" ]; then
    echo "Using existing virtual environment..."
    source venv/bin/activate
else
    echo "No virtual environment found. Using system Python..."
fi

# Check if pydantic is installed
if ! python3 -c "import pydantic" &> /dev/null; then
    echo "Missing dependencies detected. Installing..."
    python3 main.py --install-deps
    echo "Please run the script again."
    exit 0
fi

# Run the application
echo "Starting Doctorino application..."
python3 main.py "$@"

# Deactivate the virtual environment when done
deactivate
