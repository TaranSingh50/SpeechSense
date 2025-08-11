# SpeechPath - AI-Powered Speech Analysis Platform

## Overview

SpeechPath is a professional healthcare application designed for speech-language pathologists and patients to perform comprehensive speech analysis with AI-powered stuttering detection. The platform enables audio recording, file upload, automated speech analysis, and professional report generation for clinical use.

**MIGRATION STATUS**: Successfully migrated from Replit Agent to standard Replit environment ✅ COMPLETE (August 11, 2025)

**MIGRATION FIXES COMPLETED**: 
- Switched from in-memory storage to PostgreSQL database storage ✅ 
- Fixed audio file persistence issue - files now properly save to database ✅
- Resolved authentication token handling for database storage ✅
- Identified root cause of audio library polling issue - token expiration during queries ✅

**Recent Updates**: 
- Successfully completed migration from Replit Agent to standard Replit environment ✅
- Configured fallback to in-memory storage for development when DATABASE_URL not available ✅
- Made OpenAI integration conditional to prevent startup failures without API key ✅
- Added OPENAI_API_KEY environment variable for real AI-powered speech transcription ✅
- Resolved all TypeScript compilation errors in storage layer ✅
- Application running smoothly on port 5000 with full functionality ✅
- Fixed database table creation issue by pushing schema with drizzle-kit ✅
- Fixed package installation and dependency management ✅
- Created and configured PostgreSQL database with all required tables ✅
- Pushed database schema using Drizzle ORM successfully ✅
- Application running smoothly on port 5000 with full functionality ✅
- Fixed form validation for firstName, lastName, and email in registration ✅
- Implemented proper logout navigation to redirect users to login screen ✅  
- Resolved all TypeScript errors and validation issues ✅
- Fixed audio recording save functionality by correcting FormData handling ✅
- Added three audio management features: auto-refresh, audio playback, and delete with refresh ✅
- Removed manual refresh button and implemented automatic library updates ✅
- Fixed audio streaming authentication for proper playback functionality ✅
- Application running smoothly on port 5000 with complete audio management system ✅
- Added cancel functionality for recorded audio and uploaded files with proper cleanup ✅
- Enhanced user experience with clear cancel options in both recording and file upload workflows ✅
- Fixed automatic refresh for Audio File Library after recording save and file upload ✅
- Improved query client configuration to ensure immediate updates without manual page refresh ✅
- Added intelligent polling system for audio files and analyses to catch server-side processing updates ✅
- Implemented 3-second polling for audio files and status-based polling for speech analyses ✅
- Successfully migrated from in-memory to PostgreSQL database persistence ✅  
- Fixed audio file library query authentication and polling system ✅
- Resolved critical frontend TanStack Query missing queryFn bug ✅
- Added audio duration detection and uploaded/recorded file labels ✅
- Fixed duration display bug with "Duration not available" fallback for invalid values ✅
- Created shared audioUtils.ts for consistent audio handling across components ✅
- Applied duration and label improvements to Dashboard Recent Audio Files section ✅
- Added audio duration detection for file uploads with HTML5 Audio API ✅
- Implemented real-time duration display in Upload Audio File section showing format like "1:32" ✅
- Enhanced file upload UI with duration loading states and "NA" fallback for unreadable files ✅
- Fixed Clinical Reports generation validation error by excluding userId from insert schema ✅
- Resolved "Invalid report data" error that was preventing report creation ✅
- Added delete functionality for Clinical Reports with confirmation dialog ✅
- Reports now display properly in Generated Reports section with full CRUD operations ✅
- Completely redesigned Speech Analysis screen with new UI/UX structure ✅
- Added progress animation for analysis processing with visual progress indicators ✅
- Created Analysis Details section with Basic File Info cards, Audio Transcription view, and PDF Actions ✅
- Implemented PDF preview with zoom controls, download, and email sharing functionality ✅
- Enhanced user experience with clean, modular, responsive design and meaningful data placeholders ✅
- Fixed Speech Analysis screen to use real transcription data instead of hardcoded placeholder text ✅
- Added proper backend routes for PDF generation, download, and email sharing functionality ✅
- Implemented user-friendly error handling with "N/A (Could not be calculated)" for missing data ✅
- Enhanced analysis workflow to only show details after analysis completion, with proper progress indicators ✅

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack React/Node.js Application (Current Architecture)
- **Backend**: Express.js server with TypeScript for type safety
- **Frontend**: React with TypeScript and Vite build tool for modern development
- **Database**: PostgreSQL with Drizzle ORM for database interactions
- **Authentication**: JWT-based authentication with proper logout flow
- **API Framework**: Express.js with RESTful API design
- **Server Port**: Node.js application running on port 5000

### Legacy Architecture (Node.js/TypeScript)
The original system used:
- React with TypeScript and Vite build tool
- Express.js server with TypeScript
- Drizzle ORM for database interactions
- Shadcn/ui components with Radix UI primitives and Tailwind CSS

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
- **Users**: Patient and therapist accounts with email/password authentication
- **Auth Tokens**: JWT access and refresh token management for secure authentication
- **Audio Files**: Metadata and file storage information
- **Speech Analyses**: AI-generated analysis results with stuttering detection metrics
- **Reports**: Professional clinical reports generated from analyses
- **Sessions**: Legacy session storage table maintained for compatibility

## Data Flow

### Audio Processing Workflow
1. Users record audio directly in browser or upload audio files
2. Files are validated (format, size) and stored on server
3. Speech analysis is triggered automatically or manually
4. AI analysis processes audio for stuttering detection and speech metrics
5. Results are stored and visualized with waveform displays
6. Professional reports can be generated from analysis data

### Authentication Flow
1. Users register with email and password or login with existing credentials
2. JWT access tokens are issued for API authorization (7 days expiry)
3. HTTP-only refresh tokens enable secure token renewal (30 days expiry)
4. Authentication state is managed client-side with TanStack Query
5. Protected routes require valid JWT tokens in Authorization headers

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: JWT tokens with bcrypt password hashing and HTTP-only cookies
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