import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";

dotenv.config();

import kycRoutes from "./modules/kyc/kyc.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import supportTicketsRoutes from "./modules/support/support.routes";
import { telegramNotificationsService } from "./services/telegramNotifications.service";

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
const allowedOrigins = [
  "https://korner.pro",
  "https://korner.lol",
  "https://arsentomsky.indrive.com",
  "http://localhost:6969",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "korner-support-service" });
});

// Routes
app.use("/api/v1/support", supportTicketsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/v1/kyc", kycRoutes);

// Background jobs: retry failed telegram alerts every 30 minutes
setInterval(
  async () => {
    try {
      await telegramNotificationsService.retryFailedAlerts();
    } catch (error) {
      console.error("Error in telegram retry job:", error);
    }
  },
  30 * 60 * 1000
);

// Generic error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: {
      code: "SERVER_ERROR",
      message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    },
  });
});

app.listen(Number(PORT), () => {
  console.log(`korner-support-service running on port ${PORT}`);
});

export default app;
