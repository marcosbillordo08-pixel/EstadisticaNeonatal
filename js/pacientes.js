const REACTIVOS_PLANILLA = [
    "VDRL",
    "TPPA ELISA",
    "HIV ELISA",
    "TOXO HAI",
    "CHAGAS HAI",
    "CHAGAS ELISA",
    "HEP B ELISA"
];

const COLECCION_PLANILLA = "planillaPacientes";

let pacientesPlanilla = [];
window.listenerPlanilla = null;
let idPacienteEnEdicion = null;

/* =========================================================
   ELEMENTOS DOM
========================================================= */

// Tabs / vistas
const btnTabSerologia = document.getElementById("tabSerologia");
const btnTabPacientes = document.getElementById("tabPacientes");
const vistaSerologia = document.getElementById("vistaSerologia");
const vistaPacientes = document.getElementById("vistaPacientes");

// Formulario pacientes
const inputPacienteTipo = document.getElementById("pacienteTipo");
const inputPacienteSector = document.getElementById("pacienteSector");
const inputPacienteDni = document.getElementById("pacienteDni");
const inputPacienteApellido = document.getElementById("pacienteApellido");
const inputPacienteNombre = document.getElementById("pacienteNombre");
const inputPacienteSemanasGestacion = document.getElementById("pacienteSemanasGestacion");
const inputPacienteFechaNacimiento = document.getElementById("pacienteFechaNacimiento");

// Bloques para ocultar / mostrar según tipo
const bloquePacienteDni = document.getElementById("bloquePacienteDni");
const bloquePacienteApellido = document.getElementById("bloquePacienteApellido");
const bloquePacienteNombre = document.getElementById("bloquePacienteNombre");
const bloquePacienteSemanas = document.getElementById("bloquePacienteSemanas");
const bloquePacienteFechaNacimiento = document.getElementById("bloquePacienteFechaNacimiento");

// Acciones
const btnAgregarPacientePlanilla = document.getElementById("btnAgregarPacientePlanilla");
const btnCancelarEdicionPaciente = document.getElementById("btnCancelarEdicionPaciente");
const btnLimpiarPlanilla = document.getElementById("btnLimpiarPlanilla");

// Tabla
const cuerpoTablaPacientes = document.getElementById("cuerpoTablaPacientesPlanilla");

// Grid análisis
const gridAnalisisPacientes = document.getElementById("pacientesAnalisisGrid");

// Datalist serología
const listaPacientesSerologia = document.getElementById("listaPacientesSerologia");

/* =========================================================
   HELPERS
========================================================= */

function normalizarTexto(valor) {
    return String(valor || "").trim();
}

function normalizarMayus(valor) {
    return normalizarTexto(valor).toUpperCase();
}

function obtenerTipoPacienteActual() {
    return inputPacienteTipo ? inputPacienteTipo.value : "EMBARAZADA";
}

function esRN() {
    return obtenerTipoPacienteActual() === "RN";
}

function formatearFechaNacimiento(fechaISO) {
    if (!fechaISO) return "—";
    const partes = String(fechaISO).split("-");
    if (partes.length !== 3) return fechaISO;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatearFechaCarga(valor) {
    if (!valor) return "â€”";
    const fecha = typeof valor.toDate === "function" ? valor.toDate() : new Date(valor);
    if (isNaN(fecha.getTime())) return "â€”";
    return fecha.toLocaleString("es-AR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
}

function generarIdRN(apellido, fechaNacimiento) {
    const apellidoLimpio = normalizarMayus(apellido).replace(/\s+/g, "");
    const fecha = fechaNacimiento || "SINFECHA";
    return `RN-${apellidoLimpio}-${fecha}`;
}

function obtenerAnalisisSeleccionados() {
    const analisis = {};

    if (!gridAnalisisPacientes) return analisis;

    REACTIVOS_PLANILLA.forEach(function (reactivo) {
        analisis[reactivo] = false;
    });

    gridAnalisisPacientes.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
        analisis[checkbox.value] = checkbox.checked;
    });

    return analisis;
}

