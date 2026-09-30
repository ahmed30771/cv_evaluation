import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function RewriteRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/build/${id}`);
}
