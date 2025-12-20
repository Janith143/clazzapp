import React, { useEffect, useRef, useState } from 'react';
import { User } from '../types';
import { FullscreenIcon, PlayIcon, PauseIcon, StopIcon, RewindIcon, ForwardIcon } from './Icons';

// TypeScript definitions for the YouTube IFrame Player API.
// This prevents TypeScript errors when accessing `window.YT`.
declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: {
      Player: any;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
  }
}

interface YouTubePlayerProps {
  videoId: string;
  currentUser: User | null;
}

// A static ID for the div that the YouTube API will replace with an iframe.
const PLAYER_DIV_ID = 'youtube-player-container';

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId, currentUser }) => {
  const playerRef = useRef<any | null>(null);
  const playerWrapperRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [securityPaused, setSecurityPaused] = useState(false);
  const [analysisPaused, setAnalysisPaused] = useState(false);
  const analysisIntervalRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    if (currentUser && isPlaying) {
      const timer = setInterval(() => {
        setCurrentTime(new Date().toLocaleString());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentUser, isPlaying]);

  const watermarkText = currentUser ? `${currentUser.firstName} ${currentUser.lastName} (${currentUser.id}) - ${currentTime}` : '';


  useEffect(() => {
    // This function creates the YT Player instance. It's called when the API is ready.
    const createPlayer = () => {
      if (!window.YT) return; // Guard against race conditions

      console.log(`[YouTubePlayer.tsx] Creating player for videoId: ${videoId}`);
      // Ensure any existing player is destroyed before creating a new one.
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player(PLAYER_DIV_ID, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          mute: 0, // Unmuted by default
          loop: 1,
          playlist: videoId, // Required for the loop parameter to work
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            console.log("[YouTubePlayer.tsx] Player is ready.");
            playerRef.current?.setVolume(100); // Set volume to max
            setIsReady(true);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT!.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else {
              // Covers PAUSED, ENDED, BUFFERING etc.
              setIsPlaying(false);
            }
          },
        },
      });
    };

    // Set the global callback function for the YouTube API.
    // This is reassigned on each render to ensure the `createPlayer` function
    // has the correct `videoId` in its closure.
    window.onYouTubeIframeAPIReady = createPlayer;

    // If the YouTube IFrame API script is already loaded, create the player immediately.
    // Otherwise, load the script.
    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      // Avoid adding multiple script tags to the document.
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        console.log("[YouTubePlayer.tsx] Loading YouTube IFrame API script.");
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
    }

    // Cleanup: destroy the player instance when the component unmounts or videoId changes.
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
      console.log("[YouTubePlayer.tsx] Player destroyed on cleanup.");
    };
  }, [videoId]);

  // Effect for screen recording detection
  useEffect(() => {
    const handlePotentialRecording = () => {
      if (isPlaying) {
        console.warn('[Security] Potential screen recording detected (Focus Lost). Pausing video.');
        playerRef.current?.pauseVideo();
        setSecurityPaused(true);
      }
    };

    const handleReturnToView = () => {
      if (securityPaused) {
        console.log('[Security] User returned to view.');
        setSecurityPaused(false);
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handlePotentialRecording();
      } else {
        handleReturnToView();
      }
    };

    window.addEventListener('blur', handlePotentialRecording);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleReturnToView);

    return () => {
      window.removeEventListener('blur', handlePotentialRecording);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleReturnToView);
    };
  }, [isPlaying, securityPaused]);

  // Effect for simulated active analysis
  useEffect(() => {
      const startAnalysis = () => {
          if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
          analysisIntervalRef.current = window.setInterval(() => {
              // Randomly trigger a security pause.
              // Average of 1 trigger every 5 minutes (2 times per 10 minutes).
              // Interval is 2.5s. 5 mins = 300s. 300 / 2.5 = 120 intervals.
              // Probability per interval = 1/120.
              if (Math.random() < (1 / 120)) { 
                  console.warn('[Security] Active analysis detected potential screen capture. Pausing video.');
                  playerRef.current?.pauseVideo();
                  setAnalysisPaused(true);
                  if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
              }
          }, 2500); // Run check every 2.5 seconds
      };

      const stopAnalysis = () => {
          if (analysisIntervalRef.current) {
              clearInterval(analysisIntervalRef.current);
              analysisIntervalRef.current = null;
          }
      };
      
      if (isPlaying && !securityPaused && !analysisPaused) {
          startAnalysis();
      } else {
          stopAnalysis();
      }

      return () => stopAnalysis();
  }, [isPlaying, securityPaused, analysisPaused]);


  if (!videoId) {
    return (
      <div className="aspect-video w-full rounded-lg bg-black flex items-center justify-center">
        <p className="text-red-500">Invalid YouTube Video ID provided.</p>
      </div>
    );
  }

  const handlePlay = () => {
    setAnalysisPaused(false); // Reset analysis flag on manual play
    playerRef.current?.playVideo();
  };

  const handlePause = () => {
    playerRef.current?.pauseVideo();
  };
  
  const handleStop = () => {
    playerRef.current?.stopVideo();
  };

  const handleRewind = () => {
    if (!playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime() || 0;
    const newTime = Math.max(0, currentTime - 10);
    playerRef.current.seekTo(newTime, true);
  };

  const handleForward = () => {
    if (!playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime() || 0;
    const duration = playerRef.current.getDuration() || 0;
    const newTime = Math.min(duration, currentTime + 10);
    playerRef.current.seekTo(newTime, true);
  };

  const handleFullscreen = () => {
    const wrapper = playerWrapperRef.current;
    if (wrapper) {
      if (wrapper.requestFullscreen) {
        wrapper.requestFullscreen();
      } else if ((wrapper as any).mozRequestFullScreen) { // Firefox
        (wrapper as any).mozRequestFullScreen();
      } else if ((wrapper as any).webkitRequestFullscreen) { // Chrome, Safari, Opera
        (wrapper as any).webkitRequestFullscreen();
      } else if ((wrapper as any).msRequestFullscreen) { // IE/Edge
        (wrapper as any).msRequestFullscreen();
      }
    }
  };


  return (
    <div>
      <div 
        ref={playerWrapperRef}
        className="relative aspect-video w-full rounded-lg bg-black shadow-2xl overflow-hidden">
        {/* This div is the mount point for the YouTube IFrame Player */}
        <div id={PLAYER_DIV_ID} className="absolute top-0 left-0 w-full h-full"></div>
        
        {/* This overlay prevents all interaction with the iframe, including right-clicks, and displays the watermark */}
        <div
          className="absolute top-0 left-0 w-full h-full overflow-hidden"
          onContextMenu={(e) => e.preventDefault()}
        >
          {isPlaying && currentUser && (
            <>
                <div
                    className="absolute text-white/30 text-xl font-mono whitespace-nowrap select-none pointer-events-none"
                    style={{ animation: 'flow-watermark 20s linear infinite', animationDelay: '0s' }}
                >
                    {watermarkText}
                </div>
                <div
                    className="absolute text-white/30 text-xl font-mono whitespace-nowrap select-none pointer-events-none"
                    style={{ animation: 'flow-watermark-reverse 18s linear infinite', animationDelay: '-10s' }}
                >
                    {watermarkText}
                </div>
                <div
                    className="absolute text-white/30 text-xl font-mono whitespace-nowrap select-none pointer-events-none"
                    style={{ animation: 'flow-watermark 22s linear infinite', animationDelay: '-5s' }}
                >
                    {watermarkText}
                </div>
            </>
          )}
        </div>

        {/* Security Warning Overlay */}
        {(securityPaused || analysisPaused) && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center p-4 z-10 transition-opacity duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-2xl font-bold text-yellow-400 mt-4">Playback Paused</h3>
            {analysisPaused ? (
               <p className="text-gray-300 mt-2 max-w-md">
                Active security monitoring has detected a potential screen recording threat. Playback has been stopped.
              </p>
            ) : (
               <p className="text-gray-300 mt-2 max-w-md">
                For security reasons, video playback is paused when the tab is not active.
                <br />
                Please use the controls to resume.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Custom Controls */}
      <div className="flex justify-center items-center flex-wrap gap-2 mt-6">
        <button
          onClick={handleRewind}
          disabled={!isReady}
          aria-label="Rewind 10 seconds"
          className="w-28 flex items-center justify-center gap-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
        >
          <RewindIcon className="h-6 w-6" />
          <span>Rewind</span>
        </button>

        <button
          onClick={handlePlay}
          disabled={isPlaying || !isReady}
          aria-label="Play video"
          className="w-28 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75"
        >
          <PlayIcon className="h-6 w-6" />
          <span>Play</span>
        </button>

        <button
          onClick={handlePause}
          disabled={!isPlaying || !isReady}
          aria-label="Pause video"
          className="w-28 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75"
        >
          <PauseIcon className="h-6 w-6" />
          <span>Pause</span>
        </button>

        <button
          onClick={handleStop}
          disabled={!isReady} 
          aria-label="Stop video"
          className="w-28 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
        >
          <StopIcon className="h-6 w-6" />
          <span>Stop</span>
        </button>

        <button
          onClick={handleForward}
          disabled={!isReady}
          aria-label="Forward 10 seconds"
          className="w-28 flex items-center justify-center gap-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
        >
          <ForwardIcon className="h-6 w-6" />
          <span>Forward</span>
        </button>
        <button
          onClick={handleFullscreen}
          disabled={!isReady}
          aria-label="Enter fullscreen"
          className="w-28 flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
        >
          <FullscreenIcon className="h-6 w-6" />
          <span>Fullscreen</span>
        </button>
      </div>
    </div>
  );
};
