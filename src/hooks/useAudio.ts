import { useState, useEffect, useRef } from "react";

export const useAudio = (audioPath: string) => {
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioPath);
    audio.loop = true;
    audio.volume = 0.25;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioPath]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (hasInteracted && !isMuted) {
        audioRef.current
          .play()
          .catch((error) => console.error("Audio play failed:", error));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isMuted, hasInteracted]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!audioRef.current) return;
      if (document.hidden) {
        audioRef.current.pause();
      } else {
        if (hasInteracted && !isMuted) {
          audioRef.current
            .play()
            .catch((error) =>
              console.error("Audio play failed on visibility change:", error)
            );
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasInteracted, isMuted]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!hasInteracted) {
      setHasInteracted(true);
    }
  };

  const triggerInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
  };

  return { isMuted, toggleMute, triggerInteraction };
};
