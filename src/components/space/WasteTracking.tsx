/**
 * @fileOverview Component for displaying waste tracking information.
 */
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTime } from '@/utils/dateUtils';
import type { WasteEntry } from '@/core/domain/WasteEntry';

interface WasteTrackingProps {
    wasteEntries: WasteEntry[];
    totalWastePoints: number;
    isLoading: boolean;
    onAddWasteClick: () => void;
    onShowDetailsClick: () => void;
}

export const WasteTracking: React.FC<WasteTrackingProps> = ({
    wasteEntries,
    totalWastePoints,
    isLoading,
    onAddWasteClick,
    onShowDetailsClick,
}) => {
    const latestWaste = wasteEntries.length > 0 ? wasteEntries[0] : null;

    return (
        <div className="mt-3 w-full max-w-4xl">
            <div className="flex justify-between items-center mb-1">
                 <h2 className="text-base font-bold">Waste</h2>
                 <Button size="sm" onClick={onAddWasteClick} disabled={isLoading}>Add Waste</Button>
            </div>

            {isLoading && wasteEntries.length === 0 && <Skeleton className="h-10 w-full" />}
            {!isLoading && (
                 <div className="text-xs text-muted-foreground">
                    {latestWaste ? (
                        <>
                            <span>Latest: {latestWaste.type} ({formatTime(latestWaste.timestamp)})</span>
                            <Button
                                variant="link"
                                size="sm"
                                className="text-xs h-auto px-1 py-0 ml-1"
                                onClick={onShowDetailsClick}
                            >
                                (See All)
                            </Button>
                        </>
                    ) : (
                        <span>No waste entries yet.</span>
                    )}
                    <span className="ml-2">| Total Points: {totalWastePoints}</span>
                 </div>
            )}
        </div>
    );
};
