"use client";
import { useEffect, useState } from "react";

export default function MermaidGraphDisplay() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/your-endpoint"); // Update with your correct endpoint
      const json = await res.json();
      setData(json);
    };

    fetchData();
  }, []);

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Display the final state content */}
      <h2>Final State Response:</h2>
      <p>{data.response}</p>

      {/* Display the image */}
      <h2>Mermaid Graph:</h2>
      <img src={data.image} alt="Mermaid Graph" />
    </div>
  );
}
