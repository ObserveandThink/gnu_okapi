
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import type { Action } from '@/core/domain/Action';

interface ActionGridProps {
  actions: Action[];
  onActionClick: (action: Action) => void;
  isClockedIn: boolean;
  isLoading: boolean;
}

const ActionGrid: React.FC<ActionGridProps> = ({ actions, onActionClick, isClockedIn, isLoading }) => {
  return (
    <>
      {actions.map((action) => (
        <Button
          key={action.id}
          onClick={() => onActionClick(action)}
          disabled={!isClockedIn || isLoading}
          variant="secondary"
          className="h-auto aspect-square flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl shadow-lg bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-blue-400/50 hover:border-blue-300"
          title={action.description}
        >
          <Zap className="h-6 w-6 sm:h-8 sm:w-8 mb-1 text-yellow-300 filter drop-shadow(0 0 3px #fde047)" />
          <span className="text-sm sm:text-base font-semibold text-center break-words line-clamp-2 font-mono uppercase">{action.name}</span>
          <span className="text-xs sm:text-sm font-bold text-yellow-400 mt-1 font-mono">(+{action.points} AP)</span>
        </Button>
      ))}
    </>
  );
};

export default ActionGrid;
