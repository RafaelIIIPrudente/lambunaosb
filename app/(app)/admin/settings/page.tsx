import 'server-only';

import { notFound } from 'next/navigation';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { requireUser } from '@/lib/auth/require-user';
import { getCurrentProfile, getCurrentTenant } from '@/lib/db/queries/settings';
import { cn } from '@/lib/utils';
import {
  UI_LOCALE_LABELS,
  UI_LOCALE_SAMPLES,
  type UpdateNotificationPreferencesInput,
  type UpdateProfileInput,
  type UpdateTenantSettingsInput,
} from '@/lib/validators/settings';

import { NotificationsForm } from './_notifications-form';
import { PasswordForm } from './_password-form';
import { ProfileForm } from './_profile-form';
import { SessionsSection } from './_sessions-section';
import { TenantForm } from './_tenant-form';

export const metadata = { title: 'Settings' };

const ROLE_LABELS: Record<string, string> = {
  secretary: 'Secretary',
  vice_mayor: 'Vice Mayor',
  mayor: 'Mayor',
  sb_member: 'SB Member',
  other_lgu: 'Other LGU',
};

type Section = {
  id: string;
  label: string;
  visible: boolean;
};

export default async function SettingsPage() {
  const ctx = await requireUser();
  const profile = await getCurrentProfile(ctx.userId);
  if (!profile) notFound();

  const isSecretary = ctx.profile.role === 'secretary';
  const tenant = isSecretary ? await getCurrentTenant() : null;

  const profileDefaults: UpdateProfileInput = {
    fullName: profile.fullName,
    title: profile.title ?? undefined,
    email: profile.email,
    phone: profile.phone ?? undefined,
    uiLocale: profile.uiLocale === 'tl' || profile.uiLocale === 'hil' ? profile.uiLocale : 'en',
    timeZone: profile.timeZone,
  };

  const notificationDefaults: UpdateNotificationPreferencesInput = profile.notificationPreferences;

  const tenantDefaults: UpdateTenantSettingsInput | null = tenant
    ? {
        displayName: tenant.displayName,
        contactEmail: tenant.contactEmail,
        dpoEmail: tenant.dpoEmail,
        contactPhone: tenant.contactPhone ?? undefined,
        officeAddress: tenant.officeAddress ?? undefined,
        officeHoursMd: tenant.officeHoursMd ?? undefined,
      }
    : null;

  const sections: Section[] = [
    { id: 'profile', label: 'Profile', visible: true },
    { id: 'password', label: 'Password', visible: true },
    { id: 'notifications', label: 'Notifications', visible: true },
    { id: 'language', label: 'Language', visible: true },
    { id: 'sessions', label: 'Sessions', visible: true },
    { id: 'organization', label: 'Organization', visible: isSecretary },
    { id: 'about', label: 'About', visible: true },
  ].filter((s) => s.visible);

  const localeSample = UI_LOCALE_SAMPLES[profileDefaults.uiLocale];

  return (
    <div>
      <AdminPageHeader
        title="Settings"
        accessory={
          <Badge variant="outline" className="h-7 px-3">
            {ROLE_LABELS[ctx.profile.role] ?? ctx.profile.role}
          </Badge>
        }
      />

      <div className="grid gap-8 md:grid-cols-[180px_1fr]">
        <nav aria-label="Settings sections" className="md:sticky md:top-20 md:h-fit">
          <ul className="flex flex-col gap-0.5">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={cn(
                    'hover:bg-paper-2 flex h-9 items-center rounded-md px-3 transition-colors',
                    'text-ink-soft hover:text-ink font-script text-base',
                  )}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-8">
          <section
            id="profile"
            aria-labelledby="profile-heading"
            className="border-ink/15 scroll-mt-20 rounded-md border p-6"
          >
            <p
              id="profile-heading"
              className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase"
            >
              Profile
            </p>
            <ProfileForm defaults={profileDefaults} />
          </section>

          <section
            id="password"
            aria-labelledby="password-heading"
            className="border-ink/15 scroll-mt-20 rounded-md border p-6"
          >
            <p
              id="password-heading"
              className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase"
            >
              Password
            </p>
            <PasswordForm />
          </section>

          <section
            id="notifications"
            aria-labelledby="notifications-heading"
            className="border-ink/15 scroll-mt-20 rounded-md border p-6"
          >
            <p
              id="notifications-heading"
              className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase"
            >
              Notifications
            </p>
            <NotificationsForm defaults={notificationDefaults} />
          </section>

          <section
            id="language"
            aria-labelledby="language-heading"
            className="border-ink/15 scroll-mt-20 rounded-md border p-6"
          >
            <p
              id="language-heading"
              className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase"
            >
              Language
            </p>
            <p className="text-ink-soft mb-2 text-sm">
              Your current UI language is{' '}
              <span className="text-ink font-medium">
                {UI_LOCALE_LABELS[profileDefaults.uiLocale]}
              </span>
              . Change it in the Profile section above.
            </p>
            <p className="text-ink-faint border-ink/15 rounded-md border border-dashed p-3 text-sm italic">
              {localeSample}
            </p>
            <p className="text-ink-faint mt-3 text-xs italic">
              Translation coverage is in progress. Until next-intl is wired, all admin strings
              render in English regardless of this preference; your choice is recorded for when it
              ships.
            </p>
          </section>

          <section
            id="sessions"
            aria-labelledby="sessions-heading"
            className="border-ink/15 scroll-mt-20 rounded-md border p-6"
          >
            <p
              id="sessions-heading"
              className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase"
            >
              Sessions
            </p>
            <SessionsSection />
          </section>

          {isSecretary && tenantDefaults && (
            <section
              id="organization"
              aria-labelledby="organization-heading"
              className="border-ink/15 scroll-mt-20 rounded-md border p-6"
            >
              <p
                id="organization-heading"
                className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase"
              >
                Organization · Secretary only
              </p>
              <TenantForm defaults={tenantDefaults} />
            </section>
          )}

          <section
            id="about"
            aria-labelledby="about-heading"
            className="border-ink/15 scroll-mt-20 rounded-md border p-6"
          >
            <p
              id="about-heading"
              className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase"
            >
              About
            </p>
            <dl className="text-ink-soft grid grid-cols-[140px_1fr] gap-y-2 text-sm">
              <dt className="text-ink-faint">Application</dt>
              <dd>SB Lambunao admin console</dd>
              <dt className="text-ink-faint">Environment</dt>
              <dd className="font-mono text-xs">{process.env.NODE_ENV}</dd>
              <dt className="text-ink-faint">Support</dt>
              <dd>
                <a href="mailto:it@lambunao.gov.ph" className="text-rust hover:underline">
                  it@lambunao.gov.ph
                </a>
              </dd>
              <dt className="text-ink-faint">Data privacy</dt>
              <dd>
                Per RA 10173. Reach the DPO at{' '}
                <a
                  href={`mailto:${tenant?.dpoEmail ?? 'dpo@lambunao.gov.ph'}`}
                  className="text-rust hover:underline"
                >
                  {tenant?.dpoEmail ?? 'dpo@lambunao.gov.ph'}
                </a>
                .
              </dd>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
