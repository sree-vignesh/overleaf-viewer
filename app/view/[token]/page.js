"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ViewPDF() {
  const { token } = useParams(); // <- safely unwraps the param
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPDF() {
      try {
        setLoading(true);
        const res = await fetch(`/api/overleaf/${token}`);
        const data = await res.json();

        if (data.pdf) setPdfUrl(data.pdf);
        else if (data.error) setError(data.error);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchPDF();
  }, [token]);

  if (loading) return <p>Loading PDF...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {pdfUrl ? (
        <iframe
          src={pdfUrl}
          style={{ width: "100%", height: "100%" }}
          frameBorder="0"
          title="Overleaf PDF"
        />
      ) : (
        <p>No PDF available</p>
      )}
    </div>
  );
}
