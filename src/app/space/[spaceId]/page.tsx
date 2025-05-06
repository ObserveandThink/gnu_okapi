/**
 * @fileOverview Page component for displaying and interacting with a single Space.
 */
'use client';

import { useRouter, useParams } from 'next/navigation';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useSpaceContext } from '@/contexts/SpaceContext';
import { useClock } from '@/hooks/useClock'; // Import the new hook
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTime, formatShortDate } from '@/utils/dateUtils';
import { Camera, Trash2, Edit, Upload, X as CloseIcon, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Import Domain Models
import type { Action } from '@/core/domain/Action';
import type { MultiStepAction, ActionStep } from '@/core/domain/MultiStepAction';
import type { LogEntry } from '@/core/domain/LogEntry';
import type { WasteEntry } from '@/core/domain/WasteEntry';
import type { Comment } from '@/core/domain/Comment';
import type { TodoItem } from '@/core/domain/TodoItem';

// Import Extracted Components
import { SpaceDashboard } from '@/components/space/SpaceDashboard';
import { ActionList } from '@/components/space/ActionList';
import { WasteTracking } from '@/components/space/WasteTracking';
import { LogDisplay } from '@/components/space/LogDisplay';
import { CommentSection } from '@/components/space/CommentSection';
import { TodoListComponent } from '@/components/space/TodoListComponent'; // Assuming this was moved to components/space


// TIMWOODS Categories - Keep here or move to a config/constants file
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

// --- Main Page Component ---
export default function SpaceDetailPage({
  params,
}: {
  params: { spaceId: string };
}) {
  const { spaceId } = params; // Correctly access spaceId
  const router = useRouter();
  const {
      currentSpace,
      actions,
      multiStepActions,
      logEntries,
      wasteEntries,
      comments,
      isLoading, // Use the context's isLoading
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

  // --- Clock Hook ---
  const {
    isClockedIn,
    currentSessionElapsedTime,
    clockInStartTime, // Needed for AP/H calc
    handleClockIn,
    handleClockOut,
    isClockLoading, // Get loading state from the hook
  } = useClock(
    spaceId,
    addLogEntry,
    addClockedTime
  );

  // Local UI State (Modals, Input Fields)
  const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
  const [newActionName, setNewActionName] = useState('');
  const [newActionDescription, setNewActionDescription] = useState('');
  const [newActionPoints, setNewActionPoints] = useState<number | string>(1);

  const [isCreateMultiStepActionModalOpen, setIsCreateMultiStepActionModalOpen] = useState(false);
  const [newMultiStepActionName, setNewMultiStepActionName] = useState('');
  const [newMultiStepActionDescription, setNewMultiStepActionDescription] = useState('');
  const [newMultiStepActionPoints, setNewMultiStepActionPoints] = useState<number | string>(1);
  const [newMultiStepActionSteps, setNewMultiStepActionSteps] = useState<string[]>(['']);

  const [isAddWasteModalOpen, setIsAddWasteModalOpen] = useState(false);
  const [selectedWasteCategories, setSelectedWasteCategories] = useState<string[]>([]);

  const [isLogDetailsOpen, setIsLogDetailsOpen] = useState(false);
  const [isWasteDetailsOpen, setIsWasteDetailsOpen] = useState(false);
  const [isCommentDetailsOpen, setIsCommentDetailsOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false); // For modal specific loading


    // --- Effects ---
   useEffect(() => {
    if (spaceId) {
        console.log(`Effect: Loading details for spaceId: ${spaceId}`);
        loadSpaceDetails(spaceId);
    }
     return () => {
        console.log("Effect Cleanup: Clearing current space details.");
        clearCurrentSpace();
        // Clock hook handles its own timer cleanup
     };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spaceId]); // Dependencies: spaceId


   // --- Calculated Values ---
   const totalPoints = useMemo(() => {
    return logEntries.reduce((sum, entry) => sum + entry.points, 0);
  }, [logEntries]);

   const totalWastePoints = useMemo(() => {
    return wasteEntries.reduce((sum, entry) => sum + entry.points, 0);
  }, [wasteEntries]);

  const apPerCurrentSessionHour = useMemo(() => {
    if (!isClockedIn || !clockInStartTime || currentSessionElapsedTime <= 0) {
        return 0;
    }
    // Only consider points earned during the *current* session
    const sessionPointEntries = logEntries.filter(
        entry => entry.timestamp >= clockInStartTime && entry.points > 0
    );
    const sessionPoints = sessionPointEntries.reduce((sum, entry) => sum + entry.points, 0);
    const sessionHours = currentSessionElapsedTime / 3600;
    if (sessionHours <= 0) return 0;
    return sessionPoints / sessionHours;
 }, [logEntries, isClockedIn, clockInStartTime, currentSessionElapsedTime]);

   // --- Event Handlers ---
  const handleBack = () => router.push('/');

   // Action Handling
   const handleActionClick = async (action: Action, multiplier: number) => {
    if (!isClockedIn) {
      toast({ title: 'Not Clocked In!', description: 'Clock in first.', variant: 'destructive' });
      return;
    }
    if (!currentSpace || isLoading || modalLoading) return; // Use modalLoading for action clicks too
     setModalLoading(true); // Indicate loading for action logging
    try {
        const pointsEarned = action.points * multiplier;
        await addLogEntry({ spaceId: currentSpace.id, actionName: `${action.name} (x${multiplier})`, points: pointsEarned, type: 'action' });
        toast({ title: 'Action Logged!', description: `Earned ${pointsEarned} points.` });
    } finally {
         setModalLoading(false); // Clear loading state
    }
  };

  const handleSaveAction = async () => {
    if (!currentSpace || !newActionName.trim() || isLoading || modalLoading) return;
    setModalLoading(true);
    try {
        const points = Number(newActionPoints) || 1;
        const success = await createAction({ spaceId: currentSpace.id, name: newActionName.trim(), description: newActionDescription.trim(), points });
        if (success) {
          setNewActionName(''); setNewActionDescription(''); setNewActionPoints(1); setIsCreateActionModalOpen(false);
           toast({ title: 'Action Created!', description: `Action "${newActionName.trim()}" added.` });
        }
    } finally {
        setModalLoading(false);
    }
  };

   // Multi-Step Action Handling
    const handleSaveMultiStepAction = async () => {
        if (!currentSpace || !newMultiStepActionName.trim() || newMultiStepActionSteps.some(s => !s.trim()) || isLoading || modalLoading) {
             toast({ title: "Validation Error", description: "Action name and all steps required.", variant: "destructive" });
            return;
        }
        setModalLoading(true);
        try {
            const points = Number(newMultiStepActionPoints) || 1;
            const stepsData = newMultiStepActionSteps.map(name => ({ name: name.trim() }));
            const success = await createMultiStepAction({ spaceId: currentSpace.id, name: newMultiStepActionName.trim(), description: newMultiStepActionDescription.trim(), pointsPerStep: points, steps: stepsData });
            if (success) {
                setNewMultiStepActionName(''); setNewMultiStepActionDescription(''); setNewMultiStepActionPoints(1); setNewMultiStepActionSteps(['']); setIsCreateMultiStepActionModalOpen(false);
                toast({ title: 'Multi-Step Action Created!', description: `Action "${newMultiStepActionName.trim()}" added.` });
            }
        } finally {
            setModalLoading(false);
        }
    };

     const handleMultiStepActionClick = async (action: MultiStepAction) => {
        if (!isClockedIn) {
            toast({ title: 'Not Clocked In!', description: 'Clock in first.', variant: 'destructive' }); return;
        }
        if (action.currentStepIndex >= action.steps.length || isLoading || modalLoading) {
            if (action.currentStepIndex >= action.steps.length) toast({ title: 'Action Complete', variant: "default" });
            return;
        }
        setModalLoading(true);
        try {
            await completeMultiStepActionStep(action.id);
            // Toast is handled within completeMultiStepActionStep via context
        } finally {
            setModalLoading(false);
        }
    };

     const handleStepNameChange = (index: number, value: string) => {
        const updatedSteps = [...newMultiStepActionSteps]; updatedSteps[index] = value; setNewMultiStepActionSteps(updatedSteps);
    };
    const addStepInput = () => setNewMultiStepActionSteps([...newMultiStepActionSteps, '']);
    const removeStepInput = (index: number) => {
        if (newMultiStepActionSteps.length > 1) setNewMultiStepActionSteps(newMultiStepActionSteps.filter((_, i) => i !== index));
    };

   // Waste Handling
   const handleWasteCategoryClick = (categoryId: string) => setSelectedWasteCategories(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]);
   const handleSaveWaste = async () => {
    if (!currentSpace || selectedWasteCategories.length === 0 || isLoading || modalLoading) return;
    setModalLoading(true);
    try {
        const added = await addWasteEntries(currentSpace.id, selectedWasteCategories);
        if (added.length > 0) {
             toast({ title: 'Waste Added!', description: `Added ${added.length} waste entr${added.length > 1 ? 'ies' : 'y'}.` });
            setSelectedWasteCategories([]); setIsAddWasteModalOpen(false);
        }
    } finally {
        setModalLoading(false);
    }
   };


   // --- Render Logic ---
   // Display loading skeleton while context is loading OR if currentSpace is not yet available
   if (isLoading || !currentSpace) {
       // Use the existing loading component or a simplified version
       return <LoadingSkeleton />; // Replace with your actual Loading component if preferred
   }
  if (error && !isLoading) { // Only show error if not loading
    return <ErrorDisplay error={error} onRetry={handleBack} />; // Replace with your Error component
  }

  // Main Render
  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-2 bg-background p-2">
      {/* Header */}
       <Card className="w-full max-w-4xl mb-2 card-shadow">
          <CardHeader className="p-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold truncate flex-1 mr-2">{currentSpace.name}</CardTitle>
              <Button size="sm" variant="ghost" onClick={handleBack} className="text-xs">Back</Button>
          </CardHeader>
      </Card>

      {/* Dashboard */}
      <SpaceDashboard
        isClockedIn={isClockedIn}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
        isLoading={isClockLoading || modalLoading}
        currentSessionElapsedTime={currentSessionElapsedTime}
        totalClockedInTime={currentSpace.totalClockedInTime}
        totalPoints={totalPoints}
        apPerCurrentSessionHour={apPerCurrentSessionHour}
        totalWastePoints={totalWastePoints}
      />

       {/* Actions Section */}
       <ActionList
         actions={actions}
         multiStepActions={multiStepActions}
         isClockedIn={isClockedIn}
         isLoading={isLoading || modalLoading} // Pass combined loading state
         onActionClick={handleActionClick}
         onMultiStepActionClick={handleMultiStepActionClick}
         onCreateSimpleAction={() => setIsCreateActionModalOpen(true)}
         onCreateMultiStepAction={() => setIsCreateMultiStepActionModalOpen(true)}
       />

       {/* To-Do List / Gallery Component */}
       <TodoListComponent spaceId={spaceId} /> {/* Assumes this component is self-contained */}

      {/* Waste Tracking */}
      <WasteTracking
        wasteEntries={wasteEntries}
        totalWastePoints={totalWastePoints}
        isLoading={isLoading || modalLoading}
        onAddWasteClick={() => setIsAddWasteModalOpen(true)}
        onShowDetailsClick={() => setIsWasteDetailsOpen(true)}
      />

      {/* Log */}
      <LogDisplay
        logEntries={logEntries}
        isLoading={isLoading}
        onShowDetailsClick={() => setIsLogDetailsOpen(true)}
      />

      {/* Comments */}
      <CommentSection
        comments={comments}
        spaceId={spaceId} // Pass spaceId if needed for adding comments
        isLoading={isLoading || modalLoading}
        onAddComment={addComment} // Pass the context function directly
        onShowDetailsClick={() => setIsCommentDetailsOpen(true)}
      />


       {/* --- Modals --- */}

       {/* Create Simple Action Modal */}
        <Dialog open={isCreateActionModalOpen} onOpenChange={setIsCreateActionModalOpen}>
            <DialogContent> <DialogHeader><DialogTitle>Create Simple Action</DialogTitle><DialogDescription>Define action and points.</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
                <div><Label htmlFor="action-name">Name *</Label><Input id="action-name" value={newActionName} onChange={(e) => setNewActionName(e.target.value)} placeholder="e.g., Process Inbox" /></div>
                <div><Label htmlFor="action-desc">Description</Label><Textarea id="action-desc" value={newActionDescription} onChange={(e) => setNewActionDescription(e.target.value)} placeholder="(Optional)"/></div>
                <div><Label htmlFor="action-points">Points *</Label><Input id="action-points" type="number" min="1" value={newActionPoints} onChange={(e) => setNewActionPoints(e.target.value)} placeholder="e.g., 5"/></div>
            </div>
            <DialogFooter><DialogClose asChild><Button type="button" variant="secondary" disabled={modalLoading}>Cancel</Button></DialogClose><Button type="button" onClick={handleSaveAction} disabled={isLoading || modalLoading || !newActionName.trim()}>Create</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Create Multi-Step Action Modal */}
        <Dialog open={isCreateMultiStepActionModalOpen} onOpenChange={setIsCreateMultiStepActionModalOpen}>
            <DialogContent className="sm:max-w-[500px]"> <DialogHeader><DialogTitle>Create Multi-Step Action</DialogTitle><DialogDescription>Define sequential steps. Points per step.</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div><Label htmlFor="multi-action-name">Action Name *</Label><Input id="multi-action-name" value={newMultiStepActionName} onChange={(e) => setNewMultiStepActionName(e.target.value)} placeholder="e.g., Weekly Review"/></div>
                    <div><Label htmlFor="multi-action-desc">Description</Label><Textarea id="multi-action-desc" value={newMultiStepActionDescription} onChange={(e) => setNewMultiStepActionDescription(e.target.value)} placeholder="(Optional)" /></div>
                    <div><Label htmlFor="multi-action-points">Points per Step *</Label><Input id="multi-action-points" type="number" min="1" value={newMultiStepActionPoints} onChange={(e) => setNewMultiStepActionPoints(e.target.value)} placeholder="e.g., 10"/></div>
                     <div><Label>Steps *</Label><div className="space-y-2"> {newMultiStepActionSteps.map((step, index) => (<div key={index} className="flex items-center gap-2"> <Input type="text" value={step} onChange={(e) => handleStepNameChange(index, e.target.value)} placeholder={`Step ${index + 1} Name`} className="flex-grow"/> {newMultiStepActionSteps.length > 1 && (<Button variant="ghost" size="sm" onClick={() => removeStepInput(index)} aria-label="Remove step" disabled={modalLoading}>X</Button>)} </div>))} <Button type="button" variant="outline" size="sm" onClick={addStepInput} disabled={modalLoading}>+ Add Step</Button> </div></div>
                </div>
                <DialogFooter><DialogClose asChild><Button type="button" variant="secondary" disabled={modalLoading}>Cancel</Button></DialogClose><Button type="button" onClick={handleSaveMultiStepAction} disabled={isLoading || modalLoading || !newMultiStepActionName.trim() || newMultiStepActionSteps.some(s => !s.trim())}> Create </Button></DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Add Waste Modal */}
        <Dialog open={isAddWasteModalOpen} onOpenChange={setIsAddWasteModalOpen}>
            <DialogContent> <DialogHeader><DialogTitle>Add Waste (TIMWOODS)</DialogTitle><DialogDescription>Select observed waste categories.</DialogDescription></DialogHeader>
            <ScrollArea className="max-h-60"> <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1"> {timwoodsCategories.map((category) => (<Button key={category.id} variant={selectedWasteCategories.includes(category.id) ? 'default' : 'outline'} onClick={() => handleWasteCategoryClick(category.id)} size="sm" className="text-xs h-auto py-2 flex flex-col items-start"> <span className="font-semibold">{category.name} (+{category.points})</span> <span className="text-xs text-muted-foreground font-normal">{category.description}</span> </Button>))} </div> </ScrollArea>
            <DialogFooter><DialogClose asChild><Button type="button" variant="secondary" onClick={() => setSelectedWasteCategories([])} disabled={modalLoading}>Cancel</Button></DialogClose><Button type="button" onClick={handleSaveWaste} disabled={isLoading || modalLoading || selectedWasteCategories.length === 0}>Add Selected Waste</Button></DialogFooter>
            </DialogContent>
        </Dialog>

       {/* Log Details Modal */}
       <Dialog open={isLogDetailsOpen} onOpenChange={setIsLogDetailsOpen}>
          <DialogContent className="max-w-md sm:max-w-lg md:max-w-xl"> <DialogHeader><DialogTitle>Log Details</DialogTitle><DialogDescription>All recorded events, newest first.</DialogDescription></DialogHeader>
              <ScrollArea className="max-h-[60vh] border rounded-md"> <div className="p-2 space-y-1">
                     {logEntries.length === 0 && <p className="text-muted-foreground text-sm text-center p-4">No log entries yet.</p>}
                     {logEntries.map((logEntry) => {
                          let detail = logEntry.type === 'action' ? `Completed: ${logEntry.actionName}` : logEntry.type === 'multiStepAction' ? `Step ${logEntry.stepIndex !== undefined ? logEntry.stepIndex + 1 : '?'} of '${logEntry.actionName}' completed` : logEntry.type === 'clockIn' ? `Clocked In` : logEntry.type === 'clockOut' && logEntry.clockInTime && logEntry.minutesClockedIn !== undefined ? `Clocked Out (Session: ${logEntry.minutesClockedIn} min)` : `Clocked Out`;
                          return <div key={logEntry.id} className="text-xs p-1 border-b last:border-b-0"> <span className="font-mono text-muted-foreground mr-2">[{format(logEntry.timestamp, 'MM/dd HH:mm:ss')}]</span> <span>{detail}</span> {logEntry.points > 0 && <span className="font-semibold text-primary ml-2">(+{logEntry.points} AP)</span>} </div>;
                      })}
                  </div> </ScrollArea>
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></DialogFooter>
          </DialogContent>
       </Dialog>

       {/* Waste Details Modal */}
        <Dialog open={isWasteDetailsOpen} onOpenChange={setIsWasteDetailsOpen}>
          <DialogContent className="max-w-md"> <DialogHeader><DialogTitle>Waste Details</DialogTitle><DialogDescription>All waste entries, newest first. Total: {totalWastePoints} pts</DialogDescription></DialogHeader>
              <ScrollArea className="max-h-[60vh] border rounded-md"> <div className="p-2 space-y-1">
                    {wasteEntries.length === 0 && <p className="text-muted-foreground text-sm text-center p-4">No waste entries yet.</p>}
                    {wasteEntries.map((wasteEntry) => (<div key={wasteEntry.id} className="text-xs p-1 border-b last:border-b-0"> <span className="font-mono text-muted-foreground mr-2">[{format(wasteEntry.timestamp, 'MM/dd HH:mm:ss')}]</span> <span>{wasteEntry.type}</span> <span className="font-semibold text-destructive ml-2">({wasteEntry.points} pts)</span> </div>))}
                  </div> </ScrollArea>
               <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Comment Details Modal */}
       <Dialog open={isCommentDetailsOpen} onOpenChange={setIsCommentDetailsOpen}>
          <DialogContent className="max-w-md sm:max-w-lg"> <DialogHeader><DialogTitle>Comments</DialogTitle><DialogDescription>All comments, newest first.</DialogDescription></DialogHeader>
              <ScrollArea className="max-h-[60vh] border rounded-md"> <div className="p-2 space-y-2">
                    {comments.length === 0 && <p className="text-muted-foreground text-sm text-center p-4">No comments yet.</p>}
                    {comments.map((comment) => (<Card key={comment.id} className="bg-card shadow-sm text-xs"> <CardContent className="p-2"> <p className="text-xs text-muted-foreground mb-1">{format(comment.timestamp, 'MMM dd, yyyy hh:mm a')}</p> {comment.imageUrl && <img src={comment.imageUrl} alt="Comment Image" className="rounded-md my-1 max-h-40 object-cover"/>} <p className="text-foreground whitespace-pre-wrap">{comment.text}</p> </CardContent> </Card>))}
                  </div> </ScrollArea>
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></DialogFooter>
          </DialogContent>
      </Dialog>

       {/* Note: Camera capture modals are now likely within CommentSection or TodoListComponent */}

    </div>
  );
}


