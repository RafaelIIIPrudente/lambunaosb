import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';

export default function QueryNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md">
        <CardEyebrow>Not found</CardEyebrow>
        <CardTitle>That citizen query doesn&apos;t exist.</CardTitle>
        <CardDescription>
          The link may be broken, or the query was removed under retention policy. Browse the inbox
          to find what you&apos;re looking for. SB members only see queries assigned to them — if
          you expected to see this one, ask the Secretary to reassign it.
        </CardDescription>
        <CardFooter>
          <Button variant="outline" size="sm" asChild className="font-medium">
            <Link href="/admin/queries">
              <ArrowLeft />
              Back to inbox
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