function limpiarChecksAnalisis() {
    if (!gridAnalisisPacientes) return;

    gridAnalisisPacientes.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
        checkbox.checked = false;
    });
}

function cargarChecksAnalisis(analisis) {
    if (!gridAnalisisPacientes) return;
    gridAnalisisPacientes.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
        checkbox.checked = Boolean(analisis && analisis[checkbox.value]);
    });
}

function actualizarEstadoEdicion() {
    const editando = idPacienteEnEdicion !== null;
    if (btnAgregarPacientePlanilla) btnAgregarPacientePlanilla.textContent = editando ? "Guardar cambios" : "Agregar paciente";
    if (btnCancelarEdicionPaciente) btnCancelarEdicionPaciente.style.display = editando ? "inline-block" : "none";
}

function marcaAnalisis(valor) {
    return valor
        ? '<span class="marca-si">✓</span>'
        : '<span class="marca-no">✕</span>';
}

/* =========================================================
   VISTA / TABS
========================================================= */

function mostrarVista(nombreVista) {
    if (!vistaSerologia || !vistaPacientes) return;

    if (nombreVista === "pacientes") {
        vistaPacientes.style.display = "block";
        vistaSerologia.style.display = "none";

        if (btnTabPacientes) btnTabPacientes.classList.add("activo");
        if (btnTabSerologia) btnTabSerologia.classList.remove("activo");
    } else {
        vistaPacientes.style.display = "none";
        vistaSerologia.style.display = "block";

        if (btnTabPacientes) btnTabPacientes.classList.remove("activo");
        if (btnTabSerologia) btnTabSerologia.classList.add("activo");
    }
}

if (btnTabPacientes) {
    btnTabPacientes.addEventListener("click", function () {
        mostrarVista("pacientes");
    });
}

if (btnTabSerologia) {
    btnTabSerologia.addEventListener("click", function () {
        mostrarVista("serologia");
    });
}

/* =========================================================
   FORMULARIO SEGÚN TIPO DE PACIENTE
========================================================= */

function actualizarFormularioSegunTipoPaciente() {
    const rn = esRN();

    if (bloquePacienteDni) {
        bloquePacienteDni.style.display = rn ? "none" : "block";
    }

    if (bloquePacienteNombre) {
        bloquePacienteNombre.style.display = rn ? "none" : "block";
    }

    if (bloquePacienteSemanas) {
        bloquePacienteSemanas.style.display = rn ? "none" : "block";
    }

    if (bloquePacienteFechaNacimiento) {
        bloquePacienteFechaNacimiento.style.display = rn ? "block" : "none";
    }

    if (rn) {
        if (inputPacienteDni) inputPacienteDni.value = "";
        if (inputPacienteNombre) inputPacienteNombre.value = "";
        if (inputPacienteSemanasGestacion) inputPacienteSemanasGestacion.value = "";
    } else {
        if (inputPacienteFechaNacimiento) inputPacienteFechaNacimiento.value = "";
    }
}

if (inputPacienteTipo) {
    inputPacienteTipo.addEventListener("change", actualizarFormularioSegunTipoPaciente);
}

/* =========================================================
   FIRESTORE
========================================================= */

function iniciarEscuchaPlanilla() {
    if (!window.db) {
        console.error("Firestore no está inicializado.");
        return;
    }

    if (window.listenerPlanilla) {
        try {
            window.listenerPlanilla();
        } catch (error) {
            console.warn("No se pudo cerrar listenerPlanilla anterior:", error);
        }
        window.listenerPlanilla = null;
    }

    window.listenerPlanilla = db.collection(COLECCION_PLANILLA)
        .orderBy("id", "asc")
        .onSnapshot(function (snapshot) {
            pacientesPlanilla = [];

            snapshot.forEach(function (docSnap) {
                pacientesPlanilla.push(docSnap.data());
            });

            renderizarTablaPacientes();
            actualizarDatalistPacientesSerologia();

            if (typeof window.actualizarBuscadorPacientesSerologia === "function") {
                window.actualizarBuscadorPacientesSerologia();
            }

            if (typeof window.autocompletarSerologiaPorDni === "function") {
                window.autocompletarSerologiaPorDni();
            }

        }, function (error) {
            console.error("Error escuchando la planilla de pacientes:", error);
        });
}

