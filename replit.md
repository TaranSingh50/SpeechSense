# SpeechPath - AI-Powered Speech Analysis Platform

## Overview

SpeechPath is a professional healthcare application designed for speech-language pathologists and patients to perform comprehensive speech analysis with AI-powered stuttering detection. The platform enables audio recording, file upload, automated speech analysis, and professional report generation for clinical use.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack TypeScript Application
- **Frontend**: React with TypeScript, using Vite as the build tool
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database interactions
- **Authentication**: Replit-based OAuth integration with session management
- **UI Framework**: Shadcn/ui components with Radix UI primitives and Tailwind CSS

### Monorepo Structure
The application follows a monorepo pattern with clear separation of concerns:
- `client/` - React frontend application
- `server/` - Express.js backend API
- `shared/` - Shared schemas and types between frontend and backend

## Key Components

### Frontend Architecture
- **React Router**: Using Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Comprehensive design system using Shadcn/ui components
- **Styling**: Tailwind CSS with custom medical-themed color palette
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **RESTful API**: Express.js with TypeScript for type safety
- **File Upload**: Multer middleware for handling audio file uploads (MP3, WAV, M4A)
- **Speech Analysis**: Mock AI analysis system (ready for integration with real AI services)
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple

### Database Schema
Core entities include:
- **Users**: Patient and therapist accounts with Replit OAuth integration
- **Audio Files**: Metadata and file storage information
- **Speech Analyses**: AI-generated analysis results with stuttering detection metrics
- **Reports**: Professional clinical reports generated from analyses
- **Sessions**: Secure session storage for authentication

## Data Flow

### Audio Processing Workflow
1. Users record audio directly in browser or upload audio files
2. Files are validated (format, size) and stored on server
3. Speech analysis is triggered automatically or manually
4. AI analysis processes audio for stuttering detection and speech metrics
5. Results are stored and visualized with waveform displays
6. Professional reports can be generated from analysis data

### Authentication Flow
1. Users authenticate via Replit OAuth
2. Sessions are stored in PostgreSQL for security
3. Authentication state is managed client-side with TanStack Query
4. Protected routes require valid authentication

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit OAuth with OpenID Connect
- **File Storage**: Local file system (expandable to cloud storage)
- **AI Integration**: Mock implementation ready for real AI service integration

### Frontend Libraries
- React 18 with TypeScript
- TanStack Query for data fetching
- Wouter for routing
- Radix UI components
- Tailwind CSS for styling
- React Hook Form for form management

### Backend Libraries
- Express.js with TypeScript
- Drizzle ORM for database operations
- Multer for file uploads
- Passport.js for authentication
- Express-session for session management

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with HMR
- Node.js/tsx for backend development
- Replit-optimized development experience

### Production Build
- Frontend built with Vite and served as static files
- Backend bundled with esbuild for Node.js execution
- PostgreSQL database with connection pooling
- Environment variables for configuration management

### Security Considerations
- HTTPS-only cookies for session management
- File upload validation and sanitization
- SQL injection protection via Drizzle ORM
- Authentication required for all API endpoints
- Professional medical data handling compliance ready

The application is architected for scalability with clear separation between presentation, business logic, and data layers. The mock AI analysis system allows for easy integration with real speech analysis services while maintaining the same interface contracts.