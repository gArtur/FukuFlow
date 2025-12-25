/**
 * Setup Script for WealthFlow
 * ----------------------------
 * This script automates the initial setup by:
 * 1. Copying .env.example to .env (if .env doesn't exist)
 * 2. Generating a secure JWT secret and injecting it into .env
 *
 * Usage: node scripts/setup.cjs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.join(__dirname, '..');
const ENV_EXAMPLE = path.join(ROOT_DIR, '.env.example');
const ENV_FILE = path.join(ROOT_DIR, '.env');

console.log('🚀 WealthFlow Setup\n');

// Step 1: Check if .env already exists
if (fs.existsSync(ENV_FILE)) {
    console.log('⚠️  .env file already exists. Skipping copy.');
    console.log('   If you want to regenerate, delete .env and run this script again.\n');
} else {
    // Copy .env.example to .env
    if (!fs.existsSync(ENV_EXAMPLE)) {
        console.error('❌ Error: .env.example not found!');
        process.exit(1);
    }
    fs.copyFileSync(ENV_EXAMPLE, ENV_FILE);
    console.log('✅ Copied .env.example to .env');
}

// Step 2: Generate and inject JWT secret
let envContent = fs.readFileSync(ENV_FILE, 'utf-8');

// Check if JWT_SECRET already has a real value (not the placeholder)
const jwtSecretMatch = envContent.match(/JWT_SECRET=(.+)/);
const currentSecret = jwtSecretMatch ? jwtSecretMatch[1].trim() : '';

const placeholders = [
    'dev-secret-do-not-use-in-production-change-me',
    'your_generated_secret_here',
    'your-secret-here-change-this',
    ''
];

if (placeholders.includes(currentSecret)) {
    // Generate a new secure secret
    const newSecret = crypto.randomBytes(64).toString('hex');
    envContent = envContent.replace(
        /JWT_SECRET=.*/,
        `JWT_SECRET=${newSecret}`
    );
    fs.writeFileSync(ENV_FILE, envContent);
    console.log('✅ Generated and set a secure JWT_SECRET');
} else {
    console.log('⚠️  JWT_SECRET already set. Skipping generation.');
}

console.log('\n🎉 Setup complete! You can now run the application:');
console.log('   - Docker:  docker-compose up -d --build');
console.log('   - Local:   npm run dev (frontend) + node server/index.js (backend)\n');
