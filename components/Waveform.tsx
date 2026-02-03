import { useEffect, useRef, useState, FC } from 'react';

// Global cache to store analyzed waveforms (peaks) by asset ID
// This prevents expensive re-decoding of audio data on every render/zoom
const waveformCache = new Map<string, number[]>();
const processingQueue = new Map<string, Promise<number[]>>();

interface WaveformProps {
  assetId: string;
  url?: string;
  width: number;
  height: number;
  offset: number; // Start time in the source asset
  duration: number; // Duration of the clip
  color?: string;
  type?: 'audio' | 'video';
}

const SAMPLES_PER_SECOND = 50; // Resolution of the waveform

export const Waveform: FC<WaveformProps> = ({
  assetId,
  url,
  width,
  height,
  offset,
  duration,
  color = 'rgba(255, 255, 255, 0.8)',
  type = 'audio'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<number[] | null>(waveformCache.get(assetId) || null);

  // 1. Fetch and Analyze Audio (if not cached)
  useEffect(() => {
    if (!url) return;

    // Check Cache
    if (waveformCache.has(assetId)) {
        setPeaks(waveformCache.get(assetId)!);
        return;
    }

    // Check Queue
    if (processingQueue.has(assetId)) {
      processingQueue.get(assetId)?.then(data => setPeaks(data)).catch(() => setPeaks([]));
      return;
    }

    const processAudio = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const arrayBuffer = await response.arrayBuffer();
        
        if (arrayBuffer.byteLength === 0) {
            return [];
        }
        
        // Use OfflineAudioContext for decoding which is often more stable for non-realtime
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        
        // decodeAudioData can fail if the file is a video without audio tracks
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0); // Use first channel (mono mixdown)
        const totalDuration = audioBuffer.duration;
        const totalSamples = Math.floor(totalDuration * SAMPLES_PER_SECOND);
        const blockSize = Math.floor(channelData.length / totalSamples);
        
        const calculatedPeaks: number[] = [];
        
        for (let i = 0; i < totalSamples; i++) {
          const start = i * blockSize;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            if (start + j < channelData.length) {
                sum += Math.abs(channelData[start + j]);
            }
          }
          calculatedPeaks.push(sum / blockSize);
        }

        // Normalize
        const max = Math.max(...calculatedPeaks, 0.01); // Avoid div by zero
        const normalizedPeaks = calculatedPeaks.map(p => p / max);

        waveformCache.set(assetId, normalizedPeaks);
        return normalizedPeaks;
      } catch (e) {
        // If decoding fails (common for mute videos), cache empty array to stop retrying
        // console.debug(`Waveform: No audio track found or decode failed for ${assetId}`);
        waveformCache.set(assetId, []);
        return [];
      } finally {
        processingQueue.delete(assetId);
      }
    };

    const promise = processAudio();
    processingQueue.set(assetId, promise);
    promise.then(data => {
        // Only update if component is still mounted logic handled by React state
        setPeaks(data);
    });

  }, [assetId, url]);

  // 2. Draw Waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks || peaks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Calculate Slice
    // We need to map [offset, offset + duration] to [0, width]
    const startIndex = Math.floor(offset * SAMPLES_PER_SECOND);
    const endIndex = Math.ceil((offset + duration) * SAMPLES_PER_SECOND);
    
    // Safety check
    const slicedPeaks = peaks.slice(Math.max(0, startIndex), Math.min(peaks.length, endIndex));
    
    if (slicedPeaks.length === 0) return;

    // Drawing Parameters
    const barWidth = width / slicedPeaks.length;
    const centerY = height / 2;
    const maxBarHeight = type === 'audio' ? height * 0.8 : height * 0.4; // Video waveforms are smaller

    ctx.fillStyle = color;
    ctx.beginPath();

    slicedPeaks.forEach((peak, index) => {
      const x = index * barWidth;
      const barHeight = Math.max(1, peak * maxBarHeight);
      
      // Draw centered bar (rounded caps look nicer, but rect is faster)
      ctx.rect(x, centerY - barHeight / 2, Math.max(1, barWidth - 1), barHeight);
    });

    ctx.fill();

  }, [peaks, width, height, offset, duration, color, type]);

  if (!peaks) {
      // Loading State (Subtle pulse)
      return (
          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
              <div className="w-full h-[1px] bg-white animate-pulse" />
          </div>
      );
  }

  return (
    <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        className="absolute inset-0 pointer-events-none opacity-80"
    />
  );
};