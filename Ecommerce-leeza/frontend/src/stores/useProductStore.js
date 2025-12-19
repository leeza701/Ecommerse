import { create } from "zustand";
import axiosInstance from "../lib/axios";
import { toast } from "react-hot-toast";

export const useProductStore = create((set) => ({
  products: [],
  loading: false,

  setProducts: (products) => set({ products }),

  fetchAllProducts: async () => {
    set({ loading: true });
    try {
      const res = await axiosInstance.get("/products");
      set({ products: res.data, loading: false });
    } catch (error) {
      console.log("Failed to fetch products:", error);
      set({ loading: false });
    }
  },

  CreateProducts: async (productData) => {
    set({ loading: true });
    try {
      const res = await axiosInstance.post("/products", productData);
      set((state) => ({
        products: [...state.products, res.data],
        loading: false,
      }));
      toast.success("Product created successfully");
    } catch (error) {
      console.log("Failed to create product:", error);
      toast.error("Error creating product");
      set({ loading: false });
    }
  },

  getFeaturedProducts: async () => {
    set({ loading: true });
    try {
      const res = await axiosInstance.get("/products/featured");
      set({ products: res.data, loading: false });
    } catch (error) {
      console.log("Failed to fetch featured products:", error);
      set({ loading: false });
    }
  },

  fetchProductsbyCategory: async (category) => {
    set({ loading: true });
    try {
      const res = await axiosInstance.get(`/products/category/${category}`);
      set({ products: res.data, loading: false });
    } catch (error) {
      console.log("Failed to fetch products by category:", error);
      set({ loading: false });
    }
  },

  deleteProduct: async (productId) => {
    set({ loading: true });
    try {
      await axiosInstance.delete(`/products/${productId}`);
      set((state) => ({
        products: state.products.filter((product) => product._id !== productId),
        loading: false,
      }));
      toast.success("Product deleted successfully");
    } catch (error) {
      console.log("Failed to delete product:", error);
      toast.error("Error deleting product");
      set({ loading: false });
    }
  },
  toggleFeaturedProducts: async (productId) => {
    set({ loading: true });
    try {
      const res = await axiosInstance.patch(`/products/${productId}`);
      const updatedProduct = res.data.product || res.data;

      set((state) => ({
        products: state.products.map((product) =>
          product._id === productId ? updatedProduct : product
        ),
        loading: false,
      }));

      // Refresh featured products cache
      try {
        await axiosInstance.get("/products/featured");
      } catch (cacheError) {
        console.log("Cache rebuild failed (non-critical):", cacheError);
      }

      toast.success("Featured status updated successfully");
    } catch (error) {
      console.error("Failed to toggle featured status:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Error toggling featured status";
      toast.error(errorMessage);
      set({ loading: false });
    }
  },
}));
