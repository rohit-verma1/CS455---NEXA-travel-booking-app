# Authentication API Documentation


## API Endpoints

### 1. **Register** - `POST /register/`
Create a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "user_type": "customer"  // Optional: customer/provider/admin
}
```

**Success Response (200):**
```json
{
  "message": "User registered. Verify OTP sent to email.",
  "email": "john@example.com"
}
```

**Error Responses:**
- `400` - Missing required fields
- `400` - Username already exists
- `400` - Email already exists
- `400` - Password must be at least 8 characters

---

### 2. **Verify OTP** - `POST /verify-otp/`
Verify OTP sent to email after registration or password reset.

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "message": "OTP verified successfully",
  "email": "john@example.com"
}
```

**Error Responses:**
- `400` - Invalid OTP
- `400` - OTP expired
- `404` - User not found

---

### 3. **Resend OTP** - `POST /resend-otp/`
Request a new OTP.

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp_type": "registration"  // or "password_reset"
}
```

**Success Response (200):**
```json
{
  "message": "New OTP sent to email"
}
```

---

### 4. **Login** - `POST /login/`
Authenticate user and receive session token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Success Response (200):**
```json
{
  "token": "abc123xyz789...",
  "user_type": "customer",
  "username": "johndoe",
  "email": "john@example.com"
}
```

**Error Responses:**
- `401` - Invalid credentials
- `401` - User not verified

---

### 5. **Logout** - `POST /logout/`
Logout from current session.

**Request Body:**
```json
{
  "token": "abc123xyz789..."
}
```

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### 6. **Logout All Sessions** - `POST /logout-all/`
Logout from all active sessions.

**Request Body:**
```json
{
  "token": "abc123xyz789..."
}
```

**Success Response (200):**
```json
{
  "message": "All sessions logged out successfully",
  "sessions_closed": 3
}
```

---

### 7. **Forgot Password** - `POST /forgot-password/`
Request password reset OTP.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "Password reset OTP sent to email"
}
```

---

### 8. **Reset Password** - `POST /reset-password/`
Reset password using OTP.

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "new_password": "NewSecurePass456"
}
```

**Success Response (200):**
```json
{
  "message": "Password reset successfully. Please login again."
}
```

**Error Responses:**
- `400` - Invalid OTP
- `400` - OTP expired
- `400` - Password must be at least 8 characters

---

### 9. **Change Password** - `POST /change-password/`
Change password for authenticated user.

**Request Body:**
```json
{
  "token": "abc123xyz789...",
  "old_password": "SecurePass123",
  "new_password": "NewSecurePass456"
}
```

**Success Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `401` - Invalid or expired token
- `401` - Old password incorrect
- `400` - New password must be different from old password

---

### 10. **Check Username** - `POST /check-username/`
Check if username is available.

**Request Body:**
```json
{
  "username": "johndoe"
}
```

**Success Response (200):**
```json
{
  "exists": true,
  "available": false
}
```

---

### 11. **Check Email** - `POST /check-email/`
Check if email is registered.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**
```json
{
  "exists": true,
  "available": false
}
```

---

### 12. **Verify Token** - `POST /verify-token/`
Validate session token and get user info.

**Request Body:**
```json
{
  "token": "abc123xyz789..."
}
```

**Success Response (200):**
```json
{
  "valid": true,
  "user": {
    "username": "johndoe",
    "email": "john@example.com",
    "user_type": "customer",
    "is_verified": true
  }
}
```

**Error Response (401):**
```json
{
  "valid": false,
  "error": "Invalid or expired token"
}
```

---

### 13. **Active Sessions** - `POST /active-sessions/`
Get list of all active sessions.

**Request Body:**
```json
{
  "token": "abc123xyz789..."
}
```

**Success Response (200):**
```json
{
  "active_sessions": [
    {
      "session_token": "abc123xyz7...",
      "is_current": true,
      "created_at": "2025-10-09T10:30:00Z",
      "expires_at": "2025-10-16T10:30:00Z"
    },
    {
      "session_token": "def456uvw1...",
      "is_current": false,
      "created_at": "2025-10-08T15:20:00Z",
      "expires_at": "2025-10-15T15:20:00Z"
    }
  ],
  "total_count": 2
}
```

---

### 14. **Delete Session** - `POST /delete-session/`
Delete a specific session.

**Request Body:**
```json
{
  "token": "abc123xyz789...",
  "session_token": "def456uvw123..."
}
```

**Success Response (200):**
```json
{
  "message": "Session deleted successfully"
}
```

**Error Response (404):**
```json
{
  "error": "Session not found"
}
```

---

### 15. **Get Profile** - `POST /profile/`
Get user profile information.

**Request Body:**
```json
{
  "token": "abc123xyz789..."
}
```

**Success Response (200):**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "user_type": "customer",
  "is_verified": true,
  "date_joined": "2025-10-01T08:00:00Z"
}
```

---

### 16. **Update Profile** - `POST /update-profile/`
Update user profile (username and/or email).

**Request Body:**
```json
{
  "token": "abc123xyz789...",
  "username": "john_updated",
  "email": "john.new@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "Profile updated. Please verify your new email.",
  "username": "john_updated",
  "email": "john.new@example.com",
  "verification_required": true
}
```

**Note:** Changing email requires re-verification.

---

## Authentication Flow Examples

### Complete Registration Flow
```
1. POST /register/
   → Receive success message with email

2. Check email for OTP (printed in console for development)

3. POST /verify-otp/
   → User is now verified

4. POST /login/
   → Receive token

5. Use token for authenticated requests
```

