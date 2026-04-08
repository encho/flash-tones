import { createContext, useContext, useEffect, useRef, useState } from "react";

const MicContext = createContext<MediaStream | null>(null);

export function useMicStream(): MediaStream | null {
  return useContext(MicContext);
}

export function MicProvider({ children }: { children: React.ReactNode }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const acquiredRef = useRef(false);

  useEffect(() => {
    if (acquiredRef.current) return;
    acquiredRef.current = true;
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(setStream)
      .catch(() => {
        // Permission denied — cards will fall back to their own request
      });

    return () => {
      // Keep the stream alive across the app lifetime; only stop on unmount
      stream?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <MicContext.Provider value={stream}>{children}</MicContext.Provider>;
}
