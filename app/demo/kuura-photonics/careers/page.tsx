import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers – Kuura Photonics Oy (fictional demo company)",
  description: "Synthetic careers page used to demonstrate reading a company website. Kuura Photonics Oy does not exist.",
};

/**
 * SYNTHETIC careers page of a FICTIONAL company. It exists so the company flow can read a
 * real web page through Context.dev during the demo ("Reading website…").
 */
export default function KuuraPhotonicsCareers() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 font-serif leading-relaxed">
      <p className="mb-8 rounded-md bg-muted px-4 py-2 font-sans text-sm text-muted-foreground">
        Demo page: Kuura Photonics Oy is a fictional company created for the Bridgy prototype. All content is synthetic.
      </p>
      <h1 className="font-sans text-3xl font-semibold">Careers at Kuura Photonics Oy</h1>
      <p className="mt-4">
        Kuura Photonics designs and manufactures photonic components for telecom and sensing customers in Europe. Our
        test lab in Espoo is growing.
      </p>

      <h2 className="mt-10 font-sans text-2xl font-semibold">Test Engineer, Photonics</h2>
      <p className="mt-1 font-sans text-sm text-muted-foreground">Full-time · Espoo · Start in early 2027</p>
      <p className="mt-4">
        You will test optical components in our lab, build and improve measurement setups, and automate repetitive
        measurements.
      </p>
      <h3 className="mt-6 font-sans text-lg font-semibold">What we expect</h3>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>At least 2 years of experience in optical or photonic component testing.</li>
        <li>Experience with lab measurement equipment such as optical spectrum analysers and power meters.</li>
        <li>Test automation with Python is a plus.</li>
        <li>BSc or MSc in Photonics, Physics or Electrical Engineering.</li>
        <li>A PhD in photonics is an advantage.</li>
        <li>Fluent English. Finnish is not required.</li>
      </ul>
      <h3 className="mt-6 font-sans text-lg font-semibold">What we offer</h3>
      <p className="mt-2">A modern lab, a team of twelve engineers and real customer projects from day one.</p>
    </main>
  );
}
