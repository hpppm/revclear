/**
 * Authentication Middleware for RevClear Backend
 * 
 * Provides:
 * 1. Firebase ID Token verification (SSO users)
 * 2. bcrypt password hashing for admin/internal accounts
 * 3. Audit logging for all authentication events
 */

import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebaseAdmin';
import bcrypt from 'bcrypt';
import { logAuditEvent } from './audit';

// bcrypt configuration (HIPAA requirement: strong password hashing)
const BCRYPT_SALT_ROUNDS = 12;  // 12 rounds = ~300ms per hash (secure + performant)

/**
 * Firebase Token Authentication (for SSO users)
 * 
 * Used for: Clinicians, admins accessing via web app
 */
export const verifyFirebaseToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    await logAuditEvent({
      user_id: 'anonymous',
      action: 'AUTH_FAILED',
      resource_type: 'api_request',
      resource_id: req.path,
      metadata: { reason: 'no_token_provided', ip: req.ip }
    });
    
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    (req as any).user = decodedToken;
    
    // Log successful authentication
    await logAuditEvent({
      user_id: decodedToken.uid,
      action: 'AUTH_SUCCESS',
      resource_type: 'api_request',
      resource_id: req.path,
      metadata: { 
        email: decodedToken.email,
        auth_method: 'firebase_token',
        ip: req.ip
      }
    });
    
    next();
  } catch (error: any) {
    await logAuditEvent({
      user_id: 'anonymous',
      action: 'AUTH_FAILED',
      resource_type: 'api_request',
      resource_id: req.path,
      metadata: { 
        reason: 'invalid_token',
        error: error.message,
        ip: req.ip
      }
    });
    
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Alias for backward compatibility
export const authMiddleware = verifyFirebaseToken;

/**
 * Admin Password Authentication (for internal/service accounts)
 * 
 * Used for: Database admins, support staff, automated scripts
 * Passwords are hashed with bcrypt (12 rounds) before storage
 */
export interface AdminAccount {
  id: string;
  username: string;
  password_hash: string;  // bcrypt hash
  role: 'super_admin' | 'support' | 'readonly';
  created_at: Date;
  last_login?: Date;
  mfa_enabled: boolean;
}

/**
 * Hash a plaintext password using bcrypt
 * 
 * @param plainPassword - User's password in plaintext
 * @returns bcrypt hash (60 characters)
 * 
 * Example:
 * const hash = await hashPassword('SecureP@ssw0rd!');
 * // Returns: $2b$12$KIX... (60 chars)
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  // Validate password strength before hashing
  if (plainPassword.length < 12) {
    throw new Error('Password must be at least 12 characters');
  }
  
  const hasUpperCase = /[A-Z]/.test(plainPassword);
  const hasLowerCase = /[a-z]/.test(plainPassword);
  const hasNumbers = /\d/.test(plainPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(plainPassword);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    throw new Error('Password must contain uppercase, lowercase, numbers, and special characters');
  }
  
  // Generate salt and hash
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  const hash = await bcrypt.hash(plainPassword, salt);
  
  return hash;
}

/**
 * Verify a plaintext password against a bcrypt hash
 * 
 * @param plainPassword - User-supplied password
 * @param hash - bcrypt hash from database
 * @returns true if password matches, false otherwise
 * 
 * Example:
 * const isValid = await verifyPassword('SecureP@ssw0rd!', storedHash);
 * if (isValid) { // grant access }
 */
export async function verifyPassword(
  plainPassword: string,
  hash: string
): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(plainPassword, hash);
    return isMatch;
  } catch (error) {
    // Timing attack mitigation: always take the same time even on error
    await bcrypt.compare('dummy', '$2b$12$KIXwww...');
    return false;
  }
}

/**
 * Admin Basic Auth Middleware (username/password)
 * 
 * Used for internal tools and scripts that can't use Firebase
 * 
 * Usage:
 * router.post('/admin/reports', verifyAdminCredentials, async (req, res) => {
 *   // Only accessible with valid admin username/password
 * });
 */
export const verifyAdminCredentials = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ 
      error: 'Basic authentication required',
      hint: 'Authorization: Basic base64(username:password)'
    });
  }

  try {
    // Decode Base64 credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (!username || !password) {
      throw new Error('Invalid credentials format');
    }

    // Look up admin account in database
    // (In production, query Cloud SQL for admin_accounts table)
    const adminAccount = await getAdminAccount(username);
    
    if (!adminAccount) {
      await logAuditEvent({
        user_id: username,
        action: 'ADMIN_AUTH_FAILED',
        resource_type: 'admin_api',
        resource_id: req.path,
        metadata: { reason: 'account_not_found', ip: req.ip }
      });
      
      // Timing attack mitigation: hash even if user doesn't exist
      await bcrypt.compare(password, '$2b$12$KIXwww...');
      
      return res.status(403).json({ error: 'Invalid credentials' });
    }

    // Verify password against bcrypt hash
    const isValid = await verifyPassword(password, adminAccount.password_hash);
    
    if (!isValid) {
      await logAuditEvent({
        user_id: adminAccount.id,
        action: 'ADMIN_AUTH_FAILED',
        resource_type: 'admin_api',
        resource_id: req.path,
        metadata: { 
          username: adminAccount.username,
          reason: 'invalid_password',
          ip: req.ip
        }
      });
      
      return res.status(403).json({ error: 'Invalid credentials' });
    }

    // TODO: Check if MFA is required and validate MFA token

    // Authentication successful
    (req as any).admin = adminAccount;
    
    await logAuditEvent({
      user_id: adminAccount.id,
      action: 'ADMIN_AUTH_SUCCESS',
      resource_type: 'admin_api',
      resource_id: req.path,
      metadata: { 
        username: adminAccount.username,
        role: adminAccount.role,
        ip: req.ip
      }
    });

    // Update last_login timestamp
    await updateAdminLastLogin(adminAccount.id);

    next();
  } catch (error: any) {
    await logAuditEvent({
      user_id: 'anonymous',
      action: 'ADMIN_AUTH_ERROR',
      resource_type: 'admin_api',
      resource_id: req.path,
      metadata: { error: error.message, ip: req.ip }
    });
    
    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Get admin account from database
 * 
 * In production, query Cloud SQL:
 * SELECT id, username, password_hash, role, mfa_enabled 
 * FROM admin_accounts 
 * WHERE username = $1 AND active = true
 */
async function getAdminAccount(username: string): Promise<AdminAccount | null> {
  // TODO: Implement Cloud SQL query
  // For now, return null (no admin accounts configured yet)
  return null;
}

/**
 * Update admin last_login timestamp
 */
async function updateAdminLastLogin(adminId: string): Promise<void> {
  // TODO: UPDATE admin_accounts SET last_login = NOW() WHERE id = $1
}

/**
 * Role-based Authorization Middleware
 * 
 * Usage:
 * router.delete('/patients/:id', requireRole('super_admin'), async (req, res) => {
 *   // Only super_admins can delete patients
 * });
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const admin = (req as any).admin;
    
    const userRole = user?.role || admin?.role;
    
    if (!userRole) {
      return res.status(403).json({ error: 'No role assigned to user' });
    }
    
    if (!allowedRoles.includes(userRole)) {
      logAuditEvent({
        user_id: user?.uid || admin?.id || 'unknown',
        action: 'AUTHORIZATION_DENIED',
        resource_type: 'api_request',
        resource_id: req.path,
        metadata: { 
          required_roles: allowedRoles,
          actual_role: userRole
        }
      });
      
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required_roles: allowedRoles,
        your_role: userRole
      });
    }
    
    next();
  };
}
