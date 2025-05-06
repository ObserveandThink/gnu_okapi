/**
 * @fileOverview Custom hook for managing clock-in/out state and session timer.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import type { LogEntry } from '@/core/domain/LogEntry'; // Assuming LogEntry type path

// Define types for the functions passed from context
type AddLogEntryFunc = (logEntryData: Omit<LogEntry, 'id' | 'timestamp'>) => Promise<LogEntry | undefined>;
type AddClockedTimeFunc = (spaceId: string, additionalMinutes: number) => Promise<void>;

interface UseClockReturn {
    isClockedIn: boolean;
    currentSessionElapsedTime: number;
    clockInStartTime: Date | null;
    handleClockIn: () => Promise<void>;
    handleClockOut: () => Promise<void>;
    isClockLoading: boolean; // Loading state specific to clock actions
}

export const useClock = (
    spaceId: string | null,
    addLogEntry: AddLogEntryFunc,
    addClockedTime: AddClockedTimeFunc
): UseClockReturn => {
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [clockInStartTime, setClockInStartTime] = useState<Date | null>(null);
    const [currentSessionElapsedTime, setCurrentSessionElapsedTime] = useState(0);
    const [isClockLoading, setIsClockLoading] = useState(false); // Loading state for clock actions
    const timerIntervalId = useRef<NodeJS.Timeout | null>(null);

    // Function to start the timer
    const startTimer = useCallback((startTime: Date) => {
        // Clear existing timer if any
        if (timerIntervalId.current) {
            clearInterval(timerIntervalId.current);
        }

        // Set initial elapsed time immediately
        const initialDifference = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        setCurrentSessionElapsedTime(initialDifference);


        // Start new interval
        timerIntervalId.current = setInterval(() => {
            const now = new Date();
            const timeDifference = now.getTime() - startTime.getTime();
            setCurrentSessionElapsedTime(Math.floor(timeDifference / 1000));
        }, 1000);
    }, []);

    // Function to stop the timer
    const stopTimer = useCallback(() => {
        if (timerIntervalId.current) {
            clearInterval(timerIntervalId.current);
            timerIntervalId.current = null;
        }
        setCurrentSessionElapsedTime(0); // Reset session timer display
    }, []);

    // Cleanup timer on unmount or when clocking out
    useEffect(() => {
        return () => {
            stopTimer();
        };
    }, [stopTimer]);


    const handleClockIn = useCallback(async () => {
        if (!spaceId || isClockedIn || isClockLoading) return;
        setIsClockLoading(true);
        try {
            const now = new Date();
            await addLogEntry({ spaceId, actionName: 'Clock In', points: 0, type: 'clockIn' });
            setIsClockedIn(true);
            setClockInStartTime(now);
            startTimer(now); // Start the timer
            toast({ title: 'Clocked In!', description: 'Start earning points!' });
        } catch (error) {
            console.error("Clock In Error:", error);
            toast({ title: 'Clock In Failed', description: 'Could not log clock-in event.', variant: 'destructive' });
        } finally {
            setIsClockLoading(false);
        }
    }, [spaceId, isClockedIn, isClockLoading, addLogEntry, startTimer]);

    const handleClockOut = useCallback(async () => {
        if (!spaceId || !isClockedIn || !clockInStartTime || isClockLoading) return;
        setIsClockLoading(true);
        try {
            const now = new Date();
            const timeDifference = now.getTime() - clockInStartTime.getTime();
            const minutesClockedInThisSession = Math.floor(timeDifference / (1000 * 60));

            // Only add time if it's more than 0 minutes
            if (minutesClockedInThisSession > 0) {
                 await addClockedTime(spaceId, minutesClockedInThisSession);
            }

            await addLogEntry({
              spaceId: spaceId,
              actionName: 'Clock Out',
              points: 0,
              type: 'clockOut',
              clockInTime: clockInStartTime,
              clockOutTime: now,
              minutesClockedIn: minutesClockedInThisSession,
            });

            setIsClockedIn(false);
            setClockInStartTime(null);
            stopTimer(); // Stop the timer
            toast({ title: 'Clocked Out!', description: `Session time: ${minutesClockedInThisSession} min.` });

        } catch (error) {
             console.error("Clock Out Error:", error);
             toast({ title: 'Clock Out Failed', description: 'Could not save session time.', variant: 'destructive' });
        } finally {
            setIsClockLoading(false);
        }
    }, [spaceId, isClockedIn, clockInStartTime, isClockLoading, addLogEntry, addClockedTime, stopTimer]);


    // Consider adding logic here to check the last log entry on mount
    // to determine initial clock state if the page reloads while clocked in.
    // This requires access to logEntries or a specific fetch function.
    // Example (needs context/fetch function):
    /*
    useEffect(() => {
        const checkInitialClockState = async () => {
            if (!spaceId) return;
            // Fetch the very latest log entry for the space
            const latestEntry = await fetchLatestLogEntry(spaceId); // Needs implementation
            if (latestEntry?.type === 'clockIn') {
                setIsClockedIn(true);
                const startTime = new Date(latestEntry.timestamp);
                setClockInStartTime(startTime);
                startTimer(startTime);
            } else {
                setIsClockedIn(false);
                setClockInStartTime(null);
            }
        };
        checkInitialClockState();
    }, [spaceId, startTimer]); // Run when spaceId changes
    */


    return {
        isClockedIn,
        currentSessionElapsedTime,
        clockInStartTime,
        handleClockIn,
        handleClockOut,
        isClockLoading,
    };
};
