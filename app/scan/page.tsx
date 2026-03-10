import ScannerClient from "./ScannerClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BEYOND — Scanner",
  description: "Beyond event ticket scanner",
};

export default function ScanPage() {
  return <ScannerClient />;
}
