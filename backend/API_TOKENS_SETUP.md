# API Tokens System for n8n Automation

## Overview

This system provides secure API token authentication for n8n automation workflows. It allows programmatic access to user enrollment, plan generation, and reminder management without requiring JWT session authentication.

## Database Setup

### Option 1: Automatic (Recommended)

Since `synchronize: true` is enabled in TypeORM, the tables will be automatically created when the backend starts. No manual migration is needed.

### Option 2: Manual Migration

If you prefer to run migrations manually, execute these SQL files:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database

# Run migrations
\i migrations/create_api_tokens_table.sql
\i migrations/create_reminders_table.sql
\i migrations/create_plans_table.sql
```

## Creating Your First API Token

### Method 1: Via UI (Recommended)

1. Log in to the application as an admin
2. Navigate to `/settings/api-tokens` (or click "Settings" → "API Tokens" if added to menu)
3. Click "Create Token"
4. Enter:
   - **Token Name**: e.g., "n8n Production"
   - **Scopes**: Select one or more:
     - `enrollment` - For user enrollment operations
     - `plans` - For plan creation and management
     - `reminders` - For reminder creation and management
   - **Expires In (Days)**: Optional - leave empty for no expiration
5. Click "Create Token"
6. **IMPORTANT**: Copy the token immediately - it will only be shown once!
7. Store it securely (e.g., in n8n credentials)

### Method 2: Via API (Postman/curl)

```bash
# First, get your JWT token by logging in
curl -X POST http://your-domain/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}'

# Use the JWT token to create an API token
curl -X POST http://your-domain/api/v1/api/manage/tokens \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "n8n Production",
    "scopes": ["enrollment", "plans", "reminders"],
    "expiresInDays": 365
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "abc123...",  // SAVE THIS - shown only once!
  "apiToken": {
    "id": "uuid",
    "name": "n8n Production",
    "scopes": ["enrollment", "plans", "reminders"],
    "expiresAt": "2025-12-31T00:00:00.000Z",
    "createdAt": "2025-03-06T10:00:00.000Z"
  },
  "message": "Token created successfully. Save this token now - it will not be shown again."
}
```

## n8n HTTP Request Node Configuration

### Base Configuration

- **Method**: POST/GET/PATCH (varies by endpoint)
- **URL**: `http://your-domain/api/v1/api/n8n/{endpoint}`
- **Authentication**: 
  - **Type**: Header
  - **Name**: `Authorization`
  - **Value**: `Bearer YOUR_API_TOKEN`

### Endpoint 1: Enroll User

**Purpose**: Assign a user to a plan

**n8n Settings:**
- **Method**: POST
- **URL**: `http://your-domain/api/v1/api/n8n/enroll-user`
- **Headers**: 
  - `Authorization: Bearer YOUR_API_TOKEN`
  - `Content-Type: application/json`
- **Body (JSON)**:
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "planId": "plan-uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "user-uuid",
  "planId": "plan-uuid",
  "enrolledAt": "2025-03-06T10:00:00.000Z"
}
```

### Endpoint 2: Generate Plan

**Purpose**: Create a new plan for a user

**n8n Settings:**
- **Method**: POST
- **URL**: `http://your-domain/api/v1/api/n8n/generate-plan`
- **Headers**: 
  - `Authorization: Bearer YOUR_API_TOKEN`
  - `Content-Type: application/json`
- **Body (JSON)**:
```json
{
  "userId": "user-uuid-here",
  "planType": "Standard Training Plan",
  "startDate": "2025-03-06T00:00:00.000Z",
  "metadata": {
    "customField": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "planId": "plan-uuid",
  "userId": "user-uuid",
  "planType": "Standard Training Plan",
  "startDate": "2025-03-06T00:00:00.000Z"
}
```

### Endpoint 3: Get Plans for User

**Purpose**: Retrieve all plans for a specific user

**n8n Settings:**
- **Method**: GET
- **URL**: `http://your-domain/api/v1/api/n8n/plans/{userId}`
- **Headers**: 
  - `Authorization: Bearer YOUR_API_TOKEN`

**Response:**
```json
{
  "success": true,
  "plans": [
    {
      "id": "plan-uuid",
      "userId": "user-uuid",
      "planType": "Standard Training Plan",
      "startDate": "2025-03-06T00:00:00.000Z",
      "metadata": {},
      "createdAt": "2025-03-06T10:00:00.000Z",
      "updatedAt": "2025-03-06T10:00:00.000Z"
    }
  ]
}
```

