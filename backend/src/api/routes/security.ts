import { Router } from 'express';
import { getSecurityStats } from '../../middleware/securityMonitor';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// Helper to check if user is admin
const isAdmin = (user: any): boolean => {
  return user?.role === 'admin';
};

/**
 * GET /api/security/stats
 * Returns security monitoring statistics
 * @access Private - requires authentication + admin role
 */
router.get('/stats', authMiddleware, (req, res) => {
  // Admin check
  if (!isAdmin(req.user)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const stats = getSecurityStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security statistics'
    });
  }
});

export default router;