import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  id: string;
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

    const meId = userData.user.id;

    const { data: meProfile, error: meProfErr } = await adminSb
      .from("profiles")
      .select("role")
      .eq("id", meId)
      .maybeSingle();

    if (meProfErr) {
      return NextResponse.json({ error: meProfErr.message }, { status: 400 });
    }

    if ((meProfile?.role ?? "") !== "admin") {
      return NextResponse.json({ error: "No autorizado (solo admin)" }, { status: 403 });
    }

    const body = (await req.json()) as Body;
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json({ error: "ID obligatorio" }, { status: 400 });
    }

    // Evitar que el admin se borre a sí mismo por accidente
    if (id === meId) {
      return NextResponse.json({ error: "No puedes eliminar tu propio usuario desde aquí." }, { status: 400 });
    }

    // 1) borrar perfil
    const { error: profErr } = await adminSb.from("profiles").delete().eq("id", id);
    if (profErr) {
      return NextResponse.json({ error: "Error borrando perfil: " + profErr.message }, { status: 400 });
    }

    // 2) borrar usuario auth
    const { error: delErr } = await adminSb.auth.admin.deleteUser(id);
    if (delErr) {
      return NextResponse.json({ error: "Perfil borrado, pero falló Auth: " + delErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error desconocido" }, { status: 500 });
  }
}