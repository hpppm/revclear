import { Router } from 'express';
import { getSecurityStats } from '../../middleware/securityMonitor';
import { authMiddleware, requireRole } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/security/stats
 * Returns security monitoring statistics
 * @access Private - requires authentication + admin role
 */
router.get('/stats', authMiddleware, requireRole(['admin']), (req, res) => {
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