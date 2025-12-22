import axios from "axios";

// Use env var if provided, otherwise fall back to Render backend URL
const baseURL =
	import.meta.env.VITE_API_URL ||
	"https://ecommerse-fullstack-backend.onrender.com/api";

const axiosInstance = axios.create({
	baseURL,
	withCredentials: true,
});

export default axiosInstance;