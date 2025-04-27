'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useEffect,
  useState,
  useContext,
} from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"

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

interface LogEntry {
  id: string;
  timestamp: Date;
  actionName: string;
  points: number;
}

interface WasteEntry {
  id: string;
  timestamp: Date;
  type: string;
  points: number;
}

const timwoodsCategories = [
  { id: 'transportation', name: 'Transportation', description: 'Unnecessary movement of materials or products.', points: 1 },
  { id: 'inventory', name: 'Inventory', description: 'Excess raw materials, work in progress, or finished goods.', points: 2 },
  { id: 'motion', name: 'Motion', description: 'Unnecessary movement of people.', points: 3 },
  { id: 'waiting', name: 'Waiting', description: 'Idle time waiting for the next step in a process.', points: 4 },
  { id: 'overprocessing', name: 'Overprocessing', description: 'Performing more work than is necessary.', points: 5 },
  { id: 'overproduction', name: 'Overproduction', description: 'Producing more than is needed.', points: 6 },
  { id: 'defects', name: 'Defects', description: 'Rework or scrap due to errors or defects.', points: 7 },
  { id: 'skills', name: 'Skills', description: 'Underutilizing people\'s talents and skills', points: 8 },
];

// IndexedDB helper functions
const openDB = (dbName: string, version: number) => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('actions')) {
        db.createObjectStore('actions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('logEntries')) {
          db.createObjectStore('logEntries', { keyPath: 'id' });
      }
       if (!db.objectStoreNames.contains('wasteEntries')) {
        db.createObjectStore('wasteEntries', { keyPath: 'id' });
      }
    };
  });
};

