'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Edit3, ExternalLink, EyeOff, Upload, X } from 'lucide-react';

import { archiveNewsPost, publishNewsPost, unpublishNewsPost } from '@/app/_actions/news-posts';
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
import { Field, FieldTextarea } from '@/components/ui/field';
import type { Profile } from '@/lib/db/schema';
import type { NewsStatusValue, NewsVisibilityValue } from '@/lib/validators/news-post';

const PUBLISH_ROLES: Profile['role'][] = ['secretary', 'vice_mayor', 'mayor'];

type Props = {
  postId: string;
  slug: string;
  status: NewsStatusValue;
  visibility: NewsVisibilityValue;
  userRole: Profile['role'];
};

export function NewsActionsBar({ postId, slug, status, visibility, userRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run<T>(
    actionPromise: Promise<{ ok: true; data: T } | { ok: false; error: string; code: string }>,
  ) {
    startTransition(async () => {
      const result = await actionPromise;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  const isPublisher = PUBLISH_ROLES.includes(userRole);
  const isSecretary = userRole === 'secretary';
  const publiclyVisible = status === 'published' && visibility === 'public';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" asChild className="font-medium">
          <Link href={`/admin/news/${postId}/edit`} aria-label="Edit post">
            <Edit3 />
            Edit
          </Link>
        </Button>

        {publiclyVisible ? (
          <Button variant="outline" size="sm" asChild className="font-medium">
            <Link
              href={`/news/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open public version in new tab"
            >
              <ExternalLink />
              Public preview
            </Link>
          </Button>
        ) : (
          <span
            className="text-ink-faint border-ink/15 inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed px-3 text-sm italic"
            title="Not yet visible to the public"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            Not yet public
          </span>
        )}

        {isPublisher && (status === 'draft' || status === 'archived') && (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => run(publishNewsPost({ postId }))}
            className="font-medium"
          >
            <Upload />
            Publish
          </Button>
        )}

        {isPublisher && status === 'published' && (
          <UnpublishDialog postId={postId} disabled={isPending} onResult={run} />
        )}

        {isSecretary && <ArchiveDialog postId={postId} disabled={isPending} onResult={run} />}
      </div>

      {error && (
        <p role="alert" className="text-warn text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

type DialogProps = {
  postId: string;
  disabled: boolean;
  onResult: <T>(
    p: Promise<{ ok: true; data: T } | { ok: false; error: string; code: string }>,
  ) => void;
};

function UnpublishDialog({ postId, disabled, onResult }: DialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled} className="font-medium">
          <EyeOff />
          Unpublish
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unpublish this post?</AlertDialogTitle>
          <AlertDialogDescription>
            The post reverts to draft and disappears from the public news feed. You can republish
            later — the original publish date stays on file. This writes a high-priority audit row.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field label="Reason" required>
          <FieldTextarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Information needs correction; will republish after edits."
            rows={3}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onResult(unpublishNewsPost({ postId, reason }));
              setOpen(false);
            }}
            disabled={reason.trim().length < 5}
          >
            <EyeOff />
            Unpublish
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ArchiveDialog({ postId, disabled, onResult }: DialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled}
          className="text-warn hover:bg-warn/10 hover:text-warn font-medium"
        >
          <Archive />
          Archive
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive this post?</AlertDialogTitle>
          <AlertDialogDescription>
            Archiving hides the post from all list views and the public site, but the row stays in
            the audit trail. Only the Secretary can archive. This cannot be undone from the UI.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field label="Reason for archival" required>
          <FieldTextarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Posted in error; superseded by a newer announcement."
            rows={3}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onResult(archiveNewsPost({ postId, reason }));
              setOpen(false);
            }}
            disabled={reason.trim().length < 5}
            className="bg-warn text-paper hover:bg-warn/85"
          >
            <X />
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
