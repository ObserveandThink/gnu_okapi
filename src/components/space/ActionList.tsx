/**
 * @fileOverview Component to display and interact with simple and multi-step actions.
 */
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Action } from '@/core/domain/Action';
import type { MultiStepAction } from '@/core/domain/MultiStepAction';

interface ActionListProps {
    actions: Action[];
    multiStepActions: MultiStepAction[];
    isClockedIn: boolean;
    isLoading: boolean;
    onActionClick: (action: Action, multiplier: number) => void;
    onMultiStepActionClick: (action: MultiStepAction) => void;
    onCreateSimpleAction: () => void;
    onCreateMultiStepAction: () => void;
}

export const ActionList: React.FC<ActionListProps> = ({
    actions,
    multiStepActions,
    isClockedIn,
    isLoading,
    onActionClick,
    onMultiStepActionClick,
    onCreateSimpleAction,
    onCreateMultiStepAction,
}) => {

    if (isLoading && actions.length === 0 && multiStepActions.length === 0) {
         return <Skeleton className="h-24 w-full mt-2" />;
    }

    return (
        <div className="mt-2 w-full max-w-4xl">
            <h2 className="text-base font-bold mb-1">Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                 {/* Regular Actions */}
                 {actions.map((action) => (
                     <div key={action.id} className="flex space-x-1">
                        <Button variant="secondary" size="sm" onClick={() => onActionClick(action, 1)} disabled={!isClockedIn || isLoading} className="text-xs flex-1"> {action.name} <span className="ml-auto pl-1">(+{action.points})</span> </Button>
                        <Button variant="secondary" size="sm" onClick={() => onActionClick(action, 2)} disabled={!isClockedIn || isLoading} className="text-xs w-8">x2</Button>
                        <Button variant="secondary" size="sm" onClick={() => onActionClick(action, 5)} disabled={!isClockedIn || isLoading} className="text-xs w-8">x5</Button>
                        <Button variant="secondary" size="sm" onClick={() => onActionClick(action, 10)} disabled={!isClockedIn || isLoading} className="text-xs w-8">x10</Button>
                     </div>
                ))}
                 {/* Multi-Step Actions */}
                 {multiStepActions.map((action) => (
                     <div key={action.id}>
                         <Button
                             variant="outline"
                             size="sm"
                             onClick={() => onMultiStepActionClick(action)}
                             disabled={!isClockedIn || action.currentStepIndex >= action.steps.length || isLoading}
                             className={`text-xs w-full justify-start ${action.currentStepIndex >= action.steps.length ? 'line-through' : ''}`}
                         >
                            {action.name}
                            <span className="ml-auto text-muted-foreground">
                                {action.currentStepIndex >= action.steps.length ? `(Done)` : `(${action.currentStepIndex + 1}/${action.steps.length})`}
                            </span>
                         </Button>
                     </div>
                 ))}
                 {/* Placeholder for loading actions */}
                 {isLoading && actions.length === 0 && multiStepActions.length === 0 && (
                     <>
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                     </>
                 )}
                 {/* Placeholder if no actions defined */}
                  {!isLoading && actions.length === 0 && multiStepActions.length === 0 && (
                       <p className="text-xs text-muted-foreground col-span-full text-center py-2">No actions created yet.</p>
                   )}
            </div>
             <div className="flex gap-1 mt-1"> {/* Create Action Buttons */}
                <Button className="flex-1" size="sm" onClick={onCreateSimpleAction} disabled={isLoading}> + Simple </Button>
                <Button className="flex-1" size="sm" onClick={onCreateMultiStepAction} disabled={isLoading}> + Multi-Step </Button>
            </div>
       </div>
    );
};
