import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sales Brain · Doutor-AI",
    template: "%s · Sales Brain",
  },
  description:
    "Plataforma de inteligência comercial da Doutor-AI — funil de vendas, contas e oportunidades.",
};

// Aplica o tema salvo ANTES da primeira pintura (evita "piscada" de tema errado)
const scriptTema = `
(function () {
  try {
    var salvo = localStorage.getItem("sb-tema");
    var escuro = salvo ? salvo === "escuro" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (escuro) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
