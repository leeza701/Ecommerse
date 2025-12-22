import Product from "../models/product.model.js";
import redis from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    return res.status(200).json(products);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const getFeaturedProducts = async (req, res) => {
  try {
    let featuredProducts = null;
    try {
      if (redis && typeof redis.get === "function") {
        const cached = await redis.get("featured_products");
        if (cached) {
          featuredProducts = JSON.parse(cached);
        }
      }
    } catch (redisError) {
      console.log(
        "Redis cache read failed (non-critical):",
        redisError.message
      );
    }

    if (!featuredProducts) {
      featuredProducts = await Product.find({ isFeatured: true }).lean();

      try {
        if (
          redis &&
          typeof redis.set === "function" &&
          featuredProducts.length > 0
        ) {
          await redis.set(
            "featured_products",
            JSON.stringify(featuredProducts),
            "EX",
            3600
          );
        }
      } catch (redisError) {
        console.log(
          "Redis cache write failed (non-critical):",
          redisError.message
        );
      }
    }

    if (!featuredProducts || featuredProducts.length === 0) {
      return res.status(200).json([]);
    }

    res.json(featuredProducts);
  } catch (error) {
    console.error("Error in getFeaturedProducts:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;
    let cloudinaryResponse = null;
    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "products",
      });
    }
    const imageUrl = cloudinaryResponse ? cloudinaryResponse.secure_url : "";

    if (!imageUrl) {
      return res.status(400).json({ message: "Product image is required" });
    }

    const products = new Product({
      name,
      description,
      price,
      imageUrl,
      category,
    });
    await products.save();
    return res
      .status(201)
      .json({ message: "Product created successfully", products });
  } catch (error) {
    console.error("Error creating product:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.imageUrl) {
      const publicId = product.imageUrl.split("/").pop().split(".")[0];
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`);
        console.log("");
      } catch (error) {}
    }
    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const getRecommendedProducts = async (req, res) => {
  try {
    const products = await Product.find({ isFeatured: true }).lean();
    return res.status(200).json(products);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ category }).lean();
    return res.status(200).json(products);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const toggleFeaturedProducts = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const currentProduct = await Product.findById(id);
    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const wasFeatured = currentProduct.isFeatured;
    const newFeaturedStatus = !wasFeatured;

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { isFeatured: newFeaturedStatus },
      { new: true, runValidators: false } 
    );

    if (!updatedProduct) {
      return res
        .status(404)
        .json({ message: "Product not found after update" });
    }

    if (redis && typeof redis?.del === "function") {
      redis.del("featured_products").catch((err) => {
        console.log("Redis cache clear failed (non-critical):", err.message);
      });
    }

    const productObj = updatedProduct.toObject
      ? updatedProduct.toObject()
      : updatedProduct;

    return res.status(200).json({
      message: `Product ${
        newFeaturedStatus ? "added to" : "removed from"
      } featured products`,
      product: productObj,
    });
  } catch (error) {
    console.error("Error in toggleFeaturedProducts:", error);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      code: error.code,
      errors: error.errors,
    });

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
