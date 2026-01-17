/**
 * Default Clinic Permissions
 * These permissions control what clinic members (clinicians) can access
 * SuperAdmins and Admins get all permissions by default
 * Regular clinicians get permissions based on these settings
 */

export default {
  clinician_dashboard: true,
  clinician_permissions: false,
  clinician_ai: true,
  clinician_clients: true,
  clinician_clinicians: true,
  clinician_invoices: true,
  clinician_sessions: true,
  clinician_forms: true,
  clinician_money: true,
  clinician_subscription: false,
  clinician_integrations: false,
};

/**
 * Permission Descriptions:
 * 
 * ENABLED BY DEFAULT (true):
 * - Dashboard: View dashboard and overview
 * - AI Assistance: Access AI-powered features
 * - Clients: Manage clients and appointments
 * - Clinic & Clinicians: View team members
 * - Invoices: View and manage invoices
 * - Sessions: Create and manage session types
 * - Forms: Create and manage assessment forms
 * - Money Matters: View financial reports
 * 
 * DISABLED BY DEFAULT (false - Admin only):
 * - Roles & Permissions: Modify team member permissions
 * - Subscription: Manage clinic subscription
 * - Integration: Manage integrations (Google Calendar, Stripe, etc.)
 * 
 * ROLE OVERRIDES:
 * - superAdmin: Gets ALL permissions automatically
 * - admin: Gets ALL permissions automatically
 * - clinician: Gets permissions based on these settings
 */

