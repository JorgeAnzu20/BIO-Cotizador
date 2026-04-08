import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { id, role } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (role !== "admin" && role !== "worker") {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    // 🔑 Cliente con token del usuario
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: { persistSession: false },
      }
    );

    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 🔥 Cliente admin (clave secreta)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // ✅ Verificar que el que hace la petición es admin
    const { data: me, error: meErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (meErr || me?.role !== "admin") {
      return NextResponse.json(
        { error: "Solo un admin puede cambiar roles" },
        { status: 403 }
      );
    }

    // ✅ ACTUALIZAR ROL
    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ role })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}