// --- Helper Components (Keep or move to separate files) ---

const LoadingSkeleton = () => (
    <div className="flex flex-col items-center justify-start min-h-screen py-4 bg-background p-2">
        {/* Mimic the structure of the SpaceDetailPage */}
        <Card className="w-full max-w-4xl mb-2">
           <CardHeader className="p-2 flex flex-row items-center justify-between">
               <Skeleton className="h-6 w-1/2" /> {/* Placeholder for title */}
               <Skeleton className="h-8 w-16" /> {/* Placeholder for back button */}
           </CardHeader>
        </Card>
        <Card className="w-full max-w-4xl mb-2">
           <CardContent className="p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
               <Skeleton className="h-10 w-full" /> {/* Placeholder for clock button */}
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
           </CardContent>
        </Card>
        <div className="w-full max-w-4xl space-y-4 mt-2">
           <Skeleton className="h-24 w-full" /> {/* Actions placeholder */}
           <Skeleton className="h-40 w-full" /> {/* To-Do placeholder */}
           <Skeleton className="h-16 w-full" /> {/* Waste placeholder */}
           <Skeleton className="h-16 w-full" /> {/* Log placeholder */}
           <Skeleton className="h-20 w-full" /> {/* Comment placeholder */}
        </div>
    </div>
);

const ErrorDisplay: React.FC<{ error: string | null; onRetry: () => void }> = ({ error, onRetry }) => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-destructive">
        <h2 className="text-xl mb-2">Error Loading Space</h2>
        <p className="mb-4">{error || 'An unknown error occurred.'}</p>
        <Button onClick={onRetry} variant="outline">Back</Button>
    </div>
);
