import { Router } from "express";

import * as supportController from "./support.controller";
import { authMiddleware, optionalAuthMiddleware } from "../../middleware/authMiddleware";

const router = Router();

router.get("/ticket-types", supportController.getTicketTypes);
router.post("/tickets", optionalAuthMiddleware, supportController.createTicket);
router.get("/admin/tickets", authMiddleware, supportController.getAdminTickets);
router.get("/admin/tickets/:ticketId", authMiddleware, supportController.getAdminTicketDetails);
router.patch("/admin/tickets/:ticketId/status", authMiddleware, supportController.updateTicketStatus);

export default router;
