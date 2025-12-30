export default function ResearchJobPage({
  params,
}: {
  params: { jobId: string };
}) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold">Research Job: {params.jobId}</h1>
    </main>
  );
}
