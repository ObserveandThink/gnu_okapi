/**
 * @fileOverview Component for displaying log entries.
 */
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTime } from '@/utils/dateUtils';
import type { LogEntry } from '@/core/domain/LogEntry';

interface LogDisplayProps {
    logEntries: LogEntry[];
    isLoading: boolean;
    onShowDetailsClick: () => void;
}

export const LogDisplay: React.FC<LogDisplayProps> = ({
    logEntries,
    isLoading,
    onShowDetailsClick,
}) => {
    const latestLog = logEntries.length > 0 ? logEntries[0] : null;

    return (
        <div className="mt-3 w-full max-w-4xl">
             <div className="flex justify-between items-center mb-1">
                <h2 className="text-base font-bold">Log</h2>
                 <Button
                    variant="link"
                    size="sm"
                    className="text-xs h-auto px-1 py-0"
                    onClick={onShowDetailsClick}
                    disabled={isLoading || logEntries.length === 0}
                 >
                     See All ({logEntries.length})
                 </Button>
            </div>

            {isLoading && logEntries.length === 0 && <Skeleton className="h-6 w-full" />}
            {!isLoading && (
                 <div className="text-xs text-muted-foreground">
                    {latestLog ? (
                        <span>
                            Latest: {latestLog.actionName} at {formatTime(latestLog.timestamp)}
                            {latestLog.points > 0 ? ` (+${latestLog.points} AP)` : ''}
                            {latestLog.type === 'clockOut' && latestLog.minutesClockedIn !== undefined ? ` (${latestLog.minutesClockedIn} min)`: ''}
                        </span>
                    ) : (
                        <span>No log entries yet.</span>
                    )}
                 </div>
            )}
        </div>
    );
};
