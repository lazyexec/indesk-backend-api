import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import config from "./env";
import prisma from "./prisma";
import { tokenType } from "./tokens";
import passport from "passport";

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload: any, done: any) => {
  try {
    if (payload.type !== tokenType.ACCESS) {
      throw new Error("Invalid token type");
    }
    const user = await prisma.user.findUnique({
      where: { id: payload._id },
    });
    if (!user) {
      return done(null, false);
    }

    // Reject access tokens issued before the latest password change.
    if (
      user.lastPasswordChangedAt &&
      payload.iat &&
      payload.iat * 1000 < user.lastPasswordChangedAt.getTime()
    ) {
      return done(null, false);
    }

    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

passport.use(jwtStrategy);

export default {
  jwtStrategy,
};
