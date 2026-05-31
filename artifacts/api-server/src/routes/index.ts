import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import appsRouter from "./apps";
import usersRouter from "./users";
import licensesRouter from "./licenses";
import logsRouter from "./logs";
import sessionsRouter from "./sessions";
import blacklistRouter from "./blacklist";
import subscriptionsRouter from "./subscriptions";
import settingsRouter from "./settings";
import statsRouter from "./stats";
import sdkRouter from "./sdk";
import downloadsRouter from "./downloads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(appsRouter);
router.use(usersRouter);
router.use(licensesRouter);
router.use(logsRouter);
router.use(sessionsRouter);
router.use(blacklistRouter);
router.use(subscriptionsRouter);
router.use(settingsRouter);
router.use(statsRouter);
router.use(sdkRouter);
router.use(downloadsRouter);

export default router;
