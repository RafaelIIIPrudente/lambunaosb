'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

import { signOutOtherSessions } from '@/app/_actions/settings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function SessionsSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await signOutOtherSessions();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-ink-soft text-sm">
        You&apos;re signed in on this device. Supabase doesn&apos;t expose a per-session list, but
        you can revoke every other session at once. Your current session keeps its access.
      </p>

      <AlertDialog open={open} onOpenChange={(o) => !isPending && setOpen(o)}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="self-start font-medium">
            <LogOut />
            Sign out everywhere else
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out every other session?</AlertDialogTitle>
            <AlertDialogDescription>
              All other devices currently signed in to your account will be signed out immediately.
              This is the recommended action if you suspect your account is at risk or if you forgot
              to sign out on a shared computer. Alert-audited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-warn text-sm font-medium">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                disabled={isPending}
                onClick={(e) => {
                  e.preventDefault();
                  onConfirm();
                }}
                className="font-medium"
              >
                {isPending ? 'Signing out…' : 'Sign out other sessions'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
