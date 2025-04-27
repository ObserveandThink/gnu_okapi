"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from "react";

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

  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-8 bg-background p-4">
      <h1 className="text-4xl font-bold mb-4 text-center">Welcome to OkapiFlow</h1>
      <p className="text-lg mb-8 text-center">
        Get started by creating your first Space!
      </p>
      <button className="bg-primary text-primary-foreground rounded-full p-4 text-xl font-bold mb-8" onClick={handleCreateSpace}>
        Create New Space
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl">
        {spaces.map((space) => (
          <div className="bg-card rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow duration-300" onClick={() => handleSpaceClick(space.id)} key={space.id}>
            <h2 className="text-2xl font-bold mb-2">{space.name}</h2>
            {space.beforeImage && (
              <img src={space.beforeImage} alt="Before" className="rounded-md mb-2 max-h-40 object-cover" />
            )}
            {space.afterImage && (
              <img src={space.afterImage} alt="After" className="rounded-md mb-2 max-h-40 object-cover" />
            )}
            <p className="text-foreground">{space.description}</p>
            {space.goal && <p className="text-foreground">Goal: {space.goal}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
