// /apps/nevedelE/app/e/[slug]/page.tsx
import crypto from "node:crypto";
import EditionClient from "./ui";

export const dynamic = "force-dynamic";

export default function Page({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const rid = crypto.randomUUID();
  return <EditionClient slug={slug} rid={rid} />;
}