window.iniciarEscuchaPlanilla = iniciarEscuchaPlanilla;

/* =========================================================
   CREAR PACIENTE
========================================================= */

function construirPacienteDesdeFormulario(idExistente, fechaCargaExistente) {
    const tipoPaciente = obtenerTipoPacienteActual();
    const sector = normalizarTexto(inputPacienteSector ? inputPacienteSector.value : "");
    const apellido = normalizarMayus(inputPacienteApellido ? inputPacienteApellido.value : "");
    const analisis = obtenerAnalisisSeleccionados();

    if (!apellido) {
        alert("Ingresá el apellido del paciente.");
        return null;
    }

    if (tipoPaciente === "RN") {
        const fechaNacimiento = inputPacienteFechaNacimiento ? inputPacienteFechaNacimiento.value : "";

        if (!fechaNacimiento) {
            alert("Ingresá la fecha de nacimiento del R/N.");
            return null;
        }

        const idRN = generarIdRN(apellido, fechaNacimiento);

        return {
            id: idExistente || Date.now(),
            fechaCarga: fechaCargaExistente || Date.now(),
            dni: idRN,
            tipoPaciente: "RN",
            sector: sector,
            apellido: apellido,
            nombre: "",
            semanasGestacion: "",
            fechaNacimiento: fechaNacimiento,
            analisis: analisis
        };
    }

    const dni = normalizarTexto(inputPacienteDni ? inputPacienteDni.value : "");
    const nombre = normalizarTexto(inputPacienteNombre ? inputPacienteNombre.value : "");
    const semanasGestacion = normalizarTexto(inputPacienteSemanasGestacion ? inputPacienteSemanasGestacion.value : "");

    if (!dni) {
        alert("Ingresá el DNI de la embarazada.");
        return null;
    }

    if (!nombre) {
        alert("Ingresá el nombre de la embarazada.");
        return null;
    }

    return {
        id: idExistente || Date.now(),
        fechaCarga: fechaCargaExistente || Date.now(),
        dni: dni,
        tipoPaciente: tipoPaciente,
        sector: sector,
        apellido: apellido,
        nombre: nombre,
        semanasGestacion: semanasGestacion,
        fechaNacimiento: "",
        analisis: analisis
    };
}

function existePacienteDuplicado(paciente) {
    return pacientesPlanilla.some(function (p) {
        return String(p.dni || "").trim() === String(paciente.dni || "").trim();
    });
}

async function agregarPacientePlanilla() {
    const pacienteAnterior = pacientesPlanilla.find(function (p) {
        return String(p.id) === String(idPacienteEnEdicion);
    });
    const paciente = construirPacienteDesdeFormulario(
        pacienteAnterior ? pacienteAnterior.id : null,
        pacienteAnterior ? pacienteAnterior.fechaCarga : null
    );
    if (!paciente) return;

    const existeOtroConMismoDni = pacientesPlanilla.some(function (p) {
        return String(p.id) !== String(paciente.id)
            && String(p.dni || "").trim() === String(paciente.dni || "").trim();
    });

    if (existeOtroConMismoDni) {
        alert("Ese paciente ya está cargado en la planilla.");
        return;
    }

    if (btnAgregarPacientePlanilla) {
        btnAgregarPacientePlanilla.disabled = true;
    }

    try {
        await db.collection(COLECCION_PLANILLA).doc(String(paciente.id)).set(paciente);
        idPacienteEnEdicion = null;
        limpiarFormularioPaciente();
    } catch (error) {
        console.error(error);
        alert("No se pudo guardar el paciente: " + error.message);
    } finally {
        if (btnAgregarPacientePlanilla) {
            btnAgregarPacientePlanilla.disabled = false;
        }
    }
}

