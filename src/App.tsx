import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, Image as ImageIcon, Loader2, CheckCircle, AlertCircle, Trash2, Zap, Globe, Languages } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeXrayImage, checkApiConnection } from './lib/gemini';

type Language = 'english' | 'hindi' | 'marathi';

function App() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [language, setLanguage] = useState<Language>('english');
  const [originalAnalysis, setOriginalAnalysis] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setApiStatus('checking');
        await checkApiConnection();
        setApiStatus('connected');
        setAnalysis('Hello! I am your X-ray Analysis AI. Upload an X-ray image, and I can help analyze it for medical conditions or abnormalities.');
        setOriginalAnalysis('Hello! I am your X-ray Analysis AI. Upload an X-ray image, and I can help analyze it for medical conditions or abnormalities.');
      } catch (err) {
        setApiStatus('error');
        setError('Failed to connect to the analysis service. Please try again later.');
      }
    };

    checkConnection();
  }, []);

  useEffect(() => {
    if (analysis) {
      analysisRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [analysis]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file');
        return;
      }
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setError('');
      setAnalysis('I can see the X-ray image. What would you like me to analyze?');
      setOriginalAnalysis('I can see the X-ray image. What would you like me to analyze?');
      setLanguage('english');
    }
  };

  const handleClearImage = () => {
    setImageUrl('');
    setAnalysis('');
    setOriginalAnalysis('');
    setError('');
    setLanguage('english');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!imageUrl) {
      setError('Please upload an X-ray image first');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setAnalysis('Analyzing the X-ray image...');
    setLanguage('english');

    try {
      const result = await analyzeXrayImage(imageUrl, prompt);
      setAnalysis(result);
      setOriginalAnalysis(result);
      setPrompt('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      setAnalysis('I encountered an error while analyzing the X-ray image. Please try again.');
      setOriginalAnalysis('I encountered an error while analyzing the X-ray image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const translateAnalysis = async (targetLanguage: Language) => {
    if (targetLanguage === language || !originalAnalysis || originalAnalysis === '') {
      return;
    }

    setIsTranslating(true);

    try {
      if (targetLanguage === 'english') {
        setAnalysis(originalAnalysis);
        setLanguage('english');
      } else {
        const translatedResult = await analyzeXrayImage(imageUrl, `Translate the following medical analysis to ${targetLanguage}: ${originalAnalysis}`, targetLanguage);
        setAnalysis(translatedResult);
        setLanguage(targetLanguage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during translation.';
      setError(errorMessage);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700 flex flex-col">
      <div className="max-w-6xl mx-auto p-4 md:p-6 flex-1 flex flex-col w-full">
        <header className="text-center mb-6 md:mb-8 pt-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="bg-white p-2 rounded-xl shadow-lg">
              <ImageIcon className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">X-ray<span className="text-pink-300">Vision</span></h1>
          </div>

          <div className="flex items-center justify-center mt-2 gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md shadow-lg ${apiStatus === 'connected'
                ? 'bg-green-400/20 text-green-100 border border-green-400/30'
                : apiStatus === 'error'
                  ? 'bg-red-400/20 text-red-100 border border-red-400/30'
                  : 'bg-yellow-400/20 text-yellow-100 border border-yellow-400/30'
              }`}>
              {apiStatus === 'connected' ? (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Model Connected</span>
                </>
              ) : apiStatus === 'error' ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Model Connection Error</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking Model Connection...</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md shadow-lg bg-indigo-400/20 text-indigo-100 border border-indigo-400/30">
              <Languages className="w-4 h-4" />
              <span>Multilingual Analysis</span>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6 flex-1">
          {/* Left Panel - Image Upload */}
          <div className="lg:w-1/3 bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-pink-300" />
              Upload X-ray
            </h2>

            <div className="mb-6">
              <div
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${imageUrl
                    ? 'border-indigo-300 bg-indigo-900/30'
                    : 'border-white/30 hover:border-pink-400/70 hover:bg-white/5'
                  }`}
                onClick={() => fileInputRef.current?.click()}
              >
                {imageUrl ? (
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt="Uploaded X-ray"
                      className="max-w-full h-auto mx-auto rounded-lg shadow-md"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearImage();
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="py-8">
                    <Upload className="w-14 h-14 text-pink-300/70 mx-auto mb-3" />
                    <p className="text-white font-medium">Drop your X-ray here</p>
                    <p className="text-pink-200/70 text-sm mt-1">or click to browse files</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="prompt" className="block text-sm font-medium text-white mb-2 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-pink-300" />
                What do you want to know?
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you'd like to analyze in this X-ray..."
                className="w-full p-3 bg-white/10 border border-white/20 text-white rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all resize-none placeholder:text-white/50"
                rows={3}
                disabled={!imageUrl || apiStatus !== 'connected'}
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !imageUrl || !prompt.trim() || apiStatus !== 'connected'}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-xl hover:from-indigo-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 font-medium"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Analyze Now</span>
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-900/30 text-red-200 rounded-xl border border-red-500/30 text-sm backdrop-blur-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Analysis Results */}
          <div className="lg:w-2/3 bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-pink-300" />
                Analysis Results
                {language === 'hindi' && <span className="text-sm font-normal ml-2">(हिंदी में)</span>}
                {language === 'marathi' && <span className="text-sm font-normal ml-2">(मराठी मध्ये)</span>}
              </h2>

              {analysis && analysis !== 'Analyzing the X-ray image...' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => translateAnalysis('english')}
                    disabled={isTranslating || language === 'english'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${language === 'english'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => translateAnalysis('hindi')}
                    disabled={isTranslating || language === 'hindi'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${language === 'hindi'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                  >
                    हिंदी
                  </button>
                  <button
                    onClick={() => translateAnalysis('marathi')}
                    disabled={isTranslating || language === 'marathi'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${language === 'marathi'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                  >
                    मराठी
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-indigo-900/30 rounded-xl p-5 prose prose-invert max-w-none border border-white/10 relative">
              {isTranslating && (
                <div className="absolute inset-0 bg-indigo-900/70 flex items-center justify-center z-10">
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-10 h-10 text-pink-300 animate-spin mb-3" />
                    <p className="text-white font-medium">Translating...</p>
                  </div>
                </div>
              )}

              {analysis ? (
                <ReactMarkdown>{analysis}</ReactMarkdown>
              ) : (
                <div className="text-white/60 italic flex flex-col items-center justify-center h-full text-center">
                  <ImageIcon className="w-12 h-12 mb-3 text-pink-300/40" />
                  <p>Upload an X-ray and ask a question to see AI analysis here</p>
                </div>
              )}
              <div ref={analysisRef} />
            </div>

            <div className="mt-4 text-xs text-white/50 text-center">
              Powered by Codewitzz AI• Analysis for educational purposes only
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;