fetch("/api/media-items")
  .then(res => res.text())
  .then(message => {
    document.getElementById("message")!.textContent = message;
  });
  