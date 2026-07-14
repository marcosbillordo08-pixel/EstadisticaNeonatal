/* =========================================================
   CONFIGURACIÓN GENERAL
========================================================= */

const COLECCION_ANALISIS = "analisisSerologia";

const REACTIVOS = [
    "VDRL",
    "TPPA ELISA",
    "HIV ELISA",
    "TOXO HAI",
    "CHAGAS HAI",
    "CHAGAS ELISA",
    "HEP B ELISA"
];

const ETIQUETAS_REACTIVO = {
    "VDRL": "VDRL",
    "TPPA ELISA": "TPPA ELISA",
    "HIV ELISA": "HIV ELISA",
    "TOXO HAI": "TOXO HAI",
    "CHAGAS HAI": "CHAGAS HAI",
    "CHAGAS ELISA": "CHAGAS ELISA",
    "HEP B ELISA": "HEP B ELISA"
};

const GRUPOS_RESULTADO = {
    "VDRL": "REACTIVO",
    "TPPA ELISA": "POSITIVO",
    "HIV ELISA": "POSITIVO",
    "TOXO HAI": "POSITIVO",
    "CHAGAS HAI": "POSITIVO",
    "CHAGAS ELISA": "POSITIVO",
    "HEP B ELISA": "POSITIVO"
};

const OPCIONES_RESULTADO = {
    REACTIVO: [
        { valor: "REACTIVO", etiqueta: "Reactivo" },
        { valor: "NO REACTIVO", etiqueta: "No reactivo" }
    ],
    POSITIVO: [
        { valor: "POSITIVO", etiqueta: "Positivo" },
        { valor: "NEGATIVO", etiqueta: "Negativo" }
    ]
};

/* =========================================================
   ESTADO GLOBAL
========================================================= */

let entradas = [];
window.listenerMovimientos = null;
let periodoActual = "semana";

/* =========================================================
   ELEMENTOS DOM
========================================================= */

// Formulario serología
const inputDni = document.getElementById("dni");
const inputTipoPacienteSerologia = document.getElementById("tipoPacienteSerologia");
const inputSectorPacienteSerologia = document.getElementById("sectorPacienteSerologia");
const inputApellido = document.getElementById("apellido");
const inputNombre = document.getElementById("nombre");
const inputSemanasGestacion = document.getElementById("semanasGestacion");
const inputFechaNacimientoSerologia = document.getElementById("fechaNacimientoSerologia");
const bloqueSemanasGestacionSerologia = document.getElementById("bloqueSemanasGestacionSerologia");

const selectReactivo = document.getElementById("reactivo");
const selectResultado = document.getElementById("resultado");
const inputTitulo = document.getElementById("titulo");
const inputCantidad = document.getElementById("cantidad");
const btnGuardar = document.getElementById("btnGuardar");

// Buscador serología
const inputBuscarSerologia = document.getElementById("buscarSerologia");
const btnBuscarSerologia = document.getElementById("btnBuscarSerologia");
const btnLimpiarBusquedaSerologia = document.getElementById("btnLimpiarBusquedaSerologia");
const cuerpoBusquedaSerologia = document.getElementById("cuerpoBusquedaSerologia");

// Historial / tablas
const cuerpoHistorial = document.getElementById("cuerpoHistorial");
const cuerpoResumen = document.getElementById("cuerpoResumen");
const cuerpoResultados = document.getElementById("cuerpoResultados");

// Cards
const cardSemana = document.getElementById("cardSemana");
const cardMes = document.getElementById("cardMes");
const cardAno = document.getElementById("cardAno");
const cardTotal = document.getElementById("cardTotal");

// Tabs período
const tabsPeriodo = document.querySelectorAll(".tab-periodo");

/* =========================================================
   HELPERS
========================================================= */

function parsearFecha(fechaTexto) {
    if (!fechaTexto) return new Date(0);

    const partes = String(fechaTexto).split("/");
    if (partes.length === 3) {
        const dia = Number(partes[0]);
        const mes = Number(partes[1]) - 1;
        const anio = Number(partes[2]);
        return new Date(anio, mes, dia, 0, 0, 0, 0);
    }

    const fecha = new Date(fechaTexto);
    return isNaN(fecha.getTime()) ? new Date(0) : fecha;
}

