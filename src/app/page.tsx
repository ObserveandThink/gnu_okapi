"use client";

import { useRouter } from 'next/navigation';
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
    <div className="flex flex-col items-center justify-start min-h-screen py-8 bg-background">
      <h1 className="text-4xl font-bold mb-4 text-shadow">Welcome to OkapiFlow</h1>
      <p className="text-lg mb-8 text-shadow">
        Get started by creating your first Space!
      </p>
      <button className="nes-btn is-success text-2xl" onClick={handleCreateSpace}>
        Create New Space
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl mt-8">
        {spaces.map((space) => (
          <div key={space.id} className="nes-container with-title is-rounded" onClick={() => handleSpaceClick(space.id)}>
            <p className="title">{space.name}</p>
            <p>{space.description}</p>
            {space.goal && <p>Goal: {space.goal}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
