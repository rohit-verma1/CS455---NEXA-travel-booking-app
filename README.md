# Nexa - AI-Powered Travel Booking Platform

## 🚀 Overview
Nexa is a sophisticated travel booking platform that leverages AI to provide seamless multi-modal transportation booking services. Built with Django REST Framework and integrated with Google's Gemini AI, it offers intelligent travel planning and booking capabilities.

## ✨ Features

- **🤖 AI-Powered Booking Assistant**
  - Natural language query processing
  - Intelligent travel planning
  - Multi-modal transportation optimization

- **🎫 Transportation Services**
  - Flight bookings
  - Train reservations
  - Bus tickets
  - Integrated service discovery

- **👥 User Management**
  - JWT Authentication
  - Role-based access control
  - Customer profiles
  - Service provider management

- **💳 Payment Processing**
  - Secure payment handling
  - Settlement processing
  - Transaction history
  - Refund management

- **📊 Analytics & Reviews
- Provider dashboards with income, occupancy, and booking metrics.  
- Customer reviews auto-linked to services and providers.  
- Train-number-based review aggregation and rating summaries.  
- Admin insights for top providers, refunds, and overall performance.  

    

## �️ Technology Stack

- **Backend Framework**: Django 4.2+
- **API Framework**: Django REST Framework
- **Database**: PostgreSQL 14+
- **AI Integration**: Google Gemini
- **Authentication**: JWT (JSON Web Tokens)
- **Task Queue**: Celery (for async operations)

## 📦 Installation

### Prerequisites
```bash
# Install uv (Modern Python Package Installer)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment with uv
uv venv

# Activate virtual environment
# On Windows:
.venv/Scripts/activate
# On Unix:
source .venv/bin/activate
```

### Dependencies
```bash
# Install dependencies with uv (faster than pip)
uv pip install -r requirements.txt
```

<!-- ### Environment Setup
Create a `.env` file in the root directory:
```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/nexa_db

# AI Configuration
GEMINI_API_KEY=your-gemini-api-key

# Database Configuration
DB_NAME=nexa_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# JWT Settings
JWT_SECRET_KEY=your-jwt-secret
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440
``` -->

### Database Setup
```bash
# Create database
createdb nexa_db

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```


## Getting Started

1. Clone the repository:
    ```bash
    git clone git@github.com:CS455-Software-Engineering/cs455-project-arcade-nation.git
    ```
2. Create and activate a virtual environment:
    ```bash
    pip install uv
    ```

3. Apply migrations:
    ```bash
    uv run python manage.py migrate
    ```
4. Start the development server:
    ```bash
    uv run python manage.py runserver
    ```

### API Documentation
Access the API documentation at:
- Swagger UI: `http://localhost:8000/api/schema/swagger-ui/`
- ReDoc: `http://localhost:8000/api/schema/redoc/`

## Backend Team Members & Responsibilities

| Name            | Responsibility                   |
|-----------------|--------------------------------- |
| Likith          | Auth, User and Agentic,ORM       |
| Rohit Verma     | Services, Bookings Payments, Analytics, ORM |


