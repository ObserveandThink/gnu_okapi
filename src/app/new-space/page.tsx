"use client";

import { useRouter } from "next/navigation";
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from "@/hooks/use-toast";

export default function NewSpacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const id = uuidv4();
    const newSpace = { id, name, description, goal };

    const storedSpaces = localStorage.getItem("spaces");
    const existingSpaces = storedSpaces ? JSON.parse(storedSpaces) : [];

    const updatedSpaces = [...existingSpaces, newSpace];
    localStorage.setItem("spaces", JSON.stringify(updatedSpaces));

    toast({
      title: "Space created!",
      description: `Space "${name}" has been successfully created.`,
    });
    router.push("/");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <div className="nes-container with-title is-rounded">
        <p className="title">Create New Space</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="name">Space Name</label>
            <input
              type="text"
              id="name"
              className="nes-input"
              placeholder="Enter space name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="nes-input"
              placeholder="Enter space description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="goal">Goal (Optional)</label>
            <input
              type="text"
              id="goal"
              className="nes-input"
              placeholder="Enter space goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>
          <button type="submit" className="nes-btn is-primary">
            Create Space
          </button>
        </form>
      </div>
    </div>
  );
}
