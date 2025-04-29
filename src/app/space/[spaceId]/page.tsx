'use client';

import {useRouter} from 'next/navigation';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {v4 as uuidv4} from 'uuid';
import {toast} from '@/hooks/use-toast';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {ScrollArea} from "@/components/ui/scroll-area"
import {Progress} from "@/components/ui/progress"
import React from 'react';
import {useSpaceContext} from '@/contexts/SpaceContext';
import {Textarea} from "@/components/ui/textarea";
import {format} from 'date-fns';
import {useParams} from "next/navigation";

interface Space {
  id: string;
  name: string;
  description?: string;
  goal?: string;
  beforeImage?: string | null;
  afterImage?: string | null;
  dateCreated: Date;
  dateModified: Date;
  totalClockedInTime: number;
}

interface Action {
  id: string;
  name: string;
  spaceId: string;
  description?: string;
  points: number;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  actionName: string;
  points: number;
  type: 'action' | 'clockIn' | 'clockOut';
  clockInTime?: Date;
  clockOutTime?: Date;
  minutesClockedIn?: number;
  spaceId: string;
}

interface WasteEntry {
  id: string;
  timestamp: Date;
  type: string;
  points: number;
  spaceId: string;
}

interface Comment {
  id: string;
  text: string;
  imageUrl?: string | null;
  timestamp: Date;
}

const timwoodsCategories = [
  {id: 'transportation', name: 'Transportation', description: 'Unnecessary movement of materials or products.', points: 1},
  {id: 'inventory', name: 'Inventory', description: 'Excess raw materials, work in progress, or finished goods.', points: 2},
  {id: 'motion', name: 'Motion', description: 'Unnecessary movement of people.', points: 3},
  {id: 'waiting', name: 'Waiting', description: 'Idle time waiting for the next step in a process.', points: 4},
  {id: 'overprocessing', name: 'Overprocessing', description: 'Performing more work than is necessary.', points: 5},
  {id: 'overproduction', name: 'Overproduction', description: 'Producing more than is needed.', points: 6},
  {id: 'defects', name: 'Defects', description: 'Rework or scrap due to errors or defects.', points: 7},
  {id: 'skills', name: 'Skills', description: 'Underutilizing people\'s talents and skills', points: 8},
];


