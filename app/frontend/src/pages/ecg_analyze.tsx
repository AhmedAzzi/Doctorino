import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileWaveform,
  faHeartPulse,
  faCircleExclamation,
  faFileCircleCheck,
  faChartLine,
  faStethoscope
} from '@fortawesome/free-solid-svg-icons';

// Define types for ECG analysis
interface PredictionResult {
  segment: number;
  prediction: string;
  probabilities: Record<string, number>;
}

interface FinalPrediction {
  class: string;
  confidence: number;
  distribution: Record<string, number>;
  average_probabilities: Record<string, number>;
}

interface ClassificationResponse {
  signal_plot: string;
  predictions: PredictionResult[];
  final_prediction: FinalPrediction;
}

const ECGAnalyze: React.FC = () => {
  // State management
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [finalPrediction, setFinalPrediction] = useState<FinalPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [progressValue, setProgressValue] = useState(0);
  const [signalPlot, setSignalPlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to simulate loading states
  const simulateLoading = () => {
    // Set initial progress
    setProgressValue(10);

    // Update progress gradually with a longer animation to match the processing steps
    const totalSteps = 15; // More steps for smoother progress
    const totalDuration = 12000; // 12 seconds to match our animation duration
    const stepDuration = totalDuration / totalSteps;

    // Clear any existing timeouts
    const timeouts: NodeJS.Timeout[] = [];

    // First phase: Quick progress to 30% (signal processing)
    for (let i = 1; i <= 5; i++) {
      const timeout = setTimeout(() => {
        const progress = 10 + Math.floor((i / 5) * 20); // Progress to 30%
        setProgressValue(progress);
      }, i * (stepDuration / 2)); // Faster in the beginning
      timeouts.push(timeout);
    }

    // Second phase: Progress to 60% (feature extraction)
    for (let i = 1; i <= 5; i++) {
      const timeout = setTimeout(() => {
        const progress = 30 + Math.floor((i / 5) * 30); // Progress from 30% to 60%
        setProgressValue(progress);
      }, (totalDuration / 3) + (i * stepDuration));
      timeouts.push(timeout);
    }

    // Third phase: Progress to 90% (classification)
    for (let i = 1; i <= 5; i++) {
      const timeout = setTimeout(() => {
        const progress = 60 + Math.floor((i / 5) * 30); // Progress from 60% to 90%
        setProgressValue(progress);
      }, (totalDuration * 2 / 3) + (i * stepDuration));
      timeouts.push(timeout);
    }

    // Store timeouts in a ref to clear them if needed
    return () => timeouts.forEach(clearTimeout);
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(files);
      setError(null);
      resetAnalysisState();
    }
  };

  // Reset analysis state
  const resetAnalysisState = () => {
    setSignalPlot(null);
    setFinalPrediction(null);
    setShowResults(false);
  };

  // Validate uploaded files
  const validateFiles = (): boolean => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setError("Please select ECG record files");
      return false;
    }

    let hasDat = false;
    let hasHea = false;

    Array.from(selectedFiles).forEach(file => {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.dat')) hasDat = true;
      if (fileName.endsWith('.hea')) hasHea = true;
    });

    if (!hasDat || !hasHea) {
      setError("Please upload both .dat and .hea files for your ECG record");
      return false;
    }

    return true;
  };

  // Handle analysis submission
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFiles()) return;

    setIsLoading(true);
    resetAnalysisState();

    // Start the loading animation
    const clearLoadingAnimation = simulateLoading();

    // Set a timeout to ensure we show at least the minimum animation time
    const minLoadingTime = 12000; // 12 seconds minimum loading time to match our animation
    const startTime = Date.now();

    try {
      const formData = new FormData();
      Array.from(selectedFiles!).forEach(file => formData.append('file', file));

      // Get the authentication token
      const token = localStorage.getItem('authToken');

      // Make the API request
      // In development, use relative URL for proxy; in production, use full URL
      const apiUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'https://doctorino-api.onrender.com');
      const response = await fetch(`${apiUrl}/api/files/upload/ecg`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Analysis failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.error || `Error: ${response.status} ${response.statusText}`;
        } catch (e) {
          errorMessage = `Error: ${response.status} ${response.statusText}`;
        }
        console.error('API Error Response:', errorMessage);
        throw new Error(errorMessage);
      }

      const data: ClassificationResponse = await response.json();

      // Calculate how much time has passed
      const elapsedTime = Date.now() - startTime;

      // If the API responded too quickly, wait a bit to show the animation
      if (elapsedTime < minLoadingTime) {
        setTimeout(() => {
          processAnalysisResults(data);
        }, minLoadingTime - elapsedTime);
      } else {
        // Otherwise process results immediately
        processAnalysisResults(data);
      }
    } catch (error) {
      // Clear any loading animations
      if (clearLoadingAnimation) clearLoadingAnimation();
      handleAnalysisError(error);
    }
  };

  // Process analysis results
  const processAnalysisResults = (data: ClassificationResponse) => {
    // Set progress to 95% to indicate we're almost done but still processing
    setProgressValue(95);

    // Wait a bit longer to ensure the animation completes properly
    // This ensures users can see all the steps of the analysis pipeline
    setTimeout(() => {
      // Set to 100% when we're truly done
      setProgressValue(100);

      // Wait a moment to show the 100% completion before showing results
      setTimeout(() => {
        setFinalPrediction(data.final_prediction);

        // Set signal plot if available
        if (data.signal_plot) {
          setSignalPlot(`data:image/png;base64,${data.signal_plot}`);
        }

        setShowResults(true);
        setIsLoading(false);
      }, 1500); // Longer delay to show 100% completion
    }, 10000); // Increased to 10000ms to ensure animation completes fully
  };

  // Handle analysis errors
  const handleAnalysisError = (error: unknown) => {
    console.error('Error during analysis:', error);
    let errorMessage = 'An unknown error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Failed to connect to the server. Please ensure the API is running and accessible.';
      }
    }

    // Reset the UI state
    setProgressValue(0);
    setError(errorMessage);
    setIsLoading(false);
    setShowResults(false);

    // Show the error for a limited time, then clear it
    const currentError = errorMessage;
    setTimeout(() => {
      // Only clear if it's still the same error
      if (currentError === errorMessage) {
        setError(null);
      }
    }, 5000);
  };

  // Helper functions for UI
  const getConfidenceColor = (confidence: number) => {
    if (confidence > 80) return 'bg-emerald-500';
    if (confidence > 60) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            <FontAwesomeIcon icon={faHeartPulse} className="text-red-500 mr-3" />
            ECG Analysis Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Upload your ECG records for AI-powered analysis</p>
        </header>

        {/* Upload Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
          <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
            <h2 className="text-2xl font-semibold flex items-center">
              <FontAwesomeIcon icon={faFileWaveform} className="mr-3" />
              Upload ECG Data
            </h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleAnalyze} className="space-y-6">
              <div>
                <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                  ECG Record Files (.dat, .hea, and .atr files)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-500 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label
                        htmlFor="file"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                      >
                        <span>Select files</span>
                        <input
                          id="file"
                          name="file"
                          type="file"
                          className="sr-only"
                          multiple
                          required
                          accept=".dat, .atr, .hea"
                          onChange={handleFileChange}
                          ref={fileInputRef}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">.dat, .atr, and .hea files up to 10MB</p>
                  </div>
                </div>
              </div>

              {selectedFiles && selectedFiles.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Selected files:</h3>
                  <ul className="space-y-1">
                    {Array.from(selectedFiles).map((file, index) => (
                      <li key={index} className="flex items-center text-sm text-blue-700">
                        <FontAwesomeIcon icon={faFileCircleCheck} className="mr-2 text-green-500" />
                        {file.name} <span className="text-gray-500 ml-2">({Math.round(file.size / 1024)} KB)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                  disabled={!selectedFiles || isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faHeartPulse} className="mr-2" />
                      Analyze ECG
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Enhanced Loading Animation */}
        {isLoading && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg mb-8">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
              <h2 className="text-2xl font-semibold flex items-center">
                <FontAwesomeIcon icon={faHeartPulse} className="mr-3" />
                Analysis in Progress
                <div className="ml-2 flex space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '600ms', animationDuration: '1s' }}></div>
                </div>
              </h2>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Left side - ECG Visualization */}
                <div className="w-full md:w-1/2">
                  <div className="bg-black rounded-lg p-4 relative overflow-hidden">
                    <div className="relative h-48">
                      {/* ECG Grid Background */}
                      <div className="absolute inset-0 bg-grid opacity-20"></div>

                      <div className="w-full overflow-x-hidden">
                        <svg
                          className="w-[2000px] h-48"  // Very wide (2000px) with fixed height
                          viewBox="0 0 2000 200"
                          preserveAspectRatio="none"
                        >
                          {/* Grid lines - stretched horizontally */}
                          <g className="grid-lines" stroke="rgba(0, 255, 0, 0.2)" strokeWidth="1">
                            {Array.from({ length: 20 }).map((_, i) => (
                              <line key={`h-${i}`} x1="0" y1={i * 10} x2="2000" y2={i * 10} />
                            ))}
                            {Array.from({ length: 200 }).map((_, i) => ( // More vertical lines
                              <line key={`v-${i}`} x1={i * 10} y1="0" x2={i * 10} y2="200" />
                            ))}
                          </g>

                          {/* Extra long ECG line */}
                          <path
                            className="ecg-line"
                            d="M0,100 L100,100 L105,100 L110,100 L115,80 L120,120 L125,80 L130,120 L135,100 L140,100 L145,100 L150,100 L155,100 L160,100 L165,100 L170,100 L175,100 L180,100 L185,100 L190,100 L195,100 L200,100 L205,100 L210,100 L215,100 L220,100 L225,100 L230,40 L235,160 L240,100 L245,100 L250,100 L255,100 L260,100 L265,100 L270,100 L275,100 L280,100 L285,100 L290,100 L295,100 L300,100 L400,100 L405,100 L410,100 L415,80 L420,120 L425,80 L430,120 L435,100 L440,100 L445,100 L450,100 L455,100 L460,100 L465,100 L470,100 L475,100 L480,100 L485,100 L490,100 L495,100 L500,100 L505,100 L510,100 L515,100 L520,100 L525,100 L530,40 L535,160 L540,100 L545,100 L550,100 L555,100 L560,100 L565,100 L570,100 L575,100 L580,100 L585,100 L590,100 L595,100 L600,100"
                            fill="none"
                            stroke="#00ff00"
                            strokeWidth="3"
                            strokeLinecap="round"
                          >
                            <animate
                              attributeName="d"
                              dur="60s"  // Longer duration for wider animation
                              repeatCount="indefinite"
                              values="M0,100 L100,100 L105,100 L110,100 L115,80 L120,120 L125,80 L130,120 L135,100 L140,100 L145,100 L150,100 L155,100 L160,100 L165,100 L170,100 L175,100 L180,100 L185,100 L190,100 L195,100 L200,100 L205,100 L210,100 L215,100 L220,100 L225,100 L230,40 L235,160 L240,100 L245,100 L250,100 L255,100 L260,100 L265,100 L270,100 L275,100 L280,100 L285,100 L290,100 L295,100 L300,100 L400,100 L405,100 L410,100 L415,80 L420,120 L425,80 L430,120 L435,100 L440,100 L445,100 L450,100 L455,100 L460,100 L465,100 L470,100 L475,100 L480,100 L485,100 L490,100 L495,100 L500,100 L505,100 L510,100 L515,100 L520,100 L525,100 L530,40 L535,160 L540,100 L545,100 L550,100 L555,100 L560,100 L565,100 L570,100 L575,100 L580,100 L585,100 L590,100 L595,100 L600,100;
               M-600,100 L-500,100 L-495,100 L-490,100 L-485,80 L-480,120 L-475,80 L-470,120 L-465,100 L-460,100 L-455,100 L-450,100 L-445,100 L-440,100 L-435,100 L-430,100 L-425,100 L-420,100 L-415,100 L-410,100 L-405,100 L-400,100 L-395,100 L-390,100 L-385,100 L-380,100 L-375,40 L-370,160 L-365,100 L-360,100 L-355,100 L-350,100 L-345,100 L-340,100 L-335,100 L-330,100 L-325,100 L-320,100 L-315,100 L-310,100 L-305,100 L-300,100 L-200,100 L-195,100 L-190,100 L-185,80 L-180,120 L-175,80 L-170,120 L-165,100 L-160,100 L-155,100 L-150,100 L-145,100 L-140,100 L-135,100 L-130,100 L-125,100 L-120,100 L-115,100 L-110,100 L-105,100 L-100,100 L-95,100 L-90,100 L-85,100 L-80,100 L-75,100 L-70,100 L-65,100 L-60,100 L-55,100 L-50,100 L-45,100 L-40,100 L-35,100 L-30,100 L-25,100 L-20,100 L-15,100 L-10,100 L-5,100 L0,100"
                            />
                          </path>
                        </svg>
                      </div>

                      {/* Scanning effect */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="h-full w-1 bg-green-400 opacity-70 absolute top-0 left-0 animate-scan-vertical"></div>
                      </div>

                      {/* Processing indicators */}
                      <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                        <i className="fas fa-cog fa-spin mr-1"></i> Processing
                      </div>

                      {/* Heart rate indicator */}
                      <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 text-white text-xs p-2 rounded flex items-center justify-between">
                        <span className="flex items-center">
                          <FontAwesomeIcon icon={faHeartPulse} className="text-red-500 mr-1 animate-pulse" style={{ animationDuration: '0.5s' }} />
                          <span className="text-green-400">72</span> BPM
                        </span>
                        <span className="text-xs animate-pulse">Analyzing rhythm...</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - Processing Steps */}
                <div className="w-full md:w-1/2">
                  <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <FontAwesomeIcon icon={faStethoscope} className="text-blue-500 mr-2" />
                      ECG Analysis Pipeline
                    </h3>
                    <ul className="space-y-4">
                      {/* Step 1: Signal Processing - Active for first 3 seconds */}
                      <li className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <div className="animate-processing-step-1">
                            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          </div>
                          <div className="animate-processing-step-1-complete hidden">
                            <FontAwesomeIcon icon={faFileCircleCheck} className="text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">Signal Processing</p>
                          <p className="text-xs text-gray-500">Filtering and denoising</p>
                        </div>
                      </li>

                      {/* Step 2: Feature Extraction - Active from 3-6 seconds */}
                      <li className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <div className="animate-processing-step-2 opacity-0">
                            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          </div>
                          <div className="animate-processing-step-2-complete hidden">
                            <FontAwesomeIcon icon={faFileCircleCheck} className="text-blue-600" />
                          </div>
                          <div className="animate-processing-step-2-waiting">
                            <i className="fas fa-hourglass-start text-gray-400"></i>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">Feature Extraction</p>
                          <p className="text-xs text-gray-500">Identifying ECG patterns</p>
                        </div>
                      </li>

                      {/* Step 3: Classification - Active from 6-9 seconds */}
                      <li className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <div className="animate-processing-step-3 opacity-0">
                            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          </div>
                          <div className="animate-processing-step-3-complete hidden">
                            <FontAwesomeIcon icon={faFileCircleCheck} className="text-blue-600" />
                          </div>
                          <div className="animate-processing-step-3-waiting">
                            <i className="fas fa-hourglass-half text-gray-400"></i>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">Classification</p>
                          <p className="text-xs text-gray-500">Determining cardiac condition</p>
                        </div>
                      </li>
                    </ul>

                    {/* Technical details */}
                    <div className="mt-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                        <i className="fas fa-code text-blue-500 mr-1"></i>
                        Technical Process
                      </h4>
                      <div className="text-xs font-mono bg-gray-800 text-green-400 p-2 rounded h-24 overflow-y-auto">
                        <div className="animate-typewriter">$ Loading ECG analysis model...</div>
                        <div className="animate-typewriter" style={{ animationDelay: '0.3s' }}>$ Starting signal analysis pipeline...</div>

                        {/* Step 1: Signal Processing - Synced with the step indicator */}
                        <div className="animate-typewriter" style={{ animationDelay: '0.6s' }}>$ [Step 1/3] Processing signal...</div>
                        <div className="animate-typewriter" style={{ animationDelay: '1.0s' }}>$ Applying Kalman filter...</div>
                        <div className="animate-typewriter" style={{ animationDelay: '1.4s' }}>$ Removing baseline wander...</div>
                        <div className="animate-typewriter" style={{ animationDelay: '1.8s' }}>$ Signal processing complete ✓</div>

                        {/* Step 2: Feature Extraction - Synced with the step indicator */}
                        <div className="animate-typewriter" style={{ animationDelay: '2.2s' }}>$ [Step 2/3] Extracting features...</div>
                        <div className="animate-typewriter" style={{ animationDelay: '2.6s' }}>$ Detecting QRS complexes...</div>
                        <div className="animate-typewriter" style={{ animationDelay: '3.0s' }}>$ Measuring RR intervals...</div>
                        <div className="animate-typewriter" style={{ animationDelay: '3.4s' }}>$ Feature extraction complete ✓</div>

                        {/* Step 3: Classification - Synced with the step indicator */}
                        <div className="animate-typewriter" style={{ animationDelay: '3.8s' }}>$ [Step 3/3] Running classification...</div>
                        <div className="animate-typewriter" style={{ animationDelay: '4.2s' }}>$ Analyzing rhythm patterns...</div>
                        <div className="animate-typewriter" style={{ animationDelay: '4.6s' }}>$ Calculating confidence scores...</div>
                        <div className="animate-typewriter" style={{ animationDelay: '5.0s' }}>$ Classification complete ✓</div>
                      </div>
                    </div>

                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">Analysis typically takes 15-30 seconds</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out animate-progress"
                        ></div>
                      </div>
                      <p className="text-sm font-medium text-gray-700 mt-1">{progressValue}% complete</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <FontAwesomeIcon icon={faCircleExclamation} className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Final Prediction */}
        {showResults && finalPrediction && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
              <h2 className="text-2xl font-semibold flex items-center">
                <FontAwesomeIcon icon={faStethoscope} className="mr-3" />
                Final Diagnosis Summary
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Primary Diagnosis */}
                <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-lg border border-blue-100 shadow-sm">
                  <div className="text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-4">
                      Primary Classification
                    </span>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                      {finalPrediction.class}
                    </h3>
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      <span className="text-4xl font-bold text-blue-600">
                        {finalPrediction.confidence}%
                      </span>
                      <span className="text-sm text-gray-500">confidence</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${getConfidenceColor(finalPrediction.confidence)}`}
                      style={{ width: `${finalPrediction.confidence}%` }}
                    ></div>
                  </div>
                </div>

                {/* Probability Distribution */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <FontAwesomeIcon icon={faChartLine} className="text-blue-500 mr-2" />
                    Probability Distribution
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(finalPrediction.average_probabilities)
                      .sort(([, a], [, b]) => b - a)
                      .map(([className, probability], i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className={`font-medium ${className === finalPrediction.class ? 'text-blue-600' : 'text-gray-600'}`}>
                              {className}
                            </span>
                            <span className="font-medium text-gray-700">
                              {(probability * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${className === finalPrediction.class ? getConfidenceColor(probability * 100) : 'bg-gray-300'}`}
                              style={{ width: `${probability * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Container */}
        {showResults && (
          <div className="space-y-8">
            {/* Signal Visualization */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
                <h2 className="text-2xl font-semibold flex items-center">
                  <FontAwesomeIcon icon={faChartLine} className="mr-3" />
                  ECG Signal Visualization
                </h2>
              </div>
              <div className="p-6">
                {
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <img
                      src={signalPlot || undefined}
                      alt="ECG Signal Plot"
                      className="w-full h-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="200" viewBox="0 0 800 200"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="sans-serif">ECG Visualization Not Available</text></svg>'
                      }}
                    />
                  </div>
                }
              </div>
            </div>



            {/* Disclaimer */}
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FontAwesomeIcon icon={faCircleExclamation} className="h-5 w-5 text-amber-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">Medical Disclaimer</h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      This AI analysis is intended to assist healthcare professionals and should not replace clinical judgment.
                      Always consult with a qualified medical professional for diagnosis and treatment decisions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS for ECG animation */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        .ecg-line {
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes scan-vertical {
          0% { left: 0%; }
          100% { left: 100%; }
        }

        .animate-scan-vertical {
          animation: scan-vertical 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ECGAnalyze;
