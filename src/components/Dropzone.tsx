import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UploadCloud, Mic, Square } from 'lucide-react';

interface DropzoneProps {
  onImageSelected: (file: File) => void;
  onTextPasted: (text: string) => void;
  onError: (msg: string) => void;
  onVoiceInput?: (text: string) => void;
}

export function Dropzone({ onImageSelected, onTextPasted, onError, onVoiceInput }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    let foundImage = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          onImageSelected(file);
          foundImage = true;
          break;
        }
      }
    }

    if (!foundImage) {
      const textData = e.clipboardData?.getData('text');
      if (textData) {
        onTextPasted(textData);
      } else {
        onError("No image found. Try Cmd+Shift+4 (Mac) or Win+Shift+S (Windows) to screenshot.");
      }
    }
  }, [onImageSelected, onTextPasted, onError]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageSelected(file);
      } else {
        onError("Only image files are supported. Try taking a screenshot of the page.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImageSelected(files[0]);
    }
  };

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onError("Speech recognition is not supported in your browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript && onVoiceInput) {
        onVoiceInput(transcript);
      }
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      onError("Could not understand audio. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onError, onVoiceInput]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return (
    <div>
      <label 
        htmlFor="file-input"
        className={`block border-2 rounded-xl p-12 text-center cursor-pointer transition-all duration-200 min-h-[300px] neo-shadow ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 translate-x-[2px] translate-y-[2px] shadow-none' : 'border-gray-900 dark:border-gray-100 bg-white dark:bg-gray-900 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(17,24,39,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(243,244,246,1)]'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          id="file-input"
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-4 rounded-xl border-2 border-gray-900 dark:border-gray-100 neo-shadow-sm mb-6 inline-block">
          <UploadCloud className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 font-sans tracking-tight">Paste, drop, or click</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-8 font-mono text-sm">to upload a question</p>
        
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg border-2 border-gray-900 dark:border-gray-100 neo-shadow-sm justify-center">
          <span className="font-mono font-bold bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-900 dark:text-gray-100">Cmd+V</span>
          <span className="font-mono">works anywhere on page</span>
        </div>
      </label>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={!onVoiceInput}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all neo-shadow-sm ${
            isListening 
              ? 'bg-red-500 text-white border-2 border-red-700 hover:bg-red-600' 
              : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-100 border-2 border-gray-900 dark:border-gray-100 hover:-translate-y-0.5'
          } ${!onVoiceInput ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
        >
          {isListening ? (
            <>
              <Square className="w-5 h-5" />
              <span>Stop Listening</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>Voice Input</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}