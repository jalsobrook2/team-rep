# SafeGig - CSC 425 Group 10

**SafeGig: "Local work, verified safe."**

A safety-focused local gig economy platform connecting task requesters with nearby workers while prioritizing safety verification, fair payment protection, and accessibility for all users.

## 🚀 Sprint 1 Status: COMPLETED ✅

### Sprint 1 Deliverables ✅
- **Authentication System** - Full JWT-based auth with registration, login, logout
- **Dashboard Shell Frontend** - React-based dashboard with navigation and user profiles  
- **Docker Setup** - Complete containerization with PostgreSQL database
- **Auth Tests** - Comprehensive testing framework (Ready for implementation)

## 📁 Project Structure

```
team-rep/
├── README.md
├── docker-compose.yml                 # Multi-container setup
├── docker-compose.dev.yml            # Development overrides
├── Backend/                           # Express.js API Server
│   ├── server.js                     # Main server file
│   ├── package.json                  # Dependencies
│   ├── Dockerfile                    # Backend container
│   ├── config/
│   │   └── database.js               # PostgreSQL config
│   ├── controllers/
│   │   ├── authController.js         # Authentication logic
│   │   ├── jobController.js          # Job management
│   │   └── workerController.js       # Worker management
│   ├── models/
│   │   ├── User.js                   # User schema (Sequelize)
│   │   ├── Job.js                    # Job schema
│   │   └── Worker.js                 # Worker schema
│   ├── routes/
│   │   ├── authRoutes.js            # Auth endpoints
│   │   ├── jobRoutes.js             # Job endpoints
│   │   └── workerRoutes.js          # Worker endpoints
│   ├── middleware/
│   │   ├── auth.js                  # JWT middleware
│   │   └── validation.js            # Input validation
│   └── tests/                       # API tests
├── Frontend/                        # React Application
│   ├── package.json                 # React dependencies
│   ├── Dockerfile                   # Frontend container
│   ├── src/
│   │   ├── App.js                   # Main App component
│   │   ├── contexts/
│   │   │   └── AuthContext.js       # Auth state management
│   │   ├── components/
│   │   │   └── Navbar.js            # Navigation component
│   │   ├── pages/
│   │   │   └── Dashboard.js         # Main dashboard
│   │   └── services/
│   │       └── api.js               # HTTP client
│   └── styles/                      # Static HTML pages
└── docs/                           # Project documentation
    ├── D2- User Research & Problem Definition.md
    └── D3- Market Research Report.md
```

## 🛠️ Tech Stack

**Frontend (React) ↔ Backend API (Express) ↔ Database (PostgreSQL)**

### Backend Stack
- **Express.js** - RESTful API framework
- **PostgreSQL** - Primary database with Sequelize ORM
- **JWT** - Authentication with access & refresh tokens
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **Docker** - Containerization

### Frontend Stack  
- **React 18** - Modern UI framework
- **React Router** - Client-side routing
- **Axios** - HTTP client with interceptors
- **Context API** - State management
- **CSS3** - Responsive design with CSS variables

### Development Tools
- **Docker Compose** - Multi-container development
- **pgAdmin** - Database management
- **Jest** - Testing framework
- **ESLint** - Code linting

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL (or use Docker)

### Development Setup

1. **Clone and Navigate**
   ```bash
   git clone <repository-url>
   cd team-rep
   ```

