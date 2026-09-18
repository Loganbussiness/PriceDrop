# PriceDrop Deployment Guide

## Phase 1: Database & Infrastructure Setup

### Architecture Overview

This project uses a dual-schema approach:
- **Development**: SQLite (file:./dev.db) - uses `prisma/schema.prisma`
- **Production**: PostgreSQL - uses `prisma/schema.postgresql.prisma`

### 1. Supabase Database Setup (COMPLETED)

**Your Supabase Project Details:**
- **Project ID**: `vlpkgedzwsisopahzmzp`
- **Database Host**: `vlpkgedzwsisopahzmzp.supabase.co`
- **Connection String**: `postgresql://postgres:[YOUR-PASSWORD]@vlpkgedzwsisopahzmzp.supabase.co:5432/postgres`
- **Password**: `!uGVBd$3sNTYwP2`

### 2. Vercel Deployment Setup

1. **Create a Vercel Account**
   - Go to https://vercel.com
   - Sign up (you can use GitHub, GitLab, or Bitbucket)

2. **Import Your Project**
   - Click "Add New" → "Project"
   - Import your pricedrop repository
   - Vercel will detect Next.js automatically

3. **Configure Environment Variables**
   In Vercel project settings, add these environment variables:
   
   ```
   DATABASE_URL=postgresql://postgres:!uGVBd$3sNTYwP2@vlpkgedzwsisopahzmzp.supabase.co:5432/postgres
   AUTH_SECRET=MM3ddkz2w5rr+/XgevYTojbD8B1qubE64uix6AHNrXg=
   NODE_ENV=production
   ```

### 3. Deploy to Vercel

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Configure for Supabase PostgreSQL deployment"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Vercel will auto-deploy from your GitHub repository
   - Monitor the deployment logs
   - Your app will be live at `https://your-project.vercel.app`

### 4. Post-Deployment Checklist

- [ ] Test the deployed app
- [ ] Verify database connectivity
- [ ] Test user registration/login
- [ ] Test product analysis
- [ ] Set up custom domain (optional)
- [ ] Configure SSL (automatic on Vercel)

## Environment Variables Summary

**Production (Vercel):**
```
DATABASE_URL=postgresql://postgres:!uGVBd$3sNTYwP2@vlpkgedzwsisopahzmzp.supabase.co:5432/postgres
AUTH_SECRET=MM3ddkz2w5rr+/XgevYTojbD8B1qubE64uix6AHNrXg=
NODE_ENV=production
```

## Build Process

The build script automatically handles schema switching:
- In development: Uses SQLite schema
- In production: Uses `--production` flag to switch to PostgreSQL schema

## Troubleshooting

**Database Connection Issues:**
- Verify Supabase project is active
- Check connection string format
- Ensure database password is correct
- Check Supabase dashboard for connection issues

**Build Failures:**
- Check Vercel build logs
- Ensure all dependencies are installed
- Verify Prisma client generation completes
- Check that schema.postgresql.prisma exists

**Runtime Errors:**
- Check environment variables are set correctly
- Verify database schema matches Prisma schema
- Check network connectivity to Supabase

## Next Steps (Phase 2)

After successful deployment, you'll need to implement:
- Email notifications for price alerts
- Rate limiting for web scraping
- Monitoring and error tracking
- Automated testing