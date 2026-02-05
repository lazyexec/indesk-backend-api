import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import env from "./env";

const pool = new PrismaPg({ connectionString: env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: pool });

export default prisma;
