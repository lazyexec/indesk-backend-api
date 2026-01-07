import express, { Router } from "express";
import authRouter from "../../auth/auth.route";
import userRouter from "../../user/user.route";
import settingsRouter from "../../settings/settings.route";
import clinicRouter from "../../clinic/clinic.route";
import patientRouter from "../../patient/patient.route";
import clinicMemberRouter from "../../clinicMember/clinicMember.route";
import sessionRouter from "../../session/session.route";

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
    path: "/patient",
    route: patientRouter,
  },
  {
    path: "/clinicMember",
    route: clinicMemberRouter,
  },
  {
    path: "/session",
    route: sessionRouter,
  },
];

routes.forEach((routeProvide: routeObjects) => {
  mainRouter.use(routeProvide.path, routeProvide.route);
});

export default mainRouter;
