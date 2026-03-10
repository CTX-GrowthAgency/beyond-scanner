import LoginClient from "./LoginClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BEYOND — Scanner Login",
  description: "Secure access for Beyond event scanners",
};

export default function LoginPage() {
  return <LoginClient />;
}
