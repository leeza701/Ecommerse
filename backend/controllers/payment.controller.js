import Coupon from "../models/coupon.model.js";
import Stripe from "stripe";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY is not set in environment variables");
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const createCheckoutSession = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        message: "Stripe is not configured. Missing STRIPE_SECRET_KEY.",
      });
    }

    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Login required" });
    }

    const { products, couponCode } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Products array is required" });
    }

    let totalAmount = 0;

    const lineItems = products.map((product, index) => {
      if (!product.price || isNaN(product.price)) {
        throw new Error(
          `Product at index ${index} has invalid price: ${product.price}`
        );
      }

      const amount = Math.round(Number(product.price) * 100);

      if (amount <= 0) {
        throw new Error(
          `Product at index ${index} has invalid price: ${product.price}`
        );
      }

      totalAmount += amount * (product.quantity || 1);

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.title || product.name || "Product",
            images: [],
          },
          unit_amount: amount,
        },
        quantity: product.quantity || 1,
      };
    });

    let discounts = [];

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode,
        userId,
        isActive: true,
      });

      if (coupon) {
        if (!coupon.stripeCouponId) {
          const stripeCoupon = await stripe.coupons.create({
            percent_off: coupon.discountPercentage,
            duration: "once",
          });

          coupon.stripeCouponId = stripeCoupon.id;
          await coupon.save();
        }

        discounts.push({ coupon: coupon.stripeCouponId });
        totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${
        process.env.CLIENT_URL || "http://localhost:5173"
      }/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.CLIENT_URL || "http://localhost:5173"
      }/purchase-cancel`,
      discounts,
      metadata: {
        userId: userId.toString(),
        couponCode: couponCode || "",
      },
    });

    if (totalAmount > 20000) {
      await createNewCoupon(userId);
    }

    return res.json({ url: session.url, totalAmount: totalAmount / 100 });
  } catch (error) {
    console.error("Error in createCheckoutSession:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};


async function createNewCoupon(userId) {
  return await Coupon.findOneAndUpdate(
    { userId },
    {
      code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      discountPercentage: 10,
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      userId,
      isActive: true
    },
    { upsert: true, new: true }
  );
}



export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    const userId = session.metadata.userId;
    const couponCode = session.metadata.couponCode;
    if (couponCode && userId !== "guest") {
      await Coupon.findOneAndUpdate(
        { code: couponCode, userId },
        { isActive: false }
      );
    }
    const user = await User.findById(userId).populate("cartItems.product");

    if (!user || user.cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    const validCartItems = user.cartItems.filter((item) => item.product);

    if (validCartItems.length === 0) {
      return res.status(400).json({
        message: "Cannot create order: Cart contains invalid or deleted products.",
      });
    }
    const orderProducts = validCartItems.map((item) => ({
      productId: item.product._id,
      quantity: item.quantity,
      price: item.product.price,
    }));
    const order = new Order({
      user: userId,
      products: orderProducts,
      totalAmount: session.amount_total / 100,
      stripeSessionId: session.id,
    });

    await order.save();

    // clear cart safely
    user.cartItems = [];
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Payment successful",
      orderId: order._id,
    });

  } catch (error) {
    console.error("Error in checkoutSuccess:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.find({ user: userId })
      .populate("products.productId", "name image price")
      .sort({ createdAt: -1 });

    return res.json(orders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
