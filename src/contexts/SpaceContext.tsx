/**
 * @fileOverview React Context provider for managing application state related to Spaces and their contents.
 * Uses the service layer to interact with data persistence.
 */
'use client';

import type React from 'react';
import {
  createContext,
  useCallback,
  useState,
  useEffect,
  useContext,
  useMemo,
} from 'react';
import { toast } from '@/hooks/use-toast';

// Import Domain Models
import type { Space } from '@/core/domain/Space';
import type { Action } from '@/core/domain/Action';
import type { MultiStepAction, ActionStep } from '@/core/domain/MultiStepAction';
import type { LogEntry } from '@/core/domain/LogEntry';
import type { WasteEntry } from '@/core/domain/WasteEntry';
import type { Comment } from '@/core/domain/Comment';

// Import Service Layer
import { SpaceService } from '@/core/services/SpaceService';
import { ActionService } from '@/core/services/ActionService';
import { MultiStepActionService } from '@/core/services/MultiStepActionService';
import { LogEntryService } from '@/core/services/LogEntryService';
import { WasteEntryService } from '@/core/services/WasteEntryService';
import { CommentService } from '@/core/services/CommentService';

// Import Repository Factory (using the singleton instance)
import { repositoryFactory } from '@/infrastructure/persistence/IndexedDBRepositoryFactory';

// --- Context Props Interface ---

interface SpaceContextProps {
  // State
  spaces: Space[];
  currentSpace: Space | null; // Currently viewed space details
  actions: Action[];
  multiStepActions: MultiStepAction[];
  logEntries: LogEntry[];
  wasteEntries: WasteEntry[];
  comments: Comment[];
  isLoading: boolean; // Flag for loading states
  error: string | null; // To display errors

  // Actions / Service Methods
  loadSpaces: () => Promise<void>;
  loadSpaceDetails: (spaceId: string) => Promise<void>; // Loads details for a specific space
  clearCurrentSpace: () => void; // Clears the detailed view state
  createSpace: (spaceData: Omit<Space, 'id' | 'dateCreated' | 'dateModified' | 'totalClockedInTime'>) => Promise<Space | undefined>;
  updateSpace: (space: Space) => Promise<void>;
  deleteSpace: (spaceId: string) => Promise<void>;
  addClockedTime: (spaceId: string, additionalMinutes: number) => Promise<void>;

  createAction: (actionData: Omit<Action, 'id'>) => Promise<Action | undefined>;
  // updateAction: (action: Action) => Promise<void>; // Add if needed
  // deleteAction: (id: string) => Promise<void>; // Add if needed

  createMultiStepAction: (actionData: Omit<MultiStepAction, 'id' | 'currentStepIndex' | 'steps'> & { steps: Omit<ActionStep, 'id' | 'completed'>[] }) => Promise<MultiStepAction | undefined>;
  completeMultiStepActionStep: (actionId: string) => Promise<MultiStepAction | undefined>;
  // updateMultiStepAction: (action: MultiStepAction) => Promise<void>; // Add if needed
  // deleteMultiStepAction: (id: string) => Promise<void>; // Add if needed

  addLogEntry: (logEntryData: Omit<LogEntry, 'id' | 'timestamp'>) => Promise<LogEntry | undefined>;
  // deleteLogEntry: (id: string) => Promise<void>; // Add if needed

  addWasteEntries: (spaceId: string, categoryIds: string[]) => Promise<WasteEntry[]>;
  // deleteWasteEntry: (id: string) => Promise<void>; // Add if needed

  addComment: (commentData: Omit<Comment, 'id' | 'timestamp'>) => Promise<Comment | undefined>;
  // deleteComment: (id: string) => Promise<void>; // Add if needed
}

// --- Service Instantiation ---
// Create instances of repositories using the factory
const spaceRepository = repositoryFactory.createSpaceRepository();
const actionRepository = repositoryFactory.createActionRepository();
const multiStepActionRepository = repositoryFactory.createMultiStepActionRepository();
const logEntryRepository = repositoryFactory.createLogEntryRepository();
const wasteEntryRepository = repositoryFactory.createWasteEntryRepository();
const commentRepository = repositoryFactory.createCommentRepository();

