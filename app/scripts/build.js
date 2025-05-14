#!/usr/bin/env node
/**
 * Build script for Doctorino application
 * 
 * This script:
 * 1. Builds the frontend React application
 * 2. Packages the Python backend
 * 3. Creates an Electron executable
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the app directory
const appDir = path.resolve(__dirname, '..');
const frontendDir = path.join(appDir, 'frontend');
const backendDir = path.join(appDir, 'backend');
const distDir = path.join(appDir, 'dist');

// Ensure the dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Function to execute commands and log output
function runCommand(command, cwd = appDir) {
  console.log(`\n> ${command}\n`);
  try {
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: true }
    });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error);
    process.exit(1);
  }
}

// Build the frontend
console.log('Building frontend...');
runCommand('npm run build', frontendDir);

// Package the Python backend
console.log('Packaging backend...');
runCommand('pip install pyinstaller', backendDir);
runCommand('pyinstaller --onefile --name doctorino-backend main.py', backendDir);

// Move the packaged backend to the dist directory
const backendDist = path.join(backendDir, 'dist', 'doctorino-backend');
if (fs.existsSync(backendDist)) {
  const targetPath = path.join(distDir, 'doctorino-backend' + (process.platform === 'win32' ? '.exe' : ''));
  fs.copyFileSync(backendDist, targetPath);
  console.log(`Backend packaged to: ${targetPath}`);
}

// Build the Electron app
console.log('Building Electron application...');
runCommand('npm run build:electron', appDir);

console.log('\nBuild completed successfully!');
console.log(`Output files are in: ${distDir}`);
