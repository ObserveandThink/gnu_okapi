
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSpaceContext } from '@/contexts/SpaceContext';
import { toast } from '@/hooks/use-toast';

interface UseClockProps {
  spaceId: string;
  initialClockInTime: Date | null;
  initialIsClockedIn: boolean;
}

interface UseClockReturn {
  isClockedIn: boolean;
  clockInStartTime: Date | null;
  currentSessionElapsedTime: number;
  handleClockIn: () => Promise<void>;
  handleClockOut: (sessionPoints: number) => Promise<void>; // Accept sessionPoints for toast
}

export function useClock({ spaceId, initialClockInTime, initialIsClockedIn }: UseClockProps): UseClockReturn {
  const { currentSpace, addLogEntry, addClockedTime } = useSpaceContext();
  const [isClockedIn, setIsClockedIn] = useState<boolean>(initialIsClockedIn);
  const [clockInStartTime, setClockInStartTime] = useState<Date | null>(initialClockInTime);
  const [currentSessionElapsedTime, setCurrentSessionElapsedTime] = useState(0);
  const [timerIntervalId, setTimerIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (isClockedIn && clockInStartTime) {
      const intervalId = setInterval(() => {
        setCurrentSessionElapsedTime(Math.floor((new Date().getTime() - clockInStartTime.getTime()) / 1000));
      }, 1000);
      setTimerIntervalId(intervalId);
      // Initial calculation
      setCurrentSessionElapsedTime(Math.floor((new Date().getTime() - clockInStartTime.getTime()) / 1000));

      return () => clearInterval(intervalId);
    } else {
      setCurrentSessionElapsedTime(0);
      if (timerIntervalId) clearInterval(timerIntervalId);
    }
  }, [isClockedIn, clockInStartTime]);

  const handleClockIn = useCallback(async () => {
    if (!currentSpace || isClockedIn) return;
    const now = new Date();
    setIsClockedIn(true);
    setClockInStartTime(now);
    localStorage.setItem(`clockInTime-${spaceId}`, now.toISOString());
    await addLogEntry({ spaceId: currentSpace.id, actionName: 'Clock In', points: 0, type: 'clockIn' });
    toast({ title: 'Session Started!', description: 'Let the improvements begin!', className: 'bg-green-600/90 text-white border-green-700 font-mono' }); // HUD Style
  }, [currentSpace, addLogEntry, spaceId, isClockedIn]);

  const handleClockOut = useCallback(async (sessionPoints: number) => {
    if (!currentSpace || !clockInStartTime || !isClockedIn) return;
    const now = new Date();
    setIsClockedIn(false);
    localStorage.removeItem(`clockInTime-${spaceId}`);
    const minutesClocked = Math.floor((now.getTime() - clockInStartTime.getTime()) / (1000 * 60));
    await addClockedTime(currentSpace.id, minutesClocked);
    await addLogEntry({
      spaceId: currentSpace.id,
      actionName: 'Clock Out',
      points: 0,
      type: 'clockOut',
      clockInTime: clockInStartTime,
      clockOutTime: now,
      minutesClockedIn: minutesClocked,
    });
    setClockInStartTime(null);
    toast({ title: 'Session Ended!', description: `Time: ${minutesClocked} min. Points: ${sessionPoints}. Great work!`, className: 'bg-blue-600/90 text-white border-blue-700 font-mono' }); // HUD Style
  }, [currentSpace, addLogEntry, addClockedTime, clockInStartTime, spaceId, isClockedIn]);

  return {
    isClockedIn,
    clockInStartTime,
    currentSessionElapsedTime,
    handleClockIn,
    handleClockOut,
  };
}
