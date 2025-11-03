import React, { useState, useEffect } from "react";
import useLPSync from "@/hooks/useLPSync";

export function meta({}) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Scene() {
  const [data] = useLPSync("/sync/subscribe/scene","/sync/set/scene")
  const some = import.meta.env.VITE_SOME_KEY
    return <>
    <div 
      style={{'--image-url': `${data.background && 'url('+data.background+')'}`}} 
      className="min-h-screen min-w-screen bg-[image:var(--image-url)] bg-cover bg-no-repeat"
    >
      <div className="min-h-screen min-w-screen backdrop-blur-xs flex items-center justify-center ">
        <h1 className="text-4xl font-bold text-blue-600">
          Tailwind работает! 🎉
        </h1>
      </div>
    </div>
    </>
}