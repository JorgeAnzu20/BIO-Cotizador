import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  cedula?: string;
  password?: string;
  full_name?: string | null;
  role?: "admin" | "worker";
  branch_id?: number | null;
};

function normalizeCedula(value: string) {
  return value.replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Validar quién está haciendo la petición
    const {
      data: { user: requester },
      error: requesterErr,
    } = await adminClient.auth.getUser(token);

    if (requesterErr || !requester) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: requesterProfile, error: requesterProfileErr } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", requester.id)
      .maybeSingle();

    if (requesterProfileErr) {
      return NextResponse.json({ error: requesterProfileErr.message }, { status: 500 });
    }

    if ((requesterProfile?.role ?? "") !== "admin") {
      return NextResponse.json({ error: "Solo admin puede crear usuarios" }, { status: 403 });
    }

    const body = (await req.json()) as Body;

    const cedula = normalizeCedula(body.cedula ?? "");
    const password = body.password ?? "";
    const full_name = body.full_name?.trim() || null;
    const role = body.role === "admin" ? "admin" : "worker";
    const branch_id =
      body.branch_id === null || body.branch_id === undefined ? null : Number(body.branch_id);

    if (!cedula) {
      return NextResponse.json({ error: "Cédula obligatoria" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener mínimo 6 caracteres" },
        { status: 400 }
      );
    }

    // Email técnico interno para Supabase Auth
    const email = `${cedula}@usuario.local`;

    // Verificar si ya existe un perfil con esa cédula
    const { data: existingProfile, error: existingProfileErr } = await adminClient
      .from("profiles")
      .select("id")
      .eq("cedula", cedula)
      .maybeSingle();

    if (existingProfileErr) {
      return NextResponse.json({ error: existingProfileErr.message }, { status: 500 });
    }

    if (existingProfile) {
      return NextResponse.json({ error: "Ya existe un usuario con esa cédula" }, { status: 400 });
    }

    // Crear usuario en Auth
    const { data: createdAuth, error: createAuthErr } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          cedula,
          full_name,
          role,
        },
      });

    if (createAuthErr || !createdAuth.user) {
      return NextResponse.json(
        { error: createAuthErr?.message ?? "No se pudo crear el usuario en Auth" },
        { status: 500 }
      );
    }

    const userId = createdAuth.user.id;

    // Crear/actualizar perfil
    const { error: profileErr } = await adminClient.from("profiles").upsert({
      id: userId,
      email,
      cedula,
      full_name,
      role,
      branch_id,
    });

    if (profileErr) {
      // Si falló el perfil, intenta borrar el usuario auth recién creado para no dejar basura
      await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      user_id: userId,
      email,
      cedula,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error interno creando usuario" },
      { status: 500 }
    );
  }
}
