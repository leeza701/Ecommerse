
import Coupon from "../models/coupon.model.js";
export const getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({
      userId: req.user._id,  
      isActive: true,
    });

    res.json(coupon || null);
  } catch (error) {
    console.log("Error in getCoupon controller:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const foundCoupon = await Coupon.findOne({
      code,
      userId: req.user._id,
      isActive: true,
    });

    if (!foundCoupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    if (foundCoupon.expirationDate < new Date()) {
      foundCoupon.isActive = false;
      await foundCoupon.save();
      return res.status(404).json({ message: "Coupon expired" });
    }

    return res.json({
      message: "Coupon is valid",
      code: foundCoupon.code,
      discountPercentage: foundCoupon.discountPercentage,
    });

  } catch (error) {
    console.log("Error in validateCoupon:", error.message);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
