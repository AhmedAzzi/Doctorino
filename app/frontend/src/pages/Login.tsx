import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
    // Initialize form data with username from localStorage if available
    const [formData, setFormData] = useState<{ username: string; password: string }>({
        username: localStorage.getItem("username") || "",
        password: ""
    });

    // Add loading state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debug: Log initial form data
    // console.log("Initial form data:", formData);

    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        try {
            // Clear error when user starts typing
            if (error) {
                setError(null);
            }

            // Update form data
            setFormData(prev => ({ ...prev, [name]: value }));
        } catch (err) {
            console.error("Error in handleChange:", err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Reset error state
        setError(null);

        // Set loading state
        setIsLoading(true);

        // Ensure username and password are strings
        let username, password;

        try {
            // Ensure username and password are strings
            username = String(formData.username || '');
            password = String(formData.password || '');
        } catch (err) {
            console.error("Error in handleSubmit preparation:", err);
            setError("An error occurred while preparing the form submission.");
            setIsLoading(false);
            return;
        }

        try {
            // Create a new FormData object
            const formDataObj = new FormData();
            formDataObj.append("username", username);
            formDataObj.append("password", password);

            // Add a timeout to the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch("http://localhost:34664/api/auth/token", {
                method: "POST",
                body: formDataObj,
                signal: controller.signal
            });

            // Clear the timeout
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();

                if (data.access_token) {
                    // Store the token with the Bearer prefix
                    localStorage.setItem("authToken", data.access_token);
                    if (data.username) {
                        localStorage.setItem("username", data.username);
                    }

                    // Navigate to app immediately
                    navigate("/app");

                    // Trigger model loading in the background after navigation
                    setTimeout(() => {
                        fetch("http://localhost:34664/api/auth/load-models", {
                            method: "GET",
                            headers: {
                                "Authorization": `Bearer ${data.access_token}`
                            }
                        })
                            .then(response => response.json())
                            .then(modelData => {
                                // Store model loading status in localStorage
                                localStorage.setItem("modelsLoaded", "true");
                                localStorage.setItem("modelLoadingStatus", JSON.stringify(modelData));
                            })
                            .catch(err => {
                                console.error("Error loading models in background:", err);
                                localStorage.setItem("modelsLoaded", "false");
                            });
                    }, 100); // Small delay to ensure navigation happens first
                } else {
                    setError("Login successful, but no token received.");
                }
            } else {
                try {
                    const errorText = await response.text();
                    try {
                        const errorData = JSON.parse(errorText);
                        setError(errorData.detail || JSON.stringify(errorData));
                    } catch (jsonError) {
                        setError(errorText);
                    }
                } catch (textError) {
                    setError("Unknown error occurred");
                }
            }
        } catch (err) {
            console.error("Login error:", err);

            // Handle specific error types
            if (err instanceof DOMException && err.name === 'AbortError') {
                setError("Login request timed out. Please check your connection and try again.");
            } else if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                setError("Network error. Please check if the server is running and try again.");
            } else {
                setError("An error occurred during login. Please try again.");
            }
        } finally {
            // Reset loading state
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 px-4">
            <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2">

                {/* Left side - Doctor illustration */}
                <div className="md:flex items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-700 h-full">
                    <div className="text-center px-8 py-12">
                        <img
                            src="../assets/logo.png"
                            alt="Logo"
                            className="z-10 p-2 h-full w-full object-contain drop-shadow-lg group-hover:rotate-3 transition-transform duration-500"
                        />
                        <h3 className="text-xl font-bold text-white mt-2">Welcome to Doctorino</h3>
                        <p className="text-blue-100">Your trusted healthcare companion</p>
                    </div>
                </div>

                {/* Right side - Login form */}
                <div className=" p-10 md:p-12">
                    {/* Doctorino Logo */}

                    <h2 className="text-center text-3xl font-bold text-gray-800 mb-3">Welcome Back</h2>
                    <p className="text-center text-gray-600 mb-10 text-lg">Sign in to your account to continue</p>

                    {/* Error message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg shadow-sm">
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div>
                            <label htmlFor="username" className="block text-base font-medium text-gray-700 mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    required
                                    placeholder="Enter your username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 text-base"
                                    disabled={isLoading}
                                />
                            </div>
                            {/* <p className="mt-2 text-sm text-gray-500">
                                For doctors: Your username is automatically generated from your first and last name (e.g., john.smith)
                            </p> */}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-base font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    required
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 text-base"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    disabled={isLoading}
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                                    Forgot password?
                                </a>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 px-6 rounded-xl shadow-lg hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-200 flex items-center justify-center text-lg font-medium"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-6 w-6 mr-2"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        Sign in
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                    <p className="mt-10 text-center text-base text-gray-600">
                        Don't have an account?{" "}
                        <Link
                            to="/signup"
                            className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline transition-colors duration-200"
                        >
                            Sign up now
                        </Link>
                    </p>

                </div>
            </div>
        </div>
    );
}