import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const adminSb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const cedula = String(body.cedula ?? "").trim();

    if (!cedula) {
      return NextResponse.json({ error: "Cédula obligatoria" }, { status: 400 });
    }

    const { data, error } = await adminSb
      .from("profiles")
      .select("email")
      .eq("cedula", cedula)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data?.email) {
      return NextResponse.json({ error: "No existe un usuario con esa cédula" }, { status: 404 });
    }

    return NextResponse.json({ email: data.email });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error desconocido" }, { status: 500 });
  }
}