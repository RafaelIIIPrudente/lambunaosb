import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';

export default function AuditEntryNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md">
        <CardEyebrow>Not found</CardEyebrow>
        <CardTitle>That audit entry doesn&apos;t exist.</CardTitle>
        <CardDescription>
          The link may be broken, or the entry belongs to a different tenant. Audit rows are
          append-only; entries are never deleted, so any valid id from the past is still here.
        </CardDescription>
        <CardFooter>
          <Button variant="outline" size="sm" asChild className="font-medium">
            <Link href="/admin/audit">
              <ArrowLeft />
              Back to audit log
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
