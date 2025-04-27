"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-4">Welcome to OkapiFlow</h1>
      <p className="text-lg mb-8">
        Get started by creating your first Space!
      </p>
      <Button size="lg">
        <Plus className="mr-2 h-5 w-5" />
        Create New Space
      </Button>
    </div>
  );
}
