"use client";

import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { Button, Avatar, Description, Label, Dropdown } from "@heroui/react";
import Notifications from "./NotificationDropdown";
import InboxDropdown from "./InboxDropdown";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Nav() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="bg-transparent">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-lg font-semibold">
            <Image
              src="/quickshoplogo.svg"
              alt="Quick Shop Logo"
              width={160}
              height={40}
              priority
            />
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isSignedIn && isLoaded && (
              <>
                <InboxDropdown />
                <Notifications />
              </>
            )}
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
                        onPress={() => router.push("/dashboard")}
                        id="dashboard"
                        textValue="Dashboard"
                        variant="default"
                      >
                        <Label>Dashboard</Label>
                      </Dropdown.Item>
                      <Dropdown.Item
                        onPress={() => router.push("/stores")}
                        id="stores"
                        textValue="stores"
                        variant="default"
                      >
                        <Label>My Stores</Label>
                      </Dropdown.Item>
                      <Dropdown.Item
                        onPress={() => router.push("/orders")}
                        id="orders"
                        textValue="Orders"
                        variant="default"
                      >
                        <Label>Orders</Label>
                      </Dropdown.Item>
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
              <Button variant="primary" className="bg-black" onPress={() => router.push("/sign-in")}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
