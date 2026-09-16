# FANOS AI Authentication System

## Overview
Professional registration and login system for FANOS AI platform with role-based access control.

## Features
- ✅ User Registration with validation
- ✅ Secure Login with JWT tokens
- ✅ Role-based access (Admin / Customer)
- ✅ Password strength validation
- ✅ Remember me functionality
- ✅ Automatic redirect after registration
- ✅ Professional UI with error handling

## Routes

### Public Routes
- `/home` - Landing page
- `/register` - New user registration
- `/login` - User login
- `/about` - About FANOS AI
- `/contact` - Contact page
- `/intelligence` - AI Intelligence showcase
- `/request-service` - Service request form

### Protected Routes
- `/dashboard` - Main SOC dashboard (requires login)
- All other dashboard routes require authentication

## User Roles

### 1. Admin
**Pre-configured Admin Account:**
- Username: `FanosAi`
- Password: `Fanos4561644@`
- Full Name: FANOS AI Administrator
- Email: admin@fanos.ai
- Role: admin
- Access: Full platform access

### 2. Customer
- Created through registration
- Default role: customer
- Access: Limited dashboard features

## Registration Process

### Step 1: Fill Registration Form
Required fields:
- Full Name (required)
- Username (required, min 3 characters)
- Email (required, valid email format)
- Password (required, min 8 characters)
- Confirm Password (must match password)
- Terms agreement (required checkbox)

Optional fields:
- Phone Number
- Organization

### Step 2: Submit & Validation
The system validates:
- ✓ All required fields filled
- ✓ Email format is valid
- ✓ Username is at least 3 characters
- ✓ Password is at least 8 characters
- ✓ Passwords match
- ✓ Terms checkbox is checked
- ✓ Username doesn't already exist
- ✓ Email isn't already registered

### Step 3: Success & Redirect
- Success message displayed
- Automatic redirect to login page after 2 seconds
- Success notification shown on login page

## Login Process

### Step 1: Enter Credentials
- Username or email
- Password
- Optional: Remember me checkbox

### Step 2: Authentication
Backend validates:
- Username exists in database
- Password matches hashed password
- Account is active

### Step 3: Token & Redirect
On successful login:
- JWT access token generated
- Token stored in localStorage
- User info stored (role, name)
- Redirect to `/dashboard`

## Security Features

### Password Security
- Minimum 8 characters required
- Stored as bcrypt hash (not plain text)
- Confirmation required during registration

### Token Management
- JWT tokens with expiration
- Stored in localStorage
- Included in API requests via Authorization header
- Default expiration: 30 minutes

### Access Control
- Protected routes check for valid token
- Role-based permissions
- Admin has full access
- Customers have limited access

## API Endpoints

### POST `/api/v1/auth/register`
Register a new user.

**Request Body:**
```json
{
  "full_name": "John Doe",
  "username": "johndoe",
  "email": "john@company.com",
  "password": "SecurePass123",
  "phone": "+251 912 345 678",
  "organization": "Company Inc",
  "role": "customer"
}
```

**Response (201):**
```json
{
  "username": "johndoe",
  "full_name": "John Doe",
  "email": "john@company.com",
  "role": "customer"
}
```

**Error Responses:**
- 400: Username already exists
- 400: Email already registered
- 422: Validation error

### POST `/api/v1/auth/login`
Authenticate user and get access token.

**Request Body:**
```json
{
  "username": "FanosAi",
  "password": "Fanos4561644@"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "username": "FanosAi",
    "full_name": "FANOS AI Administrator",
    "email": "admin@fanos.ai",
    "role": "admin"
  }
}
```

**Error Response (401):**
```json
{
  "detail": "Invalid username or password"
}
```

