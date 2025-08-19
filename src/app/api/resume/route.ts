import { NextResponse } from "next/server";
import resume from "@/data/resume.json";

export async function GET() {
  return NextResponse.json(resume);
}


