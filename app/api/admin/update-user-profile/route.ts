import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  id: string;
  full_name: string;
  cedula: string;
  email: string;
  role: "admin" | "worker";
  branch_id: number | null;
};

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

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "No autorizado (sin token)" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await adminSb.auth.getUser(token);
    if (userErr || !userData.user) {
      return NextResponse.json({ error: "No autorizado (token inválido)" }, { status: 401 });
    }

    const { data: meProfile } = await adminSb
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if ((meProfile?.role ?? "") !== "admin") {
      return NextResponse.json({ error: "No autorizado (solo admin)" }, { status: 403 });
    }

    const body = (await req.json()) as Body;

    const id = String(body.id || "");
    const full_name = String(body.full_name || "").trim();
    const cedula = String(body.cedula || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const role = body.role === "admin" ? "admin" : "worker";
    const branch_id = body.branch_id ?? null;

    if (!id) return NextResponse.json({ error: "ID obligatorio" }, { status: 400 });
    if (!full_name) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });
    if (!cedula) return NextResponse.json({ error: "Cédula obligatoria" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Email obligatorio" }, { status: 400 });

    const { error } = await adminSb
      .from("profiles")
      .update({
        full_name,
        cedula,
        email,
        role,
        branch_id,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error desconocido" }, { status: 500 });
  }
}