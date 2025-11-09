# Authentication System Implementation Plan

## Current Issue
The application uses a placeholder authentication system with hardcoded user ID "system_user" in `UserManagement.tsx:42-54`.

## Recommended Solution

### Phase 1: Local Authentication (2-3 days)
Implement user authentication within the Tauri app without external dependencies.

**Implementation:**

```rust
// packages/core-rs/src/auth.rs
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{SaltString, rand_core::OsRng};

pub struct AuthService {
    conn: Arc<Mutex<Connection>>,
}

impl AuthService {
    pub fn create_user(&self, username: &str, email: &str, password: &str) -> Result<User, AuthError> {
        // Hash password with Argon2id
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2.hash_password(password.as_bytes(), &salt)?
            .to_string();
        
        let user_id = Ulid::new().to_string();
        
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO users (id, username, email, password_hash, created_at) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![user_id, username, email, password_hash, chrono::Utc::now().timestamp()]
        )?;
        
        Ok(User { id: user_id, username, email })
    }
    
    pub fn authenticate(&self, username: &str, password: &str) -> Result<Session, AuthError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, password_hash FROM users WHERE username = ?1")?;
        
        let user_data = stmt.query_row(params![username], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        
        let (user_id, stored_hash) = user_data;
        
        // Verify password
        let parsed_hash = PasswordHash::new(&stored_hash)?;
        Argon2::default().verify_password(password.as_bytes(), &parsed_hash)?;
        
        // Create session
        let session_id = Ulid::new().to_string();
        let session_token = generate_session_token(); // 64-char secure token
        let expires_at = chrono::Utc::now() + chrono::Duration::hours(24);
        
        conn.execute(
            "INSERT INTO sessions (id, user_id, token, expires_at, created_at) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![session_id, user_id, session_token, expires_at.timestamp(), 
                    chrono::Utc::now().timestamp()]
        )?;
        
        Ok(Session { id: session_id, user_id, token: session_token, expires_at })
    }
    
    pub fn validate_session(&self, token: &str) -> Result<String, AuthError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT user_id, expires_at FROM sessions 
             WHERE token = ?1 AND expires_at > ?2"
        )?;
        
        let now = chrono::Utc::now().timestamp();
        let user_id = stmt.query_row(params![token, now], |row| {
            row.get::<_, String>(0)
        })?;
        
        Ok(user_id)
    }
    
    pub fn logout(&self, token: &str) -> Result<(), AuthError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM sessions WHERE token = ?1", params![token])?;
        Ok(())
    }
}
```

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    last_login_at INTEGER
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

**Frontend Integration:**
```typescript
// apps/desktop/src/services/auth.ts
import { invoke } from '@tauri-apps/api/core';

interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: number;
}

class AuthService {
  private session: Session | null = null;
  
  async login(username: string, password: string): Promise<Session> {
    this.session = await invoke<Session>('authenticate_user', { username, password });
    localStorage.setItem('session_token', this.session.token);
    return this.session;
  }
  
  async validateSession(): Promise<string | null> {
    const token = localStorage.getItem('session_token');
    if (!token) return null;
    
    try {
      const userId = await invoke<string>('validate_session', { token });
      return userId;
    } catch {
      localStorage.removeItem('session_token');
      return null;
    }
  }
  
  async logout(): Promise<void> {
    const token = localStorage.getItem('session_token');
    if (token) {
      await invoke('logout_user', { token });
      localStorage.removeItem('session_token');
    }
    this.session = null;
  }
  
  getCurrentUserId(): string | null {
    return this.session?.user_id || null;
  }
}

export const authService = new AuthService();
```

**Replace Placeholder:**
```typescript
// apps/desktop/src/components/UserManagement.tsx
import { authService } from '@/services/auth';

function getCurrentUserId(): string {
  const userId = authService.getCurrentUserId();
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return userId;
}
```

### Phase 2: Multi-User Support (1-2 days)
- Add user profile management
- Implement role-based access control (already partially done)
- Add user switching capability
- Implement user-specific vault encryption keys

### Phase 3: Optional OAuth Integration (3-5 days)
If you want to support OAuth providers:

```rust
// Use oauth2 crate
use oauth2::{
    AuthorizationCode, AuthUrl, ClientId, ClientSecret, CsrfToken,
    RedirectUrl, TokenResponse, TokenUrl
};

pub async fn github_oauth_url(&self) -> Result<(String, CsrfToken), AuthError> {
    let client = BasicClient::new(
        ClientId::new(self.config.github_client_id.clone()),
        Some(ClientSecret::new(self.config.github_client_secret.clone())),
        AuthUrl::new("https://github.com/login/oauth/authorize".to_string())?,
        Some(TokenUrl::new("https://github.com/login/oauth/access_token".to_string())?)
    ).set_redirect_uri(RedirectUrl::new("http://localhost:3000/auth/callback".to_string())?);
    
    let (auth_url, csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("read:user".to_string()))
        .url();
    
    Ok((auth_url.to_string(), csrf_token))
}
```

## Implementation Priorities

1. **Immediate (Week 1)**: Implement Phase 1 (local auth)
2. **Short-term (Week 2)**: Add multi-user support
3. **Optional**: OAuth integration if needed

## Testing Requirements

```rust
#[cfg(test)]
mod auth_tests {
    #[test]
    fn test_user_registration() {
        // Test user creation with valid credentials
    }
    
    #[test]
    fn test_password_hashing() {
        // Verify Argon2id hashing
    }
    
    #[test]
    fn test_authentication_success() {
        // Test successful login
    }
    
    #[test]
    fn test_authentication_failure() {
        // Test invalid credentials
    }
    
    #[test]
    fn test_session_validation() {
        // Test token validation
    }
    
    #[test]
    fn test_session_expiration() {
        // Test expired tokens are rejected
    }
    
    #[test]
    fn test_logout() {
        // Test session cleanup
    }
}
```

## Security Considerations

✅ **Already Implemented:**
- Argon2id for password hashing
- Cryptographically secure token generation
- Session expiration

⚠️ **Must Implement:**
- Rate limiting on login attempts
- Account lockout after failed attempts
- Password strength requirements
- Secure session token storage
- CSRF protection for OAuth flows

## Migration Path

1. Add auth tables to database schema
2. Create initial admin user on first run
3. Migrate existing data to default user
4. Update all components using `getCurrentUserId()`
5. Add login/logout UI
6. Test thoroughly before deployment

## Estimated Effort
- **Development**: 5-7 days
- **Testing**: 2-3 days
- **Documentation**: 1 day
- **Total**: ~2 weeks for complete implementation
