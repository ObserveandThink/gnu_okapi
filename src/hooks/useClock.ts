/**
 * @fileOverview Custom hook for managing clock-in/out state and session timer.
 * Integrates with SpaceContext to load and persist clock state.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import type { LogEntry } from '@/core/domain/LogEntry'; // Assuming LogEntry type path
import type { Space } from '@/core/domain/Space'; // Import Space type
import { SpaceService } from '@/core/services/SpaceService'; // Import SpaceService
import { repositoryFactory } from '@/infrastructure/persistence/IndexedDBRepositoryFactory'; // Import factory

// Define types for the functions passed from context
type AddLogEntryFunc = (logEntryData: Omit<LogEntry, 'id' | 'timestamp'>) => Promise<LogEntry | undefined>;
type AddClockedTimeFunc = (spaceId: string, additionalMinutes: number) => Promise<void>;

// Instantiate SpaceService here or pass it in if needed elsewhere
const spaceService = new SpaceService(repositoryFactory.createSpaceRepository(), /* other service dependencies... */);

interface UseClockProps {
    currentSpace: Space | null; // Pass the current space object
    addLogEntry: AddLogEntryFunc;
    addClockedTime: AddClockedTimeFunc;
}

interface UseClockReturn {
    isClockedIn: boolean;
    currentSessionElapsedTime: number;
    clockInStartTime: Date | null;
    handleClockIn: () => Promise<void>;
    handleClockOut: () => Promise<void>;
    isClockLoading: boolean; // Loading state specific to clock actions
}

export const useClock = ({
    currentSpace,
    addLogEntry,
    addClockedTime
}: UseClockProps): UseClockReturn => {
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
        // Don't reset session timer display on stop, only when clocked out completely or initializing
        // setCurrentSessionElapsedTime(0);
    }, []);

    // Initialize state from currentSpace when it loads or changes
    useEffect(() => {
        if (currentSpace) {
            const initialIsClockedIn = currentSpace.isClockedIn ?? false;
            const initialStartTime = currentSpace.clockInStartTime ? new Date(currentSpace.clockInStartTime) : null;

            setIsClockedIn(initialIsClockedIn);
            setClockInStartTime(initialStartTime);

            if (initialIsClockedIn && initialStartTime) {
                startTimer(initialStartTime);
            } else {
                stopTimer();
                setCurrentSessionElapsedTime(0); // Reset timer if not clocked in
            }
             console.log("useClock initialized:", { initialIsClockedIn, initialStartTime });
        } else {
            // If currentSpace is null (e.g., navigating away), reset local state
            setIsClockedIn(false);
            setClockInStartTime(null);
            stopTimer();
            setCurrentSessionElapsedTime(0);
            console.log("useClock reset due to null currentSpace");
        }

        // Cleanup timer only when the component using the hook unmounts,
        // not necessarily when currentSpace changes if we want persistence across navigation.
        // However, since we re-initialize based on currentSpace, stopping here is okay.
        // If persistence *during* navigation is needed, this cleanup needs rethinking.
        // return () => {
        //     stopTimer();
        //     console.log("useClock cleanup ran.");
        // };
    }, [currentSpace, startTimer, stopTimer]);


    const handleClockIn = useCallback(async () => {
        if (!currentSpace?.id || isClockedIn || isClockLoading) return;
        setIsClockLoading(true);
        try {
            const now = new Date();
            await addLogEntry({ spaceId: currentSpace.id, actionName: 'Clock In', points: 0, type: 'clockIn' });
            await spaceService.setClockInState(currentSpace.id, now); // Persist state
            setIsClockedIn(true);
            setClockInStartTime(now);
            startTimer(now); // Start the timer
            toast({ title: 'Clocked In!', description: 'Start earning points!' });
             console.log("Clocked In:", now);
        } catch (error) {
            console.error("Clock In Error:", error);
            toast({ title: 'Clock In Failed', description: 'Could not save clock-in state.', variant: 'destructive' });
        } finally {
            setIsClockLoading(false);
        }
    }, [currentSpace, isClockedIn, isClockLoading, addLogEntry, startTimer]);

    const handleClockOut = useCallback(async () => {
        if (!currentSpace?.id || !isClockedIn || !clockInStartTime || isClockLoading) return;
        setIsClockLoading(true);
        try {
            const now = new Date();
            const timeDifference = now.getTime() - clockInStartTime.getTime();
            const minutesClockedInThisSession = Math.floor(timeDifference / (1000 * 60));

            // Only add time if it's more than 0 minutes
            if (minutesClockedInThisSession > 0) {
                 await addClockedTime(currentSpace.id, minutesClockedInThisSession);
            }

            await addLogEntry({
              spaceId: currentSpace.id,
              actionName: 'Clock Out',
              points: 0,
              type: 'clockOut',
              clockInTime: clockInStartTime,
              clockOutTime: now,
              minutesClockedIn: minutesClockedInThisSession,
            });

            await spaceService.clearClockInState(currentSpace.id); // Persist state

            setIsClockedIn(false);
            setClockInStartTime(null);
            stopTimer(); // Stop the timer
            // Keep currentSessionElapsedTime as is until component re-renders/initializes
            toast({ title: 'Clocked Out!', description: `Session time: ${minutesClockedInThisSession} min.` });
            console.log("Clocked Out:", now, "Session duration:", minutesClockedInThisSession);

        } catch (error) {
             console.error("Clock Out Error:", error);
             toast({ title: 'Clock Out Failed', description: 'Could not save clock-out state.', variant: 'destructive' });
        } finally {
            setIsClockLoading(false);
        }
    }, [currentSpace, isClockedIn, clockInStartTime, isClockLoading, addLogEntry, addClockedTime, stopTimer]);


    // No cleanup needed on unmount if we want the timer to potentially continue
    // across navigations (if state is managed globally or restored quickly).
    // If the timer should *always* stop on unmount, uncomment the cleanup in useEffect.

    return {
        isClockedIn,
        currentSessionElapsedTime,
        clockInStartTime,
        handleClockIn,
        handleClockOut,
        isClockLoading,
    };
};
