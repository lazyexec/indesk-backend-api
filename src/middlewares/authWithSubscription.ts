import { Request, Response, NextFunction } from "express";
import auth from "./auth";
import { requireActiveSubscription } from "./featureGate";

/**
 * Combined middleware that checks authentication and active subscription
 * Subscription only restricts the number of clients that can be added
 */
const authWithActiveSubscription = (...permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // First run authentication and permission checks
      const authMiddleware = auth(...permissions);
      
      await new Promise<void>((resolve, reject) => {
        authMiddleware(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Then check if subscription is active
      await new Promise<void>((resolve, reject) => {
        requireActiveSubscription(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

export {
  authWithActiveSubscription,
};

export default authWithActiveSubscription;