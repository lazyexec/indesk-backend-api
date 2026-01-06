import type { Request, Response, NextFunction } from "express";

const deviceMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const userAgent = req.get("User-Agent") || "Unknown Device";
  const host = req.get("host") || null;
  const origin = req.get("origin") || null;
  const referer = req.get("referer") || null;
  const acceptLanguage = req.get("accept-language") || null;

  let port: string | undefined = undefined;
  if (host && host.includes(":")) {
    port = host.split(":")[1];
  }

  req.device = {
    userAgent,
    ip: req.ip,
    host,
    port: port || null,
    origin,
    referer,
    protocol: req.protocol,
    method: req.method,
    path: req.originalUrl,
    acceptLanguage,
  };

  next();
};

export default deviceMiddleware;