### GET `/api/v1/auth/me`
Get current user information (requires valid token).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "username": "johndoe",
  "full_name": "John Doe",
  "email": "john@company.com",
  "role": "customer"
}
```

## Frontend Components

### RegisterPage.tsx
- Located: `frontend/src/pages/RegisterPage.tsx`
- Features:
  - Two-column responsive form
  - Real-time validation
  - Loading states
  - Success animation
  - Error handling
  - Terms & conditions checkbox
  - Link to login page

### LoginPage.tsx
- Located: `frontend/src/pages/LoginPage.tsx`
- Features:
  - Clean single-column form
  - Remember me checkbox
  - Forgot password link
  - Admin credentials display (for demo)
  - Success message from registration
  - Loading states
  - Error handling
  - Link to registration

## Backend Implementation

### Location
`backend/app/api/v1/auth.py`

### Current Storage
Users are stored in-memory dictionary `_USERS` for demo purposes.

### Pre-configured Users
1. **FanosAi** (Admin)
2. **mulugeta.ababi** (Admin)
3. **soc.analyst** (Analyst)

### Production Migration
To migrate to database storage:

1. **Create User Model** (already exists in `backend/app/models/security.py`)
2. **Update auth.py** to use database queries instead of `_USERS` dictionary
3. **Add user CRUD operations**
4. **Implement proper JWT validation middleware**
5. **Add password reset functionality**

Example database query (future):
```python
from app.models.security import User

@router.post("/register")
async def register(body: RegisterRequest, db: Session = Depends(get_db)):
    # Check if username exists
    existing_user = db.query(User).filter(User.username == body.username).first()
    if existing_user:
        raise HTTPException(400, "Username already exists")
    
    # Create new user
    new_user = User(
        username=body.username,
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=body.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user
```

## Testing the System

### Test Admin Login
1. Navigate to `http://localhost:5173/login`
2. Enter username: `FanosAi`
3. Enter password: `Fanos4561644@`
4. Click "Sign In"
5. Should redirect to `/dashboard`

### Test Registration
1. Navigate to `http://localhost:5173/register`
2. Fill all required fields:
   - Full Name: Test User
   - Username: testuser
   - Email: test@example.com
   - Password: TestPass123
   - Confirm Password: TestPass123
   - Check terms checkbox
3. Click "Create Account"
4. Should show success message
5. Should redirect to login page
6. Login with new credentials

### Test Validation
Try these to see validation in action:
- Submit empty form → "Full name is required"
- Username < 3 chars → "Username must be at least 3 characters"
- Invalid email → "Valid email is required"
- Password < 8 chars → "Password must be at least 8 characters"
- Mismatched passwords → "Passwords do not match"
- Unchecked terms → "You must agree to the terms and conditions"
- Existing username → "Username already exists"

## Next Steps

### Immediate (Demo Ready)
- ✅ Registration page
- ✅ Login page
- ✅ Admin account
- ✅ JWT tokens
- ✅ Role-based access

### Short Term (Production Prep)
- [ ] Connect to PostgreSQL database
- [ ] Password reset via email
- [ ] Email verification
- [ ] Two-factor authentication (MFA)
- [ ] Session management
- [ ] Login history tracking

### Long Term (Enterprise Features)
- [ ] SSO integration (OAuth, SAML)
- [ ] LDAP/Active Directory integration
- [ ] Audit logging for all auth events
- [ ] Password policy enforcement
- [ ] Account lockout after failed attempts
- [ ] IP whitelisting for admin accounts

## Troubleshooting

### Login Returns 401
- Check username and password are correct
- Verify backend is running on port 8000
- Check browser console for CORS errors

### Registration Fails
- Verify all required fields are filled
- Check password meets minimum requirements
- Ensure username/email aren't already taken

### Token Not Persisting
- Check localStorage in browser DevTools
- Verify token is being stored after login
- Check for JavaScript errors in console

### Can't Access Dashboard
- Verify token exists in localStorage
- Check token hasn't expired
- Try logging out and back in

## Development URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Landing Page**: http://localhost:5173/home
- **Registration**: http://localhost:5173/register
- **Login**: http://localhost:5173/login
- **Dashboard**: http://localhost:5173/dashboard

## Support

For authentication-related issues:
1. Check browser console for errors
2. Verify backend is running
3. Check API response in Network tab
4. Review backend logs
5. Contact: security@fanos.ai
