import express from "express";
import { adminRoute ,protectRoute} from "../middleware/auth.middleware.js";
import { getAnalyticsData , getSalesData} from "../controllers/analytics.controller.js";

const router=express.Router();

router.get("/",protectRoute,adminRoute,getAnalyticsData)
router.get("/sales" , protectRoute , adminRoute , getSalesData)

export default router;