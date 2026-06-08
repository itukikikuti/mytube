async function main() {
  const res = await fetch("/api/media-items");
  const message = await res.text();
  document.getElementById("message")!.textContent = message;
}

main();
