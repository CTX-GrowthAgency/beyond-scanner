import { redirect } from "next/navigation";

// Root → redirect to scanner
export default function Home() {
  redirect("/scan");
}
