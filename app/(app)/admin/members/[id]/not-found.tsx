import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';

export default function MemberNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md">
        <CardEyebrow>Not found</CardEyebrow>
        <CardTitle>That member doesn&apos;t exist or has been archived.</CardTitle>
        <CardDescription>
          Check the link, or browse the roster to find what you&apos;re looking for. Archived
          members remain in the audit trail but are hidden from list views.
        </CardDescription>
        <CardFooter>
          <Button variant="outline" size="sm" asChild className="font-medium">
            <Link href="/admin/members">
              <ArrowLeft />
              Back to roster
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