function formatearFechaCorta(fecha) {
    if (!(fecha instanceof Date) || isNaN(fecha.getTime())) {
        return "—";
    }

    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");

    return `${dia}/${mes}`;
}

function fechaHoyTexto() {
    return formatearFechaCompleta(new Date());
}

function formatearFechaNacimientoSerologia(fechaISO) {
    if (!fechaISO) return "—";
    const partes = String(fechaISO).split("-");
    if (partes.length !== 3) return fechaISO;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obtenerRangoSemana(fechaBase) {
    const fecha = new Date(fechaBase);
    fecha.setHours(0, 0, 0, 0);

    const dia = fecha.getDay();
    const diffLunes = dia === 0 ? -6 : 1 - dia;

    const lunes = new Date(fecha);
    lunes.setDate(fecha.getDate() + diffLunes);
    lunes.setHours(0, 0, 0, 0);

    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);

    return { lunes, domingo };
}

function estaEnRango(fecha, desde, hasta) {
    const valor = fecha.getTime();
    return valor >= desde.getTime() && valor <= hasta.getTime();
}

function totalEnRango(desde, hasta) {
    return entradas.reduce(function (acc, e) {
        const fecha = parsearFecha(e.fecha);
        if (estaEnRango(fecha, desde, hasta)) {
            return acc + (e.cantidad || 1);
        }
        return acc;
    }, 0);
}

function textoTipoPaciente(tipoPaciente) {
    return tipoPaciente === "RN" ? "R/N" : "Embarazada";
}

/* =========================================================
   RESULTADOS / REACTIVOS
========================================================= */

function poblarReactivos() {
    if (!selectReactivo) return;

    selectReactivo.innerHTML = REACTIVOS.map(function (reactivo) {
        return `<option value="${reactivo}">${ETIQUETAS_REACTIVO[reactivo]}</option>`;
    }).join("");
}

function actualizarOpcionesResultado() {
    if (!selectReactivo || !selectResultado) return;

    const reactivo = selectReactivo.value;
    const grupo = GRUPOS_RESULTADO[reactivo];
    const opciones = OPCIONES_RESULTADO[grupo] || [];

    selectResultado.innerHTML = opciones.map(function (op) {
        return `<option value="${op.valor}">${op.etiqueta}</option>`;
    }).join("");
}

function obtenerEtiquetaResultado(reactivo, valorResultado) {
    const grupo = GRUPOS_RESULTADO[reactivo];
    const opciones = OPCIONES_RESULTADO[grupo] || [];
    const opcion = opciones.find(function (o) {
        return o.valor === valorResultado;
    });
    return opcion ? opcion.etiqueta : (valorResultado || "—");
}

if (selectReactivo) {
    selectReactivo.addEventListener("change", actualizarOpcionesResultado);
}

/* =========================================================
   PACIENTE DESDE PLANILLA / HISTORIAL
========================================================= */

function obtenerPacientesPlanillaSeguro() {
    if (typeof window.obtenerPacientesPlanilla === "function") {
        return window.obtenerPacientesPlanilla() || [];
    }
    return [];
}

function buscarPacientePorDniOId(dniBuscado) {
    const clave = String(dniBuscado || "").trim();
    if (!clave) return null;

    const pacientesPlanilla = obtenerPacientesPlanillaSeguro();

    const desdePlanilla = pacientesPlanilla
        .slice()
        .reverse()
        .find(function (p) {
            return String(p.dni || "").trim() === clave;
        });

    if (desdePlanilla) return desdePlanilla;

    const desdeHistorial = entradas
        .slice()
        .reverse()
        .find(function (e) {
            return String(e.dni || "").trim() === clave;
        });

    return desdeHistorial || null;
}

function limpiarFormularioSerologiaPaciente() {
    if (inputSectorPacienteSerologia) inputSectorPacienteSerologia.value = "";
    if (inputApellido) inputApellido.value = "";
    if (inputNombre) inputNombre.value = "";
    if (inputSemanasGestacion) inputSemanasGestacion.value = "";
    if (inputFechaNacimientoSerologia) inputFechaNacimientoSerologia.value = "";
}

function esRNManual() {
    return inputTipoPacienteSerologia && inputTipoPacienteSerologia.value === "RN";
}

