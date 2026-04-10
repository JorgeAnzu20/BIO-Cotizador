"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageShell from "@/components/PageShell";
import { motion, AnimatePresence } from "framer-motion";

type Product = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  features: string | null;
  price: number;
  iva: boolean;
  pdf_path: string | null;
};

const COLORS = {
  dark: "#0D0D0D",
  text: "#1F2937",
  white: "#FFFFFF",
  bone: "#F5F5F0",
  grayBg: "#E5E7EB",
  grayBorder: "#E5E7EB",
  blue: "#05AFF2",
  cyan: "#05DBF2",
  aqua: "#05F2F2",
  danger: "#ff5a5a",
};

const pageVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut" as const,
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

const sidebarVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function load() {
    setMsg("");
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if ((profile?.role ?? "") !== "admin") {
      router.push("/");
      return;
    }

    const { data: rows } = await supabase
      .from("products")
      .select("id, name, code, description, features, price, iva, pdf_path")
      .order("id", { ascending: false });

    setProducts((rows ?? []) as Product[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;

    return products.filter((p) => {
      const name = (p.name ?? "").toLowerCase();
      const code = (p.code ?? "").toLowerCase();
      const desc = (p.description ?? "").toLowerCase();
      return name.includes(s) || code.includes(s) || desc.includes(s);
    });
  }, [products, q]);

  async function viewPdf(p: Product) {
    if (!p.pdf_path) {
      setMsg("Este producto no tiene PDF.");
      return;
    }

    const { data } = await supabase.storage
      .from("product-pdfs")
      .createSignedUrl(p.pdf_path, 60 * 10);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  }

  async function deleteProduct(p: Product) {
    const ok = confirm(`¿Eliminar el producto "${p.name}"?`);
    if (!ok) return;

    await supabase.from("products").delete().eq("id", p.id);

    if (p.pdf_path) {
      await supabase.storage.from("product-pdfs").remove([p.pdf_path]);
    }

    await load();
  }

  if (loading) {
    return (
      <PageShell>
        <div style={{ textAlign: "center", padding: 40 }}>Cargando...</div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        style={{ maxWidth: 1300, margin: "0 auto", padding: isMobile ? 14 : 24 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "290px 1fr",
            gap: 20,
          }}
        >
          <motion.div variants={sidebarVariants} style={panelStyle}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>Productos</div>

            <Link href="/">
              <button style={navButtonStyle}>← Volver</button>
            </Link>

            <Link href="/products/new">
              <button style={primaryButtonStyle}>+ Nuevo</button>
            </Link>
          </motion.div>

          <div style={{ display: "grid", gap: 20 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar..."
              style={inputStyle}
            />

            <div style={{ display: "grid", gap: 12 }}>
              {filtered.map((p) => (
                <div key={p.id} style={panelStyle}>
                  <div style={{ fontWeight: 900 }}>{p.name}</div>
                  <div>${p.price}</div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <Link href={`/products/${p.id}/edit`}>
                      <button style={actionButtonStyle}>Editar</button>
                    </Link>

                    <button onClick={() => deleteProduct(p)} style={dangerButtonStyle}>
                      Eliminar
                    </button>

                    <button onClick={() => viewPdf(p)} style={actionButtonStyle}>
                      PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </PageShell>
  );
}

const panelStyle: React.CSSProperties = {
  background: COLORS.bone,
  padding: 16,
  borderRadius: 16,
};

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #ccc",
};

const navButtonStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
};

const primaryButtonStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
};

const actionButtonStyle: React.CSSProperties = {
  padding: 8,
};

const dangerButtonStyle: React.CSSProperties = {
  padding: 8,
  background: "red",
  color: "white",
};
