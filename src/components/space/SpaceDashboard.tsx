/**
 * @fileOverview Component for displaying the space dashboard metrics and clock controls.
 */
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatElapsedTime } from '@/utils/dateUtils';
import { Clock, Zap, Trash2, Activity, Timer } from 'lucide-react'; // Example icons

interface SpaceDashboardProps {
    isClockedIn: boolean;
    onClockIn: () => void;
    onClockOut: () => void;
    isLoading: boolean; // Loading state for clock actions or overall data
    currentSessionElapsedTime: number;
    totalClockedInTime: number;
    totalPoints: number;
    averageApPerHour: number; // Changed prop name
    totalWastePoints: number;
}

export const SpaceDashboard: React.FC<SpaceDashboardProps> = ({
    isClockedIn,
    onClockIn,
    onClockOut,
    isLoading,
    currentSessionElapsedTime,
    totalClockedInTime,
    totalPoints,
    averageApPerHour, // Use the new prop name
    totalWastePoints,
}) => {

    // Helper to format numbers concisely
    const formatMetric = (value: number, precision: number = 0): string => {
        if (value === undefined || value === null || isNaN(value)) return 'N/A'; // Handle undefined/null/NaN
        if (!isFinite(value)) return '∞'; // Handle Infinity

        if (value > 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value > 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toFixed(precision);
    };

    return (
        <Card className="w-full max-w-4xl mb-2 card-shadow">
          <CardContent className="p-2 grid grid-cols-3 sm:grid-cols-6 gap-x-2 gap-y-1 text-xs items-center">
              {/* Clock In/Out Button */}
              <div className="col-span-1 flex items-center justify-center">
                 {!isClockedIn ? (
                    <Button variant="outline" size="sm" onClick={onClockIn} disabled={isLoading} className="text-xs w-full h-8">
                        <Clock className="mr-1 h-3 w-3" /> Clock In
                    </Button>
                 ) : (
                    <Button variant="destructive" size="sm" onClick={onClockOut} disabled={isLoading} className="text-xs w-full h-8">
                        <Clock className="mr-1 h-3 w-3" /> Clock Out
                    </Button>
                 )}
             </div>

             {/* Session Time */}
             <DashboardMetric
                icon={Timer}
                label="Session"
                value={formatElapsedTime(currentSessionElapsedTime)}
                isLoading={isLoading && currentSessionElapsedTime === 0} // Show skeleton only on initial load
             />

             {/* Total Time */}
             <DashboardMetric
                icon={Clock}
                label="Total"
                value={`${formatMetric(totalClockedInTime)} min`}
                isLoading={isLoading && totalClockedInTime === 0}
             />

             {/* Action Points (AP) */}
             <DashboardMetric
                icon={Zap}
                label="AP"
                value={formatMetric(totalPoints)}
                isLoading={isLoading && totalPoints === 0}
             />

             {/* AP/Hour (Average) */}
             <DashboardMetric
                 icon={Activity}
                 label="Avg AP/H" // Updated label
                 value={formatMetric(averageApPerHour, 1)} // Use the average value
                 isLoading={isLoading && totalClockedInTime === 0} // Skeleton when total time is 0
             />

             {/* Waste Points */}
             <DashboardMetric
                 icon={Trash2}
                 label="Waste"
                 value={formatMetric(totalWastePoints)}
                 isLoading={isLoading && totalWastePoints === 0}
             />

          </CardContent>
        </Card>
    );
};

// Internal component for displaying a single metric
interface DashboardMetricProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
    isLoading: boolean;
}

const DashboardMetric: React.FC<DashboardMetricProps> = ({ icon: Icon, label, value, isLoading }) => (
    <div className="text-center flex flex-col items-center justify-center h-full">
        {isLoading ? (
            <>
                <Skeleton className="h-3 w-10 mb-0.5" />
                <Skeleton className="h-4 w-12" />
            </>
        ) : (
            <>
                <span className="font-semibold flex items-center text-muted-foreground">
                     {/*<Icon className="h-3 w-3 mr-0.5" />*/}
                    {label}
                </span>
                <span className="font-mono text-sm">{value}</span>
            </>
        )}
    </div>
);
