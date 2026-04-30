'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { ArrowRight, UserPlus } from 'lucide-react';

import { inviteUser } from '@/app/_actions/users';
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
import { Field, FieldInput, FieldSelect } from '@/components/ui/field';
import {
  inviteUserSchema,
  USER_ROLE_DESCRIPTIONS,
  USER_ROLE_LABELS,
  USER_ROLES,
  type InviteUserInput,
} from '@/lib/validators/user';

export function InviteUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<InviteUserInput>({
    resolver: standardSchemaResolver(inviteUserSchema),
    defaultValues: { fullName: '', email: '', role: 'sb_member' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  function onSubmit(values: InviteUserInput) {
    startTransition(async () => {
      const result = await inviteUser(values);
      if (!result.ok) {
        form.setError('root', { message: result.error });
        return;
      }
      form.reset();
      setOpen(false);
      router.refresh();
    });
  }

  function onOpenChange(next: boolean) {
    if (!isPending) {
      setOpen(next);
      if (!next) {
        form.reset();
        form.clearErrors();
      }
    }
  }

  const selectedRole = useWatch({ control: form.control, name: 'role' });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button size="sm" className="font-medium">
          <UserPlus />
          Invite user
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Invite a new admin user</AlertDialogTitle>
          <AlertDialogDescription>
            We&apos;ll email a magic-link invitation. The user sets their password on first sign-in.
            Invites expire after 72 hours per Supabase defaults.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          id="invite-user-form"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <Field label="Full name" required error={form.formState.errors.fullName?.message}>
            <FieldInput
              autoFocus
              placeholder="Hon. Juan dela Cruz"
              disabled={isPending}
              {...form.register('fullName')}
            />
          </Field>
          <Field label="Email" required error={form.formState.errors.email?.message}>
            <FieldInput
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="name@lambunao.gov.ph"
              disabled={isPending}
              {...form.register('email')}
            />
          </Field>
          <Field label="Role" required error={form.formState.errors.role?.message}>
            <FieldSelect disabled={isPending} {...form.register('role')}>
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {USER_ROLE_LABELS[r]}
                </option>
              ))}
            </FieldSelect>
            {selectedRole && (
              <p className="text-ink-faint mt-1.5 text-xs italic">
                {USER_ROLE_DESCRIPTIONS[selectedRole]}
              </p>
            )}
          </Field>

          {form.formState.errors.root && (
            <p role="alert" className="text-warn text-sm font-medium">
              {form.formState.errors.root.message}
            </p>
          )}
        </form>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="submit"
              form="invite-user-form"
              disabled={isPending}
              className="font-medium"
            >
              {isPending ? 'Sending…' : 'Send invite'}
              <ArrowRight />
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
