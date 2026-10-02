import { redirect } from "next/navigation";

/** Fallback if middleware is bypassed — marketing lives at /www. */
export default function RootFallback() {
  redirect("/www");
}
