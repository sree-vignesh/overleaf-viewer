export default async function Viewer({ params }) {
  const { token } = await params;

  return (
    <div style={{ height: "100vh" }}>
      <embed
        src={`/api/overleaf/${token}`}
        type="application/pdf"
        width="100%"
        height="100%"
      />
    </div>
  );
}
