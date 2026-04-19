import React, { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { BrainCircuit, Mic, Square, UploadCloud, Zap } from "lucide-react";
import { shouldSubmitTextShortcut } from "../utils/input";

interface DropzoneProps {
  subjectControl?: ReactNode;
  onImageSelected: (file: File) => void;
  onTextPasted: (text: string) => void;
  onQuickSubmit?: (text: string) => void;
  onDeepSubmit?: (text: string) => void;
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
  subjectControl,
  onImageSelected,
  onTextPasted,
  onQuickSubmit,
  onDeepSubmit,
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<number | null>(null);
  const liveTranscriptRef = useRef("");
  const deliveredTranscriptRef = useRef(false);

  const cleanupMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
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

  const handleTextSubmit = (mode: "fast" | "deep" | "preview" = "fast") => {
    const text = textInput.trim();
    if (text) {
      if (mode === "fast" && onQuickSubmit) {
        onQuickSubmit(text);
        return;
      }

      if (mode === "deep" && onDeepSubmit) {
        onDeepSubmit(text);
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
      handleTextSubmit("fast");
    }

    if (e.key === "Enter" && e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleTextSubmit("deep");
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
        stream.getTracks().forEach((track) => {
          track.stop();
        });
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

  const focusTextarea = () => {
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
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

      <section
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label="Question input panel"
        className={`flex flex-col overflow-hidden rounded-[1.4rem] border border-(--aqs-ink)/10 bg-white/62 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/50 md:rounded-[1.6rem] ${
          isDragging
            ? "border-(--aqs-accent) ring-4 ring-[color:rgba(139,30,63,0.1)]"
            : ""
        }`}
      >
        {/* Toolbar: upload, voice, subject, paste hint */}
        <div className="flex items-center gap-2 border-b border-(--aqs-ink)/8 bg-(--aqs-paper-strong) px-2.5 py-2 dark:border-white/10 dark:bg-slate-950/40 md:px-4 md:py-2.5">
          <button
            type="button"
            onClick={triggerFilePicker}
            className="inline-flex items-center gap-1.5 rounded-full border border-(--aqs-ink)/10 bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-(--aqs-ink) transition hover:border-(--aqs-accent)/25 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 md:px-3 md:text-xs"
          >
            <UploadCloud className="h-3.5 w-3.5 text-(--aqs-accent)" />
            Image
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
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition disabled:opacity-50 md:px-3 md:text-xs ${
                isListening
                  ? "border-(--aqs-accent) bg-[var(--aqs-accent)] text-white"
                  : "border-(--aqs-ink)/10 bg-white text-(--aqs-ink) dark:border-white/10 dark:bg-slate-900 dark:text-white"
              }`}
            >
              {isListening ? <Square className="h-3.5 w-3.5 fill-white" /> : <Mic className="h-3.5 w-3.5 text-(--aqs-accent)" />}
              {isListening ? "Stop" : "Voice"}
            </button>
          ) : null}

          {subjectControl ? <div className="ml-auto shrink-0">{subjectControl}</div> : null}

          <div className="hidden items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 md:flex">
            <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            Paste or drop
          </div>
        </div>

        {/* Textarea */}
        <div className="relative px-2.5 py-2 md:px-4 md:py-3">
          <textarea
            ref={textareaRef}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or paste your question..."
            className="block w-full resize-none bg-transparent text-[0.95rem] font-medium leading-snug text-(--aqs-ink) outline-none placeholder:text-slate-400 dark:text-white min-h-[4.5rem] max-h-[28dvh] min-[380px]:min-h-[5rem] md:max-h-[32dvh] md:min-h-[7rem] md:text-base md:leading-relaxed"
          />

          {/* Clickable focus overlay when textarea is empty */}
          {!textInput.trim() ? (
            <div
              className="absolute inset-0 cursor-text"
              onClick={focusTextarea}
              aria-hidden="true"
            />
          ) : null}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 border-t border-(--aqs-ink)/5 px-2.5 py-2 dark:border-white/8 md:grid-cols-[minmax(0,1fr)_10rem] md:px-4 md:py-2.5">
          <button
            type="button"
            onClick={() => handleTextSubmit("fast")}
            disabled={!textInput.trim()}
            className="flex items-center justify-center gap-2 rounded-[1rem] bg-[var(--aqs-accent)] px-3 py-2.5 text-sm font-black text-white transition-all hover:bg-(--aqs-accent-strong) disabled:bg-[rgba(139,30,63,0.34)] disabled:text-white/90 md:rounded-[1.1rem] md:py-3 md:text-base"
          >
            <Zap className="h-3.5 w-3.5 text-white md:h-4 md:w-4" />
            Fast
          </button>
          <button
            type="button"
            onClick={() => handleTextSubmit("deep")}
            disabled={!textInput.trim()}
            className="flex items-center justify-center rounded-[1rem] border border-(--aqs-ink)/10 bg-white px-3 py-2.5 text-sm font-black text-(--aqs-ink) transition-all hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-950 dark:disabled:bg-slate-900 dark:disabled:text-slate-500 md:rounded-[1.1rem] md:py-3 md:text-base"
          >
            <BrainCircuit className="h-3.5 w-3.5 text-(--aqs-accent) md:h-4 md:w-4" />
            Deep
          </button>
        </div>

        {voiceStatus ? (
          <div className="flex items-center gap-3 border-t border-(--aqs-ink)/5 px-4 py-2.5 dark:border-white/8">
            <div className="flex h-3 w-3 items-center justify-center">
              <div className="absolute h-3 w-3 animate-ping rounded-full bg-(--aqs-accent) opacity-75" />
              <div className="relative h-2 w-2 rounded-full bg-(--aqs-accent)" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-(--aqs-accent-strong) dark:text-(--aqs-accent-dark)">
              {voiceStatus}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
