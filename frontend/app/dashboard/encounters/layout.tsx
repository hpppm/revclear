import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Encounters",
};

export default function EncountersLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
