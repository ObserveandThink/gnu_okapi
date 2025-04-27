"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface Space {
  id: string;
  name: string;
  description?: string;
  goal?: string;
}

export default function Home() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<Space[]>([]);

  useEffect(() => {
    // Simulate fetching spaces from a database
    const storedSpaces = localStorage.getItem("spaces");
    if (storedSpaces) {
      setSpaces(JSON.parse(storedSpaces));
    }
  }, []);

  const handleCreateSpace = () => {
    router.push('/new-space');
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-8">
      <h1 className="text-4xl font-bold mb-4">Welcome to OkapiFlow</h1>
      <p className="text-lg mb-8">
        Get started by creating your first Space!
      </p>
      <Button size="lg" onClick={handleCreateSpace} className="mb-8">
        <Plus className="mr-2 h-5 w-5" />
        Create New Space
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl">
        {spaces.map((space) => (
          <Card key={space.id}>
            <CardHeader>
              <CardTitle>{space.name}</CardTitle>
              <CardDescription>{space.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {space.goal && <p>Goal: {space.goal}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
