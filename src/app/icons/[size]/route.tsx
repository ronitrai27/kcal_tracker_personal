import { ImageResponse } from "next/og";
import { iconArt } from "@/lib/icon-art";

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Number((await params).size);
  const size = n === 192 ? 192 : 512;
  return new ImageResponse(iconArt(size), { width: size, height: size });
}
