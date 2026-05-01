import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardEyebrow, CardFooter, CardTitle } from '@/components/ui/card';

export default function NewsPostNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md">
        <CardEyebrow>Not found</CardEyebrow>
        <CardTitle>That news post doesn&apos;t exist or has been archived.</CardTitle>
        <CardDescription>
          Check the link, or browse the list to find what you&apos;re looking for. Archived posts
          remain in the audit trail but are hidden from list views and the public site.
        </CardDescription>
        <CardFooter>
          <Button variant="outline" size="sm" asChild className="font-medium">
            <Link href="/admin/news">
              <ArrowLeft />
              Back to news
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
