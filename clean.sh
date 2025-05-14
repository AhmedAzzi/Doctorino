#!/bin/bash
# Clean script for Doctorino application

echo "Cleaning Doctorino application..."

# Change to the app directory
cd app

# Remove virtual environment
# if [ -d "venv" ]; then
#     echo "Removing virtual environment..."
#     rm -rf venv
# fi

# Remove node_modules
if [ -d "frontend/node_modules" ]; then
    echo "Removing node_modules..."
    rm -rf frontend/node_modules
fi

# Remove Python cache files
echo "Removing Python cache files..."
find . -name "__pycache__" -type d -exec rm -rf {} +
find . -name "*.pyc" -delete

# Remove temporary files
# echo "Removing temporary files..."
# find backend/uploads -name "record_*" -type d -exec rm -rf {} +
# find backend/uploads -name "mammo_*" -type d -exec rm -rf {} +

echo "Cleaning completed successfully!"
echo "You can now run ./setup.sh to set up the application again."