const addItem = (db: IDBDatabase, storeName: string, item: any) => {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(item);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const getAllItems = (db: IDBDatabase, storeName: string) => {
  return new Promise<any[]>((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

// Context setup
interface SpaceContextProps {
  actions: Action[];
  setActions: React.Dispatch<React.SetStateAction<Action[]>>;
  logEntries: LogEntry[];
  setLogEntries: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  wasteEntries: WasteEntry[];
  setWasteEntries: React.Dispatch<React.SetStateAction<WasteEntry[]>>;
}

const SpaceContext = createContext<SpaceContextProps | undefined>(undefined);

export const useSpaceContext = () => {
  const context = useContext(SpaceContext);
  if (!context) {
    throw new Error("useSpaceContext must be used within a SpaceProvider");
  }
  return context;
};

const SpaceProvider = ({ spaceId, children }: { spaceId: string, children: React.ReactNode }) => {
  const [actions, setActions] = useState<Action[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [db, setDb] = useState<IDBDatabase | null>(null);

  useEffect(() => {
    const initializeDB = async () => {
      const newDb = await openDB('okapiFlowDB', 3);
      setDb(newDb);
    };
    initializeDB();
  }, []);

  useEffect(() => {
    if (db) {
      const loadActions = async () => {
        const loadedActions = await getAllItems(db, 'actions') as Action[];
        setActions(loadedActions.filter(action => action.spaceId === spaceId));
      };

      const loadLogEntries = async () => {
          const loadedLogEntries = await getAllItems(db, 'logEntries') as LogEntry[];
          setLogEntries(loadedLogEntries.filter(entry => {
              return (entry as any).spaceId === spaceId;
          }));
      };
      
      const loadWasteEntries = async () => {
          const loadedWasteEntries = await getAllItems(db, 'wasteEntries') as WasteEntry[];
          setWasteEntries(loadedWasteEntries.filter(entry => (entry as any).spaceId === spaceId));
      };

      loadActions();
      loadLogEntries();
      loadWasteEntries();
    }
  }, [db, spaceId]);

  const addAction = useCallback(async (action: Action) => {
    if (db) {
      await addItem(db, 'actions', action);
      setActions(prevActions => [...prevActions, action]);
    }
  }, [db]);

    const addLogEntry = useCallback(async (logEntry: LogEntry) => {
        if (db) {
            await addItem(db, 'logEntries', { ...logEntry, spaceId });
            setLogEntries(prevLogEntries => [logEntry, ...prevLogEntries]);
        }
    }, [db, spaceId]);

    const addWasteEntry = useCallback(async (wasteEntry: WasteEntry) => {
        if (db) {
            await addItem(db, 'wasteEntries', { ...wasteEntry, spaceId });
            setWasteEntries(prevWasteEntries => [wasteEntry, ...prevWasteEntries]);
        }
    }, [db, spaceId]);

  return (
    <SpaceContext.Provider value={{ actions, setActions, logEntries, setLogEntries, wasteEntries, setWasteEntries }}>
      {children}
    </SpaceContext.Provider>
  );
};


export default function SpaceDetailPage({
  params,
}: {
  params: { spaceId: string };
}) {
  const { spaceId } = params;
  const router = useRouter();
  const [space, setSpace] = useState<Space | null>(null);
  const { actions, setActions, logEntries, setLogEntries, wasteEntries, setWasteEntries } = useSpaceContext();
  const [totalPoints, setTotalPoints] = useState(0);
  const [newActionName, setNewActionName] = useState('');
  const [newActionDescription, setNewActionDescription] = useState('');
  const [newActionPoints, setNewActionPoints] = useState(1);
  const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [apPerHour, setApPerHour] = useState(0);
  const [isAddWasteModalOpen, setIsAddWasteModalOpen] = useState(false);
  const [selectedWasteCategories, setSelectedWasteCategories] = useState<string[]>([]);


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
    recalculateTotalPoints();
  }, [actions, spaceId]);

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
    const pointsEarned = action.points * multiplier;
    setActions(prevActions => {
      return prevActions.map(existingAction => {
        if (existingAction.id === action.id) {
          return { ...existingAction, points: action.points }; // Update the points if it's the clicked action
        } else {
          return existingAction; // Otherwise, keep the existing action
        }
      });
    });

    const now = new Date();
    const logEntry: LogEntry = {
      id: uuidv4(),
      timestamp: now,
      actionName: action.name,
      points: pointsEarned,
    };

    // setLogEntries(prevLogEntries => [logEntry, ...prevLogEntries]);
    setLogEntries(prevLogEntries => {
      const updatedLogEntries = [logEntry, ...prevLogEntries];
      return updatedLogEntries;
    });
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

      setActions((prevActions) => {
        const updatedActions = [...prevActions, newAction];
        return updatedActions;
      });
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

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

 const handleSaveWaste = () => {
    const now = new Date();
    const newWasteEntries = selectedWasteCategories.map(categoryId => {
      const category = timwoodsCategories.find(cat => cat.id === categoryId);
      return {
        id: uuidv4(),
        timestamp: now,
        type: category?.name || 'Unknown',
        points: category?.points || 0,
      };
    });

   setWasteEntries(prevWasteEntries => [...newWasteEntries, ...prevWasteEntries]);
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


  if (!space) {
    return <div>Space not found</div>;
  }

  return (
    <SpaceProvider spaceId={spaceId}>
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
                <Button variant="secondary" onClick={() => handleActionClick(action, 1)}>{action.name} (+{action.points * 1} points)</Button>
                <Button variant="secondary" onClick={() => handleActionClick(action, 2)}>{action.name} (+{action.points * 2} points)</Button>
                <Button variant="secondary" onClick={() => handleActionClick(action, 5)}>{action.name} (+{action.points * 5} points)</Button>
              </div>
            ))}
          </div>

          <Button className="mt-4 w-full" size="lg" onClick={handleCreateAction}>
            Create New Action
          </Button>
        </div>
          <div className="mt-8 w-full max-w-4xl">
            <h2 className="text-3xl font-bold mb-4">Waste Tracking</h2>
              <Button onClick={handleAddWasteClick}>Add Waste</Button>
              <Progress value={0} className="h-4" />
            <ScrollArea className="max-h-40">
              {wasteEntries.map((wasteEntry) => (
                <div key={wasteEntry.id} className="mb-2">
                  {wasteEntry.type} - Points: {wasteEntry.points}
                </div>
              ))}
            </ScrollArea>
          </div>

        <div className="mt-8 w-full max-w-4xl">
          <h2 className="text-2xl font-bold mb-4">Log</h2>
          <ScrollArea className="max-h-40">
            {logEntries.map((logEntry) => (
              <div key={logEntry.id} className="mb-2">
                {logEntry.actionName} completed at {formatTime(logEntry.timestamp)} (+{logEntry.points} points)
              </div>
            ))}
          </ScrollArea>
        </div>

        <Button className="mt-8 w-full max-w-4xl" size="lg" variant="ghost" onClick={handleBack}>
          Back to Home
        </Button>

        <Dialog open={isCreateActionModalOpen} onOpenChange={setIsCreateActionModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Action</DialogTitle>
              <DialogDescription>
                Add a new action to this space.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  type="text"
                  id="name"
                  value={newActionName}
                  onChange={(e) => setNewActionName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newActionDescription}
                  onChange={(e) => setNewActionDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="points" className="text-right">
                  Points
                </Label>
                <Input
                  type="number"
                  id="points"
                  value={newActionPoints}
                  onChange={(e) => setNewActionPoints(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="secondary" onClick={handleCancelAction}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleSaveAction}>
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
            <div className="grid gap-4 py-4">
                <div className="flex flex-wrap gap-2">
                    {timwoodsCategories.map((category) => (
                    <Button
                        key={category.id}
                        variant={selectedWasteCategories.includes(category.id) ? 'default' : 'outline'}
                        onClick={() => handleWasteCategoryClick(category.id)}
                    >
                        {category.name}
                    </Button>
                    ))}
                </div>
                <Progress value={0} className="h-4" />
                <p>Total Waste Points: {0}</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="secondary" onClick={handleCancelWaste}>
                Cancel
              </Button>
              <Button type="submit" onClick={handleSaveWaste}>
                Add Waste
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SpaceProvider>
  );
}
