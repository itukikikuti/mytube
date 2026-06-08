fetch("/api/message")
  .then(res => res.text())
  .then(message => {
    document.getElementById("message")!.textContent = message;
  });
  