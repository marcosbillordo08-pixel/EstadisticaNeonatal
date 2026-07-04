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

        let listenerMovimientos = null;

        function mostrarSoloPantalla(pantalla, tipoDisplay) {
            pantallaLogin.style.display = "none";
            pantallaPendiente.style.display = "none";
            appContenido.style.display = "none";
            pantalla.style.display = tipoDisplay || "flex";
        }

        linkMostrarRegistro.addEventListener("click", function (e) {
            e.preventDefault();
            formLogin.style.display = "none";
            formRegistro.style.display = "flex";
            linkMostrarRegistro.style.display = "none";
            linkMostrarLogin.style.display = "inline";
        });

        linkMostrarLogin.addEventListener("click", function (e) {
            e.preventDefault();
            formRegistro.style.display = "none";
            formLogin.style.display = "flex";
            linkMostrarLogin.style.display = "none";
            linkMostrarRegistro.style.display = "inline";
        });

        function traducirErrorFirebase(error) {
            const codigo = error.code || "";
            if (codigo.includes("email-already-in-use")) return "Ese correo ya está registrado.";
            if (codigo.includes("invalid-email")) return "El correo no es válido.";
            if (codigo.includes("weak-password")) return "La contraseña debe tener al menos 6 caracteres.";
            if (codigo.includes("user-not-found") || codigo.includes("wrong-password") || codigo.includes("invalid-credential")) return "Correo o contraseña incorrectos.";
            if (codigo.includes("too-many-requests")) return "Demasiados intentos. Probá de nuevo en unos minutos.";
            if (codigo.includes("network-request-failed")) return "Error de conexión. Revisá tu internet.";
            return "Ocurrió un error: " + error.message;
        }

        formLogin.addEventListener("submit", async function (e) {
            e.preventDefault();
            loginError.textContent = "";
            try {
                await auth.signInWithEmailAndPassword(loginEmail.value.trim(), loginPassword.value);
            } catch (error) {
                console.error(error);
                loginError.textContent = traducirErrorFirebase(error);
            }
        });

        formRegistro.addEventListener("submit", async function (e) {
            e.preventDefault();
            registroError.textContent = "";
            try {
                const credencial = await auth.createUserWithEmailAndPassword(
                    registroEmail.value.trim(),
                    registroPassword.value
                );
                await db.collection("usuarios").doc(credencial.user.uid).set({
                    email: registroEmail.value.trim(),
                    aprobado: false,
                    admin: false,
                    fechaSolicitud: firebase.firestore.FieldValue.serverTimestamp()
                });
                formRegistro.reset();
            } catch (error) {
                console.error(error);
                registroError.textContent = traducirErrorFirebase(error);
            }
        });

        btnLogout.addEventListener("click", function () { auth.signOut(); });
        btnLogoutPendiente.addEventListener("click", function () { auth.signOut(); });

        auth.onAuthStateChanged(async function (user) {

            if (listenerMovimientos) {
                listenerMovimientos();
                listenerMovimientos = null;
            }

            if (!user) {
                mostrarSoloPantalla(pantallaLogin);
                return;
            }

            try {
                const doc = await db.collection("usuarios").doc(user.uid).get();

                if (!doc.exists) {
                    await auth.signOut();
                    return;
                }

                const datos = doc.data();

                if (datos.aprobado === true) {
                    mostrarSoloPantalla(appContenido, "block");
                    btnAdminPanel.style.display = (datos.admin === true) ? "inline-flex" : "none";
                    iniciarEscuchaDatos();
                } else {
                    mostrarSoloPantalla(pantallaPendiente);
                }

            } catch (error) {
                console.error(error);
                mostrarSoloPantalla(pantallaLogin);
            }

        });

        const modalAdmin = document.getElementById("modalAdmin");
        const cerrarModalAdmin = document.getElementById("cerrarModalAdmin");
        const listaPendientes = document.getElementById("listaPendientes");

        btnAdminPanel.addEventListener("click", function () {
            modalAdmin.style.display = "flex";
            cargarPendientes();
        });

        cerrarModalAdmin.addEventListener("click", function () {
            modalAdmin.style.display = "none";
        });

        async function cargarPendientes() {

            listaPendientes.innerHTML = "<p>Cargando...</p>";

            try {
                const snapshot = await db.collection("usuarios").where("aprobado", "==", false).get();

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
                        <span>${datos.email}</span>
                        <button class="btnAprobar" data-uid="${docSnap.id}">✅ Aprobar</button>
                        <button class="btnRechazar" data-uid="${docSnap.id}">🗑️ Rechazar</button>
                    `;
                    listaPendientes.appendChild(fila);
                });

                listaPendientes.querySelectorAll(".btnAprobar").forEach(function (boton) {
                    boton.addEventListener("click", async function () {
                        boton.disabled = true;
                        await db.collection("usuarios").doc(this.dataset.uid).update({ aprobado: true });
                        cargarPendientes();
                    });
                });

                listaPendientes.querySelectorAll(".btnRechazar").forEach(function (boton) {
                    boton.addEventListener("click", async function () {
                        if (confirm("¿Rechazar y eliminar esta solicitud?")) {
                            await db.collection("usuarios").doc(this.dataset.uid).delete();
                            cargarPendientes();
                        }
                    });
                });

            } catch (error) {
                console.error(error);
                listaPendientes.innerHTML = "<p>Error cargando usuarios: " + error.message + "</p>";
            }

        }
