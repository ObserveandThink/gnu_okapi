"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Space {
  id: string;
  name: string;
  description?: string;
  goal?: string;
}

interface Action {
  id: string;
  name: string;
  description?: string;
}

export default function SpaceDetailPage({ params }: { params: { spaceId: string } }) {
  const { spaceId } = params;
  const [space, setSpace] = useState<Space | null>(null);
  const [actions, setActions] = useState<Action[]>([]);

  useEffect(() => {
    const storedSpaces = localStorage.getItem("spaces");
    if (storedSpaces) {
      const spaces: Space[] = JSON.parse(storedSpaces);
      const foundSpace = spaces.find((s) => s.id === spaceId);
      if (foundSpace) {
        setSpace(foundSpace);
      }
    }

    // Load actions from local storage based on spaceId
    const storedActions = localStorage.getItem(`actions-${spaceId}`);
    if (storedActions) {
      setActions(JSON.parse(storedActions));
    }
  }, [spaceId]);

  if (!space) {
    return <div>Space not found</div>;
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-8">
      <h1 className="text-4xl font-bold mb-4">{space.name}</h1>
      <p className="text-lg mb-8">{space.description}</p>

      <div className="flex space-x-4 mb-8">
        <Button variant="secondary">
          <Edit className="mr-2 h-5 w-5" />
          Edit Space
        </Button>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-5 w-5" />
          Delete Space
        </Button>
      </div>

      <h2 className="text-2xl font-bold mb-4">Actions</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl">
        {actions.map((action) => (
          <Card key={action.id}>
            <CardHeader>
              <CardTitle>{action.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {action.description && <p>{action.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
