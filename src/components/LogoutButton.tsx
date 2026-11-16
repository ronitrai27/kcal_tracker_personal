"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="black"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        await authClient.signOut();
        router.replace("/sign-in");
        router.refresh();
      }}
    >
      Log out
    </Button>
  );
}
