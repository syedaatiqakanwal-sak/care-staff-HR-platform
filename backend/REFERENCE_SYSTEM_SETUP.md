# Reference Request System - Setup Guide

## Overview

The new Reference Request System replaces the PDF-attachment workflow with a secure link-based system that allows tracking and automated reminders.

## Database Migration

The system uses TypeORM with `synchronize: true` in development, so the database schema will be automatically updated. The new `references` table includes:

- `token` (unique, secure token for each reference)
- `status` (pending, opened, submitted, completed, failed)
- `openedAt` (timestamp when referee opened the link)
- `submittedAt` (timestamp when reference was submitted)
- `reminderCount` (number of reminder emails sent)
- `ipAddress` (IP address of submission for auditing)
- `submissionData` (JSONB field storing all form responses)

## Environment Variables

**CRITICAL**: Add the following to your `.env` file for the reference system to work:

```env
# Application Base URL - REQUIRED for Reference System
# This must be the public URL where your frontend is accessible
# DO NOT use localhost in production - referees cannot access localhost URLs
# Development:
APP_BASE_URL=http://localhost:5173

# Production (example):
APP_BASE_URL=https://cpd.yourdomain.com
# OR
APP_BASE_URL=http://72.62.199.119:81

# Email configuration (already configured)
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password
```

**Important Notes:**
- The system uses `APP_BASE_URL` as the primary variable
- Falls back to `FRONTEND_URL` or `APP_URL` for backward compatibility
- **DO NOT use localhost in production** - referees cannot access localhost URLs
- The URL should be the full base URL (with http:// or https://) without trailing slash
- This URL is used to generate secure links: `${APP_BASE_URL}/reference/submit/{token}`
- If `APP_BASE_URL` is not set or contains 'localhost', a warning will be logged

## Automated Reminders Setup

### Option 1: Using Cron (Recommended for Production)

Add to your crontab to run daily at 9 AM:

```bash
0 9 * * * cd /var/www/cpd-platform/cpdgroup/backend && npm run process-reminders >> /var/log/reference-reminders.log 2>&1
```

### Option 2: Manual Trigger via API

Admins can manually trigger reminder processing:

```bash
POST /api/v1/references/process-reminders
Authorization: Bearer <admin-token>
```

### Option 3: Using @nestjs/schedule (Future Enhancement)

Install the package:
```bash
npm install @nestjs/schedule
```

Then add to `app.module.ts`:
```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ... other modules
  ],
})
```

And in `references-scheduler.service.ts`:
```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Cron(CronExpression.EVERY_DAY_AT_9AM)
async processDailyReminders() {
  // ... existing code
}
```

## API Endpoints

### Public Endpoints (No Authentication)

- `GET /api/v1/reference/submit/:token` - Load reference form
- `POST /api/v1/reference/submit/:token` - Submit reference form

### Admin Endpoints (Requires Authentication)

- `POST /api/v1/references/send` - Create and send reference request
- `GET /api/v1/references/analytics` - Get analytics summary
- `GET /api/v1/references/analytics/all` - Get all references for dashboard
- `POST /api/v1/references/:id/remind` - Send manual reminder
- `POST /api/v1/references/process-reminders` - Process automated reminders

## Frontend Routes

- `/reference/submit/:token` - Public reference submission form
- `/dashboard/references/analytics` - Admin analytics dashboard

## Workflow

1. **Admin/Learner adds reference** → System generates secure token
2. **Email sent** → Contains secure link (no PDF attachment)
3. **Referee clicks link** → `openedAt` timestamp recorded
4. **Referee fills form** → All data stored in `submissionData` JSONB field
5. **Referee submits** → `submittedAt` timestamp recorded, status = "submitted"
6. **Automated reminders** → Sent after 3 days if not submitted (max 3 reminders)

## Security Features

- **Secure tokens**: 64-character hex strings generated with `crypto.randomBytes(32)`
- **Link expiration**: 14 days from creation date
- **Duplicate prevention**: Cannot submit if already submitted
- **IP tracking**: IP address stored on submission for auditing

## Testing

1. Create a reference via the admin panel
2. Check email for secure link
3. Click link to open form (should record `openedAt`)
4. Fill and submit form (should record `submittedAt`)
5. Try to submit again (should show "already submitted" message)
6. Check analytics dashboard for tracking data

## Troubleshooting

### Links not working
- Check `FRONTEND_URL` environment variable
- Verify token exists in database
- Check if link has expired (14 days)

### Reminders not sending
- Verify cron job is running: `crontab -l`
- Check logs: `/var/log/reference-reminders.log`
- Manually trigger via API endpoint
- Verify email configuration

### Form submission fails
- Check browser console for errors
- Verify token is valid and not expired
- Check backend logs for detailed error messages
