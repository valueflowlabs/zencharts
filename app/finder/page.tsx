import type { Metadata } from "next";
import Finder from "@/components/Finder";

export const metadata: Metadata = {
  title: "zencharts · finder",
  description:
    "Low-cap token finder: new and trending DEX pools screened with free on-chain checks.",
};

export default function FinderPage() {
  return <Finder />;
}
