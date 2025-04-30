/**
 * @fileOverview Page component for displaying and interacting with a single Space.
 */
'use client';

import { useRouter, useParams } from 'next/navigation';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useSpaceContext } from '@/contexts/SpaceContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { handleImageUploadUtil } from '@/utils/imageUtils'; // Import utility
import { formatTime, formatElapsedTime } from '@/utils/dateUtils'; // Import date utilities


// Import Domain Models (optional, for type clarity)
import type { Action } from '@/core/domain/Action';
import type { MultiStepAction, ActionStep } from '@/core/domain/MultiStepAction';
import type { LogEntry } from '@/core/domain/LogEntry';
import type { WasteEntry } from '@/core/domain/WasteEntry';
import type { Comment } from '@/core/domain/Comment';

// TIMWOODS Categories (Consider moving to a constants file or fetching from config)
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

export default function SpaceDetailPage() {
    // Hooks and Context
  const params = useParams();
  const spaceId = params.spaceId as string; // Get spaceId from URL parameters
  const router = useRouter();
  const {
      currentSpace, // Use currentSpace from context
      actions,
      multiStepActions,
      logEntries,
      wasteEntries,
      comments,
      isLoading,
      error,
      loadSpaceDetails,
      clearCurrentSpace,
      createAction,
      createMultiStepAction,
      completeMultiStepActionStep,
      addLogEntry,
      addWasteEntries,
      addComment,
      addClockedTime,
  } = useSpaceContext();

  // Local UI State
  const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
  const [newActionName, setNewActionName] = useState('');
  const [newActionDescription, setNewActionDescription] = useState('');
  const [newActionPoints, setNewActionPoints] = useState<number | string>(1); // Allow string for input

  const [isCreateMultiStepActionModalOpen, setIsCreateMultiStepActionModalOpen] = useState(false);
  const [newMultiStepActionName, setNewMultiStepActionName] = useState('');
  const [newMultiStepActionDescription, setNewMultiStepActionDescription] = useState('');
  const [newMultiStepActionPoints, setNewMultiStepActionPoints] = useState<number | string>(1);
  const [newMultiStepActionSteps, setNewMultiStepActionSteps] = useState<string[]>(['']); // Array of step names

  const [isAddWasteModalOpen, setIsAddWasteModalOpen] = useState(false);
  const [selectedWasteCategories, setSelectedWasteCategories] = useState<string[]>([]);

  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentImage, setNewCommentImage] = useState<string | null>(null);

  const [isLogDetailsOpen, setIsLogDetailsOpen] = useState(false);
  const [isWasteDetailsOpen, setIsWasteDetailsOpen] = useState(false);
  const [isCommentDetailsOpen, setIsCommentDetailsOpen] = useState(false);

   // Clock-in/out State
   const [isClockedIn, setIsClockedIn] = useState(false);
   const [clockInStartTime, setClockInStartTime] = useState<Date | null>(null);
   const [currentSessionElapsedTime, setCurrentSessionElapsedTime] = useState(0); // Elapsed time for the *current* session in seconds
   const [timerIntervalId, setTimerIntervalId] = useState<NodeJS.Timeout | null>(null);


    // --- Effects ---

   // Load space details when spaceId changes
   useEffect(() => {
    if (spaceId) {
        console.log(`Effect: Loading details for spaceId: ${spaceId}`);
        loadSpaceDetails(spaceId);
    }
    // Cleanup function to clear details when navigating away
     return () => {
        console.log("Effect Cleanup: Clearing current space details.");
        clearCurrentSpace();
        // Clear local clock-in state as well
        if (timerIntervalId) clearInterval(timerIntervalId);
        setIsClockedIn(false);
        setClockInStartTime(null);
        setCurrentSessionElapsedTime(0);
        setTimerIntervalId(null);
     };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spaceId, loadSpaceDetails, clearCurrentSpace]); // Dependencies: spaceId and context functions


    // Timer effect for current session duration
    useEffect(() => {
        if (isClockedIn && clockInStartTime) {
            const intervalId = setInterval(() => {
                const now = new Date();
                const timeDifference = now.getTime() - clockInStartTime.getTime();
                setCurrentSessionElapsedTime(Math.floor(timeDifference / 1000));
            }, 1000);
            setTimerIntervalId(intervalId); // Store interval ID

            return () => {
                clearInterval(intervalId); // Clear interval on clock out or unmount
                setTimerIntervalId(null);
            };
        } else {
            setCurrentSessionElapsedTime(0); // Reset timer if not clocked in
             if (timerIntervalId) {
                clearInterval(timerIntervalId); // Clear interval if it exists
                setTimerIntervalId(null);
            }
        }
    }, [isClockedIn, clockInStartTime]); // Dependencies for the timer


   // --- Calculated Values ---
   const totalPoints = useMemo(() => {
    return logEntries.reduce((sum, entry) => sum + entry.points, 0);
  }, [logEntries]);

   const totalWastePoints = useMemo(() => {
    return wasteEntries.reduce((sum, entry) => sum + entry.points, 0);
  }, [wasteEntries]);

  // Calculate AP per hour based on the current clock-in session
  const apPerCurrentSessionHour = useMemo(() => {
    if (!isClockedIn || !clockInStartTime || currentSessionElapsedTime <= 0) {
        return 0; // Not clocked in, no start time, or no time elapsed
    }

    // Filter log entries that occurred *during* the current session and awarded points
    const sessionPointEntries = logEntries.filter(
        entry => entry.timestamp >= clockInStartTime && entry.points > 0
    );

    const sessionPoints = sessionPointEntries.reduce((sum, entry) => sum + entry.points, 0);
    const sessionHours = currentSessionElapsedTime / 3600; // Convert session seconds to hours

    if (sessionHours <= 0) {
        return 0; // Avoid division by zero if session is extremely short
    }

    return sessionPoints / sessionHours; // Calculate points per hour for the current session

 }, [logEntries, isClockedIn, clockInStartTime, currentSessionElapsedTime]);


   // --- Event Handlers ---

  const handleBack = () => {
    router.push('/');
  };

   // Clock In/Out
   const handleClockIn = async () => {
    if (!currentSpace) return;
    const now = new Date();
    setIsClockedIn(true);
    setClockInStartTime(now);
    setCurrentSessionElapsedTime(0); // Reset session timer

    await addLogEntry({
      spaceId: currentSpace.id,
      // timestamp will be set by service
      actionName: 'Clock In',
      points: 0,
      type: 'clockIn',
    });

    toast({
      title: 'Clocked In!',
      description: 'You are now clocked in. Start earning those points!',
    });
  };

   const handleClockOut = async () => {
    if (!currentSpace || !clockInStartTime) return;

    const now = new Date();
    setIsClockedIn(false);

    const timeDifference = now.getTime() - clockInStartTime.getTime();
    const minutesClockedInThisSession = Math.floor(timeDifference / (1000 * 60));

    // Update total time using the service
    await addClockedTime(currentSpace.id, minutesClockedInThisSession);

    // Add log entry for clocking out
     await addLogEntry({
      spaceId: currentSpace.id,
      // timestamp will be set by service
      actionName: 'Clock Out',
      points: 0,
      type: 'clockOut',
      clockInTime: clockInStartTime,
      clockOutTime: now,
      minutesClockedIn: minutesClockedInThisSession,
    });

    setClockInStartTime(null); // Clear start time for next session
    setCurrentSessionElapsedTime(0); // Reset elapsed time display

    toast({
      title: 'Clocked Out!',
      description: `Session time: ${minutesClockedInThisSession} min. Total time updated.`,
    });
  };


   // Action Handling
   const handleActionClick = async (action: Action, multiplier: number) => {
    if (!isClockedIn) {
      toast({
        title: 'Not Clocked In!',
        description: 'You must clock in before logging actions.',
        variant: 'destructive',
      });
      return;
    }
    if (!currentSpace) return;

    const pointsEarned = action.points * multiplier;
    await addLogEntry({
        spaceId: currentSpace.id,
        // timestamp will be set by service
        actionName: `${action.name} (x${multiplier})`, // Clarify multiplier
        points: pointsEarned,
        type: 'action',
    });

    toast({
      title: 'Action Logged!',
      description: `You earned ${pointsEarned} points for "${action.name}".`,
    });
  };


  const handleSaveAction = async () => {
    if (!currentSpace || !newActionName.trim()) return;

    const points = Number(newActionPoints) || 1; // Default to 1 if invalid

    const success = await createAction({
        spaceId: currentSpace.id,
        name: newActionName.trim(),
        description: newActionDescription.trim(),
        points: points,
    });

    if (success) {
      setNewActionName('');
      setNewActionDescription('');
      setNewActionPoints(1);
      setIsCreateActionModalOpen(false);
       toast({
            title: 'Action Created!',
            description: `Action "${newActionName.trim()}" added.`,
       });
    }
    // Error handled by context
  };

   // Multi-Step Action Handling
    const handleSaveMultiStepAction = async () => {
        if (!currentSpace || !newMultiStepActionName.trim() || newMultiStepActionSteps.some(s => !s.trim())) {
             toast({ title: "Validation Error", description: "Action name and all steps are required.", variant: "destructive" });
            return;
        }

        const points = Number(newMultiStepActionPoints) || 1;
        const stepsData = newMultiStepActionSteps.map(name => ({ name: name.trim() }));

        const success = await createMultiStepAction({
            spaceId: currentSpace.id,
            name: newMultiStepActionName.trim(),
            description: newMultiStepActionDescription.trim(),
            pointsPerStep: points,
            steps: stepsData,
        });

        if (success) {
            setNewMultiStepActionName('');
            setNewMultiStepActionDescription('');
            setNewMultiStepActionPoints(1);
            setNewMultiStepActionSteps(['']);
            setIsCreateMultiStepActionModalOpen(false);
            toast({
                 title: 'Multi-Step Action Created!',
                 description: `Action "${newMultiStepActionName.trim()}" added.`,
            });
        }
        // Error handled by context
    };

     const handleMultiStepActionClick = async (action: MultiStepAction) => {
        if (!isClockedIn) {
            toast({ title: 'Not Clocked In!', description: 'You must clock in first.', variant: 'destructive' });
            return;
        }
        if (action.currentStepIndex >= action.steps.length) {
            toast({ title: 'Action Complete', description: `"${action.name}" is already finished.`, variant: "default" });
            return;
        }

        // Call the service method to complete the step
        await completeMultiStepActionStep(action.id);
        // Toast and state updates are handled within the context/service callback now
    };

     const handleStepNameChange = (index: number, value: string) => {
        const updatedSteps = [...newMultiStepActionSteps];
        updatedSteps[index] = value;
        setNewMultiStepActionSteps(updatedSteps);
    };

    const addStepInput = () => {
        setNewMultiStepActionSteps([...newMultiStepActionSteps, '']);
    };

    const removeStepInput = (index: number) => {
        if (newMultiStepActionSteps.length > 1) {
            const updatedSteps = newMultiStepActionSteps.filter((_, i) => i !== index);
            setNewMultiStepActionSteps(updatedSteps);
        }
    };


   // Waste Handling
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
    if (!currentSpace || selectedWasteCategories.length === 0) return;

    const added = await addWasteEntries(currentSpace.id, selectedWasteCategories);

    if (added.length > 0) {
         toast({
            title: 'Waste Added!',
            description: `Added ${added.length} waste entr${added.length > 1 ? 'ies' : 'y'}.`,
        });
        setSelectedWasteCategories([]); // Clear selection
        setIsAddWasteModalOpen(false);
    }
     // Error handled by context
   };

   // Comment Handling
   const handleCommentImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleImageUploadUtil(event, setNewCommentImage); // Use the utility function
  };

   const handleAddComment = async () => {
    if (!currentSpace || (!newCommentText.trim() && !newCommentImage)) {
         toast({ title: "Validation Error", description: "Comment needs text or an image.", variant: "destructive" });
        return;
    }

    const success = await addComment({
        spaceId: currentSpace.id,
        text: newCommentText.trim(),
        imageUrl: newCommentImage,
        // timestamp set by service
    });

    if (success) {
        setNewCommentText('');
        setNewCommentImage(null);
        // Clear file input visually if possible (requires ref or more complex state)
         toast({ title: "Comment Added", description: "Your comment has been saved." });
    }
    // Error handled by context
   };


   // --- Helper Functions ---
  // Removed formatTime and formatElapsedTime as they are imported from dateUtils now


  // --- Render Logic ---

   // Loading State
   if (isLoading && !currentSpace) {
    return (
        <div className="flex flex-col items-center justify-start min-h-screen py-4 bg-background p-2">
            <Skeleton className="h-10 w-3/4 max-w-lg mb-2" />
             <Skeleton className="h-8 w-1/2 max-w-md mb-4" />
             <div className="w-full max-w-4xl space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        </div>
    );
  }

  // Error State
   if (error) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-destructive">
            <h2 className="text-xl mb-2">Error Loading Space</h2>
            <p className="mb-4">{error}</p>
            <Button onClick={handleBack} variant="outline">Back to Home</Button>
        </div>
    );
   }

  // Space Not Found (should be covered by error state if loadSpaceDetails throws)
  if (!currentSpace) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-muted-foreground">
            <h2 className="text-xl mb-4">Space not found.</h2>
            <Button onClick={handleBack} variant="outline">Back to Home</Button>
        </div>
    );
  }


  // Main Render
  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-2 bg-background p-2"> {/* Reduced py */}
      {/* Space Details Header (Compact) */}
       <Card className="w-full max-w-4xl mb-2 card-shadow">
          <CardHeader className="p-2 flex flex-row items-center justify-between"> {/* Flex row */}
              <CardTitle className="text-lg font-bold truncate flex-1 mr-2">{currentSpace.name}</CardTitle> {/* Smaller title, truncate */}
              <Button size="sm" variant="ghost" onClick={handleBack} className="text-xs"> {/* Smaller back button */}
                 Back
             </Button>
          </CardHeader>
          {/* Optional: Move images/description to a collapsible section if needed */}
           {/* <CardContent className="p-2 text-xs">
              <p>{currentSpace.description || "No description"}</p>
              {currentSpace.goal && <p>Goal: {currentSpace.goal}</p>}
          </CardContent> */}
      </Card>

      {/* Dashboard */}
      <Card className="w-full max-w-4xl mb-2 card-shadow">
          <CardContent className="p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-2 gap-y-1 text-xs items-center"> {/* More columns on larger screens */}
              {/* Clock In/Out */}
              <div className="flex items-center justify-center">
                 {!isClockedIn
                    ? <Button variant="outline" size="sm" onClick={handleClockIn} className="text-xs w-full">Clock In</Button>
                    : <Button variant="destructive" size="sm" onClick={handleClockOut} className="text-xs w-full">Clock Out</Button>
                 }
             </div>
             {/* Timers */}
             <div className="text-center"><span className="font-semibold">Session:</span><br/>{formatElapsedTime(currentSessionElapsedTime)}</div>
             <div className="text-center"><span className="font-semibold">Total:</span><br/>{currentSpace.totalClockedInTime} min</div>
             {/* Metrics */}
             <div className="text-center"><span className="font-semibold">AP:</span><br/>{totalPoints.toFixed(0)}</div>
             <div className="text-center"><span className="font-semibold">AP/H:</span><br/>{apPerCurrentSessionHour.toFixed(1)}</div> {/* Use the new state */}
             <div className="text-center"><span className="font-semibold">Waste:</span><br/>{totalWastePoints}</div>
          </CardContent>
      </Card>

       {/* Actions Section */}
       <div className="mt-2 w-full max-w-4xl">
            <h2 className="text-base font-bold mb-1">Actions</h2> {/* Smaller heading */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                 {/* Regular Actions */}
                 {actions.map((action) => (
                     <div key={action.id} className="flex space-x-1">
                        <Button
                             variant="secondary"
                             size="sm" // Smaller buttons
                             onClick={() => handleActionClick(action, 1)}
                             disabled={!isClockedIn}
                             className="text-xs flex-1" // flex-1 to take available space
                         >
                             {action.name} <span className="ml-auto pl-1">(+{action.points})</span> {/* Points right aligned */}
                         </Button>
                         {/* Add other multipliers back if needed, keep them small */}
                         <Button variant="secondary" size="sm" onClick={() => handleActionClick(action, 2)} disabled={!isClockedIn} className="text-xs w-8">x2</Button>
                         <Button variant="secondary" size="sm" onClick={() => handleActionClick(action, 5)} disabled={!isClockedIn} className="text-xs w-8">x5</Button>
                         <Button variant="secondary" size="sm" onClick={() => handleActionClick(action, 10)} disabled={!isClockedIn} className="text-xs w-8">x10</Button> {/* Added x10 */}
                     </div>
                ))}
                 {/* Multi-Step Actions */}
                 {multiStepActions.map((action) => (
                     <div key={action.id}>
                         <Button
                            variant="outline" // Different variant
                            size="sm"
                            onClick={() => handleMultiStepActionClick(action)}
                             disabled={!isClockedIn || action.currentStepIndex >= action.steps.length}
                             className={`text-xs w-full justify-start ${action.currentStepIndex >= action.steps.length ? 'line-through' : ''}`} // Justify start
                         >
                            {action.name}
                             <span className="ml-auto text-muted-foreground">
                                {action.currentStepIndex >= action.steps.length
                                    ? `(Done)`
                                    : `(${action.currentStepIndex + 1}/${action.steps.length})`}
                             </span>
                         </Button>
                          {/* Optionally show current step below */}
                         {/* {action.currentStepIndex < action.steps.length && (
                            <p className="text-xs text-muted-foreground pl-2">Next: {action.steps[action.currentStepIndex].name}</p>
                         )} */}
                     </div>
                 ))}

            </div>

            {/* Create Action Buttons */}
             <div className="flex gap-1 mt-1">
                <Button className="flex-1" size="sm" onClick={() => setIsCreateActionModalOpen(true)}>
                     + Simple Action
                 </Button>
                 <Button className="flex-1" size="sm" onClick={() => setIsCreateMultiStepActionModalOpen(true)}>
                     + Multi-Step Action
                 </Button>
            </div>
       </div>


      {/* Waste Tracking */}
      <div className="mt-3 w-full max-w-4xl"> {/* Increased mt */}
        <div className="flex justify-between items-center mb-1">
             <h2 className="text-base font-bold">Waste Tracking</h2> {/* Smaller heading */}
             <Button size="sm" onClick={handleAddWasteClick}>Add Waste</Button>
        </div>
         {/* Use a progress bar or simple display */}
        <div className="text-xs text-muted-foreground">
             {wasteEntries.length > 0 ? (
                <>
                     <span>Latest: {wasteEntries[0].type} ({formatTime(wasteEntries[0].timestamp)})</span>
                    <Button variant="link" size="sm" className="text-xs h-auto px-1 py-0 ml-1" onClick={() => setIsWasteDetailsOpen(true)}>
                        (See All)
                    </Button>
                </>
            ) : (
                <span>No waste entries yet.</span>
            )}
            <span className="ml-2">| Total Points: {totalWastePoints}</span>
        </div>
         {/* <Progress value={(totalWastePoints / (totalPoints + totalWastePoints || 1)) * 100} className="h-1 mt-1"/> */}
      </div>

      {/* Log */}
      <div className="mt-3 w-full max-w-4xl"> {/* Increased mt */}
         <div className="flex justify-between items-center mb-1">
            <h2 className="text-base font-bold">Log</h2> {/* Smaller heading */}
             <Button variant="link" size="sm" className="text-xs h-auto px-1 py-0" onClick={() => setIsLogDetailsOpen(true)} disabled={logEntries.length === 0}>
                 See All ({logEntries.length})
             </Button>
        </div>
         <div className="text-xs text-muted-foreground">
            {logEntries.length > 0 ? (
                <span>
                    Latest: {logEntries[0].actionName} at {formatTime(logEntries[0].timestamp)}
                    {logEntries[0].points > 0 ? ` (+${logEntries[0].points} pts)` : ''}
                    {logEntries[0].type === 'clockOut' && logEntries[0].minutesClockedIn !== undefined ? ` (${logEntries[0].minutesClockedIn} min session)`: ''}
                </span>
            ) : (
                <span>No log entries yet.</span>
            )}
         </div>
      </div>

      {/* Comments */}
      <div className="mt-3 w-full max-w-4xl"> {/* Increased mt */}
        <div className="flex justify-between items-center mb-1">
             <h2 className="text-base font-bold">Comments</h2> {/* Smaller heading */}
             <Button variant="link" size="sm" className="text-xs h-auto px-1 py-0" onClick={() => setIsCommentDetailsOpen(true)} disabled={comments.length === 0}>
                 See All ({comments.length})
             </Button>
        </div>
         <div className="text-xs text-muted-foreground mb-1">
            {comments.length > 0 ? (
                <span>Latest: {comments[0].text.substring(0, 40)}{comments[0].text.length > 40 ? '...' : ''} ({formatTime(comments[0].timestamp)})</span>
            ) : (
                <span>No comments yet.</span>
            )}
         </div>
        {/* Comment Input Area - Keep compact */}
        <div className="flex flex-col sm:flex-row gap-1 mt-1">
             <Textarea
                id="comment"
                className="flex-grow p-1 border rounded text-foreground text-xs min-h-[40px] h-10 sm:h-auto" // Smaller textarea
                placeholder="Add a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
             />
             <div className="flex flex-col gap-1 w-full sm:w-auto">
                <Input
                    type="file"
                    id="image"
                    accept="image/*"
                    className="w-full p-1 border rounded text-xs h-8" // Smaller file input
                    onChange={handleCommentImageUpload}
                 />
                  {newCommentImage && (
                     <img src={newCommentImage} alt="Preview" className="rounded max-h-10 object-cover self-center sm:self-start" />
                 )}
                 <Button onClick={handleAddComment} size="sm" className="text-xs h-8 w-full" disabled={isLoading || (!newCommentText.trim() && !newCommentImage)}>
                     Add Comment
                 </Button>
             </div>
        </div>
      </div>

       {/* Modals remain the same, they are overlays */}
        {/* Create Simple Action Modal */}
         <Dialog open={isCreateActionModalOpen} onOpenChange={setIsCreateActionModalOpen}>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>Create New Simple Action</DialogTitle>
                <DialogDescription>
                Define a repeatable action and the points awarded.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div>
                    <Label htmlFor="action-name">Name *</Label>
                    <Input id="action-name" value={newActionName} onChange={(e) => setNewActionName(e.target.value)} placeholder="e.g., Process Inbox" />
                </div>
                 <div>
                    <Label htmlFor="action-desc">Description</Label>
                    <Textarea id="action-desc" value={newActionDescription} onChange={(e) => setNewActionDescription(e.target.value)} placeholder="(Optional)"/>
                </div>
                 <div>
                    <Label htmlFor="action-points">Points *</Label>
                    <Input id="action-points" type="number" min="1" value={newActionPoints} onChange={(e) => setNewActionPoints(e.target.value)} placeholder="e.g., 5"/>
                </div>
            </div>
            <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                 </DialogClose>
                <Button type="button" onClick={handleSaveAction} disabled={isLoading || !newActionName.trim()}>Create</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Create Multi-Step Action Modal */}
        <Dialog open={isCreateMultiStepActionModalOpen} onOpenChange={setIsCreateMultiStepActionModalOpen}>
            <DialogContent className="sm:max-w-[500px]"> {/* Wider modal */}
                <DialogHeader>
                    <DialogTitle>Create New Multi-Step Action</DialogTitle>
                    <DialogDescription>
                        Define an action with sequential steps. Points are awarded per step completion.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div>
                        <Label htmlFor="multi-action-name">Action Name *</Label>
                        <Input id="multi-action-name" value={newMultiStepActionName} onChange={(e) => setNewMultiStepActionName(e.target.value)} placeholder="e.g., Weekly Review"/>
                    </div>
                     <div>
                        <Label htmlFor="multi-action-desc">Description</Label>
                        <Textarea id="multi-action-desc" value={newMultiStepActionDescription} onChange={(e) => setNewMultiStepActionDescription(e.target.value)} placeholder="(Optional)" />
                    </div>
                    <div>
                        <Label htmlFor="multi-action-points">Points per Step *</Label>
                        <Input id="multi-action-points" type="number" min="1" value={newMultiStepActionPoints} onChange={(e) => setNewMultiStepActionPoints(e.target.value)} placeholder="e.g., 10"/>
                    </div>
                     {/* Steps Input */}
                     <div>
                        <Label>Steps *</Label>
                        <div className="space-y-2">
                            {newMultiStepActionSteps.map((step, index) => (
                                <div key={index} className="flex items-center gap-2">
                                     <Input
                                        type="text"
                                        value={step}
                                        onChange={(e) => handleStepNameChange(index, e.target.value)}
                                        placeholder={`Step ${index + 1} Name`}
                                        className="flex-grow"
                                    />
                                    {newMultiStepActionSteps.length > 1 && (
                                        <Button variant="ghost" size="sm" onClick={() => removeStepInput(index)} aria-label="Remove step">X</Button>
                                    )}
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={addStepInput}>+ Add Step</Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                     <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button
                        type="button"
                        onClick={handleSaveMultiStepAction}
                        disabled={isLoading || !newMultiStepActionName.trim() || newMultiStepActionSteps.some(s => !s.trim())}
                    >
                        Create Multi-Step Action
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


      {/* Add Waste Modal */}
      <Dialog open={isAddWasteModalOpen} onOpenChange={setIsAddWasteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Waste (TIMWOODS)</DialogTitle>
            <DialogDescription>
              Select observed waste categories. Points indicate severity/impact.
            </DialogDescription>
          </DialogHeader>
           <ScrollArea className="max-h-60"> {/* Scroll if many categories */}
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1">
                {timwoodsCategories.map((category) => (
                    <Button
                    key={category.id}
                    variant={selectedWasteCategories.includes(category.id) ? 'default' : 'outline'}
                    onClick={() => handleWasteCategoryClick(category.id)}
                    size="sm"
                    className="text-xs h-auto py-2 flex flex-col items-start" // Align text start
                    >
                     <span className="font-semibold">{category.name} (+{category.points})</span>
                     <span className="text-xs text-muted-foreground font-normal">{category.description}</span>
                    </Button>
                ))}
                </div>
           </ScrollArea>
          <DialogFooter>
             <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={() => setSelectedWasteCategories([])}>Cancel</Button>
             </DialogClose>
            <Button type="button" onClick={handleSaveWaste} disabled={isLoading || selectedWasteCategories.length === 0}>Add Selected Waste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Details Modal */}
       <Dialog open={isLogDetailsOpen} onOpenChange={setIsLogDetailsOpen}>
          <DialogContent className="max-w-md sm:max-w-lg md:max-w-xl"> {/* Responsive width */}
              <DialogHeader>
                  <DialogTitle>Log Details</DialogTitle>
                  <DialogDescription>
                      All recorded events for this space, newest first.
                  </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] border rounded-md"> {/* Max height, border */}
                  <div className="p-2 space-y-1">
                     {logEntries.length === 0 && <p className="text-muted-foreground text-sm text-center p-4">No log entries yet.</p>}
                     {logEntries.map((logEntry) => {
                          let detail = '';
                          if (logEntry.type === 'action') {
                              detail = `Completed: ${logEntry.actionName}`;
                          } else if (logEntry.type === 'multiStepAction') {
                              detail = `Step ${logEntry.stepIndex !== undefined ? logEntry.stepIndex + 1 : '?'} of '${logEntry.actionName}' completed`;
                          } else if (logEntry.type === 'clockIn') {
                              detail = `Clocked In`;
                          } else if (logEntry.type === 'clockOut' && logEntry.clockInTime && logEntry.minutesClockedIn !== undefined) {
                             detail = `Clocked Out (Session: ${logEntry.minutesClockedIn} min)`;
                          } else if (logEntry.type === 'clockOut') {
                               detail = `Clocked Out`;
                          }

                          return (
                              <div key={logEntry.id} className="text-xs p-1 border-b last:border-b-0">
                                  <span className="font-mono text-muted-foreground mr-2">[{format(logEntry.timestamp, 'MM/dd HH:mm:ss')}]</span>
                                  <span>{detail}</span>
                                  {logEntry.points > 0 && <span className="font-semibold text-primary ml-2">(+{logEntry.points} AP)</span>}
                              </div>
                          );
                      })}
                  </div>
              </ScrollArea>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="outline">Close</Button>
                  </DialogClose>
              </DialogFooter>
          </DialogContent>
       </Dialog>

        {/* Waste Details Modal */}
        <Dialog open={isWasteDetailsOpen} onOpenChange={setIsWasteDetailsOpen}>
          <DialogContent className="max-w-md">
              <DialogHeader>
                  <DialogTitle>Waste Details</DialogTitle>
                  <DialogDescription>
                      All recorded waste entries, newest first. Total: {totalWastePoints} pts
                  </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] border rounded-md">
                 <div className="p-2 space-y-1">
                    {wasteEntries.length === 0 && <p className="text-muted-foreground text-sm text-center p-4">No waste entries yet.</p>}
                    {wasteEntries.map((wasteEntry) => (
                        <div key={wasteEntry.id} className="text-xs p-1 border-b last:border-b-0">
                             <span className="font-mono text-muted-foreground mr-2">[{format(wasteEntry.timestamp, 'MM/dd HH:mm:ss')}]</span>
                             <span>{wasteEntry.type}</span>
                             <span className="font-semibold text-destructive ml-2">({wasteEntry.points} pts)</span>
                        </div>
                    ))}
                  </div>
              </ScrollArea>
               <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="outline">Close</Button>
                  </DialogClose>
              </DialogFooter>
          </DialogContent>
      </Dialog>

       {/* Comment Details Modal */}
       <Dialog open={isCommentDetailsOpen} onOpenChange={setIsCommentDetailsOpen}>
          <DialogContent className="max-w-md sm:max-w-lg">
              <DialogHeader>
                  <DialogTitle>Comments</DialogTitle>
                  <DialogDescription>
                      All comments for this space, newest first.
                  </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] border rounded-md">
                  <div className="p-2 space-y-2">
                    {comments.length === 0 && <p className="text-muted-foreground text-sm text-center p-4">No comments yet.</p>}
                    {comments.map((comment) => (
                        <Card key={comment.id} className="bg-card shadow-sm text-xs">
                            <CardContent className="p-2">
                                 <p className="text-xs text-muted-foreground mb-1">
                                    {format(comment.timestamp, 'MMM dd, yyyy hh:mm a')}
                                </p>
                                {comment.imageUrl && (
                                    <img src={comment.imageUrl} alt="Comment Image" className="rounded-md my-1 max-h-40 object-cover"/>
                                )}
                                <p className="text-foreground whitespace-pre-wrap">{comment.text}</p> {/* Preserve whitespace */}
                            </CardContent>
                        </Card>
                    ))}
                  </div>
              </ScrollArea>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="outline">Close</Button>
                  </DialogClose>
              </DialogFooter>
          </DialogContent>
      </Dialog>

    </div>
  );
}

    