const REACTIVOS_PLANILLA = ["VDRL", "HIV", "HEPATITIS B", "TOXOPLASMOSIS", "CHAGAS", "PCR"];
const COLECCION_PLANILLA = "planillaPacientes";

let pacientesPlanilla = [];
let listenerPlanilla = null;

const btnTabSerologia = document.getElementById("tabSerologia");
const btnTabPacientes = document.getElementById("tabPacientes");

const vistaSerologia = document.getElementById("vistaSerologia");
const vistaPacientes = document.getElementById("vistaPacientes");

const inputPacienteDni = document.getElementById("pacienteDni");
const inputPacienteApellido = document.getElementById("pacienteApellido");
const inputPacienteNombre = document.getElementById("pacienteNombre");

const btnAgregarPacientePlanilla = document.getElementById("btnAgregarPacientePlanilla");
const btnLimpiarPlanilla = document.getElementById("btnLimpiarPlanilla");
const cuerpoTablaPacientes = document.getElementById("cuerpoTablaPacientesPlanilla");
const gridAnalisisPacientes = document.getElementById("pacientesAnalisisGrid");

// ============================================================
// Sincronización en tiempo real con Firestore
// ============================================================

function iniciarEscuchaPlanilla() {

    listenerPlanilla = db.collection(COLECCION_PLANILLA)
        .orderBy("id", "asc")
        .onSnapshot(function (snapshot) {

            pacientesPlanilla = [];
            snapshot.forEach(function (docSnap) {
                pacientesPlanilla.push(docSnap.data());
            });

            renderizarTablaPacientes();

        }, function (error) {
            console.error("Error escuchando la planilla de pacientes:", error);
        });

}

// se engancha a la sesión de forma independiente de auth.js, para no
// tener que tocar ese archivo (ya anda bien, mejor no arriesgarlo)
auth.onAuthStateChanged(async function (user) {

    if (listenerPlanilla) {
        listenerPlanilla();
        listenerPlanilla = null;
    }

    if (!user) return;

    try {
        const doc = await db.collection("usuarios").doc(user.uid).get();
        if (doc.exists && doc.data().aprobado === true) {
            iniciarEscuchaPlanilla();
        }
    } catch (error) {
        console.error(error);
    }

});

// ============================================================
// Pestañas Serología / Pacientes
// ============================================================

function mostrarVista(nombreVista) {
    if (!vistaSerologia || !vistaPacientes) return;

    if (nombreVista === "pacientes") {
        vistaSerologia.style.display = "none";
        vistaPacientes.style.display = "block";

        if (btnTabSerologia) btnTabSerologia.classList.remove("activo");
        if (btnTabPacientes) btnTabPacientes.classList.add("activo");
    } else {
        vistaSerologia.style.display = "block";
        vistaPacientes.style.display = "none";

        if (btnTabSerologia) btnTabSerologia.classList.add("activo");
        if (btnTabPacientes) btnTabPacientes.classList.remove("activo");
    }
}

if (btnTabSerologia) {
    btnTabSerologia.addEventListener("click", function () {
        mostrarVista("serologia");
    });
}

if (btnTabPacientes) {
    btnTabPacientes.addEventListener("click", function () {
        mostrarVista("pacientes");
    });
}

function obtenerChecksPacientes() {
    if (!gridAnalisisPacientes) return [];
    return Array.from(gridAnalisisPacientes.querySelectorAll('input[type="checkbox"]'));
}

function limpiarChecksPaciente() {
    obtenerChecksPacientes().forEach(function (check) {
        check.checked = false;
    });
}

function obtenerAnalisisSeleccionadosPaciente() {
    return obtenerChecksPacientes()
        .filter(function (check) { return check.checked; })
        .map(function (check) { return check.value; });
}

function limpiarFormularioPaciente() {
    if (inputPacienteDni) inputPacienteDni.value = "";
    if (inputPacienteApellido) inputPacienteApellido.value = "";
    if (inputPacienteNombre) inputPacienteNombre.value = "";
    limpiarChecksPaciente();
    if (inputPacienteDni) inputPacienteDni.focus();
}

