import { NextFunction, Request, Response } from "express";
import {
  AppRole,
  CAPABILITY_TO_ROLES,
  RbacCapability,
} from "../constants/roles";
import { getEffectiveOrganizationRole } from "../utils/organization";

const getRequestRole = (req: Request): AppRole | undefined => {
  return getEffectiveOrganizationRole(req.user);
};

export const canRoleAccess = (
  role: AppRole | undefined,
  capability: RbacCapability,
): boolean => {
  if (!role) return false;
  return CAPABILITY_TO_ROLES[capability].includes(role);
};

export const requireCapability = (capability: RbacCapability) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = getRequestRole(req);

    if (!role) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!canRoleAccess(role, capability)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
};