function actualizarModoPacienteSerologia(limpiarDatos) {
    const rnManual = esRNManual();
    const camposManual = [
        inputSectorPacienteSerologia,
        inputApellido,
        inputNombre,
        inputFechaNacimientoSerologia
    ];

    camposManual.forEach(function (campo) {
        if (!campo) return;
        campo.readOnly = !rnManual;
        campo.placeholder = rnManual ? "Completar manualmente" : "Se autocompleta";
    });

    if (inputSemanasGestacion) {
        inputSemanasGestacion.readOnly = true;
        inputSemanasGestacion.placeholder = rnManual ? "No corresponde" : "Se autocompleta";
        if (rnManual) inputSemanasGestacion.value = "";
    }

    if (bloqueSemanasGestacionSerologia) {
    bloqueSemanasGestacionSerologia.style.display = rnManual ? "none" : "";
    }

    if (inputDni) {
        inputDni.placeholder = rnManual ? "Ingresar ID manualmente" : "Buscar por DNI o ID del paciente";
        if (rnManual) inputDni.removeAttribute("list");
        else inputDni.setAttribute("list", "listaPacientesSerologia");
    }

    if (limpiarDatos) {
        if (inputDni) inputDni.value = "";
        limpiarFormularioSerologiaPaciente();
    }
}

function completarPacienteEnSerologia(paciente) {
    if (!paciente) {
        limpiarFormularioSerologiaPaciente();
        return;
    }

    if (inputTipoPacienteSerologia) {
        inputTipoPacienteSerologia.value = paciente.tipoPaciente === "RN" ? "RN" : "EMBARAZADA";
    }

    if (inputSectorPacienteSerologia) {
        inputSectorPacienteSerologia.value = paciente.sector || "";
    }

    if (inputApellido) inputApellido.value = paciente.apellido || "";
    if (inputNombre) inputNombre.value = paciente.nombre || "";
    if (inputSemanasGestacion) inputSemanasGestacion.value = paciente.semanasGestacion || "";
    if (inputFechaNacimientoSerologia) inputFechaNacimientoSerologia.value = paciente.fechaNacimiento || "";
}

function autocompletarSerologiaPorDni() {
    if (!inputDni) return;
    if (esRNManual()) return;

    const dni = inputDni.value.trim();
    if (!dni) {
        limpiarFormularioSerologiaPaciente();
        return;
    }

    const paciente = buscarPacientePorDniOId(dni);
    completarPacienteEnSerologia(paciente);
}

if (inputDni) {
    inputDni.addEventListener("input", autocompletarSerologiaPorDni);
    inputDni.addEventListener("blur", autocompletarSerologiaPorDni);
}

if (inputTipoPacienteSerologia) {
    inputTipoPacienteSerologia.addEventListener("change", function () {
        actualizarModoPacienteSerologia(true);
    });
    actualizarModoPacienteSerologia(false);
}

window.autocompletarSerologiaPorDni = autocompletarSerologiaPorDni;
window.actualizarBuscadorPacientesSerologia = function () {
    autocompletarSerologiaPorDni();
};

/* =========================================================
   GUARDAR ENTRADA
========================================================= */

function construirEntradaSerologia() {
    const dni = inputDni ? inputDni.value.trim() : "";
    const tipoPacienteTexto = inputTipoPacienteSerologia ? inputTipoPacienteSerologia.value : "EMBARAZADA";
    const sector = inputSectorPacienteSerologia ? inputSectorPacienteSerologia.value.trim() : "";
    const apellido = inputApellido ? inputApellido.value.trim().toUpperCase() : "";
    const nombre = inputNombre ? inputNombre.value.trim() : "";
    const semanasGestacion = inputSemanasGestacion ? inputSemanasGestacion.value.trim() : "";
    const fechaNacimiento = inputFechaNacimientoSerologia ? inputFechaNacimientoSerologia.value : "";

    const reactivo = selectReactivo ? selectReactivo.value : "";
    const resultado = selectResultado ? selectResultado.value : "";
    const titulo = inputTitulo ? inputTitulo.value.trim() : "";
    const cantidad = inputCantidad ? Number(inputCantidad.value) || 1 : 1;

    if (!dni) {
        alert("Ingresá el DNI o ID del paciente.");
        return null;
    }

    if (!reactivo) {
        alert("Seleccioná un reactivo.");
        return null;
    }

    if (!resultado) {
        alert("Seleccioná un resultado.");
        return null;
    }

    if (!apellido) {
        alert(tipoPacienteTexto === "RN"
            ? "Completá el apellido del recién nacido."
            : "Buscá un paciente cargado en la pestaña Pacientes.");
        return null;
    }

    const tipoPaciente = tipoPacienteTexto === "RN" ? "RN" : "EMBARAZADA";

    return {
        id: Date.now(),
        fecha: fechaHoyTexto(),
        dni: dni,
        tipoPaciente: tipoPaciente,
        sector: sector,
        apellido: apellido,
        nombre: nombre,
        semanasGestacion: semanasGestacion,
        fechaNacimiento: fechaNacimiento,
        reactivo: reactivo,
        resultado: resultado,
        titulo: titulo,
        cantidad: cantidad
    };
}

