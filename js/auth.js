const pantallaLogin = document.getElementById("pantallaLogin");
const pantallaPendiente = document.getElementById("pantallaPendiente");
const appContenido = document.getElementById("appContenido");
const btnAdminPanel = document.getElementById("btnAdminPanel");

const formLogin = document.getElementById("formLogin");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");

const formRegistro = document.getElementById("formRegistro");
const registroEmail = document.getElementById("registroEmail");
const registroPassword = document.getElementById("registroPassword");
const registroError = document.getElementById("registroError");

const linkMostrarRegistro = document.getElementById("linkMostrarRegistro");
const linkMostrarLogin = document.getElementById("linkMostrarLogin");

const btnLogout = document.getElementById("btnLogout");
const btnLogoutPendiente = document.getElementById("btnLogoutPendiente");

const modalAdmin = document.getElementById("modalAdmin");
const cerrarModalAdmin = document.getElementById("cerrarModalAdmin");
const listaPendientes = document.getElementById("listaPendientes");

/* =========================================================
   HELPERS DE PANTALLA
========================================================= */

function mostrarSoloPantalla(pantalla, tipoDisplay) {
    if (pantallaLogin) pantallaLogin.style.display = "none";
    if (pantallaPendiente) pantallaPendiente.style.display = "none";
    if (appContenido) appContenido.style.display = "none";

    if (pantalla) {
        pantalla.style.display = tipoDisplay || "flex";
    }
}

function limpiarErroresAuth() {
    if (loginError) loginError.textContent = "";
    if (registroError) registroError.textContent = "";
}

function cerrarModalAdminUI() {
    if (modalAdmin) {
        modalAdmin.style.display = "none";
    }
}

function abrirModalAdminUI() {
    if (modalAdmin) {
        modalAdmin.style.display = "flex";
    }
}

/* =========================================================
   NAVEGACIÓN LOGIN / REGISTRO
========================================================= */

if (linkMostrarRegistro) {
    linkMostrarRegistro.addEventListener("click", function (e) {
        e.preventDefault();

        if (formLogin) formLogin.style.display = "none";
        if (formRegistro) formRegistro.style.display = "flex";
        if (linkMostrarRegistro) linkMostrarRegistro.style.display = "none";
        if (linkMostrarLogin) linkMostrarLogin.style.display = "inline";

        limpiarErroresAuth();
    });
}

if (linkMostrarLogin) {
    linkMostrarLogin.addEventListener("click", function (e) {
        e.preventDefault();

        if (formRegistro) formRegistro.style.display = "none";
        if (formLogin) formLogin.style.display = "flex";
        if (linkMostrarLogin) linkMostrarLogin.style.display = "none";
        if (linkMostrarRegistro) linkMostrarRegistro.style.display = "inline";

        limpiarErroresAuth();
    });
}

/* =========================================================
   MENSAJES DE ERROR
========================================================= */

function traducirErrorFirebase(error) {
    const codigo = error && error.code ? error.code : "";

    if (codigo.includes("email-already-in-use")) {
        return "Ese correo ya está registrado.";
    }

    if (codigo.includes("invalid-email")) {
        return "El correo no es válido.";
    }

    if (codigo.includes("weak-password")) {
        return "La contraseña debe tener al menos 6 caracteres.";
    }

    if (
        codigo.includes("user-not-found") ||
        codigo.includes("wrong-password") ||
        codigo.includes("invalid-credential")
    ) {
        return "Correo o contraseña incorrectos.";
    }

    if (codigo.includes("too-many-requests")) {
        return "Demasiados intentos. Probá de nuevo en unos minutos.";
    }

    if (codigo.includes("network-request-failed")) {
        return "Error de conexión. Revisá tu internet.";
    }

    return "Ocurrió un error: " + (error && error.message ? error.message : "desconocido");
}

/* =========================================================
   LOGIN
========================================================= */

if (formLogin) {
    formLogin.addEventListener("submit", async function (e) {
        e.preventDefault();

        if (loginError) loginError.textContent = "";

        const email = loginEmail ? loginEmail.value.trim() : "";
        const password = loginPassword ? loginPassword.value : "";

        if (!email || !password) {
            if (loginError) loginError.textContent = "Completá correo y contraseña.";
            return;
        }

        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            console.error(error);
            if (loginError) {
                loginError.textContent = traducirErrorFirebase(error);
            }
        }
    });
}

/* =========================================================
   REGISTRO
========================================================= */

