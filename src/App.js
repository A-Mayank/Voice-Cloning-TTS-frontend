import { useState, useRef, useEffect } from "react";
import { Mic, Upload, FileAudio, RefreshCw, Sliders, User, Music, Settings, Languages } from "lucide-react";
import axios from "axios";
import "./App.css"

const API_BASE_URL = "http://localhost:8000";

export default function VoiceCloneApp() {
  const [inputText, setInputText] = useState("Hello, this is a demo of OpenVoice text-to-speech with voice cloning.");
  const [language, setLanguage] = useState("English");
  const [speed, setSpeed] = useState(0.9);
  const [emotion, setEmotion] = useState("default");
  const [activeTab, setActiveTab] = useState("preset"); // preset or user
  const [selectedAccent, setSelectedAccent] = useState("en-us");
  const [userVoice, setUserVoice] = useState("");
  const [presetVoice, setPresetVoice] = useState("");
  const [status, setStatus] = useState("");
  const [generatedAudio, setGeneratedAudio] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // Available accents with display names
  const [availableAccents, setAvailableAccents] = useState([]);
  const [accentDisplayNames, setAccentDisplayNames] = useState({
    "en-us": "American English",
    "en-uk": "British English",
    // Add more accent display names here
  });

  // User voices from backend
  const [userVoices, setUserVoices] = useState([]);

  // Preset voices from backend
  const [presetVoices, setPresetVoices] = useState([]);

  // Emotion options (matching streamlit version)
  const emotionOptions = [
    "default",
    "friendly",
    "cheerful",
    "excited",
    "sad",
    "angry",
    "terrified",
    "shouting",
    "whispering"
  ];

  // Fetch accents and voices on initial load
  useEffect(() => {
    fetchAccents();
    fetchPresetVoices();
    fetchUserVoices();
  }, []);

  const fetchAccents = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/available-accents/`);
      setAvailableAccents(response.data.accents);
      // Default to en-us if available
      if (response.data.accents.includes('en-us')) {
        setSelectedAccent('en-us');
      } else if (response.data.accents.length > 0) {
        setSelectedAccent(response.data.accents[0]);
      }
    } catch (error) {
      console.error("Error fetching accents:", error);
      setStatus("Error fetching accents");
    }
  };

  const fetchPresetVoices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/preset-voices/`);
      setPresetVoices(response.data.voices);
      // Set default preset voice if available
      if (response.data.voices.length > 0) {
        setPresetVoice(response.data.voices[0]);
      }
    } catch (error) {
      console.error("Error fetching preset voices:", error);
      setStatus("Error fetching preset voices");
    }
  };

  const fetchUserVoices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user-voices/`);
      setUserVoices(response.data.voices);
    } catch (error) {
      console.error("Error fetching user voices:", error);
      setStatus("Error fetching user voices");
    }
  };

  const handleGenerateSpeech = async () => {
    if (!inputText.trim()) {
      alert("Please enter text to generate speech.");
      return;
    }

    setIsProcessing(true);
    setStatus("Generating speech...");

    try {
      console.log("📡 Sending API request to FastAPI...");

      // Determine which voice to use based on active tab
      const voiceId = activeTab === "preset" ? presetVoice : userVoice;

      if (!voiceId) {
        throw new Error(`Please select a ${activeTab === "preset" ? "preset" : "user"} voice`);
      }

      const response = await axios.post(
        `${API_BASE_URL}/generate-voice/`,
        {
          text: inputText,
          accent: selectedAccent,
          voice_id: voiceId,
          voice_type: activeTab,
          language: language,
          speed: parseFloat(speed),
          emotion: emotion
        },
        {
          headers: { "Content-Type": "application/json" }
        }
      );

      console.log("✅ Response from FastAPI:", response.data);

      if (response.data.audio_url) {
        // Construct the full URL for the audio
        const audioUrl = `${API_BASE_URL}${response.data.audio_url}`;
        setGeneratedAudio(audioUrl);
        setStatus("Speech generated successfully!");
      } else {
        console.error("⚠️ No audio URL returned from API");
        setStatus("Error: No audio URL received.");
      }

    } catch (error) {
      console.error("❌ Error generating speech:", error.response ? error.response.data : error.message);
      setStatus(`Error generating speech: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // File Upload Handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setStatus("Uploading voice reference...");
    setIsProcessing(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      console.log("📡 Uploading file:", file.name);

      const response = await axios.post(`${API_BASE_URL}/upload-voice/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ File uploaded successfully:", response.data);
      setStatus(response.data.message);

      // Refresh the voice list after successful upload
      await fetchUserVoices();

      // Auto-select the newly uploaded voice
      if (response.data.voice_id) {
        setUserVoice(response.data.voice_id);
        setActiveTab("user");
      }

    } catch (error) {
      console.error("❌ Error uploading file:", error);
      setStatus(`Error uploading file: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to format accent display name
  const getAccentDisplayName = (accentId) => {
    return accentDisplayNames[accentId] || accentId;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4 flex flex-col">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">OpenVoice</h2>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Account</h3>
          <div className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
            <User size={16} />
            <span>Username</span>
          </div>
        </div>

        <h3 className="text-lg font-medium mb-2">Speech Settings</h3>

        {/* Language Selection */}
        <div className="mb-4">
          <label className="block mb-1 text-sm">Language</label>
          <select
            className="w-full bg-gray-700 rounded p-2 text-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="English">English</option>
            <option value="Chinese">Chinese</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="Japanese">Japanese</option>
            <option value="Korean">Korean</option>
          </select>
        </div>

        {/* Accent Selection - UPDATED */}
        <div className="mb-4">
          <label className="block mb-1 text-sm">Accent</label>
          <select
            className="w-full bg-gray-700 rounded p-2 text-sm"
            value={selectedAccent}
            onChange={(e) => setSelectedAccent(e.target.value)}
          >
            {availableAccents.map((accent) => (
              <option key={accent} value={accent}>
                {getAccentDisplayName(accent)}
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-400 mt-1">
            {selectedAccent && `Using ${getAccentDisplayName(selectedAccent)} accent`}
          </div>
        </div>

        {/* Speech Speed */}
        <div className="mb-6">
          <label className="block mb-1 text-sm">Speech Speed</label>
          <div className="flex items-center">
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full mr-2"
            />
            <span className="text-sm">{speed.toFixed(1)}</span>
          </div>
        </div>

        <div className="mt-auto">
          <div className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
            <Settings size={16} />
            <span>Settings</span>
          </div>
          <div className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
            <Languages size={16} />
            <span>Languages</span>
          </div>
          <div className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded cursor-pointer">
            <Music size={16} />
            <span>My Voices</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-2">OpenVoice Text-to-Speech App</h1>
        <p className="text-gray-600 mb-6">Enter text and select voice options to generate speech.</p>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-6">
            <label className="block mb-2 font-medium">Text to convert to speech</label>
            <textarea
              className="w-full border rounded p-3 h-32"
              placeholder="Enter text here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2">Emotion</label>
            <select
              className="w-full p-2 border rounded"
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
            >
              {emotionOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Voice Type Selection */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-4 mb-4">
              <button
                className={`px-4 py-2 rounded ${activeTab === "preset" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                onClick={() => {
                  setActiveTab("preset");
                  setUserVoice(""); // Clear user voice when switching to preset
                }}
              >
                Use preset voice
              </button>

              <button
                className={`px-4 py-2 rounded ${activeTab === "user" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                onClick={() => {
                  setActiveTab("user");
                  setPresetVoice(""); // Clear preset voice when switching to user
                }}
              >
                Use my uploaded voice
              </button>
            </div>

            {activeTab === "preset" ? (
              <div className="p-4 border rounded">
                <select
                  className="w-full p-2 border rounded"
                  value={presetVoice}
                  onChange={(e) => setPresetVoice(e.target.value)}
                >
                  <option value="">-- Select Preset Voice --</option>
                  {presetVoices.map((voice) => (
                    <option key={voice} value={voice}>{voice}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-4 border rounded">
                <div className="flex space-x-2">
                  <select
                    className="flex-1 p-2 border rounded"
                    value={userVoice}
                    onChange={(e) => setUserVoice(e.target.value)}
                  >
                    <option value="">-- Select Your Voice --</option>
                    {userVoices.map((voice) => (
                      <option key={voice} value={voice}>{voice}</option>
                    ))}
                  </select>
                  <button
                    className="bg-gray-200 px-3 py-2 rounded flex items-center"
                    onClick={fetchUserVoices}
                  >
                    <RefreshCw size={16} className="mr-1" />
                    Refresh
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*"
              className="hidden"
            />
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
              onClick={() => fileInputRef.current.click()}
            >
              <FileAudio size={36} className="mx-auto mb-2 text-gray-400" />
              <p className="font-medium mb-2">Upload Reference Voice (5-10 seconds of clear speech)</p>
              <p className="text-sm text-gray-500">Drop File Here<br />- or -<br />Click to Upload</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button
              className="flex items-center bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
              title="Record voice reference"
            >
              <Mic className="mr-2" size={18} /> Record
            </button>
            <button
              className="flex items-center bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
              onClick={() => fileInputRef.current.click()}
              title="Upload audio file"
            >
              <Upload className="mr-2" size={18} /> Upload Audio
            </button>
            <button
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
              onClick={handleGenerateSpeech}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Generate Speech"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-3">Generated Speech</h3>
            {generatedAudio ? (
              <div className="border rounded p-4 flex justify-center">
                <audio controls src={generatedAudio} className="w-full" />
              </div>
            ) : (
              <div className="border rounded p-12 flex justify-center items-center text-gray-400">
                <FileAudio size={48} />
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-3">Status</h3>
            <div className="border rounded p-4 min-h-16">
              {status || "Ready"}
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-3">About OpenVoice</h2>
          <p className="mb-3">
            This app uses OpenVoice, a versatile voice cloning system that can preserve
            expressive, singing, and stylistic characteristics of a target voice.
          </p>

          <h3 className="text-lg font-medium mb-2">How to use:</h3>
          <ol className="list-decimal pl-5 mb-4">
            <li className="mb-1">Enter the text you want to convert to speech</li>
            <li className="mb-1">Adjust language, accent and speech settings from the sidebar</li>
            <li className="mb-1">Select a preset voice or upload and use your own voice sample</li>
            <li className="mb-1">Choose an emotion style for the speech</li>
            <li className="mb-1">Click "Generate Speech" to create the audio</li>
          </ol>
          
          <p className="text-sm text-gray-500 mt-4">
            Different accents can significantly change how the output sounds. Try experimenting with
            different combinations of accent, emotion, and voice to get your perfect result.
          </p>
        </div>
      </div>
    </div>
  );
}