import React, { useState, useCallback, useRef, ChangeEvent, DragEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Placeholder type for API response - Define based on your actual backend response
interface PredictionResult {
    predicted_class: string;
    confidence: number;
    explanation: {
        title: string;
        content: string; // Renamed from description for consistency
        recommendation: string;
    };
    original_image_base64: string;
    denoised_image_base64: string | null;
    metadata: Record<string, string>;
    filename: string;
}

// Placeholder type for DICOM preview response
interface DicomPreviewResponse {
    preview?: string; // base64 image of DICOM
    error?: string;
}

const MammographyAnalyze: React.FC = () => {
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDicom, setIsDicom] = useState<boolean>(false);
    const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    // Check if user is authenticated
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error("No authentication token found");
            navigate('/login');
            return;
        }
        setIsAuthenticated(true);
    }, [navigate]);
    const [modalOriginalImageSrc, setModalOriginalImageSrc] = useState<string | null>(null);
    const [modalDenoisedImageSrc, setModalDenoisedImageSrc] = useState<string | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    const [modalLoading, setModalLoading] = useState<boolean>(false);
    const [modalZoom, setModalZoom] = useState<number>(1);
    const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (file: File | null) => {
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/png', 'application/dicom'];
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            const isDcm = fileExtension === 'dcm';

            // Basic type check (MIME type for DICOM can be tricky)
            if (!isDcm && !allowedTypes.includes(file.type)) {
                alert('Please select a valid JPEG, PNG, or DICOM (.dcm) file.');
                resetFileInput();
                return;
            }

            if (file.size > 32 * 1024 * 1024) { // 32MB limit
                alert('File size exceeds 32MB limit. Please choose a smaller file.');
                resetFileInput();
                return;
            }

            setSelectedFile(file);
            setIsDicom(isDcm);

            if (!isDcm && allowedTypes.includes(file.type)) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setPreviewSrc(e.target?.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                setPreviewSrc(null); // No direct preview for DICOM in the small box
            }
        } else {
            resetFileInput();
        }
    };

    const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        handleFileChange(event.target.files ? event.target.files[0] : null);
    };

    const resetFileInput = () => {
        setSelectedFile(null);
        setPreviewSrc(null);
        setIsDicom(false);
        setPredictionResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Clear the input
        }
    };

    const preventDefaults = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e: DragEvent) => {
        preventDefaults(e);
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        preventDefaults(e);
        // Check if the leave target is outside the container
        if (!(e.relatedTarget && (e.currentTarget as Node).contains(e.relatedTarget as Node))) {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: DragEvent) => {
        preventDefaults(e);
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileChange(files[0]);
            // Update the hidden input's files for form submission consistency if needed
            if (fileInputRef.current) {
                fileInputRef.current.files = files;
            }
        }
    };

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedFile) return;

        // Check if user is authenticated
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error("No authentication token found");
            navigate('/login');
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);

        // If it's a DICOM file and we don't have a preview yet, load it first
        if (isDicom && !modalOriginalImageSrc) {
            try {
                // Create a new FormData for the preview request
                const previewFormData = new FormData();
                previewFormData.append('file', selectedFile);

                const previewResponse = await fetch('http://localhost:34664/api/mammography/dicom_preview', {
                    method: 'POST',
                    body: previewFormData,
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (previewResponse.ok) {
                    const data: DicomPreviewResponse = await previewResponse.json();
                    if (data.preview) {
                        setModalOriginalImageSrc(`data:image/png;base64,${data.preview}`);
                    }
                }
            } catch (error) {
                console.error('Error loading DICOM preview:', error);
                // Continue with analysis even if preview fails
            }
        }

        try {
            // Use the correct API endpoint
            const response = await fetch('http://localhost:34664/api/mammography/predict', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                // Handle authentication errors
                if (response.status === 401) {
                    console.error("Authentication failed. Please log in again.");
                    localStorage.removeItem('authToken');
                    navigate('/login');
                    throw new Error("Authentication failed. Please log in again.");
                }

                // Handle other server-side errors
                const errorData = await response.json().catch(() => ({ message: 'Prediction failed' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result: PredictionResult = await response.json();

            // Store the prediction result in state
            setPredictionResult(result);

            // Scroll to results section
            scrollToSection('results-section');

            console.log("Prediction Result:", result);

        } catch (error) {
            console.error('Prediction error:', error);
            alert(`An error occurred during analysis: ${error instanceof Error ? error.message : String(error)}`); // Show error to user
        } finally {
            setIsLoading(false);
        }
    };

    const handlePreviewDicom = async () => {
        if (!selectedFile || !isDicom) return;

        // Check if user is authenticated
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error("No authentication token found");
            navigate('/login');
            return;
        }

        setModalLoading(true);
        setModalError(null);
        setModalOriginalImageSrc(null);
        setModalDenoisedImageSrc(null);
        setShowPreviewModal(true);
        setModalZoom(1); // Reset zoom

        // This function previews the original DICOM file
        console.log("Previewing original DICOM file:", selectedFile.name);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            // Use the existing API endpoint for DICOM preview
            const response = await fetch('http://localhost:34664/api/mammography/dicom_preview', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                // Handle authentication errors
                if (response.status === 401) {
                    console.error("Authentication failed. Please log in again.");
                    localStorage.removeItem('authToken');
                    navigate('/login');
                    throw new Error("Authentication failed. Please log in again.");
                }

                const errorData = await response.json().catch(() => ({ error: 'Preview failed' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data: DicomPreviewResponse = await response.json();

            if (data.preview) {
                // For now, we only have the original preview available
                setModalOriginalImageSrc(`data:image/png;base64,${data.preview}`);

                // We'll leave the denoised image empty since it's not available in the preview
                setModalDenoisedImageSrc(null);
            } else if (data.error) {
                setModalError(data.error);
            } else {
                setModalError("Received an empty response from the preview server.");
            }

        } catch (error) {
            console.error('DICOM preview error:', error);
            setModalError(`Failed to load preview: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setShowPreviewModal(false);
        setModalOriginalImageSrc(null);
        setModalDenoisedImageSrc(null);
        setModalError(null);
        setModalLoading(false);
    };

    const handleZoom = (level: number) => {
        setModalZoom(level);
    };

    // Function to scroll to a section
    const scrollToSection = (sectionId: string) => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    };


    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            {/* Hero Section */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-12">
                <div className="md:flex">
                    <div className="md:flex-shrink-0 md:w-1/2">
                        {/* Adjust image path based on your project structure */}
                        <img className="h-full w-full object-cover" src="/images/hero-image.jpg"
                            alt="Breast Cancer Awareness"
                            onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80')} />
                    </div>
                    <div className="p-8 md:w-1/2">
                        <div className="uppercase tracking-wide text-sm text-primary-500 font-semibold">AI-Powered Analysis</div>
                        <h1 className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                            Breast Density Classification
                        </h1>
                        <p className="mt-4 max-w-2xl text-xl text-gray-500">
                            Welcome to MammoSense, This AI-powered tool helps classify mammography
                            images into density categories B or C using advanced deep learning technology.
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={() => scrollToSection('upload-section')}
                                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                <i className="fas fa-upload mr-2"></i> Upload Mammogram
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Upload Section */}
            <div id="upload-section" className="bg-white rounded-xl shadow-lg overflow-hidden mb-12">
                <div className="p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload a Mammogram Image</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <p className="text-gray-600 mb-4">
                                Upload a mammogram image to classify its breast density category. The AI will analyze the image
                                and provide a classification result along with an explanation.
                            </p>
                            <div className="mb-4">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Supported Formats</h3>
                                <ul className="list-disc list-inside text-gray-600">
                                    <li><span className="font-medium text-secondary-600">DICOM (.dcm)</span> - Medical imaging format</li>
                                    <li>JPEG/JPG</li>
                                    <li>PNG</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Guidelines</h3>
                                <ul className="list-disc list-inside text-gray-600">
                                    <li>Upload clear, high-quality mammogram images</li>
                                    <li>Ensure the image is properly oriented</li>
                                    <li>DICOM files preserve valuable metadata</li>
                                    <li>Maximum file size: 32MB</li>
                                </ul>
                            </div>
                        </div>

                        <div>
                            <form onSubmit={handleFormSubmit} className="space-y-6">
                                <div
                                    className={`upload-container border-2 border-dashed rounded-lg py-12 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragging ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}`}
                                    onDragEnter={handleDragEnter}
                                    onDragOver={preventDefaults} // Need onDragOver to make drop work
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                                    <p className="text-gray-500 text-center mb-2">Drag and drop your image here</p>
                                    <p className="text-gray-400 text-sm text-center mb-2">or click to browse files</p>
                                    <p className="text-secondary-500 text-sm text-center mb-4">DICOM (.dcm) files preferred</p>

                                    <input
                                        type="file"
                                        name="file"
                                        id="file-upload"
                                        className="hidden"
                                        accept=".dcm,.jpg,.jpeg,.png,application/dicom" // Be more specific for DICOM if possible
                                        ref={fileInputRef}
                                        onChange={handleFileInputChange}
                                    />

                                    {/* File preview container */}
                                    {selectedFile && (
                                        <div className="file-preview mt-4 w-full px-4">
                                            <div className="flex items-center p-2 bg-gray-50 rounded">
                                                <i className={`fas ${isDicom ? 'fa-file-medical' : 'fa-file-image'} text-primary-500 mr-2 file-icon`}></i>
                                                <span className="filename text-sm truncate flex-grow">{selectedFile.name}</span>
                                                <button
                                                    type="button"
                                                    className="remove-file text-gray-400 hover:text-red-500 ml-2"
                                                    onClick={(e) => { e.stopPropagation(); resetFileInput(); }} // Prevent container click
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </div>
                                            {previewSrc && !isDicom && (
                                                <div className="preview-image mt-2 w-full flex justify-center">
                                                    <img className="max-h-48 rounded shadow" src={previewSrc} alt="Preview" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex space-x-4">
                                    <button
                                        type="submit"
                                        id="submit-button"
                                        className="flex-1 inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!selectedFile || isLoading}
                                    >
                                        {isLoading ? (
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <i className="fas fa-brain mr-2"></i>
                                        )}
                                        {isLoading ? 'Analyzing...' : 'Analyze Image'}
                                    </button>

                                    {isDicom && (
                                        <button
                                            type="button"
                                            id="preview-button"
                                            onClick={handlePreviewDicom}
                                            className="inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-secondary-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={!selectedFile || isLoading}
                                        >
                                            <i className="fas fa-eye mr-2"></i>
                                            Preview Original DICOM
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            {predictionResult && (
                <div id="results-section" className="bg-white rounded-xl shadow-lg overflow-hidden mb-12 animate-fadeIn">
                    {/* Results Header with Ribbon */}
                    <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6 relative">
                        <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden">
                            <div className="absolute top-0 right-0 transform translate-y-8 -translate-x-8 rotate-45 bg-white text-primary-700 font-bold py-1 px-10 shadow-lg">
                                {predictionResult.predicted_class.toUpperCase()}
                            </div>
                        </div>

                        <div className="flex items-center">
                            <div className="mr-4 bg-white bg-opacity-20 p-3 rounded-full">
                                <i className="fas fa-chart-pie text-2xl"></i>
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold">Analysis Results</h2>
                                <p className="text-primary-100">
                                    <i className="fas fa-calendar-alt mr-2"></i>
                                    {new Date().toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        {/* Summary Card */}
                        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6 mb-8 shadow-md">
                            <div className="flex flex-col md:flex-row items-center">
                                <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-inner border-4 border-primary-100">
                                            <span className="text-4xl font-bold text-primary-700">{predictionResult.predicted_class.toUpperCase()}</span>
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                                            {(predictionResult.confidence * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-grow text-center md:text-left">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{predictionResult.explanation.title}</h3>
                                    <p className="text-gray-600">{predictionResult.explanation.content.substring(0, 120)}...</p>
                                </div>

                                <div className="mt-4 md:mt-0 md:ml-6 flex-shrink-0">
                                    <div className="inline-flex rounded-md shadow">
                                        <button
                                            onClick={() => {
                                                // Placeholder for download functionality
                                                alert('Download functionality would be implemented here');
                                            }}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                        >
                                            <i className="fas fa-download mr-2"></i>
                                            Download Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column: Images */}
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                    <i className="fas fa-film text-primary-500 mr-2"></i>
                                    Mammogram Analysis Images
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Original Image */}
                                    <div className="bg-gray-50 p-4 rounded-lg shadow relative group">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                            <i className="fas fa-image text-primary-500 mr-2"></i>
                                            Original DICOM Image
                                        </h4>
                                        <div className="aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center">
                                            <img
                                                src={predictionResult.original_image_base64.startsWith('data:')
                                                    ? predictionResult.original_image_base64
                                                    : `data:image/jpeg;base64,${predictionResult.original_image_base64}`}
                                                alt="Original Mammogram"
                                                className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-110"
                                            />
                                        </div>
                                        {isDicom && (
                                            <div className="absolute top-2 right-2">
                                                <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full font-medium">
                                                    DICOM
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Denoised Image (if available) */}
                                    {predictionResult.denoised_image_base64 ? (
                                        <div className="bg-gray-50 p-4 rounded-lg shadow relative group">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                <i className="fas fa-magic text-secondary-500 mr-2"></i>
                                                AI-Enhanced Image
                                            </h4>
                                            <div className="aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center">
                                                <img
                                                    src={predictionResult.denoised_image_base64.startsWith('data:')
                                                        ? predictionResult.denoised_image_base64
                                                        : `data:image/jpeg;base64,${predictionResult.denoised_image_base64}`}
                                                    alt="AI-Enhanced Mammogram"
                                                    className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-110"
                                                />
                                            </div>
                                            <div className="absolute top-2 right-2">
                                                <span className="bg-secondary-100 text-secondary-800 text-xs px-2 py-1 rounded-full font-medium">
                                                    Enhanced
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 p-4 rounded-lg shadow relative group opacity-70">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                <i className="fas fa-magic text-secondary-500 mr-2"></i>
                                                AI-Enhanced Image
                                            </h4>
                                            <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                                                <div className="text-center p-4">
                                                    <i className="fas fa-image-slash text-gray-400 text-4xl mb-2"></i>
                                                    <p className="text-sm text-gray-500">Enhanced image not available</p>
                                                    <p className="text-xs text-gray-400 mt-1">Enhancement works best with DICOM files</p>
                                                </div>
                                            </div>
                                            <div className="absolute top-2 right-2">
                                                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                                                    Not Available
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Metadata */}
                                {Object.keys(predictionResult.metadata).length > 0 && (
                                    <div className="mt-6 bg-gray-50 p-4 rounded-lg shadow">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Image Metadata</h4>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {Object.entries(predictionResult.metadata).map(([key, value]) => (
                                                <div key={key} className="flex">
                                                    <span className="font-medium text-gray-600 mr-2">{key}:</span>
                                                    <span className="text-gray-800">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Analysis Results */}
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">Classification Results</h3>

                                {/* Classification Result */}
                                <div className="bg-primary-50 p-6 rounded-lg shadow-md mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-medium text-gray-800">Breast Density Category</h4>
                                        <span className="text-xs text-gray-500">Confidence: {(predictionResult.confidence * 100).toFixed(1)}%</span>
                                    </div>

                                    <div className="flex items-center justify-center p-4 bg-white rounded-lg shadow-inner">
                                        <span className="text-3xl font-bold text-primary-700">
                                            Category {predictionResult.predicted_class.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                {/* Explanation */}
                                <div className="bg-gray-50 p-6 rounded-lg shadow-md">
                                    <h4 className="text-lg font-medium text-gray-800 mb-4">{predictionResult.explanation.title}</h4>

                                    <div className="prose prose-sm max-w-none mb-6">
                                        <p className="text-gray-700">{predictionResult.explanation.content}</p>
                                    </div>

                                    {predictionResult.explanation.recommendation && (
                                        <div className="bg-secondary-50 p-4 rounded-lg border-l-4 border-secondary-500">
                                            <h5 className="text-sm font-medium text-secondary-700 mb-2">Recommendation</h5>
                                            <p className="text-sm text-gray-700">{predictionResult.explanation.recommendation}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Disclaimer */}
                                <div className="mt-6 bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                                    <p className="text-sm text-red-700">
                                        <i className="fas fa-exclamation-triangle mr-2"></i>
                                        <strong>Medical Disclaimer:</strong> This analysis is provided for informational purposes only and should not replace professional medical advice. Always consult with a qualified healthcare provider.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-8 flex flex-wrap gap-4">
                            <button
                                onClick={() => {
                                    // Reset the prediction result to allow for a new analysis
                                    setPredictionResult(null);
                                    resetFileInput();
                                    scrollToSection('upload-section');
                                }}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                <i className="fas fa-redo mr-2"></i>
                                Analyze Another Image
                            </button>

                            <button
                                onClick={() => {
                                    // Placeholder for download functionality
                                    alert('Download functionality would be implemented here');
                                }}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-secondary-600 hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
                            >
                                <i className="fas fa-download mr-2"></i>
                                Download Report
                            </button>

                            <button
                                onClick={() => {
                                    // Placeholder for print functionality
                                    window.print();
                                }}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                <i className="fas fa-print mr-2"></i>
                                Print Results
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Loading Section - Enhanced animation */}
            {isLoading && (
                <div id="loading-section" className="bg-white rounded-xl shadow-lg overflow-hidden mb-12 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-secondary-50 opacity-50"></div>
                    <div className="p-8 relative z-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                            <span className="mr-3">Analysis in Progress</span>
                            <div className="ml-2 flex space-x-1">
                                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
                                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
                                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" style={{ animationDelay: '600ms', animationDuration: '1s' }}></div>
                            </div>
                        </h2>

                        <div className="flex flex-col md:flex-row items-center justify-between">
                            <div className="w-full md:w-1/2 mb-6 md:mb-0 md:pr-8">
                                <div className="relative">
                                    {/* Enhanced mammogram scan animation */}
                                    <div className="w-full max-w-md mx-auto relative">
                                        <div className="aspect-square bg-black rounded-lg overflow-hidden shadow-md flex items-center justify-center">
                                            {selectedFile && previewSrc ? (
                                                <img src={previewSrc} alt="Mammogram" className="max-w-full max-h-full object-contain opacity-80" />
                                            ) : isDicom && modalOriginalImageSrc ? (
                                                <img src={modalOriginalImageSrc} alt="DICOM Preview" className="max-w-full max-h-full object-contain opacity-80" />
                                            ) : isDicom ? (
                                                <div className="text-center">
                                                    <i className="fas fa-x-ray text-primary-300 text-6xl mb-2"></i>
                                                    <p className="text-primary-300 text-sm">DICOM File</p>
                                                    <p className="text-primary-300 text-xs">{selectedFile?.name}</p>
                                                </div>
                                            ) : (
                                                <i className="fas fa-x-ray text-gray-300 text-6xl"></i>
                                            )}
                                        </div>

                                        {/* Enhanced scanning effect with multiple layers */}
                                        <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                                            {/* Horizontal scan line */}
                                            <div className="h-1 bg-primary-400 opacity-70 w-full absolute top-0 left-0 animate-scan"></div>

                                            {/* Vertical scan line */}
                                            <div className="w-1 bg-secondary-400 opacity-70 h-full absolute top-0 left-0 animate-scan-vertical"></div>

                                            {/* Radial pulse effect */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-16 h-16 rounded-full border-2 border-primary-500 opacity-0 animate-radar"></div>
                                                <div className="w-16 h-16 rounded-full border-2 border-secondary-500 opacity-0 animate-radar" style={{ animationDelay: '1s' }}></div>
                                            </div>

                                            {/* Grid overlay */}
                                            <div className="absolute inset-0 bg-grid opacity-20"></div>
                                        </div>

                                        {/* Processing indicators */}
                                        <div className="absolute top-2 right-2 bg-primary-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                                            <i className="fas fa-cog fa-spin mr-1"></i> Processing
                                        </div>

                                        {/* AI analysis indicators */}
                                        <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs">AI Analysis</span>
                                                <span className="text-xs animate-pulse">Detecting patterns...</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                                                <div className="bg-primary-500 h-1 rounded-full animate-progress"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full md:w-1/2">
                                <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                        <i className="fas fa-microchip text-primary-500 mr-2"></i>
                                        AI Analysis Pipeline
                                    </h3>
                                    <ul className="space-y-4">
                                        {/* Step 1: Image Preprocessing - Active for first 3 seconds */}
                                        <li className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                                                <div className="animate-processing-step-1">
                                                    <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                                                </div>
                                                <div className="animate-processing-step-1-complete hidden">
                                                    <i className="fas fa-check text-primary-600"></i>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-900">Image Preprocessing</p>
                                                <p className="text-xs text-gray-500">Enhancing image quality</p>
                                            </div>
                                        </li>

                                        {/* Step 2: Feature Extraction - Active from 3-6 seconds */}
                                        <li className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                                <div className="animate-processing-step-2 opacity-0">
                                                    <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                                                </div>
                                                <div className="animate-processing-step-2-complete hidden">
                                                    <i className="fas fa-check text-primary-600"></i>
                                                </div>
                                                <div className="animate-processing-step-2-waiting">
                                                    <i className="fas fa-hourglass-start text-gray-400"></i>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-900">Feature Extraction</p>
                                                <p className="text-xs text-gray-500">Identifying key patterns</p>
                                            </div>
                                        </li>

                                        {/* Step 3: Classification - Active from 6-9 seconds */}
                                        <li className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                                <div className="animate-processing-step-3 opacity-0">
                                                    <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                                                </div>
                                                <div className="animate-processing-step-3-complete hidden">
                                                    <i className="fas fa-check text-primary-600"></i>
                                                </div>
                                                <div className="animate-processing-step-3-waiting">
                                                    <i className="fas fa-hourglass-half text-gray-400"></i>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-900">Classification</p>
                                                <p className="text-xs text-gray-500">Determining density category</p>
                                            </div>
                                        </li>
                                    </ul>

                                    {/* Technical details */}
                                    <div className="mt-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                                            <i className="fas fa-code text-secondary-500 mr-1"></i>
                                            Technical Process
                                        </h4>
                                        <div className="text-xs font-mono bg-gray-800 text-green-400 p-2 rounded h-24 overflow-y-auto">
                                            <div className="animate-typewriter">$ Loading mammography model...</div>
                                            <div className="animate-typewriter" style={{ animationDelay: '0.5s' }}>$ Starting image analysis pipeline...</div>

                                            {/* Step 1: Preprocessing - Synced with the step indicator */}
                                            <div className="animate-typewriter" style={{ animationDelay: '1s' }}>$ [Step 1/3] Preprocessing image...</div>
                                            <div className="animate-typewriter" style={{ animationDelay: '1.5s' }}>$ Applying noise reduction filters...</div>
                                            <div className="animate-typewriter" style={{ animationDelay: '2s' }}>$ Enhancing contrast...</div>
                                            <div className="animate-typewriter" style={{ animationDelay: '2.5s' }}>$ Preprocessing complete ✓</div>

                                            {/* Step 2: Feature Extraction - Synced with the step indicator */}
                                            <div className="animate-typewriter" style={{ animationDelay: '3s' }}>$ [Step 2/3] Extracting features...</div>
                                            <div className="animate-typewriter" style={{ animationDelay: '3.5s' }}>$ Analyzing tissue patterns...</div>
                                            <div className="animate-typewriter" style={{ animationDelay: '4s' }}>$ Identifying density markers...</div>
                                            <div className="animate-typewriter" style={{ animationDelay: '5s' }}>$ Feature extraction complete ✓</div>

                                            {/* Step 3: Classification - Synced with the step indicator */}
                                            <div className="animate-typewriter" style={{ animationDelay: '6s' }}>$ [Step 3/3] Running classification...</div>
                                            <div className="animate-typewriter" style={{ animationDelay: '6.5s' }}>$ Comparing with trained model...</div>
                                            <div className="animate-typewriter" style={{ animationDelay: '7s' }}>$ Calculating confidence scores...</div>
                                            <div className="animate-typewriter" style={{ animationDelay: '8s' }}>$ Classification complete ✓</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 text-center">
                                        <p className="text-sm text-gray-500">This process typically takes 15-30 seconds</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DICOM Preview Modal */}
            {showPreviewModal && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50" onClick={closeModal}>

                    <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[100vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center">
                                <i className="fas fa-x-ray text-primary-500 text-2xl mr-3"></i>
                                <h3 className="text-2xl font-bold text-gray-900 truncate pr-4">DICOM Preview: {selectedFile?.name}</h3>
                            </div>
                            <button
                                onClick={closeModal}
                                className="text-gray-600 hover:text-red-500 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition-colors"
                                title="Close preview"
                                aria-label="Close preview modal"
                                type="button"
                                onKeyDown={(e) => e.key === 'Escape' && closeModal()}
                                tabIndex={0}
                            >
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {modalLoading && (
                            <div className="flex justify-center items-center min-h-[400px]">
                                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary-500 border-solid"></div>
                            </div>
                        )}

                        {modalError && (
                            <div className="flex justify-center items-center min-h-[400px]">
                                <div className="text-red-500 text-center">
                                    <i className="fas fa-exclamation-circle text-5xl mb-4"></i>
                                    <p className="text-xl">{modalError}</p>
                                </div>
                            </div>
                        )}

                        {modalOriginalImageSrc && !modalLoading && !modalError && (
                            <div className="grid grid-cols-1 gap-8">
                                <div className="grid grid-cols-1 gap-6">
                                    {/* Original DICOM Image */}
                                    {modalOriginalImageSrc && (
                                        <div>

                                            <div className="bg-gray-100 rounded-lg overflow-hidden shadow-sm flex items-center justify-center relative h-[500px]">
                                                <img
                                                    src={modalOriginalImageSrc}
                                                    alt="Original DICOM Preview"
                                                    className="max-w-full max-h-full object-contain"
                                                    style={{ transform: `scale(${modalZoom})`, transformOrigin: 'center', transition: 'transform 0.2s' }}
                                                />
                                                <div className="absolute top-2 left-2 bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                                                    Original
                                                </div>
                                            </div>

                                        </div>
                                    )}

                                    {/* We're not showing the denoised image in the preview, only in the results */}
                                </div>



                                {/* Right Column: Controls */}
                                <div>

                                    <h4 className="text-lg font-medium text-gray-900 mb-2">Zoom</h4>
                                    <div className="bg-gray-50 rounded-lg p-6 shadow-sm mb-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between space-x-4">
                                                <input
                                                    type="range"
                                                    min="0.5"
                                                    max="3"
                                                    step="0.1"
                                                    value={modalZoom}
                                                    onChange={(e) => handleZoom(parseFloat(e.target.value))}
                                                    className="w-full"
                                                />
                                                <span className="text-sm font-medium text-gray-700 min-w-[40px] text-right">
                                                    {Math.round(modalZoom * 100)}%
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2 mt-2">
                                                <button onClick={() => handleZoom(0.5)} className="zoom-btn bg-white py-1 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">50%</button>
                                                <button onClick={() => handleZoom(1)} className="zoom-btn bg-white py-1 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">100%</button>
                                                <button onClick={() => handleZoom(1.5)} className="zoom-btn bg-white py-1 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">150%</button>
                                                <button onClick={() => handleZoom(2)} className="zoom-btn bg-white py-1 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">200%</button>
                                            </div>
                                        </div>
                                    </div>


                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MammographyAnalyze;
