import express, { Router } from "express";
import authRouter from "../../auth/auth.route";
import userRouter from "../../user/user.route";
import settingsRouter from "../../settings/settings.route";
import clinicRouter from "../../clinic/clinic.route";
import clinicMemberRouter from "../../clinicMember/clinicMember.route";
import sessionRouter from "../../session/session.route";
import integrationRouter from "../../integration/integration.route";
import clientRouter from "../../client/client.route";
import appointmentRouter from "../../appointment/appointment.route";
import stripeRouter from "../../stripe/stripe.route";
import providerRouter from "../../provider/provider.route";
import assessmentRouter from "../../assessment/assessment.route";

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
    path: "/clinicMember",
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
];

routes.forEach((routeProvide: routeObjects) => {
  mainRouter.use(routeProvide.path, routeProvide.route);
});

export default mainRouter;