// Create instances of services, injecting repositories
// Instantiate dependent services first
const actionService = new ActionService(actionRepository);
const multiStepActionService = new MultiStepActionService(multiStepActionRepository);
const logEntryService = new LogEntryService(logEntryRepository);
const wasteEntryService = new WasteEntryService(wasteEntryRepository);
const commentService = new CommentService(commentRepository);
// Inject all services into SpaceService for cascading deletes
const spaceService = new SpaceService(
    spaceRepository,
    actionService,
    multiStepActionService,
    logEntryService,
    wasteEntryService,
    commentService
);


// --- Context Definition ---
const SpaceContext = createContext<SpaceContextProps | undefined>(undefined);

export const useSpaceContext = () => {
  const context = useContext(SpaceContext);
  if (!context) {
    throw new Error("useSpaceContext must be used within a SpaceProvider");
  }
  return context;
};

// --- Provider Component ---

interface SpaceProviderProps {
  children: React.ReactNode;
}

export const SpaceProvider = ({ children }: SpaceProviderProps) => {
  // State Management
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [multiStepActions, setMultiStepActions] = useState<MultiStepAction[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading initially
  const [error, setError] = useState<string | null>(null);

  // --- Helper Functions ---
  const handleAsyncOperation = async <T>(operation: () => Promise<T>, loadingMessage: string = "Loading...", errorMessagePrefix: string = "Error"): Promise<T | undefined> => {
    // setIsLoading(true); // Optionally show loading for every op
    setError(null);
    try {
        // console.log(loadingMessage); // Debug logging
      const result = await operation();
      return result;
    } catch (err: any) {
      console.error(`${errorMessagePrefix}:`, err);
      const message = err.message || "An unknown error occurred.";
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
      return undefined;
    } finally {
      // setIsLoading(false); // Set loading false after op completes
    }
  };


  // --- Data Loading ---
  const loadSpaces = useCallback(async () => {
    setIsLoading(true); // Set loading true when starting to load spaces
    await handleAsyncOperation(async () => {
        const loadedSpaces = await spaceService.getAllSpaces();
        setSpaces(loadedSpaces);
    }, "Loading spaces...", "Failed to load spaces");
    setIsLoading(false); // Set loading false after spaces are loaded
  }, []); // No dependencies needed as spaceService is stable


    const loadSpaceDetails = useCallback(async (spaceId: string) => {
        setIsLoading(true);
        setError(null);
        setCurrentSpace(null); // Clear previous details
        setActions([]);
        setMultiStepActions([]);
        setLogEntries([]);
        setWasteEntries([]);
        setComments([]);

        await handleAsyncOperation(async () => {
            const spaceDetails = await spaceService.getSpace(spaceId);
            if (!spaceDetails) {
                throw new Error(`Space with ID ${spaceId} not found.`);
            }
            setCurrentSpace(spaceDetails);

            // Load related data in parallel
            const [
                loadedActions,
                loadedMultiStepActions,
                loadedLogEntries,
                loadedWasteEntries,
                loadedComments
            ] = await Promise.all([
                actionService.getActionsForSpace(spaceId),
                multiStepActionService.getMultiStepActionsForSpace(spaceId),
                logEntryService.getLogEntriesForSpace(spaceId),
                wasteEntryService.getWasteEntriesForSpace(spaceId),
                commentService.getCommentsForSpace(spaceId),
            ]);

            setActions(loadedActions);
            setMultiStepActions(loadedMultiStepActions);
            setLogEntries(loadedLogEntries);
            setWasteEntries(loadedWasteEntries);
            setComments(loadedComments);

             console.log(`Details loaded for space ${spaceId}:`, {
                spaceDetails,
                loadedActions,
                loadedMultiStepActions,
                loadedLogEntries,
                loadedWasteEntries,
                loadedComments,
            });


        }, `Loading details for space ${spaceId}...`, `Failed to load details for space ${spaceId}`);

        setIsLoading(false);
    }, []); // No dependencies needed as services are stable


  // Initial load of all spaces
  useEffect(() => {
    loadSpaces();
  }, [loadSpaces]);


  // --- Data Modification Wrappers ---

  const createSpace = useCallback(async (spaceData: Omit<Space, 'id' | 'dateCreated' | 'dateModified' | 'totalClockedInTime'>) => {
      return handleAsyncOperation(async () => {
          const newSpace = await spaceService.createSpace(spaceData);
          // Optimistically update or reload all spaces
           await loadSpaces(); // Reload the list to include the new space
          return newSpace;
        }, "Creating space...", "Failed to create space");
    }, [loadSpaces]); // Depend on loadSpaces

  const updateSpace = useCallback(async (space: Space) => {
      await handleAsyncOperation(async () => {
          await spaceService.updateSpace(space);
          // Update local state
          setSpaces(prev => prev.map(s => s.id === space.id ? {...s, ...space, dateModified: new Date()} : s));
          if (currentSpace?.id === space.id) {
              setCurrentSpace({...currentSpace, ...space, dateModified: new Date()});
          }
        }, "Updating space...", "Failed to update space");
    }, [currentSpace]); // Depend on currentSpace

  const deleteSpace = useCallback(async (spaceId: string) => {
    await handleAsyncOperation(async () => {
        await spaceService.deleteSpace(spaceId);
         // Update local state
        setSpaces(prev => prev.filter(s => s.id !== spaceId));
        if (currentSpace?.id === spaceId) {
            setCurrentSpace(null); // Clear details if the current space was deleted
             setActions([]);
             setMultiStepActions([]);
             setLogEntries([]);
             setWasteEntries([]);
             setComments([]);
        }
        toast({ title: "Space Deleted", description: "Space and all associated data removed." });
    }, "Deleting space...", "Failed to delete space");
  }, [currentSpace]);

  const addClockedTime = useCallback(async (spaceId: string, additionalMinutes: number) => {
    await handleAsyncOperation(async () => {
        await spaceService.addClockedTime(spaceId, additionalMinutes);
        // Update local state optimistically or refetch
        const updatedTotalTime = (currentSpace?.totalClockedInTime || 0) + additionalMinutes;
        setSpaces(prev => prev.map(s => s.id === spaceId ? { ...s, totalClockedInTime: updatedTotalTime } : s));
         if (currentSpace?.id === spaceId) {
             setCurrentSpace(prev => prev ? { ...prev, totalClockedInTime: updatedTotalTime } : null);
         }
      }, "Updating clocked time...", "Failed to update clocked time");
  }, [currentSpace]);


   const createAction = useCallback(async (actionData: Omit<Action, 'id'>) => {
        if (currentSpace?.id !== actionData.spaceId) {
            console.error("Mismatch between current space and action data");
            setError("Cannot add action to a different space.");
            return undefined;
        }
        return handleAsyncOperation(async () => {
            const newAction = await actionService.createAction(actionData);
            setActions(prev => [...prev, newAction]); // Optimistic update
            return newAction;
        }, "Creating action...", "Failed to create action");
    }, [currentSpace]); // Depend on currentSpace to ensure correct spaceId

   const createMultiStepAction = useCallback(async (actionData: Omit<MultiStepAction, 'id' | 'currentStepIndex' | 'steps'> & { steps: Omit<ActionStep, 'id' | 'completed'>[] }) => {
        if (currentSpace?.id !== actionData.spaceId) {
            console.error("Mismatch between current space and multi-step action data");
            setError("Cannot add multi-step action to a different space.");
            return undefined;
        }
        return handleAsyncOperation(async () => {
            const newAction = await multiStepActionService.createMultiStepAction(actionData);
            setMultiStepActions(prev => [...prev, newAction]); // Optimistic update
            return newAction;
        }, "Creating multi-step action...", "Failed to create multi-step action");
    }, [currentSpace]);

    // Define addLogEntry before completeMultiStepActionStep
    const addLogEntry = useCallback(async (logEntryData: Omit<LogEntry, 'id' | 'timestamp'>) => {
        if (currentSpace?.id !== logEntryData.spaceId) {
            console.error("Mismatch between current space and log entry data");
            setError("Cannot add log entry to a different space.");
            return undefined;
        }
        return handleAsyncOperation(async () => {
            const newLogEntry = await logEntryService.addLogEntry(logEntryData);
             // Add to the beginning and ensure sorted order
             setLogEntries(prev => [newLogEntry, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
            return newLogEntry;
        }, "Adding log entry...", "Failed to add log entry");
    }, [currentSpace]);


    const completeMultiStepActionStep = useCallback(async (actionId: string) => {
        return handleAsyncOperation(async () => {
            const updatedAction = await multiStepActionService.completeCurrentStep(actionId);
            if (updatedAction) {
                setMultiStepActions(prev => prev.map(a => a.id === actionId ? updatedAction : a));

                // Find the completed step index (it's now currentStepIndex - 1)
                const completedStepIndex = updatedAction.currentStepIndex - 1;
                if (completedStepIndex >= 0) {
                     // Log the step completion
                     // This now relies on addLogEntry defined above
                     await addLogEntry({
                        spaceId: updatedAction.spaceId,
                        actionName: `${updatedAction.name} - Step ${completedStepIndex + 1}: ${updatedAction.steps[completedStepIndex].name}`,
                        points: updatedAction.pointsPerStep,
                        type: 'multiStepAction',
                        multiStepActionId: actionId,
                        stepIndex: completedStepIndex,
                    });
                     toast({
                        title: 'Step Completed!',
                        description: `Earned ${updatedAction.pointsPerStep} points for completing a step in "${updatedAction.name}".`,
                    });
                }

            }
            return updatedAction;
        }, "Completing step...", "Failed to complete step");
     }, [addLogEntry]); // Ensure addLogEntry is a dependency


    const addWasteEntries = useCallback(async (spaceId: string, categoryIds: string[]) => {
        if (currentSpace?.id !== spaceId) {
             console.error("Mismatch between current space and waste entry data");
             setError("Cannot add waste entry to a different space.");
             return [];
         }
        return await handleAsyncOperation(async () => {
             const addedEntries = await wasteEntryService.addWasteEntries(spaceId, categoryIds);
             if (addedEntries.length > 0) {
                 // Add to the beginning and ensure sorted order
                 setWasteEntries(prev => [...addedEntries, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
             }
             return addedEntries;
         }, "Adding waste entries...", "Failed to add waste entries") ?? []; // Return empty array on error
     }, [currentSpace]);


    const addComment = useCallback(async (commentData: Omit<Comment, 'id' | 'timestamp'>) => {
        if (currentSpace?.id !== commentData.spaceId) {
             console.error("Mismatch between current space and comment data");
             setError("Cannot add comment to a different space.");
             return undefined;
         }
        return handleAsyncOperation(async () => {
            const newComment = await commentService.addComment(commentData);
             // Add to the beginning and ensure sorted order
            setComments(prev => [newComment, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
            return newComment;
        }, "Adding comment...", "Failed to add comment");
    }, [currentSpace]);


  const clearCurrentSpace = useCallback(() => {
      setCurrentSpace(null);
      setActions([]);
      setMultiStepActions([]);
      setLogEntries([]);
      setWasteEntries([]);
      setComments([]);
      setError(null);
      // Don't set isLoading here, let loadSpaceDetails handle it
  }, []);


  // --- Context Value ---
  const contextValue = useMemo(() => ({
    // State
    spaces,
    currentSpace,
    actions,
    multiStepActions,
    logEntries,
    wasteEntries,
    comments,
    isLoading,
    error,

    // Actions
    loadSpaces,
    loadSpaceDetails,
    clearCurrentSpace,
    createSpace,
    updateSpace,
    deleteSpace,
    addClockedTime,

    createAction,
    // updateAction,
    // deleteAction,

    createMultiStepAction,
    completeMultiStepActionStep,
    // updateMultiStepAction,
    // deleteMultiStepAction,

    addLogEntry,
    // deleteLogEntry,

    addWasteEntries,
    // deleteWasteEntry,

    addComment,
    // deleteComment,

  }), [
      spaces, currentSpace, actions, multiStepActions, logEntries, wasteEntries, comments, isLoading, error, // State
      loadSpaces, loadSpaceDetails, clearCurrentSpace, createSpace, updateSpace, deleteSpace, addClockedTime, // Space Actions
      createAction, createMultiStepAction, completeMultiStepActionStep, addLogEntry, addWasteEntries, addComment // Other Actions
    ]);

  return (
    <SpaceContext.Provider value={contextValue}>
      {children}
    </SpaceContext.Provider>
  );
};
