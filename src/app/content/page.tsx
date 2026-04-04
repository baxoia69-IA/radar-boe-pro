import ContentClient from "./ContentClient";

export const metadata = {
  title: "Centro de contenido — LexFiscalIA",
  description: "Herramienta interna para analizar fuentes oficiales y generar contenido editorial fiscal.",
};

export default function ContentPage() {
  return <ContentClient />;
}