if (btnAgregarPacientePlanilla) {
    btnAgregarPacientePlanilla.addEventListener("click", agregarPacientePlanilla);
}

/* =========================================================
   LIMPIAR FORMULARIO
========================================================= */

function limpiarFormularioPaciente() {
    if (inputPacienteTipo) inputPacienteTipo.value = "EMBARAZADA";
    if (inputPacienteSector) inputPacienteSector.value = "ADMISION";
    if (inputPacienteDni) inputPacienteDni.value = "";
    if (inputPacienteApellido) inputPacienteApellido.value = "";
    if (inputPacienteNombre) inputPacienteNombre.value = "";
    if (inputPacienteSemanasGestacion) inputPacienteSemanasGestacion.value = "";
    if (inputPacienteFechaNacimiento) inputPacienteFechaNacimiento.value = "";

    limpiarChecksAnalisis();
    actualizarFormularioSegunTipoPaciente();
    actualizarEstadoEdicion();
}

function editarPacientePlanilla(id) {
    const paciente = pacientesPlanilla.find(function (p) { return String(p.id) === String(id); });
    if (!paciente) return;
    idPacienteEnEdicion = paciente.id;
    if (inputPacienteTipo) inputPacienteTipo.value = paciente.tipoPaciente || "EMBARAZADA";
    actualizarFormularioSegunTipoPaciente();
    if (inputPacienteSector) inputPacienteSector.value = paciente.sector || "ADMISION";
    if (inputPacienteDni) inputPacienteDni.value = paciente.tipoPaciente === "RN" ? "" : (paciente.dni || "");
    if (inputPacienteApellido) inputPacienteApellido.value = paciente.apellido || "";
    if (inputPacienteNombre) inputPacienteNombre.value = paciente.nombre || "";
    if (inputPacienteSemanasGestacion) inputPacienteSemanasGestacion.value = paciente.semanasGestacion || "";
    if (inputPacienteFechaNacimiento) inputPacienteFechaNacimiento.value = paciente.fechaNacimiento || "";
    cargarChecksAnalisis(paciente.analisis);
    actualizarEstadoEdicion();
    const formulario = document.querySelector("#vistaPacientes .panel");
    if (formulario) formulario.scrollIntoView({ behavior: "smooth", block: "start" });
}

if (btnCancelarEdicionPaciente) {
    btnCancelarEdicionPaciente.addEventListener("click", function () {
        idPacienteEnEdicion = null;
        limpiarFormularioPaciente();
    });
}

/* =========================================================
   ELIMINAR / LIMPIAR PLANILLA
========================================================= */

async function eliminarPacientePlanilla(id) {
    try {
        await db.collection(COLECCION_PLANILLA).doc(String(id)).delete();
    } catch (error) {
        console.error(error);
        alert("No se pudo eliminar el paciente: " + error.message);
    }
}

async function limpiarPlanillaPacientes() {
    if (pacientesPlanilla.length === 0) return;

    const confirmar = confirm("¿Vaciar toda la planilla de pacientes?");
    if (!confirmar) return;

    try {
        const grupos = [];
        for (let i = 0; i < pacientesPlanilla.length; i += 450) {
            grupos.push(pacientesPlanilla.slice(i, i + 450));
        }

        for (const grupo of grupos) {
            const lote = db.batch();

            grupo.forEach(function (paciente) {
                lote.delete(db.collection(COLECCION_PLANILLA).doc(String(paciente.id)));
            });

            await lote.commit();
        }

    } catch (error) {
        console.error(error);
        alert("No se pudo vaciar la planilla: " + error.message);
    }
}

