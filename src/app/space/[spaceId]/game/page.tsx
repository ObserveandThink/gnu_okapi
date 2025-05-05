/**
 * @fileOverview Gamified view for a specific Space.
 */
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSpaceContext } from '@/contexts/SpaceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';

export default function GameSpacePage() {
  const params = useParams();
  const spaceId = params.spaceId as string;
  const router = useRouter();
  const { currentSpace, isLoading, error, loadSpaceDetails, clearCurrentSpace } = useSpaceContext();

  useEffect(() => {
    if (spaceId) {
      loadSpaceDetails(spaceId);
    }
    return () => {
      // Optionally clear details when leaving the game page too
      // clearCurrentSpace();
    };
  }, [spaceId, loadSpaceDetails]);

  const handleBackToSpace = () => {
    router.push(`/space/${spaceId}`);
  };

  const handleStart = () => {
    // Placeholder for starting game logic or navigating
    console.log('Start button clicked for space:', currentSpace?.name);
    // Example: Navigate back to the regular space view to "start working"
     router.push(`/space/${spaceId}`);
  };

   if (isLoading && !currentSpace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 text-white">
        <Skeleton className="h-12 w-3/4 mb-6 bg-white/30" />
        <Skeleton className="h-64 w-full max-w-sm mb-8 bg-white/30" />
        <Skeleton className="h-16 w-48 bg-white/30" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-700 via-gray-800 to-black text-red-400">
        <h2 className="text-2xl mb-2 font-bold">Error Loading Game</h2>
        <p className="mb-4">{error}</p>
        <Button onClick={handleBackToSpace} variant="secondary" className="text-lg">
          Back to Space
        </Button>
      </div>
    );
  }

   if (!currentSpace) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-700 via-gray-800 to-black text-gray-400">
        <h2 className="text-2xl mb-4 font-bold">Space not found.</h2>
        <Button onClick={() => router.push('/')} variant="secondary" className="text-lg">
          Go Home
        </Button>
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center justify-between min-h-screen p-6 bg-gradient-to-br from-blue-400 via-teal-500 to-green-500 text-white">
      <header className="w-full flex justify-between items-center">
        <Button onClick={handleBackToSpace} variant="ghost" size="icon" className="text-white hover:bg-white/20">
          <ArrowLeft className="h-6 w-6" />
        </Button>
         <h1 className="text-3xl font-bold text-center flex-grow truncate px-4">
            {currentSpace.name} - Game Mode!
        </h1>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      <main className="flex flex-col items-center justify-center flex-grow w-full max-w-md">
        {/* Game Content Area - Placeholder */}
        <Card className="bg-white/20 backdrop-blur-md border-white/30 text-center p-6 shadow-xl mb-8 w-full">
            <CardHeader>
                <CardTitle className="text-4xl font-extrabold mb-4 animate-pulse">LEVEL 1</CardTitle>
            </CardHeader>
          <CardContent>
             <p className="text-lg mb-6">Get ready to improve your process!</p>
             {/* Add game-specific elements here */}
            <div className="flex space-x-4 justify-center mb-4">
                 {currentSpace.beforeImage && <img data-ai-hint="game element" src={currentSpace.beforeImage} alt="Before" className="w-24 h-24 rounded-lg border-2 border-white object-cover"/>}
                 {currentSpace.afterImage && <img data-ai-hint="game character" src={currentSpace.afterImage} alt="After" className="w-24 h-24 rounded-lg border-2 border-white object-cover"/>}
            </div>
             <p className="text-sm text-white/80">Goal: {currentSpace.goal || 'Improve efficiency!'}</p>
          </CardContent>
        </Card>

        {/* Big Start Button */}
        <Button
            onClick={handleStart}
            size="lg"
            className="text-3xl font-bold px-10 py-6 rounded-full bg-yellow-400 text-yellow-900 hover:bg-yellow-300 shadow-lg transform hover:scale-105 transition-transform duration-200 ease-in-out animate-bounce"
            style={{ animationDuration: '1.5s' }} // Adjust bounce speed
            >
          Start!
        </Button>
      </main>

      <footer className="w-full text-center text-xs text-white/60 mt-4">
        OkapiFlow Gamified Mode
      </footer>
    </div>
  );
}
