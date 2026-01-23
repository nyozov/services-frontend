"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { Button, Avatar, Description, Label, Dropdown } from "@heroui/react";
import AuthModal from "./AuthModal";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-lg font-semibold">
            MyApp
          </Link>

          {/* Right side */}
          <div className="hidden md:flex md:items-center md:gap-3">
            {isSignedIn ? (
              <div className="flex items-center gap-3">
                <Dropdown>
                  <Dropdown.Trigger
                    aria-label="Menu"
                    className="flex items-center gap-2 justify-start cursor-pointer"
                  >
                    <Avatar size="sm">
                      <Avatar.Image
                        alt="Bob"
                        src="https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg"
                      />
                      <Avatar.Fallback>
                        {user.firstName && user.firstName[0]}
                      </Avatar.Fallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <Label className="cursor-pointer text-left">
                        {user.firstName}{" "}
                      </Label>
                      <Description>
                        {user.emailAddresses[0].emailAddress}
                      </Description>
                    </div>
                  </Dropdown.Trigger>
                  <Dropdown.Popover>
                    <Dropdown.Menu>
                      <Dropdown.Item
                        onPress={handleSignOut}
                        id="delete-file"
                        textValue="Delete file"
                        variant="danger"
                      >
                        <Label>Sign Out</Label>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </div>
            ) : (
              <AuthModal />
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {open ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
