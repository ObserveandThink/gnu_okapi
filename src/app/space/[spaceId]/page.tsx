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
    <div className="flex flex-col items-center justify-start min-h-screen py-8">
      <div className="nes-container with-title is-rounded">
        <p className="title">{space.name}</p>
        <p>{space.description}</p>
        {space.goal && <p>Goal: {space.goal}</p>}
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-2">Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => (
            <button
              key={action.id}
              className="nes-btn is-primary"
              onClick={() => handleActionClick(action)}
            >
              {action.name} (+{action.points} points)
            </button>
          ))}
        </div>

        <button className="nes-btn is-success mt-4" onClick={handleCreateAction}>
          Create New Action
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-2">Total Points:</h2>
        <p className="text-lg">{totalPoints}</p>
      </div>
        <button className="nes-btn mt-4" onClick={handleBack}>
            Back to Home
        </button>

      {isCreateActionModalOpen && (
        <div className="nes-dialog is-rounded" id="dialog-default">
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSaveAction();
          }}>
            <p className="title">Create New Action</p>
            <label htmlFor="newActionName">Action Name</label>
            <input
              type="text"
              id="newActionName"
              className="nes-input"
              placeholder="Action Name"
              value={newActionName}
              onChange={(e) => setNewActionName(e.target.value)}
            />
            <label htmlFor="newActionDescription">Description</label>
            <textarea
              id="newActionDescription"
              className="nes-input"
              placeholder="Description"
              value={newActionDescription}
              onChange={(e) => setNewActionDescription(e.target.value)}
            />
            <label htmlFor="newActionPoints">Points</label>
            <input
              type="number"
              id="newActionPoints"
              className="nes-input"
              placeholder="Points"
              value={newActionPoints}
              onChange={(e) => setNewActionPoints(Number(e.target.value))}
            />
            <div className="dialog-actions">
              <button type="button" className="nes-btn" onClick={handleCancelAction}>
                Cancel
              </button>
              <button type="submit" className="nes-btn is-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
