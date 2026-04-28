import { ArrowRight, Edit3, Trash2 } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldInput } from '@/components/ui/field';

type Role = 'secretary' | 'vice_mayor' | 'mayor' | 'sb_member' | 'other_lgu';

type Row = {
  name: string;
  email: string;
  role: Role;
  lastSignIn: string;
  status: 'active' | 'pending';
};

const ROWS: Row[] = [
  {
    name: '[Secretary]',
    email: 'sec@lambunao.gov.ph',
    role: 'secretary',
    lastSignIn: 'now',
    status: 'active',
  },
  {
    name: '[Vice Mayor]',
    email: 'vm@lambunao.gov.ph',
    role: 'vice_mayor',
    lastSignIn: '2h ago',
    status: 'active',
  },
  {
    name: '[Mayor]',
    email: 'mayor@lambunao.gov.ph',
    role: 'mayor',
    lastSignIn: 'Yesterday',
    status: 'active',
  },
  {
    name: 'Hon. [Member 1]',
    email: 'm1@lambunao.gov.ph',
    role: 'sb_member',
    lastSignIn: '3d ago',
    status: 'active',
  },
  {
    name: 'Hon. [Member 2]',
    email: 'm2@lambunao.gov.ph',
    role: 'sb_member',
    lastSignIn: '1w ago',
    status: 'active',
  },
  {
    name: 'Hon. [Member 8]',
    email: 'm8@lambunao.gov.ph',
    role: 'sb_member',
    lastSignIn: 'never',
    status: 'pending',
  },
  {
    name: '[Other LGU]',
    email: 'plo@lambunao.gov.ph',
    role: 'other_lgu',
    lastSignIn: '5d ago',
    status: 'active',
  },
];

const ROLE_BADGE: Record<
  Role,
  { label: string; variant: 'destructive' | 'secondary' | 'outline' | 'success' }
> = {
  secretary: { label: 'Secretary', variant: 'destructive' },
  vice_mayor: { label: 'Vice Mayor', variant: 'secondary' },
  mayor: { label: 'Mayor', variant: 'secondary' },
  sb_member: { label: 'SB Member', variant: 'outline' },
  other_lgu: { label: 'Other LGU', variant: 'outline' },
};

const ROLE_DEFS = [
  {
    id: 'sb_member',
    name: 'SB Member',
    desc: 'Read everything · edit own profile · co-sponsor.',
    selected: true,
  },
  { id: 'vice_mayor', name: 'Vice Mayor', desc: '+ approve transcripts · publish minutes.' },
  { id: 'mayor', name: 'Mayor', desc: '+ sign resolutions · final publish.' },
  {
    id: 'other_lgu',
    name: 'Other LGU Official',
    desc: 'Read-only access for inter-office coordination.',
  },
];

export const metadata = { title: 'Users & roles' };

export default function UsersPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <AdminPageHeader
          title="Users & roles"
          accessory={
            <Badge variant="destructive" className="h-7 px-3">
              Secretary only
            </Badge>
          }
        />

        <table className="w-full text-sm">
          <thead>
            <tr className="text-ink-faint border-ink/15 border-b font-mono text-[10px] tracking-[0.18em] uppercase">
              <th className="py-3 text-left font-medium">User</th>
              <th className="w-36 py-3 text-left font-medium">Role</th>
              <th className="w-32 py-3 text-left font-medium">Last sign-in</th>
              <th className="w-32 py-3 text-left font-medium">Status</th>
              <th className="w-20 py-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const role = ROLE_BADGE[row.role];
              return (
                <tr
                  key={row.email}
                  className="border-ink/15 hover:bg-paper-2/60 border-b border-dashed transition-colors"
                >
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="bg-paper-3 border-ink/15 inline-flex size-8 shrink-0 items-center justify-center rounded-full border"
                      />
                      <div className="flex flex-col">
                        <span className="text-ink font-medium">{row.name}</span>
                        <span className="text-ink-faint font-mono text-[11px]">{row.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <Badge variant={role.variant}>{role.label}</Badge>
                  </td>
                  <td className="text-ink-soft py-3.5 font-mono text-xs">{row.lastSignIn}</td>
                  <td className="py-3.5">
                    {row.status === 'active' ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="outline">Pending invite</Badge>
                    )}
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${row.name}`}>
                        <Edit3 />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Delete ${row.name}`}>
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Right rail — invite */}
      <aside className="border-ink/20 sticky top-20 h-fit rounded-md border p-5">
        <p className="text-rust mb-4 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Invite new admin
        </p>

        <div className="flex flex-col gap-3">
          <Field label="Full name">
            <FieldInput placeholder="Hon. [Member …]" />
          </Field>
          <Field label="Email">
            <FieldInput type="email" placeholder="…@lambunao.gov.ph" inputMode="email" />
          </Field>
        </div>

        <p className="text-ink-faint mt-5 mb-2 font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
          Role · assign one
        </p>
        <ul className="flex flex-col gap-2">
          {ROLE_DEFS.map((r) => (
            <li key={r.id}>
              <label
                className={`border-ink/25 hover:bg-paper-2 has-[:checked]:bg-rust/8 has-[:checked]:border-rust flex cursor-pointer gap-3 rounded-md border p-3 transition-colors`}
              >
                <input
                  type="radio"
                  name="role"
                  defaultChecked={r.selected}
                  className="accent-rust mt-0.5 size-4"
                />
                <div className="flex flex-col">
                  <span className="text-ink font-medium">{r.name}</span>
                  <span className="text-ink-soft mt-0.5 text-xs italic">{r.desc}</span>
                </div>
              </label>
            </li>
          ))}
        </ul>

        <Button className="font-script mt-5 w-full text-lg">
          Send invite <ArrowRight />
        </Button>
        <p className="text-ink-faint mt-3 text-xs italic">
          Invite expires after 72h. Set password on first sign-in.
        </p>
      </aside>
    </div>
  );
}
