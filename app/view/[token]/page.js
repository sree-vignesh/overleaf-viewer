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
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: "auto",
          backgroundColor: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "8px 15px",
          boxSizing: "border-box",
          flexShrink: 0,
          flexWrap: "wrap",
          columnGap: "15px",
        }}
      >
        {/* Left side */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* <span style={{ fontWeight: "bold", fontSize: "14px" }}>
            Overleaf Project PDF Viewer
          </span> */}
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              color: "#000",
              backgroundColor: "#fff",
              border: "1px solid #fff",
              padding: "6px 12px",
              cursor: "pointer",
              borderRadius: "4px",
              transition: "all 0.2s",
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#fff";
              e.target.style.color = "#000";
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#000";
              e.target.style.color = "#fff";
            }}
          >
            Get your own link
          </button>
        </div>

        {/* Right side */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            // marginTop: "5px",
          }}
        >
          {pdfUrl && (
            <a
              href={pdfUrl}
              download="project.pdf"
              style={{
                color: "#000",
                backgroundColor: "#fff",
                border: "1px solid #fff",
                padding: "6px 12px",
                textDecoration: "none",
                borderRadius: "4px",
                transition: "all 0.2s",
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#fff";
                e.target.style.color = "#000";
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#000";
                e.target.style.color = "#fff";
              }}
            >
              Download PDF
            </a>
          )}
        </div>
      </div>

      {/* PDF viewer */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {loading && (
          <p style={{ textAlign: "center", marginTop: "20px" }}>
            Loading PDF...
          </p>
        )}
        {error && (
          <p style={{ textAlign: "center", marginTop: "20px", color: "red" }}>
            {error}
          </p>
        )}
        {pdfUrl && (
          <iframe
            src={pdfUrl}
            style={{ width: "100%", height: "100%" }}
            frameBorder="0"
            title="Overleaf PDF"
          />
        )}
      </div>
    </div>
  );
}
