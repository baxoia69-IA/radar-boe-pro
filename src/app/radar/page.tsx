import { runBoePipeline } from "@/lib/pipeline";
import RadarBoeClient from "@/components/RadarBoeClient";

export const revalidate = 3600;

export default async function RadarPage() {
  const snapshot = await runBoePipeline();
  return <RadarBoeClient snapshot={snapshot} />;
}
