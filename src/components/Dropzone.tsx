import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Square, UploadCloud, Zap } from "lucide-react";
import { shouldSubmitTextShortcut } from "../utils/input";

interface DropzoneProps {
  onImageSelected: (file: File) => void;
  onTextPasted: (text: string) => void;
  onQuickSubmit?: (text: string) => void;
  onError: (msg: string) => void;
  onVoiceInput?: (text: string) => void;
  onAudioTranscribe?: (audioBlob: Blob) => Promise<string>;
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT")
  );
}

export function Dropzone({
  onImageSelected,
  onTextPasted,
  onQuickSubmit,
  onError,
  onVoiceInput,
  onAudioTranscribe,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [textInput, setTextInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);
  const liveTranscriptRef = useRef("");
  const deliveredTranscriptRef = useRef(false);

  const cleanupMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const clearRecordingTimeout = useCallback(() => {
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  }, []);

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const editableTarget = isEditableTarget(e.target);
      let foundImage = false;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            onImageSelected(file);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        if (editableTarget) {
          return;
        }

        const textData = e.clipboardData?.getData("text");
        if (textData) {
          setTextInput(textData);
          onTextPasted(textData);
        } else {
          onError(
            "No image found. Try Cmd+Shift+4 (Mac) or Win+Shift+S (Windows) to screenshot.",
          );
        }
      }
    },
    [onImageSelected, onTextPasted, onError],
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
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
      if (file.type.startsWith("image/")) {
        onImageSelected(file);
      } else {
        onError(
          "Only image files are supported. Try taking a screenshot of the page.",
        );
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImageSelected(files[0]);
    }
    e.target.value = "";
  };

  const handleTextSubmit = (submitFast = true) => {
    const text = textInput.trim();
    if (text) {
      if (submitFast && onQuickSubmit) {
        onQuickSubmit(text);
        return;
      }

      onTextPasted(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      shouldSubmitTextShortcut({
        isComposing: e.nativeEvent.isComposing,
        key: e.key,
        shiftKey: e.shiftKey,
      })
    ) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  const startRecordingFallback = useCallback(async () => {
    if (isTranscribing || isListening) {
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      onError("Voice input is not supported in this browser.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError(
        "Microphone access is blocked. Allow microphone permission in your browser and try again.",
      );
      return;
    }

    const preferredMimeTypes = [
      "audio/ogg;codecs=opus",
      "audio/webm;codecs=opus",
      "audio/ogg",
      "audio/webm",
    ];
    const mimeType =
      preferredMimeTypes.find((type) =>
        MediaRecorder.isTypeSupported?.(type),
      ) ?? "";

    try {
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        clearRecordingTimeout();
        cleanupMediaStream();
        mediaRecorderRef.current = null;
        setIsListening(false);
        setIsTranscribing(false);
        setVoiceStatus("");
        onError(
          "Voice recording failed. Try again or check microphone permissions.",
        );
      };

      recorder.onstop = async () => {
        clearRecordingTimeout();
        const chunks = [...recordedChunksRef.current];
        recordedChunksRef.current = [];
        const outputMimeType = recorder.mimeType || mimeType || "audio/webm";

        cleanupMediaStream();
        mediaRecorderRef.current = null;
        setIsListening(false);

        if (!chunks.length) {
          setIsTranscribing(false);
          setVoiceStatus("");
          onError(
            "No speech was captured. Try again and speak a little closer to the microphone.",
          );
          return;
        }

        setIsTranscribing(true);
        setVoiceStatus("Transcribing...");
        try {
          if (!onAudioTranscribe) {
            throw new Error("No audio transcription handler configured.");
          }

          const transcript = await onAudioTranscribe(new Blob(chunks, { type: outputMimeType }));
          if (!transcript) {
            throw new Error("Empty transcript");
          }

          setIsTranscribing(false);
          setVoiceStatus("");
          onVoiceInput?.(transcript);
        } catch {
          setIsTranscribing(false);
          setVoiceStatus("");
          onError(
            "Voice transcription failed. Try a shorter recording and speak clearly.",
          );
        }
      };

      recorder.start(250);
      setIsListening(true);
      setVoiceStatus("Recording... tap the mic again to finish.");
      recordingTimeoutRef.current = window.setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          mediaRecorderRef.current.stop();
        }
      }, 45000);
    } catch {
      cleanupMediaStream();
      onError("Voice recording could not start in this browser.");
    }
  }, [
    cleanupMediaStream,
    clearRecordingTimeout,
    isListening,
    isTranscribing,
    onAudioTranscribe,
    onError,
    onVoiceInput,
  ]);

  const startListening = useCallback(async () => {
    if (isListening || isTranscribing) {
      return;
    }

    setVoiceStatus("Starting mic...");
    liveTranscriptRef.current = "";
    deliveredTranscriptRef.current = false;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      await startRecordingFallback();
      return;
    }

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        setVoiceStatus("");
        onError(
          "Microphone access is blocked. Allow microphone permission in your browser and try again.",
        );
        return;
      }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus("Listening...");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(
        { length: event.results.length },
        (_, index) => event.results[index]?.[0]?.transcript ?? "",
      )
        .join(" ")
        .trim();

      if (transcript) {
        liveTranscriptRef.current = transcript;
        setVoiceStatus(transcript);
      }

      const latestResult = event.results[event.resultIndex];
      if (latestResult?.isFinal && transcript) {
        deliveredTranscriptRef.current = true;
        setVoiceStatus("");
        setIsListening(false);
        recognition.stop();
        onVoiceInput?.(transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceStatus("");

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        onError(
          "Microphone access is blocked. Allow microphone permission in your browser and try again.",
        );
        return;
      }
      if (event.error === "audio-capture") {
        onError(
          "No microphone was detected. Connect a microphone and try again.",
        );
        return;
      }
      if (event.error === "no-speech") {
        onError(
          "No speech was detected. Try again and speak a little closer to the microphone.",
        );
        return;
      }
      if (event.error === "network" || event.error === "aborted") {
        void startRecordingFallback();
        return;
      }

      onError(
        "Live voice recognition failed in this browser. Try again or use the fallback recording flow.",
      );
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);

      if (!deliveredTranscriptRef.current && liveTranscriptRef.current.trim()) {
        const transcript = liveTranscriptRef.current.trim();
        liveTranscriptRef.current = "";
        setVoiceStatus("");
        onVoiceInput?.(transcript);
        return;
      }

      liveTranscriptRef.current = "";
      setVoiceStatus("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [
    isListening,
    isTranscribing,
    onError,
    onVoiceInput,
    startRecordingFallback,
  ]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setVoiceStatus(
        liveTranscriptRef.current ? "Using what I heard..." : "Stopping...",
      );
      return;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setVoiceStatus("Transcribing...");
      return;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearRecordingTimeout();
      recognitionRef.current?.abort();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      cleanupMediaStream();
    };
  }, [cleanupMediaStream, clearRecordingTimeout]);

  const triggerFilePicker = () => {
    const input = fileInputRef.current;
    if (!input) {
      return;
    }

    input.value = "";
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  };

  return (
    <div className="space-y-4">
      <input
        id="file-input"
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`studio-panel overflow-hidden bg-white/50 p-0 backdrop-blur-sm dark:bg-slate-900/50 ${
          isDragging
            ? "border-[var(--aqs-accent)] ring-4 ring-[color:rgba(139,30,63,0.1)]"
            : ""
        }`}
      >
        <div className="flex flex-col gap-4 border-b-2 border-[var(--aqs-border)] bg-[var(--aqs-paper-strong)] px-5 py-5 dark:bg-slate-950/40 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={triggerFilePicker}
              className="studio-card inline-flex items-center gap-2 bg-white px-5 py-2.5 text-sm font-black text-[var(--aqs-ink)] transition-all dark:bg-slate-900"
            >
              <UploadCloud className="h-4 w-4 text-[var(--aqs-accent)]" />
              Upload Image
            </button>

            {onVoiceInput ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void (isListening ? stopListening() : startListening());
                }}
                disabled={isTranscribing}
                className={`studio-card inline-flex items-center gap-2 px-5 py-2.5 text-sm font-black transition-all disabled:opacity-50 ${
                  isListening
                    ? "bg-[var(--aqs-accent)] text-white"
                    : "bg-white text-[var(--aqs-ink)] dark:bg-slate-900 dark:text-white"
                }`}
              >
                {isListening ? <Square className="h-4 w-4 fill-white" /> : <Mic className="h-4 w-4 text-[var(--aqs-accent)]" />}
                {isListening ? "Stop Now" : "Voice Solve"}
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            Paste / Drop Support
          </div>
        </div>

        <div className="px-5 py-6">
          <div className="neo-border-thin studio-focus rounded-3xl bg-white px-1 py-1 dark:bg-slate-950">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a complex problem, paste a screenshot, or use voice..."
              className="min-h-[160px] w-full resize-none rounded-2xl bg-transparent px-6 py-6 text-xl font-medium leading-relaxed text-[var(--aqs-ink)] outline-none placeholder:text-slate-400 dark:text-white md:min-h-[220px]"
            />
          </div>

          <div className="mt-8 flex flex-col gap-4 md:flex-row">
            <button
              type="button"
              onClick={() => handleTextSubmit()}
              disabled={!textInput.trim()}
              className="neo-border neo-shadow flex flex-1 items-center justify-center gap-3 rounded-[1.25rem] bg-[var(--aqs-accent)] py-5 text-lg font-black text-white transition-all hover:-translate-y-1 active:translate-y-px disabled:opacity-50"
            >
              <Zap className="h-5 w-5 fill-white" />
              Ask Mike Fast
            </button>
            <button
              type="button"
              onClick={() => handleTextSubmit(false)}
              disabled={!textInput.trim()}
              className="studio-card inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-[var(--aqs-ink)] dark:text-white"
            >
              Review Method
            </button>
          </div>

          {voiceStatus ? (
            <div className="mt-6 flex items-center gap-4 rounded-2xl bg-[var(--aqs-accent-soft)] p-4 dark:bg-[color:rgba(139,30,63,0.1)]">
              <div className="flex h-3 w-3 items-center justify-center">
                <div className="absolute h-3 w-3 animate-ping rounded-full bg-[var(--aqs-accent)] opacity-75" />
                <div className="relative h-2 w-2 rounded-full bg-[var(--aqs-accent)]" />
              </div>
              <div className="text-xs font-black uppercase tracking-widest text-[var(--aqs-accent-strong)] dark:text-[var(--aqs-accent-dark)]">
                {voiceStatus}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
