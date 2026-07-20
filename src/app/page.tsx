import Link from "next/link";

export default function LandingPage() {
  return (
    <main style={{ maxWidth: 640, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1>Welcome — we&apos;re coming soon.</h1>
      <p>
        <Link href="/contact">Contact us</Link>
      </p>
    </main>
  );
}
