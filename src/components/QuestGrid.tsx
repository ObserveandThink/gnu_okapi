
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ClipboardList } from 'lucide-react';
import type { MultiStepAction } from '@/core/domain/MultiStepAction';

interface QuestGridProps {
  multiStepActions: MultiStepAction[];
  onQuestClick: (quest: MultiStepAction) => void;
  isClockedIn: boolean;
  isLoading: boolean;
}

const QuestGrid: React.FC<QuestGridProps> = ({ multiStepActions, onQuestClick, isClockedIn, isLoading }) => {
  return (
    <>
      {multiStepActions.map((action) => {
        const isCompleted = action.currentStepIndex >= action.steps.length;
        const progress = isCompleted ? 100 : (action.currentStepIndex / action.steps.length) * 100;
        return (
          <Button
            key={action.id}
            onClick={() => onQuestClick(action)}
            disabled={!isClockedIn || isCompleted || isLoading}
            variant="outline"
            className={`h-auto aspect-square flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl shadow-lg text-white transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden border-2 hover:border-purple-300
                        ${isCompleted
                            ? 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600'
                            : 'bg-gradient-to-br from-purple-600 to-pink-700 hover:from-purple-700 hover:to-pink-800 border-purple-500/50'}`}
            title={action.description}
          >
            <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 mb-1 text-purple-300 filter drop-shadow(0 0 3px #c084fc)" />
            <span className="text-sm sm:text-base font-semibold text-center break-words line-clamp-2 font-mono uppercase">{action.name}</span>
            {!isCompleted && <span className="text-xs text-purple-200 mt-1 font-mono">Next: {action.steps[action.currentStepIndex].name} (+{action.pointsPerStep})</span>}
            {isCompleted && <span className="text-xs text-green-400 mt-1 font-bold font-mono">COMPLETED!</span>}
            {/* Progress Bar */}
            <Progress value={progress} className="absolute bottom-1 left-1 right-1 h-1.5 bg-black/30 [&>div]:bg-gradient-to-r [&>div]:from-yellow-400 [&>div]:to-orange-500" />
            <span className="absolute bottom-1 right-2 text-[0.6rem] font-bold text-black/70 font-mono">{action.currentStepIndex}/{action.steps.length}</span>
          </Button>
        );
      })}
    </>
  );
};

export default QuestGrid;