if (btnLimpiarPlanilla) {
    btnLimpiarPlanilla.addEventListener("click", limpiarPlanillaPacientes);
}

/* =========================================================
   TABLA
========================================================= */

function renderizarTablaPacientes() {
    if (!cuerpoTablaPacientes) return;

    if (pacientesPlanilla.length === 0) {
        cuerpoTablaPacientes.innerHTML = `
            <tr>
                <td colspan="16" class="sin-datos">
                    Todavía no agregaste pacientes a la planilla.
                </td>
            </tr>
        `;
        return;
    }

    cuerpoTablaPacientes.innerHTML = pacientesPlanilla.map(function (p) {
        const analisis = p.analisis || {};

        return `
            <tr>
                <td>${formatearFechaCarga(p.fechaCarga || p.id)}</td>
                <td>${p.tipoPaciente === "RN" ? "R/N" : "Embarazada"}</td>
                <td>${p.sector || "—"}</td>
                <td>${p.dni || "—"}</td>
                <td>${p.apellido || "—"}</td>
                <td>${p.nombre || "—"}</td>
                <td>${p.semanasGestacion || "—"}</td>
                <td>${p.fechaNacimiento ? formatearFechaNacimiento(p.fechaNacimiento) : "—"}</td>
                <td>${marcaAnalisis(analisis["VDRL"])}</td>
                <td>${marcaAnalisis(analisis["TPPA ELISA"])}</td>
                <td>${marcaAnalisis(analisis["HIV ELISA"])}</td>
                <td>${marcaAnalisis(analisis["TOXO HAI"])}</td>
                <td>${marcaAnalisis(analisis["CHAGAS HAI"])}</td>
                <td>${marcaAnalisis(analisis["CHAGAS ELISA"])}</td>
                <td>${marcaAnalisis(analisis["HEP B ELISA"])}</td>
                <td>
                    <button class="fila-paciente-editar" data-id="${p.id}" type="button">Editar</button>
                    <button class="fila-paciente-eliminar" data-id="${p.id}" type="button">🗑️</button>
                </td>
            </tr>
        `;
    }).join("");

    cuerpoTablaPacientes.querySelectorAll(".fila-paciente-eliminar").forEach(function (boton) {
        boton.addEventListener("click", function () {
            eliminarPacientePlanilla(Number(boton.dataset.id));
        });
    });

    cuerpoTablaPacientes.querySelectorAll(".fila-paciente-editar").forEach(function (boton) {
        boton.addEventListener("click", function () {
            editarPacientePlanilla(boton.dataset.id);
        });
    });

    if (typeof twemoji !== "undefined") {
        twemoji.parse(cuerpoTablaPacientes, { folder: "svg", ext: ".svg" });
    }
}

/* =========================================================
   DATALIST PARA SEROLOGÍA
========================================================= */

function actualizarDatalistPacientesSerologia() {
    if (!listaPacientesSerologia) return;

    if (pacientesPlanilla.length === 0) {
        listaPacientesSerologia.innerHTML = "";
        return;
    }

    listaPacientesSerologia.innerHTML = pacientesPlanilla.map(function (p) {
        const descripcion = p.tipoPaciente === "RN"
            ? `${p.dni} - ${p.apellido} (R/N)`
            : `${p.dni} - ${p.apellido}, ${p.nombre}`;

        return `<option value="${p.dni}" label="${descripcion}"></option>`;
    }).join("");
}

/* =========================================================
   API GLOBAL PARA OTROS JS
========================================================= */

window.obtenerPacientesPlanilla = function () {
    return pacientesPlanilla;
};

window.actualizarDatalistPacientesSerologia = actualizarDatalistPacientesSerologia;

/* =========================================================
   INIT
========================================================= */

actualizarFormularioSegunTipoPaciente();
renderizarTablaPacientes();
mostrarVista("pacientes");
