import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Placeholder Map Component
const MapPlaceholder = ({ setLocation }: { setLocation: (lat: number, lon: number) => void }) => {
    // Simulate map click event for placeholder
    const handleMapClick = () => {
        // Example coordinates - replace with actual click logic if using a real map
        const lat = 35.8568041;
        const lon = -0.318647;
        setLocation(lat, lon);
        alert(`Placeholder: Location set to Lat: ${lat}, Lon: ${lon}. Implement actual map interaction.`);
    };

    return (
        <div
            className="h-64 bg-gray-200 border border-gray-300 rounded-lg flex items-center justify-center text-gray-500 cursor-pointer"
            onClick={handleMapClick} // Simulate click
        >
            Map Placeholder - Click to set location (Implement actual map library)
        </div>
    );
};

export default function Signup() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        gender: '',
        specialty: '',
        phone: '',
        duration: '',
        reason: '',
        latitude: '',
        longitude: '',
        address: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        try {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: value }));
            // Clear error when user starts typing
            if (errors[name]) {
                setErrors(prev => ({ ...prev, [name]: "" }));
            }
        } catch (err) {
            console.error("Error in handleChange:", err);
        }
    };

    const setLocation = (lat: number, lon: number) => {
        setFormData(prev => ({
            ...prev,
            latitude: lat.toFixed(6),
            longitude: lon.toFixed(6),
        }));
        if (errors.latitude || errors.longitude) {
            setErrors(prev => ({ ...prev, latitude: "", longitude: "" }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.specialty.trim()) newErrors.specialty = 'Specialty is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
        if (!formData.duration) newErrors.duration = 'Subscription duration is required';
        if (!formData.reason.trim()) newErrors.reason = 'Reason for joining is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0; // Returns true if no errors
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            return; // Stop submission if validation fails
        }

        try {
            // Add a timeout to the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch("http://localhost:34664/api/auth/register-doctor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    email: formData.email,
                    password: formData.password,
                    gender: formData.gender,
                    specialty: formData.specialty,
                    phone_number: formData.phone,
                    subscription_duration: formData.duration,
                    reason_for_joining: formData.reason,
                    work_location: {
                        latitude: parseFloat(formData.latitude) || null,
                        longitude: parseFloat(formData.longitude) || null,
                        address: formData.address,
                    }
                }),
                signal: controller.signal
            });

            // Clear the timeout
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data.access_token) {
                    // Get the username from the response
                    const username = data.username;

                    localStorage.setItem("authToken", data.access_token);
                    localStorage.setItem("username", username);

                    alert(`Registration successful! Your username is: ${username}\nPlease use this username to log in next time.`);
                    navigate("/app"); // Navigate to app page after successful registration and login
                } else {
                    alert("Registration successful! Please log in with the username shown in the next alert.");
                    navigate("/"); // Navigate to login page after successful registration
                }
            } else {
                const error = await response.json();
                alert(`Registration failed: ${error.detail || response.statusText || 'Unknown error'}`);
                console.error("Registration error response:", error);
            }
        } catch (err) {
            console.error("Registration fetch error:", err);

            // Handle specific error types
            if (err instanceof DOMException && err.name === 'AbortError') {
                alert("Registration request timed out. Please check your connection and try again.");
            } else if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                alert("Network error. Please check if the server is running and try again.");
            } else {
                alert("Registration error. Please check the console and try again.");
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200">
            <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 512 512"
                            className="w-56 h-14"
                        >
                            <defs>
                                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" style={{ stopColor: "#4338ca", stopOpacity: 1 }} />
                                    <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
                                </linearGradient>
                            </defs>
                            <text
                                x="50%"
                                y="70%"
                                textAnchor="middle"
                                fill="url(#logoGradient)"
                                fontFamily="Arial, sans-serif"
                                fontSize="120"
                                fontWeight="bold"
                            >
                                Doctorino
                            </text>
                        </svg>
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
                        Doctor Registration
                    </h1>
                    <p className="mt-4 text-xl text-gray-600 sm:mt-5 max-w-2xl mx-auto">
                        Join our platform and connect with patients to provide better healthcare services
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white p-10 rounded-3xl shadow-2xl space-y-8">
                    {/* Form Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* First Name */}
                        <div>
                            <label htmlFor="firstName" className="block text-base font-medium text-gray-700 mb-1">First Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter your first name"
                                    className={`block w-full pl-10 px-4 py-3 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base transition-colors duration-200`}
                                />
                            </div>
                            {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                        </div>

                        {/* Last Name */}
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                            <input
                                type="text"
                                id="lastName"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                required
                                placeholder="Enter your last name"
                                className={`mt-1 block w-full px-3 py-2 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                            />
                            {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="Enter your email"
                                className={`mt-1 block w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                            />
                            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Create a password"
                                className={`mt-1 block w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                            />
                            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                            {!errors.password && <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>}
                        </div>

                        {/* Gender */}
                        <div>
                            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                            <select
                                id="gender"
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                required
                                className={`mt-1 block w-full px-3 py-2 border ${errors.gender ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                            >
                                <option value="" disabled>Select your gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                                <option value="prefer_not_to_say">Prefer not to say</option>
                            </select>
                            {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender}</p>}
                        </div>

                        {/* Specialty */}
                        <div>
                            <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">Specialty</label>
                            <input
                                type="text"
                                id="specialty"
                                name="specialty"
                                value={formData.specialty}
                                onChange={handleChange}
                                required
                                placeholder="Enter your specialty"
                                className={`mt-1 block w-full px-3 py-2 border ${errors.specialty ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                            />
                            {errors.specialty && <p className="mt-1 text-xs text-red-600">{errors.specialty}</p>}
                        </div>

                        {/* Phone */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                placeholder="Enter your phone number"
                                className={`mt-1 block w-full px-3 py-2 border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                            />
                            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                        </div>

                        {/* Subscription Duration */}
                        <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Subscription Duration</label>
                            <select
                                id="duration"
                                name="duration"
                                value={formData.duration}
                                onChange={handleChange}
                                required
                                className={`mt-1 block w-full px-3 py-2 border ${errors.duration ? 'border-red-500' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                            >
                                <option value="" disabled>Select subscription duration</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly (3 months)</option>
                                <option value="biannual">Biannual (6 months)</option>
                                <option value="annual">Annual (12 months)</option>
                            </select>
                            {errors.duration && <p className="mt-1 text-xs text-red-600">{errors.duration}</p>}
                        </div>
                    </div>

                    {/* Full Width Fields */}
                    <div className="space-y-4">
                        {/* Reason for Joining */}
                        <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason for Joining</label>
                            <textarea
                                id="reason"
                                name="reason"
                                rows={3}
                                value={formData.reason}
                                onChange={handleChange}
                                required
                                placeholder="Tell us why you want to join our platform"
                                className={`mt-1 block w-full px-3 py-2 border ${errors.reason ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                            />
                            {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason}</p>}
                        </div>

                        {/* Address */}
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Work Address</label>
                            <textarea
                                id="address"
                                name="address"
                                rows={2}
                                value={formData.address}
                                onChange={handleChange}
                                required
                                placeholder="Enter your work address"
                                className={`mt-1 block w-full px-3 py-2 border ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                            />
                            {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
                        </div>

                        {/* Map for Location Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Work Location on Map</label>
                            <p className="text-xs text-gray-500 mb-2">Click on the map to set your work location</p>
                            <MapPlaceholder setLocation={setLocation} />
                            {(formData.latitude && formData.longitude) ? (
                                <p className="mt-2 text-sm text-green-600">
                                    Location set: Lat {formData.latitude}, Lon {formData.longitude}
                                </p>
                            ) : (
                                <p className="mt-2 text-xs text-gray-500">
                                    No location selected yet. Click on the map to set your location.
                                </p>
                            )}
                        </div>

                        {/* Terms and Conditions */}
                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="terms"
                                    name="terms"
                                    type="checkbox"
                                    required
                                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="terms" className="font-medium text-gray-700">
                                    I agree to the terms and conditions
                                </label>
                                <p className="text-gray-500">
                                    By signing up, you agree to our <a href="#" className="text-indigo-600 hover:text-indigo-500">Terms of Service</a> and <a href="#" className="text-indigo-600 hover:text-indigo-500">Privacy Policy</a>.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full flex justify-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-lg font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 mr-2"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            Create Account
                        </button>
                    </div>

                    {/* Back to Login Link */}
                    <div className="text-center mt-8">
                        <Link to="/" className="text-base text-indigo-600 hover:text-indigo-500 hover:underline transition-colors duration-200">
                            Already have an account? Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}