if (formRegistro) {
    formRegistro.addEventListener("submit", async function (e) {
        e.preventDefault();

        if (registroError) registroError.textContent = "";

        const email = registroEmail ? registroEmail.value.trim() : "";
        const password = registroPassword ? registroPassword.value : "";

        if (!email || !password) {
            if (registroError) registroError.textContent = "Completá correo y contraseña.";
            return;
        }

        try {
            const credencial = await auth.createUserWithEmailAndPassword(email, password);

            await db.collection("usuarios").doc(credencial.user.uid).set({
                email: email,
                aprobado: false,
                admin: false,
                fechaSolicitud: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (formRegistro) formRegistro.reset();

            if (registroError) {
                registroError.textContent = "Solicitud enviada. Esperá la aprobación del administrador.";
            }

        } catch (error) {
            console.error(error);
            if (registroError) {
                registroError.textContent = traducirErrorFirebase(error);
            }
        }
    });
}

/* =========================================================
   LOGOUT
========================================================= */

if (btnLogout) {
    btnLogout.addEventListener("click", function () {
        auth.signOut();
    });
}

if (btnLogoutPendiente) {
    btnLogoutPendiente.addEventListener("click", function () {
        auth.signOut();
    });
}

/* =========================================================
   ADMIN PANEL
========================================================= */

if (btnAdminPanel) {
    btnAdminPanel.addEventListener("click", function () {
        abrirModalAdminUI();
        cargarPendientes();
    });
}

if (cerrarModalAdmin) {
    cerrarModalAdmin.addEventListener("click", function () {
        cerrarModalAdminUI();
    });
}

if (modalAdmin) {
    modalAdmin.addEventListener("click", function (e) {
        if (e.target === modalAdmin) {
            cerrarModalAdminUI();
        }
    });
}

/* =========================================================
   CARGAR PENDIENTES
========================================================= */

async function cargarPendientes() {
    if (!listaPendientes) return;

    listaPendientes.innerHTML = "<p>Cargando...</p>";

    try {
        const snapshot = await db
            .collection("usuarios")
            .where("aprobado", "==", false)
            .get();

        if (snapshot.empty) {
            listaPendientes.innerHTML = "<p>No hay usuarios pendientes.</p>";
            return;
        }

        listaPendientes.innerHTML = "";

        snapshot.forEach(function (docSnap) {
            const datos = docSnap.data();

            const fila = document.createElement("div");
            fila.className = "filaPendiente";
            fila.innerHTML = `
                <span>${datos.email || "Sin correo"}</span>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btnAprobar" data-uid="${docSnap.id}">✅ Aprobar</button>
                    <button class="btnRechazar" data-uid="${docSnap.id}">🗑️ Rechazar</button>
                </div>
            `;

            listaPendientes.appendChild(fila);
        });

        listaPendientes.querySelectorAll(".btnAprobar").forEach(function (boton) {
            boton.addEventListener("click", async function () {
                boton.disabled = true;

                try {
                    await db.collection("usuarios").doc(this.dataset.uid).update({
                        aprobado: true
                    });

                    cargarPendientes();
                } catch (error) {
                    console.error(error);
                    alert("No se pudo aprobar el usuario: " + error.message);
                    boton.disabled = false;
                }
            });
        });

        listaPendientes.querySelectorAll(".btnRechazar").forEach(function (boton) {
            boton.addEventListener("click", async function () {
                const confirmar = confirm("¿Rechazar y eliminar esta solicitud?");
                if (!confirmar) return;

                boton.disabled = true;

                try {
                    await db.collection("usuarios").doc(this.dataset.uid).delete();
                    cargarPendientes();
                } catch (error) {
                    console.error(error);
                    alert("No se pudo rechazar el usuario: " + error.message);
                    boton.disabled = false;
                }
            });
        });

    } catch (error) {
        console.error(error);
        listaPendientes.innerHTML = "<p>Error cargando usuarios: " + error.message + "</p>";
    }
}

/* =========================================================
   LISTENERS GLOBALES DE DATOS
========================================================= */

function cerrarListenersDeDatos() {
    if (window.listenerMovimientos) {
        try {
            window.listenerMovimientos();
        } catch (error) {
            console.warn("No se pudo cerrar listenerMovimientos:", error);
        }
        window.listenerMovimientos = null;
    }

    if (window.listenerPlanilla) {
        try {
            window.listenerPlanilla();
        } catch (error) {
            console.warn("No se pudo cerrar listenerPlanilla:", error);
        }
        window.listenerPlanilla = null;
    }
}

/* =========================================================
   SESIÓN / ESTADO AUTH
========================================================= */

auth.onAuthStateChanged(async function (user) {
    cerrarListenersDeDatos();
    cerrarModalAdminUI();
    limpiarErroresAuth();

    if (!user) {
        mostrarSoloPantalla(pantallaLogin, "flex");

        if (formRegistro) formRegistro.style.display = "none";
        if (formLogin) formLogin.style.display = "flex";
        if (linkMostrarLogin) linkMostrarLogin.style.display = "none";
        if (linkMostrarRegistro) linkMostrarRegistro.style.display = "inline";

        return;
    }

    try {
        const doc = await db.collection("usuarios").doc(user.uid).get();

        if (!doc.exists) {
            await auth.signOut();
            return;
        }

        const datos = doc.data() || {};

        if (datos.aprobado === true) {
            mostrarSoloPantalla(appContenido, "block");

            if (btnAdminPanel) {
                btnAdminPanel.style.display = datos.admin === true ? "inline-flex" : "none";
            }

            if (typeof iniciarEscuchaDatos === "function") {
                iniciarEscuchaDatos();
            }

            if (typeof iniciarEscuchaPlanilla === "function") {
                iniciarEscuchaPlanilla();
            }

        } else {
            mostrarSoloPantalla(pantallaPendiente, "flex");

            if (btnAdminPanel) {
                btnAdminPanel.style.display = "none";
            }
        }

    } catch (error) {
        console.error(error);
        mostrarSoloPantalla(pantallaLogin, "flex");
    }
});

