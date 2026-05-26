async function testFetch() {
  try {
    const res = await fetch("http://localhost:8080/api/v1/eventcategorys");
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch (e) {
    console.error("Fetch failed:", e.message);
  }
}

testFetch();
