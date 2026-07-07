# Backend API

NestJS REST API for the Care Staff CPD Platform.

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)

## Quick Start

```bash
docker compose up -d
npm install
npm run start:dev
```

Configure a private `.env` file with your database and service credentials before starting.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Dev server with hot reload |
| `npm run build` | Build for production |
| `npm run seed` | Create admin user (requires env vars) |
| `npm run process-reminders` | Process reference reminders |