function autocompletarPacientePorDni() {
    if (!inputPacienteDni) return;

    const dni = inputPacienteDni.value.trim();
    if (!dni) return;

    const encontradoPlanilla = pacientesPlanilla
        .slice()
        .reverse()
        .find(function (p) { return p.dni === dni; });

    if (encontradoPlanilla) {
        if (inputPacienteApellido) inputPacienteApellido.value = encontradoPlanilla.apellido || "";
        if (inputPacienteNombre) inputPacienteNombre.value = encontradoPlanilla.nombre || "";
        return;
    }

    if (typeof entradas !== "undefined" && Array.isArray(entradas)) {
        const encontradoHistorial = entradas
            .slice()
            .reverse()
            .find(function (e) { return e.dni === dni; });

        if (encontradoHistorial) {
            if (inputPacienteApellido) inputPacienteApellido.value = encontradoHistorial.apellido || "";
            if (inputPacienteNombre) inputPacienteNombre.value = encontradoHistorial.nombre || "";
        }
    }
}

if (inputPacienteDni) {
    inputPacienteDni.addEventListener("blur", autocompletarPacientePorDni);
}

function construirPacientePlanilla() {
    const dni = inputPacienteDni ? inputPacienteDni.value.trim() : "";
    const apellido = inputPacienteApellido ? inputPacienteApellido.value.trim() : "";
    const nombre = inputPacienteNombre ? inputPacienteNombre.value.trim() : "";
    const analisisSeleccionados = obtenerAnalisisSeleccionadosPaciente();

    if (!dni) {
        alert("Ingresá el DNI del paciente.");
        return null;
    }

    if (!apellido || !nombre) {
        alert("Ingresá apellido y nombre del paciente.");
        return null;
    }

    if (analisisSeleccionados.length === 0) {
        alert("Seleccioná al menos un análisis para la planilla.");
        return null;
    }

    const mapaAnalisis = {};
    REACTIVOS_PLANILLA.forEach(function (reactivo) {
        mapaAnalisis[reactivo] = analisisSeleccionados.includes(reactivo);
    });

    return {
        id: Date.now(),
        dni: dni,
        apellido: apellido,
        nombre: nombre,
        analisis: mapaAnalisis
    };
}

async function agregarPacienteAPlanilla() {

    const paciente = construirPacientePlanilla();
    if (!paciente) return;

    if (btnAgregarPacientePlanilla) btnAgregarPacientePlanilla.disabled = true;

    try {
        await db.collection(COLECCION_PLANILLA).doc(String(paciente.id)).set(paciente);
        limpiarFormularioPaciente();
    } catch (error) {
        console.error(error);
        alert("No se pudo agregar el paciente a la planilla: " + error.message);
    } finally {
        if (btnAgregarPacientePlanilla) btnAgregarPacientePlanilla.disabled = false;
    }

}

if (btnAgregarPacientePlanilla) {
    btnAgregarPacientePlanilla.addEventListener("click", agregarPacienteAPlanilla);
}

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

    const confirmar = confirm("¿Vaciar la planilla de pacientes? Esta acción no se puede deshacer y afecta a todos los usuarios.");
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

function marcaAnalisis(valor) {
    return valor
        ? '<span class="marca-si">✓</span>'
        : '<span class="marca-no">✕</span>';
}

function renderizarTablaPacientes() {
    if (!cuerpoTablaPacientes) return;

    if (pacientesPlanilla.length === 0) {
        cuerpoTablaPacientes.innerHTML = `
            <tr>
                <td colspan="11" class="sin-datos">
                    Todavía no agregaste pacientes a la planilla.
                </td>
            </tr>
        `;
        return;
    }

    cuerpoTablaPacientes.innerHTML = pacientesPlanilla.map(function (p, index) {
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${p.dni}</td>
                <td>${p.apellido}</td>
                <td>${p.nombre}</td>
                <td>${marcaAnalisis(p.analisis["VDRL"])}</td>
                <td>${marcaAnalisis(p.analisis["HIV"])}</td>
                <td>${marcaAnalisis(p.analisis["HEPATITIS B"])}</td>
                <td>${marcaAnalisis(p.analisis["TOXOPLASMOSIS"])}</td>
                <td>${marcaAnalisis(p.analisis["CHAGAS"])}</td>
                <td>${marcaAnalisis(p.analisis["PCR"])}</td>
                <td>
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

    if (typeof twemoji !== "undefined") {
        twemoji.parse(cuerpoTablaPacientes, { folder: "svg", ext: ".svg" });
    }
}

window.obtenerPacientesPlanilla = function () {
    return pacientesPlanilla;
};

renderizarTablaPacientes();
mostrarVista("serologia");
