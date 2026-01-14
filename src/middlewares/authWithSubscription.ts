import { Request, Response, NextFunction } from "express";
import auth from "./auth";
import { checkFeatureAccess, requireActiveSubscription } from "./featureGate";

interface AuthWithSubscriptionOptions {
  permissions?: string[];
  feature?: string;
  requireActive?: boolean;
}

/**
 * Combined middleware that checks both authentication/permissions and subscription features
 * This is more efficient than chaining multiple middlewares
 */
const authWithSubscription = (options: AuthWithSubscriptionOptions = {}) => {
  const { permissions = [], feature, requireActive = false } = options;

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

      // Then run subscription checks if needed
      if (requireActive || feature) {
        if (feature) {
          // Check specific feature access
          const featureMiddleware = checkFeatureAccess(feature);
          await new Promise<void>((resolve, reject) => {
            featureMiddleware(req, res, (err?: any) => {
              if (err) reject(err);
              else resolve();
            });
          });
        } else if (requireActive) {
          // Just check if subscription is active
          await new Promise<void>((resolve, reject) => {
            requireActiveSubscription(req, res, (err?: any) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Convenience functions for common combinations
const authWithIntegrations = (...permissions: string[]) => 
  authWithSubscription({ permissions, feature: 'integrations' });

const authWithAdvancedReporting = (...permissions: string[]) => 
  authWithSubscription({ permissions, feature: 'advanced_reporting' });

const authWithActiveSubscription = (...permissions: string[]) => 
  authWithSubscription({ permissions, requireActive: true });

export {
  authWithSubscription,
  authWithIntegrations,
  authWithAdvancedReporting,
  authWithActiveSubscription,
};

export default authWithSubscription;