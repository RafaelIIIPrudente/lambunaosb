import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Field, FieldInput, FieldSelect } from '@/components/ui/field';

const SECTIONS = [
  { id: 'profile', label: 'Profile', active: true },
  { id: 'password', label: 'Password' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'language', label: 'Language' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'about', label: 'About' },
];

const NOTIFS = [
  { label: 'New citizen query received', email: true, push: true },
  { label: 'Transcript ready for approval', email: true, push: false },
  { label: 'Resolution requires my signature', email: true, push: true },
];

export const metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <div>
      <AdminPageHeader title="Settings" />

      <div className="grid gap-8 md:grid-cols-[180px_1fr]">
        {/* Left nav */}
        <nav aria-label="Settings sections">
          <ul className="flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={s.active ? 'true' : undefined}
                  className="hover:bg-paper-2 aria-[current=true]:bg-rust/10 aria-[current=true]:text-rust font-script flex h-9 items-center rounded-md px-3 text-base transition-colors"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-8">
          {/* Profile */}
          <section id="profile" className="border-ink/20 rounded-md border p-6">
            <p className="text-rust mb-5 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Profile
            </p>
            <div className="grid gap-4 md:grid-cols-[160px_1fr_1fr]">
              <div className="bg-paper-3 border-ink/20 row-span-3 flex aspect-square items-center justify-center rounded-md border border-dashed">
                <span className="text-ink-faint font-mono text-xs">[ Photo ]</span>
              </div>
              <Field label="Full name">
                <FieldInput defaultValue="[Secretary Name]" />
              </Field>
              <Field label="Title">
                <FieldInput defaultValue="Secretary to the Sangguniang Bayan" />
              </Field>
              <Field label="Email">
                <FieldInput type="email" defaultValue="sec@lambunao.gov.ph" />
              </Field>
              <Field label="Phone">
                <FieldInput defaultValue="(033) 333-1234" />
              </Field>
              <Field label="UI language">
                <FieldSelect defaultValue="en">
                  <option value="en">English</option>
                  <option value="tl">Tagalog</option>
                  <option value="hil">Hiligaynon</option>
                </FieldSelect>
              </Field>
              <Field label="Time zone">
                <FieldSelect defaultValue="Asia/Manila">
                  <option value="Asia/Manila">UTC+08 (Manila)</option>
                </FieldSelect>
              </Field>
            </div>
          </section>

          {/* Password */}
          <section id="password" className="border-ink/20 rounded-md border p-6">
            <p className="text-rust mb-5 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Password
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Current password" className="md:col-span-2 md:max-w-md">
                <FieldInput type="password" placeholder="••••••••" />
              </Field>
              <Field label="New password">
                <FieldInput type="password" placeholder="••••••••" />
              </Field>
              <Field label="Confirm new">
                <FieldInput type="password" placeholder="••••••••" />
              </Field>
            </div>
            <p className="text-ink-faint mt-4 text-xs italic">
              ≥ 12 chars · 1 number · 1 symbol · not reused. Sessions on other devices will sign
              out.
            </p>
          </section>

          {/* Notifications */}
          <section id="notifications" className="border-ink/20 rounded-md border p-6">
            <p className="text-rust mb-5 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
              Notifications
            </p>
            <ul className="flex flex-col">
              {NOTIFS.map((n) => (
                <li
                  key={n.label}
                  className="border-ink/15 flex items-center justify-between border-b border-dashed py-3 last:border-0"
                >
                  <span className="text-ink font-script text-base italic">{n.label}</span>
                  <span className="flex gap-4 text-xs">
                    <span className="text-rust inline-flex items-center gap-1.5 font-mono">
                      <span className="bg-rust size-1.5 rounded-full" /> on
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 font-mono ${
                        n.push ? 'text-gold' : 'text-ink-faint'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${n.push ? 'bg-gold' : 'bg-ink-ghost'}`}
                      />
                      {n.push ? 'on' : '—'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
