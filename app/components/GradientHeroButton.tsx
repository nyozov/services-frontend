"use client";
import { Button } from "@heroui/react";

type GradientHeroButtonProps = {
  children: React.ReactNode;
};

export default function GradientHeroButton({
  children,
}: GradientHeroButtonProps) {
  return (
    <div className="group inline-block rounded-full transition-all duration-300">
      {/* Gradient Border (only visible on hover) */}
      <div
        className="
        rounded-full p-[2px] 
        bg-transparent
        group-hover:bg-gradient-to-r 
        group-hover:from-pink-500 
        group-hover:via-purple-600 
        group-hover:to-orange-500
        transition-all duration-300
      "
      >
        {/* White Gap Layer */}
        <div
          className="
          rounded-full p-[2px] 
          bg-transparent 
          group-hover:bg-white 
          transition-all duration-700
        "
        >
          {/* Actual Button */}
          <Button
            size="lg"
            className="
              bg-black text-white
              px-8 py-3 text-lg font-semibold
              transition-all duration-600
              group-hover:bg-neutral-900
            "
          >
            {children}
          </Button>
        </div>
      </div>
    </div>
  );
}
