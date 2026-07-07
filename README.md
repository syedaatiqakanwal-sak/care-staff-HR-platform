# Care Staff CPD Platform

> A full-stack HR and Continuing Professional Development (CPD) platform for UK care-sector staff training, compliance, and workforce management.

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## Overview

**Care Staff CPD Platform** is a modern web application that helps care organisations manage their workforce end-to-end:

- Staff profiles and HR records
- Mandatory and specialist training courses
- PDF certificates with verification codes
- Policy reading and compliance tracking
- Employment reference requests via secure links
- Encrypted Virtual Learning Environment (VLE) credentials
- Workflow automation integrations

The platform supports role-based access for administrators and staff, with separate views for workforce management and self-service employee tasks.

---

## Features

| Area | Capabilities |
|---|---|
| **Staff & HR** | Profiles, employment records, address history, review forms, digital signatures |
| **Training & CPD** | Course catalog, enrollment tracking, certificate generation |
| **Compliance** | Policy management, timed reading sessions, analytics and reports |
| **References** | Secure link-based reference requests with automated reminders |
| **Automation** | Scoped API tokens for external workflow tools |
| **Security** | JWT authentication, encrypted credential storage, rate limiting |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | NestJS 11, TypeScript, TypeORM, PostgreSQL 15 |
| **Frontend** | React 19, Vite 7, Mantine UI 8, React Router 7 |
| **State** | TanStack Query, Zustand, Axios |
| **Auth** | JWT, Passport, bcrypt |
| **DevOps** | Docker Compose |

---

## Project Structure

```
care-staff-cpd-platform/
├── backend/          # NestJS REST API
│   ├── src/          # Application modules and services
│   ├── migrations/   # SQL database migrations
│   └── scripts/      # Utility scripts
├── frontend/         # React + Vite SPA
│   └── src/          # Components, pages, and utilities
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (recommended) or PostgreSQL 15

### Backend

```bash
cd backend
npm install
docker compose up -d
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

> **Note:** Environment configuration is required before running locally. Create a private `.env` file in the `backend` directory with your database, authentication, and email settings. Do not commit secrets to version control.

---

## Security

- Passwords are hashed with bcrypt
- Sensitive credentials are encrypted at rest
- API access supports scoped tokens with optional expiration
- Environment files and database dumps are excluded via `.gitignore`

---

## License

Private project. All rights reserved.
