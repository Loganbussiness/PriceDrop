#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read DATABASE_URL from environment
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL environment variable is required');
  console.error('Usage: DATABASE_URL="postgresql://..." node scripts/push-production-schema.js');
  process.exit(1);
}

console.log('🔧 Setting up production schema...');

// Temporarily set DATABASE_URL for Prisma
process.env.DATABASE_URL = dbUrl;

try {
  // Switch to production schema
  console.log('📋 Switching to PostgreSQL schema...');
  execSync('node scripts/switch-schema.js --production', { stdio: 'inherit' });
  
  // Generate Prisma client
  console.log('🔨 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Push schema to database
  console.log('🚀 Pushing schema to production database...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  
  console.log('✅ Production schema created successfully!');
} catch (error) {
  console.error('❌ Failed to create production schema:', error.message);
  process.exit(1);
}