### Password Reset Flow
```
1. POST /forgot-password/
   → OTP sent to email

2. POST /reset-password/
   → Password reset, all sessions invalidated

3. POST /login/
   → Login with new password
```

### Session Management Flow
```
1. POST /active-sessions/
   → View all active sessions

2. POST /delete-session/
   → Delete specific session

3. POST /logout-all/
   → Logout from all devices
```

---

## Error Codes Summary

| Code | Description |
|------|-------------|
| 200  | Success |
| 400  | Bad Request (validation errors, missing fields) |
| 401  | Unauthorized (invalid credentials, expired token) |
| 404  | Not Found (user/session not found) |

---

## Security Features

1. **OTP Expiration**: All OTPs expire after 10 minutes
2. **Token Expiration**: Session tokens expire after 7 days
3. **Password Strength**: Minimum 8 characters required
4. **Session Invalidation**: Password changes invalidate other sessions
5. **OTP Reuse Prevention**: Used OTPs cannot be reused
6. **Privacy Protection**: Forgot password doesn't reveal if email exists

---

## Development Notes

### OTP Delivery
This happens through the mail client taht can be configured in `settings.py`


### Token Storage (Client Side)
```javascript
// Store token securely
localStorage.setItem('auth_token', response.data.token);

// Include token in requests
headers: {
  'Authorization': `Token/Bearer ${localStorage.getItem('auth_token')}`
}

// Remove on logout
localStorage.removeItem('auth_token');
```

---

## Testing the APIs

### Using cURL

**Register:**
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123",
    "user_type": "customer"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

**Verify Token:**
```bash
curl -X POST http://localhost:8000/api/auth/verify-token/ \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your_token_here"
  }'
```

### Using Python Requests

```python
import requests

BASE_URL = "http://localhost:8000/api/auth"

# Register
register_data = {
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123"
}
response = requests.post(f"{BASE_URL}/register/", json=register_data)
print(response.json())

# Verify OTP
otp_data = {
    "email": "test@example.com",
    "otp": "123456"  # From console output
}
response = requests.post(f"{BASE_URL}/verify-otp/", json=otp_data)
print(response.json())

# Login
login_data = {
    "email": "test@example.com",
    "password": "TestPass123"
}
response = requests.post(f"{BASE_URL}/login/", json=login_data)
token = response.json()['token']
print(f"Token: {token}")

# Get Profile
profile_data = {"token": token}
response = requests.post(f"{BASE_URL}/profile/", json=profile_data)
print(response.json())
```

### Using JavaScript/Fetch

```javascript
const BASE_URL = 'http://localhost:8000/api/auth';

// Register
async function register() {
  const response = await fetch(`${BASE_URL}/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPass123'
    })
  });
  const data = await response.json();
  console.log(data);
}

// Login
async function login() {
  const response = await fetch(`${BASE_URL}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'TestPass123'
    })
  });
  const data = await response.json();
  localStorage.setItem('auth_token', data.token);
  return data;
}

// Verify Token
async function verifyToken() {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${BASE_URL}/verify-token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  const data = await response.json();
  console.log(data);
}
```

---

## Running Tests

```bash
# Run all tests
python manage.py test your_app_name.tests

# Run specific test class
python manage.py test your_app_name.tests.RegistrationTests

# Run specific test method
python manage.py test your_app_name.tests.RegistrationTests.test_successful_registration

# Run with verbose output
python manage.py test your_app_name.tests -v 2

# Run with coverage
coverage run --source='.' manage.py test your_app_name.tests
coverage report
coverage html
```

---

## Best Practices

### Client-Side Implementation

1. **Token Management**
   - Store token securely (localStorage/sessionStorage)
   - Include token in all authenticated requests
   - Clear token on logout
   - Verify token on app initialization

2. **Error Handling**
   ```javascript
   try {
     const response = await fetch(url, options);
     if (!response.ok) {
       const error = await response.json();
       // Handle specific errors
       if (response.status === 401) {
         // Token expired, redirect to login
       }
     }
     return await response.json();
   } catch (error) {
     // Handle network errors
   }
   ```

3. **Password Validation**
   - Validate password strength on client side
   - Show password requirements
   - Confirm password match

4. **OTP Input**
   - Auto-focus OTP input
   - Resend OTP option with cooldown
   - Clear error messages

### Backend Enhancement Ideas

1. **Rate Limiting**: Prevent brute force attacks
2. **Email Service**: Integrate real email provider
3. **2FA**: Add two-factor authentication option
4. **OAuth**: Support Google/Facebook login
5. **Refresh Tokens**: Implement token refresh mechanism
6. **Logging**: Add comprehensive logging
7. **Metrics**: Track login attempts, failed logins
8. **Account Lockout**: Lock after multiple failed attempts

---

## Troubleshooting

### Common Issues

**Issue: "Invalid or expired token"**
- Solution: Token may have expired (7 days). Login again to get new token.

**Issue: "User not verified"**
- Solution: Complete OTP verification after registration.

**Issue: "OTP expired"**
- Solution: Request new OTP using `/resend-otp/` endpoint.

**Issue: "Session not found"**
- Solution: Session may have been deleted or expired. Login again.

### Debug Mode

Enable Django debug mode to see detailed error messages:
```python
# settings.py
DEBUG = True
```

Check console output for OTP codes during development.

---

## Production Checklist

- [ ] Set `DEBUG = False` in settings
- [ ] Use environment variables for secrets
- [ ] Integrate real email service
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Set up proper logging
- [ ] Configure CORS properly
- [ ] Use secure session tokens
- [ ] Implement token refresh
- [ ] Add monitoring and alerts
- [ ] Regular security audits
- [ ] Database backups