### Endpoint 4: Create Reminder

**Purpose**: Schedule a reminder for a user

**n8n Settings:**
- **Method**: POST
- **URL**: `http://your-domain/api/v1/api/n8n/reminders`
- **Headers**: 
  - `Authorization: Bearer YOUR_API_TOKEN`
  - `Content-Type: application/json`
- **Body (JSON)**:
```json
{
  "userId": "user-uuid-here",
  "type": "training_due",
  "message": "Your training is due in 3 days",
  "scheduledAt": "2025-03-09T09:00:00.000Z",
  "metadata": {
    "courseName": "Health and Safety"
  }
}
```

**Response:**
```json
{
  "success": true,
  "reminderId": "reminder-uuid",
  "scheduledAt": "2025-03-09T09:00:00.000Z"
}
```

### Endpoint 5: Get Pending Reminders

**Purpose**: Poll for reminders that are due to be sent

**n8n Settings:**
- **Method**: GET
- **URL**: `http://your-domain/api/v1/api/n8n/reminders/pending?limit=50`
- **Headers**: 
  - `Authorization: Bearer YOUR_API_TOKEN`

**Response:**
```json
{
  "success": true,
  "reminders": [
    {
      "id": "reminder-uuid",
      "userId": "user-uuid",
      "type": "training_due",
      "message": "Your training is due in 3 days",
      "scheduledAt": "2025-03-09T09:00:00.000Z",
      "sent": false,
      "sentAt": null,
      "metadata": {
        "courseName": "Health and Safety"
      },
      "createdAt": "2025-03-06T10:00:00.000Z"
    }
  ]
}
```

### Endpoint 6: Mark Reminder as Sent

**Purpose**: Update reminder status after sending notification

**n8n Settings:**
- **Method**: PATCH
- **URL**: `http://your-domain/api/v1/api/n8n/reminders/{reminderId}/sent`
- **Headers**: 
  - `Authorization: Bearer YOUR_API_TOKEN`

**Response:**
```json
{
  "success": true,
  "reminderId": "reminder-uuid",
  "sentAt": "2025-03-09T09:00:00.000Z"
}
```

## n8n Workflow Example

### Reminder Polling Workflow

1. **Schedule Trigger** (every 5 minutes)
2. **HTTP Request**: GET `/api/n8n/reminders/pending?limit=50`
3. **Split In Batches**: Process each reminder
4. **For Each Reminder**:
   - **HTTP Request**: Send notification (email/SMS/webhook)
   - **HTTP Request**: PATCH `/api/n8n/reminders/{id}/sent` to mark as sent
5. **Error Handling**: Log failures

## Security Notes

1. **Token Storage**: Never commit API tokens to version control
2. **Token Rotation**: Regularly rotate tokens (delete old, create new)
3. **Scope Limitation**: Only grant necessary scopes
4. **Expiration**: Set expiration dates for tokens when possible
5. **Monitoring**: Check `last_used_at` to detect unauthorized usage

## Error Responses

All endpoints return consistent error formats:

```json
{
  "statusCode": 401,
  "message": "Invalid API token",
  "error": "Unauthorized"
}
```

Common status codes:
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Token expired or missing required scope
- `404 Not Found`: Resource not found (user, plan, etc.)
- `400 Bad Request`: Invalid request body

## Token Management

### View All Tokens

```bash
curl -X GET http://your-domain/api/v1/api/manage/tokens \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Delete Token

```bash
curl -X DELETE http://your-domain/api/v1/api/manage/tokens/{tokenId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### "Invalid API token"
- Check that token is correctly copied (no extra spaces)
- Verify token hasn't been deleted
- Ensure token hasn't expired

### "Missing required scopes"
- Token doesn't have the required scope
- Create a new token with the correct scopes

### "User not found"
- Verify user email/userId is correct
- Check user exists in the database

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify tables exist (check with `\dt` in psql)

## Support

For issues or questions, check:
1. Backend logs: `npm run start:dev` (shows detailed errors)
2. Database logs: Check PostgreSQL logs
3. n8n execution logs: Check n8n workflow execution history