export default function SpaceDetailPage({
  params,
}: {
  params: { spaceId: string };
}) {
  const {spaceId} = useParams();
  const router = useRouter();
  const [space, setSpace] = useState<Space | null>(null);
  const { actions, logEntries, wasteEntries, addAction, addLogEntry, addWasteEntry } = useSpaceContext();
  const [newActionName, setNewActionName] = useState('');
  const [newActionDescription, setNewActionDescription] = useState('');
  const [newActionPoints, setNewActionPoints] = useState(1);
  const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [apPerHour, setApPerHour] = useState(0);
  const [isAddWasteModalOpen, setIsAddWasteModalOpen] = useState(false);
  const [selectedWasteCategories, setSelectedWasteCategories] = useState<string[]>([]);
  const [totalWastePoints, setTotalWastePoints] = useState(0);
  const [totalClockedInTime, setTotalClockedInTime] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentImage, setNewCommentImage] = useState<string | null>(null);
  const [isLogDetailsOpen, setIsLogDetailsOpen] = useState(false);
  const [isWasteDetailsOpen, setIsWasteDetailsOpen] = useState(false);
    const [isCommentDetailsOpen, setIsCommentDetailsOpen] = useState(false);


  useEffect(() => {
    const storedSpaces = localStorage.getItem('spaces');
    if (storedSpaces) {
      const spaces: Space[] = JSON.parse(storedSpaces);
      const foundSpace = spaces.find((s) => s.id === spaceId);
      if (foundSpace) {
        setSpace(foundSpace);
      }
    }
  }, [spaceId]);

  useEffect(() => {
        const storedTotalClockedInTime = localStorage.getItem(`totalClockedInTime-${spaceId}`);
        if (storedTotalClockedInTime) {
          setTotalClockedInTime(JSON.parse(storedTotalClockedInTime));
        }
    }, [spaceId]);

  useEffect(() => {
        recalculateTotalPoints();
    }, [actions, logEntries, spaceId]);

  const recalculateTotalPoints = useCallback(() => {
    let newTotalPoints = 0;
    logEntries.forEach(logEntry => {
      newTotalPoints += logEntry.points;
    });
    setTotalPoints(newTotalPoints);
  }, [logEntries]);

  const recalculateApPerHour = useCallback(() => {
    if (elapsedTime > 0) {
      const hours = elapsedTime / 3600;
      setApPerHour(totalPoints / hours);
    } else {
      setApPerHour(0);
    }
  }, [totalPoints, elapsedTime]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isClockedIn && startTime) {
      intervalId = setInterval(() => {
        const now = new Date();
        const timeDifference = now.getTime() - startTime.getTime();
        setElapsedTime(Math.floor(timeDifference / 1000)); // in seconds
        recalculateApPerHour();
      }, 1000);
    } else {
      setElapsedTime(0);
      recalculateApPerHour();
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isClockedIn, startTime, recalculateApPerHour]);

  const handleActionClick = (action: Action, multiplier: number) => {
    if (!isClockedIn) {
      toast({
        title: 'Not Clocked In!',
        description: 'You must clock in before you can log actions.',
        variant: 'destructive',
      });
      return;
    }

    const pointsEarned = action.points * multiplier;

    const now = new Date();
    const logEntry: LogEntry = {
      id: uuidv4(),
      timestamp: now,
      actionName: action.name,
      points: pointsEarned,
      type: 'action',
      spaceId: spaceId,
    };

    addLogEntry(logEntry);
    recalculateTotalPoints();

    toast({
      title: 'Action Logged!',
      description: `You earned ${pointsEarned} points for completing "${action.name}".`,
    });
  };

  const handleCreateAction = () => {
    setIsCreateActionModalOpen(true);
  };

  const handleSaveAction = async () => {
    if (newActionName) {
      const id = uuidv4();
      const newAction: Action = {
        id,
        spaceId: spaceId,
        name: newActionName,
        description: newActionDescription,
        points: Number(newActionPoints),
      };

      await addAction(newAction);

      setNewActionName('');
      setNewActionDescription('');
      setNewActionPoints(1);
      setIsCreateActionModalOpen(false);

      toast({
        title: 'Action Created!',
        description: `Action "${newActionName}" has been successfully created.`,
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
    const now = new Date();
    setIsClockedIn(true);
    setStartTime(now);

    const logEntry: LogEntry = {
      id: uuidv4(),
      timestamp: now,
      actionName: 'Clock In',
      points: 0,
      type: 'clockIn',
      spaceId: spaceId,
    };

    addLogEntry(logEntry);

    toast({
      title: 'Clocked In!',
      description: 'You are now clocked in. Start earning those points!',
    });
  };

  const handleClockOut = () => {
    const now = new Date();
    setIsClockedIn(false);
    setEndTime(now);

    if (startTime) {
      const timeDifference = now.getTime() - startTime.getTime();
      const minutesClockedIn = Math.floor(timeDifference / (1000 * 60));
      const secondsClockedIn = Math.floor(timeDifference / (1000));

      setTotalClockedInTime(prevTime => prevTime + minutesClockedIn);
      localStorage.setItem(`totalClockedInTime-${spaceId}`, JSON.stringify(totalClockedInTime + minutesClockedIn));

      const logEntry: LogEntry = {
        id: uuidv4(),
        timestamp: now,
        actionName: 'Clock Out',
        points: 0,
        type: 'clockOut',
        clockInTime: startTime,
        clockOutTime: now,
        minutesClockedIn: minutesClockedIn,
        spaceId: spaceId,
      };
      addLogEntry(logEntry);
    }
    setStartTime(null);

    toast({
      title: 'Clocked Out!',
      description: 'You are now clocked out. Time to take a break!',
    });
  };

  const formatTime = (date: Date): string => {
    if (!date) return 'N/A';
    try {
        return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    } catch (e) {
        console.error("Error formatting time:", e);
        return 'Invalid Date';
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  const handleAddWasteClick = () => {
    setIsAddWasteModalOpen(true);
  };

  const handleWasteCategoryClick = (categoryId: string) => {
    setSelectedWasteCategories((prevCategories) => {
      if (prevCategories.includes(categoryId)) {
        return prevCategories.filter((id) => id !== categoryId);
      } else {
        return [...prevCategories, categoryId];
      }
    });
  };

  const handleSaveWaste = async () => {
    const now = new Date();
    let newWastePoints = 0;
    const newWasteEntries = selectedWasteCategories.map(categoryId => {
      const category = timwoodsCategories.find(cat => cat.id === categoryId);
      newWastePoints += category?.points || 0;
      return {
        id: uuidv4(),
        timestamp: now,
        type: category?.name || 'Unknown',
        points: category?.points || 0,
        spaceId: spaceId,
      };
    });

    for (const wasteEntry of newWasteEntries) {
      await addWasteEntry(wasteEntry);
    }

    setTotalWastePoints(prevPoints => prevPoints + newWastePoints);
    setSelectedWasteCategories([]);
    setIsAddWasteModalOpen(false);

    toast({
      title: 'Waste Added!',
      description: `Added waste for selected categories.`,
    });
  };

  const handleCancelWaste = () => {
    setIsAddWasteModalOpen(false);
    setSelectedWasteCategories([]);
  };

  useEffect(() => {
    let total = 0;
    wasteEntries.forEach(wasteEntry => {
      total += wasteEntry.points;
    });
    setTotalWastePoints(total);
  }, [wasteEntries]);

  const formatElapsedTime = (timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleAddComment = () => {
    if (newCommentText.trim() !== '') {
      const newComment: Comment = {
        id: uuidv4(),
        text: newCommentText,
        imageUrl: newCommentImage,
        timestamp: new Date(),
      };
      setComments([...comments, newComment]);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCommentImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  if (!space) {
    return <div>Space not found</div>;
  }


  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-8 bg-background p-4">
       {/* Space Details */}
       <Card className="w-full max-w-4xl mb-4 card-shadow">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">{space.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {space.beforeImage && (
              <img src={space.beforeImage} alt="Before" className="rounded-md mb-2 max-h-40 object-cover"/>
            )}
            {space.afterImage && (
              <img src={space.afterImage} alt="After" className="rounded-md mb-2 max-h-40 object-cover"/>
            )}
          </div>
          <div>
            <CardDescription className="text-sm">{space.description}</CardDescription>
            {space.goal && <CardDescription className="text-sm">Goal: {space.goal}</CardDescription>}
          </div>
        </CardContent>
      </Card>

      {/* Dashboard */}
      <div className="w-full max-w-4xl mb-4">
        <Card className="card-shadow">
          <CardContent className="p-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div>Status: {!isClockedIn ? <Button variant="outline" size="sm" onClick={handleClockIn}>Clock In</Button> : <Button variant="outline" size="sm" onClick={handleClockOut}>Clock Out</Button>}</div>
            <div>Work Time: {formatElapsedTime(elapsedTime)}</div>
            <div>Total Time: {totalClockedInTime} minutes</div>
            <div>AP: {totalPoints.toFixed(2)}</div>
            <div>AP/H: {apPerHour.toFixed(2)}</div>
            <div>Waste: {totalWastePoints}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="mt-4 w-full max-w-4xl">
        <h2 className="text-xl font-bold mb-2">Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {actions.map((action) => (
            <div key={action.id} className="flex space-x-1">
              <Button
                variant="secondary"
                onClick={() => handleActionClick(action, 1)}
                disabled={!isClockedIn}
                className="text-xs"
              >
                {action.name} (+{action.points * 1} points)
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleActionClick(action, 2)}
                disabled={!isClockedIn}
                className="text-xs"
              >
                {action.name} (+{action.points * 2} points)
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleActionClick(action, 5)}
                disabled={!isClockedIn}
                className="text-xs"
              >
                {action.name} (+{action.points * 5} points)
              </Button>
            </div>
          ))}
        </div>

        <Button className="mt-2 w-full" size="sm" onClick={handleCreateAction}>
          Create New Action
        </Button>
      </div>

      {/* Waste Tracking */}
      <div className="mt-4 w-full max-w-4xl">
        <h2 className="text-xl font-bold mb-2">Waste Tracking</h2>
        <Button size="sm" onClick={handleAddWasteClick}>Add Waste</Button>
        <Progress value={0} className="h-2"/>
                {wasteEntries.length > 0 ? (
                    <>
                        <div>
                            Latest Waste Entry: {wasteEntries[0].type} - Points: {wasteEntries[0].points}
                        </div>
                        <Button variant="link" onClick={() => setIsWasteDetailsOpen(true)}>
                            See All Waste Entries
                        </Button>
                    </>
                ) : (
                    <div>No waste entries yet.</div>
                )}
        <p className="text-sm">Total Waste Points: {totalWastePoints}</p>
      </div>

      {/* Log */}
      <div className="mt-4 w-full max-w-4xl">
        <h2 className="text-xl font-bold mb-2">Log</h2>
                {logEntries.length > 0 ? (
                    <>
                        <div>
                            Latest Log Entry: {logEntries[0].actionName} at {formatTime(logEntries[0].timestamp)}
                            (Points: {logEntries[0].points})
                        </div>
                        <Button variant="link" onClick={() => setIsLogDetailsOpen(true)}>
                            See All Log Entries
                        </Button>
                    </>
                ) : (
                    <div>No log entries yet.</div>
                )}
      </div>

      {/* Comments */}
      <div className="mt-4 w-full max-w-4xl">
        <h2 className="text-xl font-bold mb-2">Comments</h2>
                {comments.length > 0 ? (
                    <>
                        <div>
                            Latest Comment: {comments[0].text.substring(0, 50)}...
                        </div>
                        <Button variant="link" onClick={() => setIsCommentDetailsOpen(true)}>
                            See All Comments
                        </Button>
                    </>
                ) : (
                    <div>No comments yet.</div>
                )}
        <div className="mt-2">
          <Label htmlFor="comment" className="block text-sm font-medium text-foreground">Add a Comment</Label>
          <Textarea
            id="comment"
            className="w-full p-2 border rounded text-foreground text-sm"
            placeholder="Enter your comment"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
          />
        </div>
        <div className="mt-2">
          <Label htmlFor="image" className="block text-sm font-medium text-foreground">Add an Image (Optional)</Label>
          <Input
            type="file"
            id="image"
            accept="image/*"
            className="w-full p-2 border rounded text-sm"
            onChange={handleImageUpload}
          />
          {newCommentImage && (
            <img src={newCommentImage} alt="New Comment Image" className="mt-2 rounded max-h-40 object-cover" />
          )}
        </div>
        <Button onClick={handleAddComment} className="mt-2 bg-primary text-primary-foreground rounded p-3 font-bold text-sm">
          Add Comment
        </Button>
      </div>

      {/* Back Button */}
      <Button className="mt-4 w-full max-w-4xl" size="sm" variant="ghost" onClick={handleBack}>
        Back to Home
      </Button>

      {/* Modals */}
      <Dialog open={isCreateActionModalOpen} onOpenChange={setIsCreateActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Action</DialogTitle>
            <DialogDescription>
              Add a new action to this space.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="name" className="text-right text-sm">
                Name
              </Label>
              <Input
                type="text"
                id="name"
                value={newActionName}
                onChange={(e) => setNewActionName(e.target.value)}
                className="col-span-3 text-sm"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="description" className="text-right text-sm">
                Description
              </Label>
              <Textarea
                id="description"
                value={newActionDescription}
                onChange={(e) => setNewActionDescription(e.target.value)}
                className="col-span-3 text-sm"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="points" className="text-right text-sm">
                Points
              </Label>
              <Input
                type="number"
                id="points"
                value={newActionPoints}
                onChange={(e) => setNewActionPoints(e.target.value)}
                className="col-span-3 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" size="sm" onClick={handleCancelAction}>
              Cancel
            </Button>
            <Button type="submit" size="sm" onClick={handleSaveAction}>
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isAddWasteModalOpen} onOpenChange={setIsAddWasteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Waste (TIMWOODS)</DialogTitle>
            <DialogDescription>
              Select waste categories to add to this space.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <div className="flex flex-wrap gap-1">
              {timwoodsCategories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedWasteCategories.includes(category.id) ? 'default' : 'outline'}
                  onClick={() => handleWasteCategoryClick(category.id)}
                  size="sm"
                >
                  {category.name}
                </Button>
              ))}
            </div>
            <Progress value={0} className="h-2"/>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" size="sm" onClick={handleCancelWaste}>
              Cancel
            </Button>
            <Button type="submit" size="sm" onClick={handleSaveWaste}>
              Add Waste
            </Button>
          </div>
        </DialogContent>
      </Dialog>
            <Dialog open={isLogDetailsOpen} onOpenChange={setIsLogDetailsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Log Details</DialogTitle>
                        <DialogDescription>
                            All log entries for this space.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-80">
                        {logEntries.map((logEntry) => {
                            if (logEntry.type === 'action') {
                                return (
                                    <div key={logEntry.id} className="mb-1 text-sm">
                                        {logEntry.actionName} completed at {formatTime(logEntry.timestamp)} (+{logEntry.points} points)
                                    </div>
                                );
                            } else if (logEntry.type === 'clockIn') {
                                return (
                                    <div key={logEntry.id} className="mb-1 text-sm">
                                        Clocked in at {formatTime(logEntry.timestamp)}
                                    </div>
                                );
                            } else if (logEntry.type === 'clockOut' && logEntry.clockInTime && logEntry.clockOutTime && logEntry.minutesClockedIn !== undefined) {
                                return (
                                    <div key={logEntry.id} className="mb-1 text-sm">
                                        Clocked out at {formatTime(logEntry.timestamp)}. Total time clocked in: {logEntry.minutesClockedIn} minutes.
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            <Dialog open={isWasteDetailsOpen} onOpenChange={setIsWasteDetailsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Waste Details</DialogTitle>
                        <DialogDescription>
                            All waste entries for this space.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-80">
                        {wasteEntries.map((wasteEntry) => (
                            <div key={wasteEntry.id} className="mb-1 text-sm">
                                {wasteEntry.type} - Points: {wasteEntry.points}
                            </div>
                        ))}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            <Dialog open={isCommentDetailsOpen} onOpenChange={setIsCommentDetailsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Comment Details</DialogTitle>
                        <DialogDescription>
                            All comments for this space.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-80">
                        {comments.map((comment) => (
                            <Card key={comment.id} className="card-shadow">
                                <CardContent>
                                    {comment.imageUrl && (
                                        <img src={comment.imageUrl} alt="Comment Image" className="rounded-md mb-1 max-h-40 object-cover"/>
                                    )}
                                    <CardDescription className="text-sm">{comment.text}</CardDescription>
                                    <p className="text-xs text-muted-foreground">
                                        {format(comment.timestamp, 'MMM dd, yyyy hh:mm a')}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
    </div>
  );
}
