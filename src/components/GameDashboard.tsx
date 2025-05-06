
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatElapsedTime } from '@/utils/dateUtils';
import type { Space } from '@/core/domain/Space';

interface GameDashboardProps {
  currentSpace: Space | null;
  isClockedIn: boolean;
  currentSessionElapsedTime: number;
  totalPoints: number;
  sessionPoints: number;
  totalWastePoints: number;
  apPerCurrentSessionHour: number;
}

const GameDashboard: React.FC<GameDashboardProps> = ({
  currentSpace,
  isClockedIn,
  currentSessionElapsedTime,
  totalPoints,
  sessionPoints,
  totalWastePoints,
  apPerCurrentSessionHour,
}) => {
  if (!currentSpace) return null; // Or a loading state

  return (
    <Card className="mb-4 bg-black/40 backdrop-blur-md border border-white/20 shadow-xl rounded-lg">
      <CardContent className="p-2 grid grid-cols-3 gap-x-1 gap-y-1 text-xs text-center items-center font-mono uppercase tracking-wider">
        {/* Row 1 */}
        <div className="flex flex-col items-center p-1 bg-black/20 rounded">
          <span className="font-semibold text-yellow-400 text-[0.6rem]">Session</span>
          <span className={`font-mono text-lg ${isClockedIn ? 'animate-pulse text-green-400' : ''}`}>
            {formatElapsedTime(currentSessionElapsedTime)}
          </span>
        </div>
        <div className="flex flex-col items-center p-1 bg-black/20 rounded">
          <span className="font-semibold text-blue-400 text-[0.6rem]">Total</span>
          <span className="font-mono text-lg">{currentSpace.totalClockedInTime}<span className="text-xs"> min</span></span>
        </div>
        <div className="flex flex-col items-center p-1 bg-black/20 rounded">
          <span className="font-semibold text-green-400 text-[0.6rem]">AP</span>
          <span className="font-mono text-lg">{totalPoints.toFixed(0)}</span>
        </div>
        {/* Row 2 */}
        <div className="flex flex-col items-center p-1 bg-black/20 rounded">
          <span className="font-semibold text-orange-400 text-[0.6rem]">Sess AP</span>
          <span className="font-mono text-lg">{sessionPoints.toFixed(0)}</span>
        </div>
        <div className="flex flex-col items-center p-1 bg-black/20 rounded">
          <span className="font-semibold text-purple-400 text-[0.6rem]">AP/H</span>
          <span className="font-mono text-lg">{apPerCurrentSessionHour.toFixed(1)}</span>
        </div>
        <div className="flex flex-col items-center p-1 bg-black/20 rounded">
          <span className="font-semibold text-red-400 text-[0.6rem]">Waste</span>
          <span className="font-mono text-lg">{totalWastePoints}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default GameDashboard;
