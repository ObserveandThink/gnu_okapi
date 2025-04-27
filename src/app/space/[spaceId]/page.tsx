"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/hooks/use-toast";

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
  const [newActionName, setNewActionName] = useState("");
  const [newActionDescription, setNewActionDescription] = useState("");
  const [newActionPoints, setNewActionPoints] = useState(1);
  const [isCreateActionModalOpen, setIsCreateActionModalOpen] = useState(false);


  useEffect(() => {
    const storedSpaces = localStorage.getItem("spaces");
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

      const initialPoints = parsedActions.reduce(
        (acc, action) => acc + action.points,
        0
      );
      setTotalPoints(initialPoints);
    } else {
      setTotalPoints(0);
    }
  }, [spaceId]);

  useEffect(() => {
    localStorage.setItem(`actions-${spaceId}`, JSON.stringify(actions));
  }, [actions, spaceId]);

  const handleActionClick = (action: Action) => {
    setTotalPoints((prevPoints) => prevPoints + action.points);
    toast({
      title: "Action Logged!",
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
      setNewActionName("");
      setNewActionDescription("");
      setNewActionPoints(1);
      setIsCreateActionModalOpen(false);
          toast({
              title: "Action Created!",
              description: `Action "${newAction.name}" has been successfully created.`,
          });
    }
  };

  const handleCancelAction = () => {
    setIsCreateActionModalOpen(false);
    setNewActionName("");
    setNewActionDescription("");
    setNewActionPoints(1);
  };
    const handleBack = () => {
        router.push('/');
    };

  if (!space) {
    return <div>Space not found</div>;
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-8 bg-background p-4">
      <div className="bg-card rounded-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">{space.name}</h1>
          {space.beforeImage && (
              <img src={space.beforeImage} alt="Before" className="rounded-md mb-2 max-h-40 object-cover" />
          )}
          {space.afterImage && (
              <img src={space.afterImage} alt="After" className="rounded-md mb-2 max-h-40 object-cover" />
          )}
        <p className="text-foreground">{space.description}</p>
        {space.goal && <p className="text-foreground">Goal: {space.goal}</p>}
      </div>

      <div className="mt-8 w-full max-w-md">
        <h2 className="text-3xl font-bold mb-2">Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => (
            <button
              key={action.id}
              className="bg-primary text-primary-foreground rounded-full p-3 text-xl font-bold"
              onClick={() => handleActionClick(action)}
            >
              {action.name} (+{action.points} points)
            </button>
          ))}
        </div>

        <button className="bg-secondary text-secondary-foreground rounded-full p-3 mt-4 text-xl font-bold w-full" onClick={handleCreateAction}>
          Create New Action
        </button>
      </div>

      <div className="mt-8 w-full max-w-md">
        <h2 className="text-3xl font-bold mb-2">Total Points:</h2>
        <p className="text-2xl">{totalPoints}</p>
      </div>
        <button className="bg-muted text-foreground rounded-full p-3 mt-4 text-xl font-bold w-full" onClick={handleBack}>
            Back to Home
        </button>

      {isCreateActionModalOpen && (
        <div className="fixed top-0 left-0 w-full h-full bg-background bg-opacity-80 flex items-center justify-center">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Create New Action</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveAction();
            }} className="space-y-4">
              <div>
                <label htmlFor="newActionName" className="block text-sm font-medium text-foreground">Action Name</label>
                <input
                  type="text"
                  id="newActionName"
                  className="w-full p-2 border rounded text-foreground"
                  placeholder="Action Name"
                  value={newActionName}
                  onChange={(e) => setNewActionName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="newActionDescription" className="block text-sm font-medium text-foreground">Description</label>
                <textarea
                  id="newActionDescription"
                  className="w-full p-2 border rounded text-foreground"
                  placeholder="Description"
                  value={newActionDescription}
                  onChange={(e) => setNewActionDescription(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="newActionPoints" className="block text-sm font-medium text-foreground">Points</label>
                <input
                  type="number"
                  id="newActionPoints"
                  className="w-full p-2 border rounded text-foreground"
                  placeholder="Points"
                  value={newActionPoints}
                  onChange={(e) => setNewActionPoints(Number(e.target.value))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" className="bg-muted text-foreground rounded p-2 font-bold" onClick={handleCancelAction}>
                  Cancel
                </button>
                <button type="submit" className="bg-primary text-primary-foreground rounded p-2 font-bold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
