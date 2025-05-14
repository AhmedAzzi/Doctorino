#!/bin/bash
# Setup script for Doctorino application

echo "Setting up Doctorino application..."

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

# Create Python virtual environment
# echo "Creating Python virtual environment..."
# python3 -m venv venv
# source venv/bin/activate

# # Install Python dependencies
# echo "Installing Python dependencies..."
# pip install --upgrade pip
# pip install -r backend/requirements.txt

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install

# Go back to app directory
cd ..

echo "Setup completed successfully!"
echo "You can now run the application using ./run.sh"

# Deactivate the virtual environment
deactivate
