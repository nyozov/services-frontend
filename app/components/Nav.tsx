"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { Button, Avatar, Description, Label, Dropdown } from "@heroui/react";
import AuthModal from "./AuthModal";
import Notifications from "./NotificationDropdown";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { isSignedIn, isLoaded, user } = useUser();
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
            Think of an appname
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isSignedIn && isLoaded && <Notifications />}
            {isSignedIn && isLoaded ? (
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
        </div>
      </div>
    </nav>
  );
}
