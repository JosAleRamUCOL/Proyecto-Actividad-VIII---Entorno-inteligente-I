// -------- LOGIN ---------
const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");
const goToRegister = document.getElementById("goToRegister");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        window.location.href = "/success";
      } else {
        errorMessage.textContent = data.message;
      }
    } catch {
      errorMessage.textContent = "Error al conectar con el servidor";
    }
  });

  // Botón para ir al registro
  goToRegister.addEventListener("click", () => {
    window.location.href = "/register";
  });
}

// -------- REGISTRO ---------
const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const goToLogin = document.getElementById("goToLogin");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value.trim();

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Registro exitoso. Ahora puedes iniciar sesión.");
        window.location.href = "/login";
      } else {
        registerMessage.textContent = data.message;
      }
    } catch {
      registerMessage.textContent = "Error al conectar con el servidor";
    }
  });

  // Botón para volver al login
  goToLogin.addEventListener("click", () => {
    window.location.href = "/login";
  });
}