import express from "express";
import {
  createCheckoutSession,
  checkoutSuccess,
  getUserOrders,
} from "../controllers/payment.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create-checkout-session", protectRoute, createCheckoutSession);
router.post("/checkout-success", protectRoute, checkoutSuccess);
router.get("/orders", protectRoute, getUserOrders);

export default router;
