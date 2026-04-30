'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Save } from 'lucide-react';

import { updateNotificationPreferences } from '@/app/_actions/settings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  NOTIFICATION_EVENT_KEYS,
  NOTIFICATION_EVENT_LABELS,
  type NotificationEventKey,
  type UpdateNotificationPreferencesInput,
} from '@/lib/validators/settings';

type Channel = 'email' | 'push';
type ChannelPrefs = { email: boolean; push: boolean };
type Prefs = Record<NotificationEventKey, ChannelPrefs>;

const CHANNEL_LABELS: Record<Channel, string> = { email: 'Email', push: 'Push' };
const DEFAULT_CHANNEL_PREFS: ChannelPrefs = { email: false, push: false };

type Props = {
  defaults: UpdateNotificationPreferencesInput;
};

function toCompletePrefs(input: UpdateNotificationPreferencesInput): Prefs {
  return NOTIFICATION_EVENT_KEYS.reduce<Prefs>((acc, key) => {
    acc[key] = input[key] ?? DEFAULT_CHANNEL_PREFS;
    return acc;
  }, {} as Prefs);
}

function prefsEqual(a: Prefs, b: Prefs): boolean {
  return NOTIFICATION_EVENT_KEYS.every(
    (key) => a[key].email === b[key].email && a[key].push === b[key].push,
  );
}

export function NotificationsForm({ defaults }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const initial = toCompletePrefs(defaults);
  const [prefs, setPrefs] = useState<Prefs>(initial);

  const dirty = !prefsEqual(prefs, initial);

  function toggle(event: NotificationEventKey, channel: Channel) {
    setPrefs((current) => ({
      ...current,
      [event]: { ...current[event], [channel]: !current[event][channel] },
    }));
    setSavedAt(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dirty) return;
    startTransition(async () => {
      const result = await updateNotificationPreferences(prefs);
      if (!result.ok) return;
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <ul className="border-ink/15 divide-ink/10 flex flex-col divide-y rounded-md border">
        {NOTIFICATION_EVENT_KEYS.map((key) => {
          const channels = prefs[key];
          return (
            <li key={key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="text-ink font-script text-base">
                {NOTIFICATION_EVENT_LABELS[key]}
              </span>
              <div className="flex gap-2">
                {(['email', 'push'] as const).map((channel) => {
                  const on = channels[channel];
                  return (
                    <button
                      key={channel}
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${CHANNEL_LABELS[channel]} for ${NOTIFICATION_EVENT_LABELS[key]}`}
                      onClick={() => toggle(key, channel)}
                      disabled={isPending}
                      className={cn(
                        'rounded-pill focus-visible:ring-rust/40 inline-flex h-7 items-center gap-1.5 border px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2',
                        on
                          ? 'bg-rust border-rust text-paper'
                          : 'border-ink/30 text-ink-soft hover:border-ink',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn('size-1.5 rounded-full', on ? 'bg-paper' : 'bg-ink-ghost')}
                      />
                      {CHANNEL_LABELS[channel]}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-ink-faint text-xs italic">
        Push delivery is not yet wired; toggling Push records the preference for when it ships.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending || !dirty} className="font-medium">
          <Save />
          {isPending ? 'Saving…' : 'Save preferences'}
        </Button>
        {savedAt && !dirty && (
          <span
            role="status"
            className="text-success inline-flex items-center gap-1 font-mono text-[11px]"
          >
            <CheckCircle2 className="size-3" aria-hidden="true" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
