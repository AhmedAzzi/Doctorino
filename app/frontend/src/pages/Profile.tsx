import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaBriefcase, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

// Fix for default marker icon in Leaflet with React
import L from 'leaflet';

// Fix the default icon issue by using a custom icon with absolute URLs
const DefaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Set the default icon for all markers
L.Marker.prototype.options.icon = DefaultIcon;


interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  specialization?: string;
  specialty?: string; // Some APIs might use specialty instead of specialization
  address?: string;
  bio?: string;
  avatar?: string;
  gender?: string;
  work_location?: {
    latitude?: number | null;
    longitude?: number | null;
    address: string;
  } | null;
  settings?: {
    notifications?: {
      email: boolean;
      sms: boolean;
      appointment: boolean;
      marketing: boolean;
    };
    appearance?: {
      theme: string;
      compactMode: boolean;
    };
    preferences?: {
      language: string;
      timeFormat: string;
      dateFormat: string;
      currency: string;
    };
    security?: {
      twoFactorAuth: boolean;
      sessionTimeout: string;
    };
  };
}

const Profile: React.FC = () => {
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<User | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('Authentication token not found. Please log in.');
          setLoading(false);
          return;
        }

        console.log('Fetching user profile with token:', token);

        try {
          const response = await axios.get<User>('http://localhost:34664/api/auth/doctors/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          console.log('User profile response:', response.data);
          // Add default values for fields that might not be in the API response
          const enhancedUserData = {
            ...response.data,
            phone: response.data.phone || '',
            specialization: response.data.specialization || response.data.specialty || '',
            specialty: response.data.specialty || response.data.specialization || '',
            address: response.data.address || '',
            bio: response.data.bio || '',
            avatar: response.data.avatar || '',
            gender: response.data.gender || '',
            work_location: response.data.work_location || null
          };

          setUserData(enhancedUserData);
          setFormData(enhancedUserData);
          setError(null);
        } catch (apiError: any) {
          console.error('API Error:', apiError.response || apiError);

          // If we get a 307 redirect, try the URL with trailing slash
          if (apiError.response && apiError.response.status === 307) {
            const response = await axios.get<User>('http://localhost:34664/api/auth/doctors/me/', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            console.log('User profile response (with trailing slash):', response.data);
            // Add default values for fields that might not be in the API response
            const enhancedUserData = {
              ...response.data,
              phone: response.data.phone || '',
              specialization: response.data.specialization || response.data.specialty || '',
              specialty: response.data.specialty || response.data.specialization || '',
              address: response.data.address || '',
              bio: response.data.bio || '',
              avatar: response.data.avatar || '',
              gender: response.data.gender || '',
              work_location: response.data.work_location || null
            };

            setUserData(enhancedUserData);
            setFormData(enhancedUserData);
            setError(null);
          } else {
            throw apiError;
          }
        }
      } catch (err: any) {
        console.error('Error fetching user data:', err);
        setError(`Failed to load profile data. ${err.response?.data?.detail || err.message || ''}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (formData) {
      setFormData(prev => prev ? { ...prev, [name]: value } : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication token not found. Please log in.');
        return;
      }

      console.log('Updating profile with data:', formData);

      // Prepare the data to send to the backend
      const updateData: any = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        specialization: formData.specialization || formData.specialty,
        address: formData.address,
        bio: formData.bio,
        gender: formData.gender
      };

      // Add work_location if it exists and has valid coordinates
      if (formData.work_location) {
        const { latitude, longitude, address } = formData.work_location;
        // Only include work_location if we have at least an address
        if (address || (latitude && longitude)) {
          updateData.work_location = {
            latitude: latitude || null,
            longitude: longitude || null,
            address: address || ''
          };
        }
      }

      // Send the update to the backend
      const response = await axios.put<User>(
        'http://localhost:34664/api/auth/doctors/me',
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('Profile update response:', response.data);

      // Update the local state with the response data
      setUserData(response.data);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(`Failed to update profile. ${err.response?.data?.detail || err.message || ''}`);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
      Error: {error}
    </div>;
  }

  if (!userData || !formData) {
    return <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative">
      No profile data found.
    </div>;
  }


  return (
    <div className="space-y-8 pb-10 max-w-7xl mx-auto">
      {/* Header with background gradient */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Doctor Profile</h1>
        <p className="text-blue-100 mt-2">Manage your personal and professional information</p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Image with animated border on hover */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-50 group-hover:opacity-100 blur transition duration-300"></div>
              <div className="relative w-32 h-32 bg-white rounded-full flex items-center justify-center overflow-hidden">
                {userData.avatar ? (
                  <img
                    src={userData.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <FaUser className="h-16 w-16 text-blue-400" />
                  </div>
                )}
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md text-blue-500 hover:text-blue-700 transition-colors duration-200">
                  <FaEdit className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-800">
                Dr.{" "}
                {userData.full_name
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(" ")}
              </h2>              <p className="text-indigo-600 font-medium mt-1">
                {userData.specialty || userData.specialization || "Doctor"}
              </p>
              <div className="mt-3 flex flex-col md:flex-row gap-4 md:gap-6 text-gray-600">
                <div className="flex items-center justify-center md:justify-start">
                  <FaEnvelope className="mr-2 text-blue-500" />
                  <span>{userData.email}</span>
                </div>
                {userData.phone && (
                  <div className="flex items-center justify-center md:justify-start">
                    <FaPhone className="mr-2 text-blue-500" />
                    <span>{userData.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Button (when not editing) */}
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center shadow-md"
              >
                <FaEdit className="mr-2" /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information Section */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <FaUser className="mr-2 text-blue-500" /> Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name || ''}
                      onChange={handleChange}
                      readOnly={!isEditing}
                      className={`w-full px-4 py-3 border ${isEditing ? 'border-blue-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${!isEditing && 'bg-gray-50'}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      readOnly={!isEditing}
                      className={`w-full px-4 py-3 border ${isEditing ? 'border-blue-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${!isEditing && 'bg-gray-50'}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      readOnly={true}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleChange}
                      readOnly={!isEditing}
                      className={`w-full px-4 py-3 border ${isEditing ? 'border-blue-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${!isEditing && 'bg-gray-50'}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="gender"
                      value={formData.gender || ''}
                      onChange={handleChange}
                      readOnly={!isEditing}
                      className={`w-full px-4 py-3 border ${isEditing ? 'border-blue-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${!isEditing && 'bg-gray-50'}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Information Section */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <FaBriefcase className="mr-2 text-blue-500" /> Professional Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Specialization</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="specialization"
                      value={formData.specialization || formData.specialty || ''}
                      onChange={handleChange}
                      readOnly={!isEditing}
                      className={`w-full px-4 py-3 border ${isEditing ? 'border-blue-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${!isEditing && 'bg-gray-50'}`}
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Bio</label>
                  <div className="relative">
                    <textarea
                      name="bio"
                      value={formData.bio || ''}
                      onChange={handleChange}
                      readOnly={!isEditing}
                      rows={4}
                      className={`w-full px-4 py-3 border ${isEditing ? 'border-blue-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${!isEditing && 'bg-gray-50'}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Location Information Section */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <FaMapMarkerAlt className="mr-2 text-blue-500" /> Location Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="address"
                      value={formData.address || ''}
                      onChange={handleChange}
                      readOnly={!isEditing}
                      className={`w-full px-4 py-3 border ${isEditing ? 'border-blue-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${!isEditing && 'bg-gray-50'}`}
                    />
                  </div>
                </div>

                {isEditing && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Latitude</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.000001"
                          name="work_location_latitude"
                          value={formData.work_location?.latitude || ''}
                          onChange={(e) => {
                            const value = e.target.value ? parseFloat(e.target.value) : null;
                            setFormData(prev => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                work_location: {
                                  ...(prev.work_location || { address: '' }),
                                  latitude: value
                                }
                              };
                            });
                          }}
                          className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Longitude</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.000001"
                          name="work_location_longitude"
                          value={formData.work_location?.longitude || ''}
                          onChange={(e) => {
                            const value = e.target.value ? parseFloat(e.target.value) : null;
                            setFormData(prev => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                work_location: {
                                  ...(prev.work_location || { address: '' }),
                                  longitude: value
                                }
                              };
                            });
                          }}
                          className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Location Address</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="work_location_address"
                          value={formData.work_location?.address || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData(prev => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                work_location: {
                                  ...(prev.work_location || {}),
                                  address: value
                                }
                              };
                            });
                          }}
                          className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Map Section */}
              <div className="mt-6">
                <div className="h-[400px] rounded-lg overflow-hidden shadow-md border border-gray-200">
                  {userData.work_location &&
                    userData.work_location.latitude &&
                    userData.work_location.longitude && (
                      <MapContainer
                        center={[userData.work_location.latitude, userData.work_location.longitude]}
                        zoom={10}
                        scrollWheelZoom={false}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Marker position={[userData.work_location.latitude, userData.work_location.longitude]}>
                          <Popup>
                            <div className="p-2">
                              <h3 className="font-bold">{userData.full_name}</h3>
                              <p>{userData.work_location.address || 'No address provided'}</p>
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    )}
                  {(!userData.work_location ||
                    !userData.work_location.latitude ||
                    !userData.work_location.longitude) && (
                      <div className="h-full w-full flex items-center justify-center bg-gray-50">
                        <div className="text-center p-6">
                          <FaMapMarkerAlt className="mx-auto h-12 w-12 text-gray-300" />
                          <p className="mt-2 text-gray-500">No location information available</p>
                          {isEditing && (
                            <p className="mt-2 text-blue-500 text-sm">
                              Add your work location in the doctor registration form to display a map here.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(userData);
                      setIsEditing(false);
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 flex items-center shadow-sm"
                  >
                    <FaTimes className="mr-2" /> Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center shadow-md"
                  >
                    <FaSave className="mr-2" /> Save Changes
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