async function guardarEntrada() {
    const entrada = construirEntradaSerologia();
    if (!entrada) return;

    if (!window.db) {
        alert("Firestore no está inicializado.");
        return;
    }

    if (btnGuardar) btnGuardar.disabled = true;

    try {
        await db.collection(COLECCION_ANALISIS).doc(String(entrada.id)).set(entrada);

        if (selectReactivo) selectReactivo.value = REACTIVOS[0];
        actualizarOpcionesResultado();

        if (inputTitulo) inputTitulo.value = "";
        if (inputCantidad) inputCantidad.value = 1;

    } catch (error) {
        console.error(error);
        alert("No se pudo guardar el resultado: " + error.message);
    } finally {
        if (btnGuardar) btnGuardar.disabled = false;
    }
}

if (btnGuardar) {
    btnGuardar.addEventListener("click", guardarEntrada);
}

/* =========================================================
   FIRESTORE - ESCUCHA DE MOVIMIENTOS
========================================================= */

function iniciarEscuchaDatos() {
    if (!window.db) {
        console.error("Firestore no está inicializado.");
        return;
    }

    if (window.listenerMovimientos) {
        try {
            window.listenerMovimientos();
        } catch (error) {
            console.warn("No se pudo cerrar listenerMovimientos anterior:", error);
        }
        window.listenerMovimientos = null;
    }

    window.listenerMovimientos = db.collection(COLECCION_ANALISIS)
        .orderBy("id", "desc")
        .onSnapshot(function (snapshot) {
            entradas = [];

            snapshot.forEach(function (docSnap) {
                entradas.push(docSnap.data());
            });

            renderTodoSerologia();
            autocompletarSerologiaPorDni();

        }, function (error) {
            console.error("Error escuchando serologías:", error);
        });
}

window.iniciarEscuchaDatos = iniciarEscuchaDatos;

/* =========================================================
   CARDS / RESÚMENES
========================================================= */

function actualizarCards() {
    const hoy = new Date();
    const { lunes, domingo } = obtenerRangoSemana(hoy);

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);

    const inicioAno = new Date(hoy.getFullYear(), 0, 1);
    const finAno = new Date(hoy.getFullYear(), 11, 31, 23, 59, 59, 999);

    const totalSemana = totalEnRango(lunes, domingo);
    const totalMes = totalEnRango(inicioMes, finMes);
    const totalAno = totalEnRango(inicioAno, finAno);
    const totalHistorico = entradas.reduce(function (acc, e) {
        return acc + (e.cantidad || 1);
    }, 0);

    if (cardSemana) cardSemana.textContent = totalSemana;
    if (cardMes) cardMes.textContent = totalMes;
    if (cardAno) cardAno.textContent = totalAno;
    if (cardTotal) cardTotal.textContent = totalHistorico;
}

