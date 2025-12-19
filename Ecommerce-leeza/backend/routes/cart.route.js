import express from "express";
import {
  addToCart,
  getCartProducts,
  deleteFromCart,
  updateQuantity,
} from "../controllers/cart.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
const router = express.Router();

router.get("/", protectRoute, getCartProducts);
router.post("/", protectRoute, addToCart);
router.delete("/", protectRoute, deleteFromCart);
router.put("/:id", protectRoute, updateQuantity); 

export default router;
