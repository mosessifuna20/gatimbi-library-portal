import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'adult_member',
    nationalId: '',
    birthCertificate: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    guardianId: '',
    school: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const schools = {
    'High Schools': [
      'Central Imenti High School',
      'Meru High School',
      'Kaaga Girls High School',
      'Meru School',
      'St. Mary\'s Girls High School',
      'Meru Technical Training Institute',
      'Meru Teachers Training College',
      'Meru University of Science and Technology',
      'Nkubu High School',
      'Makutano High School',
      'Miathene High School',
      'Kithirune High School',
      'Kangeta High School',
      'Muthambi High School',
      'Kithirune Girls High School',
      'Muthambi Girls High School',
      'Kangeta Girls High School',
      'Miathene Girls High School'
    ],
    'Primary Schools': [
      'Central Imenti Primary School',
      'Meru Primary School',
      'Kaaga Primary School',
      'Nkubu Primary School',
      'Makutano Primary School',
      'Miathene Primary School',
      'Kithirune Primary School',
      'Kangeta Primary School',
      'Muthambi Primary School',
      'Kithirune Girls Primary School',
      'Muthambi Girls Primary School',
      'Kangeta Girls Primary School',
      'Miathene Girls Primary School',
      'Meru Academy Primary',
      'St. Mary\'s Primary School',
      'Meru Baptist Primary',
      'Meru Methodist Primary',
      'Meru Catholic Primary'
    ],
    'Private Academies': [
      'Meru Academy',
      'St. Mary\'s Academy',
      'Meru Baptist Academy',
      'Meru Methodist Academy',
      'Meru Catholic Academy',
      'Kaaga Academy',
      'Nkubu Academy',
      'Makutano Academy',
      'Miathene Academy',
      'Kithirune Academy',
      'Kangeta Academy',
      'Muthambi Academy',
      'Meru International School',
      'Meru Montessori School',
      'Meru Preparatory School',
      'Meru Junior Academy',
      'Meru Senior Academy',
      'Meru Technical Academy'
    ]
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^254\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Phone must be in format: 254XXXXXXXXX';
    }

    if (formData.role === 'adult_member') {
      if (!formData.nationalId) {
        newErrors.nationalId = 'National ID is required for adults';
      }
    } else if (formData.role === 'junior_member') {
      if (!formData.birthCertificate) {
        newErrors.birthCertificate = 'Birth certificate number is required for juniors';
      }
      if (!formData.guardianName) {
        newErrors.guardianName = 'Guardian name is required for juniors';
      }
      if (!formData.guardianPhone) {
        newErrors.guardianPhone = 'Guardian phone is required for juniors';
      } else if (!/^254\d{9}$/.test(formData.guardianPhone)) {
        newErrors.guardianPhone = 'Guardian phone must be in format: 254XXXXXXXXX';
      }
      if (!formData.guardianEmail) {
        newErrors.guardianEmail = 'Guardian email is required for juniors';
      } else if (!/\S+@\S+\.\S+/.test(formData.guardianEmail)) {
        newErrors.guardianEmail = 'Guardian email is invalid';
      }
      if (!formData.guardianId) {
        newErrors.guardianId = 'Guardian ID is required for juniors';
      }
      if (!formData.school) {
        newErrors.school = 'School is required for juniors';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Registration successful! Please wait for librarian approval.');
        navigate('/login');
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Gatimbi Library Portal
          </h1>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Join Our Community Library
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Access thousands of books, manage your borrowing history, and connect with fellow readers in Meru, Kenya
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20">
          <div className="px-8 py-8">
            <form className="space-y-8" onSubmit={handleSubmit}>
              {/* Member Type Selection */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Your Member Type</h3>
                <div className="flex justify-center space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="adult_member"
                      checked={formData.role === 'adult_member'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className={`w-6 h-6 rounded-full border-2 mr-3 transition-all duration-200 ${
                      formData.role === 'adult_member' 
                        ? 'border-indigo-600 bg-indigo-600' 
                        : 'border-gray-300'
                    }`}>
                      {formData.role === 'adult_member' && (
                        <div className="w-2 h-2 bg-white rounded-full m-auto mt-1"></div>
                      )}
                    </div>
                    <span className={`font-medium ${
                      formData.role === 'adult_member' ? 'text-indigo-600' : 'text-gray-600'
                    }`}>
                      Adult Member (18+)
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="junior_member"
                      checked={formData.role === 'junior_member'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className={`w-6 h-6 rounded-full border-2 mr-3 transition-all duration-200 ${
                      formData.role === 'junior_member' 
                        ? 'border-indigo-600 bg-indigo-600' 
                        : 'border-gray-300'
                    }`}>
                      {formData.role === 'junior_member' && (
                        <div className="w-2 h-2 bg-white rounded-full m-auto mt-1"></div>
                      )}
                    </div>
                    <span className={`font-medium ${
                      formData.role === 'junior_member' ? 'text-indigo-600' : 'text-gray-600'
                    }`}>
                      Junior Member (Under 18)
                    </span>
                  </label>
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-indigo-400'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-indigo-400'
                    }`}
                    placeholder="Enter your email"
                  />
                  {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    name="phone"
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                      errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-indigo-400'
                    }`}
                    placeholder="254XXXXXXXXX"
                  />
                  {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
                </div>
              </div>

              {/* Adult Member Fields */}
              {formData.role === 'adult_member' && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
                  <h4 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Adult Member Information
                  </h4>
                  <div className="space-y-2">
                    <label htmlFor="nationalId" className="block text-sm font-semibold text-gray-700">
                      National ID Number *
                    </label>
                    <input
                      type="text"
                      name="nationalId"
                      id="nationalId"
                      required
                      value={formData.nationalId}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 ${
                        errors.nationalId ? 'border-red-300 bg-red-50' : 'border-indigo-200 hover:border-indigo-400'
                      }`}
                      placeholder="Enter your National ID"
                    />
                    {errors.nationalId && <p className="text-sm text-red-600">{errors.nationalId}</p>}
                  </div>
                </div>
              )}

              {/* Junior Member Fields */}
              {formData.role === 'junior_member' && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
                  <h4 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Junior Member Information
                  </h4>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="birthCertificate" className="block text-sm font-semibold text-gray-700">
                        Birth Certificate Number *
                      </label>
                      <input
                        type="text"
                        name="birthCertificate"
                        id="birthCertificate"
                        required
                        value={formData.birthCertificate}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${
                          errors.birthCertificate ? 'border-red-300 bg-red-50' : 'border-purple-200 hover:border-purple-400'
                        }`}
                        placeholder="Enter birth certificate number"
                      />
                      {errors.birthCertificate && <p className="text-sm text-red-600">{errors.birthCertificate}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="guardianName" className="block text-sm font-semibold text-gray-700">
                          Guardian Name *
                        </label>
                        <input
                          type="text"
                          name="guardianName"
                          id="guardianName"
                          required
                          value={formData.guardianName}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${
                            errors.guardianName ? 'border-red-300 bg-red-50' : 'border-purple-200 hover:border-purple-400'
                          }`}
                          placeholder="Enter guardian's full name"
                        />
                        {errors.guardianName && <p className="text-sm text-red-600">{errors.guardianName}</p>}
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="guardianPhone" className="block text-sm font-semibold text-gray-700">
                          Guardian Phone *
                        </label>
                        <input
                          type="text"
                          name="guardianPhone"
                          id="guardianPhone"
                          required
                          value={formData.guardianPhone}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${
                            errors.guardianPhone ? 'border-red-300 bg-red-50' : 'border-purple-200 hover:border-purple-400'
                          }`}
                          placeholder="254XXXXXXXXX"
                        />
                        {errors.guardianPhone && <p className="text-sm text-red-600">{errors.guardianPhone}</p>}
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="guardianEmail" className="block text-sm font-semibold text-gray-700">
                          Guardian Email *
                        </label>
                        <input
                          type="email"
                          name="guardianEmail"
                          id="guardianEmail"
                          required
                          value={formData.guardianEmail}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${
                            errors.guardianEmail ? 'border-red-300 bg-red-50' : 'border-purple-200 hover:border-purple-400'
                          }`}
                          placeholder="Enter guardian's email"
                        />
                        {errors.guardianEmail && <p className="text-sm text-red-600">{errors.guardianEmail}</p>}
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="guardianId" className="block text-sm font-semibold text-gray-700">
                          Guardian ID *
                        </label>
                        <input
                          type="text"
                          name="guardianId"
                          id="guardianId"
                          required
                          value={formData.guardianId}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${
                            errors.guardianId ? 'border-red-300 bg-red-50' : 'border-purple-200 hover:border-purple-400'
                          }`}
                          placeholder="Enter guardian's ID number"
                        />
                        {errors.guardianId && <p className="text-sm text-red-600">{errors.guardianId}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="school" className="block text-sm font-semibold text-gray-700">
                        School *
                      </label>
                      <select
                        name="school"
                        id="school"
                        required
                        value={formData.school}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 ${
                          errors.school ? 'border-red-300 bg-red-50' : 'border-purple-200 hover:border-purple-400'
                        }`}
                      >
                        <option value="">Select your school</option>
                        {Object.entries(schools).map(([category, schoolList]) => (
                          <optgroup key={category} label={category}>
                            {schoolList.map((school, index) => (
                              <option key={`${category}-${index}`} value={school}>{school}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {errors.school && <p className="text-sm text-red-600">{errors.school}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Password Fields */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Security Information
                </h4>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      id="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 ${
                        errors.password ? 'border-red-300 bg-red-50' : 'border-green-200 hover:border-green-400'
                      }`}
                      placeholder="Create a password"
                    />
                    {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      id="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 ${
                        errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-green-200 hover:border-green-400'
                      }`}
                      placeholder="Confirm your password"
                    />
                    {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword}</p>}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="text-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full max-w-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 px-8 rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>

              {/* Links */}
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
                  >
                    Sign in here
                  </Link>
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Home
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
