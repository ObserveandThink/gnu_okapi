"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

interface Space {
  id: string;
  name: string;
  description?: string;
  goal?: string;
  beforeImage?: string | null;
  afterImage?: string | null;
}

export default function Home() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<Space[]>([]);

  useEffect(() => {
    const storedSpaces = localStorage.getItem("spaces");
    if (storedSpaces) {
      setSpaces(JSON.parse(storedSpaces));
    }
  }, []);

  const handleCreateSpace = () => {
    router.push('/new-space');
  };

  const handleSpaceClick = (spaceId: string) => {
    router.push(`/space/${spaceId}`);
  };

  const handleDeleteSpace = (spaceId: string) => {
    const updatedSpaces = spaces.filter(space => space.id !== spaceId);
    setSpaces(updatedSpaces);
    localStorage.setItem("spaces", JSON.stringify(updatedSpaces));
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-8 bg-background p-4">
      <header className="w-full text-center mb-8">
        <h1 className="text-4xl font-bold">Welcome to OkapiFlow</h1>
        <p className="text-lg">
          Get started by creating your first Space!
        </p>
      </header>

      <main className="w-full max-w-6xl">
        <section className="mb-8">
          <Button 
            size="lg"
            className="bg-primary text-primary-foreground rounded-full p-4 text-xl font-bold" 
            onClick={handleCreateSpace}
          >
            Create New Space
          </Button>
        </section>

        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space) => (
              <Card 
                className="bg-card rounded-lg p-4 card-shadow cursor-pointer hover:shadow-md transition-shadow duration-300" 
                key={space.id}
              >
                <CardHeader onClick={() => handleSpaceClick(space.id)}>
                  <CardTitle className="text-2xl font-bold mb-2">{space.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {space.beforeImage && (
                    <img src={space.beforeImage} alt="Before" className="rounded-md mb-2 max-h-40 object-cover" />
                  )}
                  {space.afterImage && (
                    <img src={space.afterImage} alt="After" className="rounded-md mb-2 max-h-40 object-cover" />
                  )}
                  <CardDescription className="text-foreground">{space.description}</CardDescription>
                  {space.goal && <CardDescription className="text-foreground">Goal: {space.goal}</CardDescription>}
                </CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">Delete</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your space
                        and remove your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogCancel asChild>
                      <Button variant="secondary">Cancel</Button>
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteSpace(space.id)}>Continue</AlertDialogAction>
                  </AlertDialogContent>
                </AlertDialog>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
