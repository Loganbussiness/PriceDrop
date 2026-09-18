const fs = require('fs');
const path = require('path');

const schemaDir = path.join(__dirname, '..', 'prisma');
const sqliteSchema = path.join(schemaDir, 'schema.prisma');
const postgresSchema = path.join(schemaDir, 'schema.postgresql.prisma');
const currentSchema = path.join(schemaDir, 'schema.prisma');

// Check if we're in production environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production,undefined';

// Force production mode if specified via command line argument
const forceProduction = process.argv.includes('--production');

// Force development mode if specified via command line argument
const forceDevelopment = process.argv.includes('--development');

if (forceProduction || (isProduction && !forceDevelopment)) {
  console.log('🔧 Production environment detected - switching to PostgreSQL schema');
  
  // Check if PostgreSQL schema exists
  if (!fs.existsSync(postgresSchema)) {
    console.error('❌ PostgreSQL schema not found at:', postgresSchema);
    process.exit(1);
  }
  
  // Copy PostgreSQL schema to current schema
  fs.copyFileSync(postgresSchema, currentSchema);
  console.log('✅ PostgreSQL schema activated');
} else {
  console.log('🔧 Development environment - keeping current schema');
  
  // Keep whatever schema is currently in place (could be SQLite or PostgreSQL)
  if (!fs.existsSync(currentSchema)) {
    console.error('❌ Current schema not found at:', currentSchema);
    process.exit(1);
  }
  
  console.log('✅ Current schema preserved');
}