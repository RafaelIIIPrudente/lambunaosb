import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { AdminPageHeader } from '@/components/app/admin-page-header';
import { Button } from '@/components/ui/button';
import { Field, FieldInput, FieldSelect } from '@/components/ui/field';

export const metadata = { title: 'New meeting' };

export default function NewMeetingPage() {
  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="text-ink-faint mb-4 flex items-center gap-1.5 font-mono text-xs"
      >
        <Link href="/admin/meetings" className="hover:text-rust">
          Meetings
        </Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-ink">New meeting</span>
      </nav>

      <AdminPageHeader
        title="New meeting"
        accessory={
          <>
            <Button variant="outline" asChild className="font-script text-base">
              <Link href="/admin/meetings">Cancel</Link>
            </Button>
            <Button className="font-script text-base">✓ Create meeting</Button>
          </>
        }
      />

      <div className="grid max-w-3xl gap-4">
        <Field label="Title">
          <FieldInput placeholder="e.g. Regular Session #15" />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Type">
            <FieldSelect defaultValue="regular">
              <option value="regular">Regular</option>
              <option value="special">Special</option>
              <option value="committee_of_whole">Committee of the Whole</option>
              <option value="committee">Committee</option>
              <option value="public_hearing">Public hearing</option>
            </FieldSelect>
          </Field>
          <Field label="Sequence №">
            <FieldInput type="number" placeholder="15" />
          </Field>
          <Field label="Scheduled date">
            <FieldInput type="date" />
          </Field>
          <Field label="Scheduled time">
            <FieldInput type="time" defaultValue="09:00" />
          </Field>
          <Field label="Presider">
            <FieldSelect>
              <option>Hon. Rosario Tabuga</option>
            </FieldSelect>
          </Field>
          <Field label="Primary locale">
            <FieldSelect defaultValue="hil">
              <option value="hil">Hiligaynon</option>
              <option value="en">English</option>
              <option value="tl">Tagalog</option>
            </FieldSelect>
          </Field>
        </div>
        <Field label="Location">
          <FieldInput defaultValue="Session Hall, 2/F Municipal Hall" />
        </Field>
      </div>
    </div>
  );
}