function renderResumenPorReactivo() {
    if (!cuerpoResumen) return;

    const hoy = new Date();
    let desde;
    let hasta;

    if (periodoActual === "semana") {
        const rango = obtenerRangoSemana(hoy);
        desde = rango.lunes;
        hasta = rango.domingo;
    } else if (periodoActual === "mes") {
        desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
        desde = new Date(hoy.getFullYear(), 0, 1);
        hasta = new Date(hoy.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    const totales = {};
    REACTIVOS.forEach(function (r) {
        totales[r] = 0;
    });

    entradas.forEach(function (entrada) {
        const fecha = parsearFecha(entrada.fecha);
        if (estaEnRango(fecha, desde, hasta)) {
            totales[entrada.reactivo] += (entrada.cantidad || 1);
        }
    });

    const totalGeneral = Object.values(totales).reduce(function (acc, valor) {
        return acc + valor;
    }, 0);

    const filas = REACTIVOS
        .map(function (reactivo) {
            const cantidad = totales[reactivo];
            const porcentaje = totalGeneral > 0 ? ((cantidad / totalGeneral) * 100) : 0;

            return {
                reactivo: reactivo,
                cantidad: cantidad,
                porcentaje: porcentaje
            };
        })
        .sort(function (a, b) {
            return b.cantidad - a.cantidad;
        });

    if (filas.every(function (fila) { return fila.cantidad === 0; })) {
        cuerpoResumen.innerHTML = `
            <tr>
                <td colspan="3" class="sin-datos">No hay datos en este período.</td>
            </tr>
        `;
        return;
    }

    cuerpoResumen.innerHTML = filas.map(function (fila) {
        return `
            <tr>
                <td>${ETIQUETAS_REACTIVO[fila.reactivo]}</td>
                <td class="col-total">${fila.cantidad}</td>
                <td>${fila.porcentaje.toFixed(1)}%</td>
            </tr>
        `;
    }).join("");
}

function renderResultadosPorReactivo() {
    if (!cuerpoResultados) return;

    const filas = REACTIVOS.map(function (reactivo) {
        const grupo = GRUPOS_RESULTADO[reactivo];
        const opciones = OPCIONES_RESULTADO[grupo] || [];

        const contador = {};
        opciones.forEach(function (op) {
            contador[op.valor] = 0;
        });

        let total = 0;

        entradas.forEach(function (entrada) {
            if (entrada.reactivo !== reactivo) return;

            contador[entrada.resultado] = (contador[entrada.resultado] || 0) + (entrada.cantidad || 1);
            total += (entrada.cantidad || 1);
        });

        const opcionA = opciones[0] || { valor: "", etiqueta: "-" };
        const opcionB = opciones[1] || { valor: "", etiqueta: "-" };

        const cantA = contador[opcionA.valor] || 0;
        const cantB = contador[opcionB.valor] || 0;
        const pctA = total > 0 ? ((cantA / total) * 100).toFixed(1) : "0.0";
        const pctB = total > 0 ? ((cantB / total) * 100).toFixed(1) : "0.0";

        return `
            <tr>
                <td>${ETIQUETAS_REACTIVO[reactivo]}</td>
                <td>${opcionA.etiqueta}: ${cantA}</td>
                <td>${pctA}%</td>
                <td>${opcionB.etiqueta}: ${cantB}</td>
                <td>${pctB}%</td>
                <td class="col-total">${total}</td>
            </tr>
        `;
    }).join("");

    cuerpoResultados.innerHTML = filas;
}

/* =========================================================
   HISTORIAL
========================================================= */

function textoResultadoHistorial(entrada) {
    const etiqueta = obtenerEtiquetaResultado(entrada.reactivo, entrada.resultado);

    if (entrada.titulo && String(entrada.titulo).trim() !== "") {
        return `${etiqueta} ${entrada.titulo}`;
    }

    return etiqueta;
}

function renderHistorial() {
    if (!cuerpoHistorial) return;

    if (!entradas || entradas.length === 0) {
        cuerpoHistorial.innerHTML = `
            <tr>
                <td colspan="12" class="sin-datos">Todavía no hay resultados cargados.</td>
            </tr>
        `;
        return;
    }

    cuerpoHistorial.innerHTML = entradas.map(function (entrada) {
        const fechaNac = entrada.fechaNacimiento
            ? formatearFechaNacimientoSerologia(entrada.fechaNacimiento)
            : "—";

        return `
            <tr>
                <td>${entrada.fecha || "—"}</td>
                <td>${entrada.dni || "—"}</td>
                <td>${textoTipoPaciente(entrada.tipoPaciente)}</td>
                <td>${entrada.sector || "—"}</td>
                <td>${entrada.apellido || "—"}</td>
                <td>${entrada.nombre || "—"}</td>
                <td>${entrada.semanasGestacion || "—"}</td>
                <td>${fechaNac}</td>
                <td>${ETIQUETAS_REACTIVO[entrada.reactivo] || entrada.reactivo}</td>
                <td>${textoResultadoHistorial(entrada)}</td>
                <td>${entrada.cantidad || 1}</td>
                <td>
                    <button class="fila-historial-eliminar" data-id="${entrada.id}" type="button">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    cuerpoHistorial.querySelectorAll(".fila-historial-eliminar").forEach(function (btn) {
        btn.addEventListener("click", async function () {
            const id = btn.dataset.id;
            const confirmar = confirm("¿Eliminar esta carga del historial?");
            if (!confirmar) return;

            try {
                await db.collection(COLECCION_ANALISIS).doc(String(id)).delete();
            } catch (error) {
                console.error(error);
                alert("No se pudo eliminar la carga: " + error.message);
            }
        });
    });
}

/* =========================================================
   BUSCADOR DE SEROLOGÍA
========================================================= */

function renderBusquedaSerologia(lista) {
    if (!cuerpoBusquedaSerologia) return;

    if (!lista || lista.length === 0) {
        cuerpoBusquedaSerologia.innerHTML = `
            <tr>
                <td colspan="10" class="sin-datos">No se encontraron resultados.</td>
            </tr>
        `;
        return;
    }

    cuerpoBusquedaSerologia.innerHTML = lista.map(function (entrada) {
        const fechaNac = entrada.fechaNacimiento
            ? formatearFechaNacimientoSerologia(entrada.fechaNacimiento)
            : "—";

        return `
            <tr>
                <td>${entrada.fecha || "—"}</td>
                <td>${entrada.dni || "—"}</td>
                <td>${textoTipoPaciente(entrada.tipoPaciente)}</td>
                <td>${entrada.sector || "—"}</td>
                <td>${entrada.apellido || "—"}</td>
                <td>${entrada.nombre || "—"}</td>
                <td>${entrada.semanasGestacion || "—"}</td>
                <td>${fechaNac}</td>
                <td>${ETIQUETAS_REACTIVO[entrada.reactivo] || entrada.reactivo}</td>
                <td>${textoResultadoHistorial(entrada)}</td>
            </tr>
        `;
    }).join("");
}

function buscarSerologia() {
    if (!inputBuscarSerologia) return;

    const texto = inputBuscarSerologia.value.trim().toLowerCase();

    if (!texto) {
        renderBusquedaSerologia([]);
        return;
    }

    const resultados = entradas.filter(function (entrada) {
        return [
            entrada.fecha,
            entrada.dni,
            entrada.apellido,
            entrada.nombre,
            entrada.sector,
            entrada.reactivo,
            entrada.resultado,
            entrada.titulo,
            entrada.tipoPaciente === "RN" ? "r/n" : "embarazada"
        ]
            .filter(Boolean)
            .some(function (valor) {
                return String(valor).toLowerCase().includes(texto);
            });
    });

    renderBusquedaSerologia(resultados);
}

if (btnBuscarSerologia) {
    btnBuscarSerologia.addEventListener("click", buscarSerologia);
}

if (btnLimpiarBusquedaSerologia) {
    btnLimpiarBusquedaSerologia.addEventListener("click", function () {
        if (inputBuscarSerologia) inputBuscarSerologia.value = "";
        renderBusquedaSerologia([]);
    });
}

if (inputBuscarSerologia) {
    inputBuscarSerologia.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            buscarSerologia();
        }
    });
}

/* =========================================================
   TABS DE PERÍODO
========================================================= */

tabsPeriodo.forEach(function (tab) {
    tab.addEventListener("click", function () {
        periodoActual = tab.dataset.periodo || "semana";

        tabsPeriodo.forEach(function (otroTab) {
            otroTab.classList.remove("activo");
        });

        tab.classList.add("activo");
        renderResumenPorReactivo();
    });
});

/* =========================================================
   RENDER GLOBAL
========================================================= */

function renderTodoSerologia() {
    actualizarCards();
    renderResumenPorReactivo();
    renderResultadosPorReactivo();
    renderHistorial();
}

/* =========================================================
   INIT
========================================================= */

poblarReactivos();
actualizarOpcionesResultado();
renderResumenPorReactivo();
renderResultadosPorReactivo();
renderHistorial();
