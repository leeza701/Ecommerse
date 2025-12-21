import axios from "axios";

const axiosInstance=axios.create({
    //baseURL:import.meta.mode === "development" ? "http://localhost:5000/api" : "/api",
    baseURL: "https://ecommerse-fullstack-79i2.onrender.com/api",
    withCredentials:true,
})

export default axiosInstance;