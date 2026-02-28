import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@agenticmedia/shared-types';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 40,
  talent_manager: 30,
  data_analyst: 20,
  client_readonly: 10,
};

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole,
      });
      return;
    }

    next();
  };
}

export function authorizeMinRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role as UserRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: 'Insufficient permissions',
        requiredMinimum: minRole,
        current: req.user.role,
      });
      return;
    }

    next();
  };
}
