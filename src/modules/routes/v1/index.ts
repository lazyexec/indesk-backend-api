import express, { Router } from "express";
import authRouter from "../../auth/auth.route";
import userRouter from "../../user/user.route";
import settingsRouter from "../../settings/settings.route";
import clinicRouter from "../../clinic/clinic.route";
import plansRouter from "../../plans/plans.route";
import clinicMemberRouter from "../../clinicMember/clinicMember.route";
import sessionRouter from "../../session/session.route";
import integrationRouter from "../../integration/integration.route";
import clientRouter from "../../client/client.route";
import appointmentRouter from "../../appointment/appointment.route";
import stripeRouter from "../../stripe/stripe.route";
import providerRouter from "../../provider/provider.route";
import assessmentRouter from "../../assessment/assessment.route";
import invoiceRouter from "../../invoice/invoice.route";
import subscriptionRouter from "../../subscription/subscription.routes";
import reportRouter from "../../report/report.routes";
import analyticsRouter from "../../analytics/analytics.routes";
import dashboardRouter from "../../dashboard/dashboard.route";
import issueRouter from "../../issue/issue.route";

const mainRouter: Router = express.Router();

interface routeObjects {
  path: string;
  route: Router;
}

const routes: routeObjects[] = [
  {
    path: "/auth",
    route: authRouter,
  },
  {
    path: "/user",
    route: userRouter,
  },
  {
    path: "/setting",
    route: settingsRouter,
  },
  {
    path: "/clinic",
    route: clinicRouter,
  },
  {
    path: "/plans",
    route: plansRouter,
  },
  {
    path: "/clinic-member",
    route: clinicMemberRouter,
  },
  {
    path: "/session",
    route: sessionRouter,
  },
  {
    path: "/integration",
    route: integrationRouter,
  },
  {
    path: "/client",
    route: clientRouter,
  },
  {
    path: "/appointment",
    route: appointmentRouter,
  },
  {
    path: "/stripe",
    route: stripeRouter,
  },
  {
    path: "/provider",
    route: providerRouter,
  },
  {
    path: "/assessment",
    route: assessmentRouter,
  },
  {
    path: "/invoice",
    route: invoiceRouter,
  },
  {
    path: "/subscription",
    route: subscriptionRouter,
  },
  {
    path: "/report",
    route: reportRouter,
  },
  {
    path: "/analytics",
    route: analyticsRouter,
  },
  {
    path: "/dashboard",
    route: dashboardRouter,
  },
  {
    path: "/issue",
    route: issueRouter,
  },
];

routes.forEach((routeProvide: routeObjects) => {
  mainRouter.use(routeProvide.path, routeProvide.route);
});

export default mainRouter;
