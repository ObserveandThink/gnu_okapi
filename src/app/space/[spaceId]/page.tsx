'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from '@/components/ui/textarea';

interface Space {
  id: string;
  name: string;
  description?: string;
  goal?: string;
  beforeImage?: string | null;
  afterImage?: string | null;
}

interface Action {
  id: string;
  name: string;
  spaceId: string;
  description?: string;
  points: number;
}

export default function SpaceDetailPage({
  params,
}: {
  params: { spaceId: string };
}) {
  const { spaceId } = params;
  const router = useRouter();
  const [space, setSpace] = useState<Space | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [newActionName, setNewActionName] = useState('');
  const [newActionDescription, setNewActionDescription] = useState('');
  const [newActionPoints, setNewActionPoints] = useState(1);
  const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [apPerHour, setApPerHour] = useState(0);

  useEffect(() => {
    const storedSpaces = localStorage.getItem('spaces');
    if (storedSpaces) {
      const spaces: Space[] = JSON.parse(storedSpaces);
      const foundSpace = spaces.find((s) => s.id === spaceId);
      if (foundSpace) {
        setSpace(foundSpace);
      }
    }

    const storedActions = localStorage.getItem(`actions-${spaceId}`);
    if (storedActions) {
      const parsedActions: Action[] = JSON.parse(storedActions);
      setActions(parsedActions);
    }
  }, [spaceId]);

  const recalculateTotalPoints = useCallback(() => {
    const newTotalPoints = actions.reduce((acc, action) => acc + action.points, 0);
    setTotalPoints(newTotalPoints);
  }, [actions]);

  const recalculateApPerHour = useCallback(() => {
    if (elapsedTime > 0) {
      const hours = elapsedTime / 3600;
      setApPerHour(totalPoints / hours);
    } else {
      setApPerHour(0);
    }
  }, [totalPoints, elapsedTime]);

  useEffect(() => {
    recalculateTotalPoints();
    recalculateApPerHour();
  }, [actions, recalculateTotalPoints, recalculateApPerHour]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isClockedIn && startTime) {
      intervalId = setInterval(() => {
        const now = new Date();
        const timeDifference = now.getTime() - startTime.getTime();
        setElapsedTime(Math.floor(timeDifference / 1000)); // in seconds
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isClockedIn, startTime]);

  useEffect(() => {
    localStorage.setItem(`actions-${spaceId}`, JSON.stringify(actions));
  }, [actions, spaceId]);

  const handleActionClick = (action: Action) => {
    setActions(prevActions => {
      return prevActions.map(existingAction => {
        if (existingAction.id === action.id) {
          return { ...existingAction, points: action.points }; // Update the points if it's the clicked action
        } else {
          return existingAction; // Otherwise, keep the existing action
        }
      });
    });
    toast({
      title: 'Action Logged!',
      description: `You earned ${action.points} points for completing "${action.name}".`,
    });
  };

  const handleCreateAction = () => {
    setIsCreateActionModalOpen(true);
  };

  const handleSaveAction = () => {
    if (newActionName) {
      const id = uuidv4();
      const newAction: Action = {
        id,
        spaceId: spaceId,
        name: newActionName,
        description: newActionDescription,
        points: Number(newActionPoints),
      };

      setActions((prevActions) => [...prevActions, newAction]);
      setNewActionName('');
      setNewActionDescription('');
      setNewActionPoints(1);
      setIsCreateActionModalOpen(false);
      toast({
        title: 'Action Created!',
        description: `Action "${newAction.name}" has been successfully created.`,
      });
    }
  };

  const handleCancelAction = () => {
    setIsCreateActionModalOpen(false);
    setNewActionName('');
    setNewActionDescription('');
    setNewActionPoints(1);
  };

  const handleClockIn = () => {
    setIsClockedIn(true);
    setStartTime(new Date());
    toast({
      title: 'Clocked In!',
      description: 'You are now clocked in. Start earning those points!',
    });
  };

  const handleClockOut = () => {
    setIsClockedIn(false);
    setStartTime(null);
    toast({
      title: 'Clocked Out!',
      description: 'You are now clocked out. Time to take a break!',
    });
  };

  const handleBack = () => {
    router.push('/');
  };

  if (!space) {
    return <div>Space not found</div>;
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-8 bg-background p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">{space.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {space.beforeImage && (
              <img src={space.beforeImage} alt="Before" className="rounded-md mb-2 max-h-80 object-cover" />
            )}
            {space.afterImage && (
              <img src={space.afterImage} alt="After" className="rounded-md mb-2 max-h-80 object-cover" />
            )}
          </div>
          <div>
            <CardDescription className="text-lg">{space.description}</CardDescription>
            {space.goal && <CardDescription className="text-lg">Goal: {space.goal}</CardDescription>}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 w-full max-w-4xl flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Total Points: {totalPoints.toFixed(2)}</h2>
          <p className="text-lg">AP per Hour: {apPerHour.toFixed(2)}</p>
        </div>
        <div>
          {!isClockedIn ? (
            <Button variant="outline" size="lg" onClick={handleClockIn}>Clock In</Button>
          ) : (
            <Button variant="outline" size="lg" onClick={handleClockOut}>Clock Out</Button>
          )}
        </div>
      </div>

      <div className="mt-8 w-full max-w-4xl">
        <h2 className="text-3xl font-bold mb-4">Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => (
            <div key={action.id} className="flex space-x-2">
              <Button variant="secondary" onClick={() => handleActionClick({ ...action, points: action.points * 1 })}>{action.name} (+{action.points * 1} points)</Button>
              <Button variant="secondary" onClick={() => handleActionClick({ ...action, points: action.points * 2 })}>{action.name} (+{action.points * 2} points)</Button>
              <Button variant="secondary" onClick={() => handleActionClick({ ...action, points: action.points * 5 })}>{action.name} (+{action.points * 5} points)</Button>
            </div>
          ))}
        </div>

        <Button className="mt-4 w-full" size="lg" onClick={handleCreateAction}>
          Create New Action
        </Button>
      </div>

      <Button className="mt-8 w-full max-w-4xl" size="lg" variant="ghost" onClick={handleBack}>
        Back to Home
      </Button>

      {isCreateActionModalOpen && (
        <div className="fixed top-0 left-0 w-full h-full bg-background bg-opacity-80 flex items-center justify-center">
          <AlertDialog>
      <AlertDialogTrigger asChild>
      <Button>Edit Profile</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete your account
          and remove your data from our servers.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction>Continue</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
    </AlertDialog>
          
          
        </div>
      )}
    </div>
  );
}