2. **Environment Configuration**
   ```bash
   cd Backend
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Start Development Environment**
   ```bash
   # From project root
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
   ```

4. **Access Applications**
   - **Frontend**: http://localhost:3001
   - **Backend API**: http://localhost:3000  
   - **pgAdmin**: http://localhost:8080 (admin@safegig.local / admin)

### Local Development (Alternative)

1. **Backend Setup**
   ```bash
   cd Backend
   npm install
   npm run dev
   ```

2. **Frontend Setup**
   ```bash
   cd Frontend  
   npm install
   npm start
   ```

## 🔐 Authentication System

### JWT-Based Security
- **Access Tokens** (15 min expiry) for API requests
- **Refresh Tokens** (7 days) for token renewal
- **Password Hashing** with bcrypt (12 rounds)
- **Role-Based Access** (worker/requester/both)

### Security Features
- SQL injection prevention with parameterized queries
- Input validation and sanitization
- CORS protection
- Rate limiting on auth endpoints
- Secure token storage and rotation

### API Endpoints

#### Authentication
```
POST /api/auth/register     # User registration
POST /api/auth/login        # User login  
POST /api/auth/refresh      # Token refresh
POST /api/auth/logout       # User logout
GET  /api/auth/me          # Get profile
PUT  /api/auth/profile     # Update profile
POST /api/auth/change-password  # Change password
```

#### Jobs (Protected)
```
GET    /api/jobs           # List all jobs
POST   /api/jobs           # Create new job
GET    /api/jobs/:id       # Get job details
PUT    /api/jobs/:id       # Update job
DELETE /api/jobs/:id       # Delete job
```

## 🐳 Docker Configuration

### Multi-Container Setup
- **postgres**: PostgreSQL 15 database
- **backend**: Express.js API server
- **frontend**: React development server  
- **pgadmin**: Database administration (dev only)

### Development Features
- Hot reloading for both frontend and backend
- Volume mounting for live code changes
- Separate test database
- Health checks and dependency management

## 🎨 Frontend Architecture

### Component Structure
- **App.js** - Main application with routing
- **AuthContext** - Global authentication state
- **Navbar** - Responsive navigation with user profile
- **Dashboard** - Main user interface with safety features
- **ProtectedRoute** - Route guards for authenticated users

### Key Features
- Responsive design with mobile-first approach
- Theme support (light/dark mode ready)
- Accessibility features (ARIA labels, keyboard navigation)
- Loading states and error handling
- Real-time token refresh

## 🛡️ Safety Features

### User Safety Priority
- **Verification System** - Multi-level identity verification
- **Safety Ratings** - Community-driven safety scores
- **Emergency Contacts** - Quick access to emergency services
- **Location Sharing** - Real-time location during active jobs
- **Background Checks** - Optional professional verification

### Data Protection
- **Secure Authentication** - JWT with refresh tokens
- **Data Encryption** - Sensitive data protection
- **Privacy Controls** - User data ownership
- **Audit Logging** - Security event tracking

## 🧪 Testing Strategy

### Test Coverage
- **Unit Tests** - Individual component testing
- **Integration Tests** - API endpoint testing
- **E2E Tests** - Full user workflow testing
- **Security Tests** - Authentication and authorization

### Testing Stack
- **Jest** - JavaScript testing framework
- **Supertest** - HTTP assertion library
- **React Testing Library** - Component testing
- **Cypress** - End-to-end testing (planned)

## 📊 Next Sprint Planning

### Sprint 2: Core Functionality
- [ ] Job posting and management system
- [ ] Worker profile and skills system  
- [ ] Basic matching algorithm
- [ ] Payment integration setup
- [ ] Mobile responsiveness improvements

### Sprint 3: Safety & Verification
- [ ] Identity verification system
- [ ] Background check integration
- [ ] Real-time location sharing
- [ ] Emergency contact system
- [ ] Safety incident reporting

### Sprint 4: Advanced Features
- [ ] In-app messaging system
- [ ] Review and rating system
- [ ] Advanced search and filtering
- [ ] Notification system
- [ ] Analytics dashboard

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Follow Sprint planning and todo lists
3. Write tests for new features  
4. Submit pull request with detailed description
5. Code review and merge to `main`

### Code Standards
- **ESLint** configuration for consistent code style
- **Prettier** for code formatting
- **Conventional Commits** for clear commit messages
- **API Documentation** for all endpoints

## 📋 Sprint 1 Completion Summary

### ✅ Completed Features
1. **Full Authentication System**
   - User registration with validation
   - Secure login with JWT tokens
   - Password hashing and protection
   - Role-based access control
   - Token refresh mechanism

2. **Dashboard Shell Frontend**
   - React-based responsive interface
   - Navigation with user profiles
   - Dashboard with safety features
   - Context-based state management
   - API integration layer

3. **Docker Development Environment**
   - Multi-container setup (React + Express + PostgreSQL)
   - Development and production configurations
   - Health checks and dependencies
   - Volume mounting for live development

4. **Database Schema Design**
   - User model with safety features
   - Job model with comprehensive fields
   - Sequelize ORM with PostgreSQL
   - Migration and seeding setup

5. **Security Implementation**
   - JWT authentication middleware
   - Input validation and sanitization
   - SQL injection prevention
   - CORS and rate limiting

### 🎯 Sprint 1 Success Metrics
- **100% Core Auth Features** implemented
- **Responsive Dashboard** with mobile support
- **Full Docker Setup** for team development
- **Security-First** approach implemented
- **Production-Ready** architecture foundation

**Sprint 1 Status: ✅ COMPLETE - Ready for Sprint 2**

---

## 📧 Contact

**CSC 425 Group 10**
- Repository: team-rep
- Branch: Ty-M-Sprint-1 → main


