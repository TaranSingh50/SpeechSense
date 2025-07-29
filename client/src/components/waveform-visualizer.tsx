import { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  audioData?: number[];
  events?: Array<{
    timestamp: string;
    type: string;
    duration: number;
  }>;
  height?: number;
}

export function WaveformVisualizer({ 
  audioData, 
  events = [],
  height = 128 
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, height);

    if (audioData && audioData.length > 0) {
      // Draw actual waveform data
      drawWaveform(ctx, audioData, rect.width, height, events);
    } else {
      // Draw sample waveform
      drawSampleWaveform(ctx, rect.width, height, events);
    }
  }, [audioData, events, height]);

  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    data: number[],
    width: number,
    height: number,
    events: any[]
  ) => {
    const barWidth = width / data.length;
    const centerY = height / 2;

    data.forEach((value, index) => {
      const barHeight = Math.abs(value) * centerY;
      const x = index * barWidth;
      
      // Check if this position has an event
      const hasEvent = events.some(event => {
        const eventPosition = parseEventTimestamp(event.timestamp);
        const dataPosition = index / data.length;
        return Math.abs(eventPosition - dataPosition) < 0.02; // 2% tolerance
      });

      ctx.fillStyle = hasEvent ? '#ED8936' : '#2C5F5D'; // warm-orange for events, medical-teal for normal
      ctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight * 2);
    });
  };

  const drawSampleWaveform = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    events: any[]
  ) => {
    const sampleData = generateSampleWaveform(60); // 60 sample points
    const barWidth = width / sampleData.length;
    const centerY = height / 2;

    sampleData.forEach((value, index) => {
      const barHeight = value * centerY * 0.8;
      const x = index * barWidth;
      
      // Simulate event positions (based on sample events)
      const hasEvent = index === 15 || index === 25 || index === 45; // Sample event positions

      ctx.fillStyle = hasEvent ? '#ED8936' : '#2C5F5D';
      ctx.fillRect(x, centerY - barHeight, Math.max(barWidth - 1, 2), barHeight * 2);
    });

    // Add time markers
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('0:00', 5, height - 5);
    ctx.textAlign = 'center';
    ctx.fillText('1:52', width / 2, height - 5);
    ctx.textAlign = 'right';
    ctx.fillText('3:45', width - 5, height - 5);
  };

  const generateSampleWaveform = (length: number): number[] => {
    return Array.from({ length }, (_, i) => {
      // Create a more realistic waveform pattern
      const t = i / length;
      return (
        Math.sin(t * Math.PI * 4) * 0.5 + 
        Math.sin(t * Math.PI * 12) * 0.3 + 
        Math.sin(t * Math.PI * 20) * 0.2 +
        (Math.random() - 0.5) * 0.1
      );
    });
  };

  const parseEventTimestamp = (timestamp: string): number => {
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 2) {
      return (parts[0] * 60 + parts[1]) / 225; // Assuming 3:45 total duration
    }
    return 0;
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg bg-gray-100"
        style={{ height: `${height}px` }}
      />
      <div className="absolute top-2 left-2 text-xs text-gray-500">
        Audio Waveform with Stuttering Events
      </div>
      {events.length > 0 && (
        <div className="absolute top-2 right-2 flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-medical-teal rounded"></div>
            <span className="text-gray-500">Normal Speech</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-warm-orange rounded"></div>
            <span className="text-gray-500">Events</span>
          </div>
        </div>
      )}
    </div>
  );
}
