import Product from "../models/product.model.js";

const normalizeId = (value) => value?.toString();

export const getCartProducts = async (req, res) => {
  try {
    const user = req.user;
    const productIds = user.cartItems.map((item) => item.product);

    if (productIds.length === 0) {
      return res.json([]);
    }

    const products = await Product.find({ _id: { $in: productIds } });

    const cartItems = user.cartItems
      .map((item) => {
        const product = products.find(
          (p) => normalizeId(p._id) === normalizeId(item.product)
        );
        if (!product) return null;

        return {
          ...product.toJSON(),
          quantity: item.quantity,
        };
      })
      .filter(Boolean);

    res.json(cartItems);
  } catch (error) {
    console.log("error in getCartProducts controller", error.message);
    return res
      .status(500)
      .json({ message: "server error", error: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: "productId is required" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const user = req.user;
    const existingItem = user.cartItems.find(
      (item) => normalizeId(item.product) === productId
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cartItems.push({ product: productId, quantity: 1 });
    }

    await user.save();
    res.json(user.cartItems);
  } catch (error) {
    console.log("error in addToCart controller", error.message);
    res.status(500).json({ message: "server error", error: error.message });
  }
};

export const deleteFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;

    if (!productId) {
      user.cartItems = [];
    } else {
      user.cartItems = user.cartItems.filter(
        (item) => normalizeId(item.product) !== productId
      );
    }

    await user.save();
    res.json(user.cartItems);
  } catch (error) {
    res.status(500).json({ message: "server errror", error: error.message });
  }
};

export const updateQuantity = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== "number" || quantity < 0) {
      return res
        .status(400)
        .json({ message: "quantity must be a positive number" });
    }

    const user = req.user;
    const existingItem = user.cartItems.find(
      (item) => normalizeId(item.product) === productId
    );

    if (!existingItem) {
      return res.status(404).json({ message: "product not found" });
    }

    if (quantity === 0) {
      user.cartItems = user.cartItems.filter(
        (item) => normalizeId(item.product) !== productId
      );
    } else {
      existingItem.quantity = quantity;
    }

    await user.save();
    return res.json(user.cartItems);
  } catch (error) {
    console.log("error in updateQuantity controller", error.message);
    res.status(500).json({ message: "server error", error: error.message });
  